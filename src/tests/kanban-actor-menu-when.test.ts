/**
 * Static guard for the "Add Kanban Board" context-menu entry (kanban-list-details, REQ_KAN_UX AC-6):
 * the when-clause must match actor nodes and must not match any Files-node contextValue.
 * Sample Files-node values come from packages/core/src/engine/actors/actorTreeProvider.ts.
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..', '..');
const kanbanPackageJson = JSON.parse(fs.readFileSync(
    path.join(root, 'packages', 'kanban', 'package.json'), 'utf-8'
));
const treeSrc = fs.readFileSync(
    path.join(root, 'packages', 'core', 'src', 'engine', 'actors', 'actorTreeProvider.ts'), 'utf-8'
);

const menuEntry = (kanbanPackageJson.contributes.menus['view/item/context'] as Array<{ command: string; when: string }>)
    .find(e => e.command === 'jarvis.createKanbanBoard');
const clause: string = menuEntry?.when ?? '';

/** Evaluates the subset of `when` syntax used here: `viewItem =~ /re/` and `viewItem == value`, joined by `||`. Throws on anything else. */
function matchesWhen(whenClause: string, viewItem: string): boolean {
    const results = whenClause.split('||').map(term => {
        const t = term.trim();
        const re = /^viewItem\s*=~\s*\/(.+)\/$/.exec(t);
        if (re) { return new RegExp(re[1]).test(viewItem); }
        const eq = /^viewItem\s*==\s*(\S+)$/.exec(t);
        if (eq) { return viewItem === eq[1]; }
        throw new Error(`unsupported when term: "${t}"`);
    });
    return results.some(Boolean);
}

const filesNodeValues = [
    'jarvisActorFileCategory:agent',
    'jarvisActorFileCategory:files',
    'jarvisActorFileCategory:touched',
    'jarvisActorFile',
    'jarvisActorFileFolder',
    'jarvisTouchedFileFolder',
    'jarvisTouchedFile',
];

describe('REQ_KAN_UX AC-6: Add Kanban Board menu entry on actor nodes only', () => {
    it('control: the menu entry exists and its when-clause parses', () => {
        expect(menuEntry).toBeDefined();
        expect(() => matchesWhen(clause, 'jarvisActor')).not.toThrow();
    });

    it('control: the seven Files-node contextValues are still produced by actorTreeProvider.ts', () => {
        expect(treeSrc).toMatch(/category:\s*'agent'\s*\|\s*'files'\s*\|\s*'touched'\s*;/);
        expect(treeSrc).toContain('jarvisActorFileCategory:${element.category}');
        for (const literal of ["'jarvisActorFile'", "'jarvisActorFileFolder'", "'jarvisTouchedFileFolder'", "'jarvisTouchedFile'"]) {
            expect(treeSrc).toContain(literal);
        }
    });

    it('positive: jarvisActor matches', () => {
        expect(matchesWhen(clause, 'jarvisActor')).toBe(true);
    });

    it('positive: jarvisProject and jarvisSession still match', () => {
        expect(matchesWhen(clause, 'jarvisProject')).toBe(true);
        expect(matchesWhen(clause, 'jarvisSession')).toBe(true);
    });

    it.each(filesNodeValues)('negative: Files-node contextValue %s does not match', (value) => {
        expect(matchesWhen(clause, value)).toBe(false);
    });

    it('negative control: a prefix match on jarvisActor would be caught by the Files-node check', () => {
        const broadened = 'viewItem =~ /^jarvisActor/';
        expect(filesNodeValues.some(v => matchesWhen(broadened, v))).toBe(true);
    });
});
