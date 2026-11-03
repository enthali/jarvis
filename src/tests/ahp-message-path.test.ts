// REQ_COM_CAPABILITY, REQ_COM_NOTIFY, REQ_COM_INJECT, REQ_COM_CHATNAME
// SPEC_COM_TOOLS, SPEC_COM_INJECT, SPEC_COM_BINDING (message path of the Jarvis AHP client)
// A fake Agent Host on a real named pipe / Unix socket that keeps sessions, echoes dispatched actions and can
// push tool-call actions to the client, as the real host does (FI-2026-10-27, FI-2026-10-28).
import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { WebSocketServer, type WebSocket } from 'ws';
import { AhpClient, NotConnectedError, announcementText, type AhpToolSpec, type ToolCallContext } from '../../packages/core/src/engine/ahp';
import { fileUri, folderKey, sessionHasFolder } from '../../packages/core/src/engine/ahp/protocol';
import { registryEntriesDir } from '../../packages/core/src/engine/ahp/registry';

const cleanups: (() => Promise<void> | void)[] = [];
afterEach(async () => { for (const c of cleanups.splice(0).reverse()) { await c(); } });

const WORKSPACE = path.join(os.tmpdir(), 'jarvis-ahp-msg-ws');
/** The way the real host spells a folder: lower-case drive letter, `%3A` (FI-2026-10-28). */
const hostSpelling = (folder: string): string => fileUri(folder).replace(/^file:\/\/\/([A-Za-z]):\//, (_m, d: string) => `file:///${d.toLowerCase()}%3A/`);

interface FakeSession {
    uri: string;
    title: string;
    workingDirectories: string[];
    modifiedAt: string;
    chat: string;
    status?: number;
    activeClient?: { clientId: string; tools: { name: string }[] };
}

interface Dispatched { channel: string; action: any; clientSeq: number }

class RichHost {
    sessions = new Map<string, FakeSession>();
    dispatched: Dispatched[] = [];
    createParams: any[] = [];
    clientIds: string[] = [];
    /** Names of the agent files the host lists in the customizations of a session; `undefined` list means none. */
    agents: { name: string; uri: string }[] = [];
    /** Action types the host rejects. */
    reject = new Set<string>();
    /** Action types the host does not echo at all. */
    silent = new Set<string>();
    /** When set, `subscribe` answers late and a second one for the same channel cancels the first (as the real host does). */
    subscribeDelayMs = 0;
    private pendingSubs = new Map<string, { id: number; timer: NodeJS.Timeout }>();
    private ws: WebSocket | undefined;
    private seq = 100;
    readonly pipe: string;
    readonly token = 'tok-msg';
    private server = http.createServer();
    private wss: WebSocketServer;

    constructor() {
        this.pipe = process.platform === 'win32'
            ? `\\\\.\\pipe\\jarvis-ahp-msg-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`
            : path.join(os.tmpdir(), `jarvis-ahp-msg-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.sock`);
        this.wss = new WebSocketServer({
            server: this.server,
            verifyClient: (info, cb) => cb(new URL(info.req.url ?? '', 'http://localhost').searchParams.get('tkn') === this.token, 403, 'Forbidden'),
        });
        this.wss.on('connection', ws => {
            this.ws = ws;
            ws.on('message', raw => this.onMessage(JSON.parse(raw.toString())));
        });
    }

    async start(): Promise<this> {
        await new Promise<void>(resolve => this.server.listen(this.pipe, resolve));
        cleanups.push(() => this.stop());
        return this;
    }

    async stop(): Promise<void> {
        this.wss.clients.forEach(c => c.terminate());
        await new Promise<void>(r => this.server.close(() => r()));
    }

    dropConnection(): void { this.wss.clients.forEach(c => c.terminate()); }

    addSession(title: string, folder: string, modifiedAt: string, uri = `copilotcli:/${Math.random().toString(36).slice(2)}`): FakeSession {
        const s: FakeSession = { uri, title, workingDirectories: [hostSpelling(folder)], modifiedAt, chat: `ahp-chat:/${Math.random().toString(36).slice(2)}` };
        this.sessions.set(uri, s);
        return s;
    }

    push(channel: string, action: object, extra: object = {}): void {
        this.ws?.send(JSON.stringify({ jsonrpc: '2.0', method: 'action', params: { channel, action, serverSeq: ++this.seq, ...extra } }));
    }

    ofType(type: string): Dispatched[] { return this.dispatched.filter(d => d.action.type === type); }

    private customizations(): unknown {
        return this.agents.length ? [{ type: 'directory', name: 'agents', children: this.agents.map(a => ({ type: 'agent', ...a })) }] : [];
    }

    private onMessage(msg: { id?: number; method: string; params: any }): void {
        if (msg.method === 'dispatchAction') {
            const { channel, action, clientSeq } = msg.params;
            this.dispatched.push({ channel, action, clientSeq });
            const s = this.sessions.get(channel);
            if (s && action.type === 'session/titleChanged') { s.title = action.title; }
            if (s && action.type === 'session/activeClientSet') { s.activeClient = action.activeClient; }
            if (s && action.type === 'session/isArchivedChanged') { s.status = action.isArchived ? (s.status ?? 1) | 64 : (s.status ?? 1) & ~64; }
            if (this.silent.has(action.type)) { return; }
            const rejection = this.reject.has(action.type) ? { rejectionReason: 'not allowed in this test' } : {};
            this.push(channel, action, { origin: { clientId: this.clientIds[this.clientIds.length - 1], clientSeq }, ...rejection });
            return;
        }
        if (msg.id === undefined) { return; }
        let result: unknown = null;
        const p = msg.params;
        if (msg.method === 'initialize') {
            this.clientIds.push(p.clientId);
            result = { protocolVersion: p.protocolVersions[0], serverSeq: 1, snapshots: [{ resource: 'ahp-root://', fromSeq: 1, state: { agents: [], activeSessions: 0 } }] };
        } else if (msg.method === 'listSessions') {
            result = { items: [...this.sessions.values()].map(s => ({ resource: s.uri, provider: 'copilotcli', title: s.title, status: s.status, modifiedAt: s.modifiedAt, workingDirectories: s.workingDirectories })) };
        } else if (msg.method === 'createSession') {
            this.createParams.push(p);
            const s = this.addSession('', '', new Date().toISOString(), p.channel);
            s.workingDirectories = p.workingDirectories;
            s.activeClient = p.activeClient;
        } else if (msg.method === 'subscribe') {
            const s = this.sessions.get(p.channel);
            result = s
                ? { snapshot: { resource: p.channel, state: { title: s.title, chats: [{ resource: s.chat }], defaultChat: s.chat, customizations: this.customizations() } } }
                : { snapshot: { resource: p.channel, state: { turns: [] } } };
            if (this.subscribeDelayMs) {
                const prev = this.pendingSubs.get(p.channel);
                if (prev) {
                    clearTimeout(prev.timer);
                    this.ws?.send(JSON.stringify({ jsonrpc: '2.0', id: prev.id, error: { code: -32603, message: `Subscription cancelled: ${p.channel}` } }));
                }
                const reply = result;
                const timer = setTimeout(() => {
                    this.pendingSubs.delete(p.channel);
                    this.ws?.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: reply }));
                }, this.subscribeDelayMs);
                this.pendingSubs.set(p.channel, { id: msg.id as number, timer });
                return;
            }
        }
        this.ws?.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }));
    }
}

