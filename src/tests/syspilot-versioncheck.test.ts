// Implementation: SPEC_SPL_STARTUP, SPEC_SPL_NOTIFY, SPEC_SPL_STATE
// Requirements: REQ_SPL_STARTUP_CHECK, REQ_SPL_NOTIFY, REQ_SPL_STATE

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseFrontmatterVersion, upstreamUrl, UPDATE_NOTIFICATION_TEXT, checkSyspilotVersion, manualSyspilotUpdate } from '../../packages/syspilot/src/versionCheck';
import { readState, writeState } from '../../packages/syspilot/src/state';

/* eslint-disable @typescript-eslint/no-explicit-any */
function makeFakeApi(sendMessage = vi.fn()) {
    return {
        listJarvisSessions: () => [],
        invokeTool: vi.fn().mockResolvedValue(undefined),
        sendMessage,
    } as any;
}

function makeFakeLog() {
    return { info: vi.fn(), warn: vi.fn() } as any;
}

function markInstalled(workspaceRoot: string): void {
    const markerPath = path.join(workspaceRoot, '.github', 'agents', 'syspilot.pm.agent.md');
    fs.mkdirSync(path.dirname(markerPath), { recursive: true });
    fs.writeFileSync(markerPath, '# marker');
}

describe('SPEC_SPL_STARTUP AC-4: checkSyspilotVersion first-run always notifies (bug fix)', () => {
    let tmpDir: string;
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-syspilot-startup-test-'));
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        globalThis.fetch = originalFetch;
    });

    it('reaches notifyActor() on first run even though the freshly copied file trivially matches upstream', async () => {
        const upstreamContent = '---\nname: syspilot.setup\nversion: 1.0.0\n---\n\nbody';
        globalThis.fetch = (async () => ({ ok: true, status: 200, text: async () => upstreamContent })) as any;

        const sendMessage = vi.fn();
        const log = makeFakeLog();

        await checkSyspilotVersion(makeFakeApi(sendMessage), tmpDir, log);

        expect(sendMessage).toHaveBeenCalledTimes(1);
        expect(sendMessage).toHaveBeenCalledWith('Syspilot Setup Engineer', 'jarvis-syspilot', UPDATE_NOTIFICATION_TEXT);

        const localPath = path.join(tmpDir, '.github', 'agents', 'syspilot.setup.agent.md');
        expect(fs.existsSync(localPath)).toBe(true);
        expect(fs.readFileSync(localPath, 'utf-8')).toBe(upstreamContent);
    });

    it('does NOT notify when installed and the local file already matches the upstream version', async () => {
        const content = '---\nname: syspilot.setup\nversion: 1.0.0\n---\n\nbody';
        const localPath = path.join(tmpDir, '.github', 'agents', 'syspilot.setup.agent.md');
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, content);
        markInstalled(tmpDir);

        globalThis.fetch = (async () => ({ ok: true, status: 200, text: async () => content })) as any;

        const sendMessage = vi.fn();
        const log = makeFakeLog();

        await checkSyspilotVersion(makeFakeApi(sendMessage), tmpDir, log);

        expect(sendMessage).not.toHaveBeenCalled();
        expect(log.info).toHaveBeenCalledWith(expect.stringContaining('up to date'));
    });

    it('SPEC_SPL_STARTUP AC-6: still notifies on matching versions when the PM install marker is absent (installation incomplete)', async () => {
        const content = '---\nname: syspilot.setup\nversion: 1.0.0\n---\n\nbody';
        const localPath = path.join(tmpDir, '.github', 'agents', 'syspilot.setup.agent.md');
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, content);
        // No syspilot.pm.agent.md marker written -- installation considered incomplete.

        globalThis.fetch = (async () => ({ ok: true, status: 200, text: async () => content })) as any;

        const sendMessage = vi.fn();
        const log = makeFakeLog();

        await checkSyspilotVersion(makeFakeApi(sendMessage), tmpDir, log);

        expect(sendMessage).toHaveBeenCalledTimes(1);
        expect(log.info).toHaveBeenCalledWith(expect.stringContaining('installed=false'));
    });

    it('manualSyspilotUpdate: shows up-to-date info message when installed and versions match', async () => {
        const content = '---\nname: syspilot.setup\nversion: 1.0.0\n---\n\nbody';
        const localPath = path.join(tmpDir, '.github', 'agents', 'syspilot.setup.agent.md');
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, content);
        markInstalled(tmpDir);

        globalThis.fetch = (async () => ({ ok: true, status: 200, text: async () => content })) as any;

        const sendMessage = vi.fn();
        await manualSyspilotUpdate(makeFakeApi(sendMessage), tmpDir, makeFakeLog());

        expect(sendMessage).not.toHaveBeenCalled();
    });

    it('manualSyspilotUpdate: notifies when installed but the PM marker is absent, even if versions match', async () => {
        const content = '---\nname: syspilot.setup\nversion: 1.0.0\n---\n\nbody';
        const localPath = path.join(tmpDir, '.github', 'agents', 'syspilot.setup.agent.md');
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, content);

        globalThis.fetch = (async () => ({ ok: true, status: 200, text: async () => content })) as any;

        const sendMessage = vi.fn();
        await manualSyspilotUpdate(makeFakeApi(sendMessage), tmpDir, makeFakeLog());

        expect(sendMessage).toHaveBeenCalledTimes(1);
    });

    it('logs at the expected decision points: upstream version, missing-file download, and notify decision', async () => {
        const upstreamContent = '---\nversion: 2.0.0\n---\nbody';
        globalThis.fetch = (async () => ({ ok: true, status: 200, text: async () => upstreamContent })) as any;

        const log = makeFakeLog();
        await checkSyspilotVersion(makeFakeApi(), tmpDir, log);

        expect(log.info).toHaveBeenCalledWith(expect.stringContaining('upstream version: 2.0.0'));
        expect(log.info).toHaveBeenCalledWith(expect.stringContaining('local file missing'));
        expect(log.info).toHaveBeenCalledWith(expect.stringContaining('notifying Syspilot Setup Engineer'));
    });

    it('registers the actor for auto-delivery (SPEC_SPL_NOTIFY AC-4), idempotently', async () => {
        const firstUpstreamContent = '---\nversion: 3.0.0\n---\nbody';
        globalThis.fetch = (async () => ({ ok: true, status: 200, text: async () => firstUpstreamContent })) as any;

        const log = makeFakeLog();
        await checkSyspilotVersion(makeFakeApi(), tmpDir, log);

        const adPath = path.join(tmpDir, '.jarvis', 'messages', 'autodelivery.json');
        expect(fs.existsSync(adPath)).toBe(true);
        expect(JSON.parse(fs.readFileSync(adPath, 'utf-8'))).toEqual(['Syspilot Setup Engineer']);

        // A later version-mismatch notify (local stays 3.0.0, upstream bumps to 4.0.0)
        // must not duplicate the auto-delivery entry.
        const secondUpstreamContent = '---\nversion: 4.0.0\n---\nbody';
        globalThis.fetch = (async () => ({ ok: true, status: 200, text: async () => secondUpstreamContent })) as any;
        await checkSyspilotVersion(makeFakeApi(), tmpDir, makeFakeLog());
        expect(JSON.parse(fs.readFileSync(adPath, 'utf-8'))).toEqual(['Syspilot Setup Engineer']);
    });
});

