// Probe: SDK 1.2.3 assembled from the OFFICIAL channels (npm tarball + NuGet) into the extension's storage, then the engine
// run as the spec says: child_process.fork(worker, ELECTRON_RUN_AS_NODE=1, process.execPath, advanced serialization, ipc).
const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const { monitorEventLoopDelay } = require('node:perf_hooks');

const NPM_URL = 'https://registry.npmjs.org/foundry-local-sdk/-/foundry-local-sdk-1.2.3.tgz';
const NUGET = [
  { id: 'microsoft.ai.foundry.local.core', version: '1.2.3' },
  { id: 'microsoft.ml.onnxruntime.foundry', version: '1.26.0' },
  { id: 'microsoft.ml.onnxruntimegenai.foundry', version: '0.14.1' },
];
let reportPath;
const t00 = Date.now();
const log = m => fs.appendFileSync(reportPath, `[+${((Date.now() - t00) / 1000).toFixed(1).padStart(6)}s] ${m}\n`);
const wait = ms => new Promise(r => setTimeout(r, ms));

function download(url, dest, redirects = 5) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now(); const host = new URL(url).hostname;
    log(`GET ${host}${new URL(url).pathname.slice(0, 70)}`);
    https.get(url, { timeout: 60000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) { res.resume(); resolve(download(new URL(res.headers.location, url).toString(), dest, redirects - 1)); return; }
      if (res.statusCode !== 200) { res.resume(); reject(new Error(`HTTP ${res.statusCode} from ${host}`)); return; }
      const hash = crypto.createHash('sha512'); const out = fs.createWriteStream(dest); let bytes = 0;
      res.on('data', c => { bytes += c.length; hash.update(c); });
      res.pipe(out); out.on('finish', () => resolve({ bytes, ms: Date.now() - t0, host, sha512: hash.digest('base64') }));
      res.on('error', reject); out.on('error', reject);
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
    const target = path.resolve(destDir, rel);
    if (!target.startsWith(path.resolve(destDir) + path.sep)) { throw new Error('tar entry escapes target: ' + name); }
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, data); written.push(rel);
  }
  return written;
}

async function assemble(dir) {
  if (fs.existsSync(path.join(dir, '.complete'))) { log('assembly: .complete present, skipped'); return; }
  fs.mkdirSync(path.join(dir, '.tmp'), { recursive: true });
  const tgz = path.join(dir, '.tmp', 'sdk.tgz'); const r = await download(NPM_URL, tgz);
  log(`npm foundry-local-sdk@1.2.3: ${(r.bytes / 1e6).toFixed(3)} MB in ${(r.ms / 1000).toFixed(1)} s from ${r.host}`);
  const meta = await new Promise((res, rej) => https.get('https://registry.npmjs.org/foundry-local-sdk/1.2.3', r2 => { let s = ''; r2.on('data', c => s += c); r2.on('end', () => res(JSON.parse(s))); }).on('error', rej));
  log(`registry dist.integrity equals downloaded file sha512: ${meta.dist.integrity === 'sha512-' + r.sha512}`);
  const files = untar(tgz, dir, n => {
    if (['package/package.json', 'package/deps_versions.json', 'package/LICENSE.txt'].includes(n)) { return n.slice('package/'.length); }
    if (n.startsWith('package/dist/') || n.startsWith('package/prebuilds/win32-x64/')) { return n.slice('package/'.length); }
    return null;
  });
  log(`npm extract: ${files.length} files; ${files.filter(f => !f.startsWith('dist/')).join(', ')}`);
  const AdmZip = require('adm-zip'); const core = path.join(dir, 'foundry-local-core', 'win32-x64'); fs.mkdirSync(core, { recursive: true });
  let total = r.bytes;
  for (const p of NUGET) {
    const f = path.join(dir, '.tmp', p.id + '.nupkg');
    const d = await download(`https://api.nuget.org/v3-flatcontainer/${p.id}/${p.version}/${p.id}.${p.version}.nupkg`, f); total += d.bytes;
    log(`NuGet ${p.id} ${p.version}: ${(d.bytes / 1e6).toFixed(1)} MB in ${(d.ms / 1000).toFixed(1)} s (last host ${d.host})`);
    const zip = new AdmZip(f); const got = [];
    for (const e of zip.getEntries()) {
      const n = e.entryName.toLowerCase();
      const ok = n.endsWith('.dll') && (n.startsWith('runtimes/win-x64/native/') || (n.startsWith('runtimes/win-x64/') && !n.slice('runtimes/win-x64/'.length).includes('/')));
      if (ok) { fs.writeFileSync(path.join(core, e.name), e.getData()); got.push(`${e.name} ${(e.header.size / 1e6).toFixed(1)} MB`); }
    }
    log(`  extracted: ${got.join('; ') || 'NOTHING'}`);
    if (p.id.includes('foundry.local.core')) { fs.writeFileSync(path.join(core, 'package.json'), JSON.stringify({ name: '@foundry-local-core/win32-x64', version: p.version, private: true })); }
  }
  log(`TOTAL downloaded: ${(total / 1e6).toFixed(1)} MB (decimal)`);
  fs.rmSync(path.join(dir, '.tmp'), { recursive: true, force: true }); fs.writeFileSync(path.join(dir, '.complete'), 'ok');
}

