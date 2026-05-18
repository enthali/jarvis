// Implementation: SPEC_MSG_TREEPROVIDER
// Requirements: REQ_MSG_EXPLORER, REQ_MSG_DELETE, REQ_EXP_TREEVIEW

import * as vscode from 'vscode';
import { readQueue, readAutoDelivery } from './messageQueue';

// ---------------------------------------------------------------------------
// Node types
// ---------------------------------------------------------------------------

export interface AutoDeliveryGroupNode {
    kind: 'autoDeliveryGroup';
    sessions: string[];
}

export interface SessionGroupNode {
    kind: 'session';
    label: string;
    destination: string;
    children: MessageLeafNode[];
    isAutoDeliver: boolean;
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

export type MessageNode = AutoDeliveryGroupNode | SessionGroupNode | MessageLeafNode | EmptyNode;

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
            const messagesPath = this._queuePath();
            const messages = readQueue(messagesPath);
            const autoDeliverySessions = readAutoDelivery(messagesPath);
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
            const result: MessageNode[] = [];
            // Manual sessions (not in autoDelivery list)
            for (const [destination, children] of groups) {
                if (!autoDeliverySessions.includes(destination)) {
                    result.push({
                        kind: 'session',
                        label: `${destination} (${children.length})`,
                        destination,
                        children,
                        isAutoDeliver: false,
                    });
                }
            }
            // AutoDeliveryGroupNode (always shown)
            result.push({
                kind: 'autoDeliveryGroup',
                sessions: autoDeliverySessions,
            });
            return result;
        }

        if (element.kind === 'autoDeliveryGroup') {
            const messagesPath = this._queuePath();
            const messages = readQueue(messagesPath);
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
            return element.sessions.map(sessionName => ({
                kind: 'session' as const,
                label: `${sessionName} (${(groups.get(sessionName) || []).length})`,
                destination: sessionName,
                children: groups.get(sessionName) || [],
                isAutoDeliver: true,
            }));
        }

        if (element.kind === 'session') {
            return element.children;
        }

        return [];
    }

    getTreeItem(element: MessageNode): vscode.TreeItem {
        if (element.kind === 'autoDeliveryGroup') {
            const item = new vscode.TreeItem(
                'Auto Delivery',
                vscode.TreeItemCollapsibleState.Expanded
            );
            item.iconPath = new vscode.ThemeIcon('zap');
            item.contextValue = 'autoDeliveryGroup';
            return item;
        }

        if (element.kind === 'session') {
            const item = new vscode.TreeItem(
                element.label,
                vscode.TreeItemCollapsibleState.Collapsed
            );
            item.contextValue = element.isAutoDeliver ? 'jarvisSessionAutoDeliver' : 'jarvisSessionManual';
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
            // Implementation: SPEC_EXP_MESSAGE_OPENFILE
            item.command = {
                command: 'jarvis.openMessageFile',
                title: 'Open in messages file',
                arguments: [element]
            };
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

