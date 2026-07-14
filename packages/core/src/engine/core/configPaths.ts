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

/** Returns <workspaceRoot>/.jarvis/messages.json, or undefined. */
export function getMessagesPath(): string | undefined {
    const dir = getJarvisDir();
    return dir ? path.join(dir, 'messages.json') : undefined;
}

/** Returns <workspaceRoot>/.jarvis/reminders.yaml, or undefined. */
export function getRemindersPath(): string | undefined {
    const dir = getJarvisDir();
    return dir ? path.join(dir, 'reminders.yaml') : undefined;
}

/** Returns <workspaceRoot>/.jarvis/message-log.json, or undefined. */
export function getMessageLogPath(): string | undefined {
    const dir = getJarvisDir();
    return dir ? path.join(dir, 'message-log.json') : undefined;
}

/** Returns <workspaceRoot>/.jarvis/autodelivery.json, or undefined. */
export function getAutoDeliveryPath(): string | undefined {
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
