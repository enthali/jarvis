/**
 * Handler-level tests for the kanban write tools, run against the sample fixture.
 * Covers the CM plan for tst-kanban-list-details:
 *   - jarvis_addKanbanItem: T-1 to T-6 (T-6 is the top-level id rejection, T-6b)
 *   - jarvis_deleteKanbanItem: T-7 to T-9
 *   - jarvis_updateKanbanFields: T-15 to T-20
 *   - jarvis_listKanbanItems details: T-24 (before/after hash)
 *   - jarvis_listKanbanFilterValues: T-27 step 6 (no refresh, no log)
 * The handlers are captured from activate() with the vscode mock. refreshKanbanPanel is mocked.
 * Every success asserts refreshKanbanPanel was called with the board path; every error asserts
 * the board bytes are unchanged and that no refresh happened.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'yaml';
import * as vscode from 'vscode';
import { activate } from '../../packages/kanban/src/extension';
import { refreshKanbanPanel } from '../../packages/kanban/src/kanbanPanel';

vi.mock('../../packages/kanban/src/kanbanPanel', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../packages/kanban/src/kanbanPanel')>()),
    refreshKanbanPanel: vi.fn(),
}));

type ToolResult = { content: Array<{ value: string }> };
type Handler = (options: { input: unknown }, token: unknown) => Promise<ToolResult>;
type Board = {
    nextId?: number;
    fields: Array<{ name: string; type: string; options?: Array<{ name: string; color?: string }> }>;
    items: Array<Record<string, unknown>>;
};

const OWNER = 'Change Manager';
const repoRoot = path.resolve(__dirname, '..', '..');
const sampleText = fs.readFileSync(path.join(repoRoot, 'testdata', 'kanban', 'sample.kanban.yaml'), 'utf-8');
const refresh = vi.mocked(refreshKanbanPanel);
const handlers = new Map<string, Handler>();
const channel = {
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn(),
    append: vi.fn(), appendLine: vi.fn(), replace: vi.fn(), show: vi.fn(), hide: vi.fn(),
    clear: vi.fn(), dispose: vi.fn(),
};
let root = '';
let cmDir = '';
let boardPath = '';

function readBoard(): string {
    return fs.readFileSync(boardPath, 'utf-8');
}

function parsedBoard(): Board {
    return yaml.parse(readBoard()) as Board;
}

function sha256(text: string): string {
    return crypto.createHash('sha256').update(text, 'utf-8').digest('hex');
}

function writeVariant(mutate: (board: Board) => void): void {
    const board = yaml.parse(sampleText) as Board;
    mutate(board);
    fs.writeFileSync(boardPath, yaml.stringify(board), 'utf-8');
}

async function call(name: string, input: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const handler = handlers.get(name);
    if (!handler) { throw new Error(`tool not registered: ${name}`); }
    const result = await handler(
        { input: { ownerName: OWNER, ...input } },
        new vscode.CancellationTokenSource().token
    );
    return JSON.parse(result.content[0].value) as Record<string, unknown>;
}

/** Asserts a rejected call returns the expected result, leaves the board bytes unchanged and does not refresh. */
async function expectRejected(name: string, input: Record<string, unknown>, expected: Record<string, unknown>): Promise<void> {
    const before = readBoard();
    refresh.mockClear();
    expect(await call(name, input)).toEqual(expected);
    expect(readBoard()).toBe(before);
    expect(refresh).not.toHaveBeenCalled();
}

beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'kanban-write-'));
    cmDir = path.join(root, OWNER);
    fs.mkdirSync(cmDir);
    boardPath = path.join(cmDir, 'kanban.yaml');

    const api = {
        version: 2,
        listActors: () => [{ id: OWNER, name: OWNER, summary: '', folder: cmDir }],
        registerTool: (name: string, _description: string, handler: Handler) => {
            handlers.set(name, handler);
            return { dispose: () => {} };
        },
        provisionModuleAssets: async () => undefined,
    };
    vi.spyOn(vscode.extensions, 'getExtension').mockReturnValue({ exports: api } as never);
    Object.assign(vscode.window, { registerCustomEditorProvider: () => ({ dispose: () => {} }) });
    vi.spyOn(vscode.window, 'createOutputChannel').mockReturnValue(channel as never);

    const context = {
        subscriptions: [] as Array<{ dispose: () => void }>,
        extensionUri: vscode.Uri.file(repoRoot),
        asAbsolutePath: (p: string) => p,
    };
    activate(context as never);
});

