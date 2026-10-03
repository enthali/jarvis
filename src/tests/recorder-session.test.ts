/**
 * SPEC_REC_SESSION, SPEC_REC_TRANSCRIPTFILE, SPEC_REC_DISPATCH, SPEC_REC_STATUSBAR (formatElapsed).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Emitter } from '../../packages/recorder/src/emitter';
import { TranscriptFile, transcriptStamp } from '../../packages/recorder/src/transcriptFile';
import {
    EndReason, RecordingSession, SessionPorts, WordCounter, formatElapsed, RecordedActor,
} from '../../packages/recorder/src/session';
import type { TranscriptionEngine } from '../../packages/recorder/src/engine';
import type { AudioCapture, CaptureStart } from '../../packages/recorder/src/capture';

const dirs: string[] = [];
function tmp(): string {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-rec-'));
    dirs.push(d);
    return d;
}
afterEach(() => { vi.useRealTimers(); for (const d of dirs.splice(0)) { fs.rmSync(d, { recursive: true, force: true }); } });

describe('formatElapsed (SPEC_REC_STATUSBAR)', () => {
    it('MM:SS below one hour, H:MM:SS from one hour', () => {
        expect(formatElapsed(0)).toBe('00:00');
        expect(formatElapsed(59_999)).toBe('00:59');
        expect(formatElapsed(61_000)).toBe('01:01');
        expect(formatElapsed(3_599_000)).toBe('59:59');
        expect(formatElapsed(3_600_000)).toBe('1:00:00');
        expect(formatElapsed(3_723_000)).toBe('1:02:03');
        expect(formatElapsed(-5)).toBe('00:00');
    });
});

describe('WordCounter (SPEC_REC_SESSION word count)', () => {
    it('counts runs of non-whitespace across delta boundaries', () => {
        const c = new WordCounter();
        c.add(' Hello wor');
        c.add('ld  and');
        c.add(' more\n');
        expect(c.count).toBe(4);
    });
});

describe('TranscriptFile (SPEC_REC_TRANSCRIPTFILE)', () => {
    it('AC-1: path is <actor folder>/transcripts/YYYY-MM-DD_HHmmss.txt in local time', () => {
        const folder = tmp();
        const at = new Date(2026, 9, 2, 14, 5, 9);
        const f = TranscriptFile.create(folder, at);
        expect(f.path).toBe(path.join(folder, 'transcripts', '2026-10-02_140509.txt'));
        expect(transcriptStamp(at)).toBe('2026-10-02_140509');
        void f.discard();
    });

    it('AC-2: an existing file is never overwritten; a suffix is added', async () => {
        const folder = tmp();
        const at = new Date(2026, 0, 1, 8, 0, 0);
        const a = TranscriptFile.create(folder, at);
        a.append('first', at);
        await a.close();
        const b = TranscriptFile.create(folder, at);
        expect(b.path.endsWith('2026-01-01_080000-2.txt')).toBe(true);
        await b.close();
        expect(fs.readFileSync(a.path, 'utf8')).toContain('first');
    });

    it('AC-5: a [HH:MM] mark before the first text and after each full minute, none for silence', async () => {
        const folder = tmp();
        const t0 = new Date(2026, 9, 2, 9, 7, 0, 0);
        const f = TranscriptFile.create(folder, t0);
        expect(f.append('Hello', t0)).toBe('[09:07]\nHello');
        expect(f.append(' world', new Date(t0.getTime() + 30_000))).toBe(' world');
        expect(f.append(' again', new Date(t0.getTime() + 60_000))).toBe('\n[09:08]\n again');
        // silence: nothing is written, and the next text after a long gap gets exactly one mark
        expect(f.append(' later', new Date(t0.getTime() + 600_000))).toBe('\n[09:17]\n later');
        await f.close();
        expect(fs.readFileSync(f.path, 'utf8')).toBe('[09:07]\nHello world\n[09:08]\n again\n[09:17]\n later');
    });

    it('writes UTF-8 without BOM and returns exactly what the file holds', async () => {
        const folder = tmp();
        const at = new Date(2026, 9, 2, 10, 0, 0);
        const f = TranscriptFile.create(folder, at);
        const written = f.append('Qualität für Größe', at);
        await f.close();
        const bytes = fs.readFileSync(f.path);
        expect(bytes[0]).not.toBe(0xef);
        expect(bytes.toString('utf8')).toBe(written);
    });

    it('AC-3: discard closes and deletes the file', async () => {
        const f = TranscriptFile.create(tmp(), new Date());
        await f.discard();
        expect(fs.existsSync(f.path)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Session with fake ports
// ---------------------------------------------------------------------------

class FakeEngine implements TranscriptionEngine {
    text = new Emitter<string>();
    failEvent = new Emitter<string>();
    onText = this.text.event;
    onFailure = this.failEvent.event;
    failure: string | undefined;
    pushed: Uint8Array[] = [];
    startError: string | undefined;
    /** When set, start() waits for it (and for dispose, which settles it like the real engine). */
    holdStart = false;
    private startReject: ((e: Error) => void) | undefined;
    private startResolve: (() => void) | undefined;
    finishDelayMs = 0;
    /** finish() never resolves on its own; like the real engine, dispose() resolves it. */
    neverFinish = false;
    private finishResolvers: (() => void)[] = [];
    finished = false;
    disposed = false;
    start() {
        if (this.startError) { return Promise.reject(new Error(this.startError)); }
        if (!this.holdStart) { return Promise.resolve(); }
        return new Promise<void>((resolve, reject) => { this.startResolve = resolve; this.startReject = reject; });
    }
    releaseStart() { this.startResolve?.(); }
    fireFailure(reason: string) { this.failure = reason; this.failEvent.fire(reason); }
    push(c: Uint8Array) { this.pushed.push(c); }
    finish() {
        this.finished = true;
        if (this.neverFinish) { return new Promise<void>(r => { this.finishResolvers.push(r); }); }
        return this.finishDelayMs === 0 ? Promise.resolve() : new Promise<void>(r => setTimeout(r, this.finishDelayMs));
    }
    dispose() {
        this.disposed = true;
        this.startReject?.(new Error('speech recognition start was cancelled'));
        this.startReject = undefined;
        for (const r of this.finishResolvers.splice(0)) { r(); }
    }
}

