/**
 * SPEC_ACTOR_MAIL: unread-mail read for Actor nodes (ActorMailState and its pure helpers),
 * plus the onDidScan event it depends on (SPEC_ACTOR_SCANNER).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { ActorScanner } from '../../packages/core/src/engine/actors/actorScanner';
import {
    ActorMailState,
    parseMailFolders,
    unreadActorIds,
} from '../../packages/core/src/engine/actors/actorMail';

const { execFile } = vi.hoisted(() => ({ execFile: vi.fn() }));
vi.mock('child_process', async (importOriginal) => ({
    ...(await importOriginal<typeof import('child_process')>()),
    execFile,
}));

const roots: string[] = [];
let restorePlatform: (() => void) | undefined;

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

async function makeScanner(names: string[]): Promise<ActorScanner> {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-mail-'));
    roots.push(root);
    names.forEach((name, i) => {
        const folder = path.join(root, `actor${i}`);
        fs.mkdirSync(folder, { recursive: true });
        fs.writeFileSync(path.join(folder, 'actor.yaml'), `name: "${name}"\nsummary: ""\nagent: ""\n`);
    });
    const scanner = new ActorScanner(() => root, () => {});
    await scanner.rescan();
    return scanner;
}

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

async function setup(names: string[], outlookOn = true): Promise<{
    scanner: ActorScanner;
    state: ActorMailState;
    warn: ReturnType<typeof vi.fn>;
    onChange: ReturnType<typeof vi.fn>;
}> {
    setPlatform('win32');
    enableOutlook(outlookOn);
    const scanner = await makeScanner(names);
    const warn = vi.fn();
    const onChange = vi.fn();
    const state = new ActorMailState(scanner, { warn }, onChange);
    return { scanner, state, warn, onChange };
}

function idOf(scanner: ActorScanner, name: string): string {
    const lookup = scanner.resolveName(name);
    if (lookup.status !== 'found') { throw new Error(`fixture: ${name}`); }
    return lookup.actor.id;
}

/** The read script without its PowerShell comments. */
function codeOf(script: string): string {
    return script.replace(/#.*$/gm, '');
}

async function capturedScript(): Promise<string> {
    mockExecFile({ stdout: '[]' });
    const { scanner, state } = await setup(['Solo']);
    await scanner.rescan();
    await flush();
    state.dispose();
    const args = execFile.mock.calls[0][1] as string[];
    return args[2];
}

describe('SPEC_ACTOR_MAIL: parseMailFolders', () => {
    it('reads a JSON array of folder name and unread count', () => {
        expect(parseMailFolders('[{"name":"Solo","unread":3},{"name":"Other","unread":0}]')).toEqual([
            { name: 'Solo', unread: 3 },
            { name: 'Other', unread: 0 },
        ]);
    });

    it('returns an empty list for an empty array', () => {
        expect(parseMailFolders('[]')).toEqual([]);
    });

    it('returns undefined when the output is not a JSON array', () => {
        expect(parseMailFolders('{"name":"Solo","unread":1}')).toBeUndefined();
        expect(parseMailFolders('not json')).toBeUndefined();
        expect(parseMailFolders('')).toBeUndefined();
    });

    it('skips entries without a string name or numeric unread count', () => {
        expect(parseMailFolders('[{"name":"Solo","unread":"2"},{"unread":1},{"name":"Ok","unread":1}]')).toEqual([
            { name: 'Ok', unread: 1 },
        ]);
    });
});

describe('SPEC_ACTOR_MAIL: unreadActorIds', () => {
    it('includes only found Actors with unread items', async () => {
        const scanner = await makeScanner(['Solo', 'Quiet']);
        const solo = scanner.resolveName('Solo');
        const quiet = scanner.resolveName('Quiet');
        if (solo.status !== 'found' || quiet.status !== 'found') { throw new Error('fixture'); }
        const ids = unreadActorIds([
            { name: 'Solo', unread: 2 },
            { name: 'Quiet', unread: 0 },
            { name: 'Unknown', unread: 5 },
        ], scanner);
        expect([...ids]).toEqual([solo.actor.id]);
        expect(ids.has(quiet.actor.id)).toBe(false);
    });

    it('adds nothing for an ambiguous name', async () => {
        const scanner = await makeScanner(['Twin', 'Twin']);
        const ids = unreadActorIds([{ name: 'Twin', unread: 4 }], scanner);
        expect(ids.size).toBe(0);
    });
});

describe('SPEC_ACTOR_SCANNER: onDidScan', () => {
    it('fires after every rescan, including one that changes nothing', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-scan-'));
        roots.push(root);
        const scanner = new ActorScanner(() => root, () => {});
        let fired = 0;
        scanner.onDidScan(() => { fired++; });
        await scanner.rescan();
        await scanner.rescan();
        expect(fired).toBe(2);
    });

    it('fires once for concurrent rescans that share one run', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-scan-'));
        roots.push(root);
        const scanner = new ActorScanner(() => root, () => {});
        let fired = 0;
        scanner.onDidScan(() => { fired++; });
        await Promise.all([scanner.rescan(), scanner.rescan()]);
        expect(fired).toBe(1);
    });
});