function makeUserData(host: RichHost): string {
    const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-ahp-msg-ud-'));
    cleanups.push(() => fs.rmSync(ud, { recursive: true, force: true }));
    const dir = registryEntriesDir(ud);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'e.json'), JSON.stringify({
        schemaVersion: 2, type: 'editor', pid: 1, instanceId: 'i', protocolVersion: '1.1.0',
        endpoint: { type: 'socket', path: host.pipe }, connectionToken: host.token,
    }));
    return ud;
}

interface Call { ctx: ToolCallContext; input: Record<string, unknown> }

function makeTools(calls: Call[]): AhpToolSpec[] {
    const tool = (name: string, text: string): AhpToolSpec => ({
        name, title: name, description: name, inputSchema: { type: 'object', properties: {} },
        handler: async (ctx, input) => { calls.push({ ctx, input }); return name === 'jarvis_fails' ? { text: 'nope', isError: true } : { text: `${text}:${ctx.title}` }; },
    });
    return ['jarvis_createActorSession', 'jarvis_sendToActor', 'jarvis_receiveFromActor', 'jarvis_findActors'].map(n => tool(n, n));
}

const AGENT_URI = (name: string): string => `file:///w/.github/agents/${encodeURIComponent(name)}.agent.md`;

async function until(cond: () => boolean, what: string, ms = 4000): Promise<void> {
    const start = Date.now();
    while (!cond()) {
        if (Date.now() - start > ms) { throw new Error(`timed out waiting for: ${what}`); }
        await new Promise(r => setTimeout(r, 10));
    }
}

