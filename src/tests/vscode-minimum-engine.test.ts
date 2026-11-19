// REQ_REL_PKGCONTRACT AC-9, SPEC_REL_PKGCONTRACT AC-9 (vscode-minimum-1-144 CR).
// Black-box repository check: every extension manifest and its lockfile entry declare one minimum VS Code.
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const MINIMUM = '^1.144.0';
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

// Discovered, so a package added later is held to the same minimum.
const manifests = ['package.json', ...fs.readdirSync(path.join(ROOT, 'packages'), { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(ROOT, 'packages', d.name, 'package.json')))
    .map(d => `packages/${d.name}/package.json`)];

describe('REQ_REL_PKGCONTRACT AC-9: one minimum VS Code version', () => {
    it('finds the root manifest and every package manifest', () => {
        expect(manifests.length).toBeGreaterThanOrEqual(8);
    });

    it.each(manifests)('%s declares engines.vscode %s', (rel) => {
        expect(readJson(rel).engines?.vscode).toBe(MINIMUM);
    });

    it('lockfile workspace entries agree with the manifests', () => {
        const lock = readJson('package-lock.json').packages as Record<string, { engines?: { vscode?: string } }>;
        for (const rel of manifests) {
            const key = rel === 'package.json' ? '' : path.posix.dirname(rel);
            expect(lock[key]?.engines?.vscode, key || 'root').toBe(MINIMUM);
        }
    });

    it('the @types/vscode floor does not exceed the engine minimum (vsce rejects a higher one)', () => {
        for (const rel of manifests) {
            const types = readJson(rel).devDependencies?.['@types/vscode'] as string | undefined;
            if (!types) { continue; }
            const [maj, min] = types.replace(/^[^\d]*/, '').split('.').map(Number);
            expect(maj === 1 && min <= 144, `${rel} @types/vscode ${types}`).toBe(true);
        }
    });
});
