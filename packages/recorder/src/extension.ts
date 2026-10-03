// Implementation: SPEC_MOD_REC_PKG, SPEC_REC_SETTINGS, SPEC_REC_BUTTON, SPEC_REC_STATUSBAR — Recorder activation
// Requirements: REQ_MOD_ADDONS, REQ_REC_ENABLE, REQ_REC_BUTTON, REQ_REC_STATUSBAR

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { JarvisActor, JarvisCoreApi } from 'jarvis-core';
import { PowerShellCapture } from './capture';
import { ComponentManifest, ensureComponents, isComplete } from './components';
import { WorkerEngine } from './engine';
import { LiveView } from './liveView';
import { formatElapsed, RecordingSession, SessionPorts } from './session';
import { TranscriptFile } from './transcriptFile';

const LEGACY_JOB = 'Jarvis: Check Transcripts';
const MODEL_MARKER = path.join('Microsoft', 'nemotron-3.5-asr-streaming-0.6b-generic-cpu-3', 'v3', 'genai_config.json');

let session: RecordingSession | undefined;

/** VS Code's dictation cache: three directories above this extension's global storage (SPEC_REC_COMPONENTS). */
export function dictationModelDir(globalStoragePath: string): string {
    return path.resolve(globalStoragePath, '..', '..', '..', 'chatDictationModels');
}

export const MODEL_MISSING_MESSAGE =
    "The speech model was not found. Use VS Code's voice dictation once, or import the model with " +
    "'Chat: Install Dictation Model from Local Package...', then try again. " +
    'This works only with the local dictation model, not with the cloud model.';

export function activate(context: vscode.ExtensionContext): void {
    const log = vscode.window.createOutputChannel('Jarvis Recorder', { log: true });
    const api = vscode.extensions.getExtension<JarvisCoreApi>('enthali.jarvis-core')?.exports;
    if (!api || api.version !== 2) {
        log.warn('[Recorder] Core API not available or version mismatch — deactivating.');
        return;
    }

    // The earlier recorder left a persistent heartbeat job behind (SPEC_REC_SETTINGS).
    void Promise.resolve(api.unregisterJob(LEGACY_JOB)).catch(err => log.warn(`[Recorder] legacy job cleanup failed: ${err}`));

    const manifest = JSON.parse(fs.readFileSync(path.join(context.extensionPath, 'resources', 'components.json'), 'utf8')) as ComponentManifest;
    const storage = context.globalStorageUri.fsPath;
    const sdkDir = path.join(storage, 'foundry-local', manifest.sdkVersion);
    const modelDir = dictationModelDir(storage);
    const scriptPath = path.join(context.extensionPath, 'resources', 'capture.ps1');
    const workerPath = path.join(__dirname, 'engineWorker.js');

    const ports: SessionPorts = {
        isEnabled: () => vscode.workspace.getConfiguration('jarvis').get<boolean>('recording.enabled', false),
        platform: process.platform,
        ensureComponents: async () => {
            if (!fs.existsSync(path.join(modelDir, MODEL_MARKER))) { throw new Error(MODEL_MISSING_MESSAGE); }
            if (isComplete(manifest, sdkDir)) { return; }
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Jarvis Recorder: preparing speech recognition (one-time download, about 230 MB)' },
                async progress => {
                    let reported = 0;
                    fs.mkdirSync(sdkDir, { recursive: true });
                    await ensureComponents({
                        manifest,
                        targetDir: sdkDir,
                        onProgress: (done, total) => {
                            const mb = Math.floor(done / 1e6);
                            if (mb > reported) {
                                progress.report({ message: `${mb} of ${Math.round(total / 1e6)} MB`, increment: (mb - reported) * 100 / Math.max(1, total / 1e6) });
                                reported = mb;
                            }
                        },
                    });
                });
        },
        createEngine: () => new WorkerEngine({ workerPath, sdkDir, modelDir }),
        createCapture: () => new PowerShellCapture(scriptPath),
        withStartProgress: (title, work) => Promise.resolve(vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title }, work)),
        createTranscript: (folder, startedAt) => TranscriptFile.create(folder, startedAt),
        info: m => { void vscode.window.showInformationMessage(m); },
        warn: m => { void vscode.window.showWarningMessage(m); },
        error: m => { void vscode.window.showErrorMessage(m); },
        setRunning: running => { void vscode.commands.executeCommand('setContext', 'jarvis.recordingRunning', running); },
        markActor: actorId => {
            if (typeof api.markActor !== 'function') { return () => undefined; }
            const mark = api.markActor(actorId, new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red')));
            return () => mark.dispose();
        },
        send: (actorName, text) => api.sendMessage(actorName, 'Recorder', text),
        log: m => log.info(m),
        now: () => Date.now(),
    };

    const rec = new RecordingSession(ports);
    session = rec;
    const view = new LiveView(rec);

    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10);
    statusBar.command = 'jarvis.showRecording';
    statusBar.tooltip = 'Show the running recording';
    const refreshStatusBar = (): void => {
        if (!rec.isActive || !rec.actor) { statusBar.hide(); return; }
        const suffix = rec.state === 'finishing' ? ' · finishing' : '';
        statusBar.text = `🔴 ${rec.actor.name} — ${formatElapsed(rec.elapsedMs())}${suffix}`;
        statusBar.show();
    };
    const changeSub = rec.onDidChange(refreshStatusBar);

    const startCommand = vscode.commands.registerCommand('jarvis.startRecording', async (node?: { kind: 'actor'; id: string }) => {
        const actors = api.listActors();
        const actor = node ? actors.find(a => a.id === node.id) : await pickActor(actors);
        if (!actor) { return; }
        await rec.start({ id: actor.id, name: actor.name, folder: actor.folder });
    });
    const showCommand = vscode.commands.registerCommand('jarvis.showRecording', () => view.show());

    context.subscriptions.push(
        log, statusBar, startCommand, showCommand, view,
        { dispose: () => { changeSub.dispose(); rec.dispose(); } },
    );
}

async function pickActor(actors: JarvisActor[]): Promise<JarvisActor | undefined> {
    const items = [...actors]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(a => ({ label: a.name, description: a.summary, actor: a }));
    const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Select the Actor to record for' });
    return picked?.actor;
}

/** Ends a running recording within the shutdown budget (SPEC_REC_SESSION). */
export async function deactivate(): Promise<void> {
    await session?.shutdown();
}