async function connected(host: RichHost, over: { actors?: string[]; tools?: AhpToolSpec[]; agentWaitCreateMs?: number; agentWaitExistingMs?: number; ackTimeoutMs?: number } = {}) {
    const lines: string[] = [];
    const calls: Call[] = [];
    const client = new AhpClient({
        userDataDir: makeUserData(host),
        log: (sev, text) => lines.push(`${sev} ${text}`),
        isPidAlive: () => true,
        retryBaseDelayMs: 20, retryMaxDelayMs: 60, connectTimeoutMs: 1500, requestTimeoutMs: 1500,
        messagePath: {
            workspaceFolder: WORKSPACE,
            actorNames: () => over.actors ?? ['Developer', 'Architect'],
            tools: over.tools ?? makeTools(calls),
            agentWaitCreateMs: over.agentWaitCreateMs ?? 300,
            agentWaitExistingMs: over.agentWaitExistingMs ?? 100,
            ackTimeoutMs: over.ackTimeoutMs ?? 500,
        },
    });
    cleanups.push(() => client.dispose());
    client.start();
    await until(() => client.isConnected(), 'connected');
    return { client, lines, calls };
}

const REQ = (name: string) => ({ name, startupText: `You are the Actor "${name}". Read your memory.` });

describe('SPEC_COM_BINDING: working folders', () => {
    it('compares folders across the spellings of the extension host and of the Agent Host', () => {
        expect(folderKey('C:\\Work\\Jarvis')).toBe(folderKey('file:///c%3A/Work/Jarvis'));
        expect(folderKey('file:///c%3A/Work/Jarvis/')).toBe(folderKey('file:///C:/Work/Jarvis'));
        expect(folderKey('file:///c%3A/Work/Other')).not.toBe(folderKey('C:\\Work\\Jarvis'));
        expect(sessionHasFolder({ workingDirectories: [hostSpelling(WORKSPACE)] }, WORKSPACE)).toBe(true);
        expect(sessionHasFolder({ workingDirectories: [] }, WORKSPACE)).toBe(false);
        expect(sessionHasFolder({}, WORKSPACE)).toBe(false);
    });
});

describe('SPEC_COM_BINDING: finding the chat of an Actor (REQ_COM_CHATNAME AC-2, AC-3)', () => {
    it('finds the chat by Actor name in the folder of the window and creates nothing', async () => {
        const host = await new RichHost().start();
        const dev = host.addSession('Developer', WORKSPACE, '2026-10-28T10:00:00Z');
        host.addSession('Developer', path.join(os.tmpdir(), 'another-workspace'), '2026-10-28T12:00:00Z');
        host.addSession('Something else', WORKSPACE, '2026-10-28T12:00:00Z');
        host.agents = [{ name: 'Developer', uri: AGENT_URI('Developer') }];
        const { client } = await connected(host);

        expect(await client.findActorChat('Developer')).toBe(dev.uri);
        expect(await client.findActorChat('Missing')).toBeUndefined();
        expect(host.createParams).toHaveLength(0);
        const chat = await client.ensureActorChat(REQ('Developer'));
        expect(chat).toEqual({ session: dev.uri, created: false });
        expect(host.createParams).toHaveLength(0);
        expect(host.ofType('chat/pendingMessageSet')).toHaveLength(0);
    });

    it('takes the chat modified last and warns when several carry the name', async () => {
        const host = await new RichHost().start();
        host.addSession('Developer', WORKSPACE, '2026-10-28T10:00:00Z', 'copilotcli:/old');
        host.addSession('Developer', WORKSPACE, '2026-10-28T11:00:00Z', 'copilotcli:/new');
        const { client, lines } = await connected(host);
        expect((await client.ensureActorChat(REQ('Developer'))).session).toBe('copilotcli:/new');
        expect(lines.some(l => l.startsWith('warn') && l.includes('2 chats carry the name of Actor "Developer"'))).toBe(true);
    });

    it('prefers a chat that is not archived, even an older one, and restores nothing', async () => {
        const host = await new RichHost().start();
        host.addSession('Developer', WORKSPACE, '2026-10-28T10:00:00Z', 'copilotcli:/active');
        host.addSession('Developer', WORKSPACE, '2026-10-28T11:00:00Z', 'copilotcli:/archived').status = 97;
        const { client } = await connected(host);
        expect(await client.findActorChat('Developer')).toBe('copilotcli:/active');
        expect(host.ofType('session/isArchivedChanged')).toHaveLength(0);
    });

    it('restores an archived chat, like Restore in the Agents window, when it is the only one', async () => {
        const host = await new RichHost().start();
        const archived = host.addSession('Developer', WORKSPACE, '2026-10-28T11:00:00Z');
        archived.status = 97;
        const { client, lines } = await connected(host);
        expect(await client.ensureActorChat(REQ('Developer'))).toEqual({ session: archived.uri, created: false });
        expect(host.ofType('session/isArchivedChanged')).toEqual([expect.objectContaining({ channel: archived.uri, action: { type: 'session/isArchivedChanged', isArchived: false } })]);
        expect(archived.status! & 64).toBe(0);
        expect(host.createParams).toHaveLength(0);
        expect(lines.some(l => l.includes(`restored the archived chat of Actor "Developer": ${archived.uri}`))).toBe(true);
    });

    it('keeps no record of its own: a chat created by an earlier run is found again after a restart of the client', async () => {
        const host = await new RichHost().start();
        host.agents = [{ name: 'Developer', uri: AGENT_URI('Developer') }];
        const first = await connected(host);
        const created = await first.client.ensureActorChat(REQ('Developer'));
        expect(created.created).toBe(true);
        first.client.dispose();

        const second = await connected(host);
        expect(await second.client.ensureActorChat(REQ('Developer'))).toEqual({ session: created.session, created: false });
        expect(host.createParams).toHaveLength(1);
    });

    it('two calls for one Actor at the same time create one chat', async () => {
        const host = await new RichHost().start();
        host.agents = [{ name: 'Developer', uri: AGENT_URI('Developer') }];
        const { client } = await connected(host);
        const [a, b] = await Promise.all([client.ensureActorChat(REQ('Developer')), client.ensureActorChat(REQ('Developer'))]);
        expect(host.createParams).toHaveLength(1);
        expect(a.session).toBe(b.session);
        expect([a.created, b.created].sort()).toEqual([false, true]);
    });
});

