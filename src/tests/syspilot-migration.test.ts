// SPEC_CFG_STATEMIGRATION: syspilot addAutoDelivery union-write-remove cycle

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { checkSyspilotVersion } from '../../packages/syspilot/src/versionCheck';

/* eslint-disable @typescript-eslint/no-explicit-any */
function makeFakeApi(sendMessage = vi.fn()) {
    return {
        listJarvisSessions: () => [],
        invokeTool: vi.fn().mockResolvedValue(undefined),
        sendMessage,
    } as any;
}
function makeFakeLog() { return { info: vi.fn(), warn: vi.fn() } as any; }

function markInstalled(workspaceRoot: string): void {
    const markerPath = path.join(workspaceRoot, '.github', 'agents', 'syspilot.pm.agent.md');
    fs.mkdirSync(path.dirname(markerPath), { recursive: true });
    fs.writeFileSync(markerPath, '# marker');
}

let tmpDir: string;
beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-spl-mig-')); });
afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

describe('SPEC_CFG_STATEMIGRATION: syspilot addAutoDelivery union-write-remove', () => {
    it('writes to current path (.jarvis/messages/autodelivery.json)', async () => {
        markInstalled(tmpDir);
        const upstream = '---\nversion: 99.0.0\n---\nbody';
        globalThis.fetch = (async () => ({ ok: true, status: 200, text: async () => upstream })) as any;

        await checkSyspilotVersion(makeFakeApi(), tmpDir, makeFakeLog());

        const currentPath = path.join(tmpDir, '.jarvis', 'messages', 'autodelivery.json');
        expect(fs.existsSync(currentPath)).toBe(true);
        expect(JSON.parse(fs.readFileSync(currentPath, 'utf-8'))).toContain('Syspilot Setup Engineer');
    });

    it('union-reads legacy and removes it after persisting to current', async () => {
        markInstalled(tmpDir);
        // Pre-seed legacy path with existing entries
        const legacyPath = path.join(tmpDir, '.jarvis', 'autodelivery.json');
        fs.mkdirSync(path.dirname(legacyPath), { recursive: true });
        fs.writeFileSync(legacyPath, JSON.stringify(['ExistingActor']));

        const upstream = '---\nversion: 99.0.0\n---\nbody';
        globalThis.fetch = (async () => ({ ok: true, status: 200, text: async () => upstream })) as any;

        await checkSyspilotVersion(makeFakeApi(), tmpDir, makeFakeLog());

        // Legacy removed
        expect(fs.existsSync(legacyPath)).toBe(false);
        // Current has both entries (union)
        const currentPath = path.join(tmpDir, '.jarvis', 'messages', 'autodelivery.json');
        const written = JSON.parse(fs.readFileSync(currentPath, 'utf-8')) as string[];
        expect(written).toContain('ExistingActor');
        expect(written).toContain('Syspilot Setup Engineer');
    });

    it('deduplicates: entry in both legacy and current is not duplicated', async () => {
        markInstalled(tmpDir);
        // Pre-seed both paths with the same actor
        const legacyPath = path.join(tmpDir, '.jarvis', 'autodelivery.json');
        const currentPath = path.join(tmpDir, '.jarvis', 'messages', 'autodelivery.json');
        fs.mkdirSync(path.dirname(legacyPath), { recursive: true });
        fs.mkdirSync(path.dirname(currentPath), { recursive: true });
        fs.writeFileSync(legacyPath, JSON.stringify(['Syspilot Setup Engineer']));
        fs.writeFileSync(currentPath, JSON.stringify(['Syspilot Setup Engineer']));

        const upstream = '---\nversion: 99.0.0\n---\nbody';
        globalThis.fetch = (async () => ({ ok: true, status: 200, text: async () => upstream })) as any;

        await checkSyspilotVersion(makeFakeApi(), tmpDir, makeFakeLog());

        // Legacy removed
        expect(fs.existsSync(legacyPath)).toBe(false);
        // No duplicates
        const written = JSON.parse(fs.readFileSync(currentPath, 'utf-8')) as string[];
        const unique = [...new Set(written)];
        expect(written).toEqual(unique);
    });
});
