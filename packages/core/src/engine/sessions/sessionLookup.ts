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

let _stateVscdbPath: string | undefined;
let _log: vscode.LogOutputChannel | undefined;

/**
 * Resolve the VS Code User data path, with WSL2 detection.
 * In WSL2 the globalStorageUri points into the Linux filesystem, but
 * state.vscdb lives on the Windows side. Detect WSL2 via /proc/version
 * and construct the Windows-side path under /mnt/c.
 */
export function resolveUserDataPath(globalStorageUri: vscode.Uri): string {
    try {
        const procVersion = fs.readFileSync('/proc/version', 'utf-8');
        if (/microsoft/i.test(procVersion)) {
            const username = process.env.USERNAME ?? process.env.USER ?? 'unknown';
            if (username !== 'unknown') {
                return `/mnt/c/Users/${username}/AppData/Roaming/Code/User`;
            }
            _log?.warn('[sessionLookup] WSL2 detected but USERNAME/USER env vars are undefined — falling back to globalStorageUri resolution');
        }
    } catch {
        // /proc/version not readable (Windows/macOS/native Linux) — not WSL2
    }
    return path.resolve(globalStorageUri.fsPath, '../..');
}

/**
 * Initialize session lookup with devcontainer-compatible path resolution.
 * Uses globalStorageUri (always a local path) to anchor the userDataPath,
 * then reconstructs workspaceStorage/<hash>/state.vscdb locally.
 */
export function initSessionLookup(storageUri: vscode.Uri, globalStorageUri: vscode.Uri): void {
    const hash = path.basename(path.dirname(storageUri.fsPath));
    const userDataPath = resolveUserDataPath(globalStorageUri);
    _log?.debug(`[sessionLookup] resolved userDataPath: ${userDataPath}`);
    _stateVscdbPath = path.join(userDataPath, 'workspaceStorage', hash, 'state.vscdb');
}

export function setSessionLookupLogger(log: vscode.LogOutputChannel): void {
    _log = log;
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
    if (!fs.existsSync(dbPath)) {
        _log?.warn(`[sessionLookup] state.vscdb not found at: ${dbPath}`);
        return [];
    }
    // In the packaged extension, build.js copies sql-wasm.wasm next to the bundled
    // extension.js, so resolve it relative to this module. In dev (unbundled) the
    // copy is absent, so fall back to sql.js's own default resolution.
    const bundledWasm = path.join(__dirname, 'sql-wasm.wasm');
    const SQL = fs.existsSync(bundledWasm)
        ? await initSqlJs({ locateFile: (file: string) => path.join(__dirname, file) })
        : await initSqlJs();
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

/**
 * Reverse of lookupSessionUUID() (name -> uuid) — resolves a chat-session
 * id back to its title, for hook-driven activity tracking
 * (SPEC_HOOK_ACTIVITY). Same getAllSessions() data source, no new I/O path.
 */
export async function getEntityNameForSessionId(
    sessionId: string
): Promise<string | undefined> {
    const all = await getAllSessions();
    return all.find(s => s.sessionId === sessionId)?.title;
}

// Implementation: SPEC_AUT_HEARTBEAT_RESOLVER_REUSE
// Requirements: REQ_AUT_HEARTBEAT_RESOLVER_REUSE
// Shared destination validator — union of {chat session titles} ∪ {YAML entity names}
export async function getValidDestinations(
    scanner?: { entities: { name: string }[] }
): Promise<string[]> {
    const allSessions = await getAllSessions();
    const chatTitles = filterNamedSessions(allSessions).map(s => s.title);
    const entityNames = scanner?.entities?.map(e => e.name) ?? [];
    const union = new Set([...chatTitles, ...entityNames]);
    return [...union];
}
