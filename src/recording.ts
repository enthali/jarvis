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

    get currentProject(): string | undefined {
        return this._currentProject;
    }

    get startTime(): number | undefined {
        return this._startTime;
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

        const child = cp.spawn('python', [recorderScript, '--project', name, '--output', outputDir], {
            detached: false,
            stdio: 'ignore'
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

        vscode.commands.executeCommand('setContext', 'jarvis.recordingActive', false);
        this._onDidChange.fire();
    }

    async deactivate(): Promise<void> {
        if (this._currentProject) {
            await this.stop();
        }
    }
}
