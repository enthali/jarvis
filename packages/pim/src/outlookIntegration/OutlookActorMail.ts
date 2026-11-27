// Implementation: SPEC_ACTOR_MAIL
// Requirements: REQ_ACTOR_MAIL, REQ_OLK_ENABLE

import * as childProcess from 'child_process';

const READ_TIMEOUT_MS = 10_000;

export interface Log { warn(message: string): void; debug?(message: string): void; }

export interface FolderMail {
    name: string;      // Inbox subfolder name
    unread: number;    // UnReadItemCount
    flagged: boolean;  // at least one item with FlagStatus 2; false when not looked up
    checked: boolean;  // false when the flag lookup was skipped or failed
}

/**
 * Attach to a running Outlook only (never start it); read the direct Inbox subfolders (SPEC_ACTOR_MAIL).
 * Candidate names arrive in JARVIS_ACTOR_NAMES as data and are never part of this text (REQ_ACTOR_MAIL AC-18).
 */
export const READ_SCRIPT = `
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'   # without it a failed attach exits 0 and prints []
$clock = [Diagnostics.Stopwatch]::StartNew()
$wanted = @(ConvertFrom-Json $env:JARVIS_ACTOR_NAMES | ForEach-Object { $_ })
$ol = [Runtime.InteropServices.Marshal]::GetActiveObject('Outlook.Application')  # attach only
$inbox = $ol.Session.GetDefaultFolder(6)                                        # olFolderInbox
$rows = @(foreach ($f in $inbox.Folders) {
    [pscustomobject]@{ f = $f; name = $f.Name; unread = $f.UnReadItemCount }
})
$list = @(foreach ($r in $rows) {
    $flagged = $false; $checked = $true
    if ($wanted -ccontains $r.name) {
        if ($clock.ElapsedMilliseconds -lt 5000) {
            try { $t = $r.f.GetTable('[FlagStatus] >= 2'); $flagged = -not $t.EndOfTable }   # 2 = olFlagMarked; '= 2' matches nothing on some stores, '>= 2' does
            catch { $checked = $false }
        } else { $checked = $false }
    }
    [pscustomobject]@{ name = $r.name; unread = $r.unread; flagged = $flagged; checked = $checked }
})
ConvertTo-Json -InputObject $list -Compress
`;

/** Parses the read output; `undefined` when it is not a JSON array (SPEC_ACTOR_MAIL step 5). */
export function parseFolderMail(stdout: string): FolderMail[] | undefined {
    let parsed: unknown;
    try {
        parsed = JSON.parse(stdout.trim());
    } catch {
        return undefined;
    }
    if (!Array.isArray(parsed)) { return undefined; }
    const folders: FolderMail[] = [];
    for (const entry of parsed) {
        if (entry && typeof entry === 'object') {
            const { name, unread, flagged, checked } = entry as Record<string, unknown>;
            if (typeof name === 'string' && typeof unread === 'number') {
                folders.push({ name, unread, flagged: flagged === true, checked: checked !== false });
            }
        }
    }
    return folders;
}

/**
 * Stateless read of the Inbox subfolders (SPEC_ACTOR_MAIL step 4). Rejects on any failure:
 * non-Windows platform, non-zero exit, timeout or output that is not a JSON array.
 */
export function readActorMail(actorNames: string[], _log: Log): Promise<FolderMail[]> {
    if (process.platform !== 'win32') {
        return Promise.reject(new Error('platform is not Windows'));
    }
    return new Promise((resolve, reject) => {
        childProcess.execFile(
            'powershell',
            ['-NoProfile', '-Command', READ_SCRIPT],
            {
                timeout: READ_TIMEOUT_MS,
                windowsHide: true,
                env: { ...process.env, JARVIS_ACTOR_NAMES: JSON.stringify(actorNames) },
            },
            (error, stdout, stderr) => {
                if (error) {
                    // Summarised on purpose: error.message would carry the whole script.
                    const reason = error.killed
                        ? `timed out after ${READ_TIMEOUT_MS / 1000} s`
                        : `exit ${error.code ?? error.signal ?? 'error'}: ${(stderr ?? '').trim().split(/\r?\n/)[0] ?? ''}`;
                    reject(new Error(reason));
                    return;
                }
                const folders = parseFolderMail(stdout);
                if (!folders) {
                    reject(new Error('output is not a JSON array'));
                    return;
                }
                resolve(folders);
            },
        );
    });
}
