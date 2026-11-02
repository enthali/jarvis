// Implementation: SPEC_COM_TOOLS, SPEC_COM_INJECT, SPEC_COM_BINDING, SPEC_COM_INBOX (announcement)
// Requirements: REQ_COM_CAPABILITY, REQ_COM_NOTIFY, REQ_COM_INJECT, REQ_COM_CHATNAME
// No `vscode` import: this folder must stay movable into a process of its own.
//
// The message path of the Jarvis AHP client: find or create the chat of an Actor, write fixed texts into
// it, and publish the message tools to it. Everything the module needs from the extension (Actor names,
// the tool handlers that reach the inbox) arrives as arguments.

import { randomUUID } from 'crypto';
import {
    fileUri, listAllSessions, modifiedTime, sessionHasFolder, unwrapSnapshot,
    type AhpLog, type HostLink, type SessionSummary,
} from './protocol';

export interface ToolCallContext {
    /** Address of the session of the calling chat, taken from the envelope of the tool call, never from the tool input. */
    session: string;
    /** Title of that session; the Actor is the one whose name equals it (SPEC_COM_BINDING). */
    title: string;
    chat: string;
}

export interface ToolResult { text: string; isError?: boolean }

export interface AhpToolSpec {
    name: string;
    title: string;
    description: string;
    inputSchema: object;
    handler: (ctx: ToolCallContext, input: Record<string, unknown>) => Promise<ToolResult>;
}

export interface MessagePathOptions {
    /** Working folder of the window; an Actor chat is a session of the host that has this folder (SPEC_COM_BINDING). */
    workspaceFolder: string;
    /** Names of the Actors of the workspace; the evaluation of the actor.yaml files. */
    actorNames: () => string[];
    tools: AhpToolSpec[];
    provider?: string;
    /** How long to wait for the host to list the agent of an Actor in a session it has just created. */
    agentWaitCreateMs?: number;
    /** The same for a chat that exists already. */
    agentWaitExistingMs?: number;
    /** How long to wait for the host to echo an action before the client logs that it did not. */
    ackTimeoutMs?: number;
}

/** What Jarvis writes into an Actor chat: the start-up instruction (built by Jarvis) and the announcement. */
export interface ActorChatRequest {
    name: string;
    startupText: string;
}

export interface ActorChatSummary { session: string; title: string; modifiedAt: number; folders: string[]; archived: boolean }

export interface ActorChat { session: string; created: boolean }

/** `SessionSummary.status` bit of an archived session. */
const ARCHIVED = 64;

export class NotConnectedError extends Error {
    constructor() { super('Jarvis is not connected to the Agent Host'); }
}

/** The announcement text is defined here and nowhere else; it carries no sender text (REQ_COM_NOTIFY AC-2). */
export function announcementText(count: number): string {
    return `[Jarvis Message Service] You have ${count} new message(s) waiting. `
        + 'Receive them with the jarvis_receiveMessage tool and call it again until it reports that no message remains.';
}

interface Tracked { title: string; chats: Set<string>; defaultChat?: string }
interface ToolCall { toolCallId: string; chat: string; turnId?: string; toolName?: string; input?: unknown; executed: boolean }
interface Envelope { channel?: string; action?: Record<string, any>; origin?: { clientId?: string; clientSeq?: number }; rejectionReason?: string }

const DISPLAY_NAME = 'Jarvis';

export class MessagePath {
    private link: HostLink | undefined;
    private readonly tracked = new Map<string, Tracked>();
    private readonly chatToSession = new Map<string, string>();
    private readonly published = new Set<string>();
    private readonly calls = new Map<string, ToolCall>();
    /** Calls already answered; the host may still ask for their execution afterwards. */
    private readonly finished = new Set<string>();
    private readonly echoes = new Map<number, (outcome: string | undefined) => void>();
    private readonly creating = new Map<string, Promise<ActorChat>>();
    private readonly subscribes = new Map<string, Promise<unknown>>();
    private readonly publishing = new Map<string, Promise<void>>();
    private readonly toolsByName: Map<string, AhpToolSpec>;
    private sessionKeysLogged = false;

    constructor(private readonly options: MessagePathOptions, private readonly log: AhpLog) {
        this.toolsByName = new Map(options.tools.map(t => [t.name, t]));
    }

