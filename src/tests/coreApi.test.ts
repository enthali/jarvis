/**
 * JarvisEngine (SPEC_ENG_API) unit tests — Actor-only core API contract.
 *
 * Covers: registerTool namespacing/uniqueness, listActors projection,
 * heartbeat job delegation, tool registry introspection/invocation,
 * cross-actor sendMessage, dispose. Also asserts the legacy kind-machinery
 * surface (registerEntityKind/registerDecorator/refreshKind) is gone
 * (REQ_ENG_CONTRACT, retire-legacy-actor-kinds).
 */
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { JarvisEngine } from '../../packages/core/src/engine/core/coreApi';
import { ActorScanner } from '../../packages/core/src/engine/actors/actorScanner';

function makeEngine(actors: { name: string; summary: string; agent: string; folder: string; id: string }[] = []) {
    const scanner = new ActorScanner(() => '', () => {});
    // @ts-expect-error — poke the private cache directly; no filesystem needed for these tests
    scanner['_actors'] = actors;
    return { engine: new JarvisEngine(scanner), scanner };
}

describe('SPEC_ENG_API: JarvisEngine.registerTool', () => {
    it('requires the jarvis_ prefix', () => {
        const { engine } = makeEngine();
        expect(() => engine.registerTool('bad_name', 'desc', async () => new vscode.LanguageModelToolResult([])))
            .toThrow(/must start with 'jarvis_'/);
    });

    it('rejects a duplicate registration', () => {
        const { engine } = makeEngine();
        engine.registerTool('jarvis_test', 'desc', async () => new vscode.LanguageModelToolResult([]));
        expect(() => engine.registerTool('jarvis_test', 'desc', async () => new vscode.LanguageModelToolResult([])))
            .toThrow(/already registered/);
    });

    it('dispose() removes the tool, allowing re-registration', () => {
        const { engine } = makeEngine();
        const disposable = engine.registerTool('jarvis_test', 'desc', async () => new vscode.LanguageModelToolResult([]));
        disposable.dispose();
        expect(() => engine.registerTool('jarvis_test', 'desc', async () => new vscode.LanguageModelToolResult([])))
            .not.toThrow();
    });
});

describe('SPEC_ENG_ACTORLIST: JarvisEngine.listActors', () => {
    it('projects the Actor scanner cache to the public shape', () => {
        const actor = { name: 'A', summary: 'S', agent: 'Ag', folder: '/f', id: '/f/actor.yaml' };
        const { engine } = makeEngine([actor]);
        expect(engine.listActors()).toEqual([actor]);
    });
});

describe('SPEC_ENG_HEARTBEAT_JOBAPI: JarvisEngine job delegation', () => {
    it('throws when no scheduler is wired', async () => {
        const { engine } = makeEngine();
        await expect(engine.registerJob({ name: 'j', schedule: '* * * * *', steps: [] })).rejects.toThrow(/scheduler is not available/);
        await expect(engine.unregisterJob('j')).rejects.toThrow(/scheduler is not available/);
        expect(engine.listJobs()).toEqual([]);
    });

    it('delegates to the wired scheduler', async () => {
        const { engine } = makeEngine();
        const scheduler = {
            registerJob: vi.fn(async () => {}),
            unregisterJob: vi.fn(async () => {}),
            currentJobs: [{ name: 'j', schedule: '* * * * *', steps: [] }],
        };
        // @ts-expect-error — minimal scheduler shape sufficient for delegation
        engine.setScheduler(scheduler);
        await engine.registerJob({ name: 'j', schedule: '* * * * *', steps: [] });
        await engine.unregisterJob('j');
        expect(scheduler.registerJob).toHaveBeenCalledOnce();
        expect(scheduler.unregisterJob).toHaveBeenCalledWith('j');
        expect(engine.listJobs()).toEqual(scheduler.currentJobs);
    });
});

