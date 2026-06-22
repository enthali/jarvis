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

    static readonly viewType = 'jarvis.taskEditor';

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
        // ID is stored in query param to avoid URI authority restrictions
        const params = new URLSearchParams(uri.query);
        const id = params.get('id') ?? '';
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
        webviewPanel.title = document.task.subject;
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
            }
        });
    }

    saveCustomDocument(
        _document: TaskDocument,
        _cancellation: vscode.CancellationToken
    ): Thenable<void> {
        return Promise.resolve();
    }

    saveCustomDocumentAs(
        _document: TaskDocument,
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
        _document: TaskDocument,
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

        const sortedCategories = [...allCategories].sort((a, b) => a.localeCompare(b));
        const categoryOptions = sortedCategories.map(cat =>
            `<option value="${esc(cat)}"${task.categories.includes(cat) ? ' selected' : ''}>${esc(cat)}</option>`
        ).join('');
        const currentCategoryTags = task.categories.length > 0
            ? task.categories.map(c => `<span class="tag">${esc(c)}</span>`).join(' ')
            : '<span class="none">—</span>';

        const completedDateRow = task.isComplete
            ? `<tr><td><b>Completed Date:</b></td><td>${task.completedDate ? esc(task.completedDate) : '—'}</td></tr>`
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
        select[multiple] { height: 120px; display: none; margin-top: 4px; }
        .cat-toggle { font-size: 0.85em; cursor: pointer; color: var(--vscode-textLink-foreground);
                      background: none; border: none; padding: 0; margin-top: 4px; }
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
        .tag { display: inline-block; padding: 1px 8px; border-radius: 3px; margin: 1px 2px;
               background: var(--vscode-badge-background); color: var(--vscode-badge-foreground);
               font-size: 0.9em; }
        .none { color: var(--vscode-descriptionForeground); }
        .cat-hint { font-size: 0.85em; color: var(--vscode-descriptionForeground); margin-top: 3px; }
    </style>
</head>
<body>
    <div style="font-size:0.8em; color:var(--vscode-descriptionForeground); margin-bottom:2px;">jarvis task</div>
    <h2>${esc(task.subject)}</h2>
    <span class="badge">${esc(task.source)}</span>
    <hr>
    <table>
        <tr><td><b>Subject:</b></td><td><input type="text" id="subject" value="${esc(task.subject)}"></td></tr>
        <tr><td><b>Due Date:</b></td><td><input type="date" id="dueDate" value="${task.dueDate ? esc(task.dueDate) : ''}"></td></tr>
        <tr><td><b>Status:</b></td><td><select id="status">${statusSelect}</select></td></tr>
        <tr><td><b>Priority:</b></td><td><select id="priority">${prioritySelect}</select></td></tr>
        <tr><td><b>Body:</b></td><td><textarea id="body">${esc(task.body ?? '')}</textarea></td></tr>
        <tr><td><b>Categories:</b></td><td>
            <div id="cat-tags">${currentCategoryTags}</div>
            <button class="cat-toggle" onclick="toggleCatSelect()" id="cat-toggle-btn">▶ Change…</button>
            <select id="categories" multiple>${categoryOptions}</select>
            <div class="cat-hint" id="cat-hint" style="display:none">Ctrl+Click to select multiple</div>
        </td></tr>
        ${completedDateRow}
    </table>
    <div id="status-msg"></div>
    <script>
        const vscode = acquireVsCodeApi();

        // Keep tag display in sync with multi-select
        const catSelect = document.getElementById('categories');
        const catTags = document.getElementById('cat-tags');
        const catToggleBtn = document.getElementById('cat-toggle-btn');
        const catHint = document.getElementById('cat-hint');

        function toggleCatSelect() {
            const open = catSelect.style.display === 'block';
            catSelect.style.display = open ? 'none' : 'block';
            catHint.style.display = open ? 'none' : 'block';
            catToggleBtn.textContent = open ? '▶ Change…' : '▼ Change…';
        }

        catSelect.addEventListener('change', () => {
            const selected = Array.from(catSelect.selectedOptions).map(o => o.value);
            catTags.innerHTML = selected.length > 0
                ? selected.map(c => '<span class="tag">' + esc(c) + '</span>').join(' ')
                : '<span class="none">—</span>';
            save();
        });

        function esc(s) {
            return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        }

        let _debounceTimer;
        function scheduleSave() {
            clearTimeout(_debounceTimer);
            _debounceTimer = setTimeout(save, 300);
        }

        function save() {
            const categories = Array.from(catSelect.selectedOptions).map(o => o.value);
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

        // Auto-save: immediate for selects/date, debounced for text/textarea
        document.getElementById('status').addEventListener('change', save);
        document.getElementById('priority').addEventListener('change', save);
        document.getElementById('dueDate').addEventListener('change', save);
        document.getElementById('subject').addEventListener('input', scheduleSave);
        document.getElementById('body').addEventListener('input', scheduleSave);

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
