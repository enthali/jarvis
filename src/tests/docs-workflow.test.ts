// fix-github-pages-docs-workflow CR, written from REQ_REL_DOCSWORKFLOW AC-1..AC-9 and SPEC_REL_DOCSWORKFLOW.
// Static check of the workflow file and the Release Contract; the live Pages run happens on the next push to main.
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const root = path.resolve(__dirname, '../..');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');

interface Step { uses?: string; run?: string; id?: string }
interface Job { needs?: string | string[]; permissions?: Record<string, string>; environment?: unknown; steps: Step[] }
interface Workflow {
    on: { push: { branches: string[] } };
    permissions?: Record<string, string>;
    concurrency?: { group: string; 'cancel-in-progress': boolean };
    jobs: Record<string, Job>;
}

const wf = yaml.load(read('.github/workflows/docs.yml')) as Workflow;
const uses = (job: Job): string[] => job.steps.flatMap(s => (s.uses ? [s.uses] : []));

describe('REQ_REL_DOCSWORKFLOW AC-1/AC-2: trigger', () => {
    it('runs on push to main only', () => {
        expect(Object.keys(wf.on)).toEqual(['push']);
        expect(wf.on.push.branches).toEqual(['main']);
    });
});

describe('REQ_REL_DOCSWORKFLOW AC-5: build and deploy are separate jobs', () => {
    it('defines exactly the jobs build and deploy', () => {
        expect(Object.keys(wf.jobs).sort()).toEqual(['build', 'deploy']);
    });

    it('deploy needs build, build needs nothing', () => {
        const needs = wf.jobs.deploy.needs;
        expect([needs].flat()).toEqual(['build']);
        expect(wf.jobs.build.needs).toBeUndefined();
    });

    it('build installs docs/requirements.txt, builds Sphinx strictly (AC-3) and uploads the Pages artifact', () => {
        const runs = wf.jobs.build.steps.flatMap(s => (s.run ? [s.run] : []));
        expect(runs).toContain('pip install -r docs/requirements.txt');
        expect(runs.some(r => /sphinx/.test(r) && /\s-W\b/.test(r))).toBe(true);
        expect(uses(wf.jobs.build).some(u => u.startsWith('actions/upload-pages-artifact@'))).toBe(true);
    });

    it('deploy only deploys, in the github-pages environment; build never deploys', () => {
        expect(uses(wf.jobs.deploy)).toEqual([expect.stringMatching(/^actions\/deploy-pages@/)]);
        expect(uses(wf.jobs.build).some(u => u.startsWith('actions/deploy-pages@'))).toBe(false);
        expect((wf.jobs.deploy.environment as { name: string }).name).toBe('github-pages');
    });
});

describe('REQ_REL_DOCSWORKFLOW AC-6: least privilege', () => {
    it('top level holds contents: read only', () => {
        expect(wf.permissions).toEqual({ contents: 'read' });
    });

    it('only the deploy job holds pages: write and id-token: write', () => {
        expect(wf.jobs.deploy.permissions).toEqual({ pages: 'write', 'id-token': 'write' });
        expect(wf.jobs.build.permissions).toBeUndefined();
    });
});

describe('REQ_REL_DOCSWORKFLOW AC-7: concurrency', () => {
    it('uses the group pages and does not cancel a running deployment', () => {
        expect(wf.concurrency).toEqual({ group: 'pages', 'cancel-in-progress': false });
    });
});

describe('REQ_REL_DOCSWORKFLOW AC-8: current action majors', () => {
    it('every action is at the major the SPEC names', () => {
        const all = Object.values(wf.jobs).flatMap(uses).sort();
        expect(all).toEqual([
            'actions/checkout@v7', 'actions/deploy-pages@v5', 'actions/setup-python@v7', 'actions/upload-pages-artifact@v5',
        ]);
    });

    it('SPEC_REL_DOCSWORKFLOW names the same majors', () => {
        const spec = read('docs/design/spec_rel.rst');
        const block = spec.slice(spec.indexOf(':id: SPEC_REL_DOCSWORKFLOW'));
        for (const a of ['checkout@v7', 'setup-python@v7', 'upload-pages-artifact@v5', 'deploy-pages@v5']) {
            expect(block, a).toContain(a);
        }
    });
});

describe('REQ_REL_DOCSWORKFLOW AC-9: Release Contract watches docs.yml', () => {
    const release = read('docs/Jarvis Contracts/release.md');

    it('Publication gate, step 4 and evidence table all name docs.yml', () => {
        const gate = release.split('\n').find(l => l.startsWith('| Publication |')) ?? '';
        expect(gate).toContain('docs.yml');
        const step = release.split('\n').find(l => /^4\. Watch/.test(l)) ?? '';
        expect(step).toMatch(/^4\. Watch `release\.yml` on the tag and `docs\.yml` on `main` to completion/);
        expect(release).toMatch(/\| Docs workflow run \(`docs\.yml` on `main`\) \|/);
    });

    it('a failed deploy job is re-run alone; a failed build job is a finding', () => {
        expect(release).toMatch(/failed `deploy` job of `docs\.yml` is re-run on its own/);
        expect(release).toMatch(/failed `build` job is a finding/);
    });
});
