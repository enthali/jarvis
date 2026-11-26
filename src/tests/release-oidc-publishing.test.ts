// marketplace-oidc-publishing CR, written from REQ_REL_MKTPUBLISH AC-1..AC-7 and SPEC_REL_MKTPUBLISH.
// Static check of release.yml, package.json and the lockfile; the live token exchange runs in release 0.35.1.
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const root = path.resolve(__dirname, '../..');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');

interface Step { name?: string; uses?: string; run?: string; env?: unknown; with?: Record<string, unknown> }
interface Workflow { permissions?: Record<string, string>; jobs: Record<string, { steps: Step[]; permissions?: unknown }> }

const raw = read('.github/workflows/release.yml');
const wf = yaml.load(raw) as Workflow;
const steps = wf.jobs.release.steps;
const publishSteps = steps.filter(s => /\bvsce publish\b/.test(s.run ?? ''));
const releaseIdx = steps.findIndex(s => (s.uses ?? '').startsWith('softprops/action-gh-release'));

const atLeast = (v: string, min: number[]): boolean => {
    const p = v.replace(/^[^\d]*/, '').split('.').map(n => parseInt(n, 10));
    for (let i = 0; i < 3; i++) {
        if ((p[i] ?? 0) !== min[i]) { return (p[i] ?? 0) > min[i]; }
    }
    return true;
};

describe('REQ_REL_MKTPUBLISH AC-1/AC-2/AC-3: six OIDC publish steps', () => {
    const expected = ['core', 'pim', 'recorder', 'mcp', 'flow', 'kanban'];

    it('has exactly one publish step per published extension and none for core-gh', () => {
        expect(publishSteps).toHaveLength(6);
        for (const pkg of expected) {
            expect(publishSteps.filter(s => s.run!.includes(`packages/${pkg}/`))).toHaveLength(1);
        }
        expect(publishSteps.some(s => s.run!.includes('packages/core-gh'))).toBe(false);
    });

    it('every publish step uses --oidc and a pre-built --packagePath', () => {
        for (const s of publishSteps) {
            expect(s.run).toMatch(/\bvsce publish --oidc\b/);
            expect(s.run).toMatch(/--packagePath packages\/\w+\/jarvis-\w+-\*\.vsix/);
        }
    });

    it('no publish step passes a token or an env block', () => {
        for (const s of publishSteps) {
            expect(s.env).toBeUndefined();
            expect(s.run).not.toMatch(/(--pat|-p )\b/);
            expect(s.run).not.toMatch(/secrets\./);
        }
    });

    it('release.yml references no VSCE_PAT and no secrets at all', () => {
        expect(raw).not.toMatch(/VSCE_PAT/);
        expect(raw).not.toMatch(/secrets\./);
    });
});

describe('REQ_REL_MKTPUBLISH AC-4: GitHub Release precedes publishing', () => {
    it('the release step comes before every publish step and uploads all seven VSIXs', () => {
        expect(releaseIdx).toBeGreaterThanOrEqual(0);
        for (const s of publishSteps) {
            expect(steps.indexOf(s)).toBeGreaterThan(releaseIdx);
        }
        const files = String(steps[releaseIdx].with?.files).split('\n').map(l => l.trim()).filter(Boolean);
        expect(files.sort()).toEqual(
            ['core', 'core-gh', 'pim', 'recorder', 'mcp', 'flow', 'kanban'].map(p => `packages/${p}/*.vsix`).sort());
    });
});

describe('REQ_REL_MKTPUBLISH AC-5: OIDC permission', () => {
    it('grants id-token: write and contents: write at workflow level', () => {
        expect(wf.permissions).toEqual({ contents: 'write', 'id-token': 'write' });
    });

    it('does not override permissions on the job', () => {
        expect(wf.jobs.release.permissions).toBeUndefined();
    });
});

describe('REQ_REL_MKTPUBLISH AC-6: @vscode/vsce >= 4.1.1', () => {
    it('declares a root devDependency range whose minimum is >= 4.1.1', () => {
        const pkg = JSON.parse(read('package.json'));
        const range: string = pkg.devDependencies['@vscode/vsce'];
        expect(range).toMatch(/^[\^~]?\d+\.\d+\.\d+$/);
        expect(atLeast(range, [4, 1, 1])).toBe(true);
    });

    it('resolves to >= 4.1.1 in package-lock.json', () => {
        const lock = JSON.parse(read('package-lock.json'));
        const v: string = lock.packages['node_modules/@vscode/vsce'].version;
        expect(atLeast(v, [4, 1, 1])).toBe(true);
    });

    it('no workspace package pins an older @vscode/vsce', () => {
        for (const d of fs.readdirSync(path.join(root, 'packages'))) {
            const f = path.join(root, 'packages', d, 'package.json');
            if (!fs.existsSync(f)) { continue; }
            const pkg = JSON.parse(fs.readFileSync(f, 'utf8'));
            const range: string | undefined = pkg.devDependencies?.['@vscode/vsce'];
            if (range) { expect(atLeast(range, [4, 1, 1])).toBe(true); }
        }
    });
});

describe('REQ_REL_MKTPUBLISH AC-7: Node-24 action majors', () => {
    const uses = steps.flatMap(s => (s.uses ? [s.uses] : []));

    it('uses exactly checkout@v7, setup-node@v7 and action-gh-release@v3', () => {
        expect([...new Set(uses)].sort()).toEqual(
            ['actions/checkout@v7', 'actions/setup-node@v7', 'softprops/action-gh-release@v3']);
    });

    it('keeps Node 22 or newer for vsce 4 (engines node >= 22)', () => {
        const setup = steps.find(s => s.uses === 'actions/setup-node@v7')!;
        expect(parseInt(String(setup.with?.['node-version']), 10)).toBeGreaterThanOrEqual(22);
    });

    it('SPEC_REL_MKTPUBLISH names the same action versions', () => {
        const spec = read('docs/design/spec_rel.rst');
        const i = spec.indexOf(':id: SPEC_REL_MKTPUBLISH');
        const block = spec.slice(i, spec.indexOf('.. spec::', i + 10) === -1 ? undefined : spec.indexOf('.. spec::', i + 10));
        for (const u of ['actions/checkout@v7', 'actions/setup-node@v7', 'softprops/action-gh-release@v3']) {
            expect(block).toContain(u);
        }
    });
});

describe('Documentation: stale core ID in packages/mcp/README.md', () => {
    it('does not name Jarvis Core by the legacy ID enthali.jarvis', () => {
        expect(read('packages/mcp/README.md')).not.toMatch(/enthali\.jarvis(?![-\w])/);
    });
});