class FakeCapture implements AudioCapture {
    data = new Emitter<Uint8Array>();
    lost = new Emitter<string>();
    failure = new Emitter<string>();
    onData = this.data.event;
    onSourceLost = this.lost.event;
    onFailure = this.failure.event;
    result: CaptureStart = { mic: true, speaker: true };
    startError: string | undefined;
    /** 'reject': start waits and stop() rejects it (real capture); 'late': start resolves later regardless of stop. */
    hold: 'none' | 'reject' | 'late' = 'none';
    private startResolve: ((s: CaptureStart) => void) | undefined;
    private startReject: ((e: Error) => void) | undefined;
    stopped = false;
    start() {
        if (this.startError) { return Promise.reject(new Error(this.startError)); }
        if (this.hold === 'none') { return Promise.resolve(this.result); }
        return new Promise<CaptureStart>((resolve, reject) => { this.startResolve = resolve; this.startReject = reject; });
    }
    releaseStart() { this.startResolve?.(this.result); }
    async stop() {
        this.stopped = true;
        if (this.hold === 'reject') { this.startReject?.(new Error('capture start was cancelled')); this.startReject = undefined; }
    }
}

interface Harness {
    session: RecordingSession; engine: FakeEngine; capture: FakeCapture; folder: string;
    ports: SessionPorts; sent: { to: string; text: string }[]; events: string[];
    marks: string[]; unmarks: string[]; running: boolean[]; warns: string[]; errors: string[]; infos: string[]; logs: string[];
    files: TranscriptFile[];
}

