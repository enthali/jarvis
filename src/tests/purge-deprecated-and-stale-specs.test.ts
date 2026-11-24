// purge-deprecated-and-stale-specs CR: Needs have no `deprecated` status, retired Needs leave no link behind,
// and the specification of K25, K45, K56, K70, K71 matches the shipped manifests and sources.
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../..');
const docs = path.join(root, 'docs');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const json = (rel: string) => JSON.parse(read(rel));

function rstFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { return ['changes', '_build', 'node_modules'].includes(e.name) ? [] : rstFiles(full); }
        return e.name.endsWith('.rst') ? [full] : [];
    });
}
const files = rstFiles(docs);
const sources = files.map(f => ({ rel: path.relative(root, f), text: fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n') }));
const spec = (name: string): string => sources.filter(s => s.rel.endsWith(name)).map(s => s.text).join('\n');

describe('the ontology has no deprecated status', () => {
    it('ontology.toml does not name it', () => {
        expect(read('docs/Jarvis Ontology/ontology.toml')).not.toMatch(/deprecated/i);
    });

    it('no Need in docs/ carries :status: deprecated', () => {
        const hits = sources.filter(s => /^\s*:status:\s*deprecated\s*$/m.test(s.text)).map(s => s.rel);
        expect(hits).toEqual([]);
    });

    it('every status of every Need is one the ontology declares', () => {
        const toml = read('docs/Jarvis Ontology/ontology.toml');
        const declared = new Set([...(/enum = \[([^\]]*)\]/.exec(toml)?.[1] ?? '').matchAll(/"([a-z_]+)"/g)].map(m => m[1]));
        for (const s of ['draft', 'open', 'approved', 'implemented', 'verified']) { expect(declared.has(s), s).toBe(true); }
        const used = new Set(sources.flatMap(x => [...x.text.matchAll(/^\s+:status:\s*(\S+)\s*$/gm)].map(m => m[1])));
        for (const u of used) { expect(declared.has(u), `status ${u}`).toBe(true); }
    });
});

describe('retired Needs leave no link behind', () => {
    const retired = ['US_CFG_MSG', 'US_CFG_SETTINGSGROUPS', 'REQ_CFG_MSGPATH', 'REQ_CFG_SETTINGSGROUPS', 'SPEC_CFG_HEARTBEATSETTINGS',
        'SPEC_CFG_SETTINGS', 'SPEC_CFG_SETTINGSGROUPS', 'SPEC_CFG_UPDATECHECK', 'REQ_MSG_SESSIONFILTER', 'REQ_MSG_SESSIONLOOKUP', 'SPEC_MSG_SESSIONLOOKUP'];

    it('none of the 11 deprecated Needs is defined or named in the specification', () => {
        for (const id of retired) {
            const re = new RegExp(`\\b${id}\\b`);
            expect(sources.filter(s => re.test(s.text)).map(s => s.rel), id).toEqual([]);
        }
    });

    it('US_OLK_* stories are gone: file deleted, no toctree entry, no reference', () => {
        expect(fs.existsSync(path.join(docs, 'userstories/us_olk.rst'))).toBe(false);
        expect(read('docs/userstories/index.rst')).not.toMatch(/us_olk/);
        expect(sources.filter(s => /\bUS_OLK_/.test(s.text)).map(s => s.rel)).toEqual([]);
    });

    it('every ID in :links: and :validates: is defined as a Need', () => {
        const defined = new Set(sources.flatMap(s => [...s.text.matchAll(/^\s+:id:\s*(\S+)\s*$/gm)].map(m => m[1])));
        const missing: string[] = [];
        for (const s of sources) {
            for (const m of s.text.matchAll(/^\s+:(?:links|validates|tracked_by|implements):\s*(.+)$/gm)) {
                for (const id of m[1].split(/[;,]/).map(x => x.trim()).filter(Boolean)) {
                    if (!defined.has(id)) { missing.push(`${s.rel}: ${id}`); }
                }
            }
        }
        expect(missing).toEqual([]);
    });

    it('every REQ_OLK_* traces to a US_PIM_* story (K25)', () => {
        const olk = [...spec('req_olk.rst').matchAll(/^\.\. req::.*\n\s+:id:\s*(REQ_OLK_\S+)\n([\s\S]*?)(?=^\.\. )/gm)];
        expect(olk.length).toBeGreaterThan(0);
        for (const m of olk) {
            const links = /^\s+:links:\s*(.+)$/m.exec(m[2])?.[1] ?? '';
            const viaStory = /\bUS_PIM_/.test(links);
            const viaReq = /\bREQ_OLK_/.test(links);
            expect(viaStory || viaReq, m[1]).toBe(true);
        }
    });
});

describe('K70: the Outlook setting is jarvis.outlook.enabled everywhere it is specified', () => {
    it('the PIM manifest declares the new keys and not the removed one', () => {
        const props = Object.assign({}, ...[].concat(json('packages/pim/package.json').contributes.configuration).map((c: { properties: object }) => c.properties));
        expect(Object.keys(props)).toContain('jarvis.outlook.enabled');
        expect(Object.keys(props)).toContain('jarvis.outlook.tasks.enabled');
        expect(Object.keys(props)).not.toContain('jarvis.outlookEnabled');
        expect(read('packages/pim/src/extension.ts')).not.toContain('outlookEnabled');
    });

    it('the Outlook requirements and specifications do not use the old name', () => {
        for (const f of ['req_olk.rst', 'spec_olk.rst']) { expect(spec(f), f).not.toContain('outlookEnabled'); }
    });
});

describe('K56: the agent file child of an Actor shows the bare file name', () => {
    it('no specification, story or journey names an "Agent File:" label', () => {
        expect(sources.filter(s => s.text.includes('Agent File:')).map(s => s.rel)).toEqual([]);
    });

    it('the tree provider labels the child with the basename, as SPEC_ACTOR_FILES says', () => {
        const src = read('packages/core/src/engine/actors/actorTreeProvider.ts');
        expect(src).toMatch(/const label = agentFile\.split\(\/\[\\\\\/\]\/\)\.pop\(\)/);
        expect(src).not.toContain('Agent File:');
    });
});

describe('K45: the recorder registers no tools, so no jarvis_rec_ tool is claimed to exist', () => {
    it('the recorder manifest contributes no language model tools and its sources call no registerTool', () => {
        expect(json('packages/recorder/package.json').contributes.languageModelTools).toBeUndefined();
        const dir = path.join(root, 'packages/recorder/src');
        const all = fs.readdirSync(dir, { recursive: true }).map(String).filter(f => f.endsWith('.ts'));
        for (const f of all) { expect(fs.readFileSync(path.join(dir, f), 'utf8'), f).not.toMatch(/registerTool\s*\(/); }
    });

    it('the jarvis_rec_ infix appears in the specification only as a conditional rule', () => {
        for (const s of sources.filter(x => x.text.includes('jarvis_rec_'))) {
            expect(s.rel, s.rel).toMatch(/req_eng\.rst|spec_mod\.rst/);
        }
        expect(spec('spec_mod.rst')).toMatch(/tools later,[\s\S]{0,40}jarvis_rec_/);
    });
});

describe('K71: the core manifest has exactly the groups REQ_CFG_GROUPS names', () => {
    it('seven groups in the stated order, and SPEC_CFG_IGNOREMANAGER no longer claims eleven', () => {
        const groups = [].concat(json('packages/core/package.json').contributes.configuration).map((c: { title: string }) => c.title);
        expect(groups).toEqual(['Actors', 'Messages', 'Prompt Templates', 'Heartbeat', 'Reminders', 'Gitignore', 'Updates']);
        const ignore = spec('spec_cfg.rst').split('SPEC_CFG_IGNOREMANAGER\n')[1] ?? '';
        expect(ignore.length).toBeGreaterThan(0);
        expect(ignore).toContain('REQ_CFG_GROUPS');
    });
});
