// Implementation: SPEC_ACTOR_TOUCHEDFILES
// Requirements: REQ_ACTOR_TOUCHEDFILES

import * as vscode from 'vscode';
import * as path from 'path';
import type { TouchEntry } from '../hooks/touchStore';

export interface TouchedFileFolderNode {
    kind: 'touchedFileFolder';
    relFolderPath: string; // workspace-relative
    label: string;
    entries: Record<string, TouchEntry>; // entries scoped to this root, for children resolution
    actorName: string;
    rootUri?: string; // workspace folder URI that owns this folder's entries
}

export interface TouchedFileLeafNode {
    kind: 'touchedFileLeaf';
    filePath: string; // absolute
    label: string;
    entry: TouchEntry;
    actorName: string;
    resourceUri?: vscode.Uri; // resolved workspace URI for open/reveal/diff
}

export type ProbeResult = 'present' | 'absent' | 'unknown';

/** Probes a touch entry via workspace.fs.stat. Only FileNotFound = absent. */
export async function probeTouchEntry(entry: TouchEntry): Promise<{ result: ProbeResult; uri?: vscode.Uri }> {
    if (!entry.rootUri || !entry.relPath) { return { result: 'unknown' }; }
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.some(f => f.uri.toString(true) === entry.rootUri)) { return { result: 'unknown' }; }
    try {
        const uri = vscode.Uri.joinPath(vscode.Uri.parse(entry.rootUri), entry.relPath);
        await vscode.workspace.fs.stat(uri);
        return { result: 'present', uri };
    } catch (e: any) {
        if (e?.code === 'FileNotFound' || e?.name === 'EntryNotFound (FileSystemError)' ||
            (e instanceof vscode.FileSystemError && e.code === 'FileNotFound')) {
            return { result: 'absent' };
        }
        return { result: 'unknown' };
    }
}

/** Filters entry map to entries that probe as 'present'; attaches the resolved URI. */
export async function probeEntries(entries: Record<string, TouchEntry>): Promise<Record<string, TouchEntry & { _resolvedUri?: vscode.Uri }>> {
    const result: Record<string, TouchEntry & { _resolvedUri?: vscode.Uri }> = {};
    const probes = await Promise.all(
        Object.entries(entries).map(async ([key, entry]) => {
            const probe = await probeTouchEntry(entry);
            return { key, entry, probe };
        })
    );
    for (const { key, entry, probe } of probes) {
        if (probe.result === 'present') {
            result[key] = { ...entry, _resolvedUri: probe.uri };
        }
    }
    return result;
}

/** Reads jarvis.touchedFiles.windowDays from workspace config (0 = no limit). */
export function readWindowDays(): number {
    return vscode.workspace.getConfiguration('jarvis.touchedFiles').get<number>('windowDays', 0) ?? 0;
}

/** Filters entry map to entries whose most recent touch is within the rolling window. */
export function withinWindow(entries: Record<string, TouchEntry>, windowDays: number): Record<string, TouchEntry> {
    if (windowDays <= 0) { return entries; }
    const cutoff = Date.now() - windowDays * 86_400_000;
    const result: Record<string, TouchEntry> = {};
    for (const [relPath, entry] of Object.entries(entries)) {
        const ts = Math.max(
            entry.lastEdited ? new Date(entry.lastEdited).getTime() : 0,
            entry.lastRead ? new Date(entry.lastRead).getTime() : 0,
        );
        if (ts >= cutoff) { result[relPath] = entry; }
    }
    return result;
}

/**
 * Builds the hierarchical touched-files tree from a flat key -> TouchEntry
 * map. Walked fresh on every expansion, never cached (SPEC_ACTOR_TOUCHEDFILES).
 */
export function buildTouchedFileChildren(
    entries: Record<string, TouchEntry & { _resolvedUri?: vscode.Uri }>,
    underFolder: string,
    workspaceRoot: string,
    actorName: string,
): (TouchedFileFolderNode | TouchedFileLeafNode)[] {
    const seenFolders = new Set<string>();
    const result: (TouchedFileFolderNode | TouchedFileLeafNode)[] = [];
    for (const [key, entry] of Object.entries(entries)) {
        const relPath = entry.relPath ?? key;
        if (underFolder && !relPath.startsWith(underFolder + '/')) { continue; }
        const rest = underFolder ? relPath.slice(underFolder.length + 1) : relPath;
        const sepIndex = rest.indexOf('/');
        if (sepIndex === -1) {
            const resourceUri = entry._resolvedUri;
            result.push({
                kind: 'touchedFileLeaf', label: rest, entry, actorName,
                filePath: resourceUri?.fsPath ?? path.join(workspaceRoot, relPath),
                resourceUri,
            });
        } else {
            const folderName = rest.slice(0, sepIndex);
            const relFolderPath = underFolder ? `${underFolder}/${folderName}` : folderName;
            const rootUri = entry.rootUri;
            const dedupKey = `${rootUri ?? ''}|${relFolderPath}`;
            if (seenFolders.has(dedupKey)) { continue; }
            seenFolders.add(dedupKey);
            const scopedEntries = rootUri
                ? Object.fromEntries(Object.entries(entries).filter(([, e]) => e.rootUri === rootUri))
                : entries;
            result.push({ kind: 'touchedFileFolder', relFolderPath, label: folderName, entries: scopedEntries, actorName, rootUri });
        }
    }
    return result.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}
