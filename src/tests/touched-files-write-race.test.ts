/**
 * Unit tests for touched-files-write-race (GH #35, SPEC_ENT_TOUCHEDFILES
 * AC-6a). Mirrors docs/changes/tst-touched-files-write-race.md.
 *
 * TouchStore's _load/_save are synchronous fs calls with no await between
 * load and save inside recordTouches()/removeEntry() — a synchronous call
 * never yields control back to the event loop, so overlapping calls (fired
 * without awaiting the previous one, as TouchTracker does per PostToolUse
 * event) cannot interleave mid-mutation. These tests simulate that
 * overlapping-call shape via Promise.all() over multiple recordTouches()
 * calls issued without an intervening await, and assert no entry is lost.
 *
 * Covers:
 * - Group A: concurrent same-entity touches (core bugfix, AC-6a) — A-1..A-5.
 * - Group B: cross-entity independence under concurrent load — B-1, B-2.
 * - Group D: fail-open behavior unchanged under the sync implementation —
 *   D-1, D-2, D-3 (baseline single/sequential/read+write-merge and tree-UI/
 *   reload behavior — Group C — is covered by actor-touched-files.test.ts
 *   and requires an F5 pass for the tree-UI scenario per the test protocol's
 *   execution notes; not repeated here).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TouchStore } from '../../packages/core/src/engine/hooks/touchStore';

describe('TouchStore concurrency guarantee (SPEC_ENT_TOUCHEDFILES AC-6a, GH #35)', () => {
    let stateDir: string;
    let store: TouchStore;

    beforeEach(() => {
        stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-touchrace-'));
        store = new TouchStore(stateDir);
    });

    afterEach(() => {
        fs.rmSync(stateDir, { recursive: true, force: true });
    });

    // --- Group A: Concurrent Same-Entity Touches ---------------------------

    it('A-1: 6 near-simultaneous touches in one turn — all new entries survive alongside 2 pre-existing', async () => {
        await store.recordTouches('session', 'Alpha', ['pre/a.ts', 'pre/b.ts'], 'write');

        const files = ['f1.ts', 'f2.ts', 'f3.ts', 'f4.ts', 'f5.ts', 'f6.ts'];
        await Promise.all(files.map(f => store.recordTouches('session', 'Alpha', [f], 'read')));

        const entries = await store.getEntries('session', 'Alpha');
        expect(Object.keys(entries)).toHaveLength(8);
        expect(entries['pre/a.ts']).toBeTruthy();
        expect(entries['pre/b.ts']).toBeTruthy();
        for (const f of files) { expect(entries[f].lastRead).toBeTruthy(); }
    });

    it('A-2: 10 concurrent touches with 3 pre-existing entries — 13 total, none lost', async () => {
        await store.recordTouches('session', 'Alpha', ['pre/a.ts', 'pre/b.ts', 'pre/c.ts'], 'write');

        const files = Array.from({ length: 10 }, (_, i) => `file${i}.ts`);
        await Promise.all(files.map(f => store.recordTouches('session', 'Alpha', [f], 'read')));

        const entries = await store.getEntries('session', 'Alpha');
        expect(Object.keys(entries)).toHaveLength(13);
        for (const f of files) { expect(entries[f]).toBeTruthy(); }
    });

    it('A-3: concurrent read + write on the same file merges into one consistent entry', async () => {
        await Promise.all([
            store.recordTouches('session', 'Alpha', ['shared.ts'], 'read'),
            store.recordTouches('session', 'Alpha', ['shared.ts'], 'write'),
        ]);

        const entries = await store.getEntries('session', 'Alpha');
        expect(Object.keys(entries)).toHaveLength(1);
        expect(entries['shared.ts'].lastRead).toBeTruthy();
        expect(entries['shared.ts'].lastEdited).toBeTruthy();
    });

    it('A-4: no previously-persisted entries lost during a concurrent burst', async () => {
        const preexisting = ['unrelated/1.ts', 'unrelated/2.ts', 'unrelated/3.ts', 'unrelated/4.ts', 'unrelated/5.ts'];
        await store.recordTouches('session', 'Alpha', preexisting, 'write');

        const burst = ['burst1.ts', 'burst2.ts', 'burst3.ts', 'burst4.ts', 'burst5.ts', 'burst6.ts'];
        await Promise.all(burst.map(f => store.recordTouches('session', 'Alpha', [f], 'read')));

        const entries = await store.getEntries('session', 'Alpha');
        expect(Object.keys(entries)).toHaveLength(11);
        for (const f of preexisting) { expect(entries[f].lastEdited).toBeTruthy(); }
        for (const f of burst) { expect(entries[f].lastRead).toBeTruthy(); }
    });

    it('A-5: multi_replace_string_in_file-shaped n-path write concurrent with separate reads', async () => {
        await Promise.all([
            store.recordTouches('session', 'Alpha', ['w1.ts', 'w2.ts', 'w3.ts'], 'write'), // one multi_replace call, 3 paths
            store.recordTouches('session', 'Alpha', ['r1.ts'], 'read'),
            store.recordTouches('session', 'Alpha', ['r2.ts'], 'read'),
            store.recordTouches('session', 'Alpha', ['r3.ts'], 'read'),
        ]);

        const entries = await store.getEntries('session', 'Alpha');
        expect(Object.keys(entries)).toHaveLength(6);
        for (const f of ['w1.ts', 'w2.ts', 'w3.ts']) { expect(entries[f].lastEdited).toBeTruthy(); }
        for (const f of ['r1.ts', 'r2.ts', 'r3.ts']) { expect(entries[f].lastRead).toBeTruthy(); }
    });

    // --- Group B: Cross-Entity Independence ---------------------------------

    it('B-1: concurrent bursts on two different entities do not cross-contaminate', async () => {
        const filesA = ['a1.ts', 'a2.ts', 'a3.ts', 'a4.ts', 'a5.ts', 'a6.ts'];
        const filesB = ['b1.ts', 'b2.ts', 'b3.ts', 'b4.ts', 'b5.ts', 'b6.ts'];

        await Promise.all([
            ...filesA.map(f => store.recordTouches('session', 'EntityA', [f], 'read')),
            ...filesB.map(f => store.recordTouches('project', 'EntityB', [f], 'read')),
        ]);

        const entriesA = await store.getEntries('session', 'EntityA');
        const entriesB = await store.getEntries('project', 'EntityB');
        expect(Object.keys(entriesA)).toHaveLength(6);
        expect(Object.keys(entriesB)).toHaveLength(6);
        for (const f of filesB) { expect(entriesA[f]).toBeUndefined(); }
        for (const f of filesA) { expect(entriesB[f]).toBeUndefined(); }
    });

    it('B-2: one entity\'s burst does not block or corrupt another entity\'s single touch', async () => {
        const burstA = Array.from({ length: 8 }, (_, i) => `burstA-${i}.ts`);

        await Promise.all([
            ...burstA.map(f => store.recordTouches('session', 'EntityA', [f], 'write')),
            store.recordTouches('project', 'EntityB', ['single.ts'], 'read'),
        ]);

        const entriesB = await store.getEntries('project', 'EntityB');
        expect(Object.keys(entriesB)).toHaveLength(1);
        expect(entriesB['single.ts'].lastRead).toBeTruthy();
    });

    // --- Group D: Fail-Open Behavior Still Holds -----------------------------

    it('D-1: missing JSON file still fails open and is recreated on next touch', async () => {
        const filePath = path.join(stateDir, 'session-Ghost.json');
        expect(fs.existsSync(filePath)).toBe(false);

        await store.recordTouches('session', 'Ghost', ['new.ts'], 'write');

        expect(fs.existsSync(filePath)).toBe(true);
        const entries = await store.getEntries('session', 'Ghost');
        expect(entries['new.ts'].lastEdited).toBeTruthy();
    });

    it('D-2: corrupt JSON file still fails open and is overwritten with valid JSON', async () => {
        fs.mkdirSync(stateDir, { recursive: true });
        fs.writeFileSync(path.join(stateDir, 'session-Corrupt.json'), '{ not valid json', 'utf8');

        await store.recordTouches('session', 'Corrupt', ['recovered.ts'], 'write');

        const entries = await store.getEntries('session', 'Corrupt');
        expect(entries['recovered.ts'].lastEdited).toBeTruthy();
        const raw = fs.readFileSync(path.join(stateDir, 'session-Corrupt.json'), 'utf8');
        expect(() => JSON.parse(raw)).not.toThrow();
    });

    it('D-3: missing state directory is created on first write', async () => {
        fs.rmSync(stateDir, { recursive: true, force: true });
        expect(fs.existsSync(stateDir)).toBe(false);

        await store.recordTouches('session', 'Alpha', ['first.ts'], 'write');

        expect(fs.existsSync(stateDir)).toBe(true);
        const entries = await store.getEntries('session', 'Alpha');
        expect(entries['first.ts'].lastEdited).toBeTruthy();
    });
});
