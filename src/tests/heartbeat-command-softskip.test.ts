/**
 * SPEC_AUT_HEARTBEAT_COMMAND_SOFTSKIP — soft-skip heartbeat command steps
 * whose command is not registered (zero-trace graceful degradation).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { executeJob, HeartbeatJob } from '../../packages/core/src/apps/session/heartbeat';

function makeOutputChannel() {
    return {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        appendLine: vi.fn(),
        dispose: vi.fn(),
    } as unknown as import('vscode').LogOutputChannel;
}

function makeMessageTreeProvider() {
    return { reload: vi.fn() } as any;
}

describe('SPEC_AUT_HEARTBEAT_COMMAND_SOFTSKIP', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('AC-1/AC-2: absent command → soft-skip with warn, executeCommand NOT called', async () => {
        // getCommands returns empty — command not registered
        vi.spyOn(vscode.commands, 'getCommands').mockResolvedValue([]);
        const execSpy = vi.spyOn(vscode.commands, 'executeCommand');
        const oc = makeOutputChannel();

        const job: HeartbeatJob = {
            name: 'test-job',
            schedule: 'manual',
            steps: [{ type: 'command', run: 'pim.doSomething' }],
        };

        const result = await executeJob(job, oc, '', '', makeMessageTreeProvider());

        expect(result.success).toBe(true);
        expect(execSpy).not.toHaveBeenCalled();
        expect(oc.warn).toHaveBeenCalledWith(
            expect.stringContaining('pim.doSomething')
        );
        expect(oc.warn).toHaveBeenCalledWith(
            expect.stringContaining('skipped')
        );
    });

    it('AC-1: registered command present → executeCommand called, normal success', async () => {
        vi.spyOn(vscode.commands, 'getCommands').mockResolvedValue(['jarvis.myCommand']);
        const execSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);
        const oc = makeOutputChannel();

        const job: HeartbeatJob = {
            name: 'test-job',
            schedule: 'manual',
            steps: [{ type: 'command', run: 'jarvis.myCommand' }],
        };

        const result = await executeJob(job, oc, '', '', makeMessageTreeProvider());

        expect(result.success).toBe(true);
        expect(execSpy).toHaveBeenCalledWith('jarvis.myCommand');
    });

    it('AC-5: registered command that throws → { success: false } with error', async () => {
        vi.spyOn(vscode.commands, 'getCommands').mockResolvedValue(['jarvis.failing']);
        vi.spyOn(vscode.commands, 'executeCommand').mockRejectedValue(new Error('boom'));
        const oc = makeOutputChannel();

        const job: HeartbeatJob = {
            name: 'test-job',
            schedule: 'manual',
            steps: [{ type: 'command', run: 'jarvis.failing' }],
        };

        const result = await executeJob(job, oc, '', '', makeMessageTreeProvider());

        expect(result.success).toBe(false);
        expect(result.error).toBe('boom');
        expect(result.stepType).toBe('command');
    });

    it('AC-4: multi-step job — absent-command step skipped, following step still runs', async () => {
        // First step: absent command (skipped). Second step: registered command (runs).
        vi.spyOn(vscode.commands, 'getCommands').mockResolvedValue(['jarvis.secondCmd']);
        const execSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);
        const oc = makeOutputChannel();

        const job: HeartbeatJob = {
            name: 'multi-step',
            schedule: 'manual',
            steps: [
                { type: 'command', run: 'pim.absent' },
                { type: 'command', run: 'jarvis.secondCmd' },
            ],
        };

        const result = await executeJob(job, oc, '', '', makeMessageTreeProvider());

        expect(result.success).toBe(true);
        // The absent command should have been skipped (warn logged)
        expect(oc.warn).toHaveBeenCalledWith(
            expect.stringContaining('pim.absent')
        );
        // The second command should have been executed
        expect(execSpy).toHaveBeenCalledWith('jarvis.secondCmd');
        expect(execSpy).toHaveBeenCalledTimes(1); // only the second, not the first
    });
});
