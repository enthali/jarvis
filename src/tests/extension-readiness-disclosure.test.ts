// REQ_MOD_READINESS AC-1..AC-4, SPEC_MOD_READINESS AC-1..AC-3, SPEC_MOD_SUITE AC-1..AC-2,
// REQ_REL_RELEASEACTION AC-7 (no Suite VSIX in release workflow).
// Black-box repository checks over user-facing disclosures, package layout, and release workflow.
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel: string) => fs.existsSync(path.join(ROOT, rel));
// Markdown blockquote markers break wrapped sentences; strip them before matching.
const unquote = (s: string) => s.replace(/^>\s?/gm, '');

describe('REQ_MOD_READINESS: maturity and capability disclosure', () => {
    it('AC-1: root README marks PIM EXPERIMENTAL and states email triage is not a PIM release capability', () => {
        const readme = unquote(read('README.md'));
        expect(readme).toMatch(/Jarvis PIM: EXPERIMENTAL/);
        expect(readme).toMatch(/Email triage is not part of a Jarvis PIM\s+release/);
    });

    it('AC-2: root README marks Syspilot EXPERIMENTAL — DO NOT USE with the syspilot 0.10 reason', () => {
        const readme = unquote(read('README.md'));
        expect(readme).toMatch(/Jarvis Syspilot: EXPERIMENTAL — DO NOT USE/);
        expect(readme).toMatch(/syspilot 0\.10\s+release will break compatibility/);
    });

    it('AC-1: PIM extension page and Marketplace description carry the warning and triage boundary', () => {
        const page = read('docs/user guides/pim.md');
        expect(page).toMatch(/EXPERIMENTAL/);
        expect(page).toMatch(/Email triage is not part of a Jarvis PIM release/);
        const pkg = JSON.parse(read('packages/pim/package.json'));
        expect(pkg.description).toMatch(/EXPERIMENTAL/);
        expect(pkg.description).toMatch(/Email triage is not part of a Jarvis PIM release/);
    });

    it('AC-2: Syspilot extension page and Marketplace description carry the warning and 0.10 break', () => {
        const page = unquote(read('docs/user guides/syspilot.md'));
        expect(page).toMatch(/EXPERIMENTAL — DO NOT USE/);
        expect(page).toMatch(/syspilot 0\.10 release will\s+break compatibility/);
        const pkg = JSON.parse(read('packages/syspilot/package.json'));
        expect(pkg.description).toMatch(/EXPERIMENTAL — DO NOT USE/);
        expect(pkg.description).toMatch(/syspilot 0\.10 release will break compatibility/);
    });
});

describe('SPEC_MOD_SUITE / REQ_MOD_READINESS AC-4: Suite removed from repository and release', () => {
    it('AC-1: packages/suite is absent from the repository', () => {
        expect(exists('packages/suite')).toBe(false);
    });

    it('AC-2: release workflow has no Suite package, upload, or publish step', () => {
        const workflow = read('.github/workflows/release.yml');
        expect(workflow).not.toMatch(/suite/i);
    });

    it('AC-2: the root workspace and lock file no longer reference the Suite package', () => {
        expect(read('package.json')).not.toMatch(/jarvis-suite|packages\/suite/);
        expect(read('package-lock.json')).not.toMatch(/jarvis-suite|packages\/suite/);
    });

    it('AC-1: the Suite user guide is gone and no guide navigation links to it', () => {
        expect(exists('docs/user guides/suite.md')).toBe(false);
        for (const page of ['docs/user guides/index.md', 'docs/user guides/getting-started.md']) {
            expect(read(page)).not.toMatch(/suite\.md|Jarvis Suite/i);
        }
    });
});
