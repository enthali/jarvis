// REQ_COM_CAPABILITY AC-1/AC-5, REQ_COM_OPEN AC-1/AC-3/AC-6/AC-7, REQ_ACTOR_BINDING AC-1, US_COM_SENDER, SPEC_COM_TOOLS (Names), SPEC_COM_OPEN.
// Black-box repository checks: removed interfaces stay removed, required ones stay contributed, shipped instructions use the new inputs.
import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { ActorScanner } from '../../packages/core/src/engine/actors/actorScanner';
import { ensureActorAgent } from '../../packages/core/src/engine/actors/actorAgent';
import { createActorHandler } from '../../packages/core/src/engine/actors/actorRuntime';
import { createActorMessageTools } from '../../packages/core/src/engine/sessions/actorMessageTools';
import { SessionState } from '../../packages/core/src/engine/ahp/sessionState';

const cleanups: (() => void)[] = [];
afterEach(() => {
    for (const c of cleanups.splice(0).reverse()) { c(); }
});

const ROOT = path.resolve(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const manifest = (pkg: string) => JSON.parse(read(`packages/${pkg}/package.json`));

const PACKAGES = ['core', 'kanban', 'pim', 'syspilot', 'recorder', 'mcp', 'flow'];
const contributedToolNames = () =>
    PACKAGES.flatMap(p => (manifest(p).contributes?.languageModelTools ?? []).map((t: { name: string }) => t.name));
const contributedCommands = (pkg: string): string[] =>
    (manifest(pkg).contributes?.commands ?? []).map((c: { command: string }) => c.command);
const settingKeys = (pkg: string): string[] =>
    [].concat(manifest(pkg).contributes?.configuration ?? []).flatMap((c: { properties?: object }) => Object.keys(c.properties ?? {}));

// SPEC_COM_TOOLS Names: the four message tools belong to the Jarvis AHP client, one publisher per window.
const AGENT_HOST_TOOLS = ['jarvis_sendMessage', 'jarvis_receiveMessage', 'jarvis_listActors', 'jarvis_createActorSession'];
// Step 3 removed these; a contributed entry would offer an Actor a tool that no longer works.
const REMOVED_TOOLS = ['jarvis_readMessage', 'jarvis_sendToSession', 'jarvis_listChatSessions', 'jarvis_injectPrompt'];

describe('SPEC_COM_TOOLS Names: the message tools have one publisher', () => {
    it('no package manifest contributes a message tool of the Agent Host client', () => {
        const contributed = contributedToolNames();
        for (const name of AGENT_HOST_TOOLS) { expect(contributed, name).not.toContain(name); }
    });

    it('no package manifest contributes a removed tool', () => {
        const contributed = contributedToolNames();
        for (const name of REMOVED_TOOLS) { expect(contributed, name).not.toContain(name); }
    });
});

describe('REQ_COM_OPEN: the only ways to show an Actor chat', () => {
    it('AC-1/AC-3/AC-7: core contributes the Actor-tree open and the Messages-group open commands', () => {
        const commands = contributedCommands('core');
        expect(commands).toContain('jarvis.openActorSession');
        expect(commands).toContain('jarvis.openMessageActorChat');
    });

    it('AC-5: the old chat UI open and inject commands are not contributed by any package', () => {
        for (const pkg of PACKAGES) {
            const commands = contributedCommands(pkg);
            expect(commands, pkg).not.toContain('jarvis.openMessageSession');
            expect(commands, pkg).not.toContain('jarvis.injectPrompt');
        }
    });

    it('AC-6: jarvis.actors.openSessionOnCreate stays a boolean setting', () => {
        const props = [].concat(manifest('core').contributes.configuration).reduce(
            (all: Record<string, { type?: string }>, c: { properties?: Record<string, { type?: string }> }) => ({ ...all, ...(c.properties ?? {}) }), {});
        expect(props['jarvis.actors.openSessionOnCreate']?.type).toBe('boolean');
    });

    it('the removed notification template setting is not contributed (the announcement is a fixed text)', () => {
        for (const pkg of PACKAGES) {
            expect(settingKeys(pkg), pkg).not.toContain('jarvis.messages.notificationTemplate');
        }
    });
});

describe('US_COM_SENDER / REQ_COM_CAPABILITY AC-5: the bundled Actor instruction uses the new tool inputs', () => {
    // The copy in .github/instructions is provisioned from this asset and git-ignored, so only the asset is checked.
    const file = 'packages/core/assets/instructions/jarvis-actor.kernel.instructions.md';

    it('names the send and receive tools and none of the removed inputs or tools', () => {
        const text = read(file);
        expect(text).toMatch(/jarvis_sendMessage/);
        expect(text).toMatch(/jarvis_receiveMessage/);
        // The sender and the inbox come from the calling chat, so neither is a parameter any more.
        expect(text).not.toMatch(/senderSession/);
        expect(text).not.toMatch(/\bdestination\b/);
        for (const name of REMOVED_TOOLS) { expect(text, name).not.toContain(name); }
    });
});

describe('REQ_ACTOR_BINDING AC-1: existing actor.yaml and context.md are never changed by Jarvis functions or session lifecycle', () => {
    it('scanning, agent provisioning, duplicate creation attempts, message tools and session close/restart leave existing actor.yaml and context.md untouched', async () => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-actor-binding-'));
        const prevFolders = (vscode.workspace as any).workspaceFolders;
        cleanups.push(() => {
            (vscode.workspace as any).workspaceFolders = prevFolders;
            fs.rmSync(tmp, { recursive: true, force: true });
        });
        (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: tmp } }];

        const actorsDir = path.join(tmp, '.jarvis', 'actors');
        const actorFolder = path.join(actorsDir, 'Keeper');
        fs.mkdirSync(actorFolder, { recursive: true });
        const yamlPath = path.join(actorFolder, 'actor.yaml');
        const contextPath = path.join(actorFolder, 'context.md');
        const yamlContent = 'name: "Keeper"\nsummary: "Custom summary"\n';
        const contextContent = '# Keeper\n\n## Decisions\n- Authoritative Actor-written memory line.\n';
        fs.writeFileSync(yamlPath, yamlContent, 'utf8');
        fs.writeFileSync(contextPath, contextContent, 'utf8');

        const scanner = new ActorScanner(() => actorsDir, () => {});
        await scanner.rescan();
        await ensureActorAgent({ name: 'Keeper', folder: actorFolder, summary: 'Custom summary' });

        // Duplicate creation attempt via createActorHandler must not touch existing files.
        const handler = createActorHandler({
            resolveActorsFolder: () => actorsDir,
            appendMessage: () => {},
            reloadMessages: () => {},
            actorScanner: scanner,
            openActorSession: async () => {},
            openSessionOnCreate: () => false,
            log: { info: () => {}, warn: () => {} },
        });
        const res = await handler({ input: { name: 'Keeper', summary: 'Attempted overwrite' }, toolInvocationToken: undefined as any }, undefined as any);
        const parsed = JSON.parse((res.content[0] as vscode.LanguageModelTextPart).value);
        expect(parsed.created).toBe(false);

        // Message tool invocations and session close/restart events.
        const tools = createActorMessageTools({
            actors: () => scanner.actors.map(a => ({ name: a.name, summary: a.summary })),
            lookup: name => {
                const r = scanner.resolveName(name);
                return r.status === 'found' ? { status: 'found', name: r.actor.name } : { status: 'unknown' };
            },
            appendMessage: () => {},
            popMessage: () => ({ message: null, remaining: 0 }),
            ensureChat: async name => `copilotcli:/${name}`,
            changed: () => {},
            log: () => {},
        });
        const ctx = { session: 'copilotcli:/Keeper', title: 'Keeper', chat: 'ahp-chat:/1' };
        for (const t of tools) {
            await t.handler(ctx, { session: 'Keeper', text: 'hi', actor: 'Keeper' });
        }
        const state = new SessionState();
        state.begin();
        state.finish([{ resource: 'copilotcli:/Keeper', title: 'Keeper', status: 8 }]);
        state.notify('root/sessionRemoved', { session: 'copilotcli:/Keeper' });
        state.clear();

        expect(fs.readFileSync(yamlPath, 'utf8')).toBe(yamlContent);
        expect(fs.readFileSync(contextPath, 'utf8')).toBe(contextContent);
        expect(fs.readdirSync(actorFolder).sort()).toEqual(['actor.yaml', 'context.md']);
    });
});


