// Probe in a real extension host: (1) webview audio permissions, (2) runtime tarball download over
// VS Code's patched HTTPS, (3) SDK 1.2.3 live session with event-loop lag. Results -> probe123.log
const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { monitorEventLoopDelay } = require('node:perf_hooks');

const RUNTIME_URL = 'https://main.vscode-cdn.net/dictation-runtime/foundry-local/1.2.3/win32-x64.tgz';
let reportPath;
const log = m => fs.appendFileSync(reportPath, `[${new Date().toISOString()}] ${m}\n`);

function webviewProbe() {
  return new Promise(resolve => {
    const panel = vscode.window.createWebviewPanel('fl123', 'audio probe', vscode.ViewColumn.Beside, { enableScripts: true });
    const timer = setTimeout(() => { panel.dispose(); resolve({ error: 'timeout 20s (no result posted)' }); }, 20000);
    panel.webview.onDidReceiveMessage(m => { clearTimeout(timer); panel.dispose(); resolve(m); });
    panel.webview.html = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline';"></head><body><script>
      const vs = acquireVsCodeApi();
      (async () => {
        const r = { hasMediaDevices: !!navigator.mediaDevices, secure: window.isSecureContext, origin: location.origin };
        const t = async (name, fn) => { try { const s = await fn(); r[name] = 'OK tracks=' + s.getTracks().map(x => x.kind + ':' + x.label).join(','); s.getTracks().forEach(x => x.stop()); } catch (e) { r[name] = 'FAIL ' + e.name + ': ' + e.message; } };
        if (navigator.mediaDevices) {
          try { r.devices = (await navigator.mediaDevices.enumerateDevices()).map(d => d.kind + ':' + (d.label || '(no label)')).join(' | '); } catch (e) { r.devices = 'FAIL ' + e.message; }
          await t('getUserMedia', () => navigator.mediaDevices.getUserMedia({ audio: true }));
          await t('getDisplayMedia', () => navigator.mediaDevices.getDisplayMedia({ audio: true, video: true }));
        }
        vs.postMessage(r);
      })();
    </script></body></html>`;
  });
}

function download(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    https.get(url, { timeout: 30000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume(); resolve(download(new URL(res.headers.location, url).toString(), redirects - 1)); return;
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error('HTTP ' + res.statusCode)); return; }
      let bytes = 0; res.on('data', c => { bytes += c.length; }); res.on('end', () => resolve({ bytes, ms: Date.now() - t0 }));
      res.on('error', reject);
    }).on('error', reject).on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}

async function engine(context) {
  const cacheDir = path.join(path.resolve(context.globalStorageUri.fsPath, '..', '..', '..'), 'chatDictationModels');
  log(`engine: cacheDir derived from globalStorageUri = ${cacheDir} exists=${fs.existsSync(cacheDir)}`);
  const { FoundryLocalManager } = await import('foundry-local-sdk');
  const manager = await FoundryLocalManager.createAsync({ appName: 'fl123-exthost', modelCacheDir: cacheDir, logLevel: 'warn' });
  const model = await manager.catalog.getModel('nemotron-3.5-asr-streaming-0.6b');
  log(`engine: catalog getModel OK id=${model.id} isCached=${model.isCached}`);
  await model.load();
  const session = model.createAudioClient().createLiveTranscriptionSession();
  session.settings.sampleRate = 16000; session.settings.channels = 1; session.settings.bitsPerSample = 16; session.settings.language = 'auto';
  await session.start();
  const buf = fs.readFileSync(path.join(__dirname, '..', '..', 'samples', 'sample-de.wav'));
  const pcm = buf.subarray(buf.indexOf('data') + 8);
  const h = monitorEventLoopDelay({ resolution: 10 }); h.enable();
  const rss0 = process.memoryUsage().rss;
  const t0 = Date.now(); let pushed = 0; const lags = []; let text = '';
  const consumer = (async () => { for await (const r of session.getStream()) { lags.push(Date.now() - t0 - pushed); text += r.content?.[0]?.text ?? ''; } })();
  const step = 8192;
  for (let off = 0; off < pcm.length; off += step) {
    const chunk = pcm.subarray(off, Math.min(off + step, pcm.length));
    const wait = (off + chunk.length) / 32 - (Date.now() - t0);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    await session.append(new Uint8Array(chunk)); pushed = (off + chunk.length) / 32;
  }
  const ts = Date.now(); await session.stop(); const stopMs = Date.now() - ts; await consumer; h.disable();
  log(`engine: exthost live session OK; text=${JSON.stringify(text.trim())}`);
  log(`engine: result lag behind audio ms: min=${Math.min(...lags)} max=${Math.max(...lags)} (n=${lags.length}); stop() took ${stopMs} ms`);
  log(`engine: event-loop delay during transcription: max=${(h.max / 1e6).toFixed(1)} ms p99=${(h.percentile(99) / 1e6).toFixed(1)} ms; rss ${(rss0 / 1e6).toFixed(0)} -> ${(process.memoryUsage().rss / 1e6).toFixed(0)} MB`);
  await session.dispose(); await model.unload();
}

async function run(context) {
  fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
  reportPath = path.join(context.globalStorageUri.fsPath, 'probe123.log');
  fs.writeFileSync(reportPath, '');
  log(`VS Code ${vscode.version}, Node ${process.version}, execPath=${path.basename(process.execPath)}, uiKind=${vscode.env.uiKind}`);
  try { log('webview: ' + JSON.stringify(await webviewProbe())); } catch (e) { log('webview FAILED ' + e.message); }
  try { const r = await download(RUNTIME_URL); log(`runtime tarball via ext-host https: ${r.bytes} bytes in ${r.ms} ms`); } catch (e) { log('runtime tarball FAILED ' + e.message); }
  try { await engine(context); } catch (e) { log('engine FAILED ' + (e.stack || e.message)); }
  log('done');
}

function activate(context) { run(context).catch(e => { try { log('probe FAILED ' + e.message); } catch { /* no report path yet */ } }); }
module.exports = { activate };
