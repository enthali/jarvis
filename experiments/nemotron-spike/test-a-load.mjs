// Test A: Beweist dass foundry-local-sdk in Node.js laedt, mit dem lokal bereits
// von VS Code heruntergeladenen Nemotron-Modell (kein Catalog-Netzwerk-Call noetig).
import { loadLocalNemotron } from './common.mjs';

console.log('[A] foundry-local-sdk imported successfully');

try {
    const { model } = await loadLocalNemotron();
    console.log('[A] Model loaded successfully');

    await model.unload();
    console.log('[A] Model unloaded');
    console.log('[A] ✅ PASS: foundry-local-sdk + Nemotron (local) loads in Node.js');
} catch (err) {
    console.error('[A] ❌ FAIL:', err.message);
    console.error(err.stack);
}

process.exit(0);
