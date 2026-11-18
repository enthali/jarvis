// Implementation: SPEC_COM_CLIENTMODULE, SPEC_COM_AHPDISCOVERY, SPEC_COM_LOGGING, SPEC_COM_BINDING
// Requirements: REQ_COM_CLIENT, REQ_COM_AGENTHOST, REQ_COM_LOG
// No `vscode` import: this folder must stay movable into a process of its own.
//
// The Jarvis AHP client: finds the Agent Host of this VS Code instance, connects, records what it offers
// (step 1) and, when `messagePath` is given, takes part in the message path (step 2).

import { randomUUID } from 'crypto';
import { AhpConnection, AhpRpcError } from './connection';
import { scanRegistry, isPidAlive, describeEndpoint, type AgentHostEntry, type RegistryScan } from './registry';
import {
    MessagePath, type ActorChat, type ActorChatRequest, type ActorChatSummary, type MessagePathOptions,
} from './messagePath';
import { listAllSessions, ROOT, type AhpLog, type AhpSeverity, type HostLink, type SessionSummary } from './protocol';
import { SessionState } from './sessionState';

export type { AhpLog, AhpSeverity };

export interface AhpClientOptions {
    /** User data folder of the VS Code instance; the Agent Host registry lives below it. */
    userDataDir: string;
    /** Further user data folders searched in order when `userDataDir` has no live entry (VS Code Server keeps its registry in the desktop folder). */
    fallbackUserDataDirs?: string[];
    log: AhpLog;
    clientName?: string;
    clientVersion?: string;
    /** The message path (SPEC_COM_TOOLS, SPEC_COM_BINDING, SPEC_COM_INJECT). Without it the client only records. */
    messagePath?: MessagePathOptions;
    retryBaseDelayMs?: number;
    retryMaxDelayMs?: number;
    connectTimeoutMs?: number;
    requestTimeoutMs?: number;
    isPidAlive?: (pid: number) => boolean;
}

/** Versions offered after the one the registry entry names; the host picks the highest it speaks. */
const FALLBACK_VERSIONS = ['1.0.0', '0.9.0'];

interface InitializeResult {
    protocolVersion?: string;
    serverInfo?: unknown;
    snapshots?: { resource?: string; state?: Record<string, unknown> }[];
    [key: string]: unknown;
}

function compact(value: unknown, max = 3000): string {
    let text: string;
    try { text = JSON.stringify(value) ?? String(value); } catch { text = String(value); }
    return text.length > max ? `${text.slice(0, max)}… (${text.length} chars)` : text;
}

export class AhpClient {
    private started = false;
    private disposed = false;
    private connection: AhpConnection | undefined;
    private ready = false;
    private wake: (() => void) | undefined;
    private sleepTimer: NodeJS.Timeout | undefined;
    private startTimer: NodeJS.Immediate | undefined;
    private readonly path: MessagePath | undefined;
    private readonly sessions = new SessionState();

    constructor(private readonly options: AhpClientOptions) {
        this.path = options.messagePath ? new MessagePath(options.messagePath, (s, t) => this.log(s, t)) : undefined;
    }

    private log(severity: AhpSeverity, text: string): void {
        try { this.options.log(severity, text); } catch { /* a failing log must not stop the client */ }
    }

    /** Returns at once; discovery, connection and recording run in the background. */
    start(): void {
        if (this.started || this.disposed) { return; }
        this.started = true;
        this.startTimer = setImmediate(() => {
            this.startTimer = undefined;
            this.run().catch(err => this.log('error', `client stopped unexpectedly: ${err instanceof Error ? err.stack ?? err.message : err}`));
        });
    }

    /** Cancels pending retries, closes the connection and logs the end. Safe to call more than once. */
    dispose(): void {
        if (this.disposed) { return; }
        this.disposed = true;
        if (this.startTimer) { clearImmediate(this.startTimer); this.startTimer = undefined; }
        this.wake?.();
        this.ready = false;
        this.path?.detach();
        this.sessions.clear();
        this.connection?.close();
        this.connection = undefined;
        if (this.started) { this.log('info', 'client ended'); }
    }

    /** True while a connection to the Agent Host is up and `initialize` is done. */
    isConnected(): boolean { return this.ready; }

    onSessionsChanged(listener: (sessions: SessionSummary[]) => void): () => void { return this.sessions.subscribe(listener); }

    // ---- message path (SPEC_COM_CLIENTMODULE, interface of the message path step) ----

    async listActorChatSessions(): Promise<ActorChatSummary[]> { return this.needPath().listActorChatSessions(); }

    async findActorChat(actorName: string): Promise<string | undefined> { return this.needPath().findActorChat(actorName); }

    /** Finds the chat of an Actor by its name, or creates it. */
    async ensureActorChat(req: ActorChatRequest): Promise<ActorChat> { return this.needPath().ensureActorChat(req); }

