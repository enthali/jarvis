/**
 * heartbeat-step-output-vars CR
 * US_AUT_HEARTBEAT AC-19, REQ_AUT_JOBCONFIG AC-6, REQ_AUT_JOBEXEC AC-7/AC-8
 * REQ_AUT_STEP_OUTPUT_VARS, SPEC_AUT_STEP_OUTPUT_VARS AC-1..AC-8
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import * as cp from 'child_process';
import { executeJob, loadJobs, HeartbeatJob } from '../../packages/core/src/apps/session/heartbeat';
import * as fs from 'fs';

vi.mock('child_process', async () => {
    const actual = await vi.importActual<typeof import('child_process')>('child_process');
    return { ...actual, spawn: vi.fn() };
});
vi.mock('fs', async () => {
    const actual = await vi.importActual<typeof import('fs')>('fs');
    return { ...actual, readFileSync: vi.fn(actual.readFileSync) };
});
vi.mock('vscode', async () => {
    const actual = await vi.importActual<typeof import('vscode')>('vscode');
    return {
        ...actual,
        LanguageModelChatMessage: { User: (text: string) => ({ role: 'user', content: text }) },
        lm: { ...(actual as any).lm, selectChatModels: vi.fn() },
    };
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

describe('SPEC_AUT_STEP_OUTPUT_VARS: executeJob variable chaining', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        (cp.spawn as any).mockReset();
        (fs.readFileSync as any).mockReset();
    });

    it('AC-2/AC-6: script step stdout captured into outputVar and interpolated into a later step', async () => {
        const proc1 = makeFakeProc();
        const proc2 = makeFakeProc();
        let call = 0;
        (cp.spawn as any).mockImplementation((_exe: string, args: string[]) => {
            call += 1;
            const proc = call === 1 ? proc1 : proc2;
            queueMicrotask(() => {
                if (call === 1) { proc.stdout.emit('data', Buffer.from('42')); }
                proc.emit('close', 0);
            });
            return proc;
        });

        const job: HeartbeatJob = {
            name: 'chain',
            schedule: 'manual',
            steps: [
                { type: 'python', run: 'metrics.py', outputVar: 'METRICS' },
                { type: 'python', run: 'process-${METRICS}.py' },
            ],
        };
        const oc = makeOutputChannel();
        const result = await executeJob(job, oc, '/cfg', '', makeMessageTreeProvider());

        expect(result.success).toBe(true);
        // second spawn call's script-path arg must have the token replaced with the captured value
        const secondCallArgs = (cp.spawn as any).mock.calls[1][1] as string[];
        expect(secondCallArgs.some(a => a.includes('process-42.py'))).toBe(true);
        expect(oc.info).toHaveBeenCalledWith(expect.stringContaining('METRICS'));
    });

    it('AC-5: LAST_STDERR is overwritten after every script step, even with outputVar unset', async () => {
        const proc1 = makeFakeProc();
        const proc2 = makeFakeProc();
        let call = 0;
        (cp.spawn as any).mockImplementation(() => {
            call += 1;
            const proc = call === 1 ? proc1 : proc2;
            queueMicrotask(() => {
                if (call === 1) { proc.stderr.emit('data', Buffer.from('warn-one')); }
                proc.emit('close', 0);
            });
            return proc;
        });

        const job: HeartbeatJob = {
            name: 'stderr-chain',
            schedule: 'manual',
            steps: [
                { type: 'python', run: 'a.py' },
                { type: 'python', run: 'b.py' },
            ],
        };
        const oc = makeOutputChannel();
        const result = await executeJob(job, oc, '/cfg', '', makeMessageTreeProvider());

        expect(result.success).toBe(true);
        expect(oc.info).toHaveBeenCalledWith(expect.stringContaining('LAST_STDERR'));
    });

    it('AC-8: loadJobs strips an invalid outputVar name and warns', () => {
        (fs.readFileSync as any).mockReturnValue(
            'jobs:\n  - name: j\n    schedule: manual\n    steps:\n      - type: python\n        run: x.py\n        outputVar: "1-bad"\n'
        );
        const oc = makeOutputChannel();
        const jobs = loadJobs('/cfg/jobs.yaml', oc);

        expect(jobs[0].steps[0].outputVar).toBeUndefined();
        expect(oc.warn).toHaveBeenCalledWith(expect.stringContaining('1-bad'));
    });

    it('AC-7: undefined token in template is left as-is', async () => {
        const proc1 = makeFakeProc();
        const proc2 = makeFakeProc();
        let call = 0;
        (cp.spawn as any).mockImplementation(() => {
            call += 1;
            const proc = call === 1 ? proc1 : proc2;
            queueMicrotask(() => proc.emit('close', 0));
            return proc;
        });

        const job: HeartbeatJob = {
            name: 'unset-token',
            schedule: 'manual',
            steps: [
                { type: 'python', run: 'a.py' },
                { type: 'python', run: 'b-${NEVER_SET}.py' },
            ],
        };
        const result = await executeJob(job, makeOutputChannel(), '/cfg', '', makeMessageTreeProvider());

        expect(result.success).toBe(true);
        const secondCallArgs = (cp.spawn as any).mock.calls[1][1] as string[];
        expect(secondCallArgs.some(a => a.includes('b-${NEVER_SET}.py'))).toBe(true);
    });

    it('AC-3: agent step response captured into outputVar and interpolated into a later step + prompt path templated', async () => {
        (fs.readFileSync as any).mockReturnValue('PROMPT_TEXT');
        const fakeModel = {
            id: 'test-model',
            sendRequest: vi.fn().mockResolvedValue({
                text: (async function* () { yield 'agent-result'; })(),
            }),
        };
        (vscode.lm.selectChatModels as any).mockResolvedValue([fakeModel]);

        const proc1 = makeFakeProc();
        const proc2 = makeFakeProc();
        let call = 0;
        (cp.spawn as any).mockImplementation(() => {
            call += 1;
            const proc = call === 1 ? proc1 : proc2;
            queueMicrotask(() => {
                if (call === 1) { proc.stdout.emit('data', Buffer.from('42')); }
                proc.emit('close', 0);
            });
            return proc;
        });

        const job: HeartbeatJob = {
            name: 'agent-chain',
            schedule: 'manual',
            steps: [
                { type: 'python', run: 'metrics.py', outputVar: 'METRICS' },
                { type: 'agent', prompt: 'prompt-${METRICS}.md', outputVar: 'AGENT_OUT' },
                { type: 'python', run: 'process-${AGENT_OUT}.py' },
            ],
        };
        const oc = makeOutputChannel();
        const result = await executeJob(job, oc, '/cfg', '', makeMessageTreeProvider());

        expect(result.success).toBe(true);
        // 'prompt' field was interpolated with METRICS before the agent step read it
        expect((fs.readFileSync as any).mock.calls[0][0]).toContain('prompt-42.md');
        // agent response text captured into AGENT_OUT and interpolated into the third step's 'run'
        const thirdCallArgs = (cp.spawn as any).mock.calls[1][1] as string[];
        expect(thirdCallArgs.some(a => a.includes('process-agent-result.py'))).toBe(true);
        expect(oc.info).toHaveBeenCalledWith(expect.stringContaining('AGENT_OUT'));
    });
});
