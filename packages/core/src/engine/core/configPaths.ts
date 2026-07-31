// Implementation: SPEC_CFG_PATHRESOLVER
// Requirements: REQ_CFG_FIXEDPATHS

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/** Returns the first workspace root folder path, or undefined when no workspace is open. */
export function getWorkspaceRoot(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) { return undefined; }
    return folders[0].uri.fsPath;
}

/** Returns <workspaceRoot>/.jarvis, or undefined when no workspace is open. */
export function getJarvisDir(): string | undefined {
    const root = getWorkspaceRoot();
    return root ? path.join(root, '.jarvis') : undefined;
}

/**
 * Ensures the .jarvis/ directory exists (mkdir -p) and returns its path,
 * or undefined when no workspace is open.
 * Called on first write inside each persistence module — never at activation.
 */
export function ensureJarvisDir(): string | undefined {
    const dir = getJarvisDir();
    if (!dir) { return undefined; }
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

/** Returns <workspaceRoot>/.jarvis/heartbeat.yaml, or undefined. */
export function getHeartbeatPath(): string | undefined {
    const dir = getJarvisDir();
    return dir ? path.join(dir, 'heartbeat.yaml') : undefined;
}

/** Returns <workspaceRoot>/.jarvis/messages, or undefined.
 *  (GH #59) The group directory for message state — REQ_CFG_MSGDIR. */
export function getMessagesDir(): string | undefined {
    const dir = getJarvisDir();
    return dir ? path.join(dir, 'messages') : undefined;
}

/** Ensures <workspaceRoot>/.jarvis/messages exists (mkdir -p), or undefined.
 *  Called on first write, never at activation — REQ_CFG_FIXEDPATHS AC-1. */
export function ensureMessagesDir(): string | undefined {
    const dir = getMessagesDir();
    if (!dir) { return undefined; }
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

/** Returns <workspaceRoot>/.jarvis/messages/queue.json, or undefined. */
export function getMessagesPath(): string | undefined {
    const dir = getMessagesDir();
    return dir ? path.join(dir, 'queue.json') : undefined;
}

/** Returns <workspaceRoot>/.jarvis/reminders.yaml, or undefined.
 *  Not message state — stays directly under .jarvis/ (REQ_CFG_MSGDIR AC-4). */
export function getRemindersPath(): string | undefined {
    const dir = getJarvisDir();
    return dir ? path.join(dir, 'reminders.yaml') : undefined;
}

/** Returns <workspaceRoot>/.jarvis/messages/log.json, or undefined. */
export function getMessageLogPath(): string | undefined {
    const dir = getMessagesDir();
    return dir ? path.join(dir, 'log.json') : undefined;
}

/** Returns <workspaceRoot>/.jarvis/messages/autodelivery.json, or undefined. */
export function getAutoDeliveryPath(): string | undefined {
    const dir = getMessagesDir();
    return dir ? path.join(dir, 'autodelivery.json') : undefined;
}

/** (GH #59) Superseded flat paths, read-only, for migration — see
 *  SPEC_CFG_STATEMIGRATION. Exposed so that no consumer reconstructs
 *  them by hand (REQ_CFG_PATHSINGLESOURCE AC-2). */
export function getLegacyMessagesPath(): string | undefined {
    const dir = getJarvisDir();
    return dir ? path.join(dir, 'messages.json') : undefined;
}
export function getLegacyMessageLogPath(): string | undefined {
    const dir = getJarvisDir();
    return dir ? path.join(dir, 'message-log.json') : undefined;
}
export function getLegacyAutoDeliveryPath(): string | undefined {
    const dir = getJarvisDir();
    return dir ? path.join(dir, 'autodelivery.json') : undefined;
}

/** Returns <workspaceRoot>/.jarvis/sessions, or undefined when no workspace is open. */
export function getSessionsDir(): string | undefined {
    const dir = getJarvisDir();
    return dir ? path.join(dir, 'sessions') : undefined;
}

/** Ensures <workspaceRoot>/.jarvis/sessions exists (mkdir -p) and returns its path, or undefined. */
export function ensureSessionsDir(): string | undefined {
    const dir = getSessionsDir();
    if (!dir) { return undefined; }
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

/** Returns <workspaceRoot>/.jarvis/actors, or undefined when no workspace is open. */
export function getActorsDir(): string | undefined {
    const dir = getJarvisDir();
    return dir ? path.join(dir, 'actors') : undefined;
}

/** Ensures <workspaceRoot>/.jarvis/actors exists (mkdir -p) and returns its path, or undefined. */
export function ensureActorsDir(): string | undefined {
    const dir = getActorsDir();
    if (!dir) { return undefined; }
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

/** Returns <workspaceRoot>/.jarvis/state, or undefined when no workspace is open. */
export function getStateDir(): string | undefined {
    const dir = getJarvisDir();
    return dir ? path.join(dir, 'state') : undefined;
}

/** Ensures <workspaceRoot>/.jarvis/state exists (mkdir -p) and returns its path, or undefined. */
export function ensureStateDir(): string | undefined {
    const dir = getStateDir();
    if (!dir) { return undefined; }
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

/** Returns <workspaceRoot>/.jarvis/state/release-notes.json, or undefined. */
export function getReleaseNotesStatePath(): string | undefined {
    const dir = getStateDir();
    return dir ? path.join(dir, 'release-notes.json') : undefined;
}

// --- WORKSPACE_PATHS (GH #60, SPEC_CFG_PATHRESOLVER) ---

type Durability = 'transient' | 'durable';

export const WORKSPACE_PATHS: ReadonlyArray<{ rel: string; durability: Durability }> = [
    { rel: '.jarvis/logs/',              durability: 'transient' },
    { rel: '.jarvis/messages/',          durability: 'transient' },
    { rel: '.jarvis/state/',             durability: 'transient' },
    { rel: '.jarvis/heartbeat.yaml',     durability: 'transient' },
    { rel: '.jarvis/reminders.yaml',     durability: 'transient' },
    { rel: '.jarvis/syspilot-state.json', durability: 'transient' },
    { rel: '.github/hooks/jarvis-*',     durability: 'transient' },
    { rel: '.jarvis/actors/',            durability: 'durable' },
    { rel: '.jarvis/sessions/',          durability: 'durable' },
];

/** The entries of the managed .gitignore region, in declaration order.
 *  Independent of whether a workspace is open (paths are workspace-relative). */
export function getIgnoreEntries(): string[] {
    return WORKSPACE_PATHS
        .filter(p => p.durability === 'transient')
        .map(p => p.rel);
}