function spawnWorker(label, init) {
  const child = cp.fork(path.join(__dirname, 'worker.cjs'), [], {
    execPath: process.execPath, execArgv: [],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', ...(init.noTelemetryEnv ? { ORT_TELEMETRY_DISABLED: '1' } : {}) },
    serialization: 'advanced', stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  const w = { label, child, texts: [], sentMs: 0, t0: 0, events: [], exit: null };
  child.stdout.on('data', c => log(`[${label} stdout] ${String(c).trim().slice(0, 300)}`));
  child.stderr.on('data', c => log(`[${label} stderr] ${String(c).trim().slice(0, 400)}`));
  child.on('exit', (code, signal) => { w.exit = { code, signal, at: Date.now() }; log(`[${label}] parent saw exit event: code=${code} signal=${signal}`); });
  child.on('error', e => log(`[${label}] child error: ${e.message}`));
  w.msg = (pred, ms, what) => new Promise((resolve, reject) => {
    const to = setTimeout(() => { child.off('message', on); reject(new Error(`timeout waiting for ${what}`)); }, ms);
    const on = m => { if (m.t === 'error') { clearTimeout(to); child.off('message', on); reject(new Error('worker error: ' + m.message)); } else if (pred(m)) { clearTimeout(to); child.off('message', on); resolve(m); } };
    child.on('message', on);
  });
  child.on('message', m => { if (m.t === 'text') { w.events.push({ at: Date.now(), sentMs: w.sentMs, final: m.final, text: m.text }); } });
  return w;
}

async function feed(w, pcm, stopAfterMs) {
  w.t0 = Date.now(); const step = 4096 * 2;
  for (let off = 0; off < pcm.length; off += step) {
    const chunk = pcm.subarray(off, Math.min(off + step, pcm.length));
    const due = (off + chunk.length) / 32 - (Date.now() - w.t0); if (due > 0) { await wait(due); }
    if (stopAfterMs && Date.now() - w.t0 > stopAfterMs) { return false; }
    w.child.send({ t: 'audio', data: new Uint8Array(chunk) }); w.sentMs = (off + chunk.length) / 32;
  }
  return true;
}

function readWav(file) { const b = fs.readFileSync(file); return b.subarray(b.indexOf('data') + 8); }
function telemetryLines(logsDir) {
  const out = []; for (const f of fs.existsSync(logsDir) ? fs.readdirSync(logsDir) : []) { for (const l of fs.readFileSync(path.join(logsDir, f), 'utf8').split('\n')) { if (/telemetry|1DS/i.test(l)) { out.push(l.trim().slice(0, 140)); } } }
  return out;
}

async function run(context) {
  const root = context.globalStorageUri.fsPath; fs.mkdirSync(root, { recursive: true });
  reportPath = path.join(root, 'probe123asm.log'); fs.writeFileSync(reportPath, '');
  log(`VS Code ${vscode.version}; ext host Node ${process.version}; execPath=${path.basename(process.execPath)}; host pid=${process.pid}`);
  const sdkDir = path.join(root, 'sdk123'); const hostPid0 = process.pid;
  try { await assemble(sdkDir); } catch (e) { log('assembly FAILED: ' + (e.stack || e.message)); return; }
  const modelDir = path.join(path.resolve(root, '..', '..', '..'), 'chatDictationModels');
  log(`model read in place from ${modelDir} (exists=${fs.existsSync(modelDir)})`);
  const wavFile = [path.join(__dirname, '..', 'long.wav'), path.join(__dirname, '..', '..', 'samples', 'sample-de.wav')].find(f => fs.existsSync(f));
  const pcm = readWav(wavFile); log(`audio: ${path.basename(wavFile)}, ${(pcm.length / 32000).toFixed(1)} s, 16 kHz mono PCM16, blocks of 4096 samples`);

  // --- Test 3a: worker with telemetry switched off (env + additionalSettings key as documented for 2.1.0)
  const logsA = path.join(root, 'sdk-logs-A'); const hostRss0 = process.memoryUsage().rss; const h = monitorEventLoopDelay({ resolution: 10 }); h.enable();
  try {
    const A = spawnWorker('A', { noTelemetryEnv: true });
    await A.msg(m => m.t === 'booted', 30000, 'booted');
    const tInit = Date.now(); A.child.send({ t: 'init', sdkDir, modelDir, logsDir: logsA, additionalSettings: { DisableNonessentialTelemetry: 'true' } });
    const ready = await A.msg(m => m.t === 'ready', 120000, 'ready');
    log(`A ready after ${((Date.now() - tInit) / 1000).toFixed(1)} s (catalog getModel, model.load, session.start) in child pid=${ready.pid}, ${ready.node}, exec=${ready.execBase}, child rss ${ready.rssMB} MB`);
    await feed(A, pcm);
    const tFin = Date.now(); A.child.send({ t: 'finish' });
    await A.msg(m => m.t === 'finished', 60000, 'finished'); const tDone = Date.now();
    const interim = A.events.filter(e => !e.final); const fin = A.events.filter(e => e.final);
    const delays = interim.map(e => e.at - A.t0 - e.sentMs).sort((a, b) => a - b);
    log(`A text events: ${interim.length} interim + ${fin.length} final; delay behind audio ms: min=${delays[0]} median=${delays[Math.floor(delays.length / 2)]} max=${delays[delays.length - 1]}; stop/finish took ${tDone - tFin} ms`);
    log(`A final text: ${JSON.stringify((fin[0]?.text ?? interim.map(e => e.text).join('')).trim().slice(0, 200))}`);
    h.disable();
    log(`host event-loop delay during child run: max=${(h.max / 1e6).toFixed(1)} ms p99=${(h.percentile(99) / 1e6).toFixed(1)} ms; host rss ${(hostRss0 / 1e6).toFixed(0)} -> ${(process.memoryUsage().rss / 1e6).toFixed(0)} MB; child rss at end ${ready.rssMB}->(see finished)`);
    await wait(1500);
  } catch (e) { h.disable(); log('A FAILED: ' + e.message); }

  // --- Test 3b: telemetry default (no env, no setting) and kill test
  const logsB = path.join(root, 'sdk-logs-B');
  try {
    const B = spawnWorker('B', { noTelemetryEnv: false });
    await B.msg(m => m.t === 'booted', 30000, 'booted'); B.child.send({ t: 'init', sdkDir, modelDir, logsDir: logsB });
    await B.msg(m => m.t === 'ready', 120000, 'ready'); log('B ready; feeding audio, will kill the child after ~4 s');
    const fp = feed(B, pcm, 4000); await fp;
    const tKill = Date.now(); const killed = B.child.kill();
    for (let i = 0; i < 100 && !B.exit; i++) { await wait(50); }
    log(`B kill() returned ${killed}; exit seen by parent: ${B.exit ? `yes, ${B.exit.at - tKill} ms after kill, code=${B.exit.code} signal=${B.exit.signal}` : 'NO'}`);
    let ticks = 0; const iv = setInterval(() => ticks++, 100); await wait(1000); clearInterval(iv);
    log(`host after kill: same pid=${process.pid === hostPid0}, timer ticks in 1 s=${ticks}, extensions API ok=${vscode.extensions.all.length > 0}`);
  } catch (e) { log('B FAILED: ' + e.message); }

  // --- Test 4: telemetry effect in the SDK logs
  const ta = telemetryLines(logsA); const tb = telemetryLines(logsB);
  log(`telemetry lines in SDK log: A (env + additionalSettings DisableNonessentialTelemetry) = ${ta.length}; B (default) = ${tb.length}`);
  log('  A sample: ' + (ta.slice(0, 3).join(' || ') || '-')); log('  B sample: ' + (tb.slice(0, 3).join(' || ') || '-'));
  log('done');
}

function activate(context) { run(context).catch(e => { try { log('probe FAILED ' + (e.stack || e.message)); } catch { /* no report */ } }); }
module.exports = { activate };
