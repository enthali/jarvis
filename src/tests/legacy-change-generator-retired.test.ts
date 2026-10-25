// Contract extension-readiness-and-suite-retirement, Observable Outcome (no Need governs the generator).
// The obsolete Change template, generator script and npm command must stay absent.
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const exists = (rel: string) => fs.existsSync(path.join(ROOT, rel));

describe('Legacy Change generator is retired', () => {
    it('template and generator script are absent', () => {
        expect(exists('.github/templates/change-document.md')).toBe(false);
        expect(exists('scripts/new-change.mjs')).toBe(false);
    });

    it('package.json defines no new-change script and nothing points at the removed files', () => {
        const raw = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
        const scripts = JSON.parse(raw).scripts as Record<string, string>;
        expect(Object.keys(scripts)).not.toContain('new-change');
        expect(raw).not.toMatch(/new-change|change-document\.md/);
    });

    it('the canonical Contract process document remains', () => {
        expect(exists('docs/Jarvis Contracts/change.md')).toBe(true);
    });
});
