// Implementation: SPEC_SES_TREE
// Requirements: REQ_SES_TREE

import * as path from 'path';
import * as vscode from 'vscode';
import { YamlScanner, TreeNode } from './yamlScanner';

export class SessionTreeProvider implements vscode.TreeDataProvider<TreeNode> {

    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _scanner: YamlScanner;

    constructor(scanner: YamlScanner) {
        this._scanner = scanner;
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

        // LeafNode (session)
        const entity = this._scanner.getEntity(element.id);
        const name = entity ? entity.name : path.basename(path.dirname(element.id));
        const item = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.None);
        item.tooltip = entity?.summary;
        item.contextValue = 'jarvisSession';
        item.command = {
            command: 'jarvis.openAgentSession',
            title: 'Open Agent Session',
            arguments: [element],
        };
        return item;
    }

    getChildren(element?: TreeNode): TreeNode[] {
        if (!element) {
            return this._scanner.getSessionTree();
        }
        if (element.kind === 'folder') {
            return element.children;
        }
        return [];
    }

    getParent(_element: TreeNode): TreeNode | null {
        return null;
    }
}
