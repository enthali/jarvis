// REQ_COM_STATE AC-1..AC-8, SPEC_COM_STATE
import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { ThemeIcon } from 'vscode';
import { WebSocketServer } from 'ws';
import { AhpClient } from '../../packages/core/src/engine/ahp';
import { registryEntriesDir, type AgentHostEntry } from '../../packages/core/src/engine/ahp/registry';
import { SessionState } from '../../packages/core/src/engine/ahp/sessionState';
import { ActorActivity, activityForStatus } from '../../packages/core/src/engine/actors/actorActivity';
import { ActorScanner } from '../../packages/core/src/engine/actors/actorScanner';
import { ActorTreeProvider } from '../../packages/core/src/engine/actors/actorTreeProvider';
import { TouchStore } from '../../packages/core/src/engine/hooks/touchStore';

const cleanups: (() => Promise<void> | void)[] = [];
afterEach(async () => {
    for (const c of cleanups.splice(0).reverse()) { await c(); }
});

describe('SPEC_COM_STATE session summaries', () => {
    it('replays events received while the initial listing is in flight', () => {
        const state = new SessionState();
        const changes: unknown[][] = [];
        state.subscribe(sessions => changes.push(sessions));
        state.begin();
        state.notify('root/sessionSummaryChanged', { session: 'one', changes: { status: 24 } });
        state.notify('root/sessionRemoved', { session: 'two' });
        state.notify('root/sessionAdded', { summary: { resource: 'three', title: 'Three', status: 8 } });
        expect(changes).toHaveLength(0);
        state.finish([{ resource: 'one', title: 'One', status: 1 }, { resource: 'two', title: 'Two' }]);
        expect(changes.at(-1)).toEqual([
            { resource: 'one', title: 'One', status: 24 },
            { resource: 'three', title: 'Three', status: 8 },
        ]);
        state.notify('root/sessionSummaryChanged', { session: 'three', changes: { title: 'Renamed' } });
        expect(changes.at(-1)?.[1]).toEqual({ resource: 'three', title: 'Renamed', status: 8 });
        state.clear();
        expect(changes.at(-1)).toEqual([]);
    });
});

describe('SPEC_COM_STATE Actor activity', () => {
    it('decodes status bits, ignoring read and archived flags', () => {
        expect([1, 8, 24, 2, 32 + 64 + 24, 2 + 8].map(activityForStatus))
            .toEqual(['idle', 'working', 'waiting', 'error', 'waiting', 'working']);
    });

    it('uses the strongest state of matching sessions and refreshes only on state changes', () => {
        let names = ['Dev', 'Other'];
        let changes = 0;
        const activity = new ActorActivity('/workspace', () => names, () => { changes++; });
        const sessions = [
            { resource: 'one', title: 'Dev', status: 8, workingDirectories: ['/workspace'] },
            { resource: 'two', title: 'Dev', status: 24, workingDirectories: ['/workspace'] },
            { resource: 'three', title: 'Dev', status: 2, workingDirectories: ['/elsewhere'] },
        ];
        activity.update(sessions);
        expect(activity.state('Dev')).toBe('waiting');
        expect(changes).toBe(1);
        activity.update([...sessions]);
        expect(changes).toBe(1);
        activity.update([...sessions, { resource: 'four', title: 'Dev', status: 2, workingDirectories: ['/workspace'] }]);
        expect(activity.state('Dev')).toBe('error');
        names = ['Dev', 'Dev'];
        activity.refresh();
        expect(activity.state('Dev')).toBe('idle');
        activity.update([]);
        expect(changes).toBe(3);
    });
});

let hostSeq = 0;
async function startStateHost(initialSessions: unknown[]) {
    const name = `jarvis-state-test-${process.pid}-${Date.now()}-${hostSeq++}`;
    const pipe = process.platform === 'win32' ? `\\\\.\\pipe\\${name}` : path.join(os.tmpdir(), `${name}.sock`);
    const token = `tok-${hostSeq}`;
    const received: string[] = [];
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
            received.push(msg.method);
            if (msg.id === undefined) { return; }
            if (msg.method === 'initialize') {
                ws.send(JSON.stringify({
                    jsonrpc: '2.0', id: msg.id,
                    result: { protocolVersion: msg.params.protocolVersions[0], snapshots: [{ resource: 'ahp-root://', state: { agents: [] } }] },
                }));
            } else if (msg.method === 'listSessions') {
                ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { items: initialSessions } }));
            }
        });
    });
    await new Promise<void>(r => server.listen(pipe, r));
    const stop = async () => { wss.clients.forEach(c => c.terminate()); await new Promise<void>(r => server.close(() => r())); };
    cleanups.push(async () => { try { await stop(); } catch { /* already stopped */ } });
    return {
        path: pipe,
        token,
        received,
        push: (method: string, params: unknown) => wss.clients.forEach(c => c.send(JSON.stringify({ jsonrpc: '2.0', method, params }))),
        crash: stop,
    };
}