beforeEach(() => {
    vi.clearAllMocks();
    fs.writeFileSync(boardPath, sampleText, 'utf-8');
});

afterEach(() => {
    fs.rmSync(boardPath, { force: true });
});

afterAll(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
});

describe('REQ_KAN_ADD and REQ_KAN_WRITEVALID: jarvis_addKanbanItem (T-1..T-6)', () => {
    it('T-1: happy path assigns the next id, increments nextId and refreshes the panel', async () => {
        const result = await call('jarvis_addKanbanItem', {
            name: 'New Task', status: 'Backlog', fields: { priority: 'High' },
        });
        expect(result).toEqual({ path: boardPath, added: true, itemId: 5 });

        const board = parsedBoard();
        expect(board.items[board.items.length - 1]).toEqual({
            id: 5, name: 'New Task', status: 'Backlog', priority: 'High',
        });
        expect(board.nextId).toBe(6);
        expect(refresh).toHaveBeenCalledWith(boardPath);
    });

    it('T-2: status defaults to the first declared option', async () => {
        const result = await call('jarvis_addKanbanItem', { name: 'Defaulted' });
        expect(result).toEqual({ path: boardPath, added: true, itemId: 5 });

        const board = parsedBoard();
        expect(board.items[board.items.length - 1]).toMatchObject({ id: 5, name: 'Defaulted', status: 'Backlog' });
        expect(refresh).toHaveBeenCalledWith(boardPath);
    });

    it('T-3: nextId is derived from the maximum item id when absent, then written back', async () => {
        writeVariant(board => { delete board.nextId; });
        const result = await call('jarvis_addKanbanItem', { name: 'First After Remove' });
        expect(result).toEqual({ path: boardPath, added: true, itemId: 5 });

        const board = parsedBoard();
        expect(board.items[board.items.length - 1]).toMatchObject({ id: 5, name: 'First After Remove' });
        expect(board.nextId).toBe(6);
        expect(refresh).toHaveBeenCalledWith(boardPath);
    });

    it('T-4: an invalid single_select value is rejected before writing and names the valid options', async () => {
        await expectRejected('jarvis_addKanbanItem', { name: 'Bad', fields: { priority: 'Critical' } }, {
            error: 'Invalid value "Critical" for field "priority". Valid: Low, Medium, High',
        });
    });

    it('T-5: an undeclared field key is an error, not a successful write', async () => {
        // Variant: the key is given in fields. The top-level form is decided under F3 (SD), not here.
        await expectRejected('jarvis_addKanbanItem', { name: 'Ghost', fields: { silentTrap: 'invisible' } }, {
            error: 'Unknown field "silentTrap". Declared fields: status, priority',
        });
    });

    it('T-5b (rule 6): an undeclared top-level key is rejected and the message points to fields', async () => {
        await expectRejected('jarvis_addKanbanItem', { name: 'Ghost', silentTrap: 'invisible' }, {
            error: 'Unknown parameter "silentTrap". Declared fields: status, priority. Field values go under "fields".',
        });
    });

    it('T-5c (rule 6): a top-level declared field name is rejected with the same message', async () => {
        await expectRejected('jarvis_addKanbanItem', { name: 'Top Level', priority: 'High' }, {
            error: 'Unknown parameter "priority". Declared fields: status, priority. Field values go under "fields".',
        });
    });

    it('T-6a: a builtin key given inside fields is rejected and the board is unchanged', async () => {
        await expectRejected('jarvis_addKanbanItem', { name: 'Grab Id', fields: { id: '999' } }, {
            error: '"id" must be set as a top-level parameter, not via fields.',
        });
    });

    it('T-6b: a top-level id is rejected, not silently dropped', async () => {
        await expectRejected('jarvis_addKanbanItem', { name: 'Grab Id', id: 999 }, {
            error: 'Cannot supply "id" — ids are auto-assigned.',
        });
    });
});

