// Implementation: SPEC_ACTOR_MAIL
// Requirements: REQ_ACTOR_MAIL, REQ_OLK_ENABLE

import * as vscode from 'vscode';
import type { JarvisCoreApi } from 'jarvis-core';
import { readActorMail, type FolderMail, type Log } from './outlookIntegration/OutlookActorMail';

type Kind = 'flag' | 'mail';

/**
 * Holds the mail indicators PIM has set on Actor nodes (SPEC_ACTOR_MAIL) and nothing else:
 * no unread counts, folder names or mail items.
 */
export class ActorMailStatus implements vscode.Disposable {
    private readonly _held = new Map<string, { kind: Kind; indicator: vscode.Disposable }>();
    private readonly _subscription: vscode.Disposable | undefined;
    private readonly _api: JarvisCoreApi | undefined;
    private _running = false;
    private _pending = false;
    private _disposed = false;
    constructor(api: JarvisCoreApi, private readonly _log: Log, initialRead = true) {
        if (typeof api.indicateActor !== 'function' || typeof api.onDidScanActors !== 'function') {
            this._log.warn('[Mail] Jarvis core lacks indicateActor/onDidScanActors; mail indicators are off');
            return;
        }
        this._api = api;
        this._subscription = api.onDidScanActors(() => { void this._read(); });
        if (initialRead) { void this._read(); }
    }

    /** Reads now; a call during a run is coalesced into one re-read after it. */
    requestRead(): void {
        void this._read();
    }

    dispose(): void {
        this._disposed = true;
        this._subscription?.dispose();
        for (const { indicator } of this._held.values()) { indicator.dispose(); }
        this._held.clear();
    }

    private async _read(): Promise<void> {
        if (!this._api || this._disposed) { return; }
        if (this._running) { this._pending = true; return; }
        this._running = true;
        try {
            await this._readOnce(this._api);
        } finally {
            this._running = false;
        }
        if (this._pending) {
            this._pending = false;
            void this._read();
        }
    }

    private async _readOnce(api: JarvisCoreApi): Promise<void> {
        const enabled = vscode.workspace.getConfiguration('jarvis').get<boolean>('outlook.enabled', false);
        if (!enabled) { this._debug('[Mail] read skipped: jarvis.outlook.enabled is false'); this._reconcile(api, new Map()); return; }

        const counts = new Map<string, number>();
        for (const actor of api.listActors()) { counts.set(actor.name, (counts.get(actor.name) ?? 0) + 1); }
        const candidates = api.listActors().filter(actor => counts.get(actor.name) === 1);
        if (candidates.length === 0) { this._debug('[Mail] read skipped: no uniquely named Actors'); this._reconcile(api, new Map()); return; }

        let folders: FolderMail[] = [];
        let failed = false;
        const started = Date.now();
        try {
            folders = await readActorMail(candidates.map(actor => actor.name), this._log);
        } catch (err) {
            failed = true;
            const reason = err instanceof Error ? err.message : String(err);
            this._log.warn(`[Mail] Outlook read failed: ${reason}`);
        }
        if (this._disposed) { return; }

        const desired = new Map<string, Kind>();
        let matched = 0;
        if (!failed) {
            for (const actor of candidates) {
                const folder = folders.find(f => f.name === actor.name);
                if (!folder) { continue; }
                matched++;
                if (folder.flagged) { desired.set(actor.id, 'flag'); }
                else if (folder.unread > 0) { desired.set(actor.id, 'mail'); }
            }
            if (folders.some(f => !f.checked)) {
                this._log.warn('[Mail] flag lookup skipped or failed for at least one folder; unread still shown');
            }
        }
        this._debug(`[Mail] read: candidates=${candidates.length} inboxFolders=${folders.length} matched=${matched} indicators=${desired.size} (flag=${[...desired.values()].filter(k => k === 'flag').length}) elapsed=${Date.now() - started} ms`);
        this._reconcile(api, desired);
    }

    /** Debug only (opt-in through the channel's log level): aggregate counts and reasons, no names or mail content. */
    private _debug(line: string): void {
        this._log.debug?.(line);
    }

    private _reconcile(api: JarvisCoreApi, desired: Map<string, Kind>): void {
        for (const [id, held] of [...this._held]) {
            if (desired.get(id) === held.kind) { continue; }
            held.indicator.dispose();
            this._held.delete(id);
        }
        for (const [id, kind] of desired) {
            if (this._held.has(id)) { continue; }
            const indicator = api.indicateActor(id, new vscode.ThemeIcon(kind));
            this._held.set(id, { kind, indicator });
        }
    }
}
