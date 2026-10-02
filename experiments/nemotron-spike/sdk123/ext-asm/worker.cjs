// Child-process engine worker (SDK 1.2.3). Started by the extension host with child_process.fork, ELECTRON_RUN_AS_NODE=1.
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let manager, model, session, consumer;
const send = m => process.send(m);

async function init(m) {
  const { FoundryLocalManager } = await import(pathToFileURL(path.join(m.sdkDir, 'dist', 'index.js')).href);
  const cfg = { appName: 'jarvis-recorder-probe', modelCacheDir: m.modelDir, logsDir: m.logsDir, logLevel: 'debug' };
  if (m.additionalSettings) { cfg.additionalSettings = m.additionalSettings; }
  manager = await FoundryLocalManager.createAsync(cfg);
  model = await manager.catalog.getModel('nemotron-3.5-asr-streaming-0.6b');
  if (!model.isCached) { const v = model.variants.find(x => x.isCached); if (v) { model.selectVariant(v); } }
  await model.load();
  session = model.createAudioClient().createLiveTranscriptionSession();
  session.settings.sampleRate = 16000; session.settings.channels = 1; session.settings.bitsPerSample = 16; session.settings.language = 'auto';
  await session.start();
  consumer = (async () => { for await (const r of session.getStream()) { send({ t: 'text', final: r.is_final, text: r.content?.[0]?.text ?? '' }); } })();
  send({ t: 'ready', pid: process.pid, node: process.version, execBase: path.basename(process.execPath), rssMB: Math.round(process.memoryUsage().rss / 1e6) });
}

async function finish() {
  await session.stop(); await consumer;
  send({ t: 'finished', rssMB: Math.round(process.memoryUsage().rss / 1e6) });
  await session.dispose(); await model.unload();
  process.exit(0);
}

process.on('message', async m => {
  try {
    if (m.t === 'init') { await init(m); }
    else if (m.t === 'audio') { await session.append(m.data); }
    else if (m.t === 'finish') { await finish(); }
  } catch (e) { send({ t: 'error', message: String(e && e.message || e).split('\n')[0].slice(0, 600) }); }
});
send({ t: 'booted', pid: process.pid });