    get connected(): boolean { return this.link !== undefined; }

    /** Called after each connection: the host removes the tools of a client about 33 s after it has gone, so they are published again. */
    attach(link: HostLink): void {
        this.link = link;
    }

    detach(): void {
        this.link = undefined;
        this.tracked.clear();
        this.chatToSession.clear();
        this.published.clear();
        this.calls.clear();
        this.finished.clear();
        this.subscribes.clear();
        this.publishing.clear();
        for (const [seq, resolve] of [...this.echoes]) { this.echoes.delete(seq); resolve('connection lost'); }
    }

    // ---- finding chats (SPEC_COM_BINDING) ----

    /** The sessions of the Agent Host that have the workspace folder of this window. */
    async listActorChatSessions(): Promise<ActorChatSummary[]> {
        const link = this.need();
        const { sessions } = await listAllSessions(link);
        if (!this.sessionKeysLogged && sessions[0]) {
            this.sessionKeysLogged = true;
            this.log('debug', `session summary fields: ${Object.keys(sessions[0]).join(', ')}`);
        }
        return sessions
            .filter(s => s.resource && sessionHasFolder(s, this.options.workspaceFolder))
            .map((s: SessionSummary) => ({ session: s.resource as string, title: s.title ?? '', modifiedAt: modifiedTime(s), folders: s.workingDirectories ?? [], archived: ((s.status ?? 0) & ARCHIVED) !== 0 }));
    }

    /** The chat that carries the name of the Actor; the one modified last when several do (titles are not unique). An archived chat is used only when no other carries the name, and is restored first. */
    async findActorChat(actorName: string): Promise<string | undefined> {
        const matches = (await this.listActorChatSessions())
            .filter(s => s.title === actorName)
            .sort((a, b) => Number(a.archived) - Number(b.archived) || b.modifiedAt - a.modifiedAt);
        this.log('info', `chat of Actor "${actorName}" in ${this.options.workspaceFolder}: ${matches.length} match(es)${matches.map(m => `\n  ${m.session} | modified ${m.modifiedAt} | ${m.archived ? 'archived | ' : ''}folders ${m.folders.join(', ') || '-'}`).join('')}`);
        if (matches.length > 1) {
            this.log('warn', `${matches.length} chats carry the name of Actor "${actorName}" in this workspace; using ${matches[0].session}`);
        }
        if (matches[0]?.archived) {
            // The same action as Restore in the Agents window; an archived chat is read-only in the editor.
            await this.send(matches[0].session, { type: 'session/isArchivedChanged', isArchived: false });
            this.log('info', `restored the archived chat of Actor "${actorName}": ${matches[0].session}`);
        }
        return matches[0]?.session;
    }

    /** Finds the chat of an Actor, or creates it (REQ_COM_CHATNAME AC-3). Calls for one Actor run one after the other. */
    ensureActorChat(req: ActorChatRequest): Promise<ActorChat> {
        const prior: Promise<unknown> = this.creating.get(req.name) ?? Promise.resolve();
        const run = prior.catch(() => undefined).then(() => this.findOrCreate(req));
        this.creating.set(req.name, run);
        const clear = (): void => { if (this.creating.get(req.name) === run) { this.creating.delete(req.name); } };
        run.then(clear, clear);
        return run;
    }

    private async findOrCreate(req: ActorChatRequest): Promise<ActorChat> {
        this.need();
        const existing = await this.findActorChat(req.name);
        if (existing) {
            await this.ensurePublished(existing);
            return { session: existing, created: false };
        }
        return { session: await this.createChat(req), created: true };
    }

    /** SPEC_COM_BINDING, Creating the chat: session, start-up instruction, then the name. */
    private async createChat(req: ActorChatRequest): Promise<string> {
        const link = this.need();
        const session = `${this.options.provider ?? 'copilotcli'}:/${randomUUID()}`;
        await link.request('createSession', {
            channel: session,
            provider: this.options.provider ?? 'copilotcli',
            workingDirectories: [fileUri(this.options.workspaceFolder)],
            config: { isolation: 'folder' },
            activeClient: this.activeClient(),
        });
        await this.track(session);
        this.published.add(session);
        this.log('info', `created the chat of Actor "${req.name}": ${session}`);

        const agent = await this.findAgent(session, req.name, this.options.agentWaitCreateMs ?? 8000);
        await this.queue(session, req.startupText, agent, req.name);
        await this.send(session, { type: 'session/titleChanged', title: req.name });
        const t = this.tracked.get(session);
        if (t) { t.title = req.name; }
        return session;
    }