function harness(over: Partial<SessionPorts> = {}): Harness {
    const folder = tmp();
    const engine = new FakeEngine();
    const capture = new FakeCapture();
    const h: Harness = {
        engine, capture, folder, sent: [], events: [], marks: [], unmarks: [], running: [], warns: [], errors: [], infos: [], logs: [], files: [],
        session: undefined as never, ports: undefined as never,
    };
    h.ports = {
        isEnabled: () => true,
        platform: 'win32',
        ensureComponents: async () => { h.events.push('components'); },
        createEngine: () => { h.events.push('engine'); return engine; },
        createCapture: () => { h.events.push('capture'); return capture; },
        withStartProgress: (_t, work) => work(),
        createTranscript: (f, at) => {
            h.events.push('file');
            const t = TranscriptFile.create(f, at);
            const close = t.close.bind(t);
            t.close = async () => { h.events.push('close'); await close(); };
            h.files.push(t);
            return t;
        },
        info: m => h.infos.push(m), warn: m => h.warns.push(m), error: m => h.errors.push(m),
        setRunning: r => h.running.push(r),
        markActor: id => { h.marks.push(id); return () => h.unmarks.push(id); },
        send: (to, text) => { h.events.push('send'); h.sent.push({ to, text }); },
        log: m => h.logs.push(m),
        now: () => Date.now(),
        ...over,
    };
    h.session = new RecordingSession(h.ports);
    return h;
}
const actorOf = (h: Harness): RecordedActor => ({ id: 'a1', name: 'Nora', folder: h.folder });

describe('RecordingSession.start (SPEC_REC_SESSION AC-1, AC-2, AC-3)', () => {
    it('runs the steps in order and ends up running with mark, context key and view data', async () => {
        const h = harness();
        await h.session.start(actorOf(h));
        expect(h.events).toEqual(['components', 'engine', 'capture', 'file']);
        expect(h.session.state).toBe('running');
        expect(h.running).toEqual([true]);
        expect(h.marks).toEqual(['a1']);
        expect(h.session.isActive).toBe(true);
        await h.session.end('user');
    });

    it('guard: switched off shows an information message and starts nothing', async () => {
        const h = harness({ isEnabled: () => false });
        await h.session.start(actorOf(h));
        expect(h.infos).toHaveLength(1);
        expect(h.session.state).toBe('idle');
        expect(h.events).toEqual([]);
    });

    it('guard: a second start is refused with a warning naming the Actor', async () => {
        const h = harness();
        await h.session.start(actorOf(h));
        await h.session.start({ id: 'a2', name: 'Other', folder: h.folder });
        expect(h.warns[0]).toBe('A recording is already running for Nora.');
        expect(h.session.actor?.name).toBe('Nora');
        await h.session.end('user');
    });

    it('platform: anything but win32 fails with a notice and creates no file', async () => {
        const h = harness({ platform: 'linux' });
        await h.session.start(actorOf(h));
        expect(h.errors[0]).toBe('Recording not started: Recording works on Windows only.');
        expect(h.session.state).toBe('idle');
        expect(fs.existsSync(path.join(h.folder, 'transcripts'))).toBe(false);
    });

    it('a failing engine stops what was started, shows the reason, leaves no file and no message', async () => {
        const h = harness();
        h.engine.startError = 'model could not be loaded';
        await h.session.start(actorOf(h));
        expect(h.errors[0]).toBe('Recording not started: model could not be loaded');
        expect(h.engine.disposed).toBe(true);
        expect(h.session.state).toBe('idle');
        expect(h.running).toEqual([]);
        expect(h.sent).toEqual([]);
        expect(fs.existsSync(path.join(h.folder, 'transcripts'))).toBe(false);
    });

    it('capture failing with no source discards nothing because no file exists yet, and stops the engine', async () => {
        const h = harness();
        h.capture.startError = 'neither the microphone nor the speaker output could be captured';
        await h.session.start(actorOf(h));
        expect(h.errors[0]).toContain('Recording not started: neither');
        expect(h.engine.disposed).toBe(true);
        expect(h.events).not.toContain('file');
    });

    it('a failing transcript file fails the start and stops capture and engine', async () => {
        const h = harness({ createTranscript: () => { throw new Error('disk full'); } });
        await h.session.start(actorOf(h));
        expect(h.errors[0]).toBe('Recording not started: disk full');
        expect(h.capture.stopped).toBe(true);
        expect(h.engine.disposed).toBe(true);
    });

    it('one missing source warns naming it and the recording starts', async () => {
        const h = harness();
        h.capture.result = { mic: true, speaker: false };
        await h.session.start(actorOf(h));
        expect(h.warns[0]).toBe('Speaker output could not be captured; recording continues with the microphone.');
        expect(h.session.state).toBe('running');
        await h.session.end('user');
    });
});

