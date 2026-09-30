import * as vscode from 'vscode';
import type { ToolHandler } from '../../engine/core/types';
import { addReminder, readReminders, removeReminder } from './reminders';

export interface ReminderToolDependencies {
    remindersPath(): string;
    reload(): void;
    info(message: string): void;
    now(): Date;
}

export function createSetReminderHandler(dependencies: ReminderToolDependencies): ToolHandler {
    return async options => {
        const { text, session, deliverAt } = options.input as { text: string; session: string; deliverAt: string };
        if (new Date(deliverAt) <= dependencies.now()) {
            return result({ error: 'deliverAt must be in the future' });
        }
        const reminder = addReminder(dependencies.remindersPath(), text, session, deliverAt);
        dependencies.info(`[MSG] setReminder: id="${reminder.id}", session="${session}", deliverAt="${deliverAt}"`);
        dependencies.reload();
        return result({ id: reminder.id, deliverAt: reminder.deliverAt });
    };
}

export function createListRemindersHandler(dependencies: ReminderToolDependencies): ToolHandler {
    return async () => {
        const now = dependencies.now().getTime();
        const reminders = readReminders(dependencies.remindersPath());
        return result({
            reminders: reminders.map(reminder => ({
                ...reminder,
                remainingMs: new Date(reminder.deliverAt).getTime() - now,
            })),
        });
    };
}

export function createCancelReminderHandler(dependencies: ReminderToolDependencies): ToolHandler {
    return async options => {
        const { id } = options.input as { id: string };
        const removed = removeReminder(dependencies.remindersPath(), id);
        dependencies.info(`[MSG] cancelReminder: id="${id}", removed=${removed}`);
        dependencies.reload();
        return result({ status: removed ? 'cancelled' : 'not_found' });
    };
}

export function findReminderLine(lines: readonly string[], reminderId: string): number {
    const target = `id: ${reminderId}`;
    const index = lines.findIndex(line => line.includes(target));
    return index === -1 ? 0 : index;
}

function result(payload: unknown): vscode.LanguageModelToolResult {
    return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(JSON.stringify(payload)),
    ]);
}