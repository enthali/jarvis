// Probe: SDK 2.1.0 components assembled the way SPEC_REC_COMPONENTS describes, then the OFFICIAL model path
// (catalog -> download -> load) behind the company proxy, inside the real Extension Host.
// Mode comes from mode.txt next to this file: "inherited" (env as VS Code set it) or "bridged" (env set from http.proxy).
const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const NPM_URL = 'https://registry.npmjs.org/foundry-local-sdk/-/foundry-local-sdk-2.1.0.tgz';
const NUGET = [
  { id: 'microsoft.ml.onnxruntime', version: '1.30.0', dll: 'onnxruntime.dll' },
  { id: 'microsoft.ml.onnxruntimegenai.foundry', version: '0.17.1', dll: 'onnxruntime-genai.dll' },
];
const MODEL_ALIAS = 'nemotron-3.5-asr-streaming-0.6b';
let reportPath;
const t00 = Date.now();
const log = m => fs.appendFileSync(reportPath, `[+${((Date.now() - t00) / 1000).toFixed(1).padStart(6)}s] ${m}\n`);
const hostPort = v => { try { const u = new URL(v); return `${u.protocol}//${u.host}`; } catch { return v ? 'unparsable' : 'unset'; } };
const allowedHost = h => h === 'registry.npmjs.org' || h.endsWith('.nuget.org');

function download(url, dest, redirects = 5) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const host = new URL(url).hostname;
    log(`GET ${host}${new URL(url).pathname.slice(0, 60)} (host allowed by spec list: ${allowedHost(host)})`);
    https.get(url, { timeout: 60000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume(); resolve(download(new URL(res.headers.location, url).toString(), dest, redirects - 1)); return;
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error(`HTTP ${res.statusCode} from ${host}`)); return; }
      const total = Number(res.headers['content-length'] || 0);
      const hash = crypto.createHash('sha512'); const out = fs.createWriteStream(dest);
      let bytes = 0, nextLog = 0.25;
      res.on('data', c => { bytes += c.length; hash.update(c); if (total && bytes / total >= nextLog) { log(`  ${(bytes / 1e6).toFixed(1)} / ${(total / 1e6).toFixed(1)} MB`); nextLog += 0.25; } });
      res.pipe(out);
      out.on('finish', () => resolve({ bytes, ms: Date.now() - t0, sha512: hash.digest('base64'), host }));
      res.on('error', reject); out.on('error', reject);
    }).on('error', reject).on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}

function untar(tgzPath, destDir, want) {
  const buf = zlib.gunzipSync(fs.readFileSync(tgzPath));
  let off = 0, longName = null; const written = [];
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512);
    if (h.every(b => b === 0)) { break; }
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

async function assemble(context, dir) {
  if (fs.existsSync(path.join(dir, '.complete'))) { log('components: .complete present, nothing downloaded'); return; }
  fs.mkdirSync(path.join(dir, '.tmp'), { recursive: true });
  const tgz = path.join(dir, '.tmp', 'sdk.tgz');
  const r = await download(NPM_URL, tgz);
  log(`npm tarball: ${(r.bytes / 1e6).toFixed(1)} MB in ${(r.ms / 1000).toFixed(1)} s from ${r.host}; sha512(base64)=${r.sha512.slice(0, 24)}...`);
  const meta = await new Promise((res, rej) => https.get('https://registry.npmjs.org/foundry-local-sdk/2.1.0', r2 => { let s = ''; r2.on('data', c => s += c); r2.on('end', () => res(JSON.parse(s))); }).on('error', rej));
  log(`npm registry dist.integrity matches downloaded file: ${meta.dist.integrity === 'sha512-' + r.sha512}`);
  const files = untar(tgz, dir, n => {
    if (n === 'package/package.json') { return 'package.json'; }
    if (n.startsWith('package/dist/')) { return n.slice('package/'.length); }
    if (n.startsWith('package/prebuilds/win32-x64/')) { return n.slice('package/'.length); }
    return null;
  });
  log(`extracted ${files.length} files from npm tarball (${files.filter(f => f.startsWith('prebuilds')).join(', ')})`);
  const AdmZip = require('adm-zip');
  for (const p of NUGET) {
    const url = `https://api.nuget.org/v3-flatcontainer/${p.id}/${p.version}/${p.id}.${p.version}.nupkg`;
    const f = path.join(dir, '.tmp', p.id + '.nupkg');
    const d = await download(url, f);
    log(`${p.id} ${p.version}: ${(d.bytes / 1e6).toFixed(1)} MB in ${(d.ms / 1000).toFixed(1)} s (last host ${d.host})`);
    const entry = new AdmZip(f).getEntry(`runtimes/win-x64/native/${p.dll}`);
    if (!entry) { throw new Error('entry not found in ' + p.id); }
    fs.writeFileSync(path.join(dir, 'prebuilds', 'win32-x64', p.dll), entry.getData());
    log(`  extracted ${p.dll} (${(entry.header.size / 1e6).toFixed(1)} MB)`);
  }
  fs.rmSync(path.join(dir, '.tmp'), { recursive: true, force: true });
  fs.writeFileSync(path.join(dir, '.complete'), 'ok');
}

function dirSize(d) { let s = 0; for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) { const p = path.join(d, e.name); s += e.isDirectory() ? dirSize(p) : fs.statSync(p).size; } return s; }

async function run(context) {
  fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
  const mode = (fs.existsSync(path.join(__dirname, 'mode.txt')) ? fs.readFileSync(path.join(__dirname, 'mode.txt'), 'utf8').trim() : 'inherited');
  reportPath = path.join(context.globalStorageUri.fsPath, `probe210-${mode}.log`); fs.writeFileSync(reportPath, '');
  const proxySetting = vscode.workspace.getConfiguration('http').get('proxy', '');
  log(`mode=${mode}; VS Code ${vscode.version}; Node ${process.version}; ${process.platform}/${process.arch}`);
  log(`env before: HTTPS_PROXY=${hostPort(process.env.HTTPS_PROXY)} HTTP_PROXY=${hostPort(process.env.HTTP_PROXY)} NO_PROXY set=${Boolean(process.env.NO_PROXY)}; http.proxy=${hostPort(proxySetting)}; http.proxySupport=${vscode.workspace.getConfiguration('http').get('proxySupport')}`);
  if (mode === 'bridged' && proxySetting) { process.env.HTTPS_PROXY = proxySetting; process.env.HTTP_PROXY = proxySetting; log(`env bridged from http.proxy: HTTPS_PROXY=${hostPort(process.env.HTTPS_PROXY)}`); }

  const dir = path.join(context.globalStorageUri.fsPath, 'foundry-local', '2.1.0');
  try { await assemble(context, dir); } catch (e) { log('components FAILED: ' + (e.stack || e.message)); return; }

  let manager, model;
  const cacheDir = path.join(context.globalStorageUri.fsPath, 'foundry-local', `cache-${mode}`);
  const logsDir = path.join(context.globalStorageUri.fsPath, `sdk210-logs-${mode}`);
  try {
    const { FoundryLocalManager } = await import(pathToFileURL(path.join(dir, 'dist', 'index.js')).href);
    log('SDK 2.1.0 imported from extension storage');
    manager = FoundryLocalManager.create({ appName: 'jarvis-recorder-probe', modelCacheDir: cacheDir, logsDir, logLevel: 'debug', disableNonessentialTelemetry: true });
    log('manager created (native addon + ORT loaded from storage dir), telemetry off');
    const t1 = Date.now();
    let models = [];
    try { models = await manager.catalog.getModels(); } catch (e) { log('catalog.getModels FAILED: ' + e.message.slice(0, 1200)); }
    log(`catalog.getModels: ${models.length} models in ${Date.now() - t1} ms; nemotron entries: ${models.filter(m => /nemotron/i.test(m.id + m.alias)).map(m => m.id).join(', ') || 'none'}`);
    if (models.length && !models.some(m => m.alias === MODEL_ALIAS)) { log('alias list: ' + [...new Set(models.map(m => m.alias))].slice(0, 80).join(', ')); }
    model = await manager.catalog.getModel(MODEL_ALIAS);
    log(`catalog.getModel OK: id=${model.id} alias=${model.alias} isCached=${model.isCached} variants=${model.variants?.length}`);
    const ac = new AbortController(); const guard = setTimeout(() => ac.abort(), 25 * 60 * 1000);
    let lastLogged = -1; const t2 = Date.now();
    log('model.download starting...');
    await model.download(p => { const b = Math.floor(p / 5) * 5; if (b !== lastLogged) { lastLogged = b; log(`  download ${p.toFixed(1)}% (${(dirSize(cacheDir) / 1e6).toFixed(0)} MB on disk)`); } }, ac.signal);
    clearTimeout(guard);
    log(`model.download finished in ${((Date.now() - t2) / 1000).toFixed(1)} s; cache dir ${(dirSize(cacheDir) / 1e6).toFixed(0)} MB; isCached=${model.isCached}`);
    await model.load();
    log(`model.load OK; isLoaded=${await model.isLoaded()}`);
    try {
      const wav = path.resolve(__dirname, '..', '..', 'samples', 'sample-de.wav');
      const r = await model.createAudioClient().transcribe(wav);
      log(`transcribe(sample-de.wav) on downloaded model: ${JSON.stringify((r.text ?? '').trim())}`);
    } catch (e) { log('transcribe check FAILED: ' + e.message.slice(0, 600)); }
    await model.unload();
  } catch (e) {
    log('FAILED: ' + (e.stack || e.message).slice(0, 2500));
  } finally {
    try { manager?.dispose(); } catch { /* best effort */ }
    log('done');
  }
}

function activate(context) { run(context).catch(e => { try { log('probe FAILED ' + e.message); } catch { /* no report */ } }); }
module.exports = { activate };
