// Implementation: SPEC_MOD_PIM_PKG — PIM extension activation
// Requirements: REQ_MOD_ADDONS

import * as vscode from 'vscode';
import type { JarvisCoreApi } from 'jarvis-core';
import { TaskService } from './TaskService';
import { CategoryService } from './CategoryService';
import { CategoryTreeProvider } from './CategoryTreeProvider';
import { TaskEditorProvider } from './TaskEditorProvider';
import { OutlookCategoryProvider } from './outlookIntegration/OutlookCategoryProvider';
import { OutlookTaskProvider } from './outlookIntegration/OutlookTaskProvider';

// --- Activation -----------------------------------------------------------------

export function activate(context: vscode.ExtensionContext): void {
    const log = vscode.window.createOutputChannel('Jarvis PIM', { log: true });
    context.subscriptions.push(log);

    // Acquire the core engine API
    const coreExt = vscode.extensions.getExtension('enthali.jarvis-core');
    const rawApi = coreExt?.exports as JarvisCoreApi | undefined;
    if (!rawApi || rawApi.version !== 2) {
        log.error('[PIM] Jarvis core API not available or version mismatch — PIM will not activate.');
        return;
    }
    const api: JarvisCoreApi = rawApi;

    // --- TaskService + Outlook integration ---
    const taskService = new TaskService();
    const categoryService = new CategoryService(log);
    const categoryTreeProvider = new CategoryTreeProvider(categoryService);

    const outlookEnabled = vscode.workspace.getConfiguration('jarvis').get<boolean>('outlook.enabled', false);
    if (outlookEnabled) {
        categoryService.addProvider(new OutlookCategoryProvider(log));
        try {
            if (vscode.workspace.getConfiguration('jarvis').get('outlook.tasks.enabled') === true) {
                taskService.addProvider(new OutlookTaskProvider(log));
                log.info('[PIM] OutlookTaskProvider registered');
            }
        } catch (err) {
            log.warn(`[PIM] Failed to initialize task providers: ${err}`);
        }
    }

    // --- Categories tree view (PIM-owned, NOT engine-driven) ---
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('jarvisCategories', categoryTreeProvider)
    );

    // --- Task editor ---
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            'jarvis.taskEditor',
            new TaskEditorProvider(taskService, categoryService, log),
            { supportsMultipleEditorsPerDocument: false }
        )
    );

    // --- PIM commands ---

    // Refresh Categories
    context.subscriptions.push(vscode.commands.registerCommand('jarvis.refreshCategories', async () => {
        await categoryTreeProvider.refresh();
        log.info('[PIM] manual categories refresh triggered');
    }));

    // Rename Category
    context.subscriptions.push(vscode.commands.registerCommand('jarvis.renameCategory',
        async (node: { name: string; source: string; id?: string }) => {
            const newName = await vscode.window.showInputBox({
                prompt: 'New category name', value: node.name,
                validateInput: v => v?.trim() ? null : 'Name cannot be empty'
            });
            if (newName && newName !== node.name) {
                await categoryService.renameCategory(node.name, newName, node.source, node.id);
                categoryTreeProvider.refresh();
            }
        }
    ));

    // Delete Category
    context.subscriptions.push(vscode.commands.registerCommand('jarvis.deleteCategory',
        async (node: { name: string; source: string; id?: string }) => {
            const confirm = await vscode.window.showWarningMessage(
                `Delete category "${node.name}"?`, { modal: true }, 'Delete'
            );
            if (confirm === 'Delete') {
                await categoryService.deleteCategory(node.name, node.source, node.id);
                categoryTreeProvider.refresh();
            }
        }
    ));

    // Refresh Tasks
    context.subscriptions.push(vscode.commands.registerCommand('jarvis.refreshTasks', async () => {
        try {
            await taskService.refresh();
            log.info('[PIM] manual task refresh triggered');
        } catch (err) {
            log.warn(`[PIM] refresh failed: ${err}`);
        }
    }));

    // --- PIM LM tools (registered via engine API, renamed with _pim_ infix) ---

    // Tool: jarvis_pim_category
    context.subscriptions.push(api.registerTool(
        'jarvis_pim_category',
        'Manage categories: get, set, delete, or rename.',
        async (options, _token) => {
            if (!categoryService.hasProviders()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('No category providers configured. Enable a PIM provider (e.g. jarvis.outlookEnabled).')
                ]);
            }
            const { action, name, filter, provider, oldName, newName } = options.input as {
                action: string; name?: string; filter?: string; provider?: string; oldName?: string; newName?: string;
            };
            let result: object;
            switch (action) {
                case 'get':
                    result = { categories: await categoryService.getCategories(filter) };
                    break;
                case 'set':
                    if (!name) { throw new Error('name required for set'); }
                    await categoryService.setCategory(name, 0, provider);
                    result = { status: 'ok', name };
                    break;
                case 'delete':
                    if (!name) { throw new Error('name required for delete'); }
                    await categoryService.deleteCategory(name, provider);
                    result = { status: 'ok', name };
                    break;
                case 'rename':
                    if (!oldName || !newName) { throw new Error('oldName and newName required for rename'); }
                    await categoryService.renameCategory(oldName, newName, provider);
                    result = { status: 'ok', oldName, newName };
                    break;
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
            categoryTreeProvider.refresh();
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(result))
            ]);
        }
    ));

    // Tool: jarvis_pim_task
    context.subscriptions.push(api.registerTool(
        'jarvis_pim_task',
        'Manage tasks: get, set, modify, or delete. Tasks are linked to Actors via their categories field.',
        async (options, _token) => {
            if (!taskService.hasProviders()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('No task providers configured. Enable jarvis.outlookEnabled and jarvis.outlook.tasks.enabled.')
                ]);
            }
            const input = options.input as {
                action: string; category?: string; status?: string; dueBefore?: string;
                includeBody?: boolean; id?: string; subject?: string; body?: string;
                dueDate?: string; priority?: string; isComplete?: boolean; categories?: string[];
                provider?: string; completedDate?: string;
            };
            if (input.completedDate !== undefined) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('completedDate is read-only and cannot be set directly.')
                ]);
            }
            let result: object;
            switch (input.action) {
                case 'get': {
                    const tasks = await taskService.getTasks({
                        category: input.category, status: input.status, dueBefore: input.dueBefore
                    });
                    const mapped = input.includeBody ? tasks : tasks.map(({ body: _b, ...t }) => t);
                    result = { tasks: mapped };
                    break;
                }
                case 'set': {
                    const newTask = await taskService.setTask(input as any, input.provider);
                    result = { task: newTask };
                    break;
                }
                case 'modify': {
                    if (!input.id) { throw new Error('id required for modify'); }
                    const { completedDate: _cd, ...changes } = input as any;
                    delete changes.action;
                    delete changes.provider;
                    delete changes.id;
                    delete changes.includeBody;
                    delete changes.category;
                    delete changes.status;
                    delete changes.dueBefore;
                    await taskService.modifyTask(input.id, changes, input.provider);
                    result = { status: 'ok', id: input.id };
                    break;
                }
                case 'delete': {
                    if (!input.id) { throw new Error('id required for delete'); }
                    await taskService.deleteTask(input.id, input.provider);
                    result = { status: 'ok', id: input.id };
                    break;
                }
                default:
                    throw new Error(`Unknown action: ${input.action}`);
            }
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(result))
            ]);
        }
    ));

    log.info('[PIM] activated — categories + tasks (2 tools) registered');
}

export function deactivate(): void {
    // All disposables pushed to context.subscriptions are cleaned up automatically
}
