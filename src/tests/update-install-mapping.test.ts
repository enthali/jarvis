// REQ_REL_UPDATEINSTALL AC-1, AC-2: selective install maps only supported extension IDs
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'stream';

const VERSION = '99.0.0';
const assetNames = ['core', 'syspilot', 'suite'].map(n => `jarvis-${n}-${VERSION}.vsix`);

let installedIds: string[] = [];
const downloadedUrls: string[] = [];
const mockShowInformationMessage = vi.fn();
const mockShowErrorMessage = vi.fn();
const mockExecuteCommand = vi.fn().mockResolvedValue(undefined);
const mockOpenExternal = vi.fn().mockResolvedValue(true);

vi.mock('vscode', () => ({
    Uri: { parse: (s: string) => ({ toString: () => s }), file: (s: string) => ({ fsPath: s }) },
    ProgressLocation: { Notification: 15 },
    extensions: { get all() { return installedIds.map(id => ({ id })); } },
    commands: { executeCommand: (...a: any[]) => mockExecuteCommand(...a) },
    env: { openExternal: (...a: any[]) => mockOpenExternal(...a) },
    window: {
        showInformationMessage: (...a: any[]) => mockShowInformationMessage(...a),
        showErrorMessage: (...a: any[]) => mockShowErrorMessage(...a),
        withProgress: (_o: unknown, task: () => Promise<void>) => task(),
    },
}));

vi.mock('https', () => {
    const get = (arg: unknown, optsOrCb: unknown, maybeCb?: unknown) => {
        const cb = (typeof optsOrCb === 'function' ? optsOrCb : maybeCb) as (r: unknown) => void;
        const isApi = typeof arg === 'object';
        if (!isApi) { downloadedUrls.push(arg as string); }
        const release = {
            tag_name: `v${VERSION}`,
            html_url: 'https://example.test/release',
            assets: assetNames.map(name => ({ name, browser_download_url: `https://example.test/${name}` })),
        };
        queueMicrotask(() => {
            const res = Readable.from([isApi ? JSON.stringify(release) : 'vsix']) as any;
            res.statusCode = 200;
            res.headers = {};
            cb(res);
        });
        return { on: () => ({}) };
    };
    return { get, default: { get } };
});

import { checkForUpdates } from '../../packages/core/src/engine/core/updateCheck';

const context = { extension: { packageJSON: { version: '1.0.0' } } } as any;

beforeEach(() => {
    downloadedUrls.length = 0;
    vi.clearAllMocks();
    mockShowInformationMessage.mockImplementation((msg: string) =>
        Promise.resolve(msg.includes('is available') ? 'Download & Install' : undefined));
});

describe('REQ_REL_UPDATEINSTALL: installed extension mapping', () => {
    it('AC-1: a supported installed extension is matched to its asset and installed', async () => {
        installedIds = ['enthali.jarvis-core'];
        await checkForUpdates(context, true);
        expect(downloadedUrls).toEqual([`https://example.test/jarvis-core-${VERSION}.vsix`]);
        expect(mockExecuteCommand).toHaveBeenCalledWith(
            'workbench.extensions.installExtension', expect.anything());
    });

    it('AC-1: an installed Suite is not updated, other matches are unaffected', async () => {
        installedIds = ['enthali.jarvis-suite', 'enthali.jarvis-syspilot'];
        await checkForUpdates(context, true);
        expect(downloadedUrls).toEqual([`https://example.test/jarvis-syspilot-${VERSION}.vsix`]);
    });

    it('AC-1: with only the Suite installed nothing is downloaded or uninstalled; the release page opens', async () => {
        installedIds = ['enthali.jarvis-suite'];
        await checkForUpdates(context, true);
        expect(downloadedUrls).toEqual([]);
        expect(mockExecuteCommand).not.toHaveBeenCalledWith(
            expect.stringMatching(/install|uninstall/i), expect.anything());
        expect(mockShowErrorMessage).toHaveBeenCalled();
        expect(mockOpenExternal).toHaveBeenCalled();
    });
});
