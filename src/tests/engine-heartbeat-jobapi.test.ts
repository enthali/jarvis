/**
 * Engine heartbeat job API unit tests (SPEC_ENG_HEARTBEAT_JOBAPI).
 *
 * Validates: registerJob idempotent upsert, unregisterJob removal, listJobs reflection.
 * Uses a stubbed HeartbeatScheduler to avoid file I/O.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KindDrivenScanner } from '../../packages/core/src/engine/sessions/yamlScanner';
import { GenericTreeFactory } from '../../packages/core/src/engine/core/treeFactory';
import { JarvisEngine } from '../../packages/core/src/engine/core/coreApi';
import type { HeartbeatJob } from '../../packages/core/src/apps/session/heartbeat';

// Minimal scheduler stub that mirrors HeartbeatScheduler's public interface
function createSchedulerStub() {
    const jobs: HeartbeatJob[] = [];
    return {
        get currentJobs() { return jobs; },
        async registerJob(job: HeartbeatJob) {
            const idx = jobs.findIndex(j => j.name === job.name);
            if (idx >= 0) { jobs[idx] = job; } else { jobs.push(job); }
        },
        async unregisterJob(name: string) {
            const idx = jobs.findIndex(j => j.name === name);
            if (idx >= 0) { jobs.splice(idx, 1); }
        },
    };
}

describe('SPEC_ENG_HEARTBEAT_JOBAPI: engine heartbeat job API', () => {
    let engine: JarvisEngine;
    let scheduler: ReturnType<typeof createSchedulerStub>;

    beforeEach(() => {
        const scanner = new KindDrivenScanner(() => {}, () => '');
        const treeFactory = new GenericTreeFactory(scanner);
        engine = new JarvisEngine(scanner, treeFactory);
        scheduler = createSchedulerStub();
        engine.setScheduler(scheduler as any);
    });

    it('registerJob adds a job visible via listJobs', async () => {
        const job: HeartbeatJob = { name: 'test-job', schedule: '*/5 * * * *', steps: [] };
        await engine.registerJob(job);
        expect(engine.listJobs()).toEqual([job]);
    });

    it('registerJob is idempotent — same name updates, does not duplicate', async () => {
        const job1: HeartbeatJob = { name: 'dup', schedule: '0 * * * *', steps: [] };
        const job2: HeartbeatJob = { name: 'dup', schedule: '*/10 * * * *', steps: [{ type: 'command', run: 'x' }] };
        await engine.registerJob(job1);
        await engine.registerJob(job2);
        expect(engine.listJobs().length).toBe(1);
        expect(engine.listJobs()[0].schedule).toBe('*/10 * * * *');
    });

    it('unregisterJob removes a job', async () => {
        const job: HeartbeatJob = { name: 'rm-me', schedule: 'manual', steps: [] };
        await engine.registerJob(job);
        await engine.unregisterJob('rm-me');
        expect(engine.listJobs()).toEqual([]);
    });

    it('unregisterJob for non-existent name is a no-op', async () => {
        await engine.unregisterJob('ghost');
        expect(engine.listJobs()).toEqual([]);
    });

    it('listJobs returns empty when no scheduler is set', () => {
        const scanner = new KindDrivenScanner(() => {}, () => '');
        const treeFactory = new GenericTreeFactory(scanner);
        const bare = new JarvisEngine(scanner, treeFactory);
        expect(bare.listJobs()).toEqual([]);
    });

    it('registerJob throws when scheduler is not available', async () => {
        const scanner = new KindDrivenScanner(() => {}, () => '');
        const treeFactory = new GenericTreeFactory(scanner);
        const bare = new JarvisEngine(scanner, treeFactory);
        await expect(bare.registerJob({ name: 'x', schedule: 'manual', steps: [] }))
            .rejects.toThrow('Heartbeat scheduler is not available');
    });
});