describe('RecordingSession while running and end (AC-4, AC-5, AC-7, AC-10)', () => {
    it('relays audio to the engine and text to the file, view data and word count (marks not counted)', async () => {
        const h = harness();
        await h.session.start(actorOf(h));
        h.capture.data.fire(new Uint8Array([1, 2, 3]));
        expect(h.engine.pushed).toHaveLength(1);
        const appended: string[] = [];
        h.session.onDidAppend(a => appended.push(a.delta));
        h.engine.text.fire('Hallo Welt');
        expect(h.session.wordCount).toBe(2);
        expect(h.session.text).toMatch(/^\[\d\d:\d\d\]\nHallo Welt$/);
        expect(appended).toHaveLength(1);
        await h.session.end('user');
    });

    it('end: one message after the file is closed, then idle with everything cleaned up', async () => {
        const h = harness();
        await h.session.start(actorOf(h));
        h.engine.text.fire('Text');
        const path0 = h.session.transcriptPath!;
        await h.session.end('user');
        expect(h.capture.stopped).toBe(true);
        expect(h.engine.finished).toBe(true);
        expect(h.sent).toEqual([{ to: 'Nora', text: `A new meeting transcript is available: ${path0}` }]);
        expect(h.unmarks).toEqual(['a1']);
        expect(h.running).toEqual([true, false]);
        expect(h.session.state).toBe('idle');
        expect(fs.readFileSync(path0, 'utf8')).toContain('Text');
    });

    it('a second end is ignored (message sent once)', async () => {
        const h = harness();
        await h.session.start(actorOf(h));
        await Promise.all([h.session.end('user'), h.session.end('user')]);
        expect(h.sent).toHaveLength(1);
    });

    it('the state is finishing while the engine flushes; elapsed time is frozen then', async () => {
        vi.useFakeTimers();
        const h = harness();
        h.engine.finishDelayMs = 5000;
        await h.session.start(actorOf(h));
        await vi.advanceTimersByTimeAsync(3000);
        const ending = h.session.end('user');
        await vi.advanceTimersByTimeAsync(10);
        expect(h.session.state).toBe('finishing');
        expect(h.session.isActive).toBe(true);
        const frozen = h.session.elapsedMs();
        await vi.advanceTimersByTimeAsync(2000);
        expect(h.session.elapsedMs()).toBe(frozen);
        await vi.advanceTimersByTimeAsync(5000);
        await ending;
        expect(h.session.state).toBe('idle');
    });

    it('a start while finishing is refused', async () => {
        vi.useFakeTimers();
        const h = harness();
        h.engine.finishDelayMs = 3000;
        await h.session.start(actorOf(h));
        const ending = h.session.end('user');
        await vi.advanceTimersByTimeAsync(10);
        await h.session.start({ id: 'a2', name: 'Other', folder: h.folder });
        expect(h.warns.pop()).toContain('already running');
        await vi.advanceTimersByTimeAsync(4000);
        await ending;
    });

    it('the normal end waits for the final result, at most 20 s (FINISH_TIMEOUT_MS)', async () => {
        vi.useFakeTimers();
        const user = harness();
        user.engine.neverFinish = true;
        await user.session.start(actorOf(user));
        let done = false;
        const p1 = user.session.end('user').then(() => { done = true; });
        await vi.advanceTimersByTimeAsync(19_000);
        expect(done).toBe(false);
        await vi.advanceTimersByTimeAsync(1500);
        await p1;
        expect(done).toBe(true);
        expect(user.sent).toHaveLength(1);
        expect(user.engine.finished).toBe(true);
    });

    it('AC-10: an error in a step is logged and the rest still runs, including idle', async () => {
        const h = harness({ send: () => { throw new Error('ambiguous name'); } });
        await h.session.start(actorOf(h));
        await h.session.end('user');
        expect(h.logs.some(l => l.includes('dispatch failed: ambiguous name'))).toBe(true);
        expect(h.session.state).toBe('idle');
        expect(h.running).toEqual([true, false]);
    });

    it('AC-5: an engine breakdown shows an error with the path, keeps the text and still notifies the Actor', async () => {
        const h = harness();
        await h.session.start(actorOf(h));
        h.engine.text.fire('Teil');
        const p = h.session.transcriptPath!;
        h.engine.fireFailure('recognition process ended unexpectedly');
        await vi.waitFor(() => expect(h.session.state).toBe('idle'));
        expect(h.errors[0]).toBe(`Recording ended: recognition process ended unexpectedly. What was recognised so far is saved in ${p}.`);
        expect(h.sent).toHaveLength(1);
        expect(fs.readFileSync(p, 'utf8')).toContain('Teil');
    });

    it('AC-5: capture failure and a failed file write are breakdowns, and only the first one reports', async () => {
        const h = harness();
        await h.session.start(actorOf(h));
        h.capture.failure.fire('both audio sources were lost');
        h.engine.fireFailure('second');
        await vi.waitFor(() => expect(h.session.state).toBe('idle'));
        expect(h.errors).toHaveLength(1);
        expect(h.sent).toHaveLength(1);
    });

    it('a source lost later while the other works only warns', async () => {
        const h = harness();
        await h.session.start(actorOf(h));
        h.capture.lost.fire('speaker');
        expect(h.warns.pop()).toContain('Speaker output was lost');
        expect(h.session.state).toBe('running');
        await h.session.end('user');
    });

    it('AC-7: the log carries the word count every 10 s and never the text', async () => {
        vi.useFakeTimers();
        const h = harness();
        await h.session.start(actorOf(h));
        h.engine.text.fire('streng vertraulich');
        await vi.advanceTimersByTimeAsync(10_000);
        expect(h.logs).toContain('[Recording] words=2');
        await h.session.end('user');
        expect(h.logs.join('\n')).not.toContain('vertraulich');
    });

    it('AC-9: the tick timer fires once a second while running and stops at idle', async () => {
        vi.useFakeTimers();
        const h = harness();
        await h.session.start(actorOf(h));
        let ticks = 0;
        h.session.onDidChange(() => ticks++);
        await vi.advanceTimersByTimeAsync(3000);
        expect(ticks).toBe(3);
        await h.session.end('user');
        const after = ticks;
        await vi.advanceTimersByTimeAsync(5000);
        expect(ticks).toBe(after);
    });

    it('no message is sent for a start that failed (SPEC_REC_DISPATCH AC-3)', async () => {
        const h = harness();
        h.engine.startError = 'x';
        await h.session.start(actorOf(h));
        await h.session.end('user' as EndReason);
        expect(h.sent).toEqual([]);
    });
});

