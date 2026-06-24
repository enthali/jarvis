// Implementation: SPEC_ENG_TREEFACTORY AC-3 (PIM decorator for task badge)
// Requirements: REQ_ENG_TREEFACTORY

import * as vscode from 'vscode';
import * as path from 'path';
import type { TreeItemDecorator, TreeNode } from 'jarvis-core';
import type { TaskService } from './TaskService';
import type { Task } from './ITaskProvider';

/**
 * Decorates entity-leaf TreeItems with a task-count badge and status icon.
 *
 * Reproduces the legacy `_applyTaskBadge` behaviour from
 * ProjectTreeProvider / EventTreeProvider:
 * - Sets `item.description` to the open-task count (string) when > 0.
 * - Sets `item.iconPath` to a warning icon (list.warningForeground) if any
 *   open task is overdue (dueDate < today).
 * - Otherwise sets a circle-filled icon (charts.yellow) if any open task is
 *   due within 5 days (dueDate <= today + 5).
 * - No badge when open-task count is 0.
 *
 * Registered on both 'project' and 'event' kinds via
 * `factory.registerDecorator(kind, decorator)`.
 */
export class TaskBadgeDecorator implements TreeItemDecorator {
    private readonly _taskService: TaskService;
    private readonly _scanner: { getEntity(id: string): { name: string } | undefined };

    constructor(
        taskService: TaskService,
        scanner: { getEntity(id: string): { name: string } | undefined }
    ) {
        this._taskService = taskService;
        this._scanner = scanner;
    }

    decorate(item: vscode.TreeItem, node: TreeNode, _kind: string): void {
        if (node.kind !== 'leaf') { return; }
        if (!this._taskService.hasProviders()) { return; }

        const cachedTasks = this._getCachedTasks();
        if (!cachedTasks) { return; }

        const entity = this._scanner.getEntity(node.id);
        const name = entity
            ? entity.name
            : path.basename(path.dirname(node.id));

        const openTasks = cachedTasks.filter(
            t => t.categories.includes(name) && !t.isComplete
        );
        const n = openTasks.length;
        if (n === 0) { return; }

        item.description = `${n}`;

        const today = new Date().toISOString().slice(0, 10);
        const hasOverdue = openTasks.some(t => t.dueDate && t.dueDate < today);
        if (hasOverdue) {
            item.iconPath = new vscode.ThemeIcon('warning',
                new vscode.ThemeColor('list.warningForeground'));
            return;
        }

        const fiveDaysFromNow = new Date();
        fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
        const fiveDaysStr = fiveDaysFromNow.toISOString().slice(0, 10);
        const hasDueSoon = openTasks.some(t => t.dueDate && t.dueDate <= fiveDaysStr);
        if (hasDueSoon) {
            item.iconPath = new vscode.ThemeIcon('circle-filled',
                new vscode.ThemeColor('charts.yellow'));
        }
    }

    private _getCachedTasks(): Task[] | undefined {
        return (this._taskService as any)._cache?.get() as Task[] | undefined;
    }
}