describe('SPEC_SPL_NOTIFY AC-3: UPDATE_NOTIFICATION_TEXT (unified message, no initial/update distinction)', () => {
    it('matches the exact unified message template', () => {
        expect(UPDATE_NOTIFICATION_TEXT).toBe(
            'Please ask the user whether they want to install this update now, skip this version by ' +
            'calling jarvis_SyspilotSkipThisVersion(), or delay it for N days by calling jarvis_delaySyspilotUpdate(N).'
        );
    });

    it('never embeds a version number', () => {
        expect(UPDATE_NOTIFICATION_TEXT).not.toMatch(/\d+\.\d+\.\d+/);
    });

    it('offers all three choices using the actual LM tool names (install, skip, delay)', () => {
        expect(UPDATE_NOTIFICATION_TEXT.toLowerCase()).toContain('install');
        expect(UPDATE_NOTIFICATION_TEXT).toContain('jarvis_SyspilotSkipThisVersion()');
        expect(UPDATE_NOTIFICATION_TEXT).toContain('jarvis_delaySyspilotUpdate(N)');
    });

    it('does not use dot notation or "postpone" wording', () => {
        expect(UPDATE_NOTIFICATION_TEXT).not.toContain('jarvis.SyspilotSkipThisVersion');
        expect(UPDATE_NOTIFICATION_TEXT).not.toContain('jarvis.delaySyspilotUpdate');
        expect(UPDATE_NOTIFICATION_TEXT.toLowerCase()).not.toContain('postpone');
    });
});

