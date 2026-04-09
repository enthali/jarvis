// Implementation: SPEC_MSG_TREEPROVIDER
// Requirements: REQ_MSG_EXPLORER, REQ_MSG_DELETE, REQ_EXP_TREEVIEW

import * as vscode from 'vscode';
import { readQueue } from './messageQueue';

// ---------------------------------------------------------------------------
// Node types
// ---------------------------------------------------------------------------

export interface SessionGroupNode {
    kind: 'session';
    label: string;
    destination: string;
    children: MessageLeafNode[];
}

export interface MessageLeafNode {
    kind: 'message';
    destination: string;
    sender: string;
    text: string;
    index: number; // position in the flat queue array
}

interface EmptyNode {
    kind: 'empty';
}

export type MessageNode = SessionGroupNode | MessageLeafNode | EmptyNode;

// ---------------------------------------------------------------------------
// Tree Data Provider
// ---------------------------------------------------------------------------

export class MessageTreeProvider implements vscode.TreeDataProvider<MessageNode> {

    private _onDidChangeTreeData = new vscode.EventEmitter<MessageNode | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private _queuePath: () => string) {}

    reload(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getChildren(element?: MessageNode): MessageNode[] {
        if (!element) {
            const messages = readQueue(this._queuePath());
            if (messages.length === 0) {
                return [{ kind: 'empty' }];
            }
            // Group by destination
            const groups = new Map<string, MessageLeafNode[]>();
            for (let i = 0; i < messages.length; i++) {
                const m = messages[i];
                if (!groups.has(m.destination)) { groups.set(m.destination, []); }
                groups.get(m.destination)!.push({
                    kind: 'message',
                    destination: m.destination,
                    sender: m.sender || 'unknown',
                    text: m.text,
                    index: i,
                });
            }
            const result: SessionGroupNode[] = [];
            for (const [destination, children] of groups) {
                result.push({
                    kind: 'session',
                    label: `${destination} (${children.length})`,
                    destination,
                    children,
                });
            }
            return result;
        }

        if (element.kind === 'session') {
            return element.children;
        }

        return [];
    }

    getTreeItem(element: MessageNode): vscode.TreeItem {
        if (element.kind === 'session') {
            const item = new vscode.TreeItem(
                element.label,
                vscode.TreeItemCollapsibleState.Expanded
            );
            item.contextValue = 'messageSession';
            return item;
        }

        if (element.kind === 'message') {
            const truncated = element.text.length > 80
                ? element.text.slice(0, 77) + '...'
                : element.text;
            const item = new vscode.TreeItem(
                truncated,
                vscode.TreeItemCollapsibleState.None
            );
            item.contextValue = 'messageItem';
            return item;
        }

        // empty node
        const item = new vscode.TreeItem(
            'nothing to deliver',
            vscode.TreeItemCollapsibleState.None
        );
        return item;
    }
}
