/**
 * Handler-level tests for jarvis_listKanbanFilterValues and jarvis_verifyKanbanSchema.
 * Covers the QM gaps G1 to G4 for REQ_KAN_FILTERVALUES (AC-1, AC-2, AC-3, AC-6, AC-7, AC-8).
 * The handlers are captured from activate() with the vscode mock; Actor folders are real temporary folders.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { activate } from '../../packages/kanban/src/extension';

type ToolResult = { content: Array<{ value: string }> };
type Handler = (options: { input: unknown }, token: unknown) => Promise<ToolResult>;
type Entry = { name: string; count: number };

const repoRoot = path.resolve(__dirname, '..', '..');
const handlers = new Map<string, Handler>();
let root = '';
let alphaDir = '';
let twinOneDir = '';
let twinTwoDir = '';

const board = (items: unknown[] = [], fields?: unknown[]) => ({
    title: 'Test',
    nextId: 1,
    fields: fields ?? [{ name: 'status', type: 'single_select', options: [{ name: 'Todo' }, { name: 'Doing' }, { name: 'Done' }] }],
    items,
});

function writeBoard(dir: string, file: string, content: unknown): void {
    fs.writeFileSync(path.join(dir, file), JSON.stringify(content), 'utf-8');
}

async function call(name: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const handler = handlers.get(name);
    if (!handler) { throw new Error(`tool not registered: ${name}`); }
    const result = await handler({ input }, new vscode.CancellationTokenSource().token);
    return JSON.parse(result.content[0].value) as Record<string, unknown>;
}

beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'kanban-fv-'));
    alphaDir = path.join(root, 'Alpha');
    twinOneDir = path.join(root, 'Twin-1');
    twinTwoDir = path.join(root, 'Twin-2');
    for (const dir of [alphaDir, twinOneDir, twinTwoDir]) { fs.mkdirSync(dir); }

    const actors = [
        { name: 'Alpha', folder: alphaDir },
        { name: 'Twin', folder: twinOneDir },
        { name: 'Twin', folder: twinTwoDir },
    ];
    const api = {
        version: 2,
        listActors: () => actors.map(a => ({ id: a.name, summary: '', ...a })),
        registerTool: (name: string, _description: string, handler: Handler) => {
            handlers.set(name, handler);
            return { dispose: () => {} };
        },
        provisionModuleAssets: async () => undefined,
    };
    vi.spyOn(vscode.extensions, 'getExtension').mockReturnValue({ exports: api } as never);
    Object.assign(vscode.window, { registerCustomEditorProvider: () => ({ dispose: () => {} }) });

    const context = {
        subscriptions: [] as Array<{ dispose: () => void }>,
        extensionUri: vscode.Uri.file(repoRoot),
        asAbsolutePath: (p: string) => p,
    };
    activate(context as never);
});

afterEach(() => {
    for (const file of fs.readdirSync(alphaDir)) { fs.rmSync(path.join(alphaDir, file), { force: true }); }
});

afterAll(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
});

describe('REQ_KAN_FILTERVALUES AC-1, AC-3, AC-7: owner and board errors of jarvis_listKanbanFilterValues', () => {
    it('AC-1: ownerName is required', async () => {
        expect(await call('jarvis_listKanbanFilterValues', {})).toEqual({ error: 'ownerName required' });
    });

    it('AC-7: an unknown owner returns the same error as jarvis_listKanbanItems', async () => {
        const values = await call('jarvis_listKanbanFilterValues', { ownerName: 'Nobody' });
        expect(values).toEqual({ error: 'actor unknown' });
        expect(values).toEqual(await call('jarvis_listKanbanItems', { ownerName: 'Nobody' }));
    });

    it('AC-1: an owner name shared by two Actors is refused as unknown, as for jarvis_listKanbanItems', async () => {
        const values = await call('jarvis_listKanbanFilterValues', { ownerName: 'Twin' });
        expect(values).toEqual({ error: 'actor unknown' });
        expect(values).toEqual(await call('jarvis_listKanbanItems', { ownerName: 'Twin' }));
    });

    it('AC-7: a missing board returns the same error as jarvis_listKanbanItems', async () => {
        const values = await call('jarvis_listKanbanFilterValues', { ownerName: 'Alpha', boardName: 'missing' });
        expect(values).toEqual({ error: 'board not found' });
        expect(values).toEqual(await call('jarvis_listKanbanItems', { ownerName: 'Alpha', boardName: 'missing' }));
    });

    it('AC-7: an unparsable board returns the same YAML error as jarvis_listKanbanItems', async () => {
        fs.writeFileSync(path.join(alphaDir, 'kanban.yaml'), 'fields: [\n', 'utf-8');
        const values = await call('jarvis_listKanbanFilterValues', { ownerName: 'Alpha' });
        expect(String(values.error)).toMatch(/^YAML parse error:/);
        expect(values).toEqual(await call('jarvis_listKanbanItems', { ownerName: 'Alpha' }));
    });

    it('AC-3: a board without a status field returns an error, not an empty result', async () => {
        writeBoard(alphaDir, 'kanban.yaml', board([], [{ name: 'priority', type: 'single_select', options: [{ name: 'High' }] }]));
        expect(await call('jarvis_listKanbanFilterValues', { ownerName: 'Alpha' })).toEqual({ error: 'board has no status field' });
    });

    it('AC-7: the tool does not modify the board file, on success or on error', async () => {
        const validText = JSON.stringify(board([{ id: 1, name: 'A', status: 'Todo', labels: ['ui'] }]));
        fs.writeFileSync(path.join(alphaDir, 'kanban.yaml'), validText, 'utf-8');
        await call('jarvis_listKanbanFilterValues', { ownerName: 'Alpha' });
        expect(fs.readFileSync(path.join(alphaDir, 'kanban.yaml'), 'utf-8')).toBe(validText);

        const brokenText = 'fields: [\n';
        fs.writeFileSync(path.join(alphaDir, 'kanban.yaml'), brokenText, 'utf-8');
        await call('jarvis_listKanbanFilterValues', { ownerName: 'Alpha' });
        expect(fs.readFileSync(path.join(alphaDir, 'kanban.yaml'), 'utf-8')).toBe(brokenText);
    });
});

describe('REQ_KAN_FILTERVALUES AC-2: path key of the success result', () => {
    it('AC-2: the result has exactly path, statuses and labels; path is the default board file', async () => {
        writeBoard(alphaDir, 'kanban.yaml', board([{ id: 1, name: 'A', status: 'Todo', labels: ['ui'] }]));
        const result = await call('jarvis_listKanbanFilterValues', { ownerName: 'Alpha' });
        expect(Object.keys(result).sort()).toEqual(['labels', 'path', 'statuses']);
        expect(result.path).toBe(path.join(alphaDir, 'kanban.yaml'));
    });

    it('AC-2: path is the file of a named board and equals the path jarvis_listKanbanItems reports', async () => {
        writeBoard(alphaDir, 'sprint.kanban.yaml', board([{ id: 1, name: 'A', status: 'Todo' }]));
        const values = await call('jarvis_listKanbanFilterValues', { ownerName: 'Alpha', boardName: 'sprint' });
        expect(values.path).toBe(path.join(alphaDir, 'sprint.kanban.yaml'));
        const items = await call('jarvis_listKanbanItems', { ownerName: 'Alpha', boardName: 'sprint' });
        expect(values.path).toBe(items.path);
    });
});

describe('REQ_KAN_FILTERVALUES AC-8: jarvis_verifyKanbanSchema reports the values the filter tool leaves out', () => {
    it('AC-8: a card whose status is no declared option is reported as a semantic error', async () => {
        writeBoard(alphaDir, 'kanban.yaml', board([{ id: 1, name: 'Ghost', status: 'Mystery', labels: ['ui'] }]));
        const report = await call('jarvis_verifyKanbanSchema', { ownerName: 'Alpha' });
        expect(report.errors).toContainEqual({
            field: 'status',
            message: 'Value "Mystery" is not a defined status option.',
            item: 'Ghost',
        });
    });

    it('AC-8: a label entry that is not text is reported by jarvis_verifyKanbanSchema', async () => {
        writeBoard(alphaDir, 'kanban.yaml', board([{ id: 1, name: 'Card', status: 'Todo', labels: ['ui', 42] }]));
        const report = await call('jarvis_verifyKanbanSchema', { ownerName: 'Alpha' });
        const fields = (report.errors as Array<{ field: string }>).map(e => e.field);
        expect(fields).toContain('/items/0/labels/1');
    });

    it('control: a board with declared statuses and text labels has no errors', async () => {
        writeBoard(alphaDir, 'kanban.yaml', board([{ id: 1, name: 'Card', status: 'Todo', labels: ['ui'] }]));
        const report = await call('jarvis_verifyKanbanSchema', { ownerName: 'Alpha' });
        expect(report.errors).toEqual([]);
    });
});

describe('REQ_KAN_FILTERVALUES AC-6: no card content, size scales with values not cards', () => {
    it('AC-6: the result carries no card content and only name and count per entry', async () => {
        writeBoard(alphaDir, 'kanban.yaml', board([
            { id: 1, name: 'Secret card name', status: 'Todo', labels: ['ui'], notes: 'secret note text' },
        ]));
        const result = await call('jarvis_listKanbanFilterValues', { ownerName: 'Alpha' });
        const text = JSON.stringify(result);
        expect(text).not.toContain('Secret card name');
        expect(text).not.toContain('secret note text');
        expect(Object.keys(result).sort()).toEqual(['labels', 'path', 'statuses']);
        for (const entry of [...(result.statuses as Entry[]), ...(result.labels as Entry[])]) {
            expect(Object.keys(entry).sort()).toEqual(['count', 'name']);
        }
    });

    it('AC-6: the size grows with the number of distinct values, not with the number of cards', async () => {
        const cardsFor = (n: number) => Array.from({ length: n }, (_, i) => ({
            id: i + 1,
            name: `card-${i + 1}`,
            status: ['Todo', 'Doing', 'Done'][i % 3],
            labels: ['ui', 'api'],
        }));

        writeBoard(alphaDir, 'kanban.yaml', board(cardsFor(3)));
        const small = await call('jarvis_listKanbanFilterValues', { ownerName: 'Alpha' });
        const smallSize = JSON.stringify(small).length;

        writeBoard(alphaDir, 'kanban.yaml', board(cardsFor(400)));
        const large = await call('jarvis_listKanbanFilterValues', { ownerName: 'Alpha' });

        const statuses = large.statuses as Entry[];
        const labels = large.labels as Entry[];
        expect(statuses).toHaveLength(3);
        expect(labels).toHaveLength(2);
        expect(statuses.reduce((sum, e) => sum + e.count, 0)).toBe(400);

        // Only the digits of the counts may differ: at most two extra characters per entry.
        expect(JSON.stringify(large).length - smallSize).toBeLessThanOrEqual(2 * (statuses.length + labels.length));
    });
});
