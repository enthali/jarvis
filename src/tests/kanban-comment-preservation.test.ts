/**
 * Unit tests for kanban-yaml-comment-preservation (#53).
 *
 * TC-1: Source-level: updateKanbanItem uses parseDocument, not parse+stringify
 * TC-2: Functional: round-trip through Document API preserves comments
 * TC-3: Functional: only the changed field appears in the diff
 */
import { beforeAll, describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'yaml';
import * as vscode from 'vscode';
import { activate } from '../../packages/kanban/src/extension';

vi.mock('../../packages/kanban/src/kanbanPanel', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../packages/kanban/src/kanbanPanel')>()),
    refreshKanbanPanel: vi.fn(),
}));

const kanbanSrcDir = path.resolve(__dirname, '..', '..', 'packages', 'kanban', 'src');
const extensionSrc = fs.readFileSync(path.join(kanbanSrcDir, 'extension.ts'), 'utf-8');

// Extract the jarvis_updateKanbanItem tool handler section
const toolStart = extensionSrc.indexOf("'jarvis_updateKanbanItem'");
const toolEnd = extensionSrc.indexOf("// Tool: jarvis_addKanbanItem", toolStart);
const toolHandlerSrc = extensionSrc.slice(toolStart, toolEnd);

describe('TC-1: updateKanbanItem uses Document-based round-trip', () => {
    it('uses yaml.parseDocument (not yaml.parse) for the write path', () => {
        expect(toolHandlerSrc).toContain('yaml.parseDocument(');
    });

    it('does not use yaml.stringify for the write-back', () => {
        expect(toolHandlerSrc).not.toContain('yaml.stringify(');
    });

    it('mutates the document node directly via itemNode.set', () => {
        expect(toolHandlerSrc).toContain('itemNode.set(');
    });

    it('delegates to validateItemValues for all change validation', () => {
        expect(toolHandlerSrc).toContain('validateItemValues(input.changes');
    });
});

describe('TC-1 (behavioural): an update write keeps comments and long scalars intact', () => {
    const OWNER = 'Change Manager';
    const longNotes = Array.from({ length: 24 }, (_, i) => `word${i}`).join(' ');
    const boardYaml = [
        '# Board header comment',
        'nextId: 3',
        'fields:',
        '  - name: status',
        '    type: single_select',
        '    options:',
        '      - name: Backlog',
        '      - name: Done',
        'items:',
        '  - id: 1',
        '    name: First task',
        '    status: Backlog',
        '    # Inline developer note',
        `    notes: "${longNotes}"`,
        '  - id: 2',
        '    name: Second task',
        '    status: Done',
        '',
    ].join('\n');
    const handlers = new Map<string, (options: { input: unknown }, token: unknown) => Promise<{ content: Array<{ value: string }> }>>();
    const channel = {
        info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn(),
        append: vi.fn(), appendLine: vi.fn(), replace: vi.fn(), show: vi.fn(), hide: vi.fn(),
        clear: vi.fn(), dispose: vi.fn(),
    };
    let boardPath = '';

    beforeAll(() => {
        const ownerDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kanban-tc1-')), OWNER);
        fs.mkdirSync(ownerDir, { recursive: true });
        boardPath = path.join(ownerDir, 'kanban.yaml');
        const api = {
            version: 2,
            listActors: () => [{ id: OWNER, name: OWNER, summary: '', folder: ownerDir }],
            registerTool: (name: string, _description: string, handler: (options: { input: unknown }, token: unknown) => Promise<{ content: Array<{ value: string }> }>) => {
                handlers.set(name, handler);
                return { dispose: () => {} };
            },
            provisionModuleAssets: async () => undefined,
        };
        vi.spyOn(vscode.extensions, 'getExtension').mockReturnValue({ exports: api } as never);
        Object.assign(vscode.window, { registerCustomEditorProvider: () => ({ dispose: () => {} }) });
        vi.spyOn(vscode.window, 'createOutputChannel').mockReturnValue(channel as never);
        activate({
            subscriptions: [] as Array<{ dispose: () => void }>,
            extensionUri: vscode.Uri.file(path.resolve(__dirname, '..', '..')),
            asAbsolutePath: (p: string) => p,
        } as never);
    });

    it('an update keeps the header and inline comments and leaves the long notes line unfolded', async () => {
        fs.writeFileSync(boardPath, boardYaml, 'utf-8');
        const handler = handlers.get('jarvis_updateKanbanItem');
        expect(handler).toBeDefined();
        const result = await handler!(
            { input: { ownerName: OWNER, itemId: 1, changes: { status: 'Done' } } },
            new vscode.CancellationTokenSource().token
        );
        expect(JSON.parse(result.content[0].value)).toMatchObject({ path: boardPath, updated: true, itemId: 1 });

        const lines = fs.readFileSync(boardPath, 'utf-8').replace(/\r\n/g, '\n').split('\n');
        expect(lines).toContain('# Board header comment');
        expect(lines).toContain('    # Inline developer note');
        expect(lines).toContain('    status: Done');
        // The default 80-column emitter would split this line; lineWidth 0 keeps it whole.
        expect(lines).toContain(`    notes: "${longNotes}"`);
    });
});

