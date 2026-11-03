// REQ_COM_CAPABILITY AC-2/AC-3/AC-5, US_COM_SENDER, US_COM_FIND (SPEC_COM_TOOLS), REQ_COM_NOTIFY (SPEC_COM_INBOX)
import { describe, it, expect } from 'vitest';
import {
    createActorMessageTools, TOOL_CREATE_SESSION, TOOL_FIND, TOOL_RECEIVE, TOOL_SEND,
    type ActorMessageToolDeps,
} from '../../packages/core/src/engine/sessions/actorMessageTools';
import { createAnnouncer, type InboxMessage } from '../../packages/core/src/engine/sessions/actorAnnouncements';

interface Harness { deps: ActorMessageToolDeps; inbox: { destination: string; sender: string; text: string; timestamp: string }[]; changed: number; chats: string[]; logs: string[] }

function harness(actors = ['Architect', 'Developer', 'Twin', 'Twin2']): Harness {
    const h: Harness = { inbox: [], changed: 0, chats: [], logs: [], deps: undefined as unknown as ActorMessageToolDeps };
    h.deps = {
        actors: () => actors.map(name => ({ name, summary: `${name} summary` })),
        lookup: name => name === 'Twin' ? { status: 'ambiguous', message: 'Actor name "Twin" is ambiguous: a, b' }
            : actors.includes(name) ? { status: 'found', name } : { status: 'unknown' },
        appendMessage: (destination, sender, text) => { h.inbox.push({ destination, sender, text, timestamp: `t${h.inbox.length}` }); },
        popMessage: destination => {
            const i = h.inbox.findIndex(m => m.destination === destination);
            if (i === -1) { return { message: null, remaining: 0 }; }
            const [m] = h.inbox.splice(i, 1);
            return { message: m, remaining: h.inbox.filter(x => x.destination === destination).length };
        },
        ensureChat: async name => { h.chats.push(name); return `copilotcli:/${name}`; },
        changed: () => { h.changed++; },
        log: text => h.logs.push(text),
    };
    return h;
}

const ctx = (title: string) => ({ session: `copilotcli:/${title}`, title, chat: 'ahp-chat:/x' });
const toolOf = (h: Harness, name: string) => createActorMessageTools(h.deps).find(t => t.name === name)!;

describe('SPEC_COM_TOOLS: the four tools', () => {
    it('publishes the four specified names and no deprecated tools', () => {
        const names = createActorMessageTools(harness().deps).map(t => t.name);
        expect(names).toEqual([TOOL_SEND, TOOL_RECEIVE, TOOL_FIND, TOOL_CREATE_SESSION]);
        expect(names.sort()).toEqual(['jarvis_createActorSession', 'jarvis_listActors', 'jarvis_receiveMessage', 'jarvis_sendMessage']);
        const old = ['jarvis_sendToActor', 'jarvis_receiveFromActor', 'jarvis_findActors', 'jarvis_sendToSession', 'jarvis_readMessage', 'jarvis_listChatSessions'];
        for (const n of old) { expect(names).not.toContain(n); }
    });

    it('take no sender, recipient or inbox name from their input (US_COM_SENDER, SPEC_COM_TOOLS Caller)', () => {
        const tools = createActorMessageTools(harness().deps);
        const props = (n: string) => Object.keys((tools.find(t => t.name === n)!.inputSchema as { properties: object }).properties);
        expect(props(TOOL_SEND)).toEqual(['session', 'text']);
        expect(props(TOOL_RECEIVE)).toEqual([]);
        expect(props(TOOL_FIND)).toEqual([]);
        expect(props(TOOL_CREATE_SESSION)).toEqual(['actor']);
    });
});

