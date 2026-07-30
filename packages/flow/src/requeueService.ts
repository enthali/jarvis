// Implementation: SPEC_FLOW_REQUEUE, SPEC_CFG_STATEMIGRATION
// Requirements: REQ_FLOW_REQUEUE, REQ_CFG_STATEMIGRATION

import * as fs from 'fs';
import * as path from 'path';

export interface QueuedMessageCopy {
    destination: string;
    sender: string;
    text: string;
    timestamp: string;
}

/**
 * Appends `entry` to currentPath queue with full union-write-remove migration.
 * Extracted for testability (SPEC_CFG_STATEMIGRATION).
 */
export async function requeueWithMigration(
    currentPath: string,
    legacyPath: string | undefined,
    entry: QueuedMessageCopy
): Promise<void> {
    // Union read
    let current: QueuedMessageCopy[] = [];
    try { current = JSON.parse(await fs.promises.readFile(currentPath, 'utf-8')); } catch { current = []; }
    let legacy: QueuedMessageCopy[] = [];
    let legacyPresent = false;
    if (legacyPath) {
        try {
            legacy = JSON.parse(await fs.promises.readFile(legacyPath, 'utf-8'));
            legacyPresent = true;
        } catch {
            try { await fs.promises.access(legacyPath); legacyPresent = true; } catch { /* not present */ }
        }
    }

    // Merge (deduplicate by identity tuple)
    const identity = (m: QueuedMessageCopy) => `${m.destination}\x00${m.sender}\x00${m.text}\x00${m.timestamp}`;
    const seen = new Set(current.map(identity));
    const merged = [...current];
    for (const m of legacy) {
        const id = identity(m);
        if (!seen.has(id)) { seen.add(id); merged.push(m); }
    }
    merged.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Append new entry
    merged.push(entry);

    // Write current, remove legacy
    await fs.promises.mkdir(path.dirname(currentPath), { recursive: true });
    await fs.promises.writeFile(currentPath, JSON.stringify(merged, null, 2));
    if (legacyPresent && legacyPath) {
        try { await fs.promises.unlink(legacyPath); } catch { /* best-effort */ }
    }
}
