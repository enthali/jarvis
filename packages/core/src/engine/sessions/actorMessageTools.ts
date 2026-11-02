// Implementation: SPEC_COM_TOOLS
// Requirements: REQ_COM_CAPABILITY, US_COM_SENDER, US_COM_FIND
// No `vscode` import: the handlers run in the extension host but everything they reach arrives as arguments.
//
// The four message tools the Jarvis AHP client publishes to the chats of the Actors. The sender and the
// inbox of a call are the Actor of the calling chat, taken from the session title that the client read from
// the envelope of the call; no tool takes either from its input.

import type { AhpToolSpec, ToolCallContext, ToolResult } from '../ahp';

export type ActorLookupResult =
    | { status: 'found'; name: string }
    | { status: 'unknown' }
    | { status: 'ambiguous'; message: string };

export interface ActorMessageToolDeps {
    actors(): { name: string; summary: string }[];
    lookup(name: string): ActorLookupResult;
    appendMessage(destination: string, sender: string, text: string): void;
    popMessage(destination: string): { message: { sender: string; text: string; timestamp: string } | null; remaining: number };
    /** Finds or creates the chat of an Actor and returns its session address. */
    ensureChat(actorName: string): Promise<string>;
    /** The inbox changed: the Messages view reads it again. */
    changed(): void;
    log(text: string): void;
}

export const TOOL_CREATE_SESSION = 'jarvis_createActorSession';
export const TOOL_SEND = 'jarvis_sendMessage';
export const TOOL_RECEIVE = 'jarvis_receiveMessage';
export const TOOL_FIND = 'jarvis_listActors';

const fail = (text: string): ToolResult => ({ text, isError: true });
const ok = (text: string): ToolResult => ({ text });

function textInput(input: Record<string, unknown>, key: string): string | undefined {
    const v = input[key];
    return typeof v === 'string' && v.trim() !== '' ? v : undefined;
}

export function createActorMessageTools(deps: ActorMessageToolDeps): AhpToolSpec[] {
    const sortedNames = (): string => {
        const names = deps.actors().map(a => a.name).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        return names.length > 0 ? names.join(', ') : '(none)';
    };

    /** The Actor whose name equals the title of the calling session (SPEC_COM_BINDING). */
    const callerActor = (ctx: ToolCallContext): { name: string } | ToolResult => {
        const found = deps.lookup(ctx.title);
        if (found.status === 'found') { return { name: found.name }; }
        if (found.status === 'ambiguous') { return fail(found.message); }
        return fail('This chat is not the chat of an Actor, so it cannot use the message tools.');
    };
    const isResult = (v: { name: string } | ToolResult): v is ToolResult => 'text' in v;

    return [
        {
            name: TOOL_SEND,
            title: 'Send Message to Actor',
            description: 'jarvis_core: Sends a text message to another Actor. The sender is the Actor of this chat. Fails with the list of valid Actor names when the Actor does not exist.',
            inputSchema: {
                type: 'object',
                required: ['session', 'text'],
                properties: {
                    session: { type: 'string', description: 'The exact name of the receiving Actor.' },
                    text: { type: 'string', description: 'The message text.' },
                },
            },
            handler: async (ctx, input) => {
                const caller = callerActor(ctx);
                if (isResult(caller)) { return caller; }
                const to = textInput(input, 'session');
                const text = textInput(input, 'text');
                if (!to || !text) { return fail('"session" and "text" are required.'); }
                const dest = deps.lookup(to);
                if (dest.status === 'ambiguous') { return fail(dest.message); }
                if (dest.status === 'unknown') { return fail(`Actor "${to}" does not exist.\nValid Actors: ${sortedNames()}`); }
                deps.appendMessage(dest.name, caller.name, text);
                deps.changed();
                deps.log(`sendMessage: "${caller.name}" to "${dest.name}"`);
                return ok(`Message queued for "${dest.name}" from "${caller.name}".`);
            },
        },
        {
            name: TOOL_RECEIVE,
            title: 'Receive Message from Inbox',
            description: 'jarvis_core: Returns and removes the oldest message waiting for the Actor of this chat, with sender and time, and the number of messages still waiting. Call it until remaining is 0.',
            inputSchema: { type: 'object', properties: {} },
            handler: async ctx => {
                const caller = callerActor(ctx);
                if (isResult(caller)) { return caller; }
                const got = deps.popMessage(caller.name);
                deps.changed();
                deps.log(`receiveMessage: "${caller.name}", remaining=${got.remaining}`);
                return ok(JSON.stringify(got.message
                    ? { message: { sender: got.message.sender, text: got.message.text, timestamp: got.message.timestamp }, remaining: got.remaining }
                    : { message: null, remaining: 0 }));
            },
        },
        {
            name: TOOL_FIND,
            title: 'Find Actors',
            description: 'jarvis_core: Returns the Actors of this workspace with name and short description.',
            inputSchema: { type: 'object', properties: {} },
            handler: async () => ok(JSON.stringify({ actors: deps.actors().map(a => ({ name: a.name, summary: a.summary })) })),
        },
        {
            name: TOOL_CREATE_SESSION,
            title: 'Create Actor Chat',
            description: 'jarvis_core: Finds the chat of an Actor, or creates it, and returns its session address.',
            inputSchema: {
                type: 'object',
                required: ['actor'],
                properties: { actor: { type: 'string', description: 'The exact name of the Actor.' } },
            },
            handler: async (_ctx, input) => {
                const name = textInput(input, 'actor');
                if (!name) { return fail('"actor" is required.'); }
                const found = deps.lookup(name);
                if (found.status === 'ambiguous') { return fail(found.message); }
                if (found.status === 'unknown') { return fail(`Actor "${name}" does not exist.\nValid Actors: ${sortedNames()}`); }
                const session = await deps.ensureChat(found.name);
                return ok(JSON.stringify({ actor: found.name, session }));
            },
        },
    ];
}
