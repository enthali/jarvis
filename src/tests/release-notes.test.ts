// SPEC_REL_RELEASENOTES AC-2..AC-8
import { describe, it, expect, vi, beforeEach } from 'vitest';

const globalStateStore = new Map<string, unknown>();
const mockOpenExternal = vi.fn<(uri: any) => Promise<boolean>>().mockResolvedValue(true);
const mockShowInformationMessage = vi.fn().mockResolvedValue(undefined);
const mockGetConfiguration = vi.fn();

vi.mock('vscode', () => ({
    Uri: { parse: (s: string) => ({ toString: () => s, scheme: 'https', authority: 'github.com', path: s }) },
    env: { openExternal: (...args: any[]) => mockOpenExternal(...args) },
    window: { showInformationMessage: (...args: any[]) => mockShowInformationMessage(...args) },
    workspace: { getConfiguration: (...args: any[]) => mockGetConfiguration(...args) },
}));

import { announceIfNewVersion, showReleaseNotes } from '../../packages/core/src/engine/core/releaseNotes';

function makeContext(version: string, seenVersion?: string) {
    globalStateStore.clear();
    if (seenVersion !== undefined) {
        globalStateStore.set('jarvis.releaseNotes.lastShownVersion', seenVersion);
    }
    return {
        extension: { packageJSON: { version } },
        globalState: {
            get: <T>(key: string) => globalStateStore.get(key) as T | undefined,
            update: vi.fn(async (key: string, value: unknown) => { globalStateStore.set(key, value); }),
        },
    } as any;
}

function makeLog() {
    return { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
}

beforeEach(() => {
    vi.clearAllMocks();
    globalStateStore.clear();
    mockGetConfiguration.mockReturnValue({ get: (_key: string, def: boolean) => def });
});

describe('SPEC_REL_RELEASENOTES: announceIfNewVersion', () => {
    // AC-2: first install records marker, does not open
    it('first install (undefined marker) records version and does not open', async () => {
        const ctx = makeContext('1.2.0');
        const log = makeLog();
        await announceIfNewVersion(ctx, log);

        expect(ctx.globalState.update).toHaveBeenCalledWith(
            'jarvis.releaseNotes.lastShownVersion', '1.2.0'
        );
        expect(mockOpenExternal).not.toHaveBeenCalled();
        expect(log.info).toHaveBeenCalledWith(expect.stringContaining('first install'));
    });

    // AC-3: marker === installed → no open, no notification, no network
    it('marker equals installed version → no action', async () => {
        const ctx = makeContext('1.2.0', '1.2.0');
        await announceIfNewVersion(ctx);

        expect(ctx.globalState.update).not.toHaveBeenCalled();
        expect(mockOpenExternal).not.toHaveBeenCalled();
    });

    // AC-4: marker differs, setting true → openExternal with correct URL
    it('marker differs and setting true → opens release page', async () => {
        const ctx = makeContext('1.3.0', '1.2.0');
        mockGetConfiguration.mockReturnValue({ get: () => true });

        await announceIfNewVersion(ctx);

        expect(mockOpenExternal).toHaveBeenCalledTimes(1);
        const uri = mockOpenExternal.mock.calls[0][0];
        expect(uri.toString()).toBe('https://github.com/enthali/jarvis/releases/tag/v1.3.0');
        expect(globalStateStore.get('jarvis.releaseNotes.lastShownVersion')).toBe('1.3.0');
    });

    // AC-5: marker differs, setting false → no open, marker still advances
    it('marker differs and setting false → no open, marker advanced', async () => {
        const ctx = makeContext('1.3.0', '1.2.0');
        mockGetConfiguration.mockReturnValue({ get: () => false });

        await announceIfNewVersion(ctx);

        expect(mockOpenExternal).not.toHaveBeenCalled();
        expect(globalStateStore.get('jarvis.releaseNotes.lastShownVersion')).toBe('1.3.0');
    });

    // AC-6: globalState.update rejects → nothing opened
    it('globalState.update failure → no open', async () => {
        const ctx = makeContext('1.3.0', '1.2.0');
        ctx.globalState.update.mockRejectedValueOnce(new Error('disk full'));
        const log = makeLog();

        await announceIfNewVersion(ctx, log);

        expect(mockOpenExternal).not.toHaveBeenCalled();
        expect(log.error).toHaveBeenCalledWith(expect.stringContaining('marker write failed'));
    });

    // AC-7: openExternal returns false → information message shown
    it('openExternal returns false → shows information message with URL', async () => {
        const ctx = makeContext('1.3.0', '1.2.0');
        mockGetConfiguration.mockReturnValue({ get: () => true });
        mockOpenExternal.mockResolvedValueOnce(false);

        await announceIfNewVersion(ctx);

        expect(mockShowInformationMessage).toHaveBeenCalledWith(
            expect.stringContaining('https://github.com/enthali/jarvis/releases/tag/v1.3.0')
        );
    });
});

describe('SPEC_REL_RELEASENOTES: showReleaseNotes (manual command)', () => {
    // AC-8: opens installed version regardless of marker/setting, does not change marker
    it('opens current version notes and does not touch marker', async () => {
        const ctx = makeContext('2.0.0', '1.5.0');
        await showReleaseNotes(ctx);

        expect(mockOpenExternal).toHaveBeenCalledTimes(1);
        const uri = mockOpenExternal.mock.calls[0][0];
        expect(uri.toString()).toBe('https://github.com/enthali/jarvis/releases/tag/v2.0.0');
        // marker unchanged
        expect(globalStateStore.get('jarvis.releaseNotes.lastShownVersion')).toBe('1.5.0');
    });

    it('works with no prior marker', async () => {
        const ctx = makeContext('1.0.0');
        await showReleaseNotes(ctx);

        expect(mockOpenExternal).toHaveBeenCalledTimes(1);
        expect(globalStateStore.has('jarvis.releaseNotes.lastShownVersion')).toBe(false);
    });
});
