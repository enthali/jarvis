// retire-legacy-session-lookup CR: SPEC_REL_VSCEPKG AC-6, SPEC_ACTOR_CREATETOOL AC-6, REQ_AUT_HEARTBEAT_RESOLVER_REUSE.
// Static checks of the committed sources and manifests; the packaged VSIX itself is Quality's build row.
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { combineValidDestinations, getValidDestinations } from '../../packages/core/src/engine/sessions/sessionLookup';
import * as sessionLookup from '../../packages/core/src/engine/sessions/sessionLookup';

const root = path.resolve(__dirname, '../..');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8');
const json = (rel: string) => JSON.parse(read(rel));

describe('SPEC_REL_VSCEPKG AC-6: no sql.js dependency and no WebAssembly file in Core', () => {
    it('no manifest or lockfile declares sql.js', () => {
        for (const rel of ['package.json', 'packages/core/package.json']) {
            const p = json(rel);
            for (const kind of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
                expect(Object.keys(p[kind] ?? {}), `${rel} ${kind}`).not.toContain('sql.js');
            }
        }
        expect(read('package-lock.json')).not.toMatch(/sql\.js|sql-wasm/);
    });

    it('the build script copies no WebAssembly file and the package ignore file does not re-include one', () => {
        expect(read('packages/core/build.js')).not.toMatch(/wasm|sql\.js/i);
        expect(read('packages/core/.vscodeignore')).not.toMatch(/wasm/i);
        expect(fs.existsSync(path.join(root, 'packages/core/src/sql.js.d.ts'))).toBe(false);
    });

    it('no source of any package imports sql.js', () => {
        const hits: string[] = [];
        const walk = (dir: string): void => {
            for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                if (e.name === 'node_modules' || e.name === 'out' || e.name === 'dist') { continue; }
                const full = path.join(dir, e.name);
                if (e.isDirectory()) { walk(full); } else if (/\.(ts|js)$/.test(e.name) && /['"]sql\.js['"]/.test(fs.readFileSync(full, 'utf8'))) { hits.push(path.relative(root, full)); }
            }
        };
        walk(path.join(root, 'packages'));
        walk(path.join(root, 'src'));
        expect(hits.filter(h => !h.endsWith('retire-legacy-session-lookup.test.ts'))).toEqual([]);
    });
});

describe('K75: the session lookup module keeps only the destination validator', () => {
    it('exports exactly getValidDestinations and combineValidDestinations', () => {
        expect(Object.keys(sessionLookup).sort()).toEqual(['combineValidDestinations', 'getValidDestinations']);
    });

    it('names shared by more than one Actor are excluded, unique names kept, no scanner gives none', () => {
        const scanner = { actors: [{ name: 'Alpha' }, { name: 'Twin' }, { name: 'Twin' }, { name: 'Beta' }] };
        expect(getValidDestinations(scanner).sort()).toEqual(['Alpha', 'Beta']);
        expect(combineValidDestinations(scanner).sort()).toEqual(['Alpha', 'Beta']);
        expect(getValidDestinations(undefined)).toEqual([]);
        expect(getValidDestinations({ actors: [] })).toEqual([]);
    });

    it('the retired entry points are not referenced by Core or Heartbeat', () => {
        for (const rel of ['packages/core/src/extension.ts', 'packages/core/src/apps/session/heartbeat.ts']) {
            expect(read(rel), rel).not.toMatch(/initSessionLookup|setSessionLookupLogger|lookupSessionUUID|getAllSessions|filterNamedSessions|resolveUserDataPath/);
        }
        expect(fs.existsSync(path.join(root, 'src/tests/sessionLookup-wsl2.test.ts'))).toBe(false);
    });
});

describe('K64, SPEC_ACTOR_CREATETOOL AC-6: jarvis_createActor describes the configured actors folder', () => {
    const tool = json('packages/core/package.json').contributes.languageModelTools.find((t: { name: string }) => t.name === 'jarvis_createActor');

    it('names the setting and its default and states no fixed workspace path', () => {
        const d: string = tool.modelDescription;
        expect(d).toContain('jarvis.actors.folder');
        expect(d).toContain('.jarvis/actors');
        expect(d).not.toMatch(/<workspace>\/\.jarvis\/actors\/<name>/);
        expect(d).not.toMatch(/<workspace>/);
    });

    it('the named setting is declared by the package with that default', () => {
        const props = json('packages/core/package.json').contributes.configuration.properties ?? {};
        const all = Array.isArray(json('packages/core/package.json').contributes.configuration)
            ? Object.assign({}, ...json('packages/core/package.json').contributes.configuration.map((c: { properties: object }) => c.properties))
            : props;
        expect(all['jarvis.actors.folder']?.default).toBe('.jarvis/actors');
    });

    it('keeps the other documented properties of the tool (name required, no agent)', () => {
        expect(tool.inputSchema.required).toEqual(['name', 'summary']);
        expect(Object.keys(tool.inputSchema.properties).sort()).toEqual(['initialMessage', 'model', 'name', 'summary']);
    });
});
