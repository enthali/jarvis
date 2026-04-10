// Implementation: SPEC_EXP_PROVIDER, SPEC_EXP_EVENTFILTER_CMD
// Requirements: REQ_EXP_TREEVIEW, REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE, REQ_EXP_EVENTFILTER, REQ_EXP_EVENTFILTERPERSIST

import * as path from 'path';
import * as vscode from 'vscode';
import { YamlScanner, TreeNode, FolderNode, LeafNode } from './yamlScanner';

export class EventTreeProvider implements vscode.TreeDataProvider<TreeNode> {

    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _scanner: YamlScanner;
    private _futureOnly: boolean = false;

    constructor(scanner: YamlScanner) {
        this._scanner = scanner;
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

    getTreeItem(element: TreeNode): vscode.TreeItem {
        if (element.kind === 'folder') {
            const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.Collapsed);
            item.contextValue = 'jarvisFolder';
            return item;
        }
        const entity = this._scanner.getEntity(element.id);
        const label = entity ? entity.name : path.basename(path.dirname(element.id));
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
        item.contextValue = 'jarvisEvent';
        return item;
    }

    getChildren(element?: TreeNode): TreeNode[] {
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
        return [];
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
