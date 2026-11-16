/**
 * REQ_MOD_ACTORRULES AC-3 / SPEC_MOD_ACTORRULES AC-1..AC-3: jarvis.actor.autoProvision defaults to true
 * in the manifest and in the runtime fallback; unset provisions the three files, explicit false removes them.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { provisionModuleAssets } from '../../packages/core/src/engine/core/assetProvisioning';

const root = path.resolve(__dirname, '..', '..');
const coreDir = path.join(root, 'packages', 'core');
const manifest = JSON.parse(fs.readFileSync(path.join(coreDir, 'package.json'), 'utf-8'));
const extensionSrc = fs.readFileSync(path.join(coreDir, 'src', 'extension.ts'), 'utf-8');
const sourceDir = path.join(coreDir, 'assets', 'instructions');
const bundled = fs.readdirSync(sourceDir).filter(n => n.startsWith('jarvis-actor.'));

afterEach(() => { vi.restoreAllMocks(); });

function fakeContext(): vscode.ExtensionContext {
    const state = new Map<string, unknown>();
    return {
        workspaceState: {
            get: (k: string, d?: unknown) => (state.has(k) ? state.get(k) : d),
            update: async (k: string, v: unknown) => { state.set(k, v); },
        },
    } as unknown as vscode.ExtensionContext;
}

describe('jarvis.actor.autoProvision defaults to true', () => {
    it('manifest default is true and the runtime fallback is true', () => {
        expect(manifest.contributes.configuration.flatMap((c: any) => Object.entries(c.properties))
            .find(([k]: [string, unknown]) => k === 'jarvis.actor.autoProvision')[1].default).toBe(true);
        expect(extensionSrc).toMatch(/getConfiguration\('jarvis\.actor'\)\.get<boolean>\('autoProvision', true\)/);
    });

    it('unset setting provisions the bundled files; explicit false removes exactly those and keeps others', async () => {
        const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'actor-provision-'));
        try {
            vi.spyOn(vscode.workspace, 'workspaceFolders', 'get').mockReturnValue([{ uri: { fsPath: ws } }] as any);
            const target = path.join(ws, '.github', 'instructions');
            const ctx = fakeContext();
            const unset = vscode.workspace.getConfiguration('jarvis.actor').get<boolean>('autoProvision', true);

            await provisionModuleAssets(ctx, { namespace: 'jarvis-actor', instructionsSourceDir: sourceDir, enabled: unset });
            expect(bundled).toHaveLength(3);
            for (const n of bundled) {
                expect(fs.readFileSync(path.join(target, n))).toEqual(fs.readFileSync(path.join(sourceDir, n)));
            }

            fs.writeFileSync(path.join(target, 'mermaid.instructions.md'), 'foreign');
            await provisionModuleAssets(ctx, { namespace: 'jarvis-actor', instructionsSourceDir: sourceDir, enabled: false });
            expect(fs.readdirSync(target)).toEqual(['mermaid.instructions.md']);
        } finally {
            fs.rmSync(ws, { recursive: true, force: true });
        }
    });
});
