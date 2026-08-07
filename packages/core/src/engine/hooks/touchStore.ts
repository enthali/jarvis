// Implementation: SPEC_ENT_TOUCHEDFILES
// Requirements: REQ_ENT_TOUCHEDFILES

import * as fs from 'fs';
import * as path from 'path';
import * as configPaths from '../core/configPaths';

export interface TouchEntry {
    lastRead?: string;   // ISO 8601 UTC
    lastEdited?: string; // ISO 8601 UTC
    rootUri?: string;    // workspace folder URI that owns this entry (D-11)
    relPath?: string;    // root-relative path (D-11)
}

interface TouchFile {
    files: Record<string, TouchEntry>; // key = resourceUri.toString(true) for new records,
                                       // workspace-relative path for legacy records
}

/**
 * Disambiguates the TouchStore storage key for "actor" entities. KindDrivenScanner
 * (SPEC_ENG_SCANNER's additionalScanRoots) merges actor.yaml entities from the
 * actors folder into the SAME 'session' kind bucket as raw session.yaml entities
 * — that shared 'session' tag is correct for tree-provider/refreshKind purposes
 * (there is only one registered provider, viewId jarvisEntities), but it is the
 * wrong key for touched-files persistence: two entities coincidentally sharing a
 * name (a raw session and an actor) would otherwise collide on the same JSON
 * file. Re-derives 'actor' from the entity's actual folder instead (bugfix,
 * PM F5 finding 2026-07-17 — GH #18).
 */
export function resolveTouchStorageKind(kind: string, folder: string): string {
    if (kind !== 'session') { return kind; }
    const actorsDir = configPaths.getActorsDir();
    if (actorsDir && (folder === actorsDir || folder.startsWith(actorsDir + path.sep))) {
        return 'actor';
    }
    return kind;
}

/**
 * Persists per-entity touched-file lists to
 * <workspaceRoot>/.jarvis/state/touched-files/<kind>-<name>.json. Each
 * touch is written through immediately (no batching/debounce) — PostToolUse
 * frequency is bounded by agent tool-call rate, not a hot path
 * (REQ_ENT_TOUCHEDFILES AC-6). Fail-open: a missing/corrupt file is treated
 * as empty, same tolerant pattern as readMessageLog()/readQueue().
 *
 * Bugfix (touched-files-write-race CR, GH #35 — REQ_ENT_TOUCHEDFILES AC-6a):
 * _load/_save are synchronous (fs.readFileSync/writeFileSync/mkdirSync), with
 * no await between load and save inside recordTouches()/removeEntry(). Since
 * TouchTracker dispatches each PostToolUse handler fire-and-forget, an async
 * (fs.promises-based) critical section allowed overlapping calls for the same
 * entity's file to interleave between their own load and save, silently
 * losing entries (last writer wins). A synchronous critical section never
 * yields control back to the event loop, so it cannot be interleaved —
 * mirrors messageQueue.ts's readQueue()/writeQueue() precedent for the same
 * read-modify-write shape. recordTouches()/removeEntry()/getEntries() keep
 * their async/Promise signatures for call-site compatibility.
 */
export class TouchStore {
    constructor(private readonly _stateDir: string) {}

    private _filePath(kind: string, name: string): string {
        return path.join(this._stateDir, `${kind}-${name}.json`);
    }

    async recordTouches(kind: string, name: string, touches: { rootUri: string; relPath: string; resourceUri: string }[], touchKind: 'read' | 'write'): Promise<void> {
        const file = this._filePath(kind, name);
        const data = this._load(file); // sync — no await between load and save
        const now = new Date().toISOString();
        for (const t of touches) {
            const entry = data.files[t.resourceUri] ?? { rootUri: t.rootUri, relPath: t.relPath };
            entry.rootUri = t.rootUri;
            entry.relPath = t.relPath;
            if (touchKind === 'write') { entry.lastEdited = now; } else { entry.lastRead = now; }
            data.files[t.resourceUri] = entry;
        }
        this._save(file, data); // sync — completes before this call yields
    }

    async removeEntry(kind: string, name: string, relPath: string): Promise<void> {
        const file = this._filePath(kind, name);
        const data = this._load(file);
        delete data.files[relPath];
        this._save(file, data);
    }

    async getEntries(kind: string, name: string): Promise<Record<string, TouchEntry>> {
        return this._load(this._filePath(kind, name)).files;
    }

    async removeUnder(kind: string, name: string, relFolderPrefix: string, rootUri?: string): Promise<void> {
        const file = this._filePath(kind, name);
        const data = this._load(file);
        const prefix = relFolderPrefix.endsWith('/') ? relFolderPrefix : relFolderPrefix + '/';
        for (const [key, entry] of Object.entries(data.files)) {
            const rp = entry.relPath ?? key;
            const matches = rp.startsWith(prefix) && (!rootUri || entry.rootUri === rootUri);
            if (matches) { delete data.files[key]; }
        }
        this._save(file, data);
    }

    async removeAll(kind: string, name: string): Promise<void> {
        const file = this._filePath(kind, name);
        try { fs.unlinkSync(file); } catch { /* fail-open: missing file is success */ }
    }

    /**
     * D-15: snapshot-safe removal. Deletes entries by key only if the stored
     * entry has not been modified since the snapshot was taken. A concurrent
     * touch updates the entry's timestamps, causing the compare to fail and
     * preserving that entry. Returns count of actually removed entries.
     */
    removeEntriesIfUnchanged(kind: string, name: string, snapshot: Record<string, TouchEntry>, keysToRemove: string[]): number {
        const file = this._filePath(kind, name);
        const data = this._load(file);
        let count = 0;
        for (const key of keysToRemove) {
            const current = data.files[key];
            const snapped = snapshot[key];
            if (!current || !snapped) { continue; }
            if (current.lastRead === snapped.lastRead && current.lastEdited === snapped.lastEdited) {
                delete data.files[key];
                count++;
            }
        }
        if (count > 0) { this._save(file, data); }
        return count;
    }

    private _load(file: string): TouchFile {
        try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
        catch { return { files: {} }; } // fail-open: missing/corrupt file → empty
    }

    private _save(file: string, data: TouchFile): void {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    }
}
