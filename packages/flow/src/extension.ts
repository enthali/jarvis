// Implementation: SPEC_MOD_FLOW_PKG, SPEC_FLOW_WEBVIEW, SPEC_FLOW_ACTORCLICK
// Requirements: REQ_FLOW_PACKAGE, REQ_FLOW_WEBVIEWPANEL, REQ_FLOW_ACTORCLICK

import * as vscode from 'vscode';
import * as path from 'path';
import { loadFlowData, DEFAULT_CAP } from './dataService';

const FLOW_VIEWTYPE = 'jarvisMessageFlow';
const DOCS_COLUMN = vscode.ViewColumn.Two; // aka "Content" column (SPEC_MSG_EDITORPLACEMENT)
const POLL_MS = 5000; // matches REQ_MSG_AUTODELIVER_POLL (SPEC_FLOW_WEBVIEW AC-2)

/** <workspaceRoot>/.jarvis/message-log.json — fixed path, mirrors configPaths.getMessageLogPath(). */
function resolveMessageLogPath(): string | undefined {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    return root ? path.join(root, '.jarvis', 'message-log.json') : undefined;
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
    context.subscriptions.push(
        vscode.commands.registerCommand('jarvis.openMessageFlow', openMessageFlow)
    );
}

export function deactivate(): void {
    // no-op: panel disposal and interval cleanup are handled by onDidDispose
}
