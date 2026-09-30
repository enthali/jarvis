// Test D: Streaming-Transkription — WAV-Datei stueckweise einspeisen, interim Results empfangen.
// Usage: node test-d-stream.mjs <path-to-wav>
import { loadLocalNemotron } from './common.mjs';

const wavPath = process.argv[2];
if (!wavPath) {
    console.error('[D] Usage: node test-d-stream.mjs <path-to-wav>');
    process.exit(1);
}

console.log(`[D] Streaming transcript for: ${wavPath}`);

const { model } = await loadLocalNemotron();
console.log('[D] Model loaded');

const audioClient = model.createAudioClient();
audioClient.settings.language = 'auto';

console.log('[D] Starting streaming transcription...');
console.log('---');

let chunkCount = 0;
let fullText = '';
const t0 = Date.now();

try {
    for await (const chunk of audioClient.transcribeStreaming(wavPath)) {
        chunkCount++;
        process.stdout.write(chunk.text);
        fullText += chunk.text;
    }
} catch (err) {
    console.error(`\n[D] Error during streaming: ${err.message}`);
}

const elapsed = Date.now() - t0;
console.log('\n---');
console.log(`[D] Chunks received: ${chunkCount}`);
console.log(`[D] Total text length: ${fullText.length} chars`);
console.log(`[D] Elapsed: ${elapsed}ms`);

if (chunkCount > 1) {
    console.log('[D] ✅ PASS: streaming works — received interim results');
} else if (chunkCount === 1) {
    console.log('[D] ⚠️ PARTIAL: only one chunk — streaming may not be truly streaming');
} else {
    console.log('[D] ❌ FAIL: no chunks received');
}

await model.unload();
process.exit(0);
