/**
 * REQ_AUT_JOBEXEC AC-2, SPEC_AUT_EXECUTOR: powershell step runs pwsh, then powershell, else fails clearly.
 */
import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';
import type * as cp from 'child_process';
import { runPowerShellStep } from '../../packages/core/src/apps/session/heartbeat';

const channel = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any;

/** Fake spawn: `missing` executables fail with ENOENT, the others exit with `exitCode`. */
function fakeSpawn(missing: string[], exitCode = 0) {
    const started: string[] = [];
    const spawnFn = ((exe: string) => {
        started.push(exe);
        const proc: any = new EventEmitter();
        proc.stdout = new EventEmitter();
        proc.stderr = new EventEmitter();
        setImmediate(() => {
            if (missing.includes(exe)) { proc.emit('error', Object.assign(new Error(`spawn ${exe} ENOENT`), { code: 'ENOENT' })); }
            else { proc.emit('close', exitCode); }
        });
        return proc;
    }) as unknown as typeof cp.spawn;
    return { spawnFn, started };
}

describe('runPowerShellStep', () => {
    it('uses pwsh when it starts', async () => {
        const { spawnFn, started } = fakeSpawn([]);
        expect((await runPowerShellStep('s.ps1', channel, spawnFn)).success).toBe(true);
        expect(started).toEqual(['pwsh']);
    });

    it('falls back to powershell when pwsh cannot be started', async () => {
        const { spawnFn, started } = fakeSpawn(['pwsh']);
        expect((await runPowerShellStep('s.ps1', channel, spawnFn)).success).toBe(true);
        expect(started).toEqual(['pwsh', 'powershell']);
    });

    it('fails with a message naming both executables when neither starts', async () => {
        const { spawnFn } = fakeSpawn(['pwsh', 'powershell']);
        const r = await runPowerShellStep('s.ps1', channel, spawnFn);
        expect(r).toMatchObject({ success: false, stepType: 'powershell' });
        expect(r.error).toMatch(/pwsh/);
        expect(r.error).toMatch(/powershell/);
        expect(r.error).toMatch(/Install PowerShell/);
    });

    it('does not fall back when the script itself fails', async () => {
        const { spawnFn, started } = fakeSpawn([], 1);
        const r = await runPowerShellStep('s.ps1', channel, spawnFn);
        expect(r.success).toBe(false);
        expect(started).toEqual(['pwsh']);
    });
});
