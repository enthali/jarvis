// SPEC_CFG_STATEMIGRATION: flow dataService union-read (read-only, never remove)

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadFlowData, loadMessageLogEntries } from '../../packages/flow/src/dataService';

let tmpDir: string;
let currentLog: string;
let legacyLog: string;

beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-flow-mig-'));
    currentLog = path.join(tmpDir, 'messages', 'log.json');
    legacyLog = path.join(tmpDir, 'message-log.json');
    fs.mkdirSync(path.dirname(currentLog), { recursive: true });
});

afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

describe('SPEC_CFG_STATEMIGRATION: flow dataService union-read log', () => {
    it('union-reads current + legacy, deduplicates by identity tuple', () => {
        const shared = { destination: 'A', sender: 'B', text: 'dup', timestamp: '2026-01-01T00:00:00.000Z' };
        const legacyOnly = { destination: 'A', sender: 'B', text: 'old', timestamp: '2026-01-01T01:00:00.000Z' };
        const currentOnly = { destination: 'A', sender: 'B', text: 'new', timestamp: '2026-01-01T02:00:00.000Z' };

        fs.writeFileSync(legacyLog, JSON.stringify([shared, legacyOnly]));
        fs.writeFileSync(currentLog, JSON.stringify([shared, currentOnly]));

        const result = loadFlowData(currentLog, 30, legacyLog);
        // 3 unique entries, not 4
        expect(result.entries).toHaveLength(3);
    });

    it('union-read orders by ascending timestamp', () => {
        const m1 = { destination: 'A', sender: 'B', text: 'third', timestamp: '2026-01-03T00:00:00.000Z' };
        const m2 = { destination: 'A', sender: 'B', text: 'first', timestamp: '2026-01-01T00:00:00.000Z' };

        fs.writeFileSync(legacyLog, JSON.stringify([m1]));
        fs.writeFileSync(currentLog, JSON.stringify([m2]));

        const entries = loadMessageLogEntries(currentLog, legacyLog);
        // Reverse-chronological for logviewer
        expect(entries[0].text).toBe('third');
        expect(entries[1].text).toBe('first');
    });

    it('never removes legacy file (read-only consumer)', () => {
        fs.writeFileSync(legacyLog, JSON.stringify([{ destination: 'A', sender: 'B', text: 'x', timestamp: '2026-01-01T00:00:00.000Z' }]));

        loadFlowData(currentLog, 30, legacyLog);
        loadMessageLogEntries(currentLog, legacyLog);

        expect(fs.existsSync(legacyLog)).toBe(true);
    });

    it('steady state: no legacy path -> works normally', () => {
        const m = { destination: 'A', sender: 'B', text: 'msg', timestamp: '2026-01-01T00:00:00.000Z' };
        fs.writeFileSync(currentLog, JSON.stringify([m]));

        const result = loadFlowData(currentLog, 30);
        expect(result.entries).toHaveLength(1);
    });
});
