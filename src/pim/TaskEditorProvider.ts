// Implementation: SPEC_PIM_TASKEDITOR
// Requirements: REQ_PIM_TASKEDITOR

import * as vscode from 'vscode';
import { TaskService } from './TaskService';
import { CategoryService } from './CategoryService';
import { Task } from './ITaskProvider';

export class TaskDocument implements vscode.CustomDocument {
    constructor(
        public readonly uri: vscode.Uri,
        public task: Task
    ) {}

    dispose(): void {
        // no resources to release
    }
}

export class TaskEditorProvider implements vscode.CustomEditorProvider<TaskDocument> {

    private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<TaskDocument>>();
    readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

    constructor(
        private readonly _taskService: TaskService,
        private readonly _categoryService: CategoryService,
        private readonly _log: vscode.LogOutputChannel
    ) {}

    async openCustomDocument(
        uri: vscode.Uri,
        _openContext: vscode.CustomDocumentOpenContext,
        _token: vscode.CancellationToken
    ): Promise<TaskDocument> {
        const id = uri.authority;
        const tasks = await this._taskService.getTasks();
        const task = tasks.find(t => t.id === id);
        if (!task) {
            throw new Error(`Task not found: ${id}`);
        }
        return new TaskDocument(uri, task);
    }

    async resolveCustomEditor(
        document: TaskDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = { enableScripts: true };

        const categories = this._categoryService.hasProviders()
            ? await this._categoryService.getCategories()
            : [];

        webviewPanel.webview.html = this._buildHtml(document.task, categories.map(c => c.name));

        webviewPanel.webview.onDidReceiveMessage(async (msg) => {
            if (msg.command === 'save') {
                const changes: Partial<Task> = msg.changes;
                // completedDate must never be written
                delete (changes as any).completedDate;
                try {
                    await this._taskService.modifyTask(document.task.id, changes, document.task.source);
                    document.task = { ...document.task, ...changes };
                    this._log.info(`[TaskEditor] saved task "${document.task.subject}"`);
                    webviewPanel.webview.postMessage({ command: 'saved' });
                } catch (e) {
                    this._log.error(`[TaskEditor] save failed: ${e}`);
                    webviewPanel.webview.postMessage({ command: 'error', message: String(e) });
                }
            } else if (msg.command === 'openInOutlook') {
                vscode.env.openExternal(
                    vscode.Uri.parse(`outlook://open?entryid=${encodeURIComponent(document.task.id)}`)
                );
            }
        });
    }

    saveCustomDocument(
        document: TaskDocument,
        _cancellation: vscode.CancellationToken
    ): Thenable<void> {
        // Save is handled via webview message 'save'
        return Promise.resolve();
    }

    saveCustomDocumentAs(
        document: TaskDocument,
        _destination: vscode.Uri,
        _cancellation: vscode.CancellationToken
    ): Thenable<void> {
        return Promise.resolve();
    }

    revertCustomDocument(
        _document: TaskDocument,
        _cancellation: vscode.CancellationToken
    ): Thenable<void> {
        return Promise.resolve();
    }

    backupCustomDocument(
        document: TaskDocument,
        context: vscode.CustomDocumentBackupContext,
        _cancellation: vscode.CancellationToken
    ): Thenable<vscode.CustomDocumentBackup> {
        return Promise.resolve({
            id: context.destination.toString(),
            delete: () => { /* no-op */ }
        });
    }

    private _buildHtml(task: Task, allCategories: string[]): string {
        const esc = (s: string) => s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        const statusOptions = ['notStarted', 'inProgress', 'completed', 'deferred', 'waitingOnOther'];
        const priorityOptions = ['low', 'normal', 'high'];

        const statusSelect = statusOptions.map(s =>
            `<option value="${s}"${task.status === s ? ' selected' : ''}>${s}</option>`
        ).join('');

        const prioritySelect = priorityOptions.map(p =>
            `<option value="${p}"${task.priority === p ? ' selected' : ''}>${p}</option>`
        ).join('');

        const categoryCheckboxes = allCategories.map(cat =>
            `<label><input type="checkbox" name="category" value="${esc(cat)}"${task.categories.includes(cat) ? ' checked' : ''}> ${esc(cat)}</label><br>`
        ).join('');

        const completedDateRow = task.isComplete && task.completedDate
            ? `<tr><td><b>Completed Date:</b></td><td>${esc(task.completedDate)}</td></tr>`
            : '';

        const openInOutlookBtn = task.source === 'outlook'
            ? `<button onclick="openInOutlook()">Open in Outlook</button>`
            : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
    <title>Task Editor</title>
    <style>
        body { font-family: var(--vscode-font-family); padding: 16px; color: var(--vscode-foreground); }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 4px 8px; vertical-align: top; }
        input[type=text], input[type=date], textarea, select {
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            width: 100%;
            box-sizing: border-box;
        }
        textarea { height: 120px; }
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            cursor: pointer;
            margin-top: 8px;
            margin-right: 8px;
        }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px;
                 background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
    </style>
</head>
<body>
    <h2>${esc(task.subject)}</h2>
    <span class="badge">${esc(task.source)}</span>
    <hr>
    <table>
        <tr><td><b>Subject:</b></td><td><input type="text" id="subject" value="${esc(task.subject)}"></td></tr>
        <tr><td><b>Due Date:</b></td><td><input type="date" id="dueDate" value="${task.dueDate ? esc(task.dueDate) : ''}"></td></tr>
        <tr><td><b>Status:</b></td><td><select id="status">${statusSelect}</select></td></tr>
        <tr><td><b>Priority:</b></td><td><select id="priority">${prioritySelect}</select></td></tr>
        <tr><td><b>Body:</b></td><td><textarea id="body">${esc(task.body ?? '')}</textarea></td></tr>
        <tr><td><b>Categories:</b></td><td>${categoryCheckboxes}</td></tr>
        ${completedDateRow}
    </table>
    <button onclick="save()">Save</button>
    ${openInOutlookBtn}
    <div id="status-msg"></div>
    <script>
        const vscode = acquireVsCodeApi();

        function save() {
            const categoryInputs = document.querySelectorAll('input[name="category"]:checked');
            const categories = Array.from(categoryInputs).map(el => el.value);
            const changes = {
                subject: document.getElementById('subject').value,
                dueDate: document.getElementById('dueDate').value || undefined,
                status: document.getElementById('status').value,
                priority: document.getElementById('priority').value,
                body: document.getElementById('body').value,
                categories: categories
            };
            vscode.postMessage({ command: 'save', changes });
        }

        function openInOutlook() {
            vscode.postMessage({ command: 'openInOutlook' });
        }

        window.addEventListener('message', event => {
            const msg = event.data;
            if (msg.command === 'saved') {
                document.getElementById('status-msg').textContent = 'Saved.';
                setTimeout(() => { document.getElementById('status-msg').textContent = ''; }, 2000);
            } else if (msg.command === 'error') {
                document.getElementById('status-msg').textContent = 'Error: ' + msg.message;
            }
        });
    </script>
</body>
</html>`;
    }
}
