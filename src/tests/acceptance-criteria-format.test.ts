// docs/acceptance (uat-status-model-cleanup CR): every `ac` Need is an executable scenario.
// Black-box check of the Needs source: a person must be able to run it from the text alone.
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const DIR = path.resolve(__dirname, '../../docs/acceptance');
const files = fs.readdirSync(DIR).filter(f => /^ac_.*\.rst$/.test(f));

interface Ac { file: string; id: string; status: string; validates: string; body: string; }

function parse(file: string): Ac[] {
    const text = fs.readFileSync(path.join(DIR, file), 'utf8').replace(/\r\n/g, '\n');
    return text.split(/^\.\. ac::.*$/m).slice(1).map(block => {
        const opt = (name: string) => new RegExp(`^\\s+:${name}:\\s*(.*)$`, 'm').exec(block)?.[1].trim() ?? '';
        return { file, id: opt('id'), status: opt('status'), validates: opt('validates'), body: block };
    });
}

const acs = files.flatMap(parse);

describe('docs/acceptance: acceptance criteria are complete scenarios', () => {
    it('finds the criteria of every ac file', () => {
        expect(files.length).toBeGreaterThan(0);
        for (const f of files) { expect(parse(f).length, f).toBeGreaterThan(0); }
    });

    it('every id is unique and starts with AC_', () => {
        const ids = acs.map(a => a.id);
        expect(ids.every(i => /^AC_[A-Z0-9_]+$/.test(i)), 'AC_ naming').toBe(true);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('every criterion validates at least one story and starts as approved', () => {
        for (const a of acs) {
            expect(a.validates, `${a.id} validates`).toMatch(/\bUS_[A-Z0-9_]+/);
            expect(a.status, `${a.id} status`).toMatch(/^(approved|verified|deprecated)$/);
        }
    });

    it('every criterion states Given, When and Then in that order', () => {
        for (const a of acs.filter(x => x.status !== 'deprecated')) {
            const g = a.body.indexOf('**Given**');
            const w = a.body.indexOf('**When**');
            const t = a.body.indexOf('**Then**');
            expect(g, `${a.id} Given`).toBeGreaterThanOrEqual(0);
            expect(w, `${a.id} When`).toBeGreaterThan(g);
            expect(t, `${a.id} Then`).toBeGreaterThan(w);
        }
    });

    it('every validated story exists in the user stories', () => {
        const stories = fs.readdirSync(path.resolve(DIR, '../userstories')).filter(f => f.endsWith('.rst'))
            .map(f => fs.readFileSync(path.resolve(DIR, '../userstories', f), 'utf8')).join('\n');
        for (const a of acs) {
            for (const id of a.validates.split(/[;,\s]+/).filter(Boolean)) {
                expect(stories, `${a.id} -> ${id}`).toContain(`:id: ${id}`);
            }
        }
    });
});
