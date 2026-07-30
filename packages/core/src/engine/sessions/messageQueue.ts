// Implementation: SPEC_MSG_QUEUESTORE, SPEC_CFG_STATEMIGRATION
// Requirements: REQ_MSG_QUEUE, REQ_CFG_MSGDIR, REQ_CFG_PATHSINGLESOURCE

import * as fs from 'fs';
import * as vscode from 'vscode';
import {
    getMessagesPath, getMessageLogPath, getAutoDeliveryPath,
    getLegacyMessagesPath, getLegacyMessageLogPath, getLegacyAutoDeliveryPath,
    ensureMessagesDir
} from '../core/configPaths';

export interface QueuedMessage {
    destination: string; // target chat tab label
    sender: string;      // originating session or component
    text: string;        // message content
    timestamp: string;   // ISO 8601
    notified?: boolean;  // true after auto-delivery notification sent
}

// --- Internal helpers: tolerant single-path read ---

function readJsonArray<T>(filePath: string | undefined): T[] {
    if (!filePath || !fs.existsSync(filePath)) { return []; }
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T[];
    } catch {
        return [];
    }
}

function tryUnlink(filePath: string | undefined): void {
    if (!filePath) { return; }
    try { fs.unlinkSync(filePath); } catch { /* best-effort */ }
}

// --- Union read / write-current / remove-after-persist (SPEC_CFG_STATEMIGRATION) ---

function messageIdentity(m: QueuedMessage): string {
    return `${m.destination}\x00${m.sender}\x00${m.text}\x00${m.timestamp}`;
}

/**
 * Union read for QueuedMessage arrays: merges current + legacy, deduplicates
 * by identity, orders by ascending timestamp.
 */
function unionReadQueue(currentPath: string | undefined, legacyPath: string | undefined): { entries: QueuedMessage[]; legacyPresent: boolean } {
    const current = readJsonArray<QueuedMessage>(currentPath);
    const legacy = readJsonArray<QueuedMessage>(legacyPath);
    const legacyPresent = legacy.length > 0 || (!!legacyPath && fs.existsSync(legacyPath));
    if (!legacyPresent) { return { entries: current, legacyPresent: false }; }
    const seen = new Set(current.map(messageIdentity));
    const merged = [...current];
    for (const e of legacy) {
        const id = messageIdentity(e);
        if (!seen.has(id)) { seen.add(id); merged.push(e); }
    }
    merged.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return { entries: merged, legacyPresent: true };
}

/**
 * Union read for autodelivery (string set).
 */
function unionReadAutoDelivery(currentPath: string | undefined, legacyPath: string | undefined): { entries: string[]; legacyPresent: boolean } {
    const current = readJsonArray<string>(currentPath);
    const legacy = readJsonArray<string>(legacyPath);
    const legacyPresent = legacy.length > 0 || (!!legacyPath && fs.existsSync(legacyPath));
    if (!legacyPresent) { return { entries: current, legacyPresent: false }; }
    const merged = [...new Set([...current, ...legacy])];
    return { entries: merged, legacyPresent: true };
}

function writeAndRemoveLegacy(currentPath: string, legacyPath: string | undefined, data: unknown, legacyPresent: boolean): void {
    ensureMessagesDir();
    fs.writeFileSync(currentPath, JSON.stringify(data, null, 2));
    if (legacyPresent) { tryUnlink(legacyPath); }
}

// --- Public API ---

export function readQueue(filePath: string): QueuedMessage[] {
    const { entries } = unionReadQueue(filePath, getLegacyMessagesPath());
    return entries;
}

export function writeQueue(messagesPath: string, messages: QueuedMessage[]): void {
    writeAndRemoveLegacy(messagesPath, getLegacyMessagesPath(), messages, fs.existsSync(getLegacyMessagesPath() ?? ''));
}

export function readAutoDelivery(_messagesPath?: string): string[] {
    const { entries } = unionReadAutoDelivery(getAutoDeliveryPath(), getLegacyAutoDeliveryPath());
    return entries;
}

export function addAutoDelivery(_messagesPath: string, sessionName: string): void {
    const { entries, legacyPresent } = unionReadAutoDelivery(getAutoDeliveryPath(), getLegacyAutoDeliveryPath());
    if (entries.includes(sessionName)) { return; }
    entries.push(sessionName);
    const adPath = getAutoDeliveryPath()!;
    writeAndRemoveLegacy(adPath, getLegacyAutoDeliveryPath(), entries, legacyPresent);
}

export function removeAutoDelivery(_messagesPath: string, sessionName: string): void {
    const { entries, legacyPresent } = unionReadAutoDelivery(getAutoDeliveryPath(), getLegacyAutoDeliveryPath());
    const filtered = entries.filter(s => s !== sessionName);
    const adPath = getAutoDeliveryPath()!;
    writeAndRemoveLegacy(adPath, getLegacyAutoDeliveryPath(), filtered, legacyPresent);
}

export function appendMessage(filePath: string, destination: string, sender: string, text: string): void {
    const message: QueuedMessage = { destination, sender, text, timestamp: new Date().toISOString() };
    const { entries: queue, legacyPresent } = unionReadQueue(filePath, getLegacyMessagesPath());
    queue.push(message);
    writeAndRemoveLegacy(filePath, getLegacyMessagesPath(), queue, legacyPresent);
    if (vscode.workspace.getConfiguration('jarvis').get<boolean>('messages.logging', true)) {
        const logPath = getMessageLogPath()!;
        const { entries: log, legacyPresent: logLegacy } = unionReadQueue(logPath, getLegacyMessageLogPath());
        log.push(message);
        writeAndRemoveLegacy(logPath, getLegacyMessageLogPath(), log, logLegacy);
    }
}

export function deleteMessage(filePath: string, index: number): void {
    const { entries: queue, legacyPresent } = unionReadQueue(filePath, getLegacyMessagesPath());
    queue.splice(index, 1);
    writeAndRemoveLegacy(filePath, getLegacyMessagesPath(), queue, legacyPresent);
}

export function deleteByDestination(filePath: string, destination: string): void {
    const { entries: queue, legacyPresent } = unionReadQueue(filePath, getLegacyMessagesPath());
    const filtered = queue.filter(m => m.destination !== destination);
    writeAndRemoveLegacy(filePath, getLegacyMessagesPath(), filtered, legacyPresent);
}

// Implementation: SPEC_MSG_QUEUESTORE
// Requirements: REQ_MSG_READ
export function popMessage(filePath: string, destination: string): { message: QueuedMessage | null; remaining: number } {
    const { entries: queue, legacyPresent } = unionReadQueue(filePath, getLegacyMessagesPath());
    const idx = queue.findIndex(m => m.destination === destination);
    if (idx === -1) { return { message: null, remaining: 0 }; }
    const [message] = queue.splice(idx, 1);
    const remaining = queue.filter(m => m.destination === destination).length;
    writeAndRemoveLegacy(filePath, getLegacyMessagesPath(), queue, legacyPresent);
    return { message, remaining };
}