function writeHostEntry(userDataDir: string, file: string, host: { path: string; token: string }, pid = 1001, mtime = new Date()) {
    const dir = registryEntriesDir(userDataDir);
    fs.mkdirSync(dir, { recursive: true });
    const entry: AgentHostEntry = {
        schemaVersion: 2, type: 'editor', pid, instanceId: file, protocolVersion: '1.1.0',
        endpoint: { type: 'socket', path: host.path }, connectionToken: host.token,
    };
    const p = path.join(dir, `${file}.json`);
    fs.writeFileSync(p, JSON.stringify(entry));
    fs.utimesSync(p, mtime, mtime);
}

async function waitUntil(cond: () => boolean, label: string, timeoutMs = 4000): Promise<void> {
    const start = Date.now();
    while (!cond()) {
        if (Date.now() - start > timeoutMs) { throw new Error(`timed out waiting for ${label}`); }
        await new Promise(r => setTimeout(r, 10));
    }
}

describe('REQ_COM_STATE AC-2, AC-6, AC-7, AC-8: client-to-tree state lifecycle', () => {
    it('AC-2/AC-7/AC-8: shows no icon while disconnected, updates tree within 2 s on push without re-listing, and maps every failed request to Error until next request', async () => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-req-state-'));
        cleanups.push(() => fs.rmSync(tmp, { recursive: true, force: true }));
        const workspace = path.join(tmp, 'ws');
        const actorsDir = path.join(workspace, '.jarvis', 'actors');
        fs.mkdirSync(path.join(actorsDir, 'Dev'), { recursive: true });
        fs.writeFileSync(path.join(actorsDir, 'Dev', 'actor.yaml'), 'name: "Dev"\nsummary: ""\n');
        const userData = path.join(tmp, 'userdata');

        const scanner = new ActorScanner(() => actorsDir, () => {});
        await scanner.rescan();
        let treeRefreshes = 0;
        let treeProvider: ActorTreeProvider | undefined;
        const activity = new ActorActivity(workspace, () => scanner.actors.map(a => a.name), () => treeProvider?.refresh());
        treeProvider = new ActorTreeProvider(scanner, new TouchStore(path.join(tmp, 'touch')), activity);
        cleanups.push(() => treeProvider?.dispose());
        treeProvider.onDidChangeTreeData(() => { treeRefreshes++; });
        const node = { kind: 'actor' as const, id: scanner.actors[0].id };

        const alive = new Set([1001]);
        const client = new AhpClient({
            userDataDir: userData,
            log: () => {},
            isPidAlive: pid => alive.has(pid),
            retryBaseDelayMs: 20, retryMaxDelayMs: 60,
            connectTimeoutMs: 1500, requestTimeoutMs: 1500,
        });
        cleanups.push(() => client.dispose());
        client.onSessionsChanged(sessions => activity.update(sessions));
        client.start();

        // AC-7: While the client has no connection, no Actor shows an activity icon.
        expect(client.isConnected()).toBe(false);
        expect(activity.state('Dev')).toBe('idle');
        expect(treeProvider.getTreeItem(node).iconPath).toBeUndefined();

        const host = await startStateHost([
            { resource: 'copilotcli:/s1', title: 'Dev', status: 1, workingDirectories: [workspace] },
        ]);
        writeHostEntry(userData, 'first', host, 1001);
        await waitUntil(() => client.isConnected(), 'initial connection');
        expect(host.received.filter(m => m === 'listSessions')).toHaveLength(1);
        expect(treeProvider.getTreeItem(node).iconPath).toBeUndefined();

        // AC-2: Change pushed by the Agent Host updates the tree within 2 seconds without calling listSessions again.
        const t0 = Date.now();
        const beforeRefresh = treeRefreshes;
        host.push('root/sessionSummaryChanged', { session: 'copilotcli:/s1', changes: { status: 8 } });
        await waitUntil(() => treeRefreshes > beforeRefresh && activity.state('Dev') === 'working', 'working state');
        expect(Date.now() - t0).toBeLessThan(2000);
        expect((treeProvider.getTreeItem(node).iconPath as ThemeIcon).id).toBe('loading~spin');
        expect(host.received.filter(m => m === 'listSessions')).toHaveLength(1);

        // AC-8: Every failed request shows as Error, whatever the cause, until the next request runs.
        for (const [status, cause] of [[2, 'rate_limit'], [2 | 32, 'quota'], [2 | 64, 'sign_in'], [2 | 32 | 64, 'model_unavailable']] as const) {
            host.push('root/sessionSummaryChanged', { session: 'copilotcli:/s1', changes: { status, errorCause: cause } });
            await waitUntil(() => activity.state('Dev') === 'error', `error for ${cause}`);
            const icon = treeProvider.getTreeItem(node).iconPath as ThemeIcon;
            expect(icon.id).toBe('error');
            expect(icon.color?.id).toBe('charts.red');
        }
        // Remains Error until the next request runs (Working -> Idle).
        host.push('root/sessionSummaryChanged', { session: 'copilotcli:/s1', changes: { status: 8 } });
        await waitUntil(() => activity.state('Dev') === 'working', 'next request working');
        expect((treeProvider.getTreeItem(node).iconPath as ThemeIcon).id).toBe('loading~spin');

        // AC-7: When the connection is lost, no Actor shows an activity icon.
        alive.delete(1001);
        await host.crash();
        await waitUntil(() => !client.isConnected() && activity.state('Dev') === 'idle', 'disconnected clears state');
        expect(treeProvider.getTreeItem(node).iconPath).toBeUndefined();
    });

    it('AC-6: after a reconnect, restores state from the Agent Host including a request that started while the client was away', async () => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-req-state-reconnect-'));
        cleanups.push(() => fs.rmSync(tmp, { recursive: true, force: true }));
        const workspace = path.join(tmp, 'ws');
        const actorsDir = path.join(workspace, '.jarvis', 'actors');
        fs.mkdirSync(path.join(actorsDir, 'Dev'), { recursive: true });
        fs.writeFileSync(path.join(actorsDir, 'Dev', 'actor.yaml'), 'name: "Dev"\nsummary: ""\n');
        const userData = path.join(tmp, 'userdata');

        const scanner = new ActorScanner(() => actorsDir, () => {});
        await scanner.rescan();
        let treeProvider: ActorTreeProvider | undefined;
        const activity = new ActorActivity(workspace, () => scanner.actors.map(a => a.name), () => treeProvider?.refresh());
        treeProvider = new ActorTreeProvider(scanner, new TouchStore(path.join(tmp, 'touch')), activity);
        cleanups.push(() => treeProvider?.dispose());
        const node = { kind: 'actor' as const, id: scanner.actors[0].id };

        const first = await startStateHost([
            { resource: 'copilotcli:/s1', title: 'Dev', status: 1, workingDirectories: [workspace] },
        ]);
        writeHostEntry(userData, 'first', first, 1001, new Date(Date.now() - 5000));
        const alive = new Set([1001]);
        const client = new AhpClient({
            userDataDir: userData,
            log: () => {},
            isPidAlive: pid => alive.has(pid),
            retryBaseDelayMs: 20, retryMaxDelayMs: 60,
            connectTimeoutMs: 1500, requestTimeoutMs: 1500,
        });
        cleanups.push(() => client.dispose());
        client.onSessionsChanged(sessions => activity.update(sessions));
        client.start();
        await waitUntil(() => client.isConnected(), 'first connection');
        expect(activity.state('Dev')).toBe('idle');

        // Host restarts while the client is away, and a request on 'Dev' has started (status: 8 InProgress).
        const second = await startStateHost([
            { resource: 'copilotcli:/s1', title: 'Dev', status: 8, workingDirectories: [workspace] },
        ]);
        writeHostEntry(userData, 'second', second, 1002, new Date());
        alive.delete(1001);
        alive.add(1002);
        await first.crash();

        await waitUntil(() => client.isConnected() && activity.state('Dev') === 'working', 'reconnected with working state');
        expect((treeProvider.getTreeItem(node).iconPath as ThemeIcon).id).toBe('loading~spin');
    });
});