describe('TC-2: Document API round-trip preserves comments', () => {
    const boardYaml = `# Board header comment
title: Sprint 1
fields:
  - name: status
    type: single_select
    options:
      - name: Backlog
      - name: In Progress # WIP limit applies
      - name: Done
items:
  - id: 1
    name: First task
    status: Backlog
    # Inline developer note
    notes: "some notes here"
  - id: 2
    name: Second task
    status: In Progress
`;

    it('comments survive an update to a different field', () => {
        const doc = yaml.parseDocument(boardYaml);
        const items = doc.get('items') as yaml.YAMLSeq;
        const item = items.get(0) as yaml.YAMLMap;
        item.set('status', 'Done');

        const result = doc.toString();

        // Header comment preserved
        expect(result).toContain('# Board header comment');
        // Inline comment preserved
        expect(result).toContain('# WIP limit applies');
        // Developer note comment preserved
        expect(result).toContain('# Inline developer note');
        // The change was applied
        expect(result).toContain('status: Done');
        // Other item unchanged
        expect(result).toContain('status: In Progress');
    });

    it('key order is preserved after mutation', () => {
        const doc = yaml.parseDocument(boardYaml);
        const items = doc.get('items') as yaml.YAMLSeq;
        const item = items.get(0) as yaml.YAMLMap;
        item.set('status', 'Done');

        const result = doc.toString();

        // id still comes before name, name before status in the output
        const idPos = result.indexOf('id: 1');
        const namePos = result.indexOf('name: First task');
        const statusPos = result.indexOf('status: Done');
        expect(idPos).toBeGreaterThan(-1);
        expect(namePos).toBeGreaterThan(-1);
        expect(statusPos).toBeGreaterThan(-1);
        expect(idPos).toBeLessThan(namePos);
        expect(namePos).toBeLessThan(statusPos);
    });
});

describe('TC-3: diff is confined to the changed field', () => {
    const boardYaml = `title: My Board
fields:
  - name: status
    type: single_select
    options:
      - name: Open
      - name: Closed
items:
  - id: 1
    name: Fix bug
    status: Open
    priority: High
  - id: 2
    name: Add feature
    status: Open
    priority: Low
`;

    it('unchanged items keep their parsed values after the write', () => {
        const doc = yaml.parseDocument(boardYaml);
        const items = doc.get('items') as yaml.YAMLSeq;
        const item = items.get(0) as yaml.YAMLMap;
        item.set('status', 'Closed');

        const parsed = yaml.parse(doc.toString()) as { items: Array<Record<string, unknown>> };
        const original = yaml.parse(boardYaml) as { items: Array<Record<string, unknown>> };
        expect(parsed.items[0]).toEqual({ ...original.items[0], status: 'Closed' });
        expect(parsed.items[1]).toEqual(original.items[1]);
    });
});
