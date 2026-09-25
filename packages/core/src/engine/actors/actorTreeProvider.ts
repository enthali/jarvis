import * as vscode from 'vscode';
import { ActorScanner, ActorTreeNode } from './actorScanner';

export class ActorTreeProvider implements vscode.TreeDataProvider<ActorTreeNode>, vscode.Disposable {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<ActorTreeNode | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private readonly _scanner: ActorScanner) {}

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }

    getChildren(element?: ActorTreeNode): ActorTreeNode[] {
        if (!element) { return this._scanner.tree; }
        return [];
    }

    getTreeItem(element: ActorTreeNode): vscode.TreeItem {
        const actor = this._scanner.getActor(element.id);
        const item = new vscode.TreeItem(actor?.name ?? '', vscode.TreeItemCollapsibleState.None);
        item.tooltip = actor?.summary ?? '';
        item.contextValue = 'jarvisActor';
        item.command = {
            command: 'jarvis.openAgentSession',
            title: 'Open Actor Session',
            arguments: [element],
        };
        return item;
    }
}