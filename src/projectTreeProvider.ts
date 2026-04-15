// Implementation: SPEC_EXP_PROVIDER, SPEC_EXP_FILTERCOMMAND, SPEC_EXP_TASKTREE
// Requirements: REQ_EXP_TREEVIEW, REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE, REQ_EXP_PROJECTFILTER, REQ_EXP_FILTERPERSIST, REQ_EXP_TASKTREE

import * as path from 'path';
import * as vscode from 'vscode';
import { YamlScanner, TreeNode } from './yamlScanner';
import { TaskService } from './pim/TaskService';
import { Task } from './pim/ITaskProvider';
import { RecordingManager } from './recording';

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
    private _recordingManager: RecordingManager | undefined;

    constructor(scanner: YamlScanner, taskService?: TaskService, recordingManager?: RecordingManager) {
        this._scanner = scanner;
        this._taskService = taskService;
        this._recordingManager = recordingManager;
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
        const collapsible = (this._taskService && this._taskService.hasProviders())
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None;
        const item = new vscode.TreeItem(name, collapsible);
        item.contextValue = 'jarvisProject';
        // Implementation: SPEC_REC_BUTTON — highlight the actively-recording node
        if (this._recordingManager && this._recordingManager.currentProject === name) {
            item.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red'));
        }
        this._applyTaskBadge(item, name);
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
                    const entityNames = this._getEntityNames();
                    const uncategorized = cachedTasks.filter(t =>
                        !t.isComplete &&
                        !t.categories.some(c => entityNames.has(c))
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
            // Use name as-is — no prefix manipulation. Category in Outlook must match YAML name exactly.
            const projectCategory = name;
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

    private _getEntityNames(): Set<string> {
        const names = new Set<string>();
        const collect = (nodes: TreeNode[]) => {
            for (const node of nodes) {
                if (node.kind === 'leaf') {
                    const entity = this._scanner.getEntity(node.id);
                    if (entity?.name) { names.add(entity.name); }
                } else {
                    collect(node.children);
                }
            }
        };
        collect(this._scanner.getProjectTree());
        collect(this._scanner.getEventTree());
        return names;
    }

    private _makeTaskLeafItem(task: Task): vscode.TreeItem {
        const label = task.dueDate
            ? `${task.dueDate.slice(2)}  ${task.subject}`
            : task.subject;
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
        item.iconPath = task.isComplete
            ? new vscode.ThemeIcon('check')
            : new vscode.ThemeIcon('circle-outline');
        item.contextValue = 'jarvisTask';
        const taskUri = vscode.Uri.from({
            scheme: 'task',
            path: '/task.jarvis-task',
            query: `id=${encodeURIComponent(task.id)}`
        });
        item.command = {
            command: 'vscode.openWith',
            title: 'Open Task',
            arguments: [taskUri, 'jarvis.taskEditor']
        };
        return item;
    }

    private _applyTaskBadge(item: vscode.TreeItem, name: string): void {
        if (!this._taskService || !this._taskService.hasProviders()) { return; }
        const cachedTasks = this._getCachedTasks();
        if (!cachedTasks) { return; }
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
}
