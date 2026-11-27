import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type * as vscode from 'vscode';
import * as vscodeMock from 'vscode';
import { LanguageModelTextPart } from './__mocks__/vscode';
import { ActorScanner } from '../../packages/core/src/engine/actors/actorScanner';
import { getValidDestinations, combineValidDestinations } from '../../packages/core/src/engine/sessions/sessionLookup';
import { createActorHandler } from '../../packages/core/src/engine/actors/actorRuntime';

const roots: string[] = [];

afterEach(() => {
    for (const root of roots.splice(0)) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

function makeRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-actor-runtime-'));
    roots.push(root);
    return root;
}

function writeActor(root: string, relativeFolder: string, name: string): void {
    const folder = path.join(root, relativeFolder);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'actor.yaml'), `name: ${name}\n`);
}

describe('REQ_AUT_HEARTBEAT_RESOLVER_REUSE AC-3: Actor-only destination validation', () => {
    it('lists every unambiguous Actor name and excludes duplicates', async () => {
        const root = makeRoot();
        writeActor(root, 'One', 'Solo Actor');
        writeActor(root, 'Two', 'Shared Actor');
        writeActor(root, 'Three', 'Shared Actor');
        const actorScanner = new ActorScanner(() => root, () => {});
        await actorScanner.rescan();

        const destinations = getValidDestinations(actorScanner);

        expect(destinations).toContain('Solo Actor');
        expect(destinations).not.toContain('Shared Actor');
    });

    it('combineValidDestinations is the same implementation as getValidDestinations', async () => {
        const root = makeRoot();
        writeActor(root, 'One', 'Solo Actor');
        const actorScanner = new ActorScanner(() => root, () => {});
        await actorScanner.rescan();

        expect(combineValidDestinations(actorScanner)).toEqual(getValidDestinations(actorScanner));
    });
});

