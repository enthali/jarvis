// Test E: Mixed-Language-Test — Deutsch/Englisch gemischt mit language='auto'.
// Usage: node test-e-auto-lang.mjs <path-to-wav>
// Erwartet eine WAV mit gemischter Sprache (z.B. "Hello, das ist ein Test").
import { loadLocalNemotron } from './common.mjs';

const wavPath = process.argv[2];
if (!wavPath) {
    console.error('[E] Usage: node test-e-auto-lang.mjs <path-to-wav>');
    process.exit(1);
}

console.log(`[E] Mixed-language test with: ${wavPath}`);

const { model } = await loadLocalNemotron();
console.log('[E] Model loaded');

// Test 1: language = 'auto' (automatic detection)
const audioClient = model.createAudioClient();
audioClient.settings.language = 'auto';

console.log('[E] Transcribing with language=auto...');
const result = await audioClient.transcribe(wavPath);
console.log('[E] Result (auto):', result.text);

// Test 2: language = 'de' (forced German)
const audioClientDe = model.createAudioClient();
audioClientDe.settings.language = 'de';
console.log('[E] Transcribing with language=de...');
const resultDe = await audioClientDe.transcribe(wavPath);
console.log('[E] Result (de):', resultDe.text);

// Test 3: language = 'en' (forced English)
const audioClientEn = model.createAudioClient();
audioClientEn.settings.language = 'en';
console.log('[E] Transcribing with language=en...');
const resultEn = await audioClientEn.transcribe(wavPath);
console.log('[E] Result (en):', resultEn.text);

console.log('\n[E] Comparison:');
console.log('  auto:', result.text);
console.log('  de:  ', resultDe.text);
console.log('  en:  ', resultEn.text);

if (result.text !== resultDe.text || result.text !== resultEn.text) {
    console.log('[E] ✅ PASS: auto produces different result than fixed language');
} else {
    console.log('[E] ⚠️ All results identical — auto may not be changing behavior');
}

await model.unload();
process.exit(0);
