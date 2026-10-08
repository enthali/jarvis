import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type * as vscode from 'vscode';
import * as vscodeMock from 'vscode';
import { LanguageModelTextPart } from './__mocks__/vscode';
import { ActorScanner } from '../../packages/core/src/engine/actors/actorScanner';
import { getValidDestinations, combineValidDestinations } from '../../packages/core/src/engine/sessions/sessionLookup';
import { createListActorsHandler, createActorHandler } from '../../packages/core/src/engine/actors/actorRuntime';

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

describe('SPEC_ACTOR_LISTTOOL: createListActorsHandler', () => {
    it('returns actors with name, summary, agent, folder, id — direct children only', async () => {
        const root = makeRoot();
        writeActor(root, 'Direct Folder', 'Direct Actor');
        writeActor(root, 'archive/Nested Folder', 'Nested Actor');
        const actorScanner = new ActorScanner(() => root, () => {});
        await actorScanner.rescan();

        const log = { info: vi.fn() };
        const handler = createListActorsHandler(actorScanner, log);
        const result = await handler(
            {} as vscode.LanguageModelToolInvocationOptions<unknown>,
            {} as vscode.CancellationToken,
        );
        const payload = JSON.parse((result.content[0] as LanguageModelTextPart).value);

        expect(payload.actors).toEqual([
            {
                name: 'Direct Actor',
                summary: '',
                agent: 'Direct Actor',
                folder: path.join(root, 'Direct Folder'),
                id: path.join(root, 'Direct Folder', 'actor.yaml'),
            },
        ]);
        expect(log.info).toHaveBeenCalledWith('[ACTOR] listActors: 1 Actor(s)');
    });
});

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
            { input: { name: 'Existing Actor' } } as vscode.LanguageModelToolInvocationOptions<unknown>,
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
            { input: { name: 'Quiet Actor' } } as vscode.LanguageModelToolInvocationOptions<unknown>,
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
            { input: { name: 'Odd Agent Actor', agent: 'nonexistent' } } as vscode.LanguageModelToolInvocationOptions<unknown>,
            {} as vscode.CancellationToken,
        );

        const payload = JSON.parse((result.content[0] as LanguageModelTextPart).value);
        expect(payload.created).toBe(true);
        const yaml = fs.readFileSync(path.join(root, 'Odd Agent Actor', 'actor.yaml'), 'utf8');
        expect(yaml).not.toContain('agent:');
    }, 10_000);
});
