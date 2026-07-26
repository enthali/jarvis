// Implementation: SPEC_KAN_RENDERER
// Requirements: REQ_KAN_RENDERER

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

const KANBAN_VIEWTYPE = 'jarvisKanbanBoard';
const DOCS_COLUMN = vscode.ViewColumn.Two;

/** Track open panels keyed by file path. */
const openPanels = new Map<string, vscode.WebviewPanel>();

interface BoardData {
    title: string;
    fields: Array<{ name: string; type: string; options: Array<{ name: string; color?: string }> }>;
    items: Array<Record<string, unknown>>;
}

function parseBoard(filePath: string): BoardData | { error: string } {
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        // Simple YAML parse — we use a basic approach here
        // The webview-build bundles this for node, so yaml package is available
        const yaml = require('yaml');
        return yaml.parse(raw) as BoardData;
    } catch (e) {
        return { error: `Failed to parse board: ${e}` };
    }
}

function renderHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'kanban.js')
    );
    const csp = `default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>Kanban Board</title>
  <style>
    html, body { height: 100%; margin: 0; padding: 0; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); font-family: var(--vscode-font-family); }
    #kanban-root { width: 100%; height: 100%; overflow: auto; }
  </style>
</head>
<body>
  <div id="kanban-root"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
}

/** Refresh an open panel for a given file path (called by tools after writing). */
export function refreshKanbanPanel(filePath: string): void {
    const panel = openPanels.get(filePath);
    if (panel) {
        const data = parseBoard(filePath);
        if ('error' in data) {
            panel.webview.postMessage({ type: 'error', message: data.error });
        } else {
            panel.webview.postMessage({ type: 'board', payload: data });
        }
    }
}

export function openKanbanPanel(
    context: vscode.ExtensionContext,
    log: vscode.LogOutputChannel,
    filePath: string
): void {
    // Reveal existing panel for same file
    const existing = openPanels.get(filePath);
    if (existing) {
        existing.reveal(DOCS_COLUMN);
        return;
    }

    const boardName = path.basename(filePath, '.yaml').replace(/\.kanban$/, '');
    const panel = vscode.window.createWebviewPanel(
        KANBAN_VIEWTYPE,
        `Kanban: ${boardName}`,
        DOCS_COLUMN,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out')],
        }
    );
    panel.webview.html = renderHtml(panel.webview, context.extensionUri);
    openPanels.set(filePath, panel);

    function postBoardData(): void {
        const data = parseBoard(filePath);
        if ('error' in data) {
            panel.webview.postMessage({ type: 'error', message: data.error });
        } else {
            panel.webview.postMessage({ type: 'board', payload: data });
        }
    }

    // Initial data push
    postBoardData();

    // Trigger 1: editor save (onDidSaveTextDocument)
    const saveListener = vscode.workspace.onDidSaveTextDocument(doc => {
        if (doc.uri.fsPath === filePath) {
            log.info(`[Kanban] editor save — refreshing: ${filePath}`);
            postBoardData();
        }
    });

    // Trigger 2: filesystem watcher (catches fs.writeFile from LM tools)
    const fsWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(vscode.Uri.file(path.dirname(filePath)), path.basename(filePath))
    );
    fsWatcher.onDidChange(() => {
        log.info(`[Kanban] filesystem change — refreshing: ${filePath}`);
        postBoardData();
    });

    panel.onDidDispose(() => {
        openPanels.delete(filePath);
        saveListener.dispose();
        fsWatcher.dispose();
    });

    log.info(`[Kanban] opened board: ${filePath}`);
}