describe('REQ_KAN_DELETE: jarvis_deleteKanbanItem (T-7..T-9)', () => {
    it('T-7: removes the item, leaves nextId unchanged and refreshes the panel', async () => {
        const result = await call('jarvis_deleteKanbanItem', { itemId: 2 });
        expect(result).toEqual({ path: boardPath, deleted: true, itemId: 2 });

        const board = parsedBoard();
        expect(board.items.map(i => i.id)).toEqual([1, 3, 4]);
        expect(board.nextId).toBe(5);
        expect(refresh).toHaveBeenCalledWith(boardPath);
    });

    it('T-8: a missing id returns an error and does not write', async () => {
        await expectRejected('jarvis_deleteKanbanItem', { itemId: 9999 }, {
            error: 'item not found', itemId: 9999,
        });
    });

    it('T-9: delete removes item 2 and leaves the other items and nextId unchanged', async () => {
        const parsedBefore = parsedBoard();

        await call('jarvis_deleteKanbanItem', { itemId: 2 });
        const parsedAfter = parsedBoard();
        expect(parsedAfter.items.some(i => i.id === 2)).toBe(false);
        expect(parsedAfter.items).toEqual(parsedBefore.items.filter(i => i.id !== 2));
        expect(parsedAfter.nextId).toBe(parsedBefore.nextId);
        expect(refresh).toHaveBeenCalledWith(boardPath);
    });

    it('T-9b: after deleting the highest id on a board without nextId, add never reuses it', async () => {
        writeVariant(board => { delete board.nextId; });

        const deleted = await call('jarvis_deleteKanbanItem', { itemId: 4 });
        expect(deleted).toEqual({ path: boardPath, deleted: true, itemId: 4 });

        const added = await call('jarvis_addKanbanItem', { name: 'After Delete' });
        expect(added.itemId).not.toBe(4);
        expect(added).toEqual({ path: boardPath, added: true, itemId: 5 });
    });
});

describe('REQ_KAN_FIELDS: jarvis_updateKanbanFields (T-15..T-20)', () => {
    it('T-15: adds a text field and a single_select field with options', async () => {
        const first = await call('jarvis_updateKanbanFields', {
            operation: 'addField', fieldName: 'rationale', fieldType: 'text',
        });
        expect(first).toEqual({ path: boardPath, updated: true, operation: 'addField' });
        expect(refresh).toHaveBeenCalledTimes(1);

        const second = await call('jarvis_updateKanbanFields', {
            operation: 'addField', fieldName: 'severity', fieldType: 'single_select',
            options: [{ name: 'Low' }, { name: 'Medium' }, { name: 'High' }],
        });
        expect(second).toEqual({ path: boardPath, updated: true, operation: 'addField' });
        expect(refresh).toHaveBeenCalledTimes(2);
        expect(refresh).toHaveBeenCalledWith(boardPath);

        const board = parsedBoard();
        const rationale = board.fields.find(f => f.name === 'rationale');
        const severity = board.fields.find(f => f.name === 'severity');
        expect(rationale).toEqual({ name: 'rationale', type: 'text' });
        expect(severity?.type).toBe('single_select');
        expect(severity?.options?.map(o => o.name)).toEqual(['Low', 'Medium', 'High']);
    });

    it('T-16: adding a field named status is rejected', async () => {
        await expectRejected('jarvis_updateKanbanFields', {
            operation: 'addField', fieldName: 'status', fieldType: 'single_select',
            options: [{ name: 'A' }, { name: 'B' }],
        }, {
            error: 'Cannot add a field named "status" — it already exists as the column driver.',
        });
    });

    it('T-17: removes an unused field and leaves the rest of the board unchanged', async () => {
        await call('jarvis_updateKanbanFields', { operation: 'addField', fieldName: 'temp', fieldType: 'text' });
        refresh.mockClear();

        const result = await call('jarvis_updateKanbanFields', { operation: 'removeField', fieldName: 'temp' });
        expect(result).toEqual({ path: boardPath, updated: true, operation: 'removeField' });
        expect(refresh).toHaveBeenCalledWith(boardPath);

        expect(parsedBoard()).toEqual(yaml.parse(sampleText));
    });

    it('T-18: refuses to remove a field that an item references, and lists the item ids', async () => {
        await call('jarvis_updateKanbanFields', {
            operation: 'addField', fieldName: 'region', fieldType: 'single_select',
            options: [{ name: 'EU' }, { name: 'US' }],
        });
        const added = await call('jarvis_addKanbanItem', { name: 'Region item', fields: { region: 'EU' } });
        expect(added).toEqual({ path: boardPath, added: true, itemId: 5 });

        await expectRejected('jarvis_updateKanbanFields', { operation: 'removeField', fieldName: 'region' }, {
            error: 'Cannot remove field "region" — referenced by items: 5',
        });
        expect(parsedBoard().fields.some(f => f.name === 'region')).toBe(true);
    });

    it('T-19: adds an option once, and rejects a duplicate option and an option on a text field', async () => {
        writeVariant(board => { board.fields.push({ name: 'rationale', type: 'text' }); });

        const added = await call('jarvis_updateKanbanFields', {
            operation: 'addOption', fieldName: 'priority', optionName: 'Critical',
        });
        expect(added).toEqual({ path: boardPath, updated: true, operation: 'addOption' });
        expect(refresh).toHaveBeenCalledWith(boardPath);

        await expectRejected('jarvis_updateKanbanFields', {
            operation: 'addOption', fieldName: 'priority', optionName: 'Critical',
        }, {
            error: 'Option "Critical" already exists on field "priority".',
        });

        await expectRejected('jarvis_updateKanbanFields', {
            operation: 'addOption', fieldName: 'rationale', optionName: 'Critical',
        }, {
            error: 'Cannot add options to a text field.',
        });

        const priority = parsedBoard().fields.find(f => f.name === 'priority');
        expect(priority?.options?.filter(o => o.name === 'Critical')).toHaveLength(1);
    });

    it('T-20: removeOption refuses a referenced option and refuses to leave a field without options', async () => {
        await expectRejected('jarvis_updateKanbanFields', {
            operation: 'removeOption', fieldName: 'priority', optionName: 'Low',
        }, {
            error: 'Cannot remove option "Low" — referenced by items: 3',
        });

        await call('jarvis_updateKanbanFields', {
            operation: 'addField', fieldName: 'temp', fieldType: 'single_select', options: [{ name: 'Only' }],
        });

        await expectRejected('jarvis_updateKanbanFields', {
            operation: 'removeOption', fieldName: 'temp', optionName: 'Only',
        }, {
            error: 'Cannot remove the last option from field "temp".',
        });

        const temp = parsedBoard().fields.find(f => f.name === 'temp');
        expect(temp?.options?.map(o => o.name)).toEqual(['Only']);
    });
});

