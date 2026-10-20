/**
 * Handler-level scenarios for jarvis_listKanbanItems, jarvis_listKanbanFilterValues and the verify tool
 * (kanban-list-details). The existing kanban tests call the pure module or assert source text; this file
 * drives the real tool handlers of packages/kanban/src/extension.ts with a fake core API and temp boards.
 *
 * Expectations come from the specifications (SPEC_KAN_LIST, SPEC_KAN_FILTERVALUES, REQ_KAN_LIST AC-9,
 * REQ_KAN_FILTERVALUES AC-1..AC-8) and from the protocol cases T-27 steps 4 and 5, not from observed output.
 * It runs against a fake host: it shows what the handlers do with the inputs they receive, not what
 * VS Code passes to them (protocol cases T-22..T-27 stay NOT RUN until run in the Development Host).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { activate } from '../../packages/kanban/src/extension';

type Handler = (options: { input: unknown }, token: unknown) => Promise<{ content: Array<{ value: string }> }>;
type Json = Record<string, unknown> & { items?: Array<Record<string, unknown>>; statuses?: unknown; labels?: unknown; errors?: Array<{ message: string }> };

const handlers = new Map<string, Handler>();
const actors: Array<{ name: string; folder?: string }> = [];
const kanbanPackage = path.resolve(__dirname, '../../packages/kanban');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kanban-handlers-'));
const sample = fs.readFileSync(path.resolve(__dirname, '../../testdata/kanban/sample.kanban.yaml'), 'utf8').replace(/\r\n/g, '\n');

function writeBoard(owner: string, text: string, fileName = 'kanban.yaml'): string {
    const folder = path.join(tmp, owner);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, fileName), text, 'utf8');
    if (!actors.some(a => a.name === owner)) { actors.push({ name: owner, folder }); }
    return path.join(folder, fileName);
}

function sha256(file: string): string {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

async function call(tool: string, input: Record<string, unknown>): Promise<Json> {
    const handler = handlers.get(tool);
    if (!handler) { throw new Error(`tool not registered: ${tool}`); }
    const result = await handler({ input }, {});
    return JSON.parse(result.content[0].value) as Json;
}

/** A text replacement that silently changes nothing would make a scenario pass for the wrong reason. */
function replaceOnce(text: string, from: string | RegExp, to: string): string {
    const out = text.replace(from, to);
    expect(out, `replacement did not change the board: ${String(from)}`).not.toBe(text);
    return out;
}

const SAMPLE_STATUSES = [{ name: 'Backlog', count: 2 }, { name: 'In Progress', count: 1 }, { name: 'Done', count: 1 }];

beforeAll(() => {
    const api = {
        version: 2,
        listActors: () => actors,
        markActor: () => undefined,
        provisionModuleAssets: async () => undefined,
        registerTool: (name: string, _description: string, handler: Handler) => { handlers.set(name, handler); return { dispose() { /* nothing */ } }; },
    };
    Object.assign(vscode.extensions, { getExtension: () => ({ exports: api }) });
    Object.assign(vscode.workspace, { getConfiguration: () => ({ get: (_key: string, fallback: unknown) => fallback }) });
    Object.assign(vscode.window, { registerCustomEditorProvider: () => ({ dispose() { /* nothing */ } }) });
    activate({
        subscriptions: [],
        extensionUri: vscode.Uri.file(kanbanPackage),
        asAbsolutePath: (p: string) => path.join(kanbanPackage, p),
    } as unknown as vscode.ExtensionContext);
});

afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
});

