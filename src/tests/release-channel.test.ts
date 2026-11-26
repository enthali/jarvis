// pre-release-channel CR, written from REQ_REL_CHANNEL AC-1..AC-8 and SPEC_REL_CHANNEL AC-1..AC-7.
// Static check of release.yml, manifests, the Release Contract and the guide; the live pre-release run is v0.35.1-pre.
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const root = path.resolve(__dirname, '../..');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');

interface Step { name?: string; uses?: string; run?: string; with?: Record<string, unknown> }
interface Workflow {
    on: { push: { tags: string[] } };
    jobs: Record<string, { env?: Record<string, string>; steps: Step[] }>;
}

const wf = yaml.load(read('.github/workflows/release.yml')) as Workflow;
const job = wf.jobs.release;
const steps = job.steps;
const packageSteps = steps.filter(s => /\bvsce package\b/.test(s.run ?? ''));
const publishSteps = steps.filter(s => /\bvsce publish\b/.test(s.run ?? ''));
const marketplace = ['core', 'pim', 'recorder', 'mcp', 'flow', 'kanban'];
const IS_PRE = "endsWith(github.ref_name, '-pre')";

describe('REQ_REL_CHANNEL AC-1 / SPEC_REL_CHANNEL AC-1: one workflow on v* tags', () => {
    it('release.yml triggers on v* tags only', () => {
        expect(wf.on.push.tags).toEqual(['v*']);
    });

    it('no other workflow publishes to the Marketplace', () => {
        const dir = path.join(root, '.github/workflows');
        for (const f of fs.readdirSync(dir).filter(n => /\.ya?ml$/.test(n) && n !== 'release.yml')) {
            expect(read(`.github/workflows/${f}`)).not.toMatch(/vsce\s+publish/);
        }
    });
});

describe('SPEC_REL_CHANNEL AC-2: CHANNEL_FLAG', () => {
    it('is derived from the -pre suffix as --pre-release or empty', () => {
        const expr = job.env?.CHANNEL_FLAG ?? '';
        expect(expr).toContain(IS_PRE);
        expect(expr).toContain("'--pre-release'");
        expect(expr).toMatch(/\|\| ''/);
        expect(Object.keys(job.env ?? {})).toEqual(['CHANNEL_FLAG']);
    });
});

describe('REQ_REL_CHANNEL AC-3/AC-4/AC-5 / SPEC_REL_CHANNEL AC-3: flag on package and publish steps', () => {
    it('the six marketplace package steps and six publish steps carry $CHANNEL_FLAG', () => {
        for (const pkg of marketplace) {
            const pk = packageSteps.filter(s => s.run!.includes(`cd packages/${pkg} `));
            const pb = publishSteps.filter(s => s.run!.includes(`packages/${pkg}/`));
            expect(pk).toHaveLength(1);
            expect(pb).toHaveLength(1);
            expect(pk[0].run).toMatch(/ \$CHANNEL_FLAG$/);
            expect(pb[0].run).toMatch(/ \$CHANNEL_FLAG$/);
        }
    });

    it('the legacy shim package step carries no flag and is never published', () => {
        const shim = packageSteps.filter(s => s.run!.includes('packages/core-gh'));
        expect(shim).toHaveLength(1);
        expect(shim[0].run).not.toMatch(/pre-release|CHANNEL_FLAG/);
        expect(publishSteps.some(s => s.run!.includes('core-gh'))).toBe(false);
    });

    it('no step hard-codes --pre-release, so the release channel passes none', () => {
        const hard = steps.filter(s => /--pre-release/.test(s.run ?? ''));
        expect(hard).toEqual([]);
        expect(packageSteps).toHaveLength(7);
        expect(publishSteps).toHaveLength(6);
    });
});

describe('REQ_REL_CHANNEL AC-6 / SPEC_REL_CHANNEL AC-4: GitHub Release prerelease', () => {
    it('sets prerelease from the -pre suffix', () => {
        const rel = steps.find(s => (s.uses ?? '').startsWith('softprops/action-gh-release'))!;
        expect(rel.with?.prerelease).toBe('${{ ' + IS_PRE + ' }}');
    });

    it('the update check still reads releases/latest, which excludes pre-releases', () => {
        const src = read('packages/core/src/engine/core/updateCheck.ts');
        expect(src).toContain('/releases/latest');
        expect(src).not.toMatch(/\/releases(?!\/latest)['"`?]/);
    });
});

describe('REQ_REL_CHANNEL AC-2 / SPEC_REL_CHANNEL AC-5: plain X.Y.Z manifests', () => {
    it('root and every packages/*/package.json version is MAJOR.MINOR.PATCH', () => {
        const files = ['package.json', ...fs.readdirSync(path.join(root, 'packages'))
            .map(d => `packages/${d}/package.json`)
            .filter(f => fs.existsSync(path.join(root, f)))];
        expect(files.length).toBeGreaterThanOrEqual(8);
        for (const f of files) {
            expect(JSON.parse(read(f)).version, f).toMatch(/^\d+\.\d+\.\d+$/);
        }
    });
});

describe('REQ_REL_CHANNEL AC-7 / SPEC_REL_CHANNEL AC-6: Release Contract', () => {
    const rc = read('docs/Jarvis Contracts/release.md');

    it('has the Channel header field', () => {
        expect(rc).toMatch(/^\*\*Channel:\*\* release \| pre-release/m);
    });

    it('step 3 tags v{version} or v{version}-pre per the Channel', () => {
        expect(rc).toMatch(/^3\. Tag `v\{version\}` for the release channel or `v\{version\}-pre` for the pre-release channel/m);
    });

    it('releasenotes heading rule requires (Pre-Release)', () => {
        expect(rc).toContain('carries `(Pre-Release)`');
        expect(rc).toContain('## v0.35.1 (Pre-Release) - {title}');
    });

    it('Publication gate and step 4 check the channel on GitHub and Marketplace', () => {
        expect(rc).toMatch(/\| Publication \| Release \| Tag pushed \(`v\{version\}` for a release, `v\{version\}-pre` for a pre-release\)/);
        expect(rc).toContain('marked Pre-release if and only if the tag ends in `-pre`');
    });
});

describe('REQ_REL_CHANNEL AC-8 / SPEC_REL_CHANNEL AC-7: user guide', () => {
    const guide = read('docs/user guides/getting-started.md');
    const core = read('docs/user guides/core.md');
    const text = guide + core;

    it('names both switch buttons', () => {
        expect(text).toContain('Switch to Pre-Release Version');
        expect(text).toContain('Switch to Release Version');
    });

    it('says Core and each add-on are switched individually', () => {
        const section = guide.slice(guide.indexOf('### Try pre-release versions'));
        expect(section.slice(0, section.indexOf('\n### ', 5))).toMatch(/Jarvis Core and every add-on are switched on their own/);
    });
});
