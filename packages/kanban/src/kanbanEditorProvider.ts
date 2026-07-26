// Implementation: SPEC_KAN_RENDERER (custom editor integration)
// Requirements: REQ_KAN_RENDERER

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'yaml';

interface BoardData {
    title: string;
    fields: Array<{ name: string; type: string; options: Array<{ name: string; color?: string }> }>;
    items: Array<Record<string, unknown>>;
}

function parseBoard(filePath: string): BoardData | { error: string } {
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
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

export class KanbanEditorProvider implements vscode.CustomReadonlyEditorProvider {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly log: vscode.LogOutputChannel
    ) {}

    openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
        return { uri, dispose: () => {} };
    }

    resolveCustomEditor(
        document: vscode.CustomDocument,
        webviewPanel: vscode.WebviewPanel
    ): void {
        const filePath = document.uri.fsPath;

        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'out')],
        };
        webviewPanel.webview.html = renderHtml(webviewPanel.webview, this.context.extensionUri);

        const postBoardData = (): void => {
            const data = parseBoard(filePath);
            if ('error' in data) {
                webviewPanel.webview.postMessage({ type: 'error', message: data.error });
            } else {
                webviewPanel.webview.postMessage({ type: 'board', payload: data });
            }
        };

        // Initial data push
        postBoardData();

        // File watching — re-post on save or fs change
        const saveListener = vscode.workspace.onDidSaveTextDocument(doc => {
            if (doc.uri.fsPath === filePath) {
                postBoardData();
            }
        });

        const fsWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(vscode.Uri.file(path.dirname(filePath)), path.basename(filePath))
        );
        fsWatcher.onDidChange(() => postBoardData());

        webviewPanel.onDidDispose(() => {
            saveListener.dispose();
            fsWatcher.dispose();
        });

        this.log.info(`[Kanban] custom editor opened: ${filePath}`);
    }
}
