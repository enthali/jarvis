// SDK 1.2.3 (VS Code's version; runtime copied from VS Code) official path in the real Extension Host:
// catalog -> model.download -> model.load -> transcribe a WAV. Own modelCacheDir, NOT VS Code's cache.
// Mode from mode.txt next to this file: "inherited" (env as the host has it) or "bridged" (env set from http.proxy, as VS Code does).
const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');

const MODEL_ALIAS = 'nemotron-3.5-asr-streaming-0.6b';
let reportPath;
const t00 = Date.now();
const log = m => fs.appendFileSync(reportPath, `[+${((Date.now() - t00) / 1000).toFixed(1).padStart(6)}s] ${m}\n`);
const hostPort = v => { try { const u = new URL(v); return `${u.protocol}//${u.host}`; } catch { return v ? 'unparsable' : 'unset'; } };
const dirSize = d => { let s = 0; for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) { const p = path.join(d, e.name); s += e.isDirectory() ? dirSize(p) : fs.statSync(p).size; } return s; };

async function run(context) {
  fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
  const mode = fs.existsSync(path.join(__dirname, 'mode.txt')) ? fs.readFileSync(path.join(__dirname, 'mode.txt'), 'utf8').trim() : 'inherited';
  reportPath = path.join(context.globalStorageUri.fsPath, `probe123dl-${mode}.log`); fs.writeFileSync(reportPath, '');
  const proxySetting = vscode.workspace.getConfiguration('http').get('proxy', '');
  log(`mode=${mode}; VS Code ${vscode.version}; Node ${process.version}`);
  log(`env before: HTTPS_PROXY=${hostPort(process.env.HTTPS_PROXY)} HTTP_PROXY=${hostPort(process.env.HTTP_PROXY)}; http.proxy=${hostPort(proxySetting)}`);
  if (mode === 'bridged' && proxySetting) { process.env.HTTPS_PROXY = proxySetting; process.env.HTTP_PROXY = proxySetting; log(`env bridged: HTTPS_PROXY=${hostPort(process.env.HTTPS_PROXY)}`); }
  const cacheDir = path.join(context.globalStorageUri.fsPath, `cache-${mode}`);
  const logsDir = path.join(context.globalStorageUri.fsPath, `sdk123-logs-${mode}`);
  try {
    const { FoundryLocalManager } = await import('foundry-local-sdk');
    const manager = await FoundryLocalManager.createAsync({ appName: 'fl123-dl-probe', modelCacheDir: cacheDir, logsDir, logLevel: 'debug' });
    log('manager created (SDK 1.2.3)');
    const t1 = Date.now(); let n = 0;
    try { n = (await manager.catalog.getModels()).length; log(`catalog.getModels: ${n} models in ${Date.now() - t1} ms`); } catch (e) { log('catalog.getModels FAILED: ' + e.message.split('\n')[0].slice(0, 600)); }
    const model = await manager.catalog.getModel(MODEL_ALIAS);
    log(`catalog.getModel OK: id=${model.id} isCached=${model.isCached}`);
    const ac = new AbortController(); const guard = setTimeout(() => ac.abort(), 25 * 60 * 1000);
    let last = -1; const t2 = Date.now();
    log('model.download starting...');
    await model.download(p => { const b = Math.floor(p / 5) * 5; if (b !== last) { last = b; log(`  download ${p.toFixed(1)}% (${(dirSize(cacheDir) / 1e6).toFixed(0)} MB on disk)`); } }, ac.signal);
    clearTimeout(guard);
    log(`model.download finished in ${((Date.now() - t2) / 1000).toFixed(1)} s; cache dir ${(dirSize(cacheDir) / 1e6).toFixed(0)} MB; isCached=${model.isCached}`);
    await model.load();
    log('model.load OK');
    try {
      const wav = path.resolve(__dirname, '..', '..', 'samples', 'sample-de.wav');
      const r = await model.createAudioClient().transcribe(wav);
      log(`transcribe(sample-de.wav) on downloaded model: ${JSON.stringify((r.text ?? '').trim())}`);
    } catch (e) { log('transcribe check FAILED: ' + e.message.slice(0, 500)); }
    await model.unload();
  } catch (e) {
    log('FAILED: ' + (e.stack || e.message).split('\n').slice(0, 6).join(' | ').slice(0, 1500));
  }
  log('done');
}

function activate(context) { run(context).catch(e => { try { log('probe FAILED ' + e.message); } catch { /* no report */ } }); }
module.exports = { activate };