describe('SPEC_ACTOR_CREATETOOL: createActorHandler', () => {
    function makeDeps(root: string, overrides: Partial<Parameters<typeof createActorHandler>[0]> = {}) {
        const actorScanner = new ActorScanner(() => root, () => {});
        return {
            deps: {
                resolveActorsFolder: () => root,
                appendMessage: vi.fn(),
                reloadMessages: vi.fn(),
                actorScanner,
                openActorSession: vi.fn(async () => {}),
                openSessionOnCreate: () => true,
                listModels: vi.fn(async () => [{ vendor: 'copilot', model: 'gpt-x' }]),
                log: { info: vi.fn(), warn: vi.fn() },
                ...overrides,
            },
            actorScanner,
        };
    }

    it('creates actor.yaml and context.md, rescans, and opens the session', async () => {
        const root = makeRoot();
        (vscodeMock.workspace as any).workspaceFolders = [{ uri: { fsPath: root } }];
        const { deps, actorScanner } = makeDeps(root);
        const handler = createActorHandler(deps);

        const result = await handler(
            { input: { name: 'New Actor', summary: 'A summary' } } as vscode.LanguageModelToolInvocationOptions<unknown>,
            {} as vscode.CancellationToken,
        );
        const payload = JSON.parse((result.content[0] as LanguageModelTextPart).value);

        // REQ_ACTOR_CREATETOOL AC-2: path is workspace-relative, forward slashes.
        expect(payload).toEqual({ created: true, path: 'New Actor' });
        expect(fs.existsSync(path.join(root, 'New Actor', 'actor.yaml'))).toBe(true);
        expect(fs.existsSync(path.join(root, 'New Actor', 'context.md'))).toBe(true);
        expect(actorScanner.actors.map(a => a.name)).toContain('New Actor');
        expect(deps.openActorSession).toHaveBeenCalledWith('New Actor');
    }, 10_000);

    it('is idempotent: an existing folder yields created:false and no session open', async () => {
        const root = makeRoot();
        (vscodeMock.workspace as any).workspaceFolders = [{ uri: { fsPath: root } }];
        writeActor(root, 'Existing Actor', 'Existing Actor');
        const { deps } = makeDeps(root);
        const handler = createActorHandler(deps);

        const result = await handler(
            { input: { name: 'Existing Actor', summary: 'S' } } as vscode.LanguageModelToolInvocationOptions<unknown>,
            {} as vscode.CancellationToken,
        );
        const payload = JSON.parse((result.content[0] as LanguageModelTextPart).value);

        // REQ_ACTOR_CREATETOOL AC-7: path is workspace-relative, forward slashes.
        expect(payload).toEqual({
            created: false,
            reason: 'actor "Existing Actor" already exists; no action taken',
            path: 'Existing Actor',
        });
        expect(deps.openActorSession).not.toHaveBeenCalled();
    });

    it('refuses a blank summary and an unlisted model before writing anything, and queries no catalog without a model', async () => {
        const root = makeRoot();
        (vscodeMock.workspace as any).workspaceFolders = [{ uri: { fsPath: root } }];
        const { deps } = makeDeps(root);
        const handler = createActorHandler(deps);
        const call = (input: object) => handler({ input } as vscode.LanguageModelToolInvocationOptions<unknown>, {} as vscode.CancellationToken);

        await expect(call({ name: 'A1', summary: '   ' })).rejects.toThrow(/invalid actor summary:/);
        await expect(call({ name: 'A1', summary: 'S', model: 'nope' })).rejects.toThrow(/model not available: "nope"/);
        expect(fs.existsSync(path.join(root, 'A1'))).toBe(false);
        expect(deps.appendMessage).not.toHaveBeenCalled();

        await call({ name: 'A2', summary: 'S' });
        expect(deps.listModels).toHaveBeenCalledTimes(1);

        const failing = makeDeps(root, { listModels: async () => { throw new Error('boom'); } });
        await expect(createActorHandler(failing.deps)({ input: { name: 'A3', summary: 'S', model: 'gpt-x' } } as vscode.LanguageModelToolInvocationOptions<unknown>, {} as vscode.CancellationToken))
            .rejects.toThrow(/model catalog not available/);
        expect(fs.existsSync(path.join(root, 'A3'))).toBe(false);
    }, 10_000);

    it('rejects an invalid actor name', async () => {
        const root = makeRoot();
        const { deps } = makeDeps(root);
        const handler = createActorHandler(deps);

        await expect(handler(
            { input: { name: 'bad/name' } } as vscode.LanguageModelToolInvocationOptions<unknown>,
            {} as vscode.CancellationToken,
        )).rejects.toThrow(/invalid actor name/);
    });

    it('does not open a session when openSessionOnCreate is false', async () => {
        const root = makeRoot();
        (vscodeMock.workspace as any).workspaceFolders = [{ uri: { fsPath: root } }];
        const { deps } = makeDeps(root, { openSessionOnCreate: () => false });
        const handler = createActorHandler(deps);

        await handler(
            { input: { name: 'Quiet Actor', summary: 'S' } } as vscode.LanguageModelToolInvocationOptions<unknown>,
            {} as vscode.CancellationToken,
        );

        expect(deps.openActorSession).not.toHaveBeenCalled();
    }, 10_000);

    it('an agent input is ignored: it is neither validated nor written (SPEC_ACTOR_CREATETOOL AC-5)', async () => {
        const root = makeRoot();
        (vscodeMock.workspace as any).workspaceFolders = [{ uri: { fsPath: root } }];
        const { deps } = makeDeps(root);
        const handler = createActorHandler(deps);

        const result = await handler(
            { input: { name: 'Odd Agent Actor', summary: 'S', agent: 'nonexistent' } } as vscode.LanguageModelToolInvocationOptions<unknown>,
            {} as vscode.CancellationToken,
        );

        const payload = JSON.parse((result.content[0] as LanguageModelTextPart).value);
        expect(payload.created).toBe(true);
        const yaml = fs.readFileSync(path.join(root, 'Odd Agent Actor', 'actor.yaml'), 'utf8');
        expect(yaml).not.toContain('agent:');
    }, 10_000);
});
