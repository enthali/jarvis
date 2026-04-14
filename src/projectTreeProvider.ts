// Implementation: SPEC_EXP_PROVIDER, SPEC_EXP_FILTERCOMMAND, SPEC_EXP_TASKTREE
// Requirements: REQ_EXP_TREEVIEW, REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE, REQ_EXP_PROJECTFILTER, REQ_EXP_FILTERPERSIST, REQ_EXP_TASKTREE

import * as path from 'path';
import * as vscode from 'vscode';
import { YamlScanner, TreeNode } from './yamlScanner';
import { TaskService } from './pim/TaskService';
import { Task } from './pim/ITaskProvider';

export type TaskGroupNode = {
    kind: 'taskGroup';
    label: string;
    tasks: Task[];
    collapsed: boolean;
};

export type TaskLeafNode = {
    kind: 'taskLeaf';
    task: Task;
};

export type UncategorizedTasksNode = {
    kind: 'uncategorizedTasks';
    tasks: Task[];
};

export type ProjectTreeItem = TreeNode | TaskGroupNode | TaskLeafNode | UncategorizedTasksNode;

export class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectTreeItem> {

    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _scanner: YamlScanner;
    private _hiddenFolders: Set<string> = new Set();
    private _taskService: TaskService | undefined;

    constructor(scanner: YamlScanner, taskService?: TaskService) {
        this._scanner = scanner;
        this._taskService = taskService;
    }

    setHiddenFolders(folders: Set<string>): void {
        this._hiddenFolders = folders;
        this.refresh();
    }

    getHiddenFolders(): Set<string> {
        return this._hiddenFolders;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ProjectTreeItem): vscode.TreeItem {
        if (element.kind === 'folder') {
            const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.Collapsed);
            item.contextValue = 'jarvisFolder';
            return item;
        }

        if (element.kind === 'uncategorizedTasks') {
            const item = new vscode.TreeItem(
                `Uncategorized Tasks (${element.tasks.length})`,
                vscode.TreeItemCollapsibleState.Collapsed
            );
            item.iconPath = new vscode.ThemeIcon('warning');
            return item;
        }

        if (element.kind === 'taskGroup') {
            const state = element.collapsed
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.Expanded;
            return new vscode.TreeItem(element.label, state);
        }

        if (element.kind === 'taskLeaf') {
            return this._makeTaskLeafItem(element.task);
        }

        // LeafNode (project)
        const entity = this._scanner.getEntity(element.id);
        const name = entity ? entity.name : path.basename(path.dirname(element.id));
        const label = this._buildProjectLabel(name);
        const collapsible = (this._taskService && this._taskService.hasProviders())
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None;
        const item = new vscode.TreeItem(label, collapsible);
        item.contextValue = 'jarvisProject';
        return item;
    }

    getChildren(element?: ProjectTreeItem): ProjectTreeItem[] {
        if (!element) {
            const baseTree: ProjectTreeItem[] = this._scanner.getProjectTree().filter(
                node => !(node.kind === 'folder' && this._hiddenFolders.has(node.name))
            );

            // Prepend uncategorized tasks if tasks feature is active
            if (this._taskService && this._taskService.hasProviders()) {
                const cachedTasks = this._getCachedTasks();
                if (cachedTasks && cachedTasks.length > 0) {
                    const uncategorized = cachedTasks.filter(t =>
                        !t.isComplete &&
                        !t.categories.some(c => c.startsWith('Project: ') || c.startsWith('Event: '))
                    );
                    if (uncategorized.length > 0) {
                        const uncatNode: UncategorizedTasksNode = {
                            kind: 'uncategorizedTasks',
                            tasks: uncategorized
                        };
                        return [uncatNode, ...baseTree];
                    }
                }
            }

            return baseTree;
        }

        if (element.kind === 'folder') {
            return element.children;
        }

        if (element.kind === 'uncategorizedTasks') {
            return element.tasks.map(t => ({ kind: 'taskLeaf' as const, task: t }));
        }

        if (element.kind === 'taskGroup') {
            return element.tasks.map(t => ({ kind: 'taskLeaf' as const, task: t }));
        }

        if (element.kind === 'taskLeaf') {
            return [];
        }

        // LeafNode (project) — inject task groups
        if (this._taskService && this._taskService.hasProviders()) {
            const entity = this._scanner.getEntity(element.id);
            const name = entity ? entity.name : path.basename(path.dirname(element.id));
            const projectCategory = `Project: ${name}`;
            const cachedTasks = this._getCachedTasks();
            if (cachedTasks) {
                const projectTasks = cachedTasks.filter(
                    t => t.categories.includes(projectCategory)
                );
                const openTasks = projectTasks.filter(t => !t.isComplete);
                const completedTasks = projectTasks.filter(t => t.isComplete);
                const groups: TaskGroupNode[] = [];
                if (openTasks.length > 0) {
                    groups.push({
                        kind: 'taskGroup',
                        label: `Open Tasks (${openTasks.length})`,
                        tasks: openTasks,
                        collapsed: false
                    });
                }
                if (completedTasks.length > 0) {
                    groups.push({
                        kind: 'taskGroup',
                        label: `Completed Tasks (${completedTasks.length})`,
                        tasks: completedTasks,
                        collapsed: true
                    });
                }
                return groups;
            }
        }

        return [];
    }

    private _getCachedTasks(): Task[] | undefined {
        if (!this._taskService) { return undefined; }
        return (this._taskService as any)._cache?.get() as Task[] | undefined;
    }

    private _makeTaskLeafItem(task: Task): vscode.TreeItem {
        const label = task.dueDate
            ? `${task.subject} — ${task.dueDate}`
            : task.subject;
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
        item.iconPath = task.isComplete
            ? new vscode.ThemeIcon('check')
            : new vscode.ThemeIcon('circle-outline');
        item.contextValue = 'jarvisTask';
        const taskUri = vscode.Uri.from({
            scheme: 'task',
            authority: task.id,
            path: `/${encodeURIComponent(task.subject)}`
        });
        item.command = {
            command: 'vscode.openWith',
            title: 'Open Task',
            arguments: [taskUri, 'jarvis.taskEditor']
        };
        return item;
    }

    private _buildProjectLabel(name: string): string {
        if (!this._taskService || !this._taskService.hasProviders()) {
            return name;
        }
        const projectCategory = `Project: ${name}`;
        const cachedTasks = this._getCachedTasks();
        if (!cachedTasks) { return name; }
        const openTasks = cachedTasks.filter(
            t => t.categories.includes(projectCategory) && !t.isComplete
        );
        const n = openTasks.length;
        if (n === 0) { return name; }

        const today = new Date().toISOString().slice(0, 10);
        const hasOverdue = openTasks.some(t => t.dueDate && t.dueDate < today);
        if (hasOverdue) {
            return `${name} ⚠`;
        }

        const fiveDaysFromNow = new Date();
        fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
        const fiveDaysStr = fiveDaysFromNow.toISOString().slice(0, 10);
        const hasDueSoon = openTasks.some(t => t.dueDate && t.dueDate <= fiveDaysStr);
        if (hasDueSoon) {
            return `${name} (${n} !)`;
        }

        return `${name} (${n})`;
    }
}
