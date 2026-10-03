/**
 * SPEC_REC_CAPTURE (parent side), SPEC_REC_ENGINE (parent side), SPEC_REC_BUTTON / SPEC_REC_SETTINGS
 * (manifest), SPEC_REC_LIVEVIEW (page), SPEC_MOD_REC_PKG.
 */
import { describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { PowerShellCapture, pickShell, CAPTURE_READY_TIMEOUT_MS } from '../../packages/recorder/src/capture';
import { WorkerEngine } from '../../packages/recorder/src/engine';
import { buildHtml, secondaryColumn } from '../../packages/recorder/src/liveView';
import { dictationModelDir, MODEL_MISSING_MESSAGE } from '../../packages/recorder/src/extension';

const pkgDir = path.resolve(__dirname, '../../packages/recorder');
const read = (rel: string): string => fs.readFileSync(path.join(pkgDir, rel), 'utf8');

class FakeChild extends EventEmitter {
    stdout = new PassThrough();
    stderr = new PassThrough();
    stdin = new PassThrough();
    exitCode: number | null = null;
    killed = false;
    sent: unknown[] = [];
    kill() { this.killed = true; this.exit(null); return true; }
    exit(code: number | null) { this.exitCode = code ?? 1; this.emit('exit', code, code === null ? 'SIGTERM' : null); this.emit('close', code); }
    send(m: unknown, cb?: (e: Error | null) => void) { this.sent.push(m); cb?.(null); return true; }
    err(line: object | string) { this.stderr.write((typeof line === 'string' ? line : JSON.stringify(line)) + '\n'); }
}

function makeCapture() {
    const child = new FakeChild();
    const cap = new PowerShellCapture('capture.ps1', (() => child) as never, 'pwsh');
    return { child, cap };
}

describe('PowerShellCapture (SPEC_REC_CAPTURE)', () => {
    it('both sources ready: start resolves, chunks are relayed', async () => {
        const { child, cap } = makeCapture();
        const got: number[] = [];
        cap.onData(c => got.push(c.length));
        const started = cap.start();
        child.err({ event: 'ready', mic: true, speaker: true });
        await expect(started).resolves.toEqual({ mic: true, speaker: true });
        child.stdout.write(Buffer.alloc(8192));
        await new Promise(r => setImmediate(r));
        expect(got).toEqual([8192]);
    });

    it('one source missing: start resolves and names which', async () => {
        const { child, cap } = makeCapture();
        const started = cap.start();
        child.err({ event: 'ready', mic: false, speaker: true });
        await expect(started).resolves.toEqual({ mic: false, speaker: true });
    });

    it('neither source: start rejects', async () => {
        const { child, cap } = makeCapture();
        const started = cap.start();
        child.err({ event: 'ready', mic: false, speaker: false });
        await expect(started).rejects.toThrow(/neither/);
    });

    it('a later loss of one source is reported, of the second is a failure', async () => {
        const { child, cap } = makeCapture();
        const lost: string[] = []; const fails: string[] = [];
        cap.onSourceLost(n => lost.push(n)); cap.onFailure(r => fails.push(r));
        const started = cap.start();
        child.err({ event: 'ready', mic: true, speaker: true });
        await started;
        child.err({ event: 'source', name: 'speaker', state: 'lost' });
        await new Promise(r => setImmediate(r));
        expect(lost).toEqual(['speaker']);
        child.err({ event: 'source', name: 'mic', state: 'lost' });
        await new Promise(r => setImmediate(r));
        expect(fails).toEqual(['both audio sources were lost']);
    });

    it('AC-4: an exit that was not asked for is a failure carrying the plain stderr text', async () => {
        const { child, cap } = makeCapture();
        const fails: string[] = [];
        cap.onFailure(r => fails.push(r));
        const started = cap.start();
        child.err({ event: 'ready', mic: true, speaker: true });
        await started;
        child.err('Add-Type : language mode is constrained');
        await new Promise(r => setImmediate(r));
        child.exit(1);
        expect(fails[0]).toContain('ended unexpectedly');
        expect(fails[0]).toContain('constrained');
    });

    it('an error event before ready rejects start with its message', async () => {
        const { child, cap } = makeCapture();
        const started = cap.start();
        child.err({ event: 'error', message: 'capture helper could not be compiled' });
        await expect(started).rejects.toThrow(/compiled/);
    });

    it('AC-3: stop closes stdin and waits for the exit; no failure is raised', async () => {
        const { child, cap } = makeCapture();
        const fails: string[] = [];
        cap.onFailure(r => fails.push(r));
        const started = cap.start();
        child.err({ event: 'ready', mic: true, speaker: true });
        await started;
        let stdinEnded = false;
        child.stdin.on('finish', () => { stdinEnded = true; setTimeout(() => child.exit(0), 5); });
        await cap.stop();
        expect(stdinEnded).toBe(true);
        expect(fails).toEqual([]);
        expect(child.killed).toBe(false);
    });

    it('QM F-2 / AC-5: a helper that never reports ready fails the start after 15 s and is killed', async () => {
        vi.useFakeTimers();
        try {
            const { child, cap } = makeCapture();
            const started = cap.start();
            const outcome = started.then(() => 'resolved', (e: Error) => e.message);
            await vi.advanceTimersByTimeAsync(CAPTURE_READY_TIMEOUT_MS - 100);
            expect(child.killed).toBe(false);
            await vi.advanceTimersByTimeAsync(200);
            await expect(outcome).resolves.toMatch(/did not report ready within 15 seconds/);
            expect(CAPTURE_READY_TIMEOUT_MS).toBe(15000);
            expect(child.killed).toBe(true);
        } finally { vi.useRealTimers(); }
    });

    it('QM F-2: stop() while the start waits for ready settles the start (no hang), no failure event', async () => {
        const { child, cap } = makeCapture();
        const fails: string[] = [];
        cap.onFailure(r => fails.push(r));
        const started = cap.start();
        const outcome = started.then(() => 'resolved', (e: Error) => e.message);
        child.stdin.on('finish', () => setTimeout(() => child.exit(0), 5));
        await cap.stop();
        await expect(outcome).resolves.toBe('capture start was cancelled');
        expect(fails).toEqual([]);
    });

    it('pickShell prefers pwsh when it is on PATH, otherwise powershell', () => {
        const sep = path.delimiter;
        expect(pickShell({ PATH: `C:\\a${sep}C:\\b` }, p => p === path.join('C:\\b', 'pwsh.exe'))).toBe('pwsh');
        expect(pickShell({ PATH: `C:\\a${sep}C:\\b` }, () => false)).toBe('powershell');
    });
});

function makeEngine() {
    const child = new FakeChild();
    let forkOpts: { env?: NodeJS.ProcessEnv; serialization?: string; stdio?: unknown } = {};
    const engine = new WorkerEngine({
        workerPath: 'w.js', sdkDir: 'sdk', modelDir: 'model',
        forkFn: ((_p: string, _a: string[], o: typeof forkOpts) => { forkOpts = o; return child; }) as never,
    });
    return { child, engine, opts: () => forkOpts };
}

describe('WorkerEngine (SPEC_REC_ENGINE)', () => {
    it('starts the worker as a child with the documented environment and sends init with language auto', async () => {
        const { child, engine, opts } = makeEngine();
        const started = engine.start();
        expect(opts().env?.ELECTRON_RUN_AS_NODE).toBe('1');
        expect(opts().env?.ORT_TELEMETRY_DISABLED).toBe('1');
        expect(opts().serialization).toBe('advanced');
        expect(child.sent[0]).toEqual({ t: 'init', sdkDir: 'sdk', modelDir: 'model', language: 'auto' });
        child.emit('message', { t: 'ready' });
        await expect(started).resolves.toBeUndefined();
    });

    it('forwards audio over IPC and passes text deltas on unchanged, tags included', async () => {
        const { child, engine } = makeEngine();
        const texts: string[] = [];
        engine.onText(t => texts.push(t));
        const started = engine.start();
        child.emit('message', { t: 'ready' });
        await started;
        engine.push(new Uint8Array([1, 2]));
        child.emit('message', { t: 'text', delta: ' Hallo <de-DE>' });
        expect(child.sent[1]).toEqual({ t: 'audio', data: new Uint8Array([1, 2]) });
        expect(texts).toEqual([' Hallo <de-DE>']);
    });

    it('finish resolves after final', async () => {
        const { child, engine } = makeEngine();
        const started = engine.start();
        child.emit('message', { t: 'ready' });
        await started;
        const fin = engine.finish();
        expect(child.sent.at(-1)).toEqual({ t: 'finish' });
        child.emit('message', { t: 'final', text: 'x' });
        await expect(fin).resolves.toBeUndefined();
    });

    it('SPEC_REC_ENGINE AC-5 / D-56: dispose() is an expected end (no failure) and resolves a pending finish()', async () => {
        const { child, engine } = makeEngine();
        const fails: string[] = [];
        engine.onFailure(r => fails.push(r));
        const started = engine.start();
        child.emit('message', { t: 'ready' });
        await started;
        let finished = false;
        const fin = engine.finish().then(() => { finished = true; });
        expect(finished).toBe(false);
        engine.dispose();
        await fin;
        expect(finished).toBe(true);
        expect(child.killed).toBe(true);
        expect(fails).toEqual([]);
        expect(engine.failure).toBeUndefined();
    });

    it('QM F-2 / AC-11: the failure reason is kept for a late check; dispose settles a start that waits for ready', async () => {
        const a = makeEngine();
        expect(a.engine.failure).toBeUndefined();
        const s = a.engine.start();
        a.child.emit('message', { t: 'error', message: 'boom' });
        await expect(s).rejects.toThrow('boom');
        expect(a.engine.failure).toBe('boom');

        const b = makeEngine();
        const pending = b.engine.start();
        const outcome = pending.then(() => 'resolved', (e: Error) => e.message);
        b.engine.dispose();
        await expect(outcome).resolves.toMatch(/cancelled/);
        expect(b.engine.failure).toBeUndefined();
        expect(b.child.killed).toBe(true);
    });

    it('an error message fails start once, kills the worker, ignores later audio and resolves finish at once', async () => {
        const { child, engine } = makeEngine();
        const fails: string[] = [];
        engine.onFailure(r => fails.push(r));
        const started = engine.start();
        child.emit('message', { t: 'error', message: 'model could not be loaded' });
        await expect(started).rejects.toThrow('model could not be loaded');
        child.emit('message', { t: 'error', message: 'again' });
        expect(fails).toEqual(['model could not be loaded']);
        expect(child.killed).toBe(true);
        const sentBefore = child.sent.length;
        engine.push(new Uint8Array(1));
        expect(child.sent.length).toBe(sentBefore);
        await expect(engine.finish()).resolves.toBeUndefined();
    });

    it('an unexpected exit of the worker is a failure; the exit after final is not', async () => {
        const a = makeEngine();
        const fails: string[] = [];
        a.engine.onFailure(r => fails.push(r));
        const s = a.engine.start();
        a.child.emit('message', { t: 'ready' });
        await s;
        a.child.exit(null);
        expect(fails[0]).toContain('ended unexpectedly');

        const b = makeEngine();
        const fails2: string[] = [];
        b.engine.onFailure(r => fails2.push(r));
        const s2 = b.engine.start();
        b.child.emit('message', { t: 'ready' });
        await s2;
        const fin = b.engine.finish();
        b.child.emit('message', { t: 'final', text: '' });
        await fin;
        b.child.exit(0);
        expect(fails2).toEqual([]);
    });
});

describe('manifest (SPEC_REC_SETTINGS, SPEC_REC_BUTTON, SPEC_MOD_REC_PKG)', () => {
    const pkg = JSON.parse(read('package.json'));

    it('SPEC_REC_SETTINGS AC-1/AC-2: exactly one setting and nothing named after the retired pipeline', () => {
        const groups = pkg.contributes.configuration;
        expect(groups).toHaveLength(1);
        expect(groups[0].title).toBe('Jarvis Recorder');
        expect(Object.keys(groups[0].properties)).toEqual(['jarvis.recording.enabled']);
        expect(groups[0].properties['jarvis.recording.enabled']).toMatchObject({ type: 'boolean', default: false });
        const text = JSON.stringify(pkg).toLowerCase();
        for (const word of ['whisper', 'stoprecording', 'checktranscripts', 'recordingactive', 'jarvisproject', 'jarvisevent']) {
            expect(text).not.toContain(word);
        }
    });

    it('SPEC_REC_BUTTON AC-1: exactly start and show, no stop command', () => {
        expect(pkg.contributes.commands.map((c: { command: string }) => c.command)).toEqual(['jarvis.startRecording', 'jarvis.showRecording']);
        expect(pkg.contributes.commands.map((c: { title: string }) => c.title)).toEqual(['Jarvis: Start Recording', 'Jarvis: Show Running Recording']);
    });

    it('SPEC_REC_BUTTON AC-2/AC-3: inline actions on jarvisActor nodes, show without a setting condition', () => {
        const inline = pkg.contributes.menus['view/item/context'] as { command: string; when: string; group: string }[];
        const start = inline.find(i => i.command === 'jarvis.startRecording')!;
        const show = inline.find(i => i.command === 'jarvis.showRecording')!;
        expect(start.when).toContain('viewItem == jarvisActor');
        expect(start.when).toContain('config.jarvis.recording.enabled == true');
        expect(start.when).toContain('jarvis.recordingRunning != true');
        expect(show.when).toContain('jarvis.recordingRunning == true');
        expect(show.when).not.toContain('config.');
        expect(start.group).toBe('inline');
        expect(show.group).toBe('inline');
    });

    it('SPEC_REC_BUTTON AC-4: the palette offers start when enabled; show is hidden', () => {
        const palette = pkg.contributes.menus.commandPalette as { command: string; when: string }[];
        expect(palette.find(p => p.command === 'jarvis.startRecording')?.when).toBe('config.jarvis.recording.enabled == true');
        expect(palette.find(p => p.command === 'jarvis.showRecording')?.when).toBe('false');
    });

    it('the heavy parts are not in the VSIX: no dependencies, helper and manifest ship as resources', () => {
        expect(Object.keys(pkg.dependencies ?? {})).toEqual(['jarvis-core']);
        const ignore = read('.vscodeignore');
        expect(ignore).not.toMatch(/^resources/m);
        expect(fs.existsSync(path.join(pkgDir, 'resources', 'capture.ps1'))).toBe(true);
        expect(fs.existsSync(path.join(pkgDir, 'resources', 'components.json'))).toBe(true);
        expect(read('build.js')).toContain('engineWorker');
    });
});

describe('extension wiring (SPEC_REC_SETTINGS, SPEC_REC_COMPONENTS)', () => {
    const src = read('src/extension.ts');

    it('unregisters the legacy heartbeat job on activation', () => {
        expect(src).toContain("'Jarvis: Check Transcripts'");
        expect(src).toContain('api.unregisterJob(LEGACY_JOB)');
    });

    it('guards the core API version and reads markActor defensively', () => {
        expect(src).toContain('api.version !== 2');
        expect(src).toContain("typeof api.markActor !== 'function'");
    });

    it('dispatches through api.sendMessage with the sender Recorder', () => {
        expect(src).toContain("api.sendMessage(actorName, 'Recorder', text)");
        expect(src).not.toContain('internalAppendMessage');
    });

    it('derives the dictation model cache three directories above the global storage', () => {
        const root = path.parse(process.cwd()).root;
        const storage = path.join(root, 'u', 'Code', 'User', 'globalStorage', 'enthali.jarvis-recorder');
        expect(dictationModelDir(storage)).toBe(path.join(root, 'u', 'Code', 'chatDictationModels'));
        expect(MODEL_MISSING_MESSAGE).toContain('not with the cloud model');
    });
});

describe('transcript view (SPEC_REC_LIVEVIEW)', () => {
    it('placement: the last existing column, at least the second', () => {
        expect(secondaryColumn(1)).toBe(2);
        expect(secondaryColumn(2)).toBe(2);
        expect(secondaryColumn(4)).toBe(4);
    });

    it('AC-6: text enters the page only through text nodes under a strict content security policy', () => {
        const html = buildHtml('NONCE', 'csp');
        expect(html).toContain("default-src 'none'");
        expect(html).toContain("script-src 'nonce-NONCE'");
        expect(html).toContain('createTextNode');
        expect(html).not.toMatch(/innerHTML|insertAdjacentHTML|outerHTML/);
    });

    it('AC-2/AC-3: end button, Actor, elapsed time, word count and the three button states', () => {
        const html = buildHtml('N', 'c');
        for (const id of ['id="end"', 'id="actor"', 'id="elapsed"', 'id="words"', 'id="text"']) { expect(html).toContain(id); }
        expect(html).toContain('End recording');
        expect(html).toContain('Recording ended');
        expect(html).toContain('Finishing');
    });
});

describe('capture helper contract (SPEC_REC_CAPTURE)', () => {
    const ps = read('resources/capture.ps1');
    it('streams 16 kHz mono PCM16 in blocks of 4096 samples and writes JSON events to stderr', () => {
        expect(ps).toContain('const int BlockSamples = 4096;');
        expect(ps).toContain('const int OutRate = 16000;');
        for (const ev of ['\\"event\\":\\"ready\\"', '\\"event\\":\\"source\\"', '\\"event\\":\\"error\\"']) { expect(ps).toContain(ev); }
    });
    it('AC-1: opens no file for audio', () => {
        expect(ps).not.toMatch(/File\.(Create|Open|Write)|FileStream|Out-File|Set-Content/);
    });
    it('closing stdin stops the helper', () => {
        expect(ps).toContain('Console.OpenStandardInput');
    });
});

describe('retired pipeline is gone (artefact-removal check)', () => {
    it('no source or doc of the recorder package names the Whisper pipeline', () => {
        for (const rel of ['src/extension.ts', 'src/session.ts', 'src/liveView.ts', 'src/capture.ts']) {
            expect(read(rel).toLowerCase()).not.toMatch(/whisper|recorder\.py|\.recording\.json/);
        }
        expect(fs.existsSync(path.join(pkgDir, 'src', 'recording.ts'))).toBe(false);
    });
});
