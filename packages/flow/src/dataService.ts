// Implementation: SPEC_FLOW_DATASERVICE, SPEC_CFG_STATEMIGRATION
// Requirements: REQ_FLOW_DATASOURCE, REQ_CFG_STATEMIGRATION

import * as fs from 'fs';
import { FlowData, FlowEdge, FlowMessageEntry } from './types';

/** Same {destination, sender, text, timestamp} shape as messages/queue.json / messages/log.json (SPEC_MSG_QUEUESTORE). */
export interface LoggedMessage {
    destination: string;
    sender: string;
    text: string;
    timestamp: string;
}

export const DEFAULT_CAP = 30;

/**
 * Tolerant reader for a single JSON array file — missing file or parse failure
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
 * Union read for the message log: merges current + legacy paths, deduplicates
 * by identity tuple, orders by ascending timestamp. Read-only consumer — never
 * removes legacy (SPEC_CFG_STATEMIGRATION: only writers remove).
 */
function unionReadLog(currentPath: string, legacyPath?: string): LoggedMessage[] {
    const current = readMessageLog(currentPath);
    if (!legacyPath) { return current; }
    const legacy = readMessageLog(legacyPath);
    if (legacy.length === 0 && !fs.existsSync(legacyPath)) { return current; }
    const identity = (m: LoggedMessage) => `${m.destination}\x00${m.sender}\x00${m.text}\x00${m.timestamp}`;
    const seen = new Set(current.map(identity));
    const merged = [...current];
    for (const e of legacy) {
        const id = identity(e);
        if (!seen.has(id)) { seen.add(id); merged.push(e); }
    }
    merged.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return merged;
}

/**
 * Groups capped entries by (sender, destination), computing count,
 * firstTimestamp/lastTimestamp (min/max), and sample (text of the
 * chronologically-last entry in the group) — AC-3.
 */
function aggregate(entries: LoggedMessage[]): { nodes: string[]; edges: FlowEdge[] } {
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
 * Reads messages/log.json (union with legacy) and aggregates into the node/edge
 * shape the renderer consumes. Read-only — never writes to the log.
 *
 * AC-1: missing/unparsable log -> { nodes: [], edges: [], entries: [] }, no thrown error.
 * AC-2: the entry cap is applied BEFORE aggregation (most recent
 *       cap entries, no time-based boundary).
 * AC-4: cap defaults to DEFAULT_CAP (30) for the first load.
 */
export function loadFlowData(logPath: string, cap: number = DEFAULT_CAP, legacyLogPath?: string): FlowData {
    const raw = unionReadLog(logPath, legacyLogPath);
    const capped = raw.slice(-cap);
    return {
        ...aggregate(capped),
        entries: capped.map(e => ({ sender: e.sender, destination: e.destination, timestamp: e.timestamp }))
    };
}

/**
 * SPEC_FLOW_LOGVIEWER: returns the raw, un-aggregated entry list in
 * reverse-chronological (newest first) order (AC-5) — reuses the existing
 * tolerant readMessageLog() reader as-is, no duplicated parse/empty-state
 * logic (AC-3). Union-reads legacy path (SPEC_CFG_STATEMIGRATION).
 */
export function loadMessageLogEntries(logPath: string, legacyLogPath?: string): LoggedMessage[] {
    const raw = unionReadLog(logPath, legacyLogPath);
    return [...raw].reverse();
}
