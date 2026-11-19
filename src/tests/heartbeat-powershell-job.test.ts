// REQ_AUT_JOBEXEC AC-2: a powershell job step goes through the executor's PowerShell fallback (runStep wiring).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import * as cp from 'child_process';
import { executeJob, type HeartbeatJob } from '../../packages/core/src/apps/session/heartbeat';

vi.mock('child_process', async () => {
    const actual = await vi.importActual<typeof import('child_process')>('child_process');
    return { ...actual, spawn: vi.fn() };
});

const channel = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as never;

function fakeProc(run: (p: any) => void) {
    const proc: any = new EventEmitter();
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    queueMicrotask(() => run(proc));
    return proc;
}

const job: HeartbeatJob = { name: 'ps', schedule: 'manual', steps: [{ type: 'powershell', run: 'scripts/x.ps1' }] };

describe('REQ_AUT_JOBEXEC AC-2: executeJob with a powershell step', () => {
    beforeEach(() => { (cp.spawn as any).mockReset(); });

    it('runs the step with powershell when pwsh is not installed', async () => {
        const started: string[] = [];
        (cp.spawn as any).mockImplementation((exe: string) => {
            started.push(exe);
            return fakeProc(p => exe === 'pwsh'
                ? p.emit('error', Object.assign(new Error('spawn pwsh ENOENT'), { code: 'ENOENT' }))
                : p.emit('close', 0));
        });
        const r = await executeJob(job, channel, '/cfg', '', { reload: vi.fn() } as any);
        expect(r.success).toBe(true);
        expect(started).toEqual(['pwsh', 'powershell']);
    });

    it('fails the job with a message naming the missing PowerShell when neither exists', async () => {
        (cp.spawn as any).mockImplementation(() => fakeProc(p => p.emit('error', Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))));
        const r = await executeJob(job, channel, '/cfg', '', { reload: vi.fn() } as any);
        expect(r.success).toBe(false);
        expect(r.error).toMatch(/PowerShell not found/);
    });
});
