// REQ_COM_CLIENT AC-2..AC-4, REQ_COM_AGENTHOST AC-1..AC-5, REQ_COM_LOG AC-1/AC-2 (drafts)
// SPEC_COM_CLIENTMODULE, SPEC_COM_AHPDISCOVERY, SPEC_COM_LOGGING
// A fake Agent Host listens on a real named pipe / Unix socket behind the same token check as VS Code.
import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { WebSocketServer } from 'ws';
import { AhpClient, userDataDirFromGlobalStorage } from '../../packages/core/src/engine/ahp';
import { scanRegistry, registryEntriesDir, desktopUserDataDir, type AgentHostEntry } from '../../packages/core/src/engine/ahp/registry';

type Handler = (method: string, params: any) => unknown;

interface FakeHost {
    path: string;
    /** Set when the host listens on loopback TCP (VS Code Server) instead of a pipe. */
    port?: number;
    token: string;
    received: { method: string; params: any }[];
    clients: () => number;
    push: (method: string, params: unknown) => void;
    /** Ends the host the way a crash does: every client connection is cut. */
    crash: () => Promise<void>;
    stop: () => Promise<void>;
}

const cleanups: (() => Promise<void> | void)[] = [];
afterEach(async () => { for (const c of cleanups.splice(0).reverse()) { await c(); } });

const defaultHandler: Handler = (method, params) => {
    if (method === 'initialize') {
        return {
            protocolVersion: params.protocolVersions[0],
            serverSeq: 1,
            serverInfo: { name: 'fake-host', version: '9.9' },
            completionTriggerCharacters: ['@', '/'],
            snapshots: [{
                resource: 'ahp-root://',
                fromSeq: 1,
                state: {
                    agents: [{ provider: 'copilotcli', displayName: 'Copilot CLI', description: 'd', models: [{}, {}], capabilities: { multipleChats: { fork: true } } }],
                    activeSessions: 3,
                    _meta: { hostBuild: { version: '1.143.1', quality: 'stable' } },
                },
            }],
        };
    }
    if (method === 'listSessions') {
        return params.cursor
            ? { items: [{ resource: 'copilotcli:/b', provider: 'copilotcli', title: 'Second page' }] }
            : { items: [{ resource: 'copilotcli:/a', provider: 'copilotcli', title: 'First page' }], nextCursor: 'c1' };
    }
    return null;
};

let hostCounter = 0;
async function startFakeHost(handler: Handler = defaultHandler, token = `tok-${Math.random().toString(36).slice(2)}`, tcp = false): Promise<FakeHost> {
    const name = `jarvis-ahp-test-${process.pid}-${Date.now()}-${hostCounter++}`;
    const pipe = process.platform === 'win32' ? `\\\\.\\pipe\\${name}` : path.join(os.tmpdir(), `${name}.sock`);
    const received: FakeHost['received'] = [];
    const server = http.createServer();
    const wss = new WebSocketServer({
        server,
        verifyClient: (info, cb) => {
            const tkn = new URL(info.req.url ?? '', 'http://localhost').searchParams.get('tkn');
            cb(tkn === token, 403, 'Forbidden');
        },
    });
    wss.on('connection', ws => {
        ws.on('message', raw => {
            const msg = JSON.parse(raw.toString());
            received.push({ method: msg.method, params: msg.params });
            if (msg.id === undefined) { return; }
            try {
                ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: handler(msg.method, msg.params) }));
            } catch (e) {
                ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: e }));
            }
        });
    });
    if (tcp) { await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); }
    else { await new Promise<void>(resolve => server.listen(pipe, resolve)); }
    const host: FakeHost = {
        path: pipe,
        port: tcp ? (server.address() as { port: number }).port : undefined,
        token,
        received,
        clients: () => wss.clients.size,
        push: (method, params) => { wss.clients.forEach(client => client.send(JSON.stringify({ jsonrpc: '2.0', method, params }))); },
        crash: async () => { wss.clients.forEach(c => c.terminate()); await new Promise<void>(r => server.close(() => r())); },
        stop: async () => { wss.clients.forEach(c => c.terminate()); await new Promise<void>(r => server.close(() => r())); },
    };
    cleanups.push(async () => { try { await host.stop(); } catch { /* already stopped */ } });
    return host;
}

