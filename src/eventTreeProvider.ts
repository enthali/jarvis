// Implementation: SPEC_EXP_PROVIDER, SPEC_EXP_EVENTFILTER_CMD, SPEC_EXP_TASKTREE
// Requirements: REQ_EXP_TREEVIEW, REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE, REQ_EXP_EVENTFILTER, REQ_EXP_EVENTFILTERPERSIST, REQ_EXP_TASKTREE

import * as path from 'path';
import * as vscode from 'vscode';
import { YamlScanner, TreeNode, FolderNode } from './yamlScanner';
import { TaskService } from './pim/TaskService';
import { Task } from './pim/ITaskProvider';
import { TaskGroupNode, TaskLeafNode } from './projectTreeProvider';
import { RecordingManager } from './recording';

export type EventTreeItem = TreeNode | TaskGroupNode | TaskLeafNode;

export class EventTreeProvider implements vscode.TreeDataProvider<EventTreeItem> {

    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _scanner: YamlScanner;
    private _futureOnly: boolean = false;
    private _taskService: TaskService | undefined;
    private _recordingManager: RecordingManager | undefined;

    constructor(scanner: YamlScanner, taskService?: TaskService, recordingManager?: RecordingManager) {
        this._scanner = scanner;
        this._taskService = taskService;
        this._recordingManager = recordingManager;
    }

    setFutureOnly(value: boolean): void {
        this._futureOnly = value;
        this.refresh();
    }

    isFutureOnly(): boolean {
        return this._futureOnly;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: EventTreeItem): vscode.TreeItem {
        if (element.kind === 'folder') {
            const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.Collapsed);
            item.contextValue = 'jarvisFolder';
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

        // LeafNode (event)
        const entity = this._scanner.getEntity(element.id);
        const entityName = entity ? entity.name : path.basename(path.dirname(element.id));
        const label = (entity && entity.datesStart) ? `${entity.datesStart} — ${entityName}` : entityName;
        const collapsible = (this._taskService && this._taskService.hasProviders())
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None;
        const item = new vscode.TreeItem(label, collapsible);
        item.contextValue = 'jarvisEvent';
        // Implementation: SPEC_REC_BUTTON — highlight the actively-recording node
        if (this._recordingManager && this._recordingManager.currentProject === entityName) {
            item.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red'));
        }
        this._applyTaskBadge(item, entityName);
        return item;
    }

    getChildren(element?: EventTreeItem): EventTreeItem[] {
        if (!element) {
            const tree = this._scanner.getEventTree();
            if (!this._futureOnly) {
                return tree;
            }
            const today = new Date().toISOString().slice(0, 10);
            return this._filterFuture(tree, today);
        }

        if (element.kind === 'folder') {
            if (!this._futureOnly) {
                return element.children;
            }
            const today = new Date().toISOString().slice(0, 10);
            return this._filterFuture(element.children, today);
        }

        if (element.kind === 'taskGroup') {
            return element.tasks.map(t => ({ kind: 'taskLeaf' as const, task: t }));
        }

        if (element.kind === 'taskLeaf') {
            return [];
        }

        // LeafNode (event) — inject task groups
        if (this._taskService && this._taskService.hasProviders()) {
            const entity = this._scanner.getEntity(element.id);
            const name = entity ? entity.name : path.basename(path.dirname(element.id));
            // Use name as-is — no prefix manipulation. Category in Outlook must match YAML name exactly.
            const eventCategory = name;
            const cachedTasks = this._getCachedTasks();
            if (cachedTasks) {
                const eventTasks = cachedTasks.filter(
                    t => t.categories.includes(eventCategory)
                );
                const openTasks = eventTasks.filter(t => !t.isComplete);
                const completedTasks = eventTasks.filter(t => t.isComplete);
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

    getParent(element: EventTreeItem): EventTreeItem | undefined {
        if (element.kind === 'leaf' || element.kind === 'folder') {
            return this._findParent(element, this._scanner.getEventTree(), undefined) ?? undefined;
        }
        return undefined;
    }

    private _findParent(target: TreeNode, nodes: TreeNode[], parent: FolderNode | undefined): FolderNode | undefined | null {
        for (const node of nodes) {
            if (node === target) { return parent; }
            if (node.kind === 'folder') {
                const result = this._findParent(target, node.children, node);
                if (result !== null) { return result; }
            }
        }
        return null;
    }

    private _getCachedTasks(): Task[] | undefined {
        if (!this._taskService) { return undefined; }
        return (this._taskService as any)._cache?.get() as Task[] | undefined;
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
        const openTasks = cachedTasks.filter(t => t.categories.includes(name) && !t.isComplete);
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
        const fiveDays = new Date();
        fiveDays.setDate(fiveDays.getDate() + 5);
        const fiveDaysStr = fiveDays.toISOString().slice(0, 10);
        const hasDueSoon = openTasks.some(t => t.dueDate && t.dueDate <= fiveDaysStr);
        if (hasDueSoon) {
            item.iconPath = new vscode.ThemeIcon('circle-filled',
                new vscode.ThemeColor('charts.yellow'));
        }
    }

    private _filterFuture(nodes: TreeNode[], today: string): TreeNode[] {
        const result: TreeNode[] = [];
        for (const node of nodes) {
            if (node.kind === 'leaf') {
                const entity = this._scanner.getEntity(node.id);
                // Fail-open: show if no datesEnd, hide only if datesEnd < today
                if (entity?.datesEnd !== undefined && entity.datesEnd < today) {
                    continue;
                }
                result.push(node);
            } else {
                // Recurse into folder, include folder only if it has visible children
                const visibleChildren = this._filterFuture(node.children, today);
                if (visibleChildren.length > 0) {
                    result.push({ kind: 'folder', name: node.name, children: visibleChildren });
                }
            }
        }
        return result;
    }
}
