// Implementation: SPEC_MSG_REMINDERSTORE
// Requirements: REQ_MSG_REMINDERS_PERSIST

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as yaml from 'js-yaml';
import * as vscode from 'vscode';

export interface Reminder {
    id: string;
    text: string;
    session: string;
    deliverAt: string;
    createdAt: string;
}

let log: vscode.LogOutputChannel | undefined;

export function setRemindersLogger(logger: vscode.LogOutputChannel): void {
    log = logger;
}

export function resolveRemindersPath(messagesPath: string): string {
    return path.join(path.dirname(messagesPath), 'reminders.yaml');
}

export function readReminders(filePath: string): Reminder[] {
    if (!fs.existsSync(filePath)) { return []; }
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = yaml.load(raw) as { reminders?: Reminder[] } | null;
        return parsed?.reminders ?? [];
    } catch {
        log?.warn('[MSG] reminders.yaml malformed — falling back to empty list');
        return [];
    }
}

export function writeReminders(filePath: string, list: Reminder[]): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, yaml.dump({ reminders: list }));
}

export function addReminder(
    filePath: string,
    text: string,
    session: string,
    deliverAt: string
): Reminder {
    const reminder: Reminder = {
        id: crypto.randomUUID(),
        text,
        session,
        deliverAt,
        createdAt: new Date().toISOString(),
    };
    const list = readReminders(filePath);
    list.push(reminder);
    writeReminders(filePath, list);
    return reminder;
}

export function removeReminder(filePath: string, id: string): boolean {
    const list = readReminders(filePath);
    const next = list.filter(r => r.id !== id);
    if (next.length === list.length) { return false; }
    writeReminders(filePath, next);
    return true;
}

export function popDueReminders(filePath: string, now: Date): Reminder[] {
    const list = readReminders(filePath);
    const due = list.filter(r => new Date(r.deliverAt) <= now);
    if (due.length === 0) { return []; }
    const remaining = list.filter(r => new Date(r.deliverAt) > now);
    writeReminders(filePath, remaining);
    return due;
}
