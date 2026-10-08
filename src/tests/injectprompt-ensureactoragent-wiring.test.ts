/**
 * Behavioural tests for SPEC_INJ_INJECT step 1b (REQ_ACTOR_INITPROMPT AC-6):
 * `ensureActorAgent` runs after Actor-name resolution and before the session
 * lookup; a `ready` result sets the mode in both the existing-session and
 * new-session branches, a `skipped` result sets none.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscodeMock from 'vscode';

vi.mock('../../packages/core/src/engine/sessions/sessionLookup', () => ({
    lookupSessionUUID: vi.fn(),
}));
vi.mock('../../packages/core/src/engine/actors/actorAgent', () => ({
    ensureActorAgent: vi.fn(),
}));

import { lookupSessionUUID } from '../../packages/core/src/engine/sessions/sessionLookup';
import { ensureActorAgent } from '../../packages/core/src/engine/actors/actorAgent';
import { injectPrompt, initInjectPrompt } from '../../packages/core/src/engine/sessions/injectPrompt';
import { ActorScanner } from '../../packages/core/src/engine/actors/actorScanner';

const roots: string[] = [];

afterEach(() => {
    for (const root of roots.splice(0)) {
        fs.rmSync(root, { recursive: true, force: true });
    }
    vi.mocked(lookupSessionUUID).mockReset();
    vi.mocked(ensureActorAgent).mockReset();
});

function makeScanner(name: string): ActorScanner {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-inj-wiring-'));
    roots.push(root);
    const folder = path.join(root, name);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'actor.yaml'), `name: "${name}"\n`);
    return new ActorScanner(() => root, () => {});
}

function makeDeps(scanner: ActorScanner, order: string[]) {
    return {
        scanner,
        log: { info: () => {}, warn: () => {}, debug: () => {}, trace: () => {} } as any,
        openAtMain: vi.fn(async () => { order.push('openAtMain'); }),
        openAtSecondary: vi.fn(async () => { order.push('openAtSecondary'); }),
        openNewChatEditor: vi.fn(async () => { order.push('openNewChatEditor'); }),
        renameFocusedChatSession: vi.fn(async () => { order.push('renameFocusedChatSession'); }),
        reapplyAgentMode: vi.fn(async () => { order.push('reapplyAgentMode'); }),
    };
}

describe('SPEC_INJ_INJECT step 1b: ensureActorAgent runs after resolution, before session lookup', () => {
    it('is called with the resolved Actor name/folder before lookupSessionUUID', async () => {
        const scanner = await (async () => { const s = makeScanner('Test Actor'); await s.rescan(); return s; })();
        const order: string[] = [];
        vi.mocked(ensureActorAgent).mockImplementation(async () => { order.push('ensureActorAgent'); return { status: 'skipped', reason: 'noWorkspace' }; });
        vi.mocked(lookupSessionUUID).mockImplementation(async () => { order.push('lookupSessionUUID'); return undefined; });
        initInjectPrompt(makeDeps(scanner, order));

        await injectPrompt('Test Actor', '', { placement: 'secondary' });

        expect(order.slice(0, 2)).toEqual(['ensureActorAgent', 'lookupSessionUUID']);
        expect(vi.mocked(ensureActorAgent)).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Test Actor' })
        );
    });
});

describe('SPEC_INJ_INJECT branch 3a (existing session): mode follows ensureActorAgent', () => {
    it('ready sets the mode via reapplyAgentMode', async () => {
        const scanner = await (async () => { const s = makeScanner('Test Actor'); await s.rescan(); return s; })();
        const order: string[] = [];
        vi.mocked(ensureActorAgent).mockResolvedValue({ status: 'ready', mode: 'Test Actor' });
        vi.mocked(lookupSessionUUID).mockResolvedValue('11111111-1111-1111-1111-111111111111');
        const deps = makeDeps(scanner, order);
        initInjectPrompt(deps);

        await injectPrompt('Test Actor', '', { placement: 'secondary' });

        expect(deps.reapplyAgentMode).toHaveBeenCalledWith('Test Actor', 'Test Actor');
    });

    it('skipped sets no mode', async () => {
        const scanner = await (async () => { const s = makeScanner('Test Actor'); await s.rescan(); return s; })();
        const order: string[] = [];
        vi.mocked(ensureActorAgent).mockResolvedValue({ status: 'skipped', reason: 'duplicateAgent' });
        vi.mocked(lookupSessionUUID).mockResolvedValue('11111111-1111-1111-1111-111111111111');
        const deps = makeDeps(scanner, order);
        initInjectPrompt(deps);

        await injectPrompt('Test Actor', '', { placement: 'secondary' });

        expect(deps.reapplyAgentMode).not.toHaveBeenCalled();
    });
});

describe('SPEC_INJ_INJECT branch 3b (new session): mode follows ensureActorAgent', () => {
    it('ready primes the mode via workbench.action.chat.open before spawning', async () => {
        const scanner = await (async () => { const s = makeScanner('Test Actor'); await s.rescan(); return s; })();
        const order: string[] = [];
        vi.mocked(ensureActorAgent).mockResolvedValue({ status: 'ready', mode: 'Test Actor' });
        vi.mocked(lookupSessionUUID).mockResolvedValue(undefined);
        const execSpy = vi.spyOn(vscodeMock.commands, 'executeCommand');
        initInjectPrompt(makeDeps(scanner, order));

        await injectPrompt('Test Actor', '', { placement: 'secondary' });

        expect(execSpy).toHaveBeenCalledWith('workbench.action.chat.open', { mode: 'Test Actor' });
        execSpy.mockRestore();
    });

    it('skipped primes no mode', async () => {
        const scanner = await (async () => { const s = makeScanner('Test Actor'); await s.rescan(); return s; })();
        const order: string[] = [];
        vi.mocked(ensureActorAgent).mockResolvedValue({ status: 'skipped', reason: 'noWorkspace' });
        vi.mocked(lookupSessionUUID).mockResolvedValue(undefined);
        const execSpy = vi.spyOn(vscodeMock.commands, 'executeCommand');
        initInjectPrompt(makeDeps(scanner, order));

        await injectPrompt('Test Actor', '', { placement: 'secondary' });

        expect(execSpy).not.toHaveBeenCalledWith('workbench.action.chat.open', { mode: 'Test Actor' });
        execSpy.mockRestore();
    });
});
