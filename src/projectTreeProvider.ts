// Implementation: SPEC_EXP_PROVIDER, SPEC_EXP_FILTERCOMMAND
// Requirements: REQ_EXP_TREEVIEW, REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE, REQ_EXP_PROJECTFILTER, REQ_EXP_FILTERPERSIST

import * as path from 'path';
import * as vscode from 'vscode';
import { YamlScanner, TreeNode, FolderNode, LeafNode } from './yamlScanner';

export class ProjectTreeProvider implements vscode.TreeDataProvider<TreeNode> {

    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _scanner: YamlScanner;
    private _hiddenFolders: Set<string> = new Set();

    constructor(scanner: YamlScanner) {
        this._scanner = scanner;
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

    getTreeItem(element: TreeNode): vscode.TreeItem {
        if (element.kind === 'folder') {
            const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.Collapsed);
            item.contextValue = 'jarvisFolder';
            return item;
        }
        const entity = this._scanner.getEntity(element.id);
        const label = entity ? entity.name : path.basename(path.dirname(element.id));
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
        item.contextValue = 'jarvisProject';
        return item;
    }

    getChildren(element?: TreeNode): TreeNode[] {
        if (!element) {
            return this._scanner.getProjectTree().filter(
                node => !(node.kind === 'folder' && this._hiddenFolders.has(node.name))
            );
        }
        if (element.kind === 'folder') {
            return element.children;
        }
        return [];
    }
}