describe('SPEC_SPL_STARTUP / REQ_SPL_SUPPLY_CHAIN: upstreamUrl', () => {
    it('includes the inner syspilot/ package prefix (enthali/syspilot nests agents under syspilot/agents/)', () => {
        expect(upstreamUrl('main', 'syspilot.setup.agent.md'))
            .toBe('https://raw.githubusercontent.com/enthali/syspilot/main/syspilot/agents/syspilot.setup.agent.md');
    });

    it('substitutes the release tag and file name', () => {
        expect(upstreamUrl('v1.2.0', 'syspilot.setup.agent.md'))
            .toBe('https://raw.githubusercontent.com/enthali/syspilot/v1.2.0/syspilot/agents/syspilot.setup.agent.md');
    });
});

describe('SPEC_SPL_STARTUP: parseFrontmatterVersion', () => {
    it('extracts a plain version value from Frontmatter', () => {
        const content = '---\nname: syspilot.setup\nversion: 1.2.0\n---\n\nbody';
        expect(parseFrontmatterVersion(content)).toBe('1.2.0');
    });

    it('extracts a double-quoted version value', () => {
        const content = '---\nversion: "1.3.0"\n---\nbody';
        expect(parseFrontmatterVersion(content)).toBe('1.3.0');
    });

    it('extracts a single-quoted version value', () => {
        const content = "---\nversion: '1.4.0'\n---\nbody";
        expect(parseFrontmatterVersion(content)).toBe('1.4.0');
    });

    it('returns undefined when there is no Frontmatter block', () => {
        expect(parseFrontmatterVersion('no frontmatter here')).toBeUndefined();
    });

    it('returns undefined when the Frontmatter has no version key', () => {
        const content = '---\nname: syspilot.setup\n---\nbody';
        expect(parseFrontmatterVersion(content)).toBeUndefined();
    });
});

describe('SPEC_SPL_STATE: readState / writeState', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-syspilot-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('AC-2: returns empty state when the file does not exist', () => {
        expect(readState(tmpDir)).toEqual({});
    });

    it('AC-2: returns empty state when the file is malformed JSON', () => {
        const p = path.join(tmpDir, '.jarvis', 'syspilot-state.json');
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, '{not valid json');
        expect(readState(tmpDir)).toEqual({});
    });

    it('AC-1: writes to <workspaceRoot>/.jarvis/syspilot-state.json, creating the dir', () => {
        writeState(tmpDir, { suspendedUntil: '2026-08-01T00:00:00.000Z' });
        const p = path.join(tmpDir, '.jarvis', 'syspilot-state.json');
        expect(fs.existsSync(p)).toBe(true);
        expect(JSON.parse(fs.readFileSync(p, 'utf-8'))).toEqual({ suspendedUntil: '2026-08-01T00:00:00.000Z' });
    });

    it('round-trips all three optional fields', () => {
        const state = { suspendedUntil: '2026-08-01T00:00:00.000Z', skippedVersion: '1.2.0', lastSeenUpstreamVersion: '1.3.0' };
        writeState(tmpDir, state);
        expect(readState(tmpDir)).toEqual(state);
    });
});