describe('SPEC_ACTOR_MAIL: ActorMailState', () => {
    it('with the Outlook setting off, stays empty and reports no change', async () => {
        enableOutlook(false);
        const scanner = await makeScanner(['Solo']);
        const warn = vi.fn();
        const onChange = vi.fn();
        const state = new ActorMailState(scanner, { warn }, onChange);
        await scanner.rescan();
        await flush();
        expect(onChange).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
        const solo = scanner.resolveName('Solo');
        if (solo.status !== 'found') { throw new Error('fixture'); }
        expect(state.isUnread(solo.actor.id)).toBe(false);
        state.dispose();
    });

    it('on a failed read, logs one warning line and does not change the drawn set', async () => {
        enableOutlook(true);
        const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
        Object.defineProperty(process, 'platform', { value: 'linux' });
        try {
            const scanner = await makeScanner(['Solo']);
            const warn = vi.fn();
            const onChange = vi.fn();
            const state = new ActorMailState(scanner, { warn }, onChange);
            await scanner.rescan();
            await flush();
            expect(warn).toHaveBeenCalledTimes(1);
            expect(String(warn.mock.calls[0][0])).toContain('platform is not Windows');
            expect(onChange).not.toHaveBeenCalled();
            state.dispose();
        } finally {
            if (originalPlatform) { Object.defineProperty(process, 'platform', originalPlatform); }
        }
    });

    it('stops reacting to scans after dispose', async () => {
        enableOutlook(true);
        const scanner = await makeScanner(['Solo']);
        const warn = vi.fn();
        const state = new ActorMailState(scanner, { warn }, () => {});
        state.dispose();
        await scanner.rescan();
        await flush();
        expect(warn).not.toHaveBeenCalled();
    });
});

