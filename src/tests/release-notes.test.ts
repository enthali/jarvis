// SPEC_REL_RELEASENOTES AC-2..AC-11
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let tmpDir: string;
let jarvisDir: string;
let stateDir: string;
let statePath: string;

const mockGetCommands = vi.fn<() => Promise<string[]>>().mockResolvedValue(['workbench.action.browser.open']);
const mockExecuteCommand = vi.fn().mockResolvedValue(undefined);
const mockOpenExternal = vi.fn<(uri: any) => Promise<boolean>>().mockResolvedValue(true);
const mockShowInformationMessage = vi.fn().mockResolvedValue(undefined);
const mockGetConfiguration = vi.fn();

vi.mock('vscode', () => ({
    Uri: { parse: (s: string) => ({ toString: () => s, scheme: 'https' }) },
    commands: {
        getCommands: (...args: any[]) => mockGetCommands(...args),
        executeCommand: (...args: any[]) => mockExecuteCommand(...args),
    },
    env: { openExternal: (...args: any[]) => mockOpenExternal(...args) },
    window: { showInformationMessage: (...args: any[]) => mockShowInformationMessage(...args) },
    workspace: { getConfiguration: (...args: any[]) => mockGetConfiguration(...args) },
}));

vi.mock('../../packages/core/src/engine/core/configPaths', () => ({
    getJarvisDir: () => jarvisDir,
    ensureStateDir: () => {
        fs.mkdirSync(stateDir, { recursive: true });
        return stateDir;
    },
    getReleaseNotesStatePath: () => statePath,
}));

import { announceIfNewVersion, showReleaseNotes } from '../../packages/core/src/engine/core/releaseNotes';

function makeContext(version: string) {
    return { extension: { packageJSON: { version } } } as any;
}

function makeLog() {
    return { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
}

function writeMarker(version: string) {
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify({ lastShownVersion: version }), 'utf8');
}

beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-rn-'));
    jarvisDir = path.join(tmpDir, '.jarvis');
    stateDir = path.join(jarvisDir, 'state');
    statePath = path.join(stateDir, 'release-notes.json');
    mockGetCommands.mockResolvedValue(['workbench.action.browser.open']);
    mockGetConfiguration.mockReturnValue({ get: (_key: string, def: boolean) => def });
});

afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('SPEC_REL_RELEASENOTES: announceIfNewVersion', () => {
    // AC-2: no workspace → warn, no write, no open
    it('no workspace folder → logs warning, does nothing', async () => {
        // Override to simulate no workspace
        const origStatePath = statePath;
        statePath = undefined as any;
        const log = makeLog();
        const ctx = makeContext('1.0.0');

        await announceIfNewVersion(ctx, log);

        expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('no workspace'));
        expect(mockExecuteCommand).not.toHaveBeenCalled();
        expect(mockOpenExternal).not.toHaveBeenCalled();
        statePath = origStatePath;
    });

    // AC-3: no marker, no .jarvis/ → records version, does not open
    it('no marker and no .jarvis dir → records version silently', async () => {
        const ctx = makeContext('1.2.0');
        const log = makeLog();
        await announceIfNewVersion(ctx, log);

        expect(fs.existsSync(statePath)).toBe(true);
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        expect(state.lastShownVersion).toBe('1.2.0');
        expect(mockExecuteCommand).not.toHaveBeenCalled();
        expect(log.info).toHaveBeenCalledWith(expect.stringContaining('workspace new to Jarvis'));
    });

    // AC-4: no marker, existing .jarvis/ → opens notes
    it('no marker but .jarvis/ exists → opens notes', async () => {
        fs.mkdirSync(jarvisDir, { recursive: true });
        const ctx = makeContext('1.2.0');
        await announceIfNewVersion(ctx);

        expect(mockExecuteCommand).toHaveBeenCalledWith(
            'simpleBrowser.api.open',
            expect.objectContaining({ toString: expect.any(Function) })
        );
        const uri = mockExecuteCommand.mock.calls[0][1];
        expect(uri.toString()).toBe('https://github.com/enthali/jarvis/releases/tag/v1.2.0');
    });

    // AC-5: marker === installed → no action
    it('marker equals installed version → no action', async () => {
        writeMarker('1.2.0');
        const ctx = makeContext('1.2.0');
        await announceIfNewVersion(ctx);

        expect(mockExecuteCommand).not.toHaveBeenCalled();
        expect(mockOpenExternal).not.toHaveBeenCalled();
    });

    // AC-6: marker differs, setting true → simpleBrowser.api.open, no openExternal
    it('marker differs, setting true → opens via simpleBrowser', async () => {
        writeMarker('1.2.0');
        const ctx = makeContext('1.3.0');
        await announceIfNewVersion(ctx);

        expect(mockExecuteCommand).toHaveBeenCalledWith(
            'simpleBrowser.api.open',
            expect.objectContaining({ toString: expect.any(Function) })
        );
        expect(mockOpenExternal).not.toHaveBeenCalled();
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        expect(state.lastShownVersion).toBe('1.3.0');
    });

    // AC-7: marker differs, setting false → no open, marker advanced
    it('marker differs, setting false → no open, marker advanced', async () => {
        writeMarker('1.2.0');
        mockGetConfiguration.mockReturnValue({ get: () => false });
        const ctx = makeContext('1.3.0');
        await announceIfNewVersion(ctx);

        expect(mockExecuteCommand).not.toHaveBeenCalled();
        expect(mockOpenExternal).not.toHaveBeenCalled();
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        expect(state.lastShownVersion).toBe('1.3.0');
    });

    // AC-8: write throws → nothing opened
    it('marker write failure → no open', async () => {
        // Make stateDir unwritable by pointing to an invalid path
        const origStateDir = stateDir;
        const origStatePath = statePath;
        stateDir = path.join(tmpDir, '\0invalid');
        statePath = path.join(stateDir, 'release-notes.json');
        const log = makeLog();
        const ctx = makeContext('1.3.0');

        await announceIfNewVersion(ctx, log);

        expect(mockExecuteCommand).not.toHaveBeenCalled();
        expect(log.error).toHaveBeenCalledWith(expect.stringContaining('marker write failed'));
        stateDir = origStateDir;
        statePath = origStatePath;
    });

    // AC-9: unparseable marker file → treated as absent
    it('corrupt marker file → behaves like no marker (new workspace)', async () => {
        fs.mkdirSync(stateDir, { recursive: true });
        fs.writeFileSync(statePath, '{{{not json', 'utf8');
        const ctx = makeContext('1.0.0');
        const log = makeLog();
        await announceIfNewVersion(ctx, log);

        // No .jarvis/ pre-existing (only state/ from our test setup shares jarvisDir)
        // Actually jarvisDir exists because stateDir is inside it
        // so this should open notes (known workspace, no prior seen version)
        expect(mockExecuteCommand).toHaveBeenCalled();
    });

    // AC-10: integrated browser absent → fallback message shown
    it('workbench.action.browser.open absent → shows info message', async () => {
        writeMarker('1.2.0');
        mockGetCommands.mockResolvedValue([]);
        const log = makeLog();
        const ctx = makeContext('1.3.0');
        await announceIfNewVersion(ctx, log);

        expect(mockExecuteCommand).not.toHaveBeenCalledWith('simpleBrowser.api.open', expect.anything());
        expect(mockShowInformationMessage).toHaveBeenCalledWith(
            expect.stringContaining('https://github.com/enthali/jarvis/releases/tag/v1.3.0'),
            'Open in Browser'
        );
        expect(mockOpenExternal).not.toHaveBeenCalled();
    });

    // AC-10 continued: user clicks "Open in Browser" → openExternal called
    it('"Open in Browser" chosen → openExternal called', async () => {
        writeMarker('1.2.0');
        mockGetCommands.mockResolvedValue([]);
        mockShowInformationMessage.mockResolvedValue('Open in Browser');
        const ctx = makeContext('1.3.0');
        await announceIfNewVersion(ctx);

        expect(mockOpenExternal).toHaveBeenCalledTimes(1);
    });
});

describe('SPEC_REL_RELEASENOTES: showReleaseNotes (manual command)', () => {
    // AC-11: opens installed version regardless of marker/setting, marker unchanged
    it('opens current version and does not touch marker', async () => {
        writeMarker('1.0.0');
        const ctx = makeContext('2.0.0');
        await showReleaseNotes(ctx);

        expect(mockExecuteCommand).toHaveBeenCalledWith(
            'simpleBrowser.api.open',
            expect.objectContaining({ toString: expect.any(Function) })
        );
        const uri = mockExecuteCommand.mock.calls[0][1];
        expect(uri.toString()).toBe('https://github.com/enthali/jarvis/releases/tag/v2.0.0');
        // marker unchanged
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        expect(state.lastShownVersion).toBe('1.0.0');
    });

    // AC-11: works with no workspace
    it('works with no workspace folder open', async () => {
        const origStatePath = statePath;
        statePath = undefined as any;
        const ctx = makeContext('1.0.0');
        await showReleaseNotes(ctx);

        expect(mockExecuteCommand).toHaveBeenCalledWith(
            'simpleBrowser.api.open',
            expect.objectContaining({ toString: expect.any(Function) })
        );
        statePath = origStatePath;
    });
});
