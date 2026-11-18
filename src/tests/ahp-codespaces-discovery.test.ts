// REQ_COM_AGENTHOST AC-6, SPEC_COM_AHPDISCOVERY steps 1-4, SPEC_COM_BINDING (folder comparison)
// Black-box, adversarial: a fake VS Code Server host on loopback TCP behind the token check.
import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { WebSocketServer } from 'ws';
import { AhpClient } from '../../packages/core/src/engine/ahp';
import { scanRegistry, registryEntriesDir, type AgentHostEntry } from '../../packages/core/src/engine/ahp/registry';
import { folderKey } from '../../packages/core/src/engine/ahp/protocol';

const cleanups: (() => Promise<void> | void)[] = [];
afterEach(async () => { for (const c of cleanups.splice(0).reverse()) { await c(); } });

interface TcpHost { port: number; token: string; connections: () => number }

async function startTcpHost(bindAddress = '127.0.0.1'): Promise<TcpHost> {
    const token = `tok-${Math.random().toString(36).slice(2)}`;
    let connections = 0;
    const server = http.createServer();
    const wss = new WebSocketServer({
        server,
        verifyClient: (info, cb) => cb(new URL(info.req.url ?? '', 'http://localhost').searchParams.get('tkn') === token, 403, 'Forbidden'),
    });
    wss.on('connection', ws => {
        connections++;
        ws.on('message', raw => {
            const msg = JSON.parse(raw.toString());
            if (msg.id === undefined) { return; }
            const result = msg.method === 'initialize'
                ? { protocolVersion: msg.params.protocolVersions[0], serverSeq: 1, snapshots: [{ resource: 'ahp-root://', fromSeq: 1, state: { agents: [] } }] }
                : { items: [] };
            ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }));
        });
    });
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, bindAddress, resolve); });
    cleanups.push(async () => { wss.clients.forEach(c => c.terminate()); await new Promise<void>(r => server.close(() => r())); });
    return { port: (server.address() as { port: number }).port, token, connections: () => connections };
}

function userData(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-cs-ud-'));
    cleanups.push(() => fs.rmSync(dir, { recursive: true, force: true }));
    return dir;
}

function entry(host: TcpHost, over: Partial<AgentHostEntry> = {}, address = '127.0.0.1'): AgentHostEntry {
    return {
        schemaVersion: 2, type: 'standalone', pid: 1, instanceId: 'i', protocolVersion: '1.1.0',
        endpoint: { type: 'tcp', host: address, port: host.port }, connectionToken: host.token, ...over,
    };
}