describe('SPEC_ACTOR_MAIL: read script', () => {
    it('reads the direct Inbox children only (T-15)', async () => {
        const code = codeOf(await capturedScript());
        expect(code).toContain('GetDefaultFolder(6)');
        expect(code.match(/GetDefaultFolder\(/g)).toHaveLength(1);
        expect(code).toContain('$inbox.Folders');
        expect(code.match(/\.Folders\b/g)).toHaveLength(1);
    });

    it('uses only read-only members (T-21)', async () => {
        const code = codeOf(await capturedScript());
        const readOnly = new Set([
            'Application', 'Encoding', 'GetActiveObject', 'GetDefaultFolder', 'Folders',
            'InteropServices', 'Marshal', 'Name', 'Runtime', 'Session', 'Text', 'UnReadItemCount',
        ]);
        const members = [...code.matchAll(/\.([A-Za-z_]\w*)/g)].map(m => m[1]);
        expect(members.filter(m => !readOnly.has(m))).toEqual([]);
        expect(code).not.toMatch(/\.\w+\s*=(?!=)/);
    });

    it('stops on an attach error before attaching (AC-5)', async () => {
        const code = codeOf(await capturedScript());
        const stop = code.indexOf("$ErrorActionPreference = 'Stop'");
        expect(stop).toBeGreaterThan(-1);
        expect(stop).toBeLessThan(code.indexOf('GetActiveObject'));
    });

    it('passes execFile no shell option (SPEC_ACTOR_MAIL step 3)', async () => {
        mockExecFile({ stdout: '[]' });
        const { scanner, state } = await setup(['Solo']);
        await scanner.rescan();
        await flush();
        state.dispose();
        const options = execFile.mock.calls[0][2] as Record<string, unknown>;
        expect(options).not.toHaveProperty('shell');
    });
});

describe('SPEC_ACTOR_MAIL: ActorMailState reads', () => {
    it('matches the folder name exactly, case-sensitive (T-16)', async () => {
        const { scanner, state, onChange } = await setup(['Test1']);
        mockExecFile({ stdout: '[{"name":"test1","unread":1}]' });
        await scanner.rescan();
        await flush();
        expect(state.isUnread(idOf(scanner, 'Test1'))).toBe(false);
        expect(onChange).not.toHaveBeenCalled();

        mockExecFile({ stdout: '[{"name":"Test1","unread":1}]' });
        await scanner.rescan();
        await flush();
        expect(state.isUnread(idOf(scanner, 'Test1'))).toBe(true);
        expect(execFile).toHaveBeenCalledTimes(2);
        state.dispose();
    });

    it('adds no Actor for an ambiguous name, silently (T-17)', async () => {
        const { scanner, state, warn, onChange } = await setup(['Twin', 'Twin']);
        mockExecFile({ stdout: '[{"name":"Twin","unread":4}]' });
        await scanner.rescan();
        await flush();
        expect(onChange).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
        state.dispose();
    });

    it.each([
        ['non-zero exit', { error: Object.assign(new Error('Command failed'), { code: 1 }), stderr: 'boom\r\nsecond line' }, 'exit 1: boom'],
        ['timeout', { error: Object.assign(new Error('Command failed'), { killed: true }) }, 'timed out after 10 s'],
        ['output not a JSON array', { stdout: '{"name":"Test2","unread":1}' }, 'output is not a JSON array'],
    ])('on a failed read (%s) empties the set, logs one line and fires onChange (T-18)', async (_label, outcome, reason) => {
        const { scanner, state, warn, onChange } = await setup(['Test2']);
        const notifyWarning = vi.spyOn(vscode.window, 'showWarningMessage');
        const notifyInfo = vi.spyOn(vscode.window, 'showInformationMessage');
        mockExecFile({ stdout: '[{"name":"Test2","unread":1}]' });
        await scanner.rescan();
        await flush();
        const id = idOf(scanner, 'Test2');
        expect(state.isUnread(id)).toBe(true);

        mockExecFile(outcome);
        await scanner.rescan();
        await flush();
        expect(state.isUnread(id)).toBe(false);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).toContain(reason);
        expect(notifyWarning).not.toHaveBeenCalled();
        expect(notifyInfo).not.toHaveBeenCalled();
        expect(onChange).toHaveBeenCalledTimes(2);
        state.dispose();
    });

    it('a failed attach (script exit 1) logs exactly one line and empties the set (T-10)', async () => {
        const { scanner, state, warn, onChange } = await setup(['Test1']);
        mockExecFile({ stdout: '[{"name":"Test1","unread":1}]' });
        await scanner.rescan();
        await flush();
        mockExecFile({ error: Object.assign(new Error('Command failed'), { code: 1 }), stderr: 'Exception calling "GetActiveObject"' });
        await scanner.rescan();
        await flush();
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).toContain('exit 1: Exception calling "GetActiveObject"');
        expect(state.isUnread(idOf(scanner, 'Test1'))).toBe(false);
        expect(onChange).toHaveBeenCalledTimes(2);
        state.dispose();
    });

    it('starts no process while the setting is off (T-19)', async () => {
        const { scanner, state, warn, onChange } = await setup(['Solo'], false);
        await scanner.rescan();
        await flush();
        expect(execFile).not.toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
        const id = idOf(scanner, 'Solo');
        expect(state.isUnread(id)).toBe(false);
        state.dispose();
    });

    it('starts one read per completed scan (T-20)', async () => {
        const { scanner, state } = await setup(['Solo']);
        mockExecFile({ stdout: '[]' });
        await scanner.rescan();
        await scanner.rescan();
        await flush();
        expect(execFile).toHaveBeenCalledTimes(2);
        state.dispose();
    });

    it('coalesces scans during a run into one re-read after it (T-20)', async () => {
        const { scanner, state } = await setup(['Test2']);
        mockExecFile({ stdout: '[{"name":"Test2","unread":1}]' });
        let finish: ((stdout: string) => void) | undefined;
        execFile.mockImplementationOnce((_file: string, _args: string[], _opts: unknown, callback: (...args: unknown[]) => void) => {
            finish = (stdout: string) => callback(null, stdout, '');
        });
        await scanner.rescan();
        await scanner.rescan();
        await scanner.rescan();
        await flush();
        expect(execFile).toHaveBeenCalledTimes(1);

        if (!finish) { throw new Error('fixture: read did not start'); }
        finish('[{"name":"Test2","unread":1}]');
        await flush();
        expect(execFile).toHaveBeenCalledTimes(2);
        expect(state.isUnread(idOf(scanner, 'Test2'))).toBe(true);

        await flush();
        expect(execFile).toHaveBeenCalledTimes(2);
        state.dispose();
    });

    it('fires onChange only when the drawn set changes (T-20)', async () => {
        const { scanner, state, onChange } = await setup(['Test1', 'Test2']);
        mockExecFile({ stdout: '[{"name":"Test2","unread":1}]' });
        await scanner.rescan();
        await flush();
        expect(onChange).toHaveBeenCalledTimes(1);

        await scanner.rescan();
        await flush();
        expect(onChange).toHaveBeenCalledTimes(1);

        mockExecFile({ stdout: '[{"name":"Test1","unread":2},{"name":"Test2","unread":1}]' });
        await scanner.rescan();
        await flush();
        expect(onChange).toHaveBeenCalledTimes(2);
        expect(state.isUnread(idOf(scanner, 'Test1'))).toBe(true);
        expect(state.isUnread(idOf(scanner, 'Test2'))).toBe(true);
        state.dispose();
    });

    it('starts no read while the clock advances without a scan (T-20)', async () => {
        vi.useFakeTimers({ toFake: ['setInterval', 'setTimeout'] });
        const { state } = await setup(['Solo']);
        vi.advanceTimersByTime(120_000);
        await flush();
        expect(execFile).not.toHaveBeenCalled();
        state.dispose();
    });

    it('starts no timer from a completed read (T-20)', async () => {
        vi.useFakeTimers({ toFake: ['setInterval', 'setTimeout'] });
        const { scanner, state } = await setup(['Solo']);
        mockExecFile({ stdout: '[]' });
        await scanner.rescan();
        await flush();
        expect(execFile).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(120_000);
        await flush();
        expect(execFile).toHaveBeenCalledTimes(1);
        state.dispose();
    });

    it('clears the icons when the setting goes false and reads again when it returns true (T-22)', async () => {
        const { scanner, state, onChange } = await setup(['Test2']);
        const id = idOf(scanner, 'Test2');
        // The configuration listener in extension.ts calls requestRead() when jarvis.outlook.enabled changes.
        const settingChanged = async (): Promise<void> => {
            state.requestRead();
            await flush();
        };

        mockExecFile({ stdout: '[{"name":"Test2","unread":1}]' });
        await scanner.rescan();
        await flush();
        expect(state.isUnread(id)).toBe(true);
        expect(execFile).toHaveBeenCalledTimes(1);

        enableOutlook(false);
        await settingChanged();
        expect(state.isUnread(id)).toBe(false);
        expect(onChange).toHaveBeenCalledTimes(2);
        expect(execFile).toHaveBeenCalledTimes(1);

        await scanner.rescan();
        await flush();
        expect(state.isUnread(id)).toBe(false);
        expect(execFile).toHaveBeenCalledTimes(1);

        enableOutlook(true);
        await settingChanged();
        expect(state.isUnread(id)).toBe(true);
        expect(execFile).toHaveBeenCalledTimes(2);
        expect(onChange).toHaveBeenCalledTimes(3);
        state.dispose();
    });
});