// Real timers: a wait for the 20 s timer would exceed this and fail the check.
function within<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('did not return within ' + ms + ' ms')), ms);
        p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
    });
}

describe('QM F-1 / D-56: end and shutdown by state (SPEC_REC_SESSION AC-1, AC-11, AC-13, AC-14)', () => {
    it('AC-11: shutdown from finishing with an unresolved finish() leaves the wait once: closed, one message attempted, no 20 s timer', async () => {
        const h = harness();
        h.engine.neverFinish = true;
        await h.session.start(actorOf(h));
        h.engine.text.fire('Inhalt');
        const userEnd = h.session.end('user');
        await vi.waitFor(() => expect(h.engine.finished).toBe(true));
        expect(h.session.state).toBe('finishing');

        await within(h.session.shutdown(), 1000);
        await within(userEnd, 1000);
        expect(h.session.state).toBe('idle');
        expect(h.sent).toHaveLength(1);
        expect(h.engine.disposed).toBe(true);
        expect(h.events.indexOf('close')).toBeGreaterThan(-1);
        expect(h.events.indexOf('close')).toBeLessThan(h.events.indexOf('send'));
        expect(fs.readFileSync(h.files[0].path, 'utf8')).toContain('Inhalt');
    });
    it('a second end while finishing returns the sequence in progress and starts no second one', async () => {
        vi.useFakeTimers();
        const h = harness();
        h.engine.finishDelayMs = 3000;
        await h.session.start(actorOf(h));
        const a = h.session.end('user');
        await vi.advanceTimersByTimeAsync(10);
        const b = h.session.end('user');
        expect(b).toBe(a);
        await vi.advanceTimersByTimeAsync(4000);
        await Promise.all([a, b]);
        expect(h.sent).toHaveLength(1);
        expect(h.running).toEqual([true, false]);
    });

    it('AC-14: shutdown from running does not wait: finish() is never called, engine disposed, file closed with the text so far, message attempted', async () => {
        const h = harness();
        h.engine.neverFinish = true;
        await h.session.start(actorOf(h));
        h.engine.text.fire('Bis hierher');
        await within(h.session.shutdown(), 1000);
        expect(h.session.state).toBe('idle');
        expect(h.engine.finished).toBe(false);
        expect(h.engine.disposed).toBe(true);
        expect(h.errors).toEqual([]);
        expect(h.events.indexOf('close')).toBeLessThan(h.events.indexOf('send'));
        expect(h.sent).toHaveLength(1);
        expect(fs.readFileSync(h.files[0].path, 'utf8')).toContain('Bis hierher');
        expect(h.running).toEqual([true, false]);
        expect(h.unmarks).toEqual(['a1']);
    });

    it('AC-14: the message is only attempted: a failing send is logged and the session is still idle', async () => {
        const h = harness({ send: () => { throw new Error('host is going away'); } });
        await h.session.start(actorOf(h));
        await within(h.session.shutdown(), 1000);
        expect(h.session.state).toBe('idle');
        expect(h.logs.some(l => l.includes('dispatch failed: host is going away'))).toBe(true);
    });

    it('F-5 regression: two shutdowns in a row change nothing (no deadline to extend, one close, one message)', async () => {
        const h = harness();
        h.engine.neverFinish = true;
        await h.session.start(actorOf(h));
        const userEnd = h.session.end('user');
        await vi.waitFor(() => expect(h.engine.finished).toBe(true));
        const s1 = h.session.shutdown();
        const s2 = h.session.shutdown();
        await within(Promise.all([s1, s2, userEnd]), 1000);
        await within(h.session.shutdown(), 1000);
        expect(h.session.state).toBe('idle');
        expect(h.sent).toHaveLength(1);
        expect(h.events.filter(e => e === 'close')).toHaveLength(1);
        expect(h.errors).toEqual([]);
    });

    it('a shutdown during the normal end that already waits at the close step does not repeat anything', async () => {
        vi.useFakeTimers();
        const h = harness();
        h.engine.finishDelayMs = 5000;
        await h.session.start(actorOf(h));
        const userEnd = h.session.end('user');
        await vi.advanceTimersByTimeAsync(6000);
        await userEnd;
        await h.session.shutdown();
        expect(h.sent).toHaveLength(1);
    });
    it('shutdown while starting (engine not ready): silent cancel, no file, no message, no error, idle', async () => {
        const h = harness();
        h.engine.holdStart = true;
        const starting = h.session.start(actorOf(h));
        await vi.waitFor(() => expect(h.session.state).toBe('starting'));
        await h.session.shutdown();
        await starting;
        expect(h.session.state).toBe('idle');
        expect(h.errors).toEqual([]);
        expect(h.sent).toEqual([]);
        expect(h.events).not.toContain('file');
        expect(h.engine.disposed).toBe(true);
        expect(fs.existsSync(path.join(h.folder, 'transcripts'))).toBe(false);
    });

    it('shutdown while starting (capture not ready): silent cancel, engine and capture stopped, no file', async () => {
        const h = harness();
        h.capture.hold = 'reject';
        const starting = h.session.start(actorOf(h));
        await vi.waitFor(() => expect(h.events).toContain('capture'));
        await h.session.shutdown();
        await starting;
        expect(h.session.state).toBe('idle');
        expect(h.errors).toEqual([]);
        expect(h.sent).toEqual([]);
        expect(h.capture.stopped).toBe(true);
        expect(h.engine.disposed).toBe(true);
        expect(fs.existsSync(path.join(h.folder, 'transcripts'))).toBe(false);
    });

    it('shutdown while the components are being prepared: the start ends silently afterwards', async () => {
        let release: () => void = () => undefined;
        const h = harness({ ensureComponents: () => new Promise<void>(r => { release = r; }) });
        const starting = h.session.start(actorOf(h));
        await vi.waitFor(() => expect(h.session.state).toBe('starting'));
        const down = h.session.shutdown();
        release();
        await Promise.all([starting, down]);
        expect(h.session.state).toBe('idle');
        expect(h.errors).toEqual([]);
        expect(h.events).not.toContain('engine');
    });

    it('a user end while starting is ignored', async () => {
        const h = harness();
        h.engine.holdStart = true;
        const starting = h.session.start(actorOf(h));
        await vi.waitFor(() => expect(h.session.state).toBe('starting'));
        void h.session.end('user');
        expect(h.session.state).toBe('starting');
        h.engine.releaseStart();
        await starting;
        expect(h.session.state).toBe('running');
        await h.session.end('user');
    });

    it('end on idle does nothing', async () => {
        const h = harness();
        await h.session.end('shutdown');
        await h.session.end('user');
        expect(h.sent).toEqual([]);
        expect(h.errors).toEqual([]);
    });
});

