// Implementation: SPEC_COM_AHPDISCOVERY (finding the Agent Host), SPEC_COM_CLIENTMODULE (userDataDir)
// No `vscode` import: this folder must stay movable into a process of its own.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/** One file of the Agent Host endpoint registry of a VS Code instance. */
export interface AgentHostEntry {
    schemaVersion: number;
    type: string;
    pid: number;
    instanceId: string;
    /** `socket`: named pipe / Unix socket (desktop). `tcp`: loopback port (VS Code Server, e.g. Codespaces). */
    endpoint: { type: 'socket'; path: string } | { type: 'tcp'; host: string; port: number };
    connectionToken: string;
    protocolVersion: string;
}

export interface RegistryScan {
    /** The entry to connect to, when one is left after filtering. */
    entry?: AgentHostEntry;
    /** All entries left after filtering, newest first. A reused pid can make a stale entry look live, so callers try them in turn. */
    candidates: AgentHostEntry[];
    entriesDir: string;
    /** Why no entry was chosen; set exactly when `entry` is undefined. */
    reason?: string;
    counts: { files: number; unreadable: number; deadPid: number; otherType: number; otherEndpoint: number; otherSchema: number; live: number };
}

export function registryEntriesDir(userDataDir: string): string {
    return path.join(userDataDir, 'agent-host', 'local-endpoint', 'entries');
}

/** True when the process exists. EPERM means it exists but is not ours. */
export function isPidAlive(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch (err) {
        return (err as NodeJS.ErrnoException).code === 'EPERM';
    }
}

/** Describes the endpoint for log lines. */
export function describeEndpoint(entry: AgentHostEntry): string {
    return entry.endpoint.type === 'tcp' ? `tcp ${entry.endpoint.host}:${entry.endpoint.port}` : entry.endpoint.path;
}

function validEndpoint(ep: unknown): boolean {
    const e = ep as { type?: unknown; path?: unknown; host?: unknown; port?: unknown } | undefined;
    if (e?.type === 'socket') { return typeof e.path === 'string'; }
    if (e?.type === 'tcp') { return typeof e.host === 'string' && typeof e.port === 'number'; }
    return false;
}

/**
 * Reads the registry and returns the live entry to use (SPEC_COM_AHPDISCOVERY steps 1-3).
 * An `editor` host (desktop) is preferred over a `standalone` one (VS Code Server starts one per machine).
 * Entries of ended hosts stay in the folder, so most files are dropped.
 * Never writes: the registry belongs to VS Code.
 */
export function scanRegistry(userDataDir: string, alive: (pid: number) => boolean = isPidAlive): RegistryScan {
    const entriesDir = registryEntriesDir(userDataDir);
    const counts = { files: 0, unreadable: 0, deadPid: 0, otherType: 0, otherEndpoint: 0, otherSchema: 0, live: 0 };

    let names: string[];
    try {
        names = fs.readdirSync(entriesDir).filter(n => n.endsWith('.json'));
    } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        const why = code === 'ENOENT' ? 'registry folder does not exist yet' : `registry folder not readable (${code ?? err})`;
        return { entriesDir, candidates: [], reason: `${why}: ${entriesDir}`, counts };
    }
    counts.files = names.length;

    const candidates: { entry: AgentHostEntry; mtimeMs: number }[] = [];
    for (const name of names) {
        const file = path.join(entriesDir, name);
        let entry: AgentHostEntry;
        let mtimeMs: number;
        try {
            entry = JSON.parse(fs.readFileSync(file, 'utf8')) as AgentHostEntry;
            mtimeMs = fs.statSync(file).mtimeMs;
        } catch {
            counts.unreadable++;
            continue;
        }
        if (entry.schemaVersion !== 2) { counts.otherSchema++; continue; }
        if (typeof entry.pid !== 'number' || !alive(entry.pid)) { counts.deadPid++; continue; }
        if (entry.type !== 'editor' && entry.type !== 'standalone') { counts.otherType++; continue; }
        if (!validEndpoint(entry.endpoint)) { counts.otherEndpoint++; continue; }
        if (typeof entry.connectionToken !== 'string' || typeof entry.protocolVersion !== 'string') { counts.unreadable++; continue; }
        candidates.push({ entry, mtimeMs });
    }
    counts.live = candidates.length;

    if (candidates.length === 0) {
        const c = counts;
        return {
            entriesDir,
            candidates: [],
            counts,
            reason: `no live entry among ${c.files} file(s) (dead pid ${c.deadPid}, other type ${c.otherType}, other endpoint ${c.otherEndpoint}, other schema ${c.otherSchema}, unreadable ${c.unreadable})`,
        };
    }
    // At most one is live per VS Code instance, except briefly during a restart: take the newest, editor first.
    const rank = (e: AgentHostEntry): number => (e.type === 'editor' ? 0 : 1);
    candidates.sort((a, b) => rank(a.entry) - rank(b.entry) || b.mtimeMs - a.mtimeMs);
    return { entry: candidates[0].entry, candidates: candidates.map(c => c.entry), entriesDir, counts };
}

/**
 * Derives the user data folder of the VS Code instance from the extension's global storage folder
 * (SPEC_COM_CLIENTMODULE). The folder is `<userData>/User/globalStorage/<id>` in the default profile and
 * `<userData>/User/profiles/<profile>/globalStorage/<id>` in any other profile.
 * Returns undefined when the path has neither shape.
 */
export function userDataDirFromGlobalStorage(globalStoragePath: string): string | undefined {
    const parts = path.resolve(globalStoragePath).split(path.sep);
    const at = parts.lastIndexOf('globalStorage');
    if (at < 1) { return undefined; }
    let before = parts.slice(0, at);
    if (before.length >= 2 && before[before.length - 2] === 'profiles') {
        before = before.slice(0, -2);
    }
    if (before[before.length - 1] !== 'User') { return undefined; }
    const userData = before.slice(0, -1).join(path.sep);
    return userData === '' ? path.sep : userData;
}

/**
 * The user data folder of the desktop VS Code with the given product `nameShort` (`Code`, `Code - Insiders`).
 * VS Code Server (remote, Codespaces) keeps its Agent Host registry there, not below its own `--server-data-dir`.
 * Mirrors the server's rule: VSCODE_PORTABLE, VSCODE_APPDATA, else the platform's app-data folder.
 */
export function desktopUserDataDir(
    nameShort: string,
    env: NodeJS.ProcessEnv = process.env,
    platform: NodeJS.Platform = process.platform,
    home: string = os.homedir(),
): string | undefined {
    if (env.VSCODE_PORTABLE) { return path.join(env.VSCODE_PORTABLE, 'user-data'); }
    if (env.VSCODE_APPDATA) { return path.join(env.VSCODE_APPDATA, nameShort); }
    switch (platform) {
        case 'win32': return path.join(env.APPDATA ?? path.join(env.USERPROFILE ?? home, 'AppData', 'Roaming'), nameShort);
        case 'darwin': return path.join(home, 'Library', 'Application Support', nameShort);
        case 'linux': return path.join(env.XDG_CONFIG_HOME || path.join(home, '.config'), nameShort);
        default: return undefined;
    }
}