describe('SPEC_COM_BINDING: creating the chat (REQ_COM_CHATNAME AC-1, REQ_COM_NOTIFY AC-5)', () => {
    it('creates the session with the folder, isolation and the tools, then the start-up instruction, then the name', async () => {
        const host = await new RichHost().start();
        host.agents = [{ name: 'Developer', uri: AGENT_URI('Developer') }];
        const { client } = await connected(host);

        const chat = await client.ensureActorChat(REQ('Developer'));
        expect(chat.created).toBe(true);

        const p = host.createParams[0];
        expect(p.provider).toBe('copilotcli');
        expect(p.config).toEqual({ isolation: 'folder' });
        expect(folderKey(p.workingDirectories[0])).toBe(folderKey(WORKSPACE));
        expect(p.activeClient.tools.map((t: { name: string }) => t.name)).toEqual(['jarvis_createActorSession', 'jarvis_sendToActor', 'jarvis_receiveFromActor', 'jarvis_findActors']);
        expect(p.activeClient.tools[0].handler).toBeUndefined();

        const order = host.dispatched.map(d => d.action.type).filter(t => t !== 'session/activeClientSet');
        expect(order).toEqual(['chat/pendingMessageSet', 'session/titleChanged']);
        const startup = host.ofType('chat/pendingMessageSet')[0];
        expect(startup.action.kind).toBe('queued');
        expect(startup.action.message.text).toBe('You are the Actor "Developer". Read your memory.');
        expect(startup.action.message.agent).toEqual({ uri: AGENT_URI('Developer') });
        expect(startup.action.message.origin).toEqual({ kind: 'user' });
        expect(host.ofType('session/titleChanged')[0].action.title).toBe('Developer');
        expect(host.ofType('session/titleChanged')[0].channel).toBe(chat.session);
    });

    it('never uses turnStarted, which would replace a running turn (REQ_COM_NOTIFY AC-4)', async () => {
        const host = await new RichHost().start();
        host.agents = [{ name: 'Developer', uri: AGENT_URI('Developer') }];
        host.addSession('Developer', WORKSPACE, '2026-10-28T10:00:00Z');
        const { client } = await connected(host);
        await client.deliverAnnouncement(REQ('Developer'), 2);
        await client.ensureActorChat(REQ('Architect'));
        await client.deliverAnnouncement(REQ('Architect'), 1);
        expect(host.ofType('chat/turnStarted')).toHaveLength(0);
    });

    it('waits for the host to list the agent after it created the session', async () => {
        const host = await new RichHost().start();
        const { client } = await connected(host, { agentWaitCreateMs: 2000 });
        setTimeout(() => { host.agents = [{ name: 'Developer', uri: AGENT_URI('Developer') }]; }, 250);
        await client.ensureActorChat(REQ('Developer'));
        expect(host.ofType('chat/pendingMessageSet')[0].action.message.agent).toEqual({ uri: AGENT_URI('Developer') });
    });

    it('matches the agent by file name too', async () => {
        const host = await new RichHost().start();
        host.agents = [{ name: 'Some Title', uri: AGENT_URI('Project Manager') }];
        const { client } = await connected(host);
        await client.ensureActorChat(REQ('Project Manager'));
        expect(host.ofType('chat/pendingMessageSet')[0].action.message.agent).toEqual({ uri: AGENT_URI('Project Manager') });
    });

    it('writes the text without an agent and warns when the host lists none for the Actor', async () => {
        const host = await new RichHost().start();
        const { client, lines } = await connected(host, { agentWaitCreateMs: 50 });
        await client.ensureActorChat(REQ('Developer'));
        const msg = host.ofType('chat/pendingMessageSet')[0].action.message;
        expect(msg.agent).toBeUndefined();
        expect(lines.some(l => l.startsWith('warn') && l.includes('Actor "Developer"') && l.includes('description'))).toBe(true);
    });
});

