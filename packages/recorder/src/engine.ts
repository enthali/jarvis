// Implementation: SPEC_REC_ENGINE — recognition engine in a child process
// Requirements: REQ_REC_SPEECH, REQ_REC_FAILURE

import { ChildProcess, fork } from 'child_process';
import { Emitter, Event } from './emitter';

export interface TranscriptionEngine {
    /** Model loaded, live session started. */
    start(): Promise<void>;
    /** PCM16 LE mono 16 kHz. */
    push(chunk: Uint8Array): void;
    /** Flush; resolves when the final result is in (or after a failure). */
    finish(): Promise<void>;
    /** Kill the worker. */
    dispose(): void;
    readonly onText: Event<string>;
    /** Reason; fired at most once. */
    readonly onFailure: Event<string>;
    /** The reason once raised, for a check after an await or a late subscriber. */
    readonly failure: string | undefined;
}

export const INIT_TIMEOUT_MS = 60000;

export interface EngineOptions {
    workerPath: string;
    sdkDir: string;
    modelDir: string;
    /** Test hook: replaces child_process.fork. */
    forkFn?: typeof fork;
}

export class WorkerEngine implements TranscriptionEngine {
    private readonly _text = new Emitter<string>();
    private readonly _failure = new Emitter<string>();
    readonly onText = this._text.event;
    readonly onFailure = this._failure.event;

    private child: ChildProcess | undefined;
    private failed = false;
    private failureReason: string | undefined;
    private finished = false;
    private initTimer: ReturnType<typeof setTimeout> | undefined;
    private readyResolve: (() => void) | undefined;
    private readyReject: ((err: Error) => void) | undefined;
    private finalWaiters: (() => void)[] = [];

    constructor(private readonly opts: EngineOptions) {}

    get failure(): string | undefined { return this.failureReason; }

    start(): Promise<void> {
        const doFork = this.opts.forkFn ?? fork;
        const child = doFork(this.opts.workerPath, [], {
            env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', ORT_TELEMETRY_DISABLED: '1' },
            serialization: 'advanced',
            stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        });
        this.child = child;
        // The worker's own output is drained and dropped: it never carries recognised text.
        child.stdout?.resume();
        child.stderr?.resume();

        child.on('message', (m: unknown) => this.onMessage(m as { t: string; [k: string]: unknown }));
        child.on('error', err => this.fail(err.message));
        child.on('exit', (code, signal) => {
            if (!this.finished) { this.fail(`recognition process ended unexpectedly (${signal ?? `exit code ${code}`})`); }
            this.releaseFinal();
        });
        child.on('disconnect', () => { if (!this.finished) { this.fail('recognition process disconnected'); } });

        return new Promise<void>((resolve, reject) => {
            this.readyResolve = resolve;
            this.readyReject = reject;
            this.initTimer = setTimeout(() => this.fail('speech recognition did not start within 60 seconds'), INIT_TIMEOUT_MS);
            this.send({ t: 'init', sdkDir: this.opts.sdkDir, modelDir: this.opts.modelDir, language: 'auto' });
        });
    }

    push(chunk: Uint8Array): void {
        if (this.failed || this.finished) { return; }
        this.send({ t: 'audio', data: chunk });
    }

    finish(): Promise<void> {
        if (this.failed || !this.child) { return Promise.resolve(); }
        return new Promise<void>(resolve => {
            this.finalWaiters.push(resolve);
            this.send({ t: 'finish' });
        });
    }

    dispose(): void {
        this.finished = true;
        if (this.initTimer) { clearTimeout(this.initTimer); this.initTimer = undefined; }
        // A start that is still waiting for ready is settled, so a cancelled session start does not hang.
        const rej = this.readyReject;
        this.readyResolve = this.readyReject = undefined;
        rej?.(new Error('speech recognition start was cancelled'));
        const child = this.child;
        this.child = undefined;
        if (child && child.exitCode === null) {
            try { child.kill(); } catch { /* already gone */ }
        }
        this.releaseFinal();
    }

    private send(message: unknown): void {
        try {
            this.child?.send(message as never, err => { if (err) { this.fail(`recognition process rejected audio: ${err.message}`); } });
        } catch (err) {
            this.fail(err instanceof Error ? err.message : String(err));
        }
    }

    private onMessage(m: { t: string; [k: string]: unknown }): void {
        if (m.t === 'ready') {
            if (this.initTimer) { clearTimeout(this.initTimer); this.initTimer = undefined; }
            this.readyResolve?.();
            this.readyResolve = this.readyReject = undefined;
        } else if (m.t === 'text') {
            if (typeof m.delta === 'string' && m.delta.length > 0) { this._text.fire(m.delta); }
        } else if (m.t === 'final') {
            this.finished = true;
            this.releaseFinal();
        } else if (m.t === 'error') {
            this.fail(String(m.message ?? 'unknown error'));
        }
    }

    private fail(reason: string): void {
        if (this.failed) { return; }
        this.failed = true;
        this.failureReason = reason;
        if (this.initTimer) { clearTimeout(this.initTimer); this.initTimer = undefined; }
        const rej = this.readyReject;
        this.readyResolve = this.readyReject = undefined;
        rej?.(new Error(reason));
        this._failure.fire(reason);
        const child = this.child;
        this.child = undefined;
        if (child && child.exitCode === null) { try { child.kill(); } catch { /* gone */ } }
        this.releaseFinal();
    }

    private releaseFinal(): void {
        const waiters = this.finalWaiters;
        this.finalWaiters = [];
        for (const w of waiters) { w(); }
    }
}