describe('jarvis_listKanbanItems: the real handler (SPEC_KAN_LIST, REQ_KAN_LIST AC-9, AC-10)', () => {
    it('default list: { path, count, items }, each item exactly id, name, status, labels; no notes', async () => {
        const file = writeBoard('Alpha', sample);
        const r = await call('jarvis_listKanbanItems', { ownerName: 'Alpha' });
        expect(Object.keys(r).sort()).toEqual(['count', 'items', 'path']);
        expect(r.path).toBe(file);
        expect(r.count).toBe(4);
        for (const item of r.items ?? []) { expect(Object.keys(item).sort()).toEqual(['id', 'labels', 'name', 'status']); }
        expect(JSON.stringify(r)).not.toContain('very long note');
        expect(r.items?.[1].labels).toEqual([]);
    });

    it('details true: full items with notes and declared-field values, same keys and count; false equals the default', async () => {
        const full = await call('jarvis_listKanbanItems', { ownerName: 'Alpha', details: true });
        expect(Object.keys(full).sort()).toEqual(['count', 'items', 'path']);
        expect(full.count).toBe(4);
        expect(full.items?.[0].notes).toContain('very long note');
        expect(full.items?.[0].priority).toBe('High');
        expect(full.items?.[1].labels).toEqual([]);
        expect(await call('jarvis_listKanbanItems', { ownerName: 'Alpha', details: false })).toEqual(await call('jarvis_listKanbanItems', { ownerName: 'Alpha' }));
    });

    it('filters give the same matches with and without details (REQ_KAN_LIST AC-10)', async () => {
        const compact = await call('jarvis_listKanbanItems', { ownerName: 'Alpha', status: 'Backlog', labels: ['urgent'] });
        const full = await call('jarvis_listKanbanItems', { ownerName: 'Alpha', status: 'Backlog', labels: ['urgent'], details: true });
        expect(compact.count).toBe(2);
        expect(full.count).toBe(2);
        expect(compact.items?.map(i => i.id)).toEqual(full.items?.map(i => i.id));
        expect(await call('jarvis_listKanbanItems', { ownerName: 'Alpha', status: 'Done', labels: ['urgent'], details: true })).toMatchObject({ count: 0, items: [] });
    });

    it('an invalid details value is the error with no items, and is refused before the owner is resolved', async () => {
        for (const bad of ['true', 'yes', 1, 0, null, {}, []]) {
            expect(await call('jarvis_listKanbanItems', { ownerName: 'Alpha', details: bad })).toEqual({ error: 'details must be true or false' });
        }
        expect(await call('jarvis_listKanbanItems', { ownerName: 'Nobody', details: 'true' })).toEqual({ error: 'details must be true or false' });
        expect(await call('jarvis_listKanbanItems', { details: 'x' })).toEqual({ error: 'details must be true or false' });
    });

    it('owner, board and status errors are the unchanged ones', async () => {
        expect((await call('jarvis_listKanbanItems', { ownerName: 'Alpha', status: 'Nope' })).error).toBe('Unknown status "Nope". Valid: Backlog, In Progress, Done');
        expect(await call('jarvis_listKanbanItems', {})).toEqual({ error: 'ownerName required' });
        expect(await call('jarvis_listKanbanItems', { ownerName: 'Nobody' })).toEqual({ error: 'actor unknown' });
        fs.mkdirSync(path.join(tmp, 'NoBoard'), { recursive: true });
        actors.push({ name: 'NoBoard', folder: path.join(tmp, 'NoBoard') });
        expect(await call('jarvis_listKanbanItems', { ownerName: 'NoBoard' })).toEqual({ error: 'board not found' });
        writeBoard('Broken', 'title: [unclosed\n  - : :');
        expect((await call('jarvis_listKanbanItems', { ownerName: 'Broken' })).error).toMatch(/^YAML parse error/);
    });
});