describe('SPEC_COM_INBOX / SPEC_COM_INJECT: the announcement (REQ_COM_NOTIFY)', () => {
    it('queues the fixed text with the agent of the Actor in the existing chat', async () => {
        const host = await new RichHost().start();
        const dev = host.addSession('Developer', WORKSPACE, '2026-10-28T10:00:00Z');
        host.agents = [{ name: 'Developer', uri: AGENT_URI('Developer') }];
        const { client } = await connected(host);

        const chat = await client.deliverAnnouncement(REQ('Developer'), 3);
        expect(chat).toEqual({ session: dev.uri, created: false });
        const queued = host.ofType('chat/pendingMessageSet');
        expect(queued).toHaveLength(1);
        expect(queued[0].channel).toBe(dev.chat);
        expect(queued[0].action.message.text).toBe(announcementText(3));
        expect(queued[0].action.message.text).toContain('3 new message(s)');
        expect(queued[0].action.message.text).toContain('jarvis_receiveMessage');
        expect(queued[0].action.message.agent).toEqual({ uri: AGENT_URI('Developer') });
    });

    it('creates a missing chat first: start-up instruction, name, then the announcement', async () => {
        const host = await new RichHost().start();
        host.agents = [{ name: 'Developer', uri: AGENT_URI('Developer') }];
        const { client } = await connected(host);
        const chat = await client.deliverAnnouncement(REQ('Developer'), 1);
        expect(chat.created).toBe(true);
        const order = host.dispatched.map(d => d.action.type === 'chat/pendingMessageSet' ? `queued:${d.action.message.text.slice(0, 12)}` : d.action.type).filter(t => t !== 'session/activeClientSet');
        expect(order).toEqual(['queued:You are the ', 'session/titleChanged', 'queued:[Jarvis Mess']);
    });

    it('the announcement text carries no text of a sender: it is built from the count only', () => {
        expect(announcementText(2)).toBe(announcementText(2));
        expect(announcementText(2)).not.toBe(announcementText(3));
        expect(announcementText(1)).not.toMatch(/sender|from:/i);
    });

    it('fails when the host rejects the action, and says why', async () => {
        const host = await new RichHost().start();
        host.addSession('Developer', WORKSPACE, '2026-10-28T10:00:00Z');
        host.agents = [{ name: 'Developer', uri: AGENT_URI('Developer') }];
        const { client } = await connected(host);
        host.reject.add('chat/pendingMessageSet');
        await expect(client.deliverAnnouncement(REQ('Developer'), 1)).rejects.toThrow(/rejected: not allowed in this test/);
    });

    it('goes on, with a warning, when the host does not echo an action', async () => {
        const host = await new RichHost().start();
        host.addSession('Developer', WORKSPACE, '2026-10-28T10:00:00Z');
        host.agents = [{ name: 'Developer', uri: AGENT_URI('Developer') }];
        host.silent.add('chat/pendingMessageSet');
        const { client, lines } = await connected(host, { ackTimeoutMs: 80 });
        await client.deliverAnnouncement(REQ('Developer'), 1);
        expect(lines.some(l => l.startsWith('warn') && l.includes('did not echo chat/pendingMessageSet'))).toBe(true);
    });

    it('logs metadata only: no text that was written into a chat', async () => {
        const host = await new RichHost().start();
        host.agents = [{ name: 'Developer', uri: AGENT_URI('Developer') }];
        const { client, lines } = await connected(host);
        await client.deliverAnnouncement({ name: 'Developer', startupText: 'SECRET-STARTUP-TEXT' }, 2);
        expect(lines.join('\n')).not.toContain('SECRET-STARTUP-TEXT');
        expect(lines.join('\n')).not.toContain(announcementText(2));
        expect(lines.join('\n')).not.toContain(host.token);
    });
});

