// Implementation: SPEC_EXP_PROVIDER
// Requirements: REQ_EXP_TREEVIEW, REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE

import * as vscode from 'vscode';
import { YamlScanner } from './yamlScanner';

export class ProjectTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {

    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _scanner: YamlScanner;

    constructor(scanner: YamlScanner) {
        this._scanner = scanner;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (element) {
            return Promise.resolve([]);
        }
        return Promise.resolve(this._scanner.getProjects().map(name => this._createItem(name)));
    }

    private _createItem(name: string): vscode.TreeItem {
        const item = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.None);
        item.contextValue = 'project';
        return item;
    }
}
