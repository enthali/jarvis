// Implementation: SPEC_REC_LIVEVIEW — transcript view while a recording runs
// Requirements: REQ_REC_LIVEVIEW, REQ_REC_BUTTON, REQ_REC_STATUSBAR

import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { formatElapsed, RecordingSession, RecordingState } from './session';

/** Secondary column in the sense of REQ_MSG_EDITORPLACEMENT AC-3: the last existing column, at least the second. */
export function secondaryColumn(groupCount: number): number {
    return Math.max(2, groupCount);
}

export function buildHtml(nonce: string, cspSource: string): string {
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<style nonce="${nonce}">
body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 8px; display: flex; flex-direction: column; height: 100vh; box-sizing: border-box; margin: 0; }
#bar { display: flex; align-items: center; gap: 16px; padding-bottom: 8px; }
button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 6px 14px; cursor: pointer; }
button:disabled { opacity: 0.5; cursor: default; }
#text { flex: 1; overflow-y: auto; white-space: pre-wrap; border: 1px solid var(--vscode-panel-border); padding: 8px; font-family: var(--vscode-editor-font-family); }
</style></head><body data-csp="${cspSource}">
<div id="bar"><button id="end" disabled>End recording</button><span id="actor"></span><span id="elapsed">00:00</span><span id="words">0 words</span></div>
<div id="text"></div>
<script nonce="${nonce}">
const vscodeApi = acquireVsCodeApi();
const text = document.getElementById('text');
const btn = document.getElementById('end');
function setWords(n) { document.getElementById('words').textContent = n + (n === 1 ? ' word' : ' words'); }
function setState(s) {
  if (s === 'running') { btn.disabled = false; btn.textContent = 'End recording'; }
  else if (s === 'finishing') { btn.disabled = true; btn.textContent = 'Finishing\\u2026'; }
  else { btn.disabled = true; btn.textContent = 'Recording ended'; }
}
function add(s) { text.appendChild(document.createTextNode(s)); text.scrollTop = text.scrollHeight; }
btn.addEventListener('click', () => vscodeApi.postMessage({ type: 'end' }));
window.addEventListener('message', e => {
  const m = e.data;
  if (m.type === 'init') {
    document.getElementById('actor').textContent = m.actor;
    document.getElementById('elapsed').textContent = m.elapsed;
    text.textContent = ''; add(m.text); setWords(m.words); setState(m.state);
  } else if (m.type === 'text') { add(m.delta); setWords(m.words); }
  else if (m.type === 'tick') { document.getElementById('elapsed').textContent = m.elapsed; }
  else if (m.type === 'state') { setState(m.state); }
});
vscodeApi.postMessage({ type: 'ready' });
</script></body></html>`;
}

export class LiveView implements vscode.Disposable {
    private panel: vscode.WebviewPanel | undefined;
    private suppressClose = false;
    private lastState: RecordingState = 'idle';
    private readonly subs: vscode.Disposable[] = [];

    constructor(private readonly session: RecordingSession) {
        const change = session.onDidChange(() => this.onSessionChange());
        const append = session.onDidAppend(a => this.post({ type: 'text', delta: a.delta, words: a.words }));
        this.subs.push(new vscode.Disposable(() => { change.dispose(); append.dispose(); }));
    }

    /** At the start of a recording: next to the work, focus stays where it was. */
    openAtStart(): void {
        this.disposePanel();
        this.create(true);
    }

    /** jarvis.showRecording: reveal and focus the panel, or create it with focus. */
    show(): void {
        if (this.panel) { this.panel.reveal(undefined, false); return; }
        this.create(false);
    }

    dispose(): void {
        this.disposePanel();
        for (const s of this.subs.splice(0)) { s.dispose(); }
    }

    private disposePanel(): void {
        if (!this.panel) { return; }
        const panel = this.panel;
        this.panel = undefined;
        this.suppressClose = true;
        try { panel.dispose(); } finally { this.suppressClose = false; }
    }

    private create(preserveFocus: boolean): void {
        const actor = this.session.actor;
        if (!actor) { return; }
        const column = secondaryColumn(vscode.window.tabGroups.all.length);
        const panel = vscode.window.createWebviewPanel(
            'jarvis.recorder.transcript',
            `Recording: ${actor.name}`,
            { viewColumn: column, preserveFocus },
            { enableScripts: true },
        );
        this.panel = panel;
        panel.webview.html = buildHtml(crypto.randomBytes(16).toString('base64'), panel.webview.cspSource);
        panel.webview.onDidReceiveMessage((m: { type: string }) => {
            if (m.type === 'ready') { this.sendInit(); }
            else if (m.type === 'end') { void this.session.end('user'); }
        });
        panel.onDidDispose(() => {
            if (this.panel !== panel) { return; }
            this.panel = undefined;
            if (this.suppressClose) { return; }
            void this.onClosed(actor.name);
        });
    }

    private async onClosed(actorName: string): Promise<void> {
        if (this.session.state !== 'running' || this.session.isShuttingDown) { return; }
        const answer = await vscode.window.showWarningMessage(
            `End the recording for ${actorName}?`, { modal: true }, 'End recording', 'Keep recording');
        if (answer === 'End recording') { await this.session.end('user'); }
        else if (this.session.state === 'running') { this.show(); }
    }

    private sendInit(): void {
        const s = this.session;
        this.post({
            type: 'init',
            actor: s.actor?.name ?? '',
            text: s.text,
            words: s.wordCount,
            elapsed: formatElapsed(s.elapsedMs()),
            state: s.state === 'running' ? 'running' : s.state === 'finishing' ? 'finishing' : 'done',
        });
    }

    private onSessionChange(): void {
        const state = this.session.state;
        if (state !== this.lastState) {
            const previous = this.lastState;
            this.lastState = state;
            if (state === 'running' && previous === 'idle') { this.openAtStart(); }
            else if (state === 'finishing') { this.post({ type: 'state', state: 'finishing' }); }
            else if (state === 'idle' && previous !== 'idle') { this.post({ type: 'state', state: 'done' }); }
        }
        if (state === 'running' || state === 'finishing') {
            this.post({ type: 'tick', elapsed: formatElapsed(this.session.elapsedMs()) });
        }
    }

    private post(message: unknown): void {
        try { void this.panel?.webview.postMessage(message); } catch { /* panel is going away */ }
    }
}