describe('QM F-2: failures during the start (SPEC_REC_SESSION AC-12)', () => {
    it('a worker failure during capture.start() ends in idle with the error shown, no file, nothing running', async () => {
        const h = harness();
        h.capture.hold = 'reject';
        const starting = h.session.start(actorOf(h));
        await vi.waitFor(() => expect(h.events).toContain('capture'));
        h.engine.fireFailure('recognition process ended unexpectedly (exit code 1)');
        await starting;
        expect(h.session.state).toBe('idle');
        expect(h.errors).toEqual(['Recording not started: recognition process ended unexpectedly (exit code 1)']);
        expect(h.capture.stopped).toBe(true);
        expect(h.engine.disposed).toBe(true);
        expect(h.running).toEqual([]);
        expect(h.marks).toEqual([]);
        expect(h.sent).toEqual([]);
        expect(fs.existsSync(path.join(h.folder, 'transcripts'))).toBe(false);
    });

    it('a capture that finishes starting after the cancellation is stopped at once and creates no file', async () => {
        const h = harness();
        h.capture.hold = 'late';
        const starting = h.session.start(actorOf(h));
        await vi.waitFor(() => expect(h.events).toContain('capture'));
        h.engine.fireFailure('worker died');
        expect(h.session.state).toBe('starting');
        h.capture.releaseStart();
        await starting;
        expect(h.session.state).toBe('idle');
        expect(h.capture.stopped).toBe(true);
        expect(h.events).not.toContain('file');
        expect(h.errors).toEqual(['Recording not started: worker died']);
    });

    it('a failure noticed only through engine.failure after the await still cancels', async () => {
        const h = harness();
        h.engine.fireFailure('failed before anyone listened');
        await h.session.start(actorOf(h));
        expect(h.session.state).toBe('idle');
        expect(h.errors[0]).toBe('Recording not started: failed before anyone listened');
        expect(h.events).not.toContain('file');
    });

    it('a worker failure while the engine is still starting fails the start once', async () => {
        const h = harness();
        h.engine.holdStart = true;
        const starting = h.session.start(actorOf(h));
        await vi.waitFor(() => expect(h.session.state).toBe('starting'));
        h.engine.fireFailure('model could not be loaded');
        await starting;
        expect(h.errors).toEqual(['Recording not started: model could not be loaded']);
        expect(h.session.state).toBe('idle');
    });

    it('a capture failure event during the start cancels it as well', async () => {
        const h = harness();
        h.capture.hold = 'reject';
        const starting = h.session.start(actorOf(h));
        await vi.waitFor(() => expect(h.events).toContain('capture'));
        h.capture.failure.fire('capture helper ended unexpectedly');
        await starting;
        expect(h.errors).toEqual(['Recording not started: capture helper ended unexpectedly']);
        expect(h.session.state).toBe('idle');
    });

    it('after a cancelled start a new start works', async () => {
        const h = harness();
        h.engine.startError = 'first try fails';
        await h.session.start(actorOf(h));
        h.engine.startError = undefined;
        await h.session.start(actorOf(h));
        expect(h.session.state).toBe('running');
        await h.session.end('user');
    });
});