// Implementation: SPEC_MOD_FLOW_PKG, SPEC_FLOW_WEBVIEW, SPEC_FLOW_ACTORCLICK, SPEC_FLOW_LOGVIEWER, SPEC_FLOW_REQUEUE
// Requirements: REQ_FLOW_PACKAGE, REQ_FLOW_WEBVIEWPANEL, REQ_FLOW_ACTORCLICK, REQ_FLOW_LOGVIEWER, REQ_FLOW_REQUEUE

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { loadFlowData, loadMessageLogEntries, DEFAULT_CAP } from './dataService';

const FLOW_VIEWTYPE = 'jarvisMessageFlow';
const LOGVIEWER_VIEWTYPE = 'jarvisMessageLog';
const DOCS_COLUMN = vscode.ViewColumn.Two; // aka "Content" column (SPEC_MSG_EDITORPLACEMENT)
const POLL_MS = 5000; // matches REQ_MSG_AUTODELIVER_POLL (SPEC_FLOW_WEBVIEW AC-2)

/** <workspaceRoot>/.jarvis/message-log.json — fixed path, mirrors configPaths.getMessageLogPath(). */
function resolveMessageLogPath(): string | undefined {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    return root ? path.join(root, '.jarvis', 'message-log.json') : undefined;
}

/** <workspaceRoot>/.jarvis/messages.json — mirrors configPaths.getMessagesPath() (SPEC_FLOW_REQUEUE). */
function resolveMessagesPath(): string | undefined {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    return root ? path.join(root, '.jarvis', 'messages.json') : undefined;
}

interface QueuedMessageCopy {
    destination: string;
    sender: string;
    text: string;
    timestamp: string; // preserved verbatim from the original log entry
}

/**
 * Appends `entry` to messages.json only — deliberately does NOT write to
 * message-log.json, even if jarvis.messages.logging is enabled
 * (REQ_FLOW_REQUEUE: a requeue is a redelivery of an already-logged entry,
 * not a new event to log again). Local minimal append — cannot import
 * core's appendMessage() across the package boundary (SPEC_FLOW_REQUEUE).
 */
async function requeueMessage(entry: QueuedMessageCopy): Promise<void> {
    const messagesPath = resolveMessagesPath();
    if (!messagesPath) { throw new Error('No workspace open'); }
    let queue: QueuedMessageCopy[] = [];
    try {
        const raw = await fs.promises.readFile(messagesPath, 'utf-8');
        queue = JSON.parse(raw);
    } catch {
        queue = []; // missing/unparseable file — start fresh, same tolerant pattern as readMessageLog()
    }
    queue.push(entry);
    await fs.promises.mkdir(path.dirname(messagesPath), { recursive: true });
    await fs.promises.writeFile(messagesPath, JSON.stringify(queue, null, 2));
}

async function handleRequeue(
    original: { sender: string; destination: string; text: string; timestamp: string },
    log: vscode.LogOutputChannel
): Promise<boolean> {
    try {
        await requeueMessage({
            destination: original.destination,
            sender: original.sender,        // preserved verbatim
            text: original.text,
            timestamp: original.timestamp,  // preserved verbatim — same send time
        });
        log.info(`[Flow] requeued message to "${original.destination}" (original timestamp ${original.timestamp})`);
        return true;
    } catch (e) {
        log.warn(`[Flow] requeue failed for "${original.destination}": ${e}`);
        return false;
    }
}

/**
 * Actor-node click bridge (SPEC_FLOW_ACTORCLICK). Reuses the already-registered
 * 'jarvis.openMessageSession' command unmodified (AC-1) — that handler already
 * wraps lookupSessionUUID + openAtMain (SPEC_MSG_EDITORPLACEMENT) and is a
 * silent no-op when no session resolves (AC-2). Invoking it by id via
 * executeCommand needs no new engine API surface (AC-3) and no duplicated
 * copy of core's session-lookup/placement logic in this package.
 */
async function handleActorClick(name: string): Promise<void> {
    await vscode.commands.executeCommand('jarvis.openMessageSession', { destination: name });
}

function renderHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'chord.js')
    );
    const csp = `default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>Message Flow</title>
  <style>
    html, body { height: 100%; margin: 0; padding: 0; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); font-family: var(--vscode-font-family); }
    #flow-root { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="flow-root"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
}

/**
 * Creates (or reveals, if already open) the single Message Flow Webview
 * Panel at the fixed Content column — never via resolveSecondaryColumn()
 * (SPEC_FLOW_WEBVIEW AC-1, SPEC_MSG_EDITORPLACEMENT).
 */
function makeOpenMessageFlow(
    context: vscode.ExtensionContext,
    log: vscode.LogOutputChannel
): () => void {
    let panel: vscode.WebviewPanel | undefined;
    let pollHandle: ReturnType<typeof setInterval> | undefined;
    let currentCap = DEFAULT_CAP; // SPEC_FLOW_LOADMORE, SPEC_FLOW_WEBVIEW

    function postData(): void {
        if (!panel) { return; }
        const logPath = resolveMessageLogPath();
        const payload = logPath ? loadFlowData(logPath, currentCap) : { nodes: [], edges: [], entries: [] };
        panel.webview.postMessage({ type: 'data', payload });
    }

    return function openMessageFlow(): void {
        if (panel) {
            panel.reveal(DOCS_COLUMN);
            return;
        }
        currentCap = DEFAULT_CAP; // reset cap on new panel creation
        panel = vscode.window.createWebviewPanel(
            FLOW_VIEWTYPE,
            'Message Flow',
            DOCS_COLUMN,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out')],
            }
        );
        panel.webview.html = renderHtml(panel.webview, context.extensionUri);

        panel.webview.onDidReceiveMessage(msg => {
            if (msg?.type === 'actorClick' && typeof msg.name === 'string') {
                handleActorClick(msg.name).catch(e => log.warn(`[Flow] actorClick failed: ${e}`));
            } else if (msg?.type === 'increaseCap') {
                // SPEC_FLOW_LOADMORE AC-1: increase cap by 500, immediate reload + push
                currentCap += 500;
                log.info(`[Flow] cap increased to ${currentCap}`);
                postData();
            }
        });

        panel.onDidDispose(() => {
            panel = undefined;
            if (pollHandle) { clearInterval(pollHandle); pollHandle = undefined; }
        });

        pollHandle = setInterval(() => {
            if (panel?.visible) { postData(); }
        }, POLL_MS);
        postData();
    };
}

function renderLogViewerHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'logviewer.js')
    );
    const csp = `default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>Message Log</title>
  <style>
    html, body { height: 100%; margin: 0; padding: 0; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); font-family: var(--vscode-font-family); }
    #log-root { width: 100%; height: 100%; overflow-y: auto; }
  </style>
</head>
<body>
  <div id="log-root"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
}

/**
 * Creates (or reveals, if already open) the single Message Log Webview
 * Panel at the fixed Docs column, mirroring makeOpenMessageFlow's structure
 * (SPEC_FLOW_LOGVIEWER AC-1/AC-2). Auto-refresh start/stop is driven by
 * webview-posted atTop/scrolledDown messages, not host-side scroll
 * awareness (SPEC_FLOW_LOGVIEWER design note).
 */
function makeOpenMessageLog(
    context: vscode.ExtensionContext,
    log: vscode.LogOutputChannel
): () => void {
    let panel: vscode.WebviewPanel | undefined;
    let pollHandle: ReturnType<typeof setInterval> | undefined;

    function postData(): void {
        if (!panel) { return; }
        const logPath = resolveMessageLogPath();
        const entries = logPath ? loadMessageLogEntries(logPath) : [];
        panel.webview.postMessage({ type: 'logData', payload: entries });
    }

    return function openMessageLog(): void {
        if (panel) {
            panel.reveal(DOCS_COLUMN);
            return;
        }
        panel = vscode.window.createWebviewPanel(
            LOGVIEWER_VIEWTYPE,
            'Message Log',
            DOCS_COLUMN,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out')],
            }
        );
        panel.webview.html = renderLogViewerHtml(panel.webview, context.extensionUri);
        panel.onDidDispose(() => {
            panel = undefined;
            if (pollHandle) { clearInterval(pollHandle); pollHandle = undefined; }
        });

        panel.webview.onDidReceiveMessage(msg => {
            if (msg?.type === 'atTop') {
                // AC-7a/AC-7c \u2014 (re)start polling, refresh immediately
                if (!pollHandle) {
                    postData();
                    pollHandle = setInterval(() => { if (panel?.visible) { postData(); } }, POLL_MS);
                }
            } else if (msg?.type === 'scrolledDown') {
                // AC-7b \u2014 pause polling, freeze current list
                if (pollHandle) { clearInterval(pollHandle); pollHandle = undefined; }
            } else if (msg?.type === 'requeue') {
                handleRequeue(msg.entry, log)
                    .then(ok => panel?.webview.postMessage({ type: 'requeueResult', ok }))
                    .catch(e => {
                        log.warn(`[Flow] requeue failed: ${e}`);
                        panel?.webview.postMessage({ type: 'requeueResult', ok: false });
                    });
            }
        });

        postData();
        pollHandle = setInterval(() => { if (panel?.visible) { postData(); } }, POLL_MS);
    };
}

export function activate(context: vscode.ExtensionContext): void {
    const log = vscode.window.createOutputChannel('Jarvis Flow', { log: true });
    context.subscriptions.push(log);

    // Requires-core activation guard (REQ_MOD_ZEROTRACE, mirrors packages/pim's guard).
    // extensionDependencies already forces core to activate first; this guard
    // additionally covers the (unusual) case where core's exports are absent
    // or version-mismatched.
    const coreExt = vscode.extensions.getExtension('enthali.jarvis-core');
    const rawApi = coreExt?.exports as { version?: number } | undefined;
    if (!rawApi || rawApi.version !== 1) {
        log.error('[Flow] Jarvis core API not available or version mismatch — Flow will not activate.');
        return;
    }

    const openMessageFlow = makeOpenMessageFlow(context, log);
    const openMessageLog = makeOpenMessageLog(context, log);
    context.subscriptions.push(
        vscode.commands.registerCommand('jarvis.openMessageFlow', openMessageFlow),
        vscode.commands.registerCommand('jarvis.openMessageLog', openMessageLog)
    );
}

export function deactivate(): void {
    // no-op: panel disposal and interval cleanup are handled by onDidDispose
}
