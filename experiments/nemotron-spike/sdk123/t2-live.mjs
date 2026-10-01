// T2: SDK 1.2.3 live session, real-time paced PCM16 chunks, VS Code's model cache.
// Setup: npm install --ignore-scripts; copy %APPDATA%\Code\chatDictationRuntime\1.2.3\foundry-local-core\win32-x64\*
// into node_modules/foundry-local-sdk/foundry-local-core/win32-x64/ and its prebuilds\win32-x64\foundry_local_napi.node
// over the SDK's prebuilds copy (VS Code provisions this runtime on first dictation use).
// Usage: node t2-live.mjs <wav> [language] [tailSilenceSeconds]
import { FoundryLocalManager } from 'foundry-local-sdk';
import fs from 'node:fs';
import path from 'node:path';

const [wavPath, language, tail = '0'] = process.argv.slice(2);
const cacheDir = path.join(process.env.APPDATA, 'Code', 'chatDictationModels');
const CHUNK_SAMPLES = 4096; // same chunk size as VS Code's renderer
const BYTES_PER_MS = 32;     // 16 kHz * 2 bytes

const buf = fs.readFileSync(wavPath);
const dataAt = buf.indexOf('data') + 8;
const pcm = Buffer.concat([buf.subarray(dataAt), Buffer.alloc(Number(tail) * 1000 * BYTES_PER_MS)]);
const audioMs = pcm.length / BYTES_PER_MS;

const manager = await FoundryLocalManager.createAsync({ appName: 'fl123-t2', modelCacheDir: cacheDir, logLevel: 'warn' });
const tModel = Date.now();
const model = await manager.catalog.getModel('nemotron-3.5-asr-streaming-0.6b');
if (!model.isCached) {
    const v = model.variants.find(x => x.isCached);
    if (v) model.selectVariant(v);
}
console.log(`[T2] cached=${model.isCached}`);
await model.load();
console.log(`[T2] model loaded in ${Date.now() - tModel} ms`);

const client = model.createAudioClient();
if (language) client.settings.language = language;
const session = client.createLiveTranscriptionSession();
session.settings.sampleRate = 16000;
session.settings.channels = 1;
session.settings.bitsPerSample = 16;
if (language) session.settings.language = language;
await session.start();

const t0 = Date.now();
let pushedMs = 0;
let lastAppendAt = 0;
const events = [];
const consumer = (async () => {
    for await (const r of session.getStream()) {
        const text = r.content?.[0]?.text ?? '';
        events.push({ wall: Date.now() - t0, pushedMs, final: r.is_final, start: r.start_time, end: r.end_time, text });
    }
})();

// Real-time pacing: send each chunk when its audio would have been captured.
const step = CHUNK_SAMPLES * 2;
for (let off = 0; off < pcm.length; off += step) {
    const chunk = pcm.subarray(off, Math.min(off + step, pcm.length));
    const due = (off + chunk.length) / BYTES_PER_MS;
    const wait = due - (Date.now() - t0);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    await session.append(new Uint8Array(chunk));
    pushedMs = (off + chunk.length) / BYTES_PER_MS;
    lastAppendAt = Date.now() - t0;
}
const tStop = Date.now() - t0;
await session.stop();
const tStopped = Date.now() - t0;
await consumer;
const tEnd = Date.now() - t0;

for (const e of events) {
    console.log(`[${String(e.wall).padStart(6)} ms | audio ${String(Math.round(e.pushedMs)).padStart(6)} ms | ${e.final ? 'FINAL ' : 'interim'} | seg ${e.start ?? '-'}..${e.end ?? '-'}] ${JSON.stringify(e.text)}`);
}
console.log(`[T2] audio=${Math.round(audioMs)} ms (incl. ${tail}s tail silence); last append at ${lastAppendAt} ms; stop() called ${tStop} ms, resolved ${tStopped} ms (stop took ${tStopped - tStop} ms); stream ended ${tEnd} ms`);
const finals = events.filter(e => e.final).map(e => e.text.trim()).join(' ');
console.log(`[T2] events=${events.length} final-text=${JSON.stringify(finals)}`);
await session.dispose();
await model.unload();
process.exit(0);