    /** Tells the chat of an Actor, creating it first when needed, that messages are waiting. */
    async deliverAnnouncement(req: ActorChatRequest, count: number): Promise<ActorChat> { return this.needPath().deliverAnnouncement(req, count); }

    /** Publishes the message tools to the existing chats of the Actors of the workspace (again after the Actors changed). */
    async publishTools(): Promise<void> {
        if (!this.path?.connected) { return; }
        try { await this.path.publishToExistingSessions(); }
        catch (err) { this.log('warn', `cannot publish the tools: ${explain(err)}`); }
    }

    private needPath(): MessagePath {
        if (!this.path) { throw new Error('The message path is not configured'); }
        return this.path;
    }

    // ---- discovery and connection ----

    private async run(): Promise<void> {
        const base = this.options.retryBaseDelayMs ?? 1_000;
        const max = this.options.retryMaxDelayMs ?? 8_000;
        const fallbacks = this.registryDirs().slice(1);
        this.log('info', `client started, user data folder ${this.options.userDataDir}${fallbacks.length ? ` (fallback ${fallbacks.join(', ')})` : ''}`);

        // The client does not give up: a chat that is opened later finds a connected client (REQ_COM_AGENTHOST AC-4).
        // Only the first failure and each change of its reason are logged, not every attempt.
        let attempt = 0;
        let lastReason: string | undefined;
        while (!this.disposed) {
            attempt++;
            const outcome = await this.attempt();
            if (this.disposed) { return; }

            if (outcome.connected) {
                lastReason = undefined;
                const reason = await outcome.closed;
                this.ready = false;
                this.path?.detach();
                this.sessions.clear();
                this.connection = undefined;
                if (this.disposed) { return; }
                this.log('warn', `connection to the Agent Host lost (${reason}); searching again`);
                attempt = 0;
                continue;
            }

            const delay = Math.min(max, base * 2 ** (attempt - 1));
            if (outcome.reason !== lastReason) {
                lastReason = outcome.reason;
                this.log('info', `no connection to the Agent Host yet (${outcome.reason}); keeps looking, next attempt in ${delay} ms`);
            }
            await this.sleep(delay);
        }
    }

    private async attempt(): Promise<{ connected: true; closed: Promise<string> } | { connected: false; reason: string }> {
        const scan = this.scan();
        if (!scan.entry) { return { connected: false, reason: scan.reason ?? 'no entry' }; }

        // Newest first. A pid of an ended host can be reused by another process, so a stale entry may look live.
        const reasons: string[] = [];
        for (const entry of scan.candidates) {
            const outcome = await this.connectTo(entry, scan.entriesDir, scan.counts);
            if (outcome.connected || this.disposed) { return outcome; }
            reasons.push(outcome.reason);
            if (scan.candidates.length > 1) { this.log('warn', `entry of pid ${entry.pid} unusable: ${outcome.reason}`); }
        }
        return { connected: false, reason: reasons.join('; ') };
    }

    private registryDirs(): string[] {
        return [...new Set([this.options.userDataDir, ...(this.options.fallbackUserDataDirs ?? [])])];
    }

    /** The first registry folder with a live entry; otherwise the reasons of all folders. */
    private scan(): RegistryScan {
        const misses: RegistryScan[] = [];
        for (const dir of this.registryDirs()) {
            const scan = scanRegistry(dir, this.options.isPidAlive ?? isPidAlive);
            if (scan.entry) { return scan; }
            misses.push(scan);
        }
        return { ...misses[0], reason: misses.map(m => m.reason).join('; ') };
    }

    private async connectTo(entry: AgentHostEntry, entriesDir: string, counts: { files: number; live: number }): Promise<{ connected: true; closed: Promise<string> } | { connected: false; reason: string }> {
        this.log('info', `registry ${entriesDir}: ${counts.files} file(s), ${counts.live} live entr${counts.live === 1 ? 'y' : 'ies'}; trying ${entry.type} pid ${entry.pid}, instance ${entry.instanceId}, ${describeEndpoint(entry)}, registry protocol ${entry.protocolVersion}`);

        let conn: AhpConnection;
        try {
            conn = await AhpConnection.connect(entry, {
                connectTimeoutMs: this.options.connectTimeoutMs,
                requestTimeoutMs: this.options.requestTimeoutMs,
                onNotification: (method, params) => this.onNotification(method, params),
            });
        } catch (err) {
            return { connected: false, reason: `cannot connect to ${describeEndpoint(entry)}: ${err instanceof Error ? err.message : err}` };
        }
        if (this.disposed) { conn.close(); return { connected: false, reason: 'disposed' }; }
        this.connection = conn;
        const closed = new Promise<string>(resolve => conn.onClose(resolve));
        this.log('info', `connected to the Agent Host (pid ${entry.pid})`);

        try {
            await this.record(conn, entry);
        } catch (err) {
            // The initialize handshake failed: the host is no use to us on this connection.
            conn.close();
            this.connection = undefined;
            this.sessions.clear();
            return { connected: false, reason: `initialize failed: ${explain(err)}` };
        }
        return { connected: true, closed };
    }

