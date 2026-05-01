// Implementation: SPEC_MSG_QUEUESTORE
// Requirements: REQ_MSG_QUEUE, REQ_CFG_MSGPATH

import * as fs from 'fs';
import * as path from 'path';

export interface QueuedMessage {
    destination: string; // target chat tab label
    sender: string;      // originating session or component
    text: string;        // message content
    timestamp: string;   // ISO 8601
    notified?: boolean;  // true after auto-delivery notification sent
}

export function readQueue(filePath: string): QueuedMessage[] {
    if (!fs.existsSync(filePath)) { return []; }
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw) as QueuedMessage[];
    } catch {
        return [];
    }
}

export function writeQueue(messagesPath: string, messages: QueuedMessage[]): void {
    fs.mkdirSync(path.dirname(messagesPath), { recursive: true });
    fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));
}

function resolveAutoDeliveryPath(messagesPath: string): string {
    return path.join(path.dirname(messagesPath), 'autodelivery.json');
}

export function readAutoDelivery(messagesPath: string): string[] {
    const adPath = resolveAutoDeliveryPath(messagesPath);
    if (!fs.existsSync(adPath)) { return []; }
    try {
        const raw = fs.readFileSync(adPath, 'utf8');
        return JSON.parse(raw) as string[];
    } catch {
        return [];
    }
}

export function addAutoDelivery(messagesPath: string, sessionName: string): void {
    const adPath = resolveAutoDeliveryPath(messagesPath);
    const list = readAutoDelivery(messagesPath);
    if (!list.includes(sessionName)) {
        list.push(sessionName);
        fs.mkdirSync(path.dirname(adPath), { recursive: true });
        fs.writeFileSync(adPath, JSON.stringify(list, null, 2));
    }
}

export function removeAutoDelivery(messagesPath: string, sessionName: string): void {
    const adPath = resolveAutoDeliveryPath(messagesPath);
    const list = readAutoDelivery(messagesPath).filter(s => s !== sessionName);
    fs.mkdirSync(path.dirname(adPath), { recursive: true });
    fs.writeFileSync(adPath, JSON.stringify(list, null, 2));
}

export function appendMessage(filePath: string, destination: string, sender: string, text: string): void {
    const queue = readQueue(filePath);
    queue.push({ destination, sender, text, timestamp: new Date().toISOString() });
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(queue, null, 2));
}

export function deleteMessage(filePath: string, index: number): void {
    const queue = readQueue(filePath);
    queue.splice(index, 1);
    fs.writeFileSync(filePath, JSON.stringify(queue, null, 2));
}

export function deleteByDestination(filePath: string, destination: string): void {
    const queue = readQueue(filePath).filter(m => m.destination !== destination);
    fs.writeFileSync(filePath, JSON.stringify(queue, null, 2));
}

// Implementation: SPEC_MSG_QUEUESTORE
// Requirements: REQ_MSG_READ
export function popMessage(filePath: string, destination: string): { message: QueuedMessage | null; remaining: number } {
    const queue = readQueue(filePath);
    const idx = queue.findIndex(m => m.destination === destination);
    if (idx === -1) { return { message: null, remaining: 0 }; }
    const [message] = queue.splice(idx, 1);
    const remaining = queue.filter(m => m.destination === destination).length;
    fs.writeFileSync(filePath, JSON.stringify(queue, null, 2));
    return { message, remaining };
}
