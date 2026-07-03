// Implementation: SPEC_FLOW_DATASERVICE
// Requirements: REQ_FLOW_DATASOURCE

import * as fs from 'fs';
import { FlowData, FlowEdge } from './types';

/** Same {destination, sender, text, timestamp} shape as messages.json/message-log.json (SPEC_MSG_QUEUESTORE). */
interface LoggedMessage {
    destination: string;
    sender: string;
    text: string;
    timestamp: string;
}

const MAX_ENTRIES = 500;

/**
 * Tolerant reader for message-log.json — mirrors the existing
 * readQueue()/SPEC_MSG_QUEUESTORE pattern: missing file or parse failure
 * both resolve to an empty array, never a thrown error (AC-1).
 */
function readMessageLog(logPath: string): LoggedMessage[] {
    if (!fs.existsSync(logPath)) { return []; }
    try {
        const raw = fs.readFileSync(logPath, 'utf8');
        return JSON.parse(raw) as LoggedMessage[];
    } catch {
        return [];
    }
}

/**
 * Groups capped entries by (sender, destination), computing count,
 * firstTimestamp/lastTimestamp (min/max), and sample (text of the
 * chronologically-last entry in the group) — AC-3.
 */
function aggregate(entries: LoggedMessage[]): FlowData {
    const nodeSet = new Set<string>();
    const groups = new Map<string, FlowEdge & { lastTime: number }>();

    for (const entry of entries) {
        nodeSet.add(entry.sender);
        nodeSet.add(entry.destination);

        const key = `${entry.sender}\u0000${entry.destination}`;
        const entryTime = Date.parse(entry.timestamp);
        const existing = groups.get(key);
        if (!existing) {
            groups.set(key, {
                source: entry.sender,
                target: entry.destination,
                count: 1,
                firstTimestamp: entry.timestamp,
                lastTimestamp: entry.timestamp,
                sample: entry.text,
                lastTime: entryTime,
            });
            continue;
        }
        existing.count += 1;
        if (Date.parse(entry.timestamp) < Date.parse(existing.firstTimestamp)) {
            existing.firstTimestamp = entry.timestamp;
        }
        if (entryTime >= existing.lastTime) {
            existing.lastTimestamp = entry.timestamp;
            existing.sample = entry.text;
            existing.lastTime = entryTime;
        }
    }

    const edges: FlowEdge[] = Array.from(groups.values()).map(({ lastTime, ...edge }) => edge);
    return { nodes: Array.from(nodeSet), edges };
}

/**
 * Reads message-log.json and aggregates it into the node/edge shape the
 * renderer consumes. Read-only — never writes to the log.
 *
 * AC-1: missing/unparsable log -> { nodes: [], edges: [] }, no thrown error.
 * AC-2: the 500-entry cap is applied BEFORE aggregation (most recent
 *       MAX_ENTRIES, no time-based boundary).
 */
export function loadFlowData(logPath: string): FlowData {
    const raw = readMessageLog(logPath);
    const capped = raw.slice(-MAX_ENTRIES);
    return aggregate(capped);
}
