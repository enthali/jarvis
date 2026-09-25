import type { Reminder } from './reminders';
import { popDueReminders } from './reminders';
import { appendMessage } from '../../engine/sessions/messageQueue';

export function enqueueReminder(messagesPath: string, reminder: Reminder): void {
    appendMessage(messagesPath, reminder.session, 'Reminder', reminder.text);
}

export interface DueReminderDependencies {
    remindersPath: string;
    messagesPath: string;
    now: Date;
    popDue?: typeof popDueReminders;
    reloadReminders(): void;
    reloadMessages(): void;
    info(message: string): void;
    warn(message: string): void;
}

export function processDueReminders(dependencies: DueReminderDependencies): Reminder[] {
    let due: Reminder[];
    try {
        due = (dependencies.popDue ?? popDueReminders)(dependencies.remindersPath, dependencies.now);
    } catch (error) {
        dependencies.warn(`[MSG] Reminder scan failed: ${error}`);
        return [];
    }
    for (const reminder of due) {
        try {
            enqueueReminder(dependencies.messagesPath, reminder);
            dependencies.info(`[MSG] Reminder "${reminder.id}" queued for session "${reminder.session}"`);
        } catch (error) {
            dependencies.warn(`[MSG] Reminder delivery failed for "${reminder.id}": ${error}`);
        }
    }
    if (due.length > 0) {
        dependencies.reloadReminders();
        dependencies.reloadMessages();
    }
    return due;
}