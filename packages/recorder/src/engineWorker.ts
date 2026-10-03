// Implementation: SPEC_REC_ENGINE — recognition worker (runs in a child process, never in the extension host)
// Requirements: REQ_REC_SPEECH, REQ_REC_FAILURE
//
// The SDK is not bundled: it is loaded from the directory SPEC_REC_COMPONENTS prepared.
// Only this file knows which SDK API is used (AudioSession with an ItemQueue, D-46).

import * as path from 'path';
import { pathToFileURL } from 'url';

export const MODEL_ID = 'nemotron-3.5-asr-streaming-0.6b-generic-cpu:3';
export const MODEL_RELATIVE_DIR = path.join('Microsoft', 'nemotron-3.5-asr-streaming-0.6b-generic-cpu-3', 'v3');

interface InitMessage { t: 'init'; sdkDir: string; modelDir: string; language: string }
interface AudioMessage { t: 'audio'; data: Uint8Array }
interface FinishMessage { t: 'finish' }
type ParentMessage = InitMessage | AudioMessage | FinishMessage;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Sdk = any;

// tsc (module: commonjs) rewrites import() to require(), which cannot load the ESM-only SDK (SPEC_REC_ENGINE AC-10).
const nativeImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<Sdk>;

function send(message: { t: string; [key: string]: unknown }): Promise<void> {
    return new Promise(resolve => {
        if (!process.send) { resolve(); return; }
        process.send(message, undefined, undefined, () => resolve());
    });
}

let queue: any;
let session: any;
let manager: any;
let stream: any;
let streamDone: Promise<void> | undefined;
let Item: any;

async function init(msg: InitMessage): Promise<void> {
    const sdk: Sdk = await nativeImport(pathToFileURL(path.join(msg.sdkDir, 'dist', 'index.js')).href);
    Item = sdk.Item;
    const cacheDir = path.join(path.dirname(msg.sdkDir), 'cache');
    manager = sdk.FoundryLocalManager.create({
        appName: 'jarvis-recorder',
        modelCacheDir: cacheDir,
        disableNonessentialTelemetry: true,
    });
    const catalog = manager.getCatalog(sdk.CatalogType.Local);

    let model: any;
    try {
        model = await catalog.getModelVariant(MODEL_ID);
    } catch {
        const info = new sdk.MutableModelInfo()
            .setStringProperty('task', 'automatic-speech-recognition')
            .setStringProperty('display_name', 'nemotron-3.5-asr-streaming-0.6b-generic-cpu')
            .setStringProperty('type', 'nemotron_speech');
        try {
            model = await catalog.registerModel(path.join(msg.modelDir, MODEL_RELATIVE_DIR), MODEL_ID, info);
        } catch {
            model = await catalog.getModelVariant(MODEL_ID);
        }
    }
    await model.load();

    session = new sdk.AudioSession(model);
    queue = new sdk.ItemQueue();
    const request = new sdk.Request();
    request.addItem(Item.audioDescriptor('pcm', 16000, 1));
    request.addItem(queue);
    request.setOptions({ additionalOptions: { language: msg.language } });
    stream = session.processStreamingRequest(request);
    streamDone = (async () => {
        for await (const item of stream) {
            if (item.type === 'speechSegment' && item.text) {
                await send({ t: 'text', delta: item.text });
            }
        }
    })();
    await send({ t: 'ready' });
}

async function finish(): Promise<void> {
    queue?.markFinished();
    await streamDone;
    let text = '';
    try {
        const response = await stream?.response;
        const result = (response?.output ?? []).find((i: any) => i.type === 'speechResult');
        text = result?.text ?? '';
    } catch { /* the deltas already went out; final only ends finish() */ }
    await send({ t: 'final', text });
    try { queue?.dispose(); } catch { /* best effort */ }
    try { session?.dispose(); } catch { /* best effort */ }
    try { manager?.dispose(); } catch { /* best effort */ }
    process.exit(0);
}

async function fail(err: unknown): Promise<void> {
    await send({ t: 'error', message: err instanceof Error ? err.message : String(err) });
    process.exit(1);
}

process.on('message', (msg: ParentMessage) => {
    try {
        if (msg.t === 'init') {
            init(msg).catch(fail);
        } else if (msg.t === 'audio') {
            queue?.push(Item.bytes(Uint8Array.from(msg.data)));
        } else if (msg.t === 'finish') {
            finish().catch(fail);
        }
    } catch (err) {
        void fail(err);
    }
});
process.on('uncaughtException', err => { void fail(err); });
process.on('unhandledRejection', err => { void fail(err); });
// The parent closing the IPC channel means nobody listens any more.
process.on('disconnect', () => process.exit(0));
