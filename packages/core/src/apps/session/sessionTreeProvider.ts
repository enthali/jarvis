// Implementation: SPEC_SES_TREE, SPEC_EXP_ENTITY_TREECLICK, SPEC_EXP_ENTITY_ICONS
// Requirements: REQ_SES_TREE, REQ_EXP_ENTITY_TREECLICK, REQ_EXP_ENTITY_ICONS

import * as path from 'path';
import * as vscode from 'vscode';
import { YamlScanner, TreeNode } from '../../engine/sessions/yamlScanner';

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

        // SPEC_EXP_ENTITY_ICONS: plain contextValue (no recording suffix)
        item.contextValue = 'jarvisSession';

        // SPEC_EXP_ENTITY_TREECLICK: single-click opens agent session
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