describe('SPEC_ENG_TOOLREGISTRY: JarvisEngine tool introspection/invocation', () => {
    it('lists registered tools and invokes by name', async () => {
        const { engine } = makeEngine();
        const handler = vi.fn(async () => new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart('ok')]));
        engine.registerTool('jarvis_test', 'desc', handler);

        expect(engine.getRegisteredTools()).toEqual([{ name: 'jarvis_test', description: 'desc' }]);

        const result = await engine.invokeTool('jarvis_test', {} as vscode.LanguageModelToolInvocationOptions<unknown>, {} as vscode.CancellationToken);
        expect(handler).toHaveBeenCalledOnce();
        expect((result.content[0] as vscode.LanguageModelTextPart).value).toBe('ok');
    });

    it('throws for an unregistered tool name', () => {
        const { engine } = makeEngine();
        expect(() => engine.invokeTool('jarvis_missing', {} as vscode.LanguageModelToolInvocationOptions<unknown>, {} as vscode.CancellationToken))
            .toThrow(/not registered/);
    });
});

describe('SPEC_SPL_NOTIFY / SPEC_ENG_API AC-8: JarvisEngine.sendMessage', () => {
    it('throws when messaging is not wired', () => {
        const { engine } = makeEngine();
        expect(() => engine.sendMessage('dest', 'sender', 'text')).toThrow(/Messaging is not available/);
    });

    it('refuses an ambiguous destination with an error notification, without queuing (finding 5)', () => {
        const actor = { name: 'S', summary: '', agent: '', folder: '/f', id: '/f/actor.yaml' };
        const dup = { name: 'S', summary: '', agent: '', folder: '/g', id: '/g/actor.yaml' };
        const { engine } = makeEngine([actor, dup]);
        const queuePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-sendmsg-')), 'messages.json');
        engine.setMessaging(() => queuePath, () => {});

        expect(() => engine.sendMessage('S', 'sender', 'text')).toThrow(/ambiguous/);
        expect(fs.existsSync(queuePath)).toBe(false);
    });

    it('queues a message for an unknown destination unchanged (module senders pre-provision)', () => {
        const { engine } = makeEngine();
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-sendmsg-'));
        const queuePath = path.join(dir, 'messages.json');
        const onQueued = vi.fn();
        engine.setMessaging(() => queuePath, onQueued);

        expect(() => engine.sendMessage('No Such Actor', 'jarvis-syspilot', 'text')).not.toThrow();
        expect(onQueued).toHaveBeenCalledOnce();
        expect(fs.existsSync(queuePath)).toBe(true);
    });

    it('does not validate the sender name (skipped for module-internal senders)', () => {
        const actor = { name: 'S', summary: '', agent: '', folder: '/f', id: '/f/actor.yaml' };
        const { engine } = makeEngine([actor]);
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-sendmsg-'));
        const queuePath = path.join(dir, 'messages.json');
        engine.setMessaging(() => queuePath, () => {});

        expect(() => engine.sendMessage('S', 'jarvis-syspilot', 'text')).not.toThrow();
    });
});

describe('REQ_ENG_CONTRACT: legacy kind machinery is absent (retire-legacy-actor-kinds)', () => {
    it('has no registerEntityKind, registerDecorator, or refreshKind members', () => {
        const { engine } = makeEngine();
        expect((engine as unknown as Record<string, unknown>).registerEntityKind).toBeUndefined();
        expect((engine as unknown as Record<string, unknown>).registerDecorator).toBeUndefined();
        expect((engine as unknown as Record<string, unknown>).refreshKind).toBeUndefined();
        expect((engine as unknown as Record<string, unknown>).listJarvisSessions).toBeUndefined();
    });

    it('version is 2', () => {
        const { engine } = makeEngine();
        expect(engine.version).toBe(2);
    });
});

describe('SPEC_ACTOR_SCANNER: JarvisEngine.dispose() cascades to actorScanner.dispose() (finding 9)', () => {
    it('stops the scanner-owned rescan timer on dispose', () => {
        const { engine, scanner } = makeEngine();
        const disposeSpy = vi.spyOn(scanner, 'dispose');
        engine.dispose();
        expect(disposeSpy).toHaveBeenCalledOnce();
    });

    it('the timer set by startTimer no longer fires after engine.dispose()', () => {
        vi.useFakeTimers();
        try {
            const { engine, scanner } = makeEngine();
            const rescanSpy = vi.spyOn(scanner, 'rescan').mockResolvedValue(undefined);
            scanner.startTimer(1);
            engine.dispose();
            vi.advanceTimersByTime(5 * 60_000);
            expect(rescanSpy).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });
});