describe('jarvis_sendMessage', () => {
    it('stores the message from the Actor of the calling chat for the named Actor', async () => {
        const h = harness();
        const r = await toolOf(h, TOOL_SEND).handler(ctx('Developer'), { session: 'Architect', text: 'hello' });
        expect(r.isError).toBeUndefined();
        expect(h.inbox).toEqual([{ destination: 'Architect', sender: 'Developer', text: 'hello', timestamp: 't0' }]);
        expect(h.changed).toBe(1);
        expect(r.text).toContain('Architect');
    });

    it('ignores a sender that the model puts into the input', async () => {
        const h = harness();
        await toolOf(h, TOOL_SEND).handler(ctx('Developer'), { session: 'Architect', text: 'hello', sender: 'Architect', senderSession: 'Architect', from: 'Architect' });
        expect(h.inbox[0].sender).toBe('Developer');
    });

    it('fails for an unknown receiver with the value and the valid names (US_COM_SENDER AC-2)', async () => {
        const h = harness();
        const r = await toolOf(h, TOOL_SEND).handler(ctx('Developer'), { session: 'Nobody', text: 'x' });
        expect(r.isError).toBe(true);
        expect(r.text).toContain('"Nobody"');
        expect(r.text).toContain('Architect, Developer, Twin, Twin2');
        expect(h.inbox).toHaveLength(0);
    });

    it('fails for an ambiguous receiver and for a chat that is no Actor chat', async () => {
        const h = harness();
        expect((await toolOf(h, TOOL_SEND).handler(ctx('Developer'), { session: 'Twin', text: 'x' })).text).toContain('ambiguous');
        const r = await toolOf(h, TOOL_SEND).handler(ctx('My own chat'), { session: 'Architect', text: 'x' });
        expect(r.isError).toBe(true);
        expect(r.text).toMatch(/not the chat of an Actor/);
        expect((await toolOf(h, TOOL_SEND).handler(ctx('Twin'), { session: 'Architect', text: 'x' })).isError).toBe(true);
        expect(h.inbox).toHaveLength(0);
    });

    it('requires both parameters', async () => {
        const h = harness();
        expect((await toolOf(h, TOOL_SEND).handler(ctx('Developer'), { session: 'Architect' })).isError).toBe(true);
        expect((await toolOf(h, TOOL_SEND).handler(ctx('Developer'), { text: 'x' })).isError).toBe(true);
        expect((await toolOf(h, TOOL_SEND).handler(ctx('Developer'), { session: 'Architect', text: '  ' })).isError).toBe(true);
    });

    it('does not log what was written', async () => {
        const h = harness();
        await toolOf(h, TOOL_SEND).handler(ctx('Developer'), { session: 'Architect', text: 'TOP-SECRET-CONTENT' });
        expect(h.logs.join('\n')).not.toContain('TOP-SECRET-CONTENT');
    });
});

describe('jarvis_receiveMessage (REQ_COM_CAPABILITY AC-2, AC-3)', () => {
    it('returns the oldest waiting message of the calling Actor with sender and time, and the number still waiting', async () => {
        const h = harness();
        await toolOf(h, TOOL_SEND).handler(ctx('Developer'), { session: 'Architect', text: 'one' });
        await toolOf(h, TOOL_SEND).handler(ctx('Developer'), { session: 'Architect', text: 'two' });
        const r = await toolOf(h, TOOL_RECEIVE).handler(ctx('Architect'), {});
        expect(JSON.parse(r.text)).toEqual({ message: { sender: 'Developer', text: 'one', timestamp: 't0' }, remaining: 1 });
        expect(JSON.parse((await toolOf(h, TOOL_RECEIVE).handler(ctx('Architect'), {})).text).remaining).toBe(0);
        expect(JSON.parse((await toolOf(h, TOOL_RECEIVE).handler(ctx('Architect'), {})).text)).toEqual({ message: null, remaining: 0 });
    });

    it('reads only the inbox of the calling Actor, whatever the input says', async () => {
        const h = harness();
        await toolOf(h, TOOL_SEND).handler(ctx('Developer'), { session: 'Architect', text: 'for the Architect' });
        const r = await toolOf(h, TOOL_RECEIVE).handler(ctx('Developer'), { destination: 'Architect', session: 'Architect', actor: 'Architect' });
        expect(JSON.parse(r.text)).toEqual({ message: null, remaining: 0 });
        expect(h.inbox).toHaveLength(1);
    });

    it('fails for a chat that is no Actor chat', async () => {
        expect((await toolOf(harness(), TOOL_RECEIVE).handler(ctx('Someone'), {})).isError).toBe(true);
    });
});

