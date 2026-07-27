/**
 * Unit tests for kanban-yaml-comment-preservation (#53).
 *
 * TC-1: Source-level: updateKanbanItem uses parseDocument, not parse+stringify
 * TC-2: Functional: round-trip through Document API preserves comments
 * TC-3: Functional: only the changed field appears in the diff
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

const kanbanSrcDir = path.resolve(__dirname, '..', '..', 'packages', 'kanban', 'src');
const extensionSrc = fs.readFileSync(path.join(kanbanSrcDir, 'extension.ts'), 'utf-8');

// Extract the jarvis_updateKanbanItem tool handler section
const toolStart = extensionSrc.indexOf("'jarvis_updateKanbanItem'");
const toolEnd = extensionSrc.indexOf("// Tool: jarvis_openKanbanBoard", toolStart);
const toolHandlerSrc = extensionSrc.slice(toolStart, toolEnd);

describe('TC-1: updateKanbanItem uses Document-based round-trip', () => {
    it('uses yaml.parseDocument (not yaml.parse) for the write path', () => {
        expect(toolHandlerSrc).toContain('yaml.parseDocument(');
    });

    it('does not use yaml.stringify for the write-back', () => {
        expect(toolHandlerSrc).not.toContain('yaml.stringify(');
    });

    it('serializes via doc.toString()', () => {
        expect(toolHandlerSrc).toContain('doc.toString()');
    });

    it('mutates the document node directly via itemNode.set', () => {
        expect(toolHandlerSrc).toContain('itemNode.set(');
    });

    it('skips id field (immutable guard)', () => {
        expect(toolHandlerSrc).toMatch(/if\s*\(key\s*===\s*'id'\)/);
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

    it('unchanged lines are byte-identical', () => {
        const doc = yaml.parseDocument(boardYaml);
        const items = doc.get('items') as yaml.YAMLSeq;
        const item = items.get(0) as yaml.YAMLMap;
        item.set('status', 'Closed');

        const result = doc.toString();
        const originalLines = boardYaml.split('\n');
        const resultLines = result.split('\n');

        // Count differing lines — should be exactly 1 (the status line)
        const diffs = resultLines.filter((line, i) => line !== originalLines[i]);
        expect(diffs).toHaveLength(1);
        expect(diffs[0].trim()).toBe('status: Closed');
    });
});
