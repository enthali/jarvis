// kanban-cleanup CR: K16 archiving convention in the skill, K78 plain-text filter wording, K63 and K78
// behaviour pinned in the specification (the handler behaviour itself is run in kanban-tool-handlers.test.ts).
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..', '..');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const need = (file: string, id: string): string => {
    const text = read(file);
    const start = text.search(new RegExp(`:id: ${id}\\b`));
    expect(start, id).toBeGreaterThanOrEqual(0);
    const rest = text.slice(start);
    const next = rest.search(/\n\.\. (req|spec|story)::/);
    return next < 0 ? rest : rest.slice(0, next);
};
const skill = read('packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md');

describe('REQ_KAN_SKILLCONTENT AC-12 / SPEC_KAN_SKILLCONTENT AC-11: the skill teaches the archive board', () => {
    const section = skill.slice(skill.indexOf('Archiving a large board'));

    it('names the archive board, the existing tools and the add-before-delete order', () => {
        expect(skill).toContain('Archiving a large board');
        expect(section).toMatch(/boardName: "archive"/);
        expect(section).toContain('archive.kanban.yaml');
        for (const tool of ['jarvis_createKanbanBoard', 'jarvis_listKanbanItems', 'jarvis_addKanbanItem', 'jarvis_deleteKanbanItem', 'jarvis_updateKanbanFields']) {
            expect(section, tool).toContain(tool);
        }
        expect(section.indexOf('jarvis_addKanbanItem')).toBeLessThan(section.indexOf('jarvis_deleteKanbanItem'));
        expect(section).toMatch(/ownerName/);
    });

    it('does not invent an archive tool', () => {
        expect(section).not.toMatch(/jarvis_archive|jarvis_\w*Archive/);
        expect(section).toMatch(/No tool archives/);
    });

    it('the Needs are implemented and the requirement names the archive board', () => {
        expect(need('docs/requirements/req_kan.rst', 'REQ_KAN_SKILLCONTENT')).toMatch(/:status: implemented/);
        expect(need('docs/design/spec_kan.rst', 'SPEC_KAN_SKILLCONTENT')).toMatch(/:status: implemented/);
        expect(need('docs/requirements/req_kan.rst', 'REQ_KAN_SKILLCONTENT')).toMatch(/archive/);
    });
});

describe('REQ_KAN_RENDERER AC-4 (K78): a plain-text, case-insensitive filter without syntax', () => {
    it('the requirement describes the substring filter and no longer promises a field:value syntax', () => {
        const req = need('docs/requirements/req_kan.rst', 'REQ_KAN_RENDERER');
        expect(req).toMatch(/ignoring case/);
        expect(req).toMatch(/``priority:High`` is searched as that literal text/);
        expect(req).toMatch(/empty filter SHALL show every card/);
    });

    it('the shipped webview filter does not parse "field:value"', () => {
        const src = read('packages/kanban/webview/kanban.ts');
        const fn = src.slice(src.indexOf('function matchesFilter'), src.indexOf('function renderBoard'));
        expect(fn).toContain('toLowerCase');
        expect(fn).not.toMatch(/split\(\s*['"]:['"]|indexOf\(\s*['"]:['"]|startsWith\(/);
    });
});

describe('REQ_KAN_LIST AC-15 / SPEC_KAN_LIST (K78, K63): pinned in the specification', () => {
    it('fields {} is stated as no filter; non-string labels are stated as dropped', () => {
        const req = need('docs/requirements/req_kan.rst', 'REQ_KAN_LIST');
        expect(req).toMatch(/AC-15[\s\S]*``\{\}``[\s\S]*SHALL behave/);
        expect(req).toMatch(/AC-11[\s\S]*not strings SHALL be omitted/);
        const spec = need('docs/design/spec_kan.rst', 'SPEC_KAN_LIST');
        expect(spec).toMatch(/AC-16/);
        expect(spec).toMatch(/AC-12[\s\S]*non-string/);
    });
});
