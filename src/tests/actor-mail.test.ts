/**
 * SPEC_ACTOR_MAIL: mail indicators supplied by PIM (ActorMailStatus, readActorMail and its helpers),
 * plus the onDidScan event it depends on (SPEC_ACTOR_SCANNER).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { ActorScanner } from '../../packages/core/src/engine/actors/actorScanner';
import { ActorMailStatus } from '../../packages/pim/src/ActorMailStatus';
import { parseFolderMail, READ_SCRIPT } from '../../packages/pim/src/outlookIntegration/OutlookActorMail';

const { execFile } = vi.hoisted(() => ({ execFile: vi.fn() }));
vi.mock('child_process', async (importOriginal) => ({
    ...(await importOriginal<typeof import('child_process')>()),
    execFile,
}));

let restorePlatform: (() => void) | undefined;
const roots: string[] = [];

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    execFile.mockReset();
    restorePlatform?.();
    restorePlatform = undefined;
    for (const root of roots.splice(0)) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

interface FakeActor { name: string; id: string; summary: string; agent: string; folder: string; }

function enableOutlook(enabled: boolean): void {
    vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue(
        { get: (key: string, fallback?: unknown) => (key === 'outlook.enabled' ? enabled : fallback) } as never,
    );
}

function flush(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
}

type ExecError = Error & { killed?: boolean; code?: number | string; signal?: string };

function mockExecFile(outcome: { stdout?: string; stderr?: string; error?: ExecError }): void {
    execFile.mockImplementation((_file: string, _args: string[], _opts: unknown, callback: (...args: unknown[]) => void) => {
        callback(outcome.error ?? null, outcome.stdout ?? '', outcome.stderr ?? '');
    });
}

function setPlatform(value: string): void {
    const original = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value });
    restorePlatform = () => {
        if (original) { Object.defineProperty(process, 'platform', original); }
    };
}

/** Folder entry as the read script prints it. */
function folder(name: string, unread: number, flagged = false, checked = true) {
    return { name, unread, flagged, checked };
}
function out(...entries: ReturnType<typeof folder>[]): { stdout: string } {
    return { stdout: JSON.stringify(entries) };
}

/** A core API with one Actor per name; `scan()` plays a completed scan. */
function fakeApi(names: string[]) {
    const emitter = new vscode.EventEmitter<void>();
    const actors: FakeActor[] = names.map((name, i) => ({ name, id: `id${i}`, summary: '', agent: name, folder: '' }));
    const live = new Map<string, string[]>();
    const indicateActor = vi.fn((id: string, icon: vscode.ThemeIcon) => {
        live.set(id, [...(live.get(id) ?? []), icon.id]);
        let disposed = false;
        return new vscode.Disposable(() => {
            if (disposed) { return; }
            disposed = true;
            const rest = (live.get(id) ?? []).slice(0, -1);
            if (rest.length) { live.set(id, rest); } else { live.delete(id); }
        });
    });
    const api = {
        version: 2 as const,
        listActors: () => actors,
        indicateActor,
        onDidScanActors: emitter.event,
    };
    return {
        api: api as never,
        indicateActor,
        scan: async () => { emitter.fire(); await flush(); },
        shown: (id: string) => live.get(id)?.[live.get(id)!.length - 1],
    };
}

async function setup(names: string[], outlookOn = true) {
    setPlatform('win32');
    enableOutlook(outlookOn);
    const fake = fakeApi(names);
    const warn = vi.fn();
    const status = new ActorMailStatus(fake.api, { warn }, false);
    return { ...fake, status, warn };
}

