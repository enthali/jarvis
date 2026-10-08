// Implementation: SPEC_REC_CAPTURE — parent side of the audio capture helper
// Requirements: REQ_REC_SPEECH, REQ_REC_FAILURE

import { ChildProcess, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Emitter, Event } from './emitter';

export interface CaptureStart { mic: boolean; speaker: boolean }

export interface AudioCapture {
    /** Resolves after both sources were tried; rejects when neither could be opened. */
    start(): Promise<CaptureStart>;
    /** Closes stdin, waits up to 2 s, then kills. Remaining chunks are still delivered. */
    stop(): Promise<void>;
    readonly onData: Event<Uint8Array>;
    /** A source dropped out later while the other one still works (name: 'mic' | 'speaker'). */
    readonly onSourceLost: Event<string>;
    /** Breakdown: reason, fired at most once. */
    readonly onFailure: Event<string>;
}

export const CAPTURE_READY_TIMEOUT_MS = 15000;
export const STOP_KILL_MS = 2000;

/** pwsh when found on PATH, otherwise Windows PowerShell. */
export function pickShell(env: NodeJS.ProcessEnv = process.env, exists: (p: string) => boolean = fs.existsSync): string {
    const dirs = (env.PATH ?? env.Path ?? '').split(path.delimiter).filter(Boolean);
    for (const dir of dirs) {
        if (exists(path.join(dir, 'pwsh.exe'))) { return 'pwsh'; }
    }
    return 'powershell';
}

export class PowerShellCapture implements AudioCapture {
    private readonly _data = new Emitter<Uint8Array>();
    private readonly _lost = new Emitter<string>();
    private readonly _failure = new Emitter<string>();
    readonly onData = this._data.event;
    readonly onSourceLost = this._lost.event;
    readonly onFailure = this._failure.event;

    private child: ChildProcess | undefined;
    private stopping = false;
    private failed = false;
    private sources = { mic: false, speaker: false };
    private stderrBuf = '';
    private stderrText: string[] = [];
    private startResolve: ((s: CaptureStart) => void) | undefined;
    private startReject: ((e: Error) => void) | undefined;
    private startTimer: ReturnType<typeof setTimeout> | undefined;
    private closed: Promise<void> = Promise.resolve();

    constructor(private readonly scriptPath: string, private readonly spawnFn: typeof spawn = spawn, private readonly shell: string = pickShell()) {}

    start(): Promise<CaptureStart> {
        const child = this.spawnFn(this.shell, [
            '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', this.scriptPath,
        ], { windowsHide: true });
        this.child = child;
        this.closed = new Promise<void>(resolve => child.once('close', () => resolve()));

        child.stdout?.on('data', (chunk: Buffer) => this._data.fire(new Uint8Array(chunk)));
        child.stderr?.on('data', (chunk: Buffer) => this.onStderr(chunk.toString('utf8')));
        child.on('error', err => this.fail(`capture helper could not be started: ${err.message}`));
        child.on('exit', (code, signal) => {
            if (this.stopping) { return; }
            const detail = this.stderrText.length > 0 ? `: ${this.stderrText.join(' ')}` : '';
            this.fail(`capture helper ended unexpectedly (${signal ?? `exit code ${code}`})${detail}`);
        });

        return new Promise<CaptureStart>((resolve, reject) => {
            this.startResolve = resolve;
            this.startReject = reject;
            this.startTimer = setTimeout(() => this.fail('capture helper did not report ready within 15 seconds'), CAPTURE_READY_TIMEOUT_MS);
        });
    }

    async stop(): Promise<void> {
        const child = this.child;
        if (!child) { return; }
        this.stopping = true;
        // A start that is still waiting for ready is settled, so a cancelled session start does not hang.
        this.clearStartTimer();
        const rej = this.startReject;
        this.startResolve = this.startReject = undefined;
        rej?.(new Error('capture start was cancelled'));
        if (child.exitCode !== null) { this.child = undefined; return; }
        try { child.stdin?.end(); } catch { /* already closed */ }
        const killer = setTimeout(() => { try { child.kill(); } catch { /* gone */ } }, STOP_KILL_MS);
        try { await this.closed; } finally { clearTimeout(killer); }
        this.child = undefined;
    }

    private onStderr(text: string): void {
        this.stderrBuf += text;
        let nl: number;
        while ((nl = this.stderrBuf.indexOf('\n')) >= 0) {
            const line = this.stderrBuf.slice(0, nl).trim();
            this.stderrBuf = this.stderrBuf.slice(nl + 1);
            if (line) { this.onLine(line); }
        }
    }

    private onLine(line: string): void {
        let ev: { event?: string; [k: string]: unknown };
        try { ev = JSON.parse(line); } catch {
            // Plain text comes from PowerShell itself (for example a policy error).
            if (this.stderrText.length < 5) { this.stderrText.push(line.slice(0, 300)); }
            return;
        }
        if (ev.event === 'ready') {
            this.sources = { mic: ev.mic === true, speaker: ev.speaker === true };
            this.clearStartTimer();
            if (!this.sources.mic && !this.sources.speaker) {
                this.fail('neither the microphone nor the speaker output could be captured');
                return;
            }
            this.startResolve?.({ ...this.sources });
            this.startResolve = this.startReject = undefined;
        } else if (ev.event === 'source' && ev.state === 'lost') {
            const name = String(ev.name);
            if (name !== 'mic' && name !== 'speaker') { return; }
            this.sources[name] = false;
            if (!this.sources.mic && !this.sources.speaker) {
                this.fail('both audio sources were lost');
            } else {
                this._lost.fire(name);
            }
        } else if (ev.event === 'error') {
            this.fail(String(ev.message ?? 'capture error'));
        }
    }

    private clearStartTimer(): void {
        if (this.startTimer) { clearTimeout(this.startTimer); this.startTimer = undefined; }
    }

    private fail(reason: string): void {
        if (this.failed) { return; }
        this.failed = true;
        this.clearStartTimer();
        const rej = this.startReject;
        this.startResolve = this.startReject = undefined;
        const child = this.child;
        if (child && child.exitCode === null) { try { child.kill(); } catch { /* gone */ } }
        if (rej) { rej(new Error(reason)); } else { this._failure.fire(reason); }
    }
}
