// SPEC_ENT_TOUCHEDFILES — cleanup commands + display filters
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TouchStore, TouchEntry } from '../../packages/core/src/engine/hooks/touchStore';

vi.mock('vscode', () => ({
    workspace: {
        workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
        getConfiguration: () => ({ get: (_k: string, def: number) => def }),
    },
}));

import { withinWindow, existingOnly } from '../../packages/core/src/engine/core/treeFactory';

// --- withinWindow ---

describe('withinWindow', () => {
    const now = Date.now();
    const recent = new Date(now - 2 * 86_400_000).toISOString(); // 2 days ago
    const old = new Date(now - 10 * 86_400_000).toISOString();   // 10 days ago

    it('windowDays=0 returns all entries (no limit)', () => {
        const entries: Record<string, TouchEntry> = {
            'a.ts': { lastEdited: old },
            'b.ts': { lastRead: recent },
        };
        expect(withinWindow(entries, 0)).toEqual(entries);
    });

    it('filters entries outside the rolling window', () => {
        const entries: Record<string, TouchEntry> = {
            'a.ts': { lastEdited: old },
            'b.ts': { lastRead: recent },
        };
        const result = withinWindow(entries, 5);
        expect(Object.keys(result)).toEqual(['b.ts']);
    });

    it('uses later of lastRead and lastEdited', () => {
        const entries: Record<string, TouchEntry> = {
            'c.ts': { lastEdited: old, lastRead: recent },
        };
        const result = withinWindow(entries, 5);
        expect(Object.keys(result)).toEqual(['c.ts']);
    });

    it('absent timestamps treated as epoch (filtered if window set)', () => {
        const entries: Record<string, TouchEntry> = { 'd.ts': {} };
        expect(Object.keys(withinWindow(entries, 7))).toEqual([]);
    });
});

// --- existingOnly ---

describe('existingOnly', () => {
    let tmpDir: string;

    beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-exist-')); });
    afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

    it('keeps entries where the file exists', () => {
        fs.writeFileSync(path.join(tmpDir, 'real.ts'), '');
        const entries: Record<string, TouchEntry> = {
            'real.ts': { lastEdited: new Date().toISOString() },
            'gone.ts': { lastEdited: new Date().toISOString() },
        };
        const result = existingOnly(entries, tmpDir);
        expect(Object.keys(result)).toEqual(['real.ts']);
    });
});

// --- TouchStore removeUnder / removeAll / removeMissing ---

describe('TouchStore cleanup methods', () => {
    let stateDir: string;
    let store: TouchStore;

    beforeEach(() => {
        stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-ts-cleanup-'));
        store = new TouchStore(stateDir);
    });
    afterEach(() => { fs.rmSync(stateDir, { recursive: true, force: true }); });

    it('removeUnder removes entries with matching prefix', async () => {
        await store.recordTouches('session', 'A', ['src/a.ts', 'src/b.ts', 'lib/c.ts'], 'write');
        await store.removeUnder('session', 'A', 'src');
        const entries = await store.getEntries('session', 'A');
        expect(Object.keys(entries)).toEqual(['lib/c.ts']);
    });

    it('removeAll deletes the file entirely', async () => {
        await store.recordTouches('session', 'B', ['x.ts'], 'read');
        await store.removeAll('session', 'B');
        const entries = await store.getEntries('session', 'B');
        expect(Object.keys(entries)).toEqual([]);
    });

    it('removeMissing removes dead entries and returns count', async () => {
        const wsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-ws-'));
        fs.writeFileSync(path.join(wsRoot, 'alive.ts'), '');
        await store.recordTouches('session', 'C', ['alive.ts', 'dead.ts'], 'write');

        const count = await store.removeMissing('session', 'C', wsRoot);
        expect(count).toBe(1);

        const entries = await store.getEntries('session', 'C');
        expect(Object.keys(entries)).toEqual(['alive.ts']);
        fs.rmSync(wsRoot, { recursive: true, force: true });
    });

    it('removeMissing returns 0 when all files exist', async () => {
        const wsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-ws2-'));
        fs.writeFileSync(path.join(wsRoot, 'ok.ts'), '');
        await store.recordTouches('session', 'D', ['ok.ts'], 'write');

        const count = await store.removeMissing('session', 'D', wsRoot);
        expect(count).toBe(0);
        fs.rmSync(wsRoot, { recursive: true, force: true });
    });
});
