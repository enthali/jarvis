// T3: two concurrent live sessions on ONE loaded model (e.g. microphone and speaker loopback as separate streams).
// Usage: node t3-two-sessions.mjs <wavA> <wavB>
import { FoundryLocalManager } from 'foundry-local-sdk';
import fs from 'node:fs';
import path from 'node:path';

const [wavA, wavB] = process.argv.slice(2);
const cacheDir = path.join(process.env.APPDATA, 'Code', 'chatDictationModels');
const manager = await FoundryLocalManager.createAsync({ appName: 'fl123-t3', modelCacheDir: cacheDir, logLevel: 'warn' });
const model = await manager.catalog.getModel('nemotron-3.5-asr-streaming-0.6b');
if (!model.isCached) { const v = model.variants.find(x => x.isCached); if (v) model.selectVariant(v); }
await model.load();

async function run(label, wav) {
    const buf = fs.readFileSync(wav);
    const pcm = buf.subarray(buf.indexOf('data') + 8);
    const session = model.createAudioClient().createLiveTranscriptionSession();
    session.settings.sampleRate = 16000; session.settings.channels = 1; session.settings.bitsPerSample = 16;
    await session.start();
    const t0 = Date.now(); let pushed = 0; const lags = []; let text = '';
    const consumer = (async () => {
        for await (const r of session.getStream()) {
            const t = r.content?.[0]?.text ?? '';
            if (!r.is_final) { lags.push(Date.now() - t0 - pushed); text += t; }
        }
    })();
    for (let off = 0; off < pcm.length; off += 8192) {
        const chunk = pcm.subarray(off, Math.min(off + 8192, pcm.length));
        const wait = (off + chunk.length) / 32 - (Date.now() - t0);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        await session.append(new Uint8Array(chunk)); pushed = (off + chunk.length) / 32;
    }
    const ts = Date.now(); await session.stop(); const stopMs = Date.now() - ts; await consumer;
    await session.dispose();
    return `[${label}] lag ms min=${Math.min(...lags)} max=${Math.max(...lags)} n=${lags.length}; stop ${stopMs} ms; text=${JSON.stringify(text.trim())}`;
}

try {
    const results = await Promise.all([run('A', wavA), run('B', wavB)]);
    results.forEach(r => console.log(r));
} catch (e) {
    console.log('[T3] FAILED: ' + e.message);
}
await model.unload();
process.exit(0);
