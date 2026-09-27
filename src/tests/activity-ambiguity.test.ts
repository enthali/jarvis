/**
 * Unit tests for QM round-1 Finding 7 (retire-legacy-actor-kinds):
 * REQ_ACTOR_ACTIVITY AC-10 — a title that resolves to more than one Actor
 * is ignored like a title matching none; AC-2a — isActive() rechecks
 * resolveName at query time so a name that became ambiguous after a hook
 * event stops reporting Active without waiting for a new event.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { HookEngine } from '../../packages/core/src/engine/hooks/hookEngine';
import { ActorScanner } from '../../packages/core/src/engine/actors/actorScanner';

vi.mock('../../packages/core/src/engine/sessions/sessionLookup', () => ({
    getEntityNameForSessionId: vi.fn(),
}));

import { getEntityNameForSessionId } from '../../packages/core/src/engine/sessions/sessionLookup';
import { ActivityTracker } from '../../packages/core/src/engine/hooks/activityTracker';

const roots: string[] = [];

afterEach(() => {
    for (const root of roots.splice(0)) {
        fs.rmSync(root, { recursive: true, force: true });
    }
    vi.mocked(getEntityNameForSessionId).mockReset();
});

function writeActor(root: string, folderName: string, name: string): void {
    const folder = path.join(root, folderName);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'actor.yaml'), `name: "${name}"\n`);
}

describe('REQ_ACTOR_ACTIVITY AC-10: ambiguous title is ignored like no match', () => {
    it('an event for a title carried by two Actors marks neither Active', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-activity-'));
        roots.push(root);
        writeActor(root, 'Dup1', 'Shared Name');
        writeActor(root, 'Dup2', 'Shared Name');
        const scanner = new ActorScanner(() => root, () => {});
        await scanner.rescan();

        vi.mocked(getEntityNameForSessionId).mockResolvedValue('Shared Name');
        const onChange = vi.fn();
        const engine = new HookEngine({ debug: () => {}, info: () => {}, warn: () => {}, error: () => {}, trace: () => {} } as any);
        const tracker = new ActivityTracker(engine, scanner, onChange);

        engine.receive?.({ eventName: 'SessionStart', sessionId: 'sess-1', payload: {} });
        await new Promise(r => setTimeout(r, 10));

        expect(onChange).not.toHaveBeenCalled();
        expect(tracker.isActive('Shared Name')).toBe(false);
    });
});

describe('REQ_ACTOR_ACTIVITY AC-2a: isActive rechecks resolveName at query time', () => {
    it('a name active from a prior event stops reporting Active once it becomes ambiguous', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-activity-'));
        roots.push(root);
        writeActor(root, 'One', 'Solo Actor');
        const scanner = new ActorScanner(() => root, () => {});
        await scanner.rescan();

        vi.mocked(getEntityNameForSessionId).mockResolvedValue('Solo Actor');
        const engine = new HookEngine({ debug: () => {}, info: () => {}, warn: () => {}, error: () => {}, trace: () => {} } as any);
        const tracker = new ActivityTracker(engine, scanner, () => {});

        engine.receive?.({ eventName: 'SessionStart', sessionId: 'sess-1', payload: {} });
        await new Promise(r => setTimeout(r, 10));
        expect(tracker.isActive('Solo Actor')).toBe(true);

        // A manual actor.yaml edit introduces a duplicate after the event fired.
        writeActor(root, 'Two', 'Solo Actor');
        await scanner.rescan();

        expect(tracker.isActive('Solo Actor')).toBe(false);
    });
});