describe('jarvis_listKanbanFilterValues: the real handler (SPEC_KAN_FILTERVALUES AC-1..AC-9)', () => {
    it('sample board: declared order with counts, labels once, no card content', async () => {
        const file = writeBoard('Sample', sample);
        const r = await call('jarvis_listKanbanFilterValues', { ownerName: 'Sample' });
        expect(Object.keys(r).sort()).toEqual(['labels', 'path', 'statuses']);
        expect(r.path).toBe(file);
        expect(r.statuses).toEqual(SAMPLE_STATUSES);
        expect(r.labels).toEqual([{ name: 'urgent', count: 2 }]);
        expect(JSON.stringify(r)).not.toMatch(/First Task|very long note|"id"/);
    });

    it('AC-8 (statuses): a card whose status is not a declared option is not counted; an empty declared column is listed with 0', async () => {
        const board = [
            'title: V', 'fields:', '  - name: status', '    type: single_select', '    options:',
            '      - name: Todo', '      - name: Review', '      - name: Done',
            'items:',
            '  - { id: 1, name: a, status: Todo }',
            '  - { id: 2, name: b, status: Ghost }',
            '  - { id: 3, name: c, status: Done }',
        ].join('\n');
        writeBoard('Columns', board);
        const r = await call('jarvis_listKanbanFilterValues', { ownerName: 'Columns' });
        expect(r.statuses).toEqual([{ name: 'Todo', count: 1 }, { name: 'Review', count: 0 }, { name: 'Done', count: 1 }]);
        expect(JSON.stringify(r)).not.toContain('Ghost');
    });

    it('AC-8 (labels), T-27 step 4 as written by the Test Designer: item 4 undeclared Archived plus label ghostlabel', async () => {
        const variant = replaceOnce(
            replaceOnce(sample, 'name: Another Urgent\n    status: Backlog', 'name: Another Urgent\n    status: Archived'),
            /(name: Another Urgent\n {4}status: Archived\n {4}priority: High\n {4}labels:\n {6}- urgent)/, '$1\n      - ghostlabel');
        const file = writeBoard('Step4', variant);
        const before = sha256(file);
        const r = await call('jarvis_listKanbanFilterValues', { ownerName: 'Step4', boardName: 'kanban' });
        expect(r.statuses).toEqual([{ name: 'Backlog', count: 1 }, { name: 'In Progress', count: 1 }, { name: 'Done', count: 1 }]);
        expect(r.labels).toEqual([{ name: 'urgent', count: 1 }]);
        expect(JSON.stringify(r)).not.toContain('ghostlabel');
        const verify = await call('jarvis_verifyKanbanSchema', { ownerName: 'Step4', boardName: 'kanban' });
        expect(verify.errors?.map(e => e.message)).toContain('Value "Archived" is not a defined status option.');
        expect(sha256(file)).toBe(before);
    });

    it('AC-8 (labels): a label carried only by an undeclared-status card does not appear; shared labels count the declared cards only', async () => {
        writeBoard('OnlyUndeclared', [
            'title: T', 'fields:', '  - name: status', '    type: single_select', '    options:', '      - name: Backlog', '      - name: Done',
            'items:',
            '  - { id: 1, name: a, status: Backlog, labels: [urgent] }',
            '  - { id: 2, name: b, status: Archived, labels: [urgent, only-on-undeclared] }',
        ].join('\n'));
        const r = await call('jarvis_listKanbanFilterValues', { ownerName: 'OnlyUndeclared' });
        expect(r.statuses).toEqual([{ name: 'Backlog', count: 1 }, { name: 'Done', count: 0 }]);
        expect(r.labels).toEqual([{ name: 'urgent', count: 1 }]);
        // the list tool is not changed by this rule: it still returns the card
        expect((await call('jarvis_listKanbanItems', { ownerName: 'OnlyUndeclared', labels: ['only-on-undeclared'] })).count).toBe(1);
    });

    it('AC-8 (labels): a card with no status, a non-string status or an undeclared status counts no labels', async () => {
        writeBoard('NoneDeclared', [
            'title: T', 'fields:', '  - name: status', '    type: single_select', '    options:', '      - name: A',
            'items:',
            '  - { id: 1, name: a, status: X, labels: [l1] }',
            '  - { id: 2, name: b, labels: [l2] }',
            '  - { id: 3, name: c, status: 5, labels: [l3] }',
        ].join('\n'));
        expect(await call('jarvis_listKanbanFilterValues', { ownerName: 'NoneDeclared' })).toMatchObject({ statuses: [{ name: 'A', count: 0 }], labels: [] });
    });

    it('AC-5/AC-6/AC-8: exact names, once per card, code-point order, non-string entries ignored; only declared-status cards count', async () => {
        writeBoard('Variant', [
            'title: V', 'fields:', '  - name: status', '    type: single_select', '    options:',
            '      - name: Todo', '      - name: Review', '      - name: Done',
            'items:',
            '  - { id: 1, name: a, status: Todo, labels: [Urgent, urgent, urgent, "b c", "\\U0001F600", "\\uFF5E"] }',
            '  - { id: 2, name: b, status: Todo, labels: [urgent, 42, null] }',
            '  - { id: 3, name: c, status: Ghost, labels: [urgent] }',
            '  - { id: 4, name: d, status: Done, labels: not-a-list }',
            '  - { id: 5, name: e, status: Done }',
        ].join('\n'), 'sprint.kanban.yaml');
        const r = await call('jarvis_listKanbanFilterValues', { ownerName: 'Variant', boardName: 'sprint' });
        expect(r.labels).toEqual([
            { name: 'Urgent', count: 1 }, { name: 'b c', count: 1 }, { name: 'urgent', count: 2 },
            { name: '\uFF5E', count: 1 }, { name: '\u{1F600}', count: 1 },
        ]);
        // a name copied from the result is accepted by the list filter (REQ_KAN_FILTERVALUES AC-5)
        expect((await call('jarvis_listKanbanItems', { ownerName: 'Variant', boardName: 'sprint.kanban.yaml', labels: ['Urgent'] })).count).toBe(1);
    });

    it('T-27 step 5 as written by the Test Designer: labels [urgent, 42] on item 2; the non-string entry is reported by verify and not counted', async () => {
        const variant = replaceOnce(sample, 'name: Second Task\n    status: In Progress\n    priority: Medium', 'name: Second Task\n    status: In Progress\n    priority: Medium\n    labels: [urgent, 42]');
        writeBoard('Step5', variant);
        expect((await call('jarvis_listKanbanFilterValues', { ownerName: 'Step5' })).labels).toEqual([{ name: 'urgent', count: 3 }]);
        const verify = await call('jarvis_verifyKanbanSchema', { ownerName: 'Step5' });
        expect(verify.errors?.some(e => /must be string/.test(e.message))).toBe(true);
    });

    it('a scalar labels value is ignored by the overview and reported by verify', async () => {
        const variant = replaceOnce(sample, 'name: Third Task\n    status: Done\n    priority: Low', 'name: Third Task\n    status: Done\n    priority: Low\n    labels: malformed');
        writeBoard('Scalar', variant);
        expect((await call('jarvis_listKanbanFilterValues', { ownerName: 'Scalar' })).labels).toEqual([{ name: 'urgent', count: 2 }]);
        expect(((await call('jarvis_verifyKanbanSchema', { ownerName: 'Scalar' })).errors ?? []).length).toBeGreaterThanOrEqual(1);
    });

    it('error cases: no status field, owner, board, parse; an empty board is not an error', async () => {
        writeBoard('NoStatus', 'title: X\nfields:\n  - name: priority\n    type: single_select\n    options:\n      - name: Low\nitems: []\n');
        expect(await call('jarvis_listKanbanFilterValues', { ownerName: 'NoStatus' })).toEqual({ error: 'board has no status field' });
        expect(await call('jarvis_listKanbanFilterValues', {})).toEqual({ error: 'ownerName required' });
        expect(await call('jarvis_listKanbanFilterValues', { ownerName: 'Nobody' })).toEqual({ error: 'actor unknown' });
        expect(await call('jarvis_listKanbanFilterValues', { ownerName: 'NoBoard' })).toEqual({ error: 'board not found' });
        expect(await call('jarvis_listKanbanFilterValues', { ownerName: 'Sample', boardName: 'no-such-board' })).toEqual({ error: 'board not found' });
        expect((await call('jarvis_listKanbanFilterValues', { ownerName: 'Broken' })).error).toMatch(/^YAML parse error/);
        writeBoard('Empty', 'title: Y\nfields:\n  - name: status\n    type: single_select\n    options:\n      - name: A\n      - name: B\nitems: []\n');
        expect(await call('jarvis_listKanbanFilterValues', { ownerName: 'Empty' })).toMatchObject({ statuses: [{ name: 'A', count: 0 }, { name: 'B', count: 0 }], labels: [] });
        expect(await call('jarvis_listKanbanItems', { ownerName: 'Empty', details: true })).toMatchObject({ count: 0, items: [] });
    });

    it('read-only (SPEC_KAN_FILTERVALUES AC-9, SPEC_KAN_LIST AC-6): no call changes or adds a file', async () => {
        const file = writeBoard('ReadOnly', sample);
        const before = sha256(file);
        await call('jarvis_listKanbanItems', { ownerName: 'ReadOnly', details: true });
        await call('jarvis_listKanbanItems', { ownerName: 'ReadOnly', status: 'Done' });
        await call('jarvis_listKanbanFilterValues', { ownerName: 'ReadOnly' });
        expect(sha256(file)).toBe(before);
        expect(fs.readFileSync(file, 'utf8')).toBe(sample);
        expect(fs.readdirSync(path.dirname(file))).toEqual(['kanban.yaml']);
    });
});