    /** Recording (SPEC_COM_AHPDISCOVERY): protocol version, announced capabilities, then the sessions. */
    private async record(conn: AhpConnection, entry: AgentHostEntry): Promise<void> {
        this.sessions.begin();
        const offered = [...new Set([entry.protocolVersion, ...FALLBACK_VERSIONS])];
        const clientId = `jarvis-core-${randomUUID()}`;
        const init = await conn.request<InitializeResult>('initialize', {
            channel: ROOT,
            protocolVersions: offered,
            clientId,
            clientInfo: { name: this.options.clientName ?? 'jarvis-core', version: this.options.clientVersion },
            initialSubscriptions: [ROOT],
        });

        const negotiated = init.protocolVersion;
        this.log('info', `protocol version negotiated: ${negotiated} (offered ${offered.join(', ')}; registry entry says ${entry.protocolVersion})`);
        if (negotiated !== entry.protocolVersion) {
            this.log('warn', `negotiated protocol version ${negotiated} differs from the registry entry ${entry.protocolVersion}`);
        }
        if (init.serverInfo !== undefined) { this.log('info', `host: ${compact(init.serverInfo)}`); }

        const { snapshots, ...announced } = init;
        this.log('info', `announced by initialize (without snapshots): ${compact(announced)}`);

        const root = snapshots?.find(s => s.resource === ROOT)?.state;
        if (root) {
            this.recordRoot(root);
        } else {
            this.log('warn', 'initialize returned no ahp-root:// snapshot, so the agents and their capabilities are not known');
        }

        await this.recordSessions(conn);

        if (this.disposed) { return; }

        this.ready = true;
        if (this.path) {
            const link: HostLink = {
                clientId,
                request: (method, params) => conn.request(method, params),
                dispatch: (channel, action) => conn.dispatch(channel, action),
            };
            this.path.attach(link);
            void this.publishTools();
        }
    }

    private recordRoot(root: Record<string, unknown>): void {
        const build = (root._meta as { hostBuild?: { version?: unknown; quality?: unknown } } | undefined)?.hostBuild;
        if (build) { this.log('info', `host build: version ${build.version}, quality ${build.quality}`); }
        const agents = Array.isArray(root.agents) ? root.agents as Record<string, unknown>[] : [];
        this.log('info', `agents: ${agents.length}`);
        for (const a of agents) {
            const models = Array.isArray(a.models) ? a.models.length : 0;
            const protectedResources = Array.isArray(a.protectedResources) ? a.protectedResources.length : 0;
            this.log('info', `agent ${a.provider} "${a.displayName}": ${models} model(s), ${protectedResources} protected resource(s), capabilities ${compact(a.capabilities ?? 'none announced')}`);
        }
        const rest: Record<string, unknown> = {};
        for (const key of ['activeSessions', '_meta']) { if (root[key] !== undefined) { rest[key] = root[key]; } }
        const configProps = (root.config as { schema?: { properties?: object } } | undefined)?.schema?.properties;
        if (configProps) { rest.configProperties = Object.keys(configProps); }
        this.log('info', `root state: ${compact(rest)}`);
    }

    private async recordSessions(conn: AhpConnection): Promise<void> {
        try {
            const { sessions, cutOff } = await listAllSessions({ request: (m, p) => conn.request(m, p) });
            this.log('info', `sessions: ${sessions.length}${cutOff ? ' (list cut off, host offers more pages)' : ''}`);
            for (const s of sessions) {
                this.log('info', `session ${s.resource ?? '?'} | provider ${s.provider ?? '?'} | title ${JSON.stringify(s.title ?? '')}`);
            }
            this.sessions.finish(sessions);
        } catch (err) {
            if (!this.disposed) { this.log('warn', `listSessions failed: ${explain(err)}`); }
            throw err;
        }
    }

    private onNotification(method: string, params: unknown): void {
        this.sessions.notify(method, params);
        this.path?.handleNotification(method, params);
        if (method === 'auth/required') {
            this.log('warn', `host asks for authentication: ${compact(params, 800)}`);
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => {
            const done = (): void => {
                if (this.sleepTimer) { clearTimeout(this.sleepTimer); this.sleepTimer = undefined; }
                this.wake = undefined;
                resolve();
            };
            this.wake = done;
            this.sleepTimer = setTimeout(done, ms);
        });
    }
}

function explain(err: unknown): string {
    if (err instanceof AhpRpcError && err.code === -32005) {
        return `${err.message}; the host supports ${compact((err.data as { supportedVersions?: unknown } | undefined)?.supportedVersions)}`;
    }
    return err instanceof Error ? err.message : String(err);
}