describe('jarvis_listActors and jarvis_createActorSession', () => {
    it('lists the Actors with name and summary', async () => {
        const r = await toolOf(harness(['A', 'B']), TOOL_FIND).handler(ctx('Anything'), {});
        expect(JSON.parse(r.text)).toEqual({ actors: [{ name: 'A', summary: 'A summary' }, { name: 'B', summary: 'B summary' }] });
    });

    it('finds or creates the chat of a known Actor and returns its session address', async () => {
        const h = harness();
        const r = await toolOf(h, TOOL_CREATE_SESSION).handler(ctx('Developer'), { actor: 'Architect' });
        expect(JSON.parse(r.text)).toEqual({ actor: 'Architect', session: 'copilotcli:/Architect' });
        expect(h.chats).toEqual(['Architect']);
    });

    it('refuses an unknown or ambiguous Actor without creating a chat', async () => {
        const h = harness();
        expect((await toolOf(h, TOOL_CREATE_SESSION).handler(ctx('Developer'), { actor: 'Nobody' })).text).toContain('Valid Actors');
        expect((await toolOf(h, TOOL_CREATE_SESSION).handler(ctx('Developer'), { actor: 'Twin' })).text).toContain('ambiguous');
        expect((await toolOf(h, TOOL_CREATE_SESSION).handler(ctx('Developer'), {})).isError).toBe(true);
        expect(h.chats).toEqual([]);
    });
});

describe('SPEC_COM_INBOX: the announcer', () => {
    function inbox(...msgs: Partial<InboxMessage>[]) {
        const queue: InboxMessage[] = msgs.map((m, i) => ({ destination: 'Dev', sender: 'Arch', text: `m${i}`, timestamp: `t${i}`, ...m }));
        const announced: { name: string; count: number }[] = [];
        const logs: string[] = [];
        let fail = false;
        let delay = 0;
        const announcer = createAnnouncer({
            readQueue: () => queue.map(m => ({ ...m })),
            writeQueue: next => { queue.splice(0, queue.length, ...next); },
            autoDelivery: () => ['Dev'],
            announce: async (name, count) => { if (delay) { await new Promise(r => setTimeout(r, delay)); } if (fail) { throw new Error('host down'); } announced.push({ name, count }); },
            changed: () => undefined,
            log: (_s, t) => logs.push(t),
        });
        return { queue, announced, logs, announcer, failNext: () => { fail = true; }, slow: (ms: number) => { delay = ms; } };
    }

    it('announces the number of waiting, not yet announced messages to an Actor with automatic delivery, then marks them', async () => {
        const t = inbox({}, {}, { notified: true }, { destination: 'Other' });
        await t.announcer.runAuto();
        expect(t.announced).toEqual([{ name: 'Dev', count: 2 }]);
        expect(t.queue.filter(m => m.destination === 'Dev').every(m => m.notified)).toBe(true);
        expect(t.queue.find(m => m.destination === 'Other')?.notified).toBeUndefined();
        await t.announcer.runAuto();
        expect(t.announced).toHaveLength(1);
    });

    it('marks nothing when the announcement fails, and tries again on the next pass (REQ_COM_NOTIFY)', async () => {
        const t = inbox({});
        t.failNext();
        await t.announcer.runAuto();
        expect(t.queue[0].notified).toBeUndefined();
        expect(t.logs.some(l => l.includes('delivery failed for "Dev": host down'))).toBe(true);
    });

    it('the play action counts all waiting messages, also the announced ones, and rejects on failure', async () => {
        const t = inbox({ notified: true }, {});
        expect(await t.announcer.deliver('Dev')).toBe(2);
        expect(t.announced).toEqual([{ name: 'Dev', count: 2 }]);
        t.failNext();
        await expect(t.announcer.deliver('Dev')).rejects.toThrow('host down');
        expect(await inbox().announcer.deliver('Dev')).toBe(0);
    });

    it('marks only the messages it counted: a message that arrives meanwhile is announced on the next pass', async () => {
        const t = inbox({});
        t.slow(60);
        const run = t.announcer.runAuto();
        await new Promise(r => setTimeout(r, 15));
        t.queue.push({ destination: 'Dev', sender: 'Arch', text: 'late', timestamp: 'tl' });
        await run;
        expect(t.queue.map(m => m.notified)).toEqual([true, undefined]);
        await t.announcer.runAuto();
        expect(t.announced.map(a => a.count)).toEqual([1, 1]);
    });

    it('runs deliveries one after the other', async () => {
        const t = inbox({});
        t.slow(40);
        const started: number[] = [];
        const a = t.announcer.deliver('Dev').then(() => started.push(1));
        const b = t.announcer.deliver('Dev').then(() => started.push(2));
        await Promise.all([a, b]);
        expect(started).toEqual([1, 2]);
        expect(t.announced).toHaveLength(2);
    });
});
