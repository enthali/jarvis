// kanban-swimlanes-and-filters: REQ_KAN_REFRESH AC-1, SPEC_KAN_REFRESH step 1 and AC-1.
// Only the manifest is checkable without a VS Code host: where the Refresh action is offered.
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../packages/kanban/package.json'), 'utf8'));
const WHEN = 'activeCustomEditorId == jarvis.kanbanEditor';
const REFRESH = 'jarvis.refreshKanbanBoard';

describe('REQ_KAN_REFRESH AC-1: Refresh is offered in the kanban custom editor only', () => {
    it('the command exists with a title and an icon', () => {
        const cmd = pkg.contributes.commands.find((c: { command: string }) => c.command === REFRESH);
        expect(cmd?.title).toBe('Refresh Kanban Board');
        expect(cmd?.icon).toBeTruthy();
    });

    it('the editor title bar entry is conditioned on the kanban custom editor, in the group of "Open as Text"', () => {
        const entries: Array<{ command: string; when?: string; group?: string }> = pkg.contributes.menus['editor/title'];
        const refresh = entries.find(e => e.command === REFRESH);
        const text = entries.find(e => e.command === 'jarvis.openKanbanAsText');
        expect(refresh?.when).toBe(WHEN);
        expect(refresh?.group).toBe(text?.group);
        expect(entries.filter(e => e.command === REFRESH)).toHaveLength(1);
    });

    it('the Command Palette offers it only while a kanban custom editor is active', () => {
        const palette: Array<{ command: string; when?: string }> = pkg.contributes.menus.commandPalette;
        expect(palette.find(e => e.command === REFRESH)?.when).toBe(WHEN);
    });

    it('no other menu offers it', () => {
        for (const [menu, list] of Object.entries(pkg.contributes.menus as Record<string, Array<{ command: string }>>)) {
            if (menu === 'editor/title' || menu === 'commandPalette') { continue; }
            expect(list.some(e => e.command === REFRESH), menu).toBe(false);
        }
    });
});
