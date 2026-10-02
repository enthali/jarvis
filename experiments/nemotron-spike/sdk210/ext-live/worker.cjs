// Child-process engine worker for SDK 2.1.0. mode 'session' = AudioSession + ItemQueue (the target API),
// mode 'client' = deprecated createAudioClient().createLiveTranscriptionSession().
// The model is registered through the LOCAL catalog from VS Code's cache folder and loaded in place (no network).
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const MODEL_ID = 'nemotron-3.5-asr-streaming-0.6b-generic-cpu:3';
let sdk, manager, model, session, queue, stream, consumer, mode;
const send = m => process.send(m);

async function init(m) {
  mode = m.mode;
  sdk = await import(pathToFileURL(path.join(m.sdkDir, 'dist', 'index.js')).href);
  manager = sdk.FoundryLocalManager.create({ appName: 'jarvis-recorder-probe', modelCacheDir: m.cacheDir, logsDir: m.logsDir, logLevel: 'info', disableNonessentialTelemetry: true });
  const local = manager.getCatalog(sdk.CatalogType.Local);
  try { model = await local.getModelVariant(MODEL_ID); }
  catch {
    const meta = new sdk.MutableModelInfo();
    meta.setStringProperty(sdk.ModelInfoStringProperty.DisplayName, 'Nemotron 3.5 ASR (local)');
    meta.setStringProperty(sdk.ModelInfoStringProperty.ModelType, 'nemotron_speech');
    meta.setStringProperty(sdk.ModelInfoStringProperty.Task, 'automatic-speech-recognition');
    try { model = await local.registerModel(m.modelPath, MODEL_ID, meta); } finally { meta.dispose(); }
  }
  await model.load();
  if (mode === 'session') {
    session = new sdk.AudioSession(model);
    queue = new sdk.ItemQueue();
    const req = new sdk.Request();
    req.addItem(sdk.Item.audioDescriptor('pcm', 16000, 1)); req.addItem(queue);
    req.setOptions({ additionalOptions: { language: 'auto' } });
    stream = session.processStreamingRequest(req);
    consumer = (async () => {
      for await (const item of stream) {
        if (item.type === 'speechSegment') { send({ t: 'text', kind: item.kind, text: item.text, startMs: item.startTimeMs, endMs: item.endTimeMs, utteranceStart: item.utteranceStart, language: item.language }); }
        else { send({ t: 'other', type: item.type }); }
      }
    })();
  } else {
    session = model.createAudioClient().createLiveTranscriptionSession();
    session.settings.sampleRate = 16000; session.settings.channels = 1; session.settings.bitsPerSample = 16; session.settings.language = 'auto';
    await session.start();
    consumer = (async () => { for await (const r of session.getStream()) { send({ t: 'text', kind: r.is_final ? 'final' : 'partial', text: r.content?.[0]?.text ?? '', startMs: r.start_time, endMs: r.end_time }); } })();
  }
  send({ t: 'ready', pid: process.pid, node: process.version, rssMB: Math.round(process.memoryUsage().rss / 1e6) });
}

async function finish() {
  let result = {};
  if (mode === 'session') {
    queue.markFinished(); await consumer;
    const resp = await stream.response;
    const r = resp.output.find(it => it.type === 'speechResult');
    result = { text: r?.text, segments: r?.segments?.length, durationMs: r?.durationMs, finishReason: resp.finishReason };
    queue.dispose(); session.dispose();
  } else {
    await session.stop(); await consumer; await session.dispose();
  }
  send({ t: 'finished', ...result, rssMB: Math.round(process.memoryUsage().rss / 1e6) });
  await model.unload(); manager.dispose();
  process.exit(0);
}

process.on('message', async m => {
  try {
    if (m.t === 'init') { await init(m); }
    else if (m.t === 'audio') { const copy = new Uint8Array(m.data.length); copy.set(m.data); if (mode === 'session') { queue.push(sdk.Item.bytes(copy)); } else { await session.append(copy); } }
    else if (m.t === 'finish') { await finish(); }
  } catch (e) { send({ t: 'error', message: String(e && e.message || e).split('\n')[0].slice(0, 700) }); }
});
send({ t: 'booted', pid: process.pid });