describe('REQ_KAN_LIST AC-9 and REQ_KAN_FILTERVALUES AC-9: no-write and no-refresh checks (T-24, T-27 step 6)', () => {
    it('T-24: details other than true or false is an error and the board file hash is unchanged', async () => {
        const before = sha256(readBoard());
        expect(await call('jarvis_listKanbanItems', { details: 'true' })).toEqual({
            error: 'details must be true or false',
        });
        expect(sha256(readBoard())).toBe(before);
        expect(refresh).not.toHaveBeenCalled();
    });

    it('T-27 step 5: a non-string label is left unchanged by the read tools and reported by verify', async () => {
        writeVariant(board => { board.items[1].labels = ['urgent', 42]; });
        const before = sha256(readBoard());

        expect(await call('jarvis_listKanbanFilterValues')).toMatchObject({ path: boardPath });
        expect(sha256(readBoard())).toBe(before);

        const verify = await call('jarvis_verifyKanbanSchema');
        expect(sha256(readBoard())).toBe(before);
        expect(verify.errors).toContainEqual(expect.objectContaining({
            field: '/items/1/labels/1', message: 'must be string',
        }));
        expect(refresh).not.toHaveBeenCalled();
    });

    it('T-27 step 6: the overview call does not refresh the open panel and does not log to the Jarvis Kanban channel', async () => {
        expect(await call('jarvis_openKanbanBoard', { boardName: 'kanban' })).toEqual({ opened: true, path: boardPath });

        vi.clearAllMocks();
        const before = sha256(readBoard());

        const result = await call('jarvis_listKanbanFilterValues', { boardName: 'kanban' });
        expect(result).toMatchObject({ path: boardPath });
        expect(refresh).not.toHaveBeenCalled();
        for (const fn of Object.values(channel)) {
            expect(fn).not.toHaveBeenCalled();
        }
        expect(sha256(readBoard())).toBe(before);
    });
});
