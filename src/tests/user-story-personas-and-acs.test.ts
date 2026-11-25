// streamline-user-story-personas-and-acs CR (GH #32, GH #33), written from the Contract's observable outcome.
// Every story opens with exactly one canonical persona; no story AC names an internal API identifier.
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../..');
const dir = path.join(root, 'docs', 'userstories');
const files = fs.readdirSync(dir).filter(f => /^us_.*\.rst$/.test(f));

interface Story { file: string; id: string; body: string; acs: string; }

const stories: Story[] = files.flatMap(file => {
    const text = fs.readFileSync(path.join(dir, file), 'utf8').replace(/\r\n/g, '\n');
    return text.split(/^\.\. story::.*$/m).slice(1).map(body => {
        const acStart = body.indexOf('**Acceptance Criteria:**');
        return {
            file,
            id: /^\s+:id:\s*(\S+)/m.exec(body)?.[1] ?? '?',
            body,
            acs: acStart < 0 ? '' : body.slice(acStart),
        };
    });
});

const PERSONA_LINE = /^\s*\*\*As (an?)\*\* (Jarvis User|Actor|Jarvis Developer),\s*$/;
const FORBIDDEN: [string, RegExp][] = [
    ['Service/Provider/Registry/Manager/Cache class name', /\w+(Service|Provider|Registry|Manager|Cache)\b/],
    ['camelCase call', /\b[a-z]+[A-Z]\w*\(/],
    ['empty call', /\w+\(\)/],
    ['.ts file', /\.ts\b/],
    ['vscode namespace', /\bvscode\./],
    ['engine namespace', /\bengine\./],
    ['DomainCache', /DomainCache/],
    ['registerTool', /registerTool/],
];

describe('User Story personas (GH #33)', () => {
    it('finds all stories', () => {
        expect(files.length).toBe(13);
        expect(stories.length).toBeGreaterThanOrEqual(68);
    });

    it('every story has exactly one persona line and it is canonical', () => {
        for (const s of stories) {
            const lines = s.body.split('\n').filter(l => /\*\*As an?\*\*/.test(l));
            expect(lines.length, `${s.id} persona lines`).toBe(1);
            expect(lines[0], `${s.id} persona`).toMatch(PERSONA_LINE);
        }
    });

    it('the article matches the persona: "an" for Actor, "a" otherwise', () => {
        for (const s of stories) {
            const m = PERSONA_LINE.exec(s.body.split('\n').find(l => /\*\*As an?\*\*/.test(l)) ?? '');
            expect(m, s.id).not.toBeNull();
            expect(m![1], s.id).toBe(m![2] === 'Actor' ? 'an' : 'a');
        }
    });

    it('docs/namingconventions.rst defines the three personas and drops the unused test-engineer persona', () => {
        const text = fs.readFileSync(path.join(root, 'docs', 'namingconventions.rst'), 'utf8');
        for (const p of ['Jarvis User', 'Actor', 'Jarvis Developer']) { expect(text).toContain(p); }
        expect(text).not.toContain('Jarvis Test Engineer');
    });
});

describe('User Story acceptance criteria name no internal API (GH #32)', () => {
    it('every story has acceptance criteria', () => {
        for (const s of stories) { expect(s.acs, s.id).toMatch(/\n\s+\* \S/); }
    });

    for (const [label, re] of FORBIDDEN) {
        it(`no AC contains a ${label}`, () => {
            const hits = stories.flatMap(s => s.acs.split('\n').filter(l => re.test(l)).map(l => `${s.id}: ${l.trim()}`));
            expect(hits).toEqual([]);
        });
    }

    it('US_MSG_MCPSERVER AC-2 states the outcome without the registration call', () => {
        const s = stories.find(x => x.id === 'US_MSG_MCPSERVER')!;
        const ac2 = /\* AC-2:[\s\S]*?(?=\n\s*\* AC-3:)/.exec(s.acs)?.[0] ?? '';
        expect(ac2).toMatch(/MCP/);
        expect(ac2).not.toMatch(/registerTool|vscode\./);
    });
});
