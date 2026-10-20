// Implementation: SPEC_ACTOR_MAIL
// Requirements: REQ_ACTOR_MAIL, REQ_OLK_ENABLE

import * as vscode from 'vscode';
import * as childProcess from 'child_process';
import type { ActorScanner } from './actorScanner';

const READ_TIMEOUT_MS = 10_000;

/** Attach to a running Outlook only (never start it); list the direct Inbox subfolders (SPEC_ACTOR_MAIL). */
const READ_SCRIPT = `
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'
$ol = [Runtime.InteropServices.Marshal]::GetActiveObject('Outlook.Application')  # attach only
$inbox = $ol.Session.GetDefaultFolder(6)                                        # olFolderInbox
$list = @(foreach ($f in $inbox.Folders) {
    [pscustomobject]@{ name = $f.Name; unread = $f.UnReadItemCount }
})
ConvertTo-Json -InputObject $list -Compress
`;

export interface MailFolderCount {
    name: string;
    unread: number;
}

/** Parses the read output; `undefined` when it is not a JSON array (SPEC_ACTOR_MAIL step 5). */
export function parseMailFolders(stdout: string): MailFolderCount[] | undefined {
    let parsed: unknown;
    try {
        parsed = JSON.parse(stdout.trim());
    } catch {
        return undefined;
    }
    if (!Array.isArray(parsed)) { return undefined; }
    const folders: MailFolderCount[] = [];
    for (const entry of parsed) {
        if (entry && typeof entry === 'object') {
            const { name, unread } = entry as Record<string, unknown>;
            if (typeof name === 'string' && typeof unread === 'number') {
                folders.push({ name, unread });
            }
        }
    }
    return folders;
}

/**
 * SPEC_ACTOR_MAIL step 4: the ids of the Actors whose name matches a folder
 * with unread items. Only a `found` name counts; `unknown` and `ambiguous` add nothing.
 */
export function unreadActorIds(folders: MailFolderCount[], scanner: ActorScanner): Set<string> {
    const ids = new Set<string>();
    for (const folder of folders) {
        if (folder.unread <= 0) { continue; }
        const lookup = scanner.resolveName(folder.name);
        if (lookup.status === 'found') { ids.add(lookup.actor.id); }
    }
    return ids;
}

function runReadScript(): Promise<string> {
    if (process.platform !== 'win32') {
        return Promise.reject(new Error('platform is not Windows'));
    }
    return new Promise((resolve, reject) => {
        childProcess.execFile(
            'powershell',
            ['-NoProfile', '-Command', READ_SCRIPT],
            { timeout: READ_TIMEOUT_MS, windowsHide: true },
            (error, stdout, stderr) => {
                if (error) {
                    // Summarised on purpose: error.message would carry the whole script.
                    const reason = error.killed
                        ? `timed out after ${READ_TIMEOUT_MS / 1000} s`
                        : `exit ${error.code ?? error.signal ?? 'error'}: ${(stderr ?? '').trim().split(/\r?\n/)[0] ?? ''}`;
                    reject(new Error(reason));
                    return;
                }
                resolve(stdout);
            },
        );
    });
}

function sameIds(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) { return false; }
    for (const id of a) {
        if (!b.has(id)) { return false; }
    }
    return true;
}

/**
 * Holds the ids of the Actors whose Outlook Inbox subfolder holds unread mail
 * (SPEC_ACTOR_MAIL). Nothing else is kept; the set is replaced at every read.
 */
export class ActorMailState implements vscode.Disposable {
    private _unreadIds = new Set<string>();
    private _running = false;
    private _pending = false;
    private readonly _subscription: vscode.Disposable;

    constructor(
        private readonly _scanner: ActorScanner,
        private readonly _log: { warn(message: string): void },
        private readonly _onChange: () => void,
    ) {
        this._subscription = _scanner.onDidScan(() => { void this._read(); });
    }

    /** True only for an Actor whose same-named Inbox subfolder had unread items in the latest read. */
    isUnread(actorId: string): boolean {
        return this._unreadIds.has(actorId);
    }

    dispose(): void {
        this._subscription.dispose();
    }

    /** Reads now (SPEC_ACTOR_MAIL); a call during a run is coalesced into one re-read after it. */
    requestRead(): void {
        void this._read();
    }

    private async _read(): Promise<void> {
        if (this._running) { this._pending = true; return; }
        this._running = true;
        try {
            await this._readOnce();
        } finally {
            this._running = false;
        }
        if (this._pending) {
            this._pending = false;
            void this._read();
        }
    }

    private async _readOnce(): Promise<void> {
        const enabled = vscode.workspace.getConfiguration('jarvis').get<boolean>('outlook.enabled', false);
        if (!enabled) {
            this._apply(new Set());   // REQ_OLK_ENABLE AC-2: no process is started
            return;
        }
        let next: Set<string>;
        try {
            const folders = parseMailFolders(await runReadScript());
            if (!folders) { throw new Error('output is not a JSON array'); }
            next = unreadActorIds(folders, this._scanner);
        } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            this._log.warn(`[Mail] Outlook read failed: ${reason}`);   // REQ_ACTOR_MAIL AC-10
            next = new Set();
        }
        this._apply(next);
    }

    private _apply(next: Set<string>): void {
        if (sameIds(next, this._unreadIds)) { return; }
        this._unreadIds = next;
        this._onChange();
    }
}
