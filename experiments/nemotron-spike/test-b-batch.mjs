// Test B: Batch-Transkription einer WAV-Datei mit foundry-local-sdk.
// Usage: node test-b-batch.mjs <path-to-wav>
import { loadLocalNemotron } from './common.mjs';

const wavPath = process.argv[2];
if (!wavPath) {
    console.error('[B] Usage: node test-b-batch.mjs <path-to-wav>');
    process.exit(1);
}

console.log(`[B] Transcribing: ${wavPath}`);

const { model } = await loadLocalNemotron();
console.log('[B] Model loaded');

const audioClient = model.createAudioClient();
audioClient.settings.language = 'auto';

console.log('[B] Transcribing (batch)...');
const t0 = Date.now();
const result = await audioClient.transcribe(wavPath);
const elapsed = Date.now() - t0;

console.log(`[B] Transcription (${elapsed}ms):`);
console.log('---');
console.log(result.text);
console.log('---');
console.log('[B] ✅ PASS: batch transcription works');

await model.unload();
process.exit(0);
