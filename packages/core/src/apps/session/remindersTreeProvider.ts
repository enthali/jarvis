// Implementation: SPEC_MSG_REMINDERSVIEW
// Requirements: REQ_MSG_REMINDERS_VIEW

import * as vscode from 'vscode';
import { Reminder, readReminders } from './reminders';
import { getRemindersPath } from '../../engine/core/configPaths';

export interface ReminderNode {
    kind: 'reminder';
    reminder: Reminder;
}

export class RemindersTreeProvider implements vscode.TreeDataProvider<ReminderNode> {

    private _onDidChangeTreeData = new vscode.EventEmitter<ReminderNode | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor() {}

    reload(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getChildren(element?: ReminderNode): ReminderNode[] {
        if (element) { return []; }
        const reminders = readReminders(getRemindersPath() ?? '');
        return reminders.map(r => ({ kind: 'reminder' as const, reminder: r }));
    }

    getTreeItem(element: ReminderNode): vscode.TreeItem {
        const r = element.reminder;
        const truncated = r.text.length > 60 ? r.text.slice(0, 57) + '...' : r.text;
        const item = new vscode.TreeItem(
            `${truncated} \u2014 ${r.session}`,
            vscode.TreeItemCollapsibleState.None
        );
        item.description = formatCountdown(r.deliverAt);
        item.iconPath = new vscode.ThemeIcon('bell');
        item.contextValue = 'jarvisReminder';
        item.command = {
            command: 'jarvis.openReminderFile',
            title: 'Open in reminders file',
            arguments: [element]
        };
        return item;
    }
}

function formatCountdown(deliverAt: string): string {
    const ms = new Date(deliverAt).getTime() - Date.now();
    if (ms < 0) { return 'overdue'; }
    if (ms < 60_000) { return `in ${Math.round(ms / 1000)}s`; }
    return `in ${Math.round(ms / 60_000)} min`;
}
