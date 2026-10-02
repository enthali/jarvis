// Probe: SDK 2.1.0 from the official channels (npm + NuGet) in the extension's storage; engine in a forked child process
// (spec: fork, ELECTRON_RUN_AS_NODE=1, process.execPath, advanced serialization, ipc); model registered through the LOCAL catalog
// from VS Code's cache folder and loaded in place. Two live-audio APIs are measured one after the other.
const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const zlib = require('node:zlib');
const cp = require('node:child_process');

const NPM_URL = 'https://registry.npmjs.org/foundry-local-sdk/-/foundry-local-sdk-2.1.0.tgz';
const NUGET = [
  { id: 'microsoft.ml.onnxruntime', version: '1.30.0', dll: 'onnxruntime.dll' },
  { id: 'microsoft.ml.onnxruntimegenai.foundry', version: '0.17.1', dll: 'onnxruntime-genai.dll' },
];
let reportPath;
const t00 = Date.now();
const log = m => fs.appendFileSync(reportPath, `[+${((Date.now() - t00) / 1000).toFixed(1).padStart(6)}s] ${m}\n`);
const wait = ms => new Promise(r => setTimeout(r, ms));

function download(url, dest, redirects = 5) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now(); const host = new URL(url).hostname;
    https.get(url, { timeout: 60000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) { res.resume(); resolve(download(new URL(res.headers.location, url).toString(), dest, redirects - 1)); return; }
      if (res.statusCode !== 200) { res.resume(); reject(new Error(`HTTP ${res.statusCode} from ${host}`)); return; }
      const out = fs.createWriteStream(dest); let bytes = 0;
      res.on('data', c => { bytes += c.length; }); res.pipe(out);
      out.on('finish', () => resolve({ bytes, ms: Date.now() - t0, host })); res.on('error', reject); out.on('error', reject);
    }).on('error', reject).on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}

function untar(tgzPath, destDir, want) {
  const buf = zlib.gunzipSync(fs.readFileSync(tgzPath)); let off = 0, longName = null; const written = [];
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512); if (h.every(b => b === 0)) { break; }
    const cut = (a, b) => { const s = h.toString('utf8', a, b); const z = s.indexOf('\0'); return z >= 0 ? s.slice(0, z) : s; };
    let name = cut(0, 100); const prefix = cut(345, 500); if (prefix) { name = prefix + '/' + name; }
    const size = parseInt(cut(124, 136).trim() || '0', 8); const type = String.fromCharCode(h[156] || 48);
    off += 512; const data = buf.subarray(off, off + size); off += Math.ceil(size / 512) * 512;
    if (type === 'L') { longName = data.toString('utf8').replace(/\0+$/, ''); continue; }
    if (type === 'x' || type === 'g') { continue; }
    if (longName) { name = longName; longName = null; }
    if (type !== '0' && type !== '\0') { continue; }
    const rel = want(name); if (!rel) { continue; }
    const target = path.resolve(destDir, rel); if (!target.startsWith(path.resolve(destDir) + path.sep)) { throw new Error('tar entry escapes target: ' + name); }
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, data); written.push(rel);
  }
  return written;
}

async function assemble(dir) {
  fs.mkdirSync(path.join(dir, '.tmp'), { recursive: true });
  const tgz = path.join(dir, '.tmp', 'sdk.tgz'); const r = await download(NPM_URL, tgz); let total = r.bytes;
  untar(tgz, dir, n => (n === 'package/package.json' || n.startsWith('package/dist/') || n.startsWith('package/prebuilds/win32-x64/')) ? n.slice('package/'.length) : null);
  const AdmZip = require('adm-zip'); const pre = path.join(dir, 'prebuilds', 'win32-x64');
  for (const p of NUGET) {
    const f = path.join(dir, '.tmp', p.id + '.nupkg'); const d = await download(`https://api.nuget.org/v3-flatcontainer/${p.id}/${p.version}/${p.id}.${p.version}.nupkg`, f); total += d.bytes;
    const e = new AdmZip(f).getEntry(`runtimes/win-x64/native/${p.dll}`); if (!e) { throw new Error('missing ' + p.dll); } fs.writeFileSync(path.join(pre, p.dll), e.getData());
  }
  fs.rmSync(path.join(dir, '.tmp'), { recursive: true, force: true });
  log(`assembled SDK 2.1.0 from npm + NuGet: ${(total / 1e6).toFixed(1)} MB downloaded`);
}

