// Implementation: SPEC_MSG_SESSIONLOOKUP
// Requirements: REQ_MSG_SESSIONLOOKUP, REQ_MSG_SESSIONFILTER

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import initSqlJs from 'sql.js';

interface SessionStoreEntry {
    sessionId: string;
    title: string;
}

interface SessionStore {
    version: number;
    entries: { [id: string]: SessionStoreEntry };
}

/**
 * Resolve the workspace-scoped state.vscdb path.
 * context.storageUri points to workspaceStorage/<hash>/<extensionId>/
 * so the parent directory contains the workspace-local state.vscdb.
 */
let _stateVscdbPath: string | undefined;

export function initSessionLookup(storageUri: vscode.Uri): void {
    _stateVscdbPath = path.join(path.dirname(storageUri.fsPath), 'state.vscdb');
}

function getStateVscdbPath(): string {
    if (!_stateVscdbPath) {
        throw new Error('Jarvis: session lookup not initialized — call initSessionLookup first');
    }
    return _stateVscdbPath;
}

export async function lookupSessionUUID(sessionName: string): Promise<string | undefined> {
    const all = await getAllSessions();
    const matches = all.filter(s => s.title === sessionName);
    if (matches.length === 0) { return undefined; }
    if (matches.length > 1) {
        vscode.window.showWarningMessage(
            `Jarvis: multiple chat sessions named "${sessionName}" — using first match`
        );
    }
    return matches[0].sessionId;
}

export interface SessionInfo {
    title: string;
    sessionId: string;
}

export async function getAllSessions(): Promise<SessionInfo[]> {
    const dbPath = getStateVscdbPath();
    if (!fs.existsSync(dbPath)) { return []; }
    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);
    try {
        const result = db.exec(
            "SELECT value FROM ItemTable WHERE key = 'chat.ChatSessionStore.index'"
        );
        if (result.length === 0 || result[0].values.length === 0) { return []; }
        const value = result[0].values[0][0] as string;
        const store: SessionStore = JSON.parse(value);
        return Object.values(store.entries).map(entry => ({
            title: entry.title,
            sessionId: entry.sessionId,
        }));
    } finally {
        db.close();
    }
}

// Shared filter helper (REQ_MSG_SESSIONFILTER)
export function filterNamedSessions(
    sessions: SessionInfo[]
): SessionInfo[] {
    return sessions.filter(s => s.title && s.title !== 'New Chat');
}
