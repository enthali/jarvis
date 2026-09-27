// Implementation: SPEC_MOD_REC_PKG — Recorder extension activation
// Requirements: REQ_MOD_ADDONS

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { JarvisCoreApi, HeartbeatJob } from 'jarvis-core';
import { RecordingManager } from './recording';

const subscriptions: vscode.Disposable[] = [];

export function activate(context: vscode.ExtensionContext): void {
    const api = vscode.extensions.getExtension<JarvisCoreApi>('enthali.jarvis-core')?.exports;
    if (!api || api.version !== 2) {
        const log = vscode.window.createOutputChannel('Jarvis Recorder', { log: true });
        log.warn('[Recorder] Core API not available or version mismatch — deactivating.');
        return;
    }

    const log = vscode.window.createOutputChannel('Jarvis Recorder', { log: true });

    // --- Recording Manager ---
    const recordingManager = new RecordingManager();
    recordingManager.setLog(log as unknown as vscode.LogOutputChannel);

    // --- Status bar (SPEC_REC_STATUSBAR) ---
    const recordingStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10);
    recordingStatusBar.command = 'jarvis.stopRecording';
    recordingStatusBar.hide();
    subscriptions.push(recordingStatusBar);

    let recordingTimer: ReturnType<typeof setInterval> | undefined;

    function updateRecordingStatusBar(): void {
        const name = recordingManager.currentProject;
        const t0 = recordingManager.startTime;
        if (!name || t0 === undefined) {
            recordingStatusBar.hide();
            return;
        }
        const elapsed = Math.floor((Date.now() - t0) / 1000);
        const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const ss = String(elapsed % 60).padStart(2, '0');
        recordingStatusBar.text = `🔴 ${name} — ${mm}:${ss}`;
        recordingStatusBar.show();
    }

    recordingManager.onDidChange(() => {
        if (recordingManager.currentProject) {
            updateRecordingStatusBar();
            recordingTimer = setInterval(updateRecordingStatusBar, 1000);
        } else {
            if (recordingTimer) {
                clearInterval(recordingTimer);
                recordingTimer = undefined;
            }
            recordingStatusBar.hide();
        }
    });

    // --- Commands ---
    const startRecordingCommand = vscode.commands.registerCommand(
        'jarvis.startRecording',
        async (element?: { id?: string }) => {
            let name: string;
            if (element?.id) {
                const actor = api.listActors().find(a => a.id === element.id);
                name = actor?.name ?? path.basename(path.dirname(element.id));
            } else {
                const input = await vscode.window.showInputBox({ prompt: 'Recording name' });
                if (!input) { return; }
                name = input;
            }
            await recordingManager.start(name, context);
        }
    );

    const stopRecordingCommand = vscode.commands.registerCommand(
        'jarvis.stopRecording',
        async () => {
            await recordingManager.stop();
        }
    );

    // --- Transcript watcher command (SPEC_REC_WATCHER) ---
    const checkTranscriptsCommand = vscode.commands.registerCommand(
        'jarvis.checkTranscripts',
        async () => {
            const cfg = vscode.workspace.getConfiguration('jarvis');
            const enabled = cfg.get<boolean>('recording.enabled', false);
            const whisperPath = cfg.get<string>('recording.whisperPath', '');
            if (!enabled || !whisperPath) { return; }

            const outputDir = path.join(whisperPath, 'output');
            const inputDir = path.join(whisperPath, 'input');
            if (!fs.existsSync(outputDir)) { return; }

            const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.txt'));
            for (const file of files) {
                const stem = file.slice(0, -4);
                const sidecarPath = path.join(inputDir, `${stem}.json`);
                if (!fs.existsSync(sidecarPath)) { continue; }

                let project: string;
                try {
                    const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8')) as { project: string };
                    project = sidecar.project;
                } catch {
                    log.warn(`[Recording] could not parse sidecar: ${sidecarPath}`);
                    continue;
                }

                const txtPath = path.join(outputDir, file);
                const transcript = `Ein neues Meeting Transcript liegt für dich bereit: ${txtPath}`;

                // Dispatch via messaging — use VS Code command since the messaging
                // API lives in core (sendToSession is a core command/tool)
                try {
                    await vscode.commands.executeCommand('jarvis.internalAppendMessage', project, 'Whisper Watcher', transcript);
                } catch {
                    log.warn(`[Recording] could not dispatch transcript for "${stem}" — messaging API unavailable`);
                }
                log.info(`[Recording] dispatched transcript "${stem}" to session "${project}"`);

                try { fs.unlinkSync(sidecarPath); } catch { /* ignore */ }
            }
        }
    );

    subscriptions.push(startRecordingCommand, stopRecordingCommand, checkTranscriptsCommand);

    // --- Transcript watcher heartbeat job (SPEC_REC_WATCHERJOB) ---
    function syncTranscriptWatcherJob(): void {
        const cfg = vscode.workspace.getConfiguration('jarvis');
        const enabled = cfg.get<boolean>('recording.enabled', false);
        const whisperPath = cfg.get<string>('recording.whisperPath', '');
        const jobName = 'Jarvis: Check Transcripts';
        if (enabled && whisperPath) {
            const interval = cfg.get<number>('scanInterval', 2);
            const schedule = interval > 0 ? `*/${interval} * * * *` : '*/2 * * * *';
            const job: HeartbeatJob = {
                name: jobName,
                schedule,
                steps: [{ type: 'command', run: 'jarvis.checkTranscripts' }]
            };
            api!.registerJob(job);
            log.info(`[Recording] registered transcript watcher job: ${schedule}`);
        } else {
            api!.unregisterJob(jobName);
            log.info('[Recording] unregistered transcript watcher job');
        }
    }

    // Sync on activation
    syncTranscriptWatcherJob();

    // Re-sync on configuration change
    subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('jarvis.recording.enabled') ||
                e.affectsConfiguration('jarvis.recording.whisperPath')) {
                syncTranscriptWatcherJob();
            }
        })
    );

    // Push all to context for auto-disposal on extension unload
    context.subscriptions.push(...subscriptions);
    context.subscriptions.push({
        dispose: () => {
            if (recordingTimer) { clearInterval(recordingTimer); }
        }
    });
}

export async function deactivate(): Promise<void> {
    // Dispose runtime registrations (decorators, commands) via context.subscriptions.
    // Do NOT unregister the heartbeat job — it is persistent.
    for (const d of subscriptions) {
        d.dispose();
    }
    subscriptions.length = 0;
}