function makeUserData(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-ahp-ud-'));
    cleanups.push(() => fs.rmSync(dir, { recursive: true, force: true }));
    return dir;
}

function entryFor(host: FakeHost, over: Partial<AgentHostEntry> = {}): AgentHostEntry {
    return {
        schemaVersion: 2, type: 'editor', pid: 1001, instanceId: 'inst', protocolVersion: '1.1.0',
        endpoint: { type: 'socket', path: host.path }, connectionToken: host.token, ...over,
    };
}

function writeEntry(userData: string, name: string, entry: unknown, mtime?: Date): string {
    const dir = registryEntriesDir(userData);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${name}.json`);
    fs.writeFileSync(file, typeof entry === 'string' ? entry : JSON.stringify(entry));
    if (mtime) { fs.utimesSync(file, mtime, mtime); }
    return file;
}

function makeClient(userData: string, over: Record<string, unknown> = {}) {
    const lines: string[] = [];
    const client = new AhpClient({
        userDataDir: userData,
        log: (sev, text) => lines.push(`${sev} ${text}`),
        isPidAlive: () => true,
        retryBaseDelayMs: 20, retryMaxDelayMs: 60,
        connectTimeoutMs: 1500, requestTimeoutMs: 1500,
        ...over,
    });
    cleanups.push(() => client.dispose());
    return { client, lines };
}

async function until(cond: () => boolean, what: string, ms = 4000): Promise<void> {
    const start = Date.now();
    while (!cond()) {
        if (Date.now() - start > ms) { throw new Error(`timed out waiting for: ${what}`); }
        await new Promise(r => setTimeout(r, 10));
    }
}

const has = (lines: string[], text: string): boolean => lines.some(l => l.includes(text));

describe('SPEC_COM_AHPDISCOVERY: registry scan', () => {
    it('keeps live editor, standalone and TCP entries, editor first, and drops dead, other-schema, other-endpoint and unreadable ones', () => {
        const ud = makeUserData();
        const host = { path: '\\\\.\\pipe\\x', token: 't' } as FakeHost;
        writeEntry(ud, 'live', entryFor(host, { pid: 1, instanceId: 'live' }), new Date(Date.now() - 60_000));
        writeEntry(ud, 'dead', entryFor(host, { pid: 2, instanceId: 'dead' }));
        writeEntry(ud, 'standalone', entryFor(host, { pid: 1, type: 'standalone', instanceId: 'sa', endpoint: { type: 'tcp', host: '127.0.0.1', port: 1 } }));
        writeEntry(ud, 'v1', entryFor(host, { pid: 1, schemaVersion: 1, instanceId: 'v1' }));
        writeEntry(ud, 'badtcp', entryFor(host, { pid: 1, endpoint: { type: 'tcp', path: '127.0.0.1:1' } as never, instanceId: 'badtcp' }));
        writeEntry(ud, 'broken', '{ not json');
        const scan = scanRegistry(ud, pid => pid === 1);
        expect(scan.entry?.instanceId).toBe('live');
        expect(scan.candidates.map(c => c.instanceId)).toEqual(['live', 'sa']);
        expect(scan.counts).toMatchObject({ files: 6, live: 2, deadPid: 1, otherType: 0, otherSchema: 1, otherEndpoint: 1, unreadable: 1 });
    });

    it('takes the more recently written entry when two are live', () => {
        const ud = makeUserData();
        const host = { path: 'p', token: 't' } as FakeHost;
        writeEntry(ud, 'old', entryFor(host, { instanceId: 'old' }), new Date(Date.now() - 60_000));
        writeEntry(ud, 'new', entryFor(host, { instanceId: 'new' }), new Date());
        expect(scanRegistry(ud, () => true).entry?.instanceId).toBe('new');
    });

    it('names the reason when the folder is missing or nothing is live, and writes nothing', () => {
        const ud = makeUserData();
        expect(scanRegistry(ud).reason).toMatch(/does not exist/);
        const host = { path: 'p', token: 't' } as FakeHost;
        const file = writeEntry(ud, 'dead', entryFor(host));
        const before = fs.readFileSync(file, 'utf8');
        const scan = scanRegistry(ud, () => false);
        expect(scan.entry).toBeUndefined();
        expect(scan.reason).toMatch(/no live entry among 1 file/);
        expect(fs.readFileSync(file, 'utf8')).toBe(before);
        expect(fs.readdirSync(registryEntriesDir(ud))).toEqual(['dead.json']);
    });
});

describe('SPEC_COM_AHPDISCOVERY: VS Code Server (remote, Codespaces)', () => {
    it('finds a standalone TCP host in a fallback user data folder and connects to it', async () => {
        const host = await startFakeHost(defaultHandler, undefined, true);
        const own = makeUserData();
        const desktop = makeUserData();
        writeEntry(desktop, 'sa', entryFor(host, { type: 'standalone', endpoint: { type: 'tcp', host: '127.0.0.1', port: host.port! } }));
        const { client, lines } = makeClient(own, { fallbackUserDataDirs: [desktop] });
        client.start();
        await until(() => client.isConnected(), 'connected over tcp');
        expect(has(lines, `trying standalone pid 1001, instance inst, tcp 127.0.0.1:${host.port}`)).toBe(true);
        expect(lines.join('\n')).not.toContain(host.token);
    });

    it('names the reasons of every folder when none has a live entry', async () => {
        const own = makeUserData();
        const desktop = makeUserData();
        const { client, lines } = makeClient(own, { fallbackUserDataDirs: [desktop] });
        client.start();
        await until(() => has(lines, 'no connection to the Agent Host yet'), 'miss logged');
        const miss = lines.find(l => l.includes('no connection to the Agent Host yet'))!;
        expect(miss).toContain(registryEntriesDir(own));
        expect(miss).toContain(registryEntriesDir(desktop));
    });

    it.each([
        ['linux', { XDG_CONFIG_HOME: '/x/cfg' }, '/x/cfg/Code'],
        ['linux', {}, '/h/.config/Code'],
        ['darwin', {}, '/h/Library/Application Support/Code'],
        ['linux', { VSCODE_APPDATA: '/app' }, '/app/Code'],
        ['linux', { VSCODE_PORTABLE: '/p' }, '/p/user-data'],
    ] as const)('desktop user data folder on %s with %j is %s', (platform, env, expected) => {
        if (process.platform === 'win32') { return; }
        expect(desktopUserDataDir('Code', env as NodeJS.ProcessEnv, platform, '/h')).toBe(expected);
    });
});

describe('SPEC_COM_CLIENTMODULE: userDataDir from the global storage folder', () => {
    it.each([
        ['C:\\Users\\x\\AppData\\Roaming\\Code\\User\\globalStorage\\enthali.jarvis-core', 'C:\\Users\\x\\AppData\\Roaming\\Code'],
        ['C:\\Users\\x\\AppData\\Roaming\\Code\\User\\profiles\\-331be12b\\globalStorage\\enthali.jarvis-core', 'C:\\Users\\x\\AppData\\Roaming\\Code'],
    ])('derives %s', (input, expected) => {
        if (process.platform !== 'win32') { return; }
        expect(userDataDirFromGlobalStorage(input)).toBe(expected);
    });

    it.each([
        ['/home/x/.config/Code/User/globalStorage/enthali.jarvis-core', '/home/x/.config/Code'],
        ['/home/x/.config/Code/User/profiles/abc/globalStorage/enthali.jarvis-core', '/home/x/.config/Code'],
    ])('derives %s', (input, expected) => {
        if (process.platform === 'win32') { return; }
        expect(userDataDirFromGlobalStorage(input)).toBe(expected);
    });

    it('returns undefined for a path of neither shape', () => {
        expect(userDataDirFromGlobalStorage(path.join(os.tmpdir(), 'somewhere', 'else'))).toBeUndefined();
        expect(userDataDirFromGlobalStorage(path.join(os.tmpdir(), 'globalStorage', 'x'))).toBeUndefined();
    });
});

describe('SPEC_COM_CLIENTMODULE: module boundary', () => {
    it('no file of the module imports vscode (REQ_COM_CLIENT AC-2)', () => {
        const dir = path.resolve(__dirname, '../../packages/core/src/engine/ahp');
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));
        expect(files.length).toBeGreaterThan(0);
        for (const f of files) {
            expect(fs.readFileSync(path.join(dir, f), 'utf8'), f).not.toMatch(/from 'vscode'|require\('vscode'\)/);
        }
    });
});

describe('SPEC_COM_AHPDISCOVERY: recording', () => {
    it('connects, then logs protocol version, announced capabilities and every session (all pages)', async () => {
        const host = await startFakeHost();
        const ud = makeUserData();
        writeEntry(ud, 'e', entryFor(host));
        const { client, lines } = makeClient(ud);
        client.start();
        await until(() => has(lines, 'session copilotcli:/b'), 'last session logged');

        expect(has(lines, 'protocol version negotiated: 1.1.0')).toBe(true);
        expect(has(lines, 'host: {"name":"fake-host","version":"9.9"}')).toBe(true);
        expect(has(lines, 'host build: version 1.143.1, quality stable')).toBe(true);
        expect(has(lines, 'announced by initialize')).toBe(true);
        expect(has(lines, 'completionTriggerCharacters')).toBe(true);
        expect(has(lines, 'agent copilotcli "Copilot CLI": 2 model(s)')).toBe(true);
        expect(has(lines, '"multipleChats":{"fork":true}')).toBe(true);
        expect(has(lines, 'sessions: 2')).toBe(true);
        expect(has(lines, 'session copilotcli:/a | provider copilotcli | title "First page"')).toBe(true);
        expect(has(lines, 'session copilotcli:/b | provider copilotcli | title "Second page"')).toBe(true);
        // the log carries no connection token
        expect(lines.join('\n')).not.toContain(host.token);
    });

    it('offers the registry version first and sends nothing but initialize and listSessions (read-only)', async () => {
        const host = await startFakeHost();
        const ud = makeUserData();
        const file = writeEntry(ud, 'e', entryFor(host, { protocolVersion: '1.1.0' }));
        const before = fs.readFileSync(file, 'utf8');
        const { client, lines } = makeClient(ud);
        client.start();
        await until(() => has(lines, 'sessions: 2'), 'sessions recorded');

        const methods = host.received.map(r => r.method);
        expect(new Set(methods)).toEqual(new Set(['initialize', 'listSessions']));
        const init = host.received.find(r => r.method === 'initialize')!.params;
        expect(init.protocolVersions).toEqual(['1.1.0', '1.0.0', '0.9.0']);
        expect(init.initialSubscriptions).toEqual(['ahp-root://']);
        expect(fs.readFileSync(file, 'utf8')).toBe(before);
        expect(fs.readdirSync(ud)).toEqual(['agent-host']);
    });

    it('warns when the negotiated version differs from the registry entry', async () => {
        const host = await startFakeHost((m, p) => m === 'initialize'
            ? { ...(defaultHandler(m, p) as object), protocolVersion: '1.0.0' } : defaultHandler(m, p));
        const ud = makeUserData();
        writeEntry(ud, 'e', entryFor(host, { protocolVersion: '1.1.0' }));
        const { client, lines } = makeClient(ud);
        client.start();
        await until(() => has(lines, 'sessions: 2'), 'recorded');
        expect(lines.some(l => l.startsWith('warn') && l.includes('1.0.0') && l.includes('differs from the registry entry 1.1.0'))).toBe(true);
    });

    it('names the supported versions when the host refuses every offered version', async () => {
        const host = await startFakeHost(() => { throw { code: -32005, message: 'unsupported', data: { supportedVersions: ['2.0.0'] } }; });
        const ud = makeUserData();
        writeEntry(ud, 'e', entryFor(host));
        const { client, lines } = makeClient(ud);
        client.start();
        await until(() => has(lines, 'keeps looking'), 'refusal recorded');
        expect(has(lines, 'initialize failed: initialize: unsupported (-32005); the host supports ["2.0.0"]')).toBe(true);
    });
});

describe('SPEC_COM_CLIENTMODULE: life cycle (REQ_COM_CLIENT AC-3)', () => {
    it('reconnects and reloads the full session list when listing fails', async () => {
        let failed = false;
        const host = await startFakeHost((method, params) => {
            if (method === 'listSessions' && !failed) {
                failed = true;
                throw { code: -32603, message: 'temporary failure' };
            }
            return defaultHandler(method, params);
        });
        const ud = makeUserData();
        writeEntry(ud, 'e', entryFor(host));
        const { client, lines } = makeClient(ud);
        let current: { resource?: string }[] = [];
        client.onSessionsChanged(sessions => { current = sessions; });
        client.start();
        await until(() => client.isConnected() && current.length === 2, 'session list after retry');
        expect(host.received.filter(item => item.method === 'initialize').length).toBeGreaterThanOrEqual(2);
        expect(has(lines, 'listSessions failed')).toBe(true);
    });

    it('does not become ready when disposed during session publication', async () => {
        const host = await startFakeHost();
        const ud = makeUserData();
        writeEntry(ud, 'e', entryFor(host));
        const { client } = makeClient(ud);
        let published = false;
        client.onSessionsChanged(sessions => {
            if (sessions.length) { published = true; client.dispose(); }
        });
        client.start();
        await until(() => published && host.clients() === 0, 'disposal during publication');
        expect(client.isConnected()).toBe(false);
    });

    it('publishes the initial list, root changes and an empty list on disconnection', async () => {
        const host = await startFakeHost();
        const ud = makeUserData();
        writeEntry(ud, 'e', entryFor(host));
        const { client } = makeClient(ud);
        let current: { resource?: string; title?: string; status?: number }[] = [];
        client.onSessionsChanged(sessions => { current = sessions; });
        client.start();
        await until(() => current.length === 2, 'initial sessions');
        host.push('root/sessionSummaryChanged', { session: 'copilotcli:/a', changes: { status: 24, title: 'Renamed' } });
        await until(() => current[0]?.status === 24, 'status change');
        expect(current[0].title).toBe('Renamed');
        host.push('root/sessionRemoved', { session: 'copilotcli:/b' });
        await until(() => current.length === 1, 'session removal');
        await host.crash();
        await until(() => current.length === 0, 'disconnected sessions');
    });
    it('start() returns at once: nothing is searched or logged before the caller continues', () => {
        const ud = makeUserData();
        const { client, lines } = makeClient(ud);
        const result = client.start();
        expect(result).toBeUndefined();
        expect(lines).toEqual([]);
    });

    it('dispose() closes the connection to the host and logs the end once', async () => {
        const host = await startFakeHost();
        const ud = makeUserData();
        writeEntry(ud, 'e', entryFor(host));
        const { client, lines } = makeClient(ud);
        client.start();
        await until(() => has(lines, 'sessions: 2'), 'recorded');
        expect(host.clients()).toBe(1);

        client.dispose();
        client.dispose();
        await until(() => host.clients() === 0, 'connection closed');
        expect(lines.filter(l => l.includes('client ended'))).toHaveLength(1);
    });

    it('dispose() cancels pending retries: no log line after the end', async () => {
        const ud = makeUserData();
        const { client, lines } = makeClient(ud, { retryBaseDelayMs: 30 });
        client.start();
        await until(() => has(lines, 'keeps looking'), 'first retry');
        client.dispose();
        const count = lines.length;
        expect(lines[count - 1]).toContain('client ended');
        await new Promise(r => setTimeout(r, 200));
        expect(lines.length).toBe(count);
    });

    it('dispose() before the background start has run starts nothing', async () => {
        const ud = makeUserData();
        const { client, lines } = makeClient(ud);
        client.start();
        client.dispose();
        await new Promise(r => setTimeout(r, 50));
        expect(lines.filter(l => !l.includes('client ended'))).toEqual([]);
    });
});

describe('SPEC_COM_AHPDISCOVERY: retry and restart (REQ_COM_AGENTHOST AC-4/AC-5)', () => {
    it('keeps searching and connects once the host publishes its entry', async () => {
        const host = await startFakeHost();
        const ud = makeUserData();
        const { client, lines } = makeClient(ud);
        client.start();
        await until(() => has(lines, 'keeps looking'), 'first retry');
        writeEntry(ud, 'late', entryFor(host));
        await until(() => has(lines, 'sessions: 2'), 'recorded after the entry appeared');
        expect(has(lines, 'does not exist')).toBe(true);
    });

    it('does not give up and records the reason once, not for every attempt (REQ_COM_AGENTHOST AC-4)', async () => {
        const ud = makeUserData();
        const host = { path: 'p', token: 't' } as FakeHost;
        writeEntry(ud, 'dead', entryFor(host));
        const { client, lines } = makeClient(ud, { isPidAlive: () => false });
        client.start();
        await until(() => has(lines, 'keeps looking'), 'reason recorded');
        await new Promise(r => setTimeout(r, 400));
        const reasons = lines.filter(l => l.includes('keeps looking'));
        expect(reasons).toHaveLength(1);
        expect(reasons[0]).toContain('no live entry among 1 file');
        expect(lines.some(l => l.startsWith('error') || l.includes('giving up'))).toBe(false);
    });

    it('logs a changed reason again', async () => {
        const ud = makeUserData();
        const { client, lines } = makeClient(ud);
        client.start();
        await until(() => has(lines, 'does not exist'), 'folder missing');
        const host = { path: process.platform === 'win32' ? '\\\\.\\pipe\\jarvis-ahp-no-such-pipe' : path.join(os.tmpdir(), 'jarvis-ahp-none.sock'), token: 't' } as FakeHost;
        writeEntry(ud, 'ghost', entryFor(host));
        await until(() => has(lines, 'cannot connect to'), 'new reason recorded');
        expect(lines.filter(l => l.includes('keeps looking')).length).toBe(2);
    });

    it('falls back to an older entry when the newest one looks live (reused pid) but nothing listens', async () => {
        const host = await startFakeHost();
        const ud = makeUserData();
        const ghost = { path: process.platform === 'win32' ? '\\\\.\\pipe\\jarvis-ahp-no-such-pipe' : path.join(os.tmpdir(), 'jarvis-ahp-no-such.sock'), token: 't' } as FakeHost;
        writeEntry(ud, 'real', entryFor(host, { instanceId: 'real' }), new Date(Date.now() - 60_000));
        writeEntry(ud, 'ghost', entryFor(ghost, { instanceId: 'ghost', pid: 2002 }), new Date());
        const { client, lines } = makeClient(ud);
        client.start();
        await until(() => has(lines, 'sessions: 2'), 'recorded via the older entry');
        expect(lines.some(l => l.startsWith('warn') && l.includes('entry of pid 2002 unusable'))).toBe(true);
        expect(has(lines, 'connected to the Agent Host (pid 1001)')).toBe(true);
    });

    it('records the refusal when the connection token is wrong', async () => {
        const host = await startFakeHost();
        const ud = makeUserData();
        writeEntry(ud, 'e', entryFor(host, { connectionToken: 'wrong' }));
        const { client, lines } = makeClient(ud);
        client.start();
        await until(() => has(lines, 'keeps looking'), 'refusal recorded');
        expect(has(lines, 'host refused the connection: HTTP 403')).toBe(true);
    });

    it('finds the host again after it restarted with a new entry', async () => {
        const first = await startFakeHost();
        const ud = makeUserData();
        writeEntry(ud, 'first', entryFor(first, { pid: 1001, instanceId: 'first' }), new Date(Date.now() - 5000));
        const alive = new Set([1001]);
        const { client, lines } = makeClient(ud, { isPidAlive: (pid: number) => alive.has(pid) });
        client.start();
        await until(() => has(lines, 'sessions: 2'), 'first recording');

        const second = await startFakeHost();
        writeEntry(ud, 'second', entryFor(second, { pid: 1002, instanceId: 'second' }));
        alive.delete(1001);
        alive.add(1002);
        await first.crash();

        await until(() => has(lines, 'connection to the Agent Host lost'), 'loss logged');
        await until(() => lines.filter(l => l.includes('sessions: 2')).length === 2, 'second recording');
        expect(has(lines, 'instance second')).toBe(true);
        expect(second.received.map(r => r.method)).toContain('initialize');
    });
});

describe('SPEC_COM_LOGGING: entries (REQ_COM_LOG AC-1)', () => {
    it('logs start, connection, loss-free recording and end with a severity each', async () => {
        const host = await startFakeHost();
        const ud = makeUserData();
        writeEntry(ud, 'e', entryFor(host));
        const { client, lines } = makeClient(ud);
        client.start();
        await until(() => has(lines, 'sessions: 2'), 'recorded');
        client.dispose();
        expect(lines[0]).toMatch(/^info client started, user data folder /);
        expect(has(lines, 'connected to the Agent Host (pid 1001)')).toBe(true);
        expect(lines[lines.length - 1]).toBe('info client ended');
        for (const l of lines) { expect(l).toMatch(/^(debug|info|warn|error) /); }
    });
});
