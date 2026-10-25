/**
 * kanban-list-details CR (D-12): the query logic is a pure module; these tests call it.
 * SPEC_KAN_LIST AC-1..AC-10, SPEC_KAN_FILTERVALUES AC-1..AC-10, REQ_KAN_LIST AC-9, REQ_KAN_FILTERVALUES AC-3/AC-8.
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { BoardData, detailsError, filterValues, selectItems } from '../../packages/kanban/src/boardQuery';

function board(): BoardData {
    return {
        fields: [
            { name: 'status', type: 'single_select', options: [{ name: 'Backlog' }, { name: 'In Progress' }, { name: 'Review' }, { name: 'Done' }] },
            { name: 'priority', type: 'single_select', options: [{ name: 'Low' }, { name: 'High' }] },
            { name: 'rationale', type: 'text' },
        ],
        items: [
            { id: 1, name: 'One', status: 'In Progress', labels: ['urgent', 'ui'], notes: 'Long notes one', priority: 'High', rationale: 'because' },
            { id: 2, name: 'Two', status: 'Backlog', labels: ['ui'], notes: 'n2' },
            { id: 3, name: 'Three', status: 'Done' },
            { id: 4, name: 'Four', status: 'In Progress', labels: ['Urgent'], priority: 'Low' },
        ],
    };
}

const ids = (r: { items: Array<Record<string, unknown>> } | { error: string }): number[] =>
    ('items' in r ? r.items.map(i => i.id as number) : []);

describe('SPEC_KAN_LIST: selectItems (steps 4 to 6)', () => {
    it('AC-1: no filter returns every item, projected', () => {
        const r = selectItems(board(), {});
        expect(ids(r)).toEqual([1, 2, 3, 4]);
    });

    it('AC-3: without details each item carries exactly id, name, status, labels; labels is [] when the card has none', () => {
        const r = selectItems(board(), {}) as { items: Array<Record<string, unknown>> };
        for (const item of r.items) { expect(Object.keys(item).sort()).toEqual(['id', 'labels', 'name', 'status']); }
        expect(r.items[0]).toEqual({ id: 1, name: 'One', status: 'In Progress', labels: ['urgent', 'ui'] });
        expect(r.items[2]).toEqual({ id: 3, name: 'Three', status: 'Done', labels: [] });
        expect(JSON.stringify(r)).not.toContain('Long notes one');
        expect(JSON.stringify(r)).not.toContain('because');
    });

    it('AC-3: details false is the projection', () => {
        expect(selectItems(board(), { details: false })).toEqual(selectItems(board(), {}));
    });

    it('AC-2: status alone, labels alone, and both AND-combined; all requested labels must be present', () => {
        expect(ids(selectItems(board(), { status: 'In Progress' }))).toEqual([1, 4]);
        expect(ids(selectItems(board(), { labels: ['ui'] }))).toEqual([1, 2]);
        expect(ids(selectItems(board(), { labels: ['ui', 'urgent'] }))).toEqual([1]);
        expect(ids(selectItems(board(), { status: 'In Progress', labels: ['ui'] }))).toEqual([1]);
        expect(ids(selectItems(board(), { status: 'Backlog', labels: ['urgent'] }))).toEqual([]);
    });

    it('label matching is exact and case-sensitive', () => {
        expect(ids(selectItems(board(), { labels: ['Urgent'] }))).toEqual([4]);
        expect(ids(selectItems(board(), { labels: ['URGENT'] }))).toEqual([]);
    });

    it('AC-4: a filter matching nothing returns an empty array', () => {
        expect(selectItems(board(), { status: 'Review' })).toEqual({ items: [] });
        expect(selectItems(board(), { labels: ['nope'] })).toEqual({ items: [] });
    });

    it('AC-5: an unknown status is an error naming the valid options, not an empty list', () => {
        expect(selectItems(board(), { status: 'Doing' })).toEqual({ error: 'Unknown status "Doing". Valid: Backlog, In Progress, Review, Done' });
    });

    it('a board with no status field: any status filter is an unknown status with no valid options', () => {
        expect(selectItems({ fields: [], items: [] }, { status: 'x' })).toEqual({ error: 'Unknown status "x". Valid: ' });
    });

    it('AC-8: details true returns every field of the card as stored, notes and declared-field values included', () => {
        const data = board();
        const r = selectItems(data, { details: true }) as { items: Array<Record<string, unknown>> };
        expect(r.items[0]).toEqual({
            id: 1, name: 'One', status: 'In Progress', labels: ['urgent', 'ui'], notes: 'Long notes one', priority: 'High', rationale: 'because',
        });
        expect(r.items[1]).toMatchObject({ id: 2, notes: 'n2', labels: ['ui'] });
    });

    it('AC-8: labels is a list, [] when the card has none; no other key is added or removed', () => {
        const data = board();
        const r = selectItems(data, { details: true }) as { items: Array<Record<string, unknown>> };
        expect(r.items[2]).toEqual({ id: 3, name: 'Three', status: 'Done', labels: [] });
        r.items.forEach((item, n) => {
            const source = data.items![n];
            expect(Object.keys(item).sort()).toEqual([...new Set([...Object.keys(source), 'labels'])].sort());
        });
    });

    it('AC-8: details does not modify the parsed board', () => {
        const data = board();
        const before = JSON.stringify(data);
        selectItems(data, { details: true });
        selectItems(data, {});
        expect(JSON.stringify(data)).toBe(before);
    });

    it('AC-10: details changes only what each item carries: same matches, same order, same errors', () => {
        for (const filter of [{}, { status: 'In Progress' }, { labels: ['ui'] }, { status: 'Done', labels: [] }, { status: 'Review' }, { labels: ['x'] }]) {
            const compact = selectItems(board(), filter);
            const full = selectItems(board(), { ...filter, details: true });
            expect(ids(full)).toEqual(ids(compact));
        }
        expect(selectItems(board(), { status: 'Doing', details: true })).toEqual(selectItems(board(), { status: 'Doing' }));
    });

    it('AC-10: the compact item is a subset of the full item (a card does not change shape)', () => {
        const compact = (selectItems(board(), {}) as { items: Array<Record<string, unknown>> }).items;
        const full = (selectItems(board(), { details: true }) as { items: Array<Record<string, unknown>> }).items;
        compact.forEach((c, n) => { expect(full[n]).toMatchObject(c); });
    });

    it('a board without items yields an empty list instead of throwing', () => {
        expect(selectItems({ fields: board().fields }, {})).toEqual({ items: [] });
    });
});

describe('SPEC_KAN_LIST step 1 / AC-9: detailsError', () => {
    it('absent, true and false are accepted', () => {
        expect(detailsError(undefined)).toBeUndefined();
        expect(detailsError(true)).toBeUndefined();
        expect(detailsError(false)).toBeUndefined();
    });

    it('any other value, null included, is the error "details must be true or false"', () => {
        for (const v of [null, 'true', 'false', 'yes', 1, 0, '', [], {}, NaN]) {
            expect(detailsError(v), String(v)).toBe('details must be true or false');
        }
    });
});

describe('SPEC_KAN_FILTERVALUES: filterValues', () => {
    it('AC-3: every declared status option in declared order with its card count; empty columns carry 0', () => {
        const r = filterValues(board());
        expect(r).toMatchObject({
            statuses: [
                { name: 'Backlog', count: 1 }, { name: 'In Progress', count: 2 }, { name: 'Review', count: 0 }, { name: 'Done', count: 1 },
            ],
        });
    });

    it('AC-4: a board without a status field is an error', () => {
        expect(filterValues({ fields: [{ name: 'priority', type: 'text' }], items: [] })).toEqual({ error: 'board has no status field' });
        expect(filterValues({ items: [] })).toEqual({ error: 'board has no status field' });
    });

    it('AC-5: each label carried by at least one card once with its card count, sorted by name', () => {
        const r = filterValues(board()) as { labels: Array<{ name: string; count: number }> };
        expect(r.labels).toEqual([{ name: 'Urgent', count: 1 }, { name: 'ui', count: 2 }, { name: 'urgent', count: 1 }]);
    });

    it('AC-5: a label twice on one card counts once for that card', () => {
        const data: BoardData = { fields: board().fields, items: [{ id: 1, name: 'a', status: 'Done', labels: ['x', 'x', 'y'] }, { id: 2, name: 'b', status: 'Done', labels: ['x'] }] };
        expect((filterValues(data) as { labels: unknown }).labels).toEqual([{ name: 'x', count: 2 }, { name: 'y', count: 1 }]);
    });

    it('AC-5: sorted in code-point order, independent of the locale', () => {
        const names = ['b', 'B', 'a', 'Z', '_x', 'ä', 'z', '10', '9', '\uFF21', '\u{1F600}', 'é', 'e'];
        const data: BoardData = { fields: board().fields, items: names.map((n, i) => ({ id: i + 1, name: String(i), status: 'Done', labels: [n] })) };
        const sorted = (filterValues(data) as { labels: Array<{ name: string }> }).labels.map(l => l.name);
        const expected = [...names].sort((a, b) => {
            const x = Array.from(a); const y = Array.from(b);
            for (let i = 0; i < Math.min(x.length, y.length); i++) { const d = x[i].codePointAt(0)! - y[i].codePointAt(0)!; if (d) { return d; } }
            return x.length - y.length;
        });
        expect(sorted).toEqual(expected);
        // upper case before lower case, digits before letters (not what a locale compare would give)
        expect(sorted.indexOf('Z')).toBeLessThan(sorted.indexOf('a'));
        expect(sorted.indexOf('9')).toBeLessThan(sorted.indexOf('B'));
        // a character outside the BMP sorts after U+FF21 (a UTF-16 comparison would put it before)
        expect(sorted.indexOf('\uFF21')).toBeLessThan(sorted.indexOf('\u{1F600}'));
    });

    it('AC-6: names are the exact strings as stored, case and spaces significant', () => {
        const data: BoardData = { fields: board().fields, items: [{ id: 1, name: 'a', status: 'Done', labels: ['Needs Review', 'needs review', ' needs review', 'needs  review'] }] };
        const names = (filterValues(data) as { labels: Array<{ name: string }> }).labels.map(l => l.name);
        expect(names).toHaveLength(4);
        expect(names).toContain('Needs Review');
        expect(names).toContain(' needs review');
        expect(names).toContain('needs  review');
    });

    it('AC-6: a name copied from the result is accepted by the list filters', () => {
        const data = board();
        const v = filterValues(data) as { statuses: Array<{ name: string; count: number }>; labels: Array<{ name: string; count: number }> };
        for (const s of v.statuses) { expect(ids(selectItems(data, { status: s.name })).length, s.name).toBe(s.count); }
        for (const l of v.labels) { expect(ids(selectItems(data, { labels: [l.name] })).length, l.name).toBe(l.count); }
    });

    it('AC-7: the result carries no card content', () => {
        const r = filterValues(board()) as Record<string, unknown>;
        expect(Object.keys(r).sort()).toEqual(['labels', 'statuses']);
        for (const e of [...(r.statuses as object[]), ...(r.labels as object[])]) { expect(Object.keys(e).sort()).toEqual(['count', 'name']); }
        const text = JSON.stringify(r);
        for (const content of ['Long notes one', 'because', '"One"', '"Two"', 'High']) { expect(text).not.toContain(content); }
    });

    it('AC-8: an item whose status has no declared option is not counted; the declared options are all that is listed', () => {
        const data: BoardData = { fields: board().fields, items: [{ id: 1, name: 'x', status: 'Mystery' }, { id: 2, name: 'y', status: 'Done' }] };
        const r = filterValues(data) as { statuses: Array<{ name: string; count: number }> };
        expect(r.statuses.map(s => s.name)).toEqual(['Backlog', 'In Progress', 'Review', 'Done']);
        expect(r.statuses.reduce((n, s) => n + s.count, 0)).toBe(1);
    });

    it('AC-8 (labels): a card whose status is not a declared option contributes none of its labels (QM F-1)', () => {
        const data: BoardData = {
            fields: [{ name: 'status', type: 'single_select', options: [{ name: 'Todo' }] }],
            items: [
                { id: 1, name: 'undeclared', status: 'Mystery', labels: ['ghostlabel', 'keep'] },
                { id: 2, name: 'declared', status: 'Todo', labels: ['keep'] },
            ],
        };
        expect(filterValues(data)).toEqual({
            statuses: [{ name: 'Todo', count: 1 }],
            labels: [{ name: 'keep', count: 1 }],
        });
    });

    it('AC-8 (labels): a label carried only by undeclared-status cards does not appear; shared labels count the declared cards only', () => {
        const data: BoardData = {
            fields: board().fields,
            items: [
                { id: 1, name: 'a', status: 'Done', labels: ['shared', 'only-declared'] },
                { id: 2, name: 'b', status: 'Gone', labels: ['shared', 'only-undeclared'] },
                { id: 3, name: 'c', status: 'Gone', labels: ['shared'] },
                { id: 4, name: 'd', status: 'Backlog', labels: ['shared'] },
            ],
        };
        const r = filterValues(data) as { labels: Array<{ name: string; count: number }> };
        expect(r.labels).toEqual([{ name: 'only-declared', count: 1 }, { name: 'shared', count: 2 }]);
    });

    it('AC-8 (labels): a card without a status, with a non-string status or with an empty status counts no labels', () => {
        const data: BoardData = {
            fields: board().fields,
            items: [
                { id: 1, name: 'none', labels: ['x'] },
                { id: 2, name: 'number', status: 7, labels: ['x'] },
                { id: 3, name: 'null', status: null, labels: ['x'] },
                { id: 4, name: 'empty', status: '', labels: ['x'] },
                { id: 5, name: 'case', status: 'done', labels: ['x'] },
                { id: 6, name: 'ok', status: 'Done', labels: ['y'] },
            ],
        };
        const r = filterValues(data) as { statuses: Array<{ name: string; count: number }>; labels: unknown };
        expect(r.labels).toEqual([{ name: 'y', count: 1 }]);
        expect(r.statuses.reduce((n, s) => n + s.count, 0)).toBe(1);
    });

    it('AC-8 (labels): when no card has a declared status there are no labels at all', () => {
        const data: BoardData = { fields: board().fields, items: [{ id: 1, name: 'a', status: 'Nope', labels: ['x', 'y'] }] };
        expect((filterValues(data) as { labels: unknown }).labels).toEqual([]);
    });

    it('AC-8 (labels): the label counts equal the cards the list filter returns among cards of declared status', () => {
        const data: BoardData = {
            fields: board().fields,
            items: [
                { id: 1, name: 'a', status: 'Done', labels: ['x', 'y'] },
                { id: 2, name: 'b', status: 'Mystery', labels: ['x', 'z'] },
                { id: 3, name: 'c', status: 'Review', labels: ['x'] },
            ],
        };
        const declaredOnly: BoardData = { fields: data.fields, items: data.items!.filter(i => i.status !== 'Mystery') };
        const v = filterValues(data) as { labels: Array<{ name: string; count: number }> };
        expect(v.labels.map(l => l.name)).toEqual(['x', 'y']);
        for (const l of v.labels) { expect(ids(selectItems(declaredOnly, { labels: [l.name] })).length, l.name).toBe(l.count); }
    });

    it('AC-8: a label entry that is not a string and a labels value that is not a list are neither listed nor counted', () => {
        const data: BoardData = {
            fields: board().fields,
            items: [
                { id: 1, name: 'a', status: 'Done', labels: ['ok', 42, null, { x: 1 }, ['nested'], true] },
                { id: 2, name: 'b', status: 'Done', labels: 'ok' },
                { id: 3, name: 'c', status: 'Done', labels: { ok: 1 } },
            ],
        };
        expect((filterValues(data) as { labels: unknown }).labels).toEqual([{ name: 'ok', count: 1 }]);
    });

    it('a label no card carries does not appear; a board without items has empty counts', () => {
        const r = filterValues({ fields: board().fields, items: [] }) as { statuses: Array<{ count: number }>; labels: unknown[] };
        expect(r.labels).toEqual([]);
        expect(r.statuses.every(s => s.count === 0)).toBe(true);
    });

    it('the parsed board is not modified', () => {
        const data = board();
        const before = JSON.stringify(data);
        filterValues(data);
        expect(JSON.stringify(data)).toBe(before);
    });
});

describe('module boundary (D-12) and wiring of the two tools', () => {
    const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');
    const moduleSrc = read('packages/kanban/src/boardQuery.ts');
    const ext = read('packages/kanban/src/extension.ts');
    const pkg = JSON.parse(read('packages/kanban/package.json'));
    const tool = (name: string) => pkg.contributes.languageModelTools.find((t: { name: string }) => t.name === name);

    it('boardQuery.ts has no vscode import and no file access', () => {
        expect(moduleSrc).not.toMatch(/from 'vscode'|require\('vscode'\)|from 'fs'|from 'path'/);
    });

    it('SPEC_KAN_LIST step 1: the handler refuses an invalid details before it resolves the owner or reads the board', () => {
        const start = ext.indexOf("'jarvis_listKanbanItems'");
        const block = ext.slice(start, ext.indexOf("'jarvis_listKanbanFilterValues'", start));
        expect(block.indexOf('detailsError(input.details)')).toBeGreaterThan(-1);
        expect(block.indexOf('detailsError(input.details)')).toBeLessThan(block.indexOf('loadBoardForQuery('));
        expect(block).toContain('selectItems(');
        expect(block).toContain('count: selected.items.length');
    });

    it('SPEC_KAN_LIST AC-11: registerTool description and languageModelTools entry', () => {
        expect(ext).toContain("'Lists kanban board items, optionally filtered by status or labels. Returns a compact projection (id, name, status, labels) per item; details: true returns the full items.'");
        const t = tool('jarvis_listKanbanItems');
        expect(t.modelDescription).toBe('jarvis_kanban: Lists kanban board items with optional status and/or labels filter. Returns a compact projection (id, name, status, labels) per item; details: true returns the full items, notes included. ownerName is required.');
        expect(t.inputSchema.properties.details.type).toBe('boolean');
        expect(t.inputSchema.required).toEqual(['ownerName']);
        expect(t.toolReferenceName).toBe('jarvis_kanban_listKanbanItems');
    });

    it('SPEC_KAN_FILTERVALUES AC-10: registered, declared with ownerName required, description and icon as specified', () => {
        expect(ext).toContain("'jarvis_listKanbanFilterValues'");
        expect(ext).toContain("'Lists the status values (columns, empty ones included) and the labels of a kanban board with the number of cards for each, to build list filters.'");
        const t = tool('jarvis_listKanbanFilterValues');
        expect(t.toolReferenceName).toBe('jarvis_kanban_listKanbanFilterValues');
        expect(t.icon).toBe('$(filter)');
        expect(t.modelDescription).toBe('jarvis_kanban: Returns the status values (columns, empty ones included) and the labels in use on a kanban board, each with the number of cards. Use these values as filters for jarvis_listKanbanItems. ownerName is required.');
        expect(t.inputSchema.required).toEqual(['ownerName']);
        expect(Object.keys(t.inputSchema.properties).sort()).toEqual(['boardName', 'ownerName']);
    });

    it('SPEC_KAN_FILTERVALUES AC-9 / SPEC_KAN_LIST AC-6: the read-only tools write no file and refresh no panel', () => {
        const start = ext.indexOf('async function loadBoardForQuery');
        const block = ext.slice(start, ext.indexOf("// Tool: jarvis_updateKanbanFields"));
        expect(block).not.toMatch(/writeFileSync|refreshKanbanPanel|openKanbanPanel/);
    });
});

describe('skill asset and README (SPEC_KAN_SKILLCONTENT AC-7, AC-8; REQ_KAN_SKILLCONTENT AC-10)', () => {
    const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');
    const skill = read('packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md');
    const ext = read('packages/kanban/src/extension.ts');
    const registered = [...ext.matchAll(/api\.registerTool\(\s*'(jarvis_\w+)'/g)].map(m => m[1]);

    it('AC-7: the Tools table lists exactly the nine registered tools, each once', () => {
        const section = skill.slice(skill.indexOf('## Tools'), skill.indexOf('## Owner Resolution'));
        const listed = [...section.matchAll(/^\| `(jarvis_\w+)` \|/gm)].map(m => m[1]);
        expect(registered).toHaveLength(9);
        expect([...listed].sort()).toEqual([...registered].sort());
        expect(new Set(listed).size).toBe(9);
    });

    it('AC-8: the Workflow shows the values tool before the list tool, the compact default and details', () => {
        const workflow = skill.slice(skill.indexOf('## Workflow'));
        expect(workflow.indexOf('jarvis_listKanbanFilterValues')).toBeGreaterThan(-1);
        expect(workflow.indexOf('jarvis_listKanbanFilterValues')).toBeLessThan(workflow.indexOf('jarvis_listKanbanItems'));
        expect(workflow).toMatch(/compact projection by default/);
        expect(workflow).toContain('`id`, `name`, `status`, `labels`');
        expect(workflow).toContain('`details: true`');
    });

    it('I-1: the skill no longer advises fetching an item by id', () => {
        expect(skill).not.toMatch(/fetch full details|by item id|read the item by/i);
        expect(skill).not.toContain('jarvis_whoAmI');
    });

    it('README lists both tools', () => {
        const readme = read('packages/kanban/README.md');
        expect(readme).toContain('| `jarvis_listKanbanItems` |');
        expect(readme).toContain('| `jarvis_listKanbanFilterValues` |');
        expect(readme).toContain('`details: true`');
    });
});
