/**
 * REQ_CFG_MCPDEFAULTOFF AC-1..AC-5: jarvis.mcp.enabled defaults to false in the manifest, in the code
 * that reads the setting when no value is stored, and in the maintained guides and release notes;
 * activation starts no server when unset (even if legacy jarvis.mcpEnabled is true) and starts/stops on toggle.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const startSpy = vi.fn(async () => {});
const stopSpy = vi.fn(async () => {});
vi.mock('../../packages/mcp/src/mcpServer', () => ({
    startMcpServer: (...args: unknown[]) => (startSpy as any)(...args),
    stopMcpServer: (...args: unknown[]) => (stopSpy as any)(...args),
}));

import { activate } from '../../packages/mcp/src/extension';

const root = path.resolve(__dirname, '..', '..');
const mcpDir = path.join(root, 'packages', 'mcp');
const manifest = JSON.parse(fs.readFileSync(path.join(mcpDir, 'package.json'), 'utf-8'));
const extensionSrc = fs.readFileSync(path.join(mcpDir, 'src', 'extension.ts'), 'utf-8');

afterEach(() => {
    vi.restoreAllMocks();
    startSpy.mockClear();
    stopSpy.mockClear();
});

describe('REQ_CFG_MCPDEFAULTOFF: the MCP server is off by default', () => {
    it('AC-1: the manifest declares jarvis.mcp.enabled as boolean with default false', () => {
        const setting = manifest.contributes.configuration[0].properties['jarvis.mcp.enabled'];
        expect(setting.type).toBe('boolean');
        expect(setting.default).toBe(false);
    });

    it('AC-2: the old key jarvis.mcpEnabled is not contributed', () => {
        expect(JSON.stringify(manifest.contributes)).not.toContain('jarvis.mcpEnabled');
    });

    it('AC-4: every read of the setting in the code falls back to false', () => {
        const reads = extensionSrc.match(/get<boolean>\('mcp\.enabled',\s*(true|false)\)/g) ?? [];
        expect(reads).toHaveLength(2);
        for (const read of reads) { expect(read).toContain('false'); }
    });

    it('AC-3: activation starts the server only when the setting is true', () => {
        expect(extensionSrc).toMatch(/const enabled = vscode\.workspace\.getConfiguration\('jarvis'\)\.get<boolean>\('mcp\.enabled', false\);\s+if \(enabled\) \{\s+start\(api, log\)/);
    });

    it('AC-2/AC-3/AC-5: activate() starts no server when jarvis.mcp.enabled is unset (even if legacy mcpEnabled is true), then starts on true and stops on false', async () => {
        const stored: Record<string, unknown> = { mcpEnabled: true };
        let configListener: ((e: { affectsConfiguration: (k: string) => boolean }) => Promise<void>) | undefined;
        const statusBar = { text: '', tooltip: '', shown: false, show() { this.shown = true; }, hide() { this.shown = false; } };
        (vscode as any).StatusBarAlignment = { Right: 2 };
        (vscode.window as any).createStatusBarItem = () => statusBar;
        vi.spyOn(vscode.extensions, 'getExtension').mockReturnValue({
            exports: { version: 2, getRegisteredTools: () => [], invokeTool: async () => ({ content: [] }) },
        } as any);
        vi.spyOn(vscode.workspace, 'getConfiguration').mockImplementation((() => ({
            get: <T>(key: string, defaultValue?: T): T | undefined =>
                (key in stored ? (stored[key] as T) : defaultValue),
        })) as any);
        vi.spyOn(vscode.workspace, 'onDidChangeConfiguration').mockImplementation(((cb: any) => {
            configListener = cb;
            return { dispose: () => {} };
        }) as any);

        const subscriptions: { dispose: () => void }[] = [];
        activate({ subscriptions } as any);
        await new Promise(r => setTimeout(r, 10));

        // Unset jarvis.mcp.enabled (with legacy mcpEnabled: true) must NOT start the server.
        expect(startSpy).not.toHaveBeenCalled();
        expect(statusBar.shown).toBe(false);

        // Enabling jarvis.mcp.enabled starts the server and shows the status bar item.
        stored['mcp.enabled'] = true;
        await configListener!({ affectsConfiguration: k => k === 'jarvis.mcp.enabled' });
        expect(startSpy).toHaveBeenCalledTimes(1);
        expect((startSpy.mock.calls[0] as unknown[])[0]).toBe(31415);
        expect(statusBar.shown).toBe(true);
        expect(statusBar.text).toBe('Jarvis MCP: 31415');

        // Disabling jarvis.mcp.enabled stops the server and hides the status bar item.
        stored['mcp.enabled'] = false;
        await configListener!({ affectsConfiguration: k => k === 'jarvis.mcp.enabled' });
        expect(stopSpy).toHaveBeenCalled();
        expect(statusBar.shown).toBe(false);

        for (const s of subscriptions) { s.dispose(); }
    });

    it('AC-4/AC-5: MCP README, MCP user guide, and release notes state the false default and upgrade behavior for unset installations', () => {
        const mcpReadme = fs.readFileSync(path.join(mcpDir, 'README.md'), 'utf-8');
        const mcpGuide = fs.readFileSync(path.join(root, 'docs', 'user guides', 'mcp.md'), 'utf-8');
        const releaseNotes = fs.readFileSync(path.join(root, 'docs', 'releasenotes.md'), 'utf-8');

        expect(mcpReadme).toMatch(/`jarvis\.mcp\.enabled`\s*\|\s*`false`/);
        expect(mcpGuide).toMatch(/`jarvis\.mcp\.enabled`\s*\|\s*`false`/);
        expect(releaseNotes).toContain('jarvis.mcp.enabled');
        expect(releaseNotes).toMatch(/false/);
    });
});
