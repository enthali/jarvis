/**
 * Unit tests for actor-touched-files (GH #18, SPEC_ENT_TOUCHEDFILES).
 *
 * Covers:
 * - Group A: TOUCH_RULES classification via TouchTracker (read/write/ignore,
 *   multi_replace_string_in_file n-path expansion, PostToolUse-only,
 *   dedupe of repeated paths in the same event).
 * - Group B: session_id -> entity resolution fail-open, path relativization.
 * - Group C/D: TouchStore persistence round-trip, fail-open on missing/corrupt
 *   file, removeEntry.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { HookEngine, HookEvent } from '../../packages/core/src/engine/hooks/hookEngine';
import { TouchStore } from '../../packages/core/src/engine/hooks/touchStore';

vi.mock('../../packages/core/src/engine/sessions/sessionLookup', () => ({
    getEntityNameForSessionId: vi.fn(),
}));

import { getEntityNameForSessionId } from '../../packages/core/src/engine/sessions/sessionLookup';
import { TouchTracker } from '../../packages/core/src/engine/hooks/touchTracker';

// Helper: re-key entries by relPath for assertion convenience
function byRelPath(entries: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [_key, entry] of Object.entries(entries)) {
        const rp = entry.relPath ?? _key;
        result[rp] = entry;
    }
    return result;
}

function createMockLogger() {
    return { info: vi.fn(), trace: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
}

function makeEvent(overrides: Partial<HookEvent> & { toolName?: string; toolInput?: any; cwd?: string }): HookEvent {
    const { toolName, toolInput, cwd, ...rest } = overrides;
    return {
        eventName: 'PostToolUse',
        sessionId: 'sess-1',
        payload: { tool_name: toolName, tool_input: toolInput, cwd: cwd ?? 'C:\\workspace\\jarvis' },
        ...rest,
    };
}

// --- TouchStore ------------------------------------------------------------

describe('TouchStore (SPEC_ENT_TOUCHEDFILES AC-4)', () => {
    let stateDir: string;

    beforeEach(() => {
        stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-touchstore-'));
    });

    afterEach(() => {
        fs.rmSync(stateDir, { recursive: true, force: true });
    });

    it('persists a write touch and reads it back via getEntries', async () => {
        const store = new TouchStore(stateDir);
        await store.recordTouches('session', 'Alpha', [{ rootUri: 'file:///ws', relPath: 'src/foo.ts', resourceUri: 'file:///ws/src/foo.ts' }], 'write');
        const entries = byRelPath(await store.getEntries('session', 'Alpha'));
        expect(entries['src/foo.ts'].lastEdited).toBeTruthy();
        expect(entries['src/foo.ts'].lastRead).toBeUndefined();
    });

    it('records read and write separately, merging into one entry per file', async () => {
        const store = new TouchStore(stateDir);
        await store.recordTouches('session', 'Alpha', [{ rootUri: 'file:///ws', relPath: 'src/foo.ts', resourceUri: 'file:///ws/src/foo.ts' }], 'read');
        await store.recordTouches('session', 'Alpha', [{ rootUri: 'file:///ws', relPath: 'src/foo.ts', resourceUri: 'file:///ws/src/foo.ts' }], 'write');
        const entries = byRelPath(await store.getEntries('session', 'Alpha'));
        expect(entries['src/foo.ts'].lastRead).toBeTruthy();
        expect(entries['src/foo.ts'].lastEdited).toBeTruthy();
    });

    it('fail-open: missing file yields empty entries', async () => {
        const store = new TouchStore(stateDir);
        const entries = byRelPath(await store.getEntries('session', 'DoesNotExist'));
        expect(entries).toEqual({});
    });

    it('fail-open: corrupt JSON yields empty entries', async () => {
        fs.mkdirSync(stateDir, { recursive: true });
        fs.writeFileSync(path.join(stateDir, 'session-Corrupt.json'), '{ not valid json', 'utf8');
        const store = new TouchStore(stateDir);
        const entries = byRelPath(await store.getEntries('session', 'Corrupt'));
        expect(entries).toEqual({});
    });

    it('removeEntry deletes exactly the targeted file, leaving others intact', async () => {
        const store = new TouchStore(stateDir);
        await store.recordTouches('session', 'Alpha', [
            { rootUri: 'file:///ws', relPath: 'src/foo.ts', resourceUri: 'file:///ws/src/foo.ts' },
            { rootUri: 'file:///ws', relPath: 'src/bar.ts', resourceUri: 'file:///ws/src/bar.ts' },
        ], 'write');
        await store.removeEntry('session', 'Alpha', 'file:///ws/src/foo.ts');
        const entries = byRelPath(await store.getEntries('session', 'Alpha'));
        expect(entries['src/foo.ts']).toBeUndefined();
        expect(entries['src/bar.ts']).toBeTruthy();
    });

    it('persists to <kind>-<name>.json under the state dir', async () => {
        const store = new TouchStore(stateDir);
        await store.recordTouches('project', 'My Project', [{ rootUri: 'file:///ws', relPath: 'a.md', resourceUri: 'file:///ws/a.md' }], 'write');
        expect(fs.existsSync(path.join(stateDir, 'project-My Project.json'))).toBe(true);
    });
});

// --- resolveTouchStorageKind (bugfix, GH #18 — PM F5 finding) --------------

describe('resolveTouchStorageKind (SPEC_ENT_TOUCHEDFILES bugfix)', () => {
    afterEach(() => {
        vi.resetModules();
        vi.doUnmock('../../packages/core/src/engine/core/configPaths');
    });

    it('remaps "session" to "actor" when the entity folder is under the actors dir', async () => {
        vi.resetModules();
        vi.doMock('../../packages/core/src/engine/core/configPaths', () => ({
            getActorsDir: () => path.join('C:', 'ws', '.jarvis', 'actors'),
        }));
        const { resolveTouchStorageKind } = await import('../../packages/core/src/engine/hooks/touchStore');
        const folder = path.join('C:', 'ws', '.jarvis', 'actors', 'Session 1');
        expect(resolveTouchStorageKind('session', folder)).toBe('actor');
    });

    it('leaves "session" unchanged when the folder is a raw session (not under actors dir)', async () => {
        vi.resetModules();
        vi.doMock('../../packages/core/src/engine/core/configPaths', () => ({
            getActorsDir: () => path.join('C:', 'ws', '.jarvis', 'actors'),
        }));
        const { resolveTouchStorageKind } = await import('../../packages/core/src/engine/hooks/touchStore');
        const folder = path.join('C:', 'ws', '.jarvis', 'sessions', 'Session 1');
        expect(resolveTouchStorageKind('session', folder)).toBe('session');
    });

    it('leaves "session" unchanged when no actors dir is configured (no workspace)', async () => {
        vi.resetModules();
        vi.doMock('../../packages/core/src/engine/core/configPaths', () => ({
            getActorsDir: () => undefined,
        }));
        const { resolveTouchStorageKind } = await import('../../packages/core/src/engine/hooks/touchStore');
        expect(resolveTouchStorageKind('session', 'C:\\ws\\.jarvis\\sessions\\Alpha')).toBe('session');
    });

    it('passes non-"session" kinds through unchanged (project/event never disambiguated)', async () => {
        vi.resetModules();
        vi.doMock('../../packages/core/src/engine/core/configPaths', () => ({
            getActorsDir: () => path.join('C:', 'ws', '.jarvis', 'actors'),
        }));
        const { resolveTouchStorageKind } = await import('../../packages/core/src/engine/hooks/touchStore');
        expect(resolveTouchStorageKind('project', 'C:\\ws\\.jarvis\\actors\\X')).toBe('project');
    });
});

// --- TouchTracker classification --------------------------------------------

describe('TouchTracker (SPEC_ENT_TOUCHEDFILES AC-1/AC-2/AC-3)', () => {
    let stateDir: string;
    let store: TouchStore;

    beforeEach(() => {
        stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-touchtracker-'));
        store = new TouchStore(stateDir);
        vi.mocked(getEntityNameForSessionId).mockReset();
    });

    afterEach(() => {
        fs.rmSync(stateDir, { recursive: true, force: true });
    });

    function makeTracker(onChange = vi.fn()) {
        const engine = new HookEngine(createMockLogger() as any);
        const owner = { kind: 'session', name: 'Alpha', folder: path.join(os.tmpdir(), 'jarvis-sessions', 'Alpha') };
        const resolveOwner = vi.fn().mockReturnValue(owner);
        new TouchTracker(engine, store, resolveOwner, onChange, createMockLogger() as any);
        return { engine, onChange, resolveOwner };
    }

    it('AC-1: registers exactly one handler, for PostToolUse only', () => {
        const engine = new HookEngine(createMockLogger() as any);
        const onSpy = vi.spyOn(engine, 'on');
        new TouchTracker(engine, store, () => ({ kind: 'session', name: 'Alpha', folder: '/tmp/sessions/Alpha' }), vi.fn(), createMockLogger() as any);
        expect(onSpy).toHaveBeenCalledTimes(1);
        expect(onSpy).toHaveBeenCalledWith('PostToolUse', expect.any(Function));
    });

    it('read_file classifies as read', async () => {
        vi.mocked(getEntityNameForSessionId).mockResolvedValue('Alpha');
        const { engine, onChange } = makeTracker();
        engine.receive(makeEvent({ toolName: 'read_file', toolInput: { filePath: 'C:\\workspace\\jarvis\\src\\foo.ts' } }));
        await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
        const entries = byRelPath(await store.getEntries('session', 'Alpha'));
        expect(entries['src/foo.ts'].lastRead).toBeTruthy();
        expect(entries['src/foo.ts'].lastEdited).toBeUndefined();
    });

    it('create_file and replace_string_in_file classify as write', async () => {
        vi.mocked(getEntityNameForSessionId).mockResolvedValue('Alpha');
        const { engine, onChange } = makeTracker();
        engine.receive(makeEvent({ toolName: 'create_file', toolInput: { filePath: 'C:\\workspace\\jarvis\\src\\new.ts' } }));
        await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
        engine.receive(makeEvent({ toolName: 'replace_string_in_file', toolInput: { filePath: 'C:\\workspace\\jarvis\\src\\new.ts' } }));
        await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(2));
        const entries = byRelPath(await store.getEntries('session', 'Alpha'));
        expect(entries['src/new.ts'].lastEdited).toBeTruthy();
    });

    it('multi_replace_string_in_file expands n paths from replacements[]', async () => {
        vi.mocked(getEntityNameForSessionId).mockResolvedValue('Alpha');
        const { engine, onChange } = makeTracker();
        engine.receive(makeEvent({
            toolName: 'multi_replace_string_in_file',
            toolInput: {
                replacements: [
                    { filePath: 'C:\\workspace\\jarvis\\src\\a.ts' },
                    { filePath: 'C:\\workspace\\jarvis\\src\\b.ts' },
                ],
            },
        }));
        await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
        const entries = byRelPath(await store.getEntries('session', 'Alpha'));
        expect(entries['src/a.ts'].lastEdited).toBeTruthy();
        expect(entries['src/b.ts'].lastEdited).toBeTruthy();
    });

    it('AC-2d: unmapped tool_name is ignored — no touch recorded, no onChange fired', async () => {
        vi.mocked(getEntityNameForSessionId).mockResolvedValue('Alpha');
        const { engine, onChange } = makeTracker();
        engine.receive(makeEvent({ toolName: 'grep_search', toolInput: { query: 'x' } }));
        await new Promise(r => setTimeout(r, 10));
        expect(onChange).not.toHaveBeenCalled();
        const entries = byRelPath(await store.getEntries('session', 'Alpha'));
        expect(entries).toEqual({});
    });

    it('AC-2c: duplicate paths in one event dedupe into a single touch', async () => {
        vi.mocked(getEntityNameForSessionId).mockResolvedValue('Alpha');
        const { engine, onChange } = makeTracker();
        engine.receive(makeEvent({
            toolName: 'multi_replace_string_in_file',
            toolInput: {
                replacements: [
                    { filePath: 'C:\\workspace\\jarvis\\src\\dup.ts' },
                    { filePath: 'C:\\workspace\\jarvis\\src\\dup.ts' },
                ],
            },
        }));
        await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    });

    it('AC-4: no sessionId -> ignored (fail-open)', async () => {
        const { engine, onChange } = makeTracker();
        engine.receive({ eventName: 'PostToolUse', payload: { tool_name: 'read_file', tool_input: { filePath: 'x' }, cwd: 'C:\\workspace\\jarvis' } });
        await new Promise(r => setTimeout(r, 10));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('AC-4/AC-9: unresolvable session_id (no entity match) -> ignored (fail-open)', async () => {
        vi.mocked(getEntityNameForSessionId).mockResolvedValue(undefined);
        const { engine, onChange } = makeTracker();
        engine.receive(makeEvent({ toolName: 'read_file', toolInput: { filePath: 'x' } }));
        await new Promise(r => setTimeout(r, 10));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('AC-5: relativizes absolute paths against event.payload.cwd, forward-slash normalized', async () => {
        vi.mocked(getEntityNameForSessionId).mockResolvedValue('Alpha');
        const { engine, onChange } = makeTracker();
        engine.receive(makeEvent({
            toolName: 'read_file',
            toolInput: { filePath: 'C:\\workspace\\jarvis\\packages\\core\\src\\foo.ts' },
            cwd: 'C:\\workspace\\jarvis',
        }));
        await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
        const entries = byRelPath(await store.getEntries('session', 'Alpha'));
        expect(Object.keys(entries)).toEqual(['packages/core/src/foo.ts']);
    });
});
