// Implementation: SPEC_EXP_PROVIDER, SPEC_EXP_EVENTFILTER_CMD, SPEC_EXP_TASKTREE
// Requirements: REQ_EXP_TREEVIEW, REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE, REQ_EXP_EVENTFILTER, REQ_EXP_EVENTFILTERPERSIST, REQ_EXP_TASKTREE

import * as path from 'path';
import * as vscode from 'vscode';
import { YamlScanner, TreeNode } from './yamlScanner';
import { TaskService } from './pim/TaskService';
import { Task } from './pim/ITaskProvider';
import { TaskGroupNode, TaskLeafNode } from './projectTreeProvider';

export type EventTreeItem = TreeNode | TaskGroupNode | TaskLeafNode;

export class EventTreeProvider implements vscode.TreeDataProvider<EventTreeItem> {

    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _scanner: YamlScanner;
    private _futureOnly: boolean = false;
    private _taskService: TaskService | undefined;

    constructor(scanner: YamlScanner, taskService?: TaskService) {
        this._scanner = scanner;
        this._taskService = taskService;
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
        const label = entity
            ? (entity.datesStart ? `${entity.datesStart} — ${entity.name}` : entity.name)
            : path.basename(path.dirname(element.id));
        const collapsible = (this._taskService && this._taskService.hasProviders())
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None;
        const item = new vscode.TreeItem(label, collapsible);
        item.contextValue = 'jarvisEvent';
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
            const eventCategory = `Event: ${name}`;
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
