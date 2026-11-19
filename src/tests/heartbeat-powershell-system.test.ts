// REQ_AUT_JOBEXEC AC-2 (black-box): a powershell step runs through PowerShell wherever one is installed,
// and fails naming the missing PowerShell when none is. Adversarial cases beside the Developer's unit test.
import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';
import type * as cp from 'child_process';
import { runPowerShellStep } from '../../packages/core/src/apps/session/heartbeat';

const channel = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any;

type Behaviour = { error?: string; code?: number; stdout?: string; stderr?: string };

function spawnWith(by: Record<string, Behaviour>) {
    const calls: { exe: string; args: string[] }[] = [];
    const spawnFn = ((exe: string, args: string[]) => {
        calls.push({ exe, args });
        const b = by[exe] ?? { error: 'ENOENT' };
        const proc: any = new EventEmitter();
        proc.stdout = new EventEmitter();
        proc.stderr = new EventEmitter();
        setImmediate(() => {
            if (b.error) { proc.emit('error', Object.assign(new Error(`spawn ${exe} ${b.error}`), { code: b.error })); return; }
            if (b.stdout) { proc.stdout.emit('data', Buffer.from(b.stdout)); }
            if (b.stderr) { proc.stderr.emit('data', Buffer.from(b.stderr)); }
            proc.emit('close', b.code ?? 0);
        });
        return proc;
    }) as unknown as typeof cp.spawn;
    return { spawnFn, calls };
}

describe('REQ_AUT_JOBEXEC AC-2: powershell step', () => {
    it('passes the script path to PowerShell non-interactively and captures stdout for outputVar', async () => {
        const { spawnFn, calls } = spawnWith({ pwsh: { stdout: 'hello-from-step1\n' } });
        const r = await runPowerShellStep('/w/scripts/print-hello.ps1', channel, spawnFn);
        expect(r).toMatchObject({ success: true, output: 'hello-from-step1\n' });
        expect(calls[0].args).toContain('/w/scripts/print-hello.ps1');
        expect(calls[0].args).toContain('-NonInteractive');
    });

    it('uses Windows PowerShell with the same output handling when only it is installed', async () => {
        const { spawnFn, calls } = spawnWith({ powershell: { stdout: 'ok' } });
        const r = await runPowerShellStep('s.ps1', channel, spawnFn);
        expect(r).toMatchObject({ success: true, output: 'ok' });
        expect(calls.map(c => c.exe)).toEqual(['pwsh', 'powershell']);
        expect(calls[1].args).toEqual(calls[0].args);
    });

    it('a script failure on the fallback PowerShell is a script failure, not "not found"', async () => {
        const { spawnFn } = spawnWith({ powershell: { code: 1, stderr: 'boom' } });
        const r = await runPowerShellStep('s.ps1', channel, spawnFn);
        expect(r.success).toBe(false);
        expect(r.error).toContain('exit 1');
        expect(r.error).toContain('boom');
        expect(r.error).not.toMatch(/not found/i);
    });

    it('reports the missing PowerShell once, tries each executable once, and never throws', async () => {
        const { spawnFn, calls } = spawnWith({});
        const r = await runPowerShellStep('s.ps1', channel, spawnFn);
        expect(r.success).toBe(false);
        expect(r.error).toMatch(/not found/i);
        expect(calls.map(c => c.exe)).toEqual(['pwsh', 'powershell']);
    });

    it('a pwsh that exists but cannot be run (EACCES) is reported as its own error, not as a missing PowerShell', async () => {
        const { spawnFn } = spawnWith({ pwsh: { error: 'EACCES' }, powershell: { stdout: 'x' } });
        const r = await runPowerShellStep('s.ps1', channel, spawnFn);
        expect(r.success).toBe(false);
        expect(r.error).not.toMatch(/PowerShell not found/);
    });
});