describe('SPEC_COM_TOOLS: publication', () => {
    it('publishes the tools to the existing chats of the Actors of this workspace only', async () => {
        const host = await new RichHost().start();
        const dev = host.addSession('Developer', WORKSPACE, '2026-10-28T10:00:00Z');
        const arch = host.addSession('Architect', WORKSPACE, '2026-10-28T10:00:00Z');
        const foreign = host.addSession('Developer', path.join(os.tmpdir(), 'another-workspace'), '2026-10-28T10:00:00Z');
        const other = host.addSession('Not an Actor', WORKSPACE, '2026-10-28T10:00:00Z');
        const { lines } = await connected(host);
        await until(() => host.ofType('session/activeClientSet').length === 2, 'tools published');

        expect(new Set(host.ofType('session/activeClientSet').map(d => d.channel))).toEqual(new Set([dev.uri, arch.uri]));
        expect(foreign.activeClient).toBeUndefined();
        expect(other.activeClient).toBeUndefined();
        const published = host.ofType('session/activeClientSet')[0].action.activeClient;
        expect(published.clientId).toBe(host.clientIds[0]);
        expect(published.tools.map((t: { name: string }) => t.name)).toEqual(['jarvis_createActorSession', 'jarvis_sendToActor', 'jarvis_receiveFromActor', 'jarvis_findActors']);
        expect(published.tools.every((t: { name: string }) => t.name.startsWith('jarvis_'))).toBe(true);
        // The summary is logged after the last action is echoed back, so it is awaited.
        await until(() => lines.some(l => l.includes('tools published to 2 of 2 existing Actor chat(s)')), 'publication summary logged');
    });

    it('publishes again after each connection, with the new client id (the host drops the tools about 33 s after a disconnect)', async () => {
        const host = await new RichHost().start();
        host.addSession('Developer', WORKSPACE, '2026-10-28T10:00:00Z');
        const { client } = await connected(host, { actors: ['Developer'] });
        await until(() => host.ofType('session/activeClientSet').length === 1, 'first publication');

        host.dropConnection();
        await until(() => host.clientIds.length === 2 && client.isConnected(), 'reconnected');
        await until(() => host.ofType('session/activeClientSet').length === 2, 'second publication');
        expect(host.ofType('session/activeClientSet')[1].action.activeClient.clientId).toBe(host.clientIds[1]);
        expect(host.clientIds[1]).not.toBe(host.clientIds[0]);
    });

    it('does not let two subscriptions to one channel cancel each other (publication racing with a delivery)', async () => {
        const host = await new RichHost().start();
        host.subscribeDelayMs = 40;
        host.addSession('Developer', WORKSPACE, '2026-10-28T10:00:00Z');
        host.agents = [{ name: 'Developer', uri: AGENT_URI('Developer') }];
        const { client, lines } = await connected(host, { actors: ['Developer'] });
        await Promise.all([client.publishTools(), client.deliverAnnouncement(REQ('Developer'), 1), client.publishTools()]);
        expect(lines.filter(l => l.startsWith('warn'))).toEqual([]);
        expect(host.ofType('chat/pendingMessageSet')).toHaveLength(1);
        expect(host.ofType('session/activeClientSet')).toHaveLength(1);
    });

    it('publishes to chats of Actors that appear later when asked again', async () => {
        const host = await new RichHost().start();
        const { client } = await connected(host, { actors: ['Developer'] });
        host.addSession('Developer', WORKSPACE, '2026-10-28T10:00:00Z');
        await client.publishTools();
        await client.publishTools();
        expect(host.ofType('session/activeClientSet')).toHaveLength(1);
    });
});

