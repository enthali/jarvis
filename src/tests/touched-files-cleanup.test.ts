// SPEC_ENT_TOUCHEDFILES — cleanup, display filters, tri-state probe, new schema
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TouchStore, TouchEntry } from '../../packages/core/src/engine/hooks/touchStore';

vi.mock('vscode', () => {
    class FSError extends Error {
        code: string;
        constructor(code: string) { super(code); this.code = code; this.name = 'EntryNotFound (FileSystemError)'; }
    }
    return {
        Uri: {
            parse: (s: string) => ({ toString: () => s, fsPath: s.replace(/^file:\/\//, ''), scheme: 'file' }),
            joinPath: (base: any, ...parts: string[]) => {
                const joined = [base.fsPath ?? base.toString().replace(/^file:\/\//, ''), ...parts].join('/');
                return { toString: () => `file://${joined}`, fsPath: joined, scheme: 'file' };
            },
        },
        workspace: {
            workspaceFolders: [{ uri: { fsPath: '/workspace', toString: (_skip?: boolean) => 'file:///workspace', scheme: 'file' } }],
            getConfiguration: () => ({ get: (_k: string, def: number) => def }),
            fs: { stat: vi.fn() },
        },
        FileSystemError: FSError,
    };
});

import { withinWindow, probeTouchEntry, probeEntries } from '../../packages/core/src/engine/core/treeFactory';
import * as vscode from 'vscode';

// --- withinWindow ---

describe('withinWindow', () => {
    const now = Date.now();
    const recent = new Date(now - 2 * 86_400_000).toISOString();
    const old = new Date(now - 10 * 86_400_000).toISOString();

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
        expect(Object.keys(withinWindow(entries, 5))).toEqual(['c.ts']);
    });

    it('absent timestamps treated as epoch (filtered if window set)', () => {
        expect(Object.keys(withinWindow({ 'd.ts': {} }, 7))).toEqual([]);
    });
});

// --- probeTouchEntry (tri-state) ---

describe('probeTouchEntry', () => {
    const mockStat = vi.mocked(vscode.workspace.fs.stat);

    beforeEach(() => { mockStat.mockReset(); });

    it('returns present when stat succeeds', async () => {
        mockStat.mockResolvedValue({ type: 1, size: 100, ctime: 0, mtime: 0 } as any);
        const entry: TouchEntry = { rootUri: 'file:///workspace', relPath: 'src/a.ts', lastEdited: new Date().toISOString() };
        const { result, uri } = await probeTouchEntry(entry);
        expect(result).toBe('present');
        expect(uri).toBeDefined();
    });

    it('returns absent on FileNotFound', async () => {
        mockStat.mockRejectedValue(Object.assign(new Error('FileNotFound'), { code: 'FileNotFound', name: 'EntryNotFound (FileSystemError)' }));
        const entry: TouchEntry = { rootUri: 'file:///workspace', relPath: 'gone.ts', lastEdited: new Date().toISOString() };
        const { result } = await probeTouchEntry(entry);
        expect(result).toBe('absent');
    });

    it('returns unknown on other errors', async () => {
        mockStat.mockRejectedValue(new Error('EPERM'));
        const entry: TouchEntry = { rootUri: 'file:///workspace', relPath: 'perm.ts', lastEdited: new Date().toISOString() };
        const { result } = await probeTouchEntry(entry);
        expect(result).toBe('unknown');
    });

    it('returns unknown for legacy entries without rootUri', async () => {
        const entry: TouchEntry = { lastEdited: new Date().toISOString() };
        const { result } = await probeTouchEntry(entry);
        expect(result).toBe('unknown');
    });

    it('returns unknown when rootUri does not match any open workspace folder', async () => {
        mockStat.mockResolvedValue({ type: 1, size: 0, ctime: 0, mtime: 0 } as any);
        const entry: TouchEntry = { rootUri: 'file:///other-workspace', relPath: 'a.ts', lastEdited: new Date().toISOString() };
        const { result } = await probeTouchEntry(entry);
        expect(result).toBe('unknown');
    });
});

// --- probeEntries (filter) ---

describe('probeEntries', () => {
    const mockStat = vi.mocked(vscode.workspace.fs.stat);

    beforeEach(() => { mockStat.mockReset(); });

    it('includes only present entries', async () => {
        mockStat.mockImplementation(async (uri: any) => {
            if (uri.toString().includes('exists')) return { type: 1 } as any;
            throw Object.assign(new Error('FileNotFound'), { code: 'FileNotFound', name: 'EntryNotFound (FileSystemError)' });
        });
        const entries: Record<string, TouchEntry> = {
            'file:///workspace/exists.ts': { rootUri: 'file:///workspace', relPath: 'exists.ts', lastEdited: new Date().toISOString() },
            'file:///workspace/gone.ts': { rootUri: 'file:///workspace', relPath: 'gone.ts', lastEdited: new Date().toISOString() },
        };
        const result = await probeEntries(entries);
        expect(Object.keys(result)).toEqual(['file:///workspace/exists.ts']);
    });
});

// --- TouchStore new schema + removeEntriesIfUnchanged ---

describe('TouchStore (new schema)', () => {
    let stateDir: string;
    let store: TouchStore;

    beforeEach(() => {
        stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-ts-wsl-'));
        store = new TouchStore(stateDir);
    });
    afterEach(() => { fs.rmSync(stateDir, { recursive: true, force: true }); });

    it('recordTouches stores rootUri and relPath', async () => {
        await store.recordTouches('session', 'A', [
            { rootUri: 'file:///ws', relPath: 'src/a.ts', resourceUri: 'file:///ws/src/a.ts' },
        ], 'write');
        const entries = await store.getEntries('session', 'A');
        expect(entries['file:///ws/src/a.ts']).toBeDefined();
        expect(entries['file:///ws/src/a.ts'].rootUri).toBe('file:///ws');
        expect(entries['file:///ws/src/a.ts'].relPath).toBe('src/a.ts');
        expect(entries['file:///ws/src/a.ts'].lastEdited).toBeDefined();
    });

    it('removeEntriesIfUnchanged removes only unchanged entries', () => {
        // Manually write a store file
        const file = path.join(stateDir, 'session-B.json');
        const data = {
            files: {
                'file:///ws/a.ts': { rootUri: 'file:///ws', relPath: 'a.ts', lastEdited: '2026-01-01T00:00:00.000Z' },
                'file:///ws/b.ts': { rootUri: 'file:///ws', relPath: 'b.ts', lastEdited: '2026-01-01T00:00:00.000Z' },
            }
        };
        fs.writeFileSync(file, JSON.stringify(data));

        const snapshot = { ...data.files };
        // Simulate concurrent touch to b.ts
        const updated = JSON.parse(JSON.stringify(data));
        updated.files['file:///ws/b.ts'].lastEdited = '2026-08-06T00:00:00.000Z';
        fs.writeFileSync(file, JSON.stringify(updated));

        const count = store.removeEntriesIfUnchanged('session', 'B', snapshot, ['file:///ws/a.ts', 'file:///ws/b.ts']);
        expect(count).toBe(1); // only a.ts removed, b.ts was touched concurrently

        const entries = JSON.parse(fs.readFileSync(file, 'utf8')).files;
        expect(entries['file:///ws/a.ts']).toBeUndefined();
        expect(entries['file:///ws/b.ts']).toBeDefined();
    });

    it('removeUnder filters by relPath prefix and rootUri', async () => {
        await store.recordTouches('session', 'C', [
            { rootUri: 'file:///ws', relPath: 'src/a.ts', resourceUri: 'file:///ws/src/a.ts' },
            { rootUri: 'file:///ws', relPath: 'lib/b.ts', resourceUri: 'file:///ws/lib/b.ts' },
        ], 'write');
        await store.removeUnder('session', 'C', 'src', 'file:///ws');
        const entries = await store.getEntries('session', 'C');
        expect(Object.keys(entries)).toEqual(['file:///ws/lib/b.ts']);
    });

    it('removeAll deletes the file entirely', async () => {
        await store.recordTouches('session', 'D', [
            { rootUri: 'file:///ws', relPath: 'x.ts', resourceUri: 'file:///ws/x.ts' },
        ], 'read');
        await store.removeAll('session', 'D');
        const entries = await store.getEntries('session', 'D');
        expect(Object.keys(entries)).toEqual([]);
    });
});

// --- rootUri propagation end-to-end (VE R2 coverage requirement) ---

describe('rootUri propagation through folder nodes', () => {
    let stateDir: string;
    let store: TouchStore;

    beforeEach(() => {
        stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-ts-prop-'));
        store = new TouchStore(stateDir);
    });
    afterEach(() => { fs.rmSync(stateDir, { recursive: true, force: true }); });

    it('buildTouchedFileChildren sets rootUri on folder nodes from the entry', async () => {
        const { buildTouchedFileChildren } = await import('../../packages/core/src/engine/core/treeFactory');
        const entries = {
            'file:///wsA/src/a.ts': { rootUri: 'file:///wsA', relPath: 'src/a.ts', lastEdited: '2026-01-01T00:00:00Z' },
            'file:///wsB/src/b.ts': { rootUri: 'file:///wsB', relPath: 'src/b.ts', lastEdited: '2026-01-01T00:00:00Z' },
        };
        const children = buildTouchedFileChildren(entries as any, '', '/ws', 'session', 'X');
        const folders = children.filter(c => c.kind === 'touchedFileFolder');
        // AC-27: two roots with same relFolderPath produce distinct folder nodes
        expect(folders).toHaveLength(2);
        expect(folders[0].rootUri).toBe('file:///wsA');
        expect(folders[1].rootUri).toBe('file:///wsB');
    });

    it('removeUnder with node.rootUri removes only that root entries', async () => {
        await store.recordTouches('session', 'E', [
            { rootUri: 'file:///wsA', relPath: 'src/a.ts', resourceUri: 'file:///wsA/src/a.ts' },
            { rootUri: 'file:///wsB', relPath: 'src/b.ts', resourceUri: 'file:///wsB/src/b.ts' },
        ], 'write');
        // Simulates clicking root-A's src folder node (which carries rootUri: 'file:///wsA')
        await store.removeUnder('session', 'E', 'src', 'file:///wsA');
        const entries = await store.getEntries('session', 'E');
        expect(Object.keys(entries)).toEqual(['file:///wsB/src/b.ts']);
    });
});