    // ---- writing into a chat (SPEC_COM_INJECT) ----

    /** Tells the chat of an Actor, creating the chat first when there is none, that messages are waiting. */
    async deliverAnnouncement(req: ActorChatRequest, count: number): Promise<ActorChat> {
        const chat = await this.ensureActorChat(req);
        const agent = await this.findAgent(chat.session, req.name, this.options.agentWaitExistingMs ?? 3000);
        await this.queue(chat.session, announcementText(count), agent, req.name);
        this.log('info', `announced ${count} waiting message(s) to Actor "${req.name}" (${chat.session})`);
        return chat;
    }

    /**
     * Writes one fixed text into a chat in the voice of the User. Internal: only the two callers above pass a
     * text, and both pass texts that Jarvis defines. Always `pendingMessageSet`, never `turnStarted`: that
     * would replace the running turn of an existing chat (REQ_COM_NOTIFY AC-4). Every message carries the
     * agent, because the host does not keep it for later messages (FI-2026-10-28).
     */
    private async queue(session: string, text: string, agent: string | undefined, actorName: string): Promise<void> {
        const chat = await this.defaultChat(session);
        if (!agent) {
            this.log('warn', `the Agent Host lists no agent for Actor "${actorName}"; the text goes to ${session} without an agent. The agent file needs a description in its front matter.`);
        }
        await this.send(chat, {
            type: 'chat/pendingMessageSet',
            kind: 'queued',
            id: randomUUID(),
            message: { text, origin: { kind: 'user' }, ...(agent ? { agent: { uri: agent } } : {}) },
        });
    }

    /** The address of the agent file of the Actor, as the host lists it in the customizations of the session. */
    private async findAgent(session: string, actorName: string, waitMs: number): Promise<string | undefined> {
        const deadline = Date.now() + waitMs;
        for (;;) {
            const state = await this.snapshot(session);
            const found = agentOf(state.customizations, actorName);
            if (found || Date.now() >= deadline) { return found; }
            await new Promise(r => setTimeout(r, 400));
        }
    }

    // ---- publishing the tools (SPEC_COM_TOOLS) ----

    private activeClient(): object {
        const link = this.need();
        return {
            clientId: link.clientId,
            displayName: DISPLAY_NAME,
            tools: this.options.tools.map(t => ({ name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema })),
        };
    }

    /** Publishes the tools to every existing chat of an Actor of this workspace. */
    async publishToExistingSessions(): Promise<void> {
        const names = new Set(this.options.actorNames());
        if (names.size === 0) { return; }
        const chats = (await this.listActorChatSessions()).filter(c => names.has(c.title));
        let ok = 0;
        for (const c of chats) {
            try { await this.ensurePublished(c.session); ok++; }
            catch (err) { this.log('warn', `cannot publish the tools to ${c.session}: ${err instanceof Error ? err.message : err}`); }
        }
        if (chats.length > 0) { this.log('info', `tools published to ${ok} of ${chats.length} existing Actor chat(s)`); }
    }

    private ensurePublished(session: string): Promise<void> {
        if (this.published.has(session)) { return Promise.resolve(); }
        const inFlight = this.publishing.get(session);
        if (inFlight) { return inFlight; }
        const run = (async (): Promise<void> => {
            await this.track(session);
            await this.send(session, { type: 'session/activeClientSet', activeClient: this.activeClient() });
            this.published.add(session);
        })();
        this.publishing.set(session, run);
        const clear = (): void => { if (this.publishing.get(session) === run) { this.publishing.delete(session); } };
        run.then(clear, clear);
        return run;
    }

    // ---- state of the sessions the client takes part in ----

    private snapshot(channel: string): Promise<Record<string, any>> {
        return this.subscribe(channel).then(unwrapSnapshot);
    }

