// Implementation: SPEC_COM_BINDING, SPEC_COM_AHPDISCOVERY
// No `vscode` import: this folder must stay movable into a process of its own.
//
// Small shared pieces: the link a connected client offers to the message path, session listing and the
// comparison of working folders.

import { pathToFileURL } from 'url';

export type AhpSeverity = 'debug' | 'info' | 'warn' | 'error';
export type AhpLog = (severity: AhpSeverity, text: string) => void;

/** What the message path needs from a live connection to the Agent Host. */
export interface HostLink {
    readonly clientId: string;
    request<T = unknown>(method: string, params: unknown): Promise<T>;
    /** Sends an action; returns the client sequence number the host echoes in `origin`. */
    dispatch(channel: string, action: object): number;
}

export interface SessionSummary {
    resource?: string;
    provider?: string;
    title?: string;
    status?: number;
    modifiedAt?: string | number;
    workingDirectories?: string[];
    _meta?: { workingDirectoryKeys?: Record<string, string> } & Record<string, unknown>;
    [key: string]: unknown;
}

export const ROOT = 'ahp-root://';
const MAX_SESSION_PAGES = 50;

/** All pages of `listSessions` (the list is paginated). `cutOff` is true when the host offers more than the page limit allows. */
export async function listAllSessions(link: Pick<HostLink, 'request'>): Promise<{ sessions: SessionSummary[]; cutOff: boolean }> {
    const sessions: SessionSummary[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_SESSION_PAGES; page++) {
        const res = await link.request<{ items?: SessionSummary[]; nextCursor?: string }>('listSessions', cursor ? { channel: ROOT, cursor } : { channel: ROOT });
        sessions.push(...(res?.items ?? []));
        cursor = res?.nextCursor;
        if (!cursor) { return { sessions, cutOff: false }; }
    }
    return { sessions, cutOff: true };
}

/** `subscribe` answers with `{ snapshot: { state } }`; older shapes carry the state directly. */
export function unwrapSnapshot(result: unknown): Record<string, any> {
    const r = result as { snapshot?: { state?: unknown }; state?: unknown } | undefined;
    return (r?.snapshot?.state ?? r?.state ?? r ?? {}) as Record<string, any>;
}

export function fileUri(fsPath: string): string {
    return pathToFileURL(fsPath).toString();
}

/**
 * Key for comparing working folders: the host spells drive letters in lower case with `%3A`
 * (`file:///c%3A/x`), the extension host in upper case (`C:\x`) (FI-2026-10-28).
 */
export function folderKey(folder: string): string {
    let p = folder;
    if (/^file:/i.test(p)) {
        try { p = decodeURIComponent(new URL(p).pathname); } catch { p = p.replace(/^file:\/\//i, ''); }
        p = p.replace(/^\/([A-Za-z]:)/, '$1');
    }
    p = p.replace(/\\/g, '/').replace(/\/+$/, '');
    return process.platform === 'linux' ? p : p.toLowerCase();
}

export function sessionHasFolder(summary: SessionSummary, folder: string): boolean {
    const want = folderKey(folder);
    return (summary.workingDirectories ?? []).some(wd => folderKey(wd) === want);
}

export function modifiedTime(summary: SessionSummary): number {
    const raw = summary.modifiedAt ?? (summary as { lastModified?: unknown }).lastModified;
    if (typeof raw === 'number') { return raw; }
    const t = typeof raw === 'string' ? Date.parse(raw) : NaN;
    return Number.isNaN(t) ? 0 : t;
}
