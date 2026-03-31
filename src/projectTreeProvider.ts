// Implementation: SPEC_EXP_PROVIDER
// Requirements: REQ_EXP_TREEVIEW, REQ_EXP_DUMMYDATA

import * as vscode from 'vscode';

export class ProjectTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {

    private projects: vscode.TreeItem[];

    constructor() {
        this.projects = [
            this.createItem('Project: Auto Strategy'),
            this.createItem('Project: Cloud Migration'),
            this.createItem('Project: Partner Portal'),
        ];
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (element) {
            return Promise.resolve([]);
        }
        return Promise.resolve(this.projects);
    }

    private createItem(name: string): vscode.TreeItem {
        const item = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.None);
        item.contextValue = 'project';
        return item;
    }
}
