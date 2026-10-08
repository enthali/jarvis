// Implementation: SPEC_REC_SESSION, SPEC_REC_STATUSBAR (formatElapsed), SPEC_REC_DISPATCH
// Requirements: REQ_REC_BUTTON, REQ_REC_ENABLE, REQ_REC_FAILURE, REQ_REC_LIVEVIEW, REQ_REC_SPEECH, REQ_REC_DISPATCH, REQ_REC_TRANSCRIPTFILE
//
// No vscode import: everything the session needs from the editor comes in through SessionPorts,
// so the lifecycle runs in plain unit tests.

import { AudioCapture } from './capture';
import { Emitter } from './emitter';
import { TranscriptionEngine } from './engine';
import { TranscriptFile } from './transcriptFile';

export type RecordingState = 'idle' | 'starting' | 'running' | 'finishing';
export type EndReason = 'user' | 'breakdown' | 'shutdown';

export interface RecordedActor { id: string; name: string; folder: string }

export const LOG_INTERVAL_MS = 10000;
export const TICK_MS = 1000;
export const FINISH_TIMEOUT_MS = 20000;

/** `MM:SS` below one hour, `H:MM:SS` from one hour (SPEC_REC_STATUSBAR). */
export function formatElapsed(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Words are runs of non-whitespace; the count is kept across delta boundaries. */
export class WordCounter {
    private inWord = false;
    private _count = 0;
    get count(): number { return this._count; }
    add(text: string): void {
        for (const ch of text) {
            if (/\s/.test(ch)) { this.inWord = false; }
            else if (!this.inWord) { this.inWord = true; this._count++; }
        }
    }
}

export interface SessionPorts {
    isEnabled(): boolean;
    platform: string;
    /** Components ready (download with progress inside); rejects with the reason. */
    ensureComponents(): Promise<void>;
    createEngine(): TranscriptionEngine;
    createCapture(): AudioCapture;
    /** Wraps engine start in the "starting speech recognition" progress. */
    withStartProgress<T>(title: string, work: () => Promise<T>): Promise<T>;
    createTranscript(actorFolder: string, startedAt: Date): TranscriptFile;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    setRunning(running: boolean): void;
    /** Red circle on the Actor node; the returned function removes it. */
    markActor(actorId: string): () => void;
    send(actorName: string, text: string): void;
    log(message: string): void;
    now(): number;
}

type Timer = ReturnType<typeof setInterval>;

export class RecordingSession {
    private readonly _change = new Emitter<void>();
    readonly onDidChange = this._change.event;
    /** Text as written to the file (marks included) for the view. */
    private readonly _textDelta = new Emitter<{ delta: string; words: number }>();
    readonly onDidAppend = this._textDelta.event;

    private _state: RecordingState = 'idle';
    private _actor: RecordedActor | undefined;
    private _startedAt: number | undefined;
    private _endedAt: number | undefined;
    private _text = '';
    private words = new WordCounter();
    private shuttingDown = false;

    private engine: TranscriptionEngine | undefined;
    private capture: AudioCapture | undefined;
    private file: TranscriptFile | undefined;
    private unmark: (() => void) | undefined;
    private subscriptions: { dispose(): void }[] = [];
    private logTimer: Timer | undefined;
    private tickTimer: Timer | undefined;
    private breakdownRaised = false;
    private sentTranscript = false;

    private startPromise: Promise<void> | undefined;
    private endPromise: Promise<void> | undefined;
    private cancel: { reason: string; silent: boolean } | undefined;
    private failing = false;
    private leaveWait: (() => void) | undefined;

    constructor(private readonly ports: SessionPorts) {}

    get state(): RecordingState { return this._state; }
    get actor(): RecordedActor | undefined { return this._actor; }
    get startedAt(): number | undefined { return this._startedAt; }
    get endedAt(): number | undefined { return this._endedAt; }
    get text(): string { return this._text; }
    get wordCount(): number { return this.words.count; }
    get isShuttingDown(): boolean { return this.shuttingDown; }
    /** A recording counts as running from `running` until it is idle again (D-17). */
    get isActive(): boolean { return this._state === 'running' || this._state === 'finishing'; }
    get transcriptPath(): string | undefined { return this.file?.path; }

    /** Time from `running` to now, frozen when the end begins (SPEC_REC_STATUSBAR AC-2). */
    elapsedMs(): number {
        if (this._startedAt === undefined) { return 0; }
        return (this._endedAt ?? this.ports.now()) - this._startedAt;
    }

    start(actor: RecordedActor): Promise<void> {
        const p = this.ports;
        if (!p.isEnabled()) { p.info('Recording is switched off (setting jarvis.recording.enabled).'); return Promise.resolve(); }
        if (this._state !== 'idle') {
            p.warn(`A recording is already running for ${this._actor?.name ?? 'an Actor'}.`);
            return Promise.resolve();
        }
        this._state = 'starting';
        this._actor = actor;
        this._text = '';
        this.words = new WordCounter();
        this.breakdownRaised = false;
        this.sentTranscript = false;
        this._endedAt = undefined;
        this._startedAt = undefined;
        this.cancel = undefined;
        this.failing = false;
        this.startPromise = this.runStart(actor);
        return this.startPromise;
    }

    /**
     * Ends by state (SPEC_REC_SESSION): idle does nothing; starting is cancelled by a shutdown only;
     * running starts the end sequence; finishing joins the sequence in progress. The promise resolves at idle.
     */
    end(reason: EndReason): Promise<void> {
        if (reason === 'shutdown') { this.shuttingDown = true; }
        switch (this._state) {
            case 'idle':
                return Promise.resolve();
            case 'starting':
                if (reason === 'shutdown') { this.cancelStart('shutdown', true); }
                return this.startPromise ?? Promise.resolve();
            case 'finishing':
                if (reason === 'shutdown') { this.leaveWait?.(); }
                return this.endPromise ?? Promise.resolve();
            case 'running':
                this.endPromise = this.runEnd(reason);
                return this.endPromise;
        }
    }

    /** Called from deactivate(): close means exit (D-56); returns when the local steps (close, dispatch attempt) are done. */
    async shutdown(): Promise<void> {
        this.shuttingDown = true;
        await this.end('shutdown');
    }

    dispose(): void {
        this.cleanup();
        this._change.dispose();
        this._textDelta.dispose();
    }

    private async runStart(actor: RecordedActor): Promise<void> {
        const p = this.ports;
        try {
            if (p.platform !== 'win32') { throw new Error('Recording works on Windows only.'); }
            await p.ensureComponents();
            this.checkCancelled();

            // Failure events are subscribed when a component is created, before its start is awaited.
            const engine = p.createEngine();
            this.engine = engine;
            this.subscriptions.push(engine.onFailure(reason => this.onComponentFailure(reason)));
            await p.withStartProgress('Jarvis Recorder: starting speech recognition', () => engine.start());
            this.checkCancelled(engine);

            const capture = p.createCapture();
            this.capture = capture;
            this.subscriptions.push(
                capture.onFailure(reason => this.onComponentFailure(reason)),
                capture.onSourceLost(name => p.warn(`${name === 'mic' ? 'Microphone' : 'Speaker output'} was lost; recording continues with the other source.`)),
                capture.onData(chunk => engine.push(chunk)),
            );
            const started = await capture.start();
            this.checkCancelled(engine);
            if (!started.mic) { p.warn('The microphone could not be captured; recording continues with the speaker output.'); }
            else if (!started.speaker) { p.warn('Speaker output could not be captured; recording continues with the microphone.'); }

            const file = p.createTranscript(actor.folder, new Date(p.now()));
            this.file = file;
            this.subscriptions.push(
                file.onError(reason => this.onComponentFailure(reason)),
                engine.onText(delta => this.onText(delta)),
            );

            this._state = 'running';
            this._startedAt = p.now();
            p.setRunning(true);
            this.unmark = p.markActor(actor.id);
            this.logTimer = setInterval(() => p.log(`[Recording] words=${this.words.count}`), LOG_INTERVAL_MS);
            this.tickTimer = setInterval(() => this._change.fire(), TICK_MS);
            p.log(`[Recording] started for "${actor.name}" -> ${file.path}`);
            this._change.fire();
        } catch (err) {
            await this.fail(this.cancel ? this.cancel.reason : err instanceof Error ? err.message : String(err));
        }
    }

    private async runEnd(reason: EndReason): Promise<void> {
        const p = this.ports;
        this._state = 'finishing';
        this._endedAt = p.now();
        this._change.fire();
        const actor = this._actor;
        try {
            await this.guarded('stop capture', async () => { await this.capture?.stop(); });
            await this.guarded('finish engine', () => this.waitForFinal(reason));
            await this.guarded('close transcript', async () => { await this.file?.close(); });
            await this.guarded('dispatch', async () => {
                if (this.file && actor && !this.sentTranscript) {
                    this.sentTranscript = true;
                    p.send(actor.name, `A new meeting transcript is available: ${this.file.path}`);
                }
            });
            p.log(`[Recording] ended (${reason}) -> ${this.file?.path ?? ''}`);
        } finally {
            this.cleanup();
            this.endPromise = undefined;
            this._state = 'idle';
            this._change.fire();
        }
    }

    /**
     * Waits for the engine's final result, at most FINISH_TIMEOUT_MS. A shutdown does not wait (or leaves the wait
     * once) and disposes the engine, so no further recognition result is awaited or used (D-56).
     */
    private async waitForFinal(reason: EndReason): Promise<void> {
        if (reason !== 'shutdown' && !this.shuttingDown) {
            await new Promise<void>(resolve => {
                const done = (): void => { clearTimeout(timer); this.leaveWait = undefined; resolve(); };
                const timer = setTimeout(done, FINISH_TIMEOUT_MS);
                this.leaveWait = done;
                (this.engine?.finish() ?? Promise.resolve()).then(done, done);
            });
        }
        if (this.shuttingDown) { this.engine?.dispose(); }
    }

    private onText(delta: string): void {
        if (this._state !== 'running' && this._state !== 'finishing') { return; }
        const written = this.file?.append(delta, new Date(this.ports.now())) ?? delta;
        this.words.add(delta);
        this._text += written;
        this._textDelta.fire({ delta: written, words: this.words.count });
    }

    /** A component failed: during the start it cancels the start, while running it is a breakdown. */
    private onComponentFailure(reason: string): void {
        if (this._state === 'starting') { this.cancelStart(reason, false); }
        else { this.breakdown(reason); }
    }

    private breakdown(reason: string): void {
        if (this.breakdownRaised || this._state !== 'running') { return; }
        this.breakdownRaised = true;
        const where = this.file ? ` What was recognised so far is saved in ${this.file.path}.` : '';
        this.ports.error(`Recording ended: ${reason}.${where}`);
        void this.end('breakdown');
    }

    /** Keeps the reason and stops what already runs, which settles pending awaits of the start. */
    private cancelStart(reason: string, silent: boolean): void {
        if (this._state !== 'starting' || this.cancel) { return; }
        this.cancel = { reason, silent };
        this.stopComponents();
    }

    private checkCancelled(engine?: TranscriptionEngine): void {
        if (this.cancel) { throw new Error(this.cancel.reason); }
        if (engine?.failure) { throw new Error(engine.failure); }
    }

    private stopComponents(): void {
        try { void this.capture?.stop(); } catch { /* best effort */ }
        try { this.engine?.dispose(); } catch { /* best effort */ }
    }

    private async fail(reason: string): Promise<void> {
        if (this.failing) { return; }
        this.failing = true;
        const silent = this.cancel?.silent === true;
        for (const s of this.subscriptions.splice(0)) { s.dispose(); }
        this.stopComponents();
        this.capture = undefined;
        this.engine = undefined;
        if (this.file) {
            try { await this.file.discard(); } catch { /* best effort */ }
            this.file = undefined;
        }
        if (!silent) { this.ports.error(`Recording not started: ${reason}`); }
        this._state = 'idle';
        this._actor = undefined;
        this._change.fire();
    }

    private cleanup(): void {
        if (this.logTimer) { clearInterval(this.logTimer); this.logTimer = undefined; }
        if (this.tickTimer) { clearInterval(this.tickTimer); this.tickTimer = undefined; }
        for (const s of this.subscriptions.splice(0)) { s.dispose(); }
        try { this.engine?.dispose(); } catch { /* best effort */ }
        this.engine = undefined;
        this.capture = undefined;
        this.leaveWait = undefined;
        try { this.unmark?.(); } catch { /* best effort */ }
        this.unmark = undefined;
        try { this.ports.setRunning(false); } catch { /* best effort */ }
    }

    private async guarded(what: string, step: () => Promise<void>): Promise<void> {
        try { await step(); } catch (err) {
            this.ports.log(`[Recording] ${what} failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
}