function write(ud: string, name: string, e: unknown, ageMs = 0): void {
    const dir = registryEntriesDir(ud);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${name}.json`);
    fs.writeFileSync(file, JSON.stringify(e));
    const t = new Date(Date.now() - ageMs);
    fs.utimesSync(file, t, t);
}

function client(own: string, fallback: string[]) {
    const lines: string[] = [];
    const c = new AhpClient({
        userDataDir: own, fallbackUserDataDirs: fallback,
        log: (sev, text) => lines.push(`${sev} ${text}`),
        isPidAlive: () => true,
        retryBaseDelayMs: 20, retryMaxDelayMs: 60, connectTimeoutMs: 1500, requestTimeoutMs: 1500,
    });
    cleanups.push(() => c.dispose());
    return { c, lines };
}

async function until(cond: () => boolean, what: string, ms = 4000): Promise<void> {
    const start = Date.now();
    while (!cond()) {
        if (Date.now() - start > ms) { throw new Error(`timed out waiting for: ${what}`); }
        await new Promise(r => setTimeout(r, 10));
    }
}

describe('REQ_COM_AGENTHOST AC-6: VS Code Server discovery', () => {
    it('desktop unchanged: a live entry in the own folder wins, the fallback host is never contacted', async () => {
        const own = userData(), fb = userData();
        const ownHost = await startTcpHost(), fbHost = await startTcpHost();
        write(own, 'a', entry(ownHost, { type: 'editor' }));
        write(fb, 'b', entry(fbHost));
        const { c } = client(own, [fb]);
        c.start();
        await until(() => c.isConnected(), 'connected');
        expect(ownHost.connections()).toBe(1);
        expect(fbHost.connections()).toBe(0);
    });

    it('walks the fallback folders in order and skips an empty one', async () => {
        const own = userData(), empty = userData(), first = userData(), second = userData();
        const h1 = await startTcpHost(), h2 = await startTcpHost();
        write(first, 'a', entry(h1));
        write(second, 'b', entry(h2));
        const { c } = client(own, [empty, first, second]);
        c.start();
        await until(() => c.isConnected(), 'connected');
        expect(h1.connections()).toBe(1);
        expect(h2.connections()).toBe(0);
    });

    it('prefers an editor entry to a newer standalone entry', async () => {
        const own = userData();
        const editor = await startTcpHost(), standalone = await startTcpHost();
        write(own, 'ed', entry(editor, { type: 'editor' }), 60_000);
        write(own, 'sa', entry(standalone));
        const { c } = client(own, []);
        c.start();
        await until(() => c.isConnected(), 'connected');
        expect(editor.connections()).toBe(1);
        expect(standalone.connections()).toBe(0);
    });

    it('falls back to the standalone entry when the newer editor entry does not answer', async () => {
        const own = userData();
        const standalone = await startTcpHost();
        write(own, 'ed', { ...entry(standalone, { type: 'editor' }), endpoint: { type: 'tcp', host: '127.0.0.1', port: 1 } });
        write(own, 'sa', entry(standalone), 60_000);
        const { c } = client(own, []);
        c.start();
        await until(() => c.isConnected(), 'connected');
        expect(standalone.connections()).toBe(1);
    });

    it('a wrong token is refused, never connects and never appears in the log', async () => {
        const own = userData();
        const host = await startTcpHost();
        write(own, 'sa', entry(host, { connectionToken: 'WRONG-SECRET-TOKEN' }));
        const { c, lines } = client(own, []);
        c.start();
        await new Promise(r => setTimeout(r, 400));
        expect(c.isConnected()).toBe(false);
        expect(host.connections()).toBe(0);
        expect(lines.join('\n')).not.toContain('WRONG-SECRET-TOKEN');
        expect(lines.join('\n')).not.toContain(host.token);
    });

    it('connects to an IPv6 loopback endpoint', async ctx => {
        let host: TcpHost;
        try { host = await startTcpHost('::1'); } catch { ctx.skip(); return; }
        const own = userData();
        write(own, 'sa', entry(host, {}, '::1'));
        const { c } = client(own, []);
        c.start();
        await until(() => c.isConnected(), 'connected over ::1');
    });

    it('drops entries with an unknown type, a tcp endpoint without a usable port or an unknown endpoint type', () => {
        const own = userData();
        const host = { port: 1, token: 't', connections: () => 0 };
        write(own, 'type', entry(host, { type: 'other' as never }));
        write(own, 'noport', { ...entry(host), endpoint: { type: 'tcp', host: '127.0.0.1' } });
        write(own, 'strport', { ...entry(host), endpoint: { type: 'tcp', host: '127.0.0.1', port: '1' } });
        write(own, 'ws', { ...entry(host), endpoint: { type: 'websocket', host: '127.0.0.1', port: 1 } });
        const scan = scanRegistry(own, () => true);
        expect(scan.candidates).toEqual([]);
        expect(scan.entry).toBeUndefined();
    });
});

describe('SPEC_COM_BINDING: folder comparison on every platform', () => {
    it('the drive letter ignores case everywhere; a Linux path stays case-sensitive', () => {
        expect(folderKey('c:/Work/x')).toBe(folderKey('C:/Work/x'));
        expect(folderKey('file:///c%3A/Work/x')).toBe(folderKey('C:\\Work\\x'));
        if (process.platform === 'linux') {
            expect(folderKey('/home/u/Work')).not.toBe(folderKey('/home/u/work'));
        }
    });
});