function spawnWorker(label) {
  const child = cp.fork(path.join(__dirname, 'worker.cjs'), [], { execPath: process.execPath, execArgv: [], env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', ORT_TELEMETRY_DISABLED: '1' }, serialization: 'advanced', stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  const w = { label, child, events: [], sentMs: 0, t0: 0, exit: null, others: new Set() };
  child.stderr.on('data', c => log(`[${label} stderr] ${String(c).trim().slice(0, 300)}`));
  child.on('exit', (code, signal) => { w.exit = { code, signal }; log(`[${label}] exit event: code=${code} signal=${signal}`); });
  child.on('message', m => { if (m.t === 'text') { w.events.push({ at: Date.now(), sentMs: w.sentMs, ...m }); } else if (m.t === 'other') { w.others.add(m.type); } });
  w.msg = (pred, ms, what) => new Promise((resolve, reject) => {
    const to = setTimeout(() => { child.off('message', on); reject(new Error(`timeout waiting for ${what}`)); }, ms);
    const on = m => { if (m.t === 'error') { clearTimeout(to); child.off('message', on); reject(new Error('worker error: ' + m.message)); } else if (pred(m)) { clearTimeout(to); child.off('message', on); resolve(m); } };
    child.on('message', on);
  });
  return w;
}

async function measure(mode, root, sdkDir, modelPath, pcm) {
  const label = mode; log(`--- mode ${mode}`);
  const w = spawnWorker(label);
  try {
    await w.msg(m => m.t === 'booted', 30000, 'booted'); const tInit = Date.now();
    w.child.send({ t: 'init', mode, sdkDir, modelPath, cacheDir: path.join(root, 'cache'), logsDir: path.join(root, `logs-${mode}`) });
    const ready = await w.msg(m => m.t === 'ready', 180000, 'ready');
    log(`[${mode}] ready after ${((Date.now() - tInit) / 1000).toFixed(1)} s (create manager, LOCAL catalog registerModel/getModelVariant, model.load, session start) in ${ready.node}, child rss ${ready.rssMB} MB`);
    w.t0 = Date.now(); const step = 4096 * 2;
    for (let off = 0; off < pcm.length; off += step) {
      const chunk = pcm.subarray(off, Math.min(off + step, pcm.length)); const due = (off + chunk.length) / 32 - (Date.now() - w.t0); if (due > 0) { await wait(due); }
      w.child.send({ t: 'audio', data: new Uint8Array(chunk) }); w.sentMs = (off + chunk.length) / 32;
    }
    const tFin = Date.now(); w.child.send({ t: 'finish' });
    const fin = await w.msg(m => m.t === 'finished', 120000, 'finished'); const tDone = Date.now();
    const partial = w.events.filter(e => e.kind === 'partial'); const finals = w.events.filter(e => e.kind !== 'partial');
    const d = w.events.map(e => e.at - w.t0 - e.sentMs).sort((a, b) => a - b);
    log(`[${mode}] events: ${w.events.length} (partial ${partial.length}, final/none ${finals.length}); other item types: ${[...w.others].join(',') || '-'}`);
    if (d.length) { log(`[${mode}] delay of ALL events behind audio ms: min=${d[0]} median=${d[Math.floor(d.length / 2)]} p95=${d[Math.floor(d.length * 0.95)]} max=${d[d.length - 1]}`); }
    const tagged = w.events.filter(e => /</.test(e.text ?? '')); log(`[${mode}] events whose text contains '<' (language tags): ${tagged.length}; ${tagged.slice(0, 5).map(e => `${JSON.stringify(e.text)}@${Math.round(e.sentMs)}ms`).join(', ') || '-'}`);
    log(`[${mode}] finish (stop/markFinished until final result) took ${tDone - tFin} ms; audio sent ${Math.round(w.sentMs)} ms`);
    w.events.slice(0, 4).forEach(e => log(`[${mode}] sample event: kind=${e.kind} text=${JSON.stringify(e.text)} start=${e.startMs} end=${e.endMs} utteranceStart=${e.utteranceStart} lang=${e.language}`));
    finals.slice(0, 2).forEach(e => log(`[${mode}] kind!=partial event at audio ${Math.round(e.sentMs)} ms (${e.at - w.t0} ms wall): kind=${e.kind} text=${JSON.stringify((e.text ?? '').slice(0, 90))}`));
    const aggregated = fin.text ?? (finals.length ? finals.map(e => e.text).join('') : partial.map(e => e.text).join(''));
    log(`[${mode}] result: segments=${fin.segments ?? '-'} finishReason=${fin.finishReason ?? '-'} durationMs=${fin.durationMs ?? '-'} text=${JSON.stringify(String(aggregated).trim().slice(0, 260))}`);
    for (let i = 0; i < 60 && !w.exit; i++) { await wait(100); }
    if (!w.exit) { w.child.kill(); }
  } catch (e) { log(`[${mode}] FAILED: ${e.message}`); try { w.child.kill(); } catch { /* gone */ } }
}

async function run(context) {
  const root = context.globalStorageUri.fsPath; fs.mkdirSync(root, { recursive: true });
  reportPath = path.join(root, 'probe210live.log'); fs.writeFileSync(reportPath, '');
  log(`VS Code ${vscode.version}; ext host Node ${process.version}; execPath=${path.basename(process.execPath)}`);
  const sdkDir = path.join(root, 'sdk210');
  try { if (fs.existsSync(path.join(sdkDir, '.complete'))) { log('components already assembled, skipped'); } else { await assemble(sdkDir); fs.writeFileSync(path.join(sdkDir, '.complete'), 'ok'); } } catch (e) { log('assembly FAILED: ' + (e.stack || e.message)); return; }
  const modelPath = path.join(path.resolve(root, '..', '..', '..'), 'chatDictationModels', 'Microsoft', 'nemotron-3.5-asr-streaming-0.6b-generic-cpu-3', 'v3');
  log(`model folder (read in place): exists=${fs.existsSync(path.join(modelPath, 'genai_config.json'))}`);
  const wavFile = [path.join(__dirname, '..', '..', 'sdk123', 'long.wav'), path.join(__dirname, '..', '..', 'samples', 'sample-de.wav')].find(f => fs.existsSync(f));
  const b = fs.readFileSync(wavFile); const pcm = b.subarray(b.indexOf('data') + 8);
  log(`audio: ${path.basename(wavFile)}, ${(pcm.length / 32000).toFixed(1)} s, 16 kHz mono PCM16, blocks of 4096 samples, real-time pacing`);
  await measure('session', root, sdkDir, modelPath, pcm);
  await wait(1500);
  await measure('client', root, sdkDir, modelPath, pcm);
  log('done');
}

function activate(context) { run(context).catch(e => { try { log('probe FAILED ' + (e.stack || e.message)); } catch { /* no report */ } }); }
module.exports = { activate };