    /** A second `subscribe` to a channel cancels the first one that is still waiting (the host answers "Subscription cancelled"), so they run one after the other. */
    private subscribe(channel: string): Promise<unknown> {
        const prior: Promise<unknown> = this.subscribes.get(channel) ?? Promise.resolve();
        const run = prior.catch(() => undefined).then(() => this.need().request('subscribe', { channel }));
        this.subscribes.set(channel, run);
        const clear = (): void => { if (this.subscribes.get(channel) === run) { this.subscribes.delete(channel); } };
        run.then(clear, clear);
        return run;
    }

    /** Subscribes to the session and its chats: the actions of a tool call arrive on the chat channel. */
    private async track(session: string): Promise<void> {
        const state = await this.snapshot(session);
        const chats = new Set<string>();
        for (const c of (state.chats ?? []) as { resource?: string }[]) { if (c.resource) { chats.add(c.resource); } }
        if (state.defaultChat) { chats.add(state.defaultChat as string); }
        this.tracked.set(session, { title: String(state.title ?? ''), chats, defaultChat: state.defaultChat ?? [...chats][0] });
        for (const chat of chats) {
            this.chatToSession.set(chat, session);
            await this.subscribe(chat);
        }
    }

    private async defaultChat(session: string): Promise<string> {
        if (!this.tracked.has(session)) { await this.track(session); }
        const chat = this.tracked.get(session)?.defaultChat;
        if (!chat) { throw new Error(`session ${session} has no chat`); }
        return chat;
    }

    private async sessionOfChat(chat: string): Promise<string | undefined> {
        const known = this.chatToSession.get(chat);
        if (known) { return known; }
        for (const session of [...this.tracked.keys()]) {
            try { await this.track(session); } catch { /* the session may be gone */ }
            const found = this.chatToSession.get(chat);
            if (found) { return found; }
        }
        return undefined;
    }

    // ---- actions from the host ----

    handleNotification(method: string, params: unknown): void {
        const link = this.link;
        if (method !== 'action' || !link) { return; }
        const env = params as Envelope;
        const a = env.action;
        if (!a) { return; }

        if (env.origin?.clientId === link.clientId && env.origin.clientSeq !== undefined) {
            const waiter = this.echoes.get(env.origin.clientSeq);
            if (waiter) { this.echoes.delete(env.origin.clientSeq); waiter(env.rejectionReason ? `rejected: ${env.rejectionReason}` : undefined); }
        }

        const channel = env.channel ?? '';
        switch (a.type) {
            case 'session/titleChanged': {
                const t = this.tracked.get(channel);
                if (t) { t.title = String(a.title ?? ''); }
                break;
            }
            case 'session/chatAdded':
            case 'session/chatRemoved':
            case 'session/defaultChatChanged':
                if (this.tracked.has(channel)) { void this.track(channel).catch(() => undefined); }
                break;
            case 'chat/toolCallStart':
                if (a.contributor?.clientId === link.clientId) {
                    this.calls.set(a.toolCallId, { toolCallId: a.toolCallId, chat: channel, turnId: a.turnId, toolName: a.toolName, input: a.toolInput, executed: false });
                    this.log('info', `tool call ${a.toolName} started on ${channel}`);
                } else if (this.toolsByName.has(a.toolName)) {
                    this.log('warn', `tool call ${a.toolName} on ${channel} goes to client ${a.contributor?.clientId ?? '?'}, not to this client ${link.clientId}`);
                }
                break;
            case 'chat/toolCallReady': {
                const call = this.calls.get(a.toolCallId);
                if (!call) { break; }
                call.turnId ??= a.turnId;
                call.input = a.toolInput ?? call.input;
                this.log('info', `tool call ${call.toolName} ready, confirmed=${a.confirmed ?? 'no'}`);
                if (a.confirmed) { void this.execute(call); break; }
                // The editor offers no approval for a tool of another client, so the call would wait forever; the User decided (2026-10-28) that Jarvis approves its own tools.
                void this.send(channel, { type: 'chat/toolCallConfirmed', turnId: call.turnId, toolCallId: call.toolCallId, approved: true, confirmed: 'setting' })
                    .then(() => this.execute(call))
                    .catch(err => this.log('warn', `cannot confirm tool call ${call.toolName}: ${err instanceof Error ? err.message : err}`));
                break;
            }
            case 'session/inputNeededSet': {
                const r = a.request;
                if (r?.kind === 'toolClientExecution' && r.clientId !== link.clientId && this.toolsByName.has(r.toolCall?.toolName)) {
                    this.log('warn', `the Agent Host waits for client ${r.clientId} to run ${r.toolCall?.toolName}; this client is ${link.clientId}`);
                }
                if (r?.kind !== 'toolClientExecution' || r.clientId !== link.clientId) { break; }
                const id = r.toolCall?.toolCallId;
                const call = this.calls.get(id) ?? { toolCallId: id, chat: r.chat, turnId: r.turnId, toolName: r.toolCall?.toolName, input: r.toolCall?.toolInput, executed: false };
                call.chat ||= r.chat;
                call.turnId ??= r.turnId;
                call.toolName ??= r.toolCall?.toolName;
                call.input ??= r.toolCall?.toolInput;
                this.calls.set(id, call);
                void this.execute(call);
                break;
            }
            default:
        }
    }