describe('SPEC_COM_TOOLS: calls (REQ_COM_CAPABILITY AC-4, US_COM_SENDER)', () => {
    async function ready(over: Parameters<typeof connected>[1] = {}) {
        const host = await new RichHost().start();
        const dev = host.addSession('Developer', WORKSPACE, '2026-10-28T10:00:00Z');
        const arch = host.addSession('Architect', WORKSPACE, '2026-10-28T10:00:00Z');
        const c = await connected(host, over);
        await until(() => host.ofType('session/activeClientSet').length === 2, 'tools published');
        return { host, dev, arch, ...c };
    }
    const start = (host: RichHost, chat: string, id: string, extra: object = {}) =>
        host.push(chat, { type: 'chat/toolCallStart', turnId: 't1', toolCallId: id, toolName: 'jarvis_sendToActor', contributor: { kind: 'client', clientId: host.clientIds[0] }, ...extra });

    it('answers a confirmed call with the result of the handler; the caller is the session of the calling chat', async () => {
        const { host, dev, calls } = await ready();
        start(host, dev.chat, 'c1');
        host.push(dev.chat, { type: 'chat/toolCallReady', turnId: 't1', toolCallId: 'c1', toolInput: JSON.stringify({ to: 'Architect', text: 'hi' }), confirmed: 'not-needed' });
        await until(() => host.ofType('chat/toolCallComplete').length === 1, 'tool call completed');

        const done = host.ofType('chat/toolCallComplete')[0];
        expect(done.channel).toBe(dev.chat);
        expect(done.action).toMatchObject({ turnId: 't1', toolCallId: 'c1', result: { success: true, content: [{ type: 'text', text: 'jarvis_sendToActor:Developer' }] } });
        expect(calls[0].ctx).toEqual({ session: dev.uri, title: 'Developer', chat: dev.chat });
        expect(calls[0].input).toEqual({ to: 'Architect', text: 'hi' });
    });

    it('takes the sender from the envelope, never from the tool input, also when the model claims another one', async () => {
        const { host, arch, calls } = await ready();
        start(host, arch.chat, 'c2');
        host.push(arch.chat, { type: 'chat/toolCallReady', turnId: 't1', toolCallId: 'c2', toolInput: JSON.stringify({ to: 'Developer', text: 'x', sender: 'Developer', from: 'Developer', claimedSender: 'Developer' }), confirmed: 'not-needed' });
        await until(() => calls.length === 1, 'handler called');
        expect(calls[0].ctx.title).toBe('Architect');
        expect(calls[0].ctx.session).toBe(arch.uri);
    });

    it('confirms its own unconfirmed call (User decision 2026-10-28) and runs it once, also when the execution request follows', async () => {
        const { host, dev, calls } = await ready();
        start(host, dev.chat, 'c3');
        host.push(dev.chat, { type: 'chat/toolCallReady', turnId: 't1', toolCallId: 'c3', toolInput: '{}' });
        await until(() => host.ofType('chat/toolCallComplete').length === 1, 'completed after the own confirmation');
        expect(host.ofType('chat/toolCallConfirmed')).toEqual([expect.objectContaining({ channel: dev.chat, action: { type: 'chat/toolCallConfirmed', turnId: 't1', toolCallId: 'c3', approved: true, confirmed: 'setting' } })]);

        host.push(dev.uri, { type: 'session/inputNeededSet', request: { kind: 'toolClientExecution', chat: dev.chat, turnId: 't1', clientId: host.clientIds[0], toolCall: { toolCallId: 'c3' } } });
        await new Promise(r => setTimeout(r, 100));
        expect(calls).toHaveLength(1);
        expect(host.ofType('chat/toolCallComplete')).toHaveLength(1);
    });

    it('confirms nothing for a call that is confirmed already', async () => {
        const { host, dev } = await ready();
        start(host, dev.chat, 'c5');
        host.push(dev.chat, { type: 'chat/toolCallReady', turnId: 't1', toolCallId: 'c5', toolInput: '{}', confirmed: 'not-needed' });
        await until(() => host.ofType('chat/toolCallComplete').length === 1, 'completed');
        expect(host.ofType('chat/toolCallConfirmed')).toHaveLength(0);
    });

    it('runs a call once, although both the ready action and the execution request arrive', async () => {
        const { host, dev, calls } = await ready();
        start(host, dev.chat, 'c4');
        host.push(dev.chat, { type: 'chat/toolCallReady', turnId: 't1', toolCallId: 'c4', toolInput: '{}', confirmed: 'user-action' });
        host.push(dev.uri, { type: 'session/inputNeededSet', request: { kind: 'toolClientExecution', chat: dev.chat, turnId: 't1', clientId: host.clientIds[0], toolCall: { toolCallId: 'c4' } } });
        await until(() => host.ofType('chat/toolCallComplete').length >= 1, 'completed');
        await new Promise(r => setTimeout(r, 100));
        expect(calls).toHaveLength(1);
        expect(host.ofType('chat/toolCallComplete')).toHaveLength(1);
    });

    it('ignores the tool calls of other clients', async () => {
        const { host, dev, calls } = await ready();
        host.push(dev.chat, { type: 'chat/toolCallStart', turnId: 't1', toolCallId: 'x1', toolName: 'jarvis_sendToActor', contributor: { kind: 'client', clientId: 'someone-else' } });
        host.push(dev.chat, { type: 'chat/toolCallReady', turnId: 't1', toolCallId: 'x1', toolInput: '{}', confirmed: 'not-needed' });
        await new Promise(r => setTimeout(r, 120));
        expect(calls).toHaveLength(0);
        expect(host.ofType('chat/toolCallComplete')).toHaveLength(0);
    });

    it('reports a failing handler and an unknown chat as an error result, not as silence', async () => {
        const failing: AhpToolSpec = { name: 'jarvis_fails', title: 'f', description: 'f', inputSchema: {}, handler: async () => { throw new Error('boom'); } };
        const { host, dev } = await ready({ tools: [failing] });
        host.push(dev.chat, { type: 'chat/toolCallStart', turnId: 't1', toolCallId: 'e1', toolName: 'jarvis_fails', contributor: { kind: 'client', clientId: host.clientIds[0] } });
        host.push(dev.chat, { type: 'chat/toolCallReady', turnId: 't1', toolCallId: 'e1', toolInput: '{}', confirmed: 'not-needed' });
        await until(() => host.ofType('chat/toolCallComplete').length === 1, 'error result');
        expect(host.ofType('chat/toolCallComplete')[0].action.result).toMatchObject({ success: false, content: [{ text: 'boom' }] });

        host.push('ahp-chat:/unknown', { type: 'chat/toolCallStart', turnId: 't2', toolCallId: 'e2', toolName: 'jarvis_fails', contributor: { kind: 'client', clientId: host.clientIds[0] } });
        host.push('ahp-chat:/unknown', { type: 'chat/toolCallReady', turnId: 't2', toolCallId: 'e2', toolInput: '{}', confirmed: 'not-needed' });
        await until(() => host.ofType('chat/toolCallComplete').length === 2, 'unknown chat answered');
        expect(host.ofType('chat/toolCallComplete')[1].action.result).toMatchObject({ success: false });
        expect(host.ofType('chat/toolCallComplete')[1].action.result.content[0].text).toMatch(/not a chat that Jarvis knows/);
    });

    it('follows a rename: the Actor of a call is the one named by the title of the session at that time', async () => {
        const { host, dev, calls } = await ready();
        host.push(dev.uri, { type: 'session/titleChanged', title: 'Renamed by the User' });
        await new Promise(r => setTimeout(r, 50));
        start(host, dev.chat, 'r1');
        host.push(dev.chat, { type: 'chat/toolCallReady', turnId: 't1', toolCallId: 'r1', toolInput: '{}', confirmed: 'not-needed' });
        await until(() => calls.length === 1, 'handler called');
        expect(calls[0].ctx.title).toBe('Renamed by the User');
    });
});

