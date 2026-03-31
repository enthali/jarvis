// Implementation: SPEC_EXP_PROVIDER
// Requirements: REQ_EXP_TREEVIEW, REQ_EXP_DUMMYDATA

import * as vscode from 'vscode';

export class EventTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {

    private events: vscode.TreeItem[];

    constructor() {
        this.events = [
            this.createItem('Event: embedded world'),
            this.createItem('Event: CES 2027'),
        ];
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (element) {
            return Promise.resolve([]);
        }
        return Promise.resolve(this.events);
    }

    private createItem(name: string): vscode.TreeItem {
        const item = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.None);
        item.contextValue = 'event';
        return item;
    }
}