    /** Runs a tool of this client for the chat that called it; the caller comes from the envelope, never from the input. */
    private async execute(call: ToolCall): Promise<void> {
        if (call.executed || this.finished.has(call.toolCallId)) { return; }
        call.executed = true;
        this.finished.add(call.toolCallId);
        const link = this.link;
        if (!link) { return; }

        const spec = this.toolsByName.get(call.toolName ?? '');
        let result: ToolResult;
        if (!spec) {
            result = { text: `Unknown tool "${call.toolName}".`, isError: true };
        } else {
            try {
                const session = await this.sessionOfChat(call.chat);
                if (!session) { throw new Error('The calling chat is not a chat that Jarvis knows.'); }
                result = await spec.handler({ session, title: this.tracked.get(session)?.title ?? '', chat: call.chat }, parseInput(call.input));
            } catch (err) {
                result = { text: err instanceof Error ? err.message : String(err), isError: true };
            }
        }
        this.log(result.isError ? 'warn' : 'info', `tool ${call.toolName} ${result.isError ? 'failed' : 'done'} for ${call.chat}`);
        this.calls.delete(call.toolCallId);
        link.dispatch(call.chat, {
            type: 'chat/toolCallComplete',
            turnId: call.turnId,
            toolCallId: call.toolCallId,
            result: { success: !result.isError, pastTenseMessage: `Used ${call.toolName}`, content: [{ type: 'text', text: result.text }] },
        });
    }

    /** Dispatches an action and waits for the host to echo it. A rejection is an error; a missing echo is logged, not fatal. */
    private async send(channel: string, action: { type: string; [key: string]: unknown }): Promise<void> {
        const link = this.need();
        const seq = link.dispatch(channel, action);
        const ackMs = this.options.ackTimeoutMs ?? 5000;
        const outcome = await new Promise<string | undefined>(resolve => {
            const timer = setTimeout(() => { this.echoes.delete(seq); resolve('no echo'); }, ackMs);
            this.echoes.set(seq, o => { clearTimeout(timer); resolve(o); });
        });
        if (outcome === 'no echo') {
            this.log('warn', `the Agent Host did not echo ${action.type} on ${channel} within ${ackMs} ms`);
        } else if (outcome) {
            throw new Error(`${action.type} on ${channel}: ${outcome}`);
        }
    }

    private need(): HostLink {
        if (!this.link) { throw new NotConnectedError(); }
        return this.link;
    }
}

function parseInput(input: unknown): Record<string, unknown> {
    if (typeof input === 'string') {
        try { const v = JSON.parse(input); return v && typeof v === 'object' ? v as Record<string, unknown> : {}; } catch { return {}; }
    }
    return input && typeof input === 'object' ? input as Record<string, unknown> : {};
}

/** Walks the customizations of a session for the agent file of an Actor. */
function agentOf(customizations: unknown, actorName: string): string | undefined {
    const walk = (list: unknown): string | undefined => {
        for (const x of Array.isArray(list) ? list as Record<string, any>[] : []) {
            if (x.type === 'agent' && x.uri && (x.name === actorName || fileStem(String(x.uri)) === actorName)) { return String(x.uri); }
            const inner = walk(x.children);
            if (inner) { return inner; }
        }
        return undefined;
    };
    return walk(customizations);
}

function fileStem(uri: string): string {
    let name = uri.slice(uri.lastIndexOf('/') + 1);
    try { name = decodeURIComponent(name); } catch { /* keep the raw name */ }
    return name.replace(/\.agent\.md$/i, '');
}