describe('SPEC_COM_CLIENTMODULE: without a connection', () => {
    it('refuses message path calls with a clear error and has no message path when none is configured', async () => {
        const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-ahp-msg-ud-'));
        cleanups.push(() => fs.rmSync(ud, { recursive: true, force: true }));
        const client = new AhpClient({ userDataDir: ud, log: () => undefined, messagePath: { workspaceFolder: WORKSPACE, actorNames: () => [], tools: [] } });
        cleanups.push(() => client.dispose());
        expect(client.isConnected()).toBe(false);
        await expect(client.ensureActorChat(REQ('Developer'))).rejects.toBeInstanceOf(NotConnectedError);
        await expect(client.deliverAnnouncement(REQ('Developer'), 1)).rejects.toBeInstanceOf(NotConnectedError);

        const plain = new AhpClient({ userDataDir: ud, log: () => undefined });
        expect(plain.isConnected()).toBe(false);
        await expect(plain.ensureActorChat(REQ('Developer'))).rejects.toThrow(/not configured/);
    });

    it('the client only records when no message path is given: it sends no action', async () => {
        const host = await new RichHost().start();
        host.addSession('Developer', WORKSPACE, '2026-10-28T10:00:00Z');
        const lines: string[] = [];
        const client = new AhpClient({ userDataDir: makeUserData(host), log: (s, t) => lines.push(`${s} ${t}`), isPidAlive: () => true, retryBaseDelayMs: 20 });
        cleanups.push(() => client.dispose());
        client.start();
        await until(() => client.isConnected(), 'connected');
        await new Promise(r => setTimeout(r, 100));
        expect(host.dispatched).toHaveLength(0);
        expect(host.createParams).toHaveLength(0);
    });
});

describe('module boundary of the message path', () => {
    it('no file of the module imports vscode, and the tool and announcement modules next to the sessions neither', () => {
        const files = [
            ...fs.readdirSync(path.resolve(__dirname, '../../packages/core/src/engine/ahp')).map(f => path.resolve(__dirname, '../../packages/core/src/engine/ahp', f)),
            path.resolve(__dirname, '../../packages/core/src/engine/sessions/actorMessageTools.ts'),
            path.resolve(__dirname, '../../packages/core/src/engine/sessions/actorAnnouncements.ts'),
        ].filter(f => f.endsWith('.ts'));
        for (const f of files) { expect(fs.readFileSync(f, 'utf8'), f).not.toMatch(/from 'vscode'|require\('vscode'\)/); }
    });
});
