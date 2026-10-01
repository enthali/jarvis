// T1: SDK 1.2.3 catalog behaviour with a private vs VS Code's model cache dir. Usage: node t1-catalog.mjs private|vscode
import { FoundryLocalManager } from 'foundry-local-sdk';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const mode = process.argv[2] ?? 'private';
const cacheDir = mode === 'vscode'
    ? path.join(process.env.APPDATA, 'Code', 'chatDictationModels')
    : fs.mkdtempSync(path.join(os.tmpdir(), 'fl123-cache-'));
const logsDir = path.join(os.tmpdir(), `fl123-logs-${mode}`);
console.log(`[T1] mode=${mode} cacheDir=${cacheDir}`);
console.log(`[T1] proxy env: HTTPS_PROXY=${process.env.HTTPS_PROXY ? new URL(process.env.HTTPS_PROXY).host : 'unset'}`);

const manager = await FoundryLocalManager.createAsync({ appName: 'fl123-t1', modelCacheDir: cacheDir, logsDir, logLevel: 'debug' });
const t0 = Date.now();
try {
    const all = await manager.catalog.getModels();
    console.log(`[T1] getModels: ${all.length} models (${Date.now() - t0} ms)`);
    const cached = await manager.catalog.getCachedModels();
    console.log(`[T1] getCachedModels: ${cached.map(m => m.id).join(', ') || 'none'}`);
    const m = await manager.catalog.getModel('nemotron-3.5-asr-streaming-0.6b');
    console.log(`[T1] getModel OK: id=${m.id} isCached=${m.isCached} variants=${m.variants?.length}`);
} catch (e) {
    console.log(`[T1] FAILED: ${e.message}`);
}
console.log(`[T1] logs in ${logsDir}`);
manager.dispose();
process.exit(0);
