// Implementation: SPEC_MSG_QUEUESTORE
// Requirements: REQ_MSG_QUEUE, REQ_CFG_MSGPATH

import * as fs from 'fs';
import * as path from 'path';

export interface QueuedMessage {
    destination: string; // target chat tab label
    sender: string;      // originating session or component
    text: string;        // message content
    timestamp: string;   // ISO 8601
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
