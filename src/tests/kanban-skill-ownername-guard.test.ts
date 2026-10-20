/**
 * Static guard for the bundled kanban skill (kanban-list-details, backlog #67):
 * workflow step 1 must not tell the caller to omit `ownerName`. ownerName is always supplied.
 * Regression guard for commit a99f443.
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const skill = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'packages', 'kanban', 'assets', 'skills', 'jarvis-kanban.board', 'SKILL.md'), 'utf-8'
);

describe('I-8: bundled kanban skill always passes ownerName', () => {
    it('control: the Workflow section contains the step 1 line', () => {
        const workflow = skill.slice(skill.indexOf('## Workflow'));
        expect(workflow).toContain('1. **Create**');
    });

    it('the skill contains no "omit ownerName" instruction', () => {
        expect(skill).not.toMatch(/omit\s+`?ownerName`?/i);
    });
});