/** The read script without its PowerShell comments. */
function codeOf(script: string): string {
    return script.replace(/#.*$/gm, '');
}

describe('SPEC_ACTOR_MAIL: parseFolderMail', () => {
    it('reads a JSON array of folder name, unread count and flag state', () => {
        expect(parseFolderMail('[{"name":"Solo","unread":3,"flagged":true,"checked":true},{"name":"Other","unread":0,"flagged":false,"checked":false}]')).toEqual([
            folder('Solo', 3, true, true),
            folder('Other', 0, false, false),
        ]);
    });

    it('returns an empty list for an empty array', () => {
        expect(parseFolderMail('[]')).toEqual([]);
    });

    it('returns undefined when the output is not a JSON array', () => {
        expect(parseFolderMail('{"name":"Solo","unread":1}')).toBeUndefined();
        expect(parseFolderMail('not json')).toBeUndefined();
        expect(parseFolderMail('')).toBeUndefined();
    });

    it('skips entries without a string name or numeric unread count', () => {
        expect(parseFolderMail('[{"name":"Solo","unread":"2"},{"unread":1},{"name":"Ok","unread":1}]')).toEqual([
            folder('Ok', 1),
        ]);
    });
});

describe('SPEC_ACTOR_SCANNER: onDidScan', () => {
    function scannerIn(): ActorScanner {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-scan-'));
        roots.push(root);
        return new ActorScanner(() => root, () => {});
    }

    it('fires after every rescan, including one that changes nothing', async () => {
        const scanner = scannerIn();
        let fired = 0;
        scanner.onDidScan(() => { fired++; });
        await scanner.rescan();
        await scanner.rescan();
        expect(fired).toBe(2);
    });

    it('fires once for concurrent rescans that share one run', async () => {
        const scanner = scannerIn();
        let fired = 0;
        scanner.onDidScan(() => { fired++; });
        await Promise.all([scanner.rescan(), scanner.rescan()]);
        expect(fired).toBe(1);
    });
});

describe('SPEC_ACTOR_MAIL: read script', () => {
    it('reads the direct Inbox children only (T-15)', () => {
        const code = codeOf(READ_SCRIPT);
        expect(code).toContain('GetDefaultFolder(6)');
        expect(code.match(/GetDefaultFolder\(/g)).toHaveLength(1);
        expect(code).toContain('$inbox.Folders');
        expect(code.match(/\.Folders\b/g)).toHaveLength(1);
    });

    it('uses only read-only members (T-21)', () => {
        const code = codeOf(READ_SCRIPT);
        const readOnly = new Set([
            'Application', 'Diagnostics', 'ElapsedMilliseconds', 'Encoding', 'EndOfTable', 'Folders',
            'GetActiveObject', 'GetDefaultFolder', 'GetTable', 'InteropServices', 'Marshal', 'Name',
            'Runtime', 'Session', 'Stopwatch', 'StartNew', 'Text', 'UnReadItemCount', 'env', 'f', 'name', 'unread',
        ]);
        const members = [...code.matchAll(/\.([A-Za-z_]\w*)/g)].map(m => m[1]);
        expect(members.filter(m => !readOnly.has(m))).toEqual([]);
        expect(code).not.toMatch(/\.\w+\s*=(?!=)/);
    });

    it('stops on an attach error before attaching (AC-5)', () => {
        const code = codeOf(READ_SCRIPT);
        const stop = code.indexOf("$ErrorActionPreference = 'Stop'");
        expect(stop).toBeGreaterThan(-1);
        expect(stop).toBeLessThan(code.indexOf('GetActiveObject'));
    });

    it('looks up flags only for candidate names, FlagStatus 2, within a budget (AC-1, AC-2, AC-9)', () => {
        const code = codeOf(READ_SCRIPT);
        expect(code).toContain("GetTable('[FlagStatus] >= 2')");
        expect(code).toContain('-ccontains $r.name');
        expect(code).toContain('ElapsedMilliseconds -lt 5000');
    });

    it('passes execFile no shell option, and the names as data, not in the script (AC-10)', async () => {
        setPlatform('win32');
        enableOutlook(true);
        mockExecFile({ stdout: '[]' });
        const tricky = 'It\'s "odd"';
        const fake = fakeApi(['Solo', tricky]);
        const status = new ActorMailStatus(fake.api, { warn: () => {} });
        await flush();
        status.dispose();
        const [, args, options] = execFile.mock.calls[0] as [string, string[], Record<string, unknown> & { env: Record<string, string> }];
        expect(options).not.toHaveProperty('shell');
        expect(args[2]).not.toContain('odd');
        expect(JSON.parse(options.env.JARVIS_ACTOR_NAMES)).toEqual(['Solo', tricky]);
    });
});

describe('SPEC_ACTOR_MAIL: ActorMailStatus reads', () => {
    it('matches the folder name exactly, case-sensitive (T-16)', async () => {
        const { scan, shown, indicateActor } = await setup(['Test1']);
        mockExecFile(out(folder('test1', 1)));
        await scan();
        expect(shown('id0')).toBeUndefined();
        expect(indicateActor).not.toHaveBeenCalled();

        mockExecFile(out(folder('Test1', 1)));
        await scan();
        expect(shown('id0')).toBe('mail');
        expect(execFile).toHaveBeenCalledTimes(2);
    });

    it('shows no indicator for an ambiguous name and starts no process for it (T-17)', async () => {
        const { scan, indicateActor, warn } = await setup(['Twin', 'Twin']);
        mockExecFile(out(folder('Twin', 4)));
        await scan();
        expect(indicateActor).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
        expect(execFile).not.toHaveBeenCalled();
    });

    it('a pending flag wins over unread mail, read or unread (AC-1)', async () => {
        const { scan, shown } = await setup(['Flagged', 'Both', 'Plain']);
        mockExecFile(out(folder('Flagged', 0, true), folder('Both', 2, true), folder('Plain', 1)));
        await scan();
        expect(shown('id0')).toBe('flag');
        expect(shown('id1')).toBe('flag');
        expect(shown('id2')).toBe('mail');
    });

    it('clearing the last flag reveals unread mail, otherwise nothing', async () => {
        const { scan, shown } = await setup(['A', 'B']);
        mockExecFile(out(folder('A', 3, true), folder('B', 0, true)));
        await scan();
        mockExecFile(out(folder('A', 3), folder('B', 0)));
        await scan();
        expect(shown('id0')).toBe('mail');
        expect(shown('id1')).toBeUndefined();
    });

    it('a skipped flag lookup does not remove unread mail and logs one line (AC-9)', async () => {
        const { scan, shown, warn } = await setup(['Solo']);
        mockExecFile(out(folder('Solo', 2, false, false)));
        await scan();
        expect(shown('id0')).toBe('mail');
        expect(warn).toHaveBeenCalledTimes(1);
    });

    it.each([
        ['non-zero exit', { error: Object.assign(new Error('Command failed'), { code: 1 }), stderr: 'boom\r\nsecond line' }, 'exit 1: boom'],
        ['timeout', { error: Object.assign(new Error('Command failed'), { killed: true }) }, 'timed out after 10 s'],
        ['output not a JSON array', { stdout: '{"name":"Test2","unread":1}' }, 'output is not a JSON array'],
    ])('on a failed read (%s) removes the indicator and logs one line (T-18)', async (_label, outcome, reason) => {
        const { scan, shown, warn } = await setup(['Test2']);
        const notifyWarning = vi.spyOn(vscode.window, 'showWarningMessage');
        const notifyInfo = vi.spyOn(vscode.window, 'showInformationMessage');
        mockExecFile(out(folder('Test2', 1)));
        await scan();
        expect(shown('id0')).toBe('mail');

        mockExecFile(outcome);
        await scan();
        expect(shown('id0')).toBeUndefined();
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).toContain(reason);
        expect(notifyWarning).not.toHaveBeenCalled();
        expect(notifyInfo).not.toHaveBeenCalled();
    });

    it('on a non-Windows platform the read fails with one log line', async () => {
        const { scan, shown, warn } = await setup(['Solo']);
        restorePlatform?.();
        setPlatform('linux');
        await scan();
        expect(shown('id0')).toBeUndefined();
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).toContain('platform is not Windows');
    });

    it('starts no process while the setting is off (T-19)', async () => {
        const { scan, indicateActor, warn } = await setup(['Solo'], false);
        await scan();
        expect(execFile).not.toHaveBeenCalled();
        expect(indicateActor).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
    });

    it('starts one read per completed scan (T-20)', async () => {
        const { scan } = await setup(['Solo']);
        mockExecFile({ stdout: '[]' });
        await scan();
        await scan();
        expect(execFile).toHaveBeenCalledTimes(2);
    });

    it('coalesces scans during a run into one re-read after it (T-20)', async () => {
        const { scan, shown } = await setup(['Test2']);
        mockExecFile(out(folder('Test2', 1)));
        let finish: ((stdout: string) => void) | undefined;
        execFile.mockImplementationOnce((_file: string, _args: string[], _opts: unknown, callback: (...args: unknown[]) => void) => {
            finish = (stdout: string) => callback(null, stdout, '');
        });
        await scan();
        await scan();
        await scan();
        expect(execFile).toHaveBeenCalledTimes(1);

        if (!finish) { throw new Error('fixture: read did not start'); }
        finish(out(folder('Test2', 1)).stdout);
        await flush();
        expect(execFile).toHaveBeenCalledTimes(2);
        expect(shown('id0')).toBe('mail');

        await flush();
        expect(execFile).toHaveBeenCalledTimes(2);
    });

    it('sets and disposes nothing for an unchanged read (AC-8)', async () => {
        const { scan, indicateActor } = await setup(['Test1', 'Test2']);
        mockExecFile(out(folder('Test2', 1)));
        await scan();
        await scan();
        expect(indicateActor).toHaveBeenCalledTimes(1);

        mockExecFile(out(folder('Test1', 2), folder('Test2', 1)));
        await scan();
        expect(indicateActor).toHaveBeenCalledTimes(2);
    });

    it('replaces the indicator when the kind changes, keeping one per Actor (AC-8)', async () => {
        const { scan, shown, indicateActor } = await setup(['Solo']);
        mockExecFile(out(folder('Solo', 1)));
        await scan();
        mockExecFile(out(folder('Solo', 1, true)));
        await scan();
        expect(shown('id0')).toBe('flag');
        expect(indicateActor).toHaveBeenCalledTimes(2);
    });

    it('starts no read while the clock advances without a scan (T-20)', async () => {
        vi.useFakeTimers({ toFake: ['setInterval', 'setTimeout'] });
        await setup(['Solo']);
        vi.advanceTimersByTime(120_000);
        await flush();
        expect(execFile).not.toHaveBeenCalled();
    });

    it('clears the indicators when the setting goes false and reads again when it returns true (T-22)', async () => {
        const { scan, status, shown } = await setup(['Test2']);
        const settingChanged = async (): Promise<void> => {
            status.requestRead();
            await flush();
        };

        mockExecFile(out(folder('Test2', 1)));
        await scan();
        expect(shown('id0')).toBe('mail');

        enableOutlook(false);
        await settingChanged();
        expect(shown('id0')).toBeUndefined();
        expect(execFile).toHaveBeenCalledTimes(1);

        await scan();
        expect(shown('id0')).toBeUndefined();
        expect(execFile).toHaveBeenCalledTimes(1);

        enableOutlook(true);
        await settingChanged();
        expect(shown('id0')).toBe('mail');
        expect(execFile).toHaveBeenCalledTimes(2);
    });

    it('reads once at activation (AC-3)', async () => {
        setPlatform('win32');
        enableOutlook(true);
        mockExecFile(out(folder('Solo', 1)));
        const fake = fakeApi(['Solo']);
        const status = new ActorMailStatus(fake.api, { warn: () => {} });
        await flush();
        expect(execFile).toHaveBeenCalledTimes(1);
        expect(fake.shown('id0')).toBe('mail');
        status.dispose();
    });

    it('dispose removes every indicator, stops listening and starts no read (AC-11)', async () => {
        const { scan, status, shown } = await setup(['Solo']);
        mockExecFile(out(folder('Solo', 1)));
        await scan();
        expect(shown('id0')).toBe('mail');

        status.dispose();
        expect(shown('id0')).toBeUndefined();
        await scan();
        expect(execFile).toHaveBeenCalledTimes(1);
    });

    it('writes aggregate counts and elapsed time at Debug only, never names', async () => {
        const { api, scan } = fakeApi(['Secret1', 'Secret2']);
        setPlatform('win32');
        enableOutlook(true);
        const warn = vi.fn();
        const debug = vi.fn();
        const status = new ActorMailStatus(api, { warn, debug }, false);
        mockExecFile(out(folder('Secret1', 2, true), folder('Other', 5)));
        await scan();
        status.dispose();
        expect(debug).toHaveBeenCalledTimes(1);
        const line = String(debug.mock.calls[0][0]);
        expect(line).toMatch(/candidates=2 inboxFolders=2 matched=1 indicators=1 \(flag=1\) elapsed=\d+ ms/);
        expect(line).not.toMatch(/Secret|Other/);
        expect(warn).not.toHaveBeenCalled();
    });

    it('writes the skip reason at Debug when the setting is off', async () => {
        setPlatform('win32');
        enableOutlook(false);
        const debug = vi.fn();
        const fake = fakeApi(['Solo']);
        const status = new ActorMailStatus(fake.api, { warn: () => {}, debug }, false);
        await fake.scan();
        status.dispose();
        expect(String(debug.mock.calls[0][0])).toContain('jarvis.outlook.enabled is false');
    });

    it('does nothing and logs one line when the core API lacks the new members (AC-15)', () => {
        const warn = vi.fn();
        const status = new ActorMailStatus({ version: 2, listActors: () => [] } as never, { warn });
        expect(warn).toHaveBeenCalledTimes(1);
        status.requestRead();
        status.dispose();
        expect(execFile).not.toHaveBeenCalled();
    });
});
