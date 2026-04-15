// Implementation: SPEC_REC_SUBPROCESS
// Requirements: REQ_REC_SUBPROCESS, REQ_REC_CONFIG

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';

interface RecordingState {
    project: string;
    pid: number;
    startTime: number;
}

export class RecordingManager {

    private _onDidChange = new vscode.EventEmitter<void>();
    readonly onDidChange = this._onDidChange.event;

    private _currentProject: string | undefined;
    private _startTime: number | undefined;
    private _child: cp.ChildProcess | undefined;
    private _recordingName: string | undefined;
    private _log: vscode.LogOutputChannel | undefined;

    setLog(log: vscode.LogOutputChannel): void {
        this._log = log;
    }

    private _info(msg: string): void {
        this._log?.info(`[recording] ${msg}`);
    }

    private _debug(msg: string): void {
        this._log?.debug(`[recording] ${msg}`);
    }

    get currentProject(): string | undefined {
        return this._currentProject;
    }

    get startTime(): number | undefined {
        return this._startTime;
    }

    get recordingName(): string | undefined {
        return this._recordingName;
    }

    async start(name: string, _context: vscode.ExtensionContext): Promise<void> {
        const cfg = vscode.workspace.getConfiguration('jarvis');
        const enabled = cfg.get<boolean>('recording.enabled', false);
        const whisperPath = cfg.get<string>('recording.whisperPath', '');

        if (!enabled) {
            vscode.window.showWarningMessage(
                'Jarvis Recording: Feature is disabled. Enable jarvis.recording.enabled first.');
            return;
        }

        if (!whisperPath) {
            vscode.window.showErrorMessage(
                'Jarvis Recording: jarvis.recording.whisperPath is not configured.');
            return;
        }

        if (!fs.existsSync(whisperPath)) {
            vscode.window.showErrorMessage(
                `Jarvis Recording: whisperPath does not exist: ${whisperPath}`);
            return;
        }

        if (this._currentProject) {
            vscode.window.showWarningMessage(
                `Jarvis Recording: Already recording "${this._currentProject}".`);
            return;
        }

        // Check Python available (SPEC_REC_SUBPROCESS)
        const pythonAvailable = await new Promise<boolean>(resolve => {
            const probe = cp.spawn('python', ['--version']);
            probe.on('close', code => resolve(code === 0));
            probe.on('error', () => resolve(false));
        });

        if (!pythonAvailable) {
            vscode.window.showErrorMessage(
                'Jarvis Recording: Python is not available. Please install Python and add it to PATH.');
            return;
        }

        const recorderScript = path.join(whisperPath, 'recorder.py');
        const outputDir = path.join(whisperPath, 'input');

        // Build filename: YYYY-MM-DD_HHmm_<sanitized-name>  e.g. 2026-04-15_1430_alpha
        const now = new Date();
        const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const recordingName = `${ts}_${safeName}`;
        this._recordingName = recordingName;

        this._info(`spawning: python "${recorderScript}" --name "${recordingName}" --no-timestamp --output-dir "${outputDir}"`);

        const child = cp.spawn('python', [recorderScript, '--name', recordingName, '--no-timestamp', '--output-dir', outputDir], {
            detached: false,
            stdio: 'pipe'
        });

        child.stdout?.on('data', (data: Buffer) => {
            this._debug(`stdout: ${data.toString().trim()}`);
        });
        child.stderr?.on('data', (data: Buffer) => {
            this._debug(`stderr: ${data.toString().trim()}`);
        });
        child.on('close', (code: number | null) => {
            this._info(`recorder.py exited with code ${code}`);
        });
        child.on('error', (err: Error) => {
            this._info(`spawn error: ${err.message}`);
            vscode.window.showErrorMessage(`Jarvis Recording: Failed to start recorder — ${err.message}`);
        });

        this._child = child;
        this._currentProject = name;
        this._startTime = Date.now();

        const state: RecordingState = {
            project: name,
            pid: child.pid ?? 0,
            startTime: this._startTime
        };

        try {
            fs.writeFileSync(
                path.join(whisperPath, '.recording.json'),
                JSON.stringify(state),
                'utf-8'
            );
        } catch {
            // non-fatal: subprocess is running, state file is best-effort
        }

        // Sidecar: input/<recordingName>.json — lookup for watcher dispatch (SPEC_REC_SIDECAR)
        try {
            fs.writeFileSync(
                path.join(whisperPath, 'input', `${recordingName}.json`),
                JSON.stringify({ project: name }),
                'utf-8'
            );
            this._info(`sidecar written: input/${recordingName}.json`);
        } catch {
            // non-fatal
        }

        vscode.commands.executeCommand('setContext', 'jarvis.recordingActive', true);
        this._onDidChange.fire();
    }

    async stop(): Promise<void> {
        const cfg = vscode.workspace.getConfiguration('jarvis');
        const whisperPath = cfg.get<string>('recording.whisperPath', '');

        if (whisperPath) {
            try {
                fs.writeFileSync(path.join(whisperPath, '.stop'), '', 'utf-8');
            } catch {
                // ignore write errors
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            try {
                fs.unlinkSync(path.join(whisperPath, '.recording.json'));
            } catch {
                // ignore if file doesn't exist
            }
        }

        this._currentProject = undefined;
        this._startTime = undefined;
        this._child = undefined;
        this._recordingName = undefined;

        vscode.commands.executeCommand('setContext', 'jarvis.recordingActive', false);
        this._onDidChange.fire();
    }

    async deactivate(): Promise<void> {
        if (this._currentProject) {
            await this.stop();
        }
    }
}
