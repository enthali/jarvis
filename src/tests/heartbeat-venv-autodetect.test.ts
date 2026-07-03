/**
 * heartbeat-venv-autodetect CR
 * REQ_AUT_JOBEXEC AC-1 (3-tier Python interpreter resolution, SPEC_AUT_EXECUTOR)
 * REQ_AUT_OUTPUT AC-5 (stderr tail capture, SPEC_AUT_OUTPUTCHANNEL)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import { executeJob, HeartbeatJob } from '../../packages/core/src/apps/session/heartbeat';

// Node builtins' ESM namespace exports are non-configurable, so vi.spyOn()
// cannot patch them directly — mock the modules up front (spread over the
// real implementation) and drive the mocked fns per-test instead.
vi.mock('child_process', async () => {
    const actual = await vi.importActual<typeof import('child_process')>('child_process');
    return { ...actual, spawn: vi.fn() };
});
vi.mock('fs', async () => {
    const actual = await vi.importActual<typeof import('fs')>('fs');
    return { ...actual, existsSync: vi.fn() };
});

function makeOutputChannel() {
    return {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        appendLine: vi.fn(),
        dispose: vi.fn(),
    } as unknown as import('vscode').LogOutputChannel;
}

function makeMessageTreeProvider() {
    return { reload: vi.fn() } as any;
}

/** Fake ChildProcess: EventEmitter with stdout/stderr sub-emitters. */
function makeFakeProc() {
    const proc: any = new EventEmitter();
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    return proc;
}

describe('heartbeat-venv-autodetect: resolvePythonInterpreter (REQ_AUT_JOBEXEC AC-1, T-8/T-3)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('T-3: tier 1 — python.defaultInterpreterPath set takes precedence', async () => {
        vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
            get: () => '/configured/python',
        } as any);
        (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/workspace' } }];
        const existsSpy = (fs.existsSync as any).mockReturnValue(true);
        const proc = makeFakeProc();
        const spawnSpy = (cp.spawn as any).mockImplementation(() => {
            queueMicrotask(() => proc.emit('close', 0));
            return proc;
        });

        const job: HeartbeatJob = { name: 'j', schedule: 'manual', steps: [{ type: 'python', run: 'x.py' }] };
        await executeJob(job, makeOutputChannel(), '/cfg', '', makeMessageTreeProvider());

        expect(spawnSpy).toHaveBeenCalledWith('/configured/python', expect.any(Array), expect.any(Object));
        // tier 1 short-circuits — no venv probing needed
        expect(existsSpy).not.toHaveBeenCalled();
    });

    it('T-8a: tier 2 — no configured path, .venv exists → auto-detected .venv used before venv', async () => {
        vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({ get: () => '' } as any);
        (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/workspace' } }];
        (fs.existsSync as any).mockImplementation((p: any) => String(p).includes('.venv'));
        const proc = makeFakeProc();
        const spawnSpy = (cp.spawn as any).mockImplementation(() => {
            queueMicrotask(() => proc.emit('close', 0));
            return proc;
        });

        const job: HeartbeatJob = { name: 'j', schedule: 'manual', steps: [{ type: 'python', run: 'x.py' }] };
        await executeJob(job, makeOutputChannel(), '/cfg', '', makeMessageTreeProvider());

        const usedExecutable = spawnSpy.mock.calls[0][0] as string;
        expect(usedExecutable).toContain('.venv');
        expect(usedExecutable).not.toMatch(/[/\\]venv[/\\]/);
    });

    it('T-8b: tier 2 — .venv absent, venv exists → fallback venv used', async () => {
        vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({ get: () => '' } as any);
        (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/workspace' } }];
        (fs.existsSync as any).mockImplementation((p: any) => {
            const s = String(p);
            return s.includes('venv') && !s.includes('.venv');
        });
        const proc = makeFakeProc();
        const spawnSpy = (cp.spawn as any).mockImplementation(() => {
            queueMicrotask(() => proc.emit('close', 0));
            return proc;
        });

        const job: HeartbeatJob = { name: 'j', schedule: 'manual', steps: [{ type: 'python', run: 'x.py' }] };
        await executeJob(job, makeOutputChannel(), '/cfg', '', makeMessageTreeProvider());

        const usedExecutable = spawnSpy.mock.calls[0][0] as string;
        expect(usedExecutable).toMatch(/[/\\]venv[/\\]/);
        expect(usedExecutable).not.toContain('.venv');
    });

    it('T-8c: tier 3 — neither .venv nor venv exists → bare "python" fallback', async () => {
        vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({ get: () => '' } as any);
        (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/workspace' } }];
        (fs.existsSync as any).mockReturnValue(false);
        const proc = makeFakeProc();
        const spawnSpy = (cp.spawn as any).mockImplementation(() => {
            queueMicrotask(() => proc.emit('close', 0));
            return proc;
        });

        const job: HeartbeatJob = { name: 'j', schedule: 'manual', steps: [{ type: 'python', run: 'x.py' }] };
        await executeJob(job, makeOutputChannel(), '/cfg', '', makeMessageTreeProvider());

        expect(spawnSpy).toHaveBeenCalledWith('python', expect.any(Array), expect.any(Object));
    });
});

describe('heartbeat-venv-autodetect: stderr tail capture (REQ_AUT_OUTPUT AC-5, T-4)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
        vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({ get: () => '/py' } as any);
    });

    it('T-4a: no stderr, non-zero exit → error is plain "exit N" (regression baseline)', async () => {
        const proc = makeFakeProc();
        (cp.spawn as any).mockImplementation(() => {
            queueMicrotask(() => proc.emit('close', 1));
            return proc;
        });

        const job: HeartbeatJob = { name: 'j', schedule: 'manual', steps: [{ type: 'python', run: 'x.py' }] };
        const result = await executeJob(job, makeOutputChannel(), '/cfg', '', makeMessageTreeProvider());

        expect(result.success).toBe(false);
        expect(result.error).toBe('exit 1');
    });

    it('T-4b: >3 stderr lines, non-zero exit → error tail is bounded to last 3 lines', async () => {
        const proc = makeFakeProc();
        const oc = makeOutputChannel();
        (cp.spawn as any).mockImplementation(() => {
            queueMicrotask(() => {
                proc.stderr.emit('data', Buffer.from('line1\nline2\nline3\nline4\nline5\n'));
                proc.emit('close', 1);
            });
            return proc;
        });

        const job: HeartbeatJob = { name: 'j', schedule: 'manual', steps: [{ type: 'python', run: 'x.py' }] };
        const result = await executeJob(job, oc, '/cfg', '', makeMessageTreeProvider());

        expect(result.success).toBe(false);
        expect(result.error).toContain('exit 1');
        expect(result.error).toContain('line3\nline4\nline5');
        expect(result.error).not.toContain('line1');
        expect(result.error).not.toContain('line2');
        // full stream still logged at debug level, unbounded
        expect(oc.debug).toHaveBeenCalledWith(expect.stringContaining('line1'));
    });
});
