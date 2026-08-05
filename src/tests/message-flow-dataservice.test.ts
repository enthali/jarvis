/**
 * message-flow-diagram CR
 * REQ_FLOW_DATASOURCE (SPEC_FLOW_DATASERVICE): 30-entry cap, tolerant
 * missing/unparsable log handling, and (sender, destination) aggregation.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadFlowData } from '../../packages/flow/src/dataService';

function tmpLogPath(): string {
    const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-flow-test-')), 'messages', 'log.json');
    fs.mkdirSync(path.dirname(p), { recursive: true });
    return p;
}

describe('SPEC_FLOW_DATASERVICE: loadFlowData', () => {
    it('AC-1: missing log.json -> empty { nodes: [], edges: [], entries: [] }, no throw', () => {
        const logPath = path.join(os.tmpdir(), 'jarvis-flow-does-not-exist', 'messages', 'log.json');
        const result = loadFlowData(logPath);
        expect(result).toEqual({ nodes: [], edges: [], entries: [] });
    });

    it('AC-1: unparsable log.json -> empty { nodes: [], edges: [], entries: [] }, no throw', () => {
        const logPath = tmpLogPath();
        fs.writeFileSync(logPath, '{not valid json');
        const result = loadFlowData(logPath);
        expect(result).toEqual({ nodes: [], edges: [], entries: [] });
    });

    it('AC-3: aggregates by (sender, destination) with count/first/last/sample', () => {
        const logPath = tmpLogPath();
        const entries = [
            { destination: 'B', sender: 'A', text: 'first', timestamp: '2026-01-01T00:00:00.000Z' },
            { destination: 'B', sender: 'A', text: 'second', timestamp: '2026-01-03T00:00:00.000Z' },
            { destination: 'B', sender: 'A', text: 'middle', timestamp: '2026-01-02T00:00:00.000Z' },
        ];
        fs.writeFileSync(logPath, JSON.stringify(entries));
        const result = loadFlowData(logPath);
        expect(result.nodes.sort()).toEqual(['A', 'B']);
        expect(result.edges).toHaveLength(1);
        const edge = result.edges[0];
        expect(edge.source).toBe('A');
        expect(edge.target).toBe('B');
        expect(edge.count).toBe(3);
        expect(edge.firstTimestamp).toBe('2026-01-01T00:00:00.000Z');
        expect(edge.lastTimestamp).toBe('2026-01-03T00:00:00.000Z');
        expect(edge.sample).toBe('second'); // text of the chronologically-last entry
    });

    it('AC-3: distinct (sender, destination) pairs produce distinct directional edges', () => {
        const logPath = tmpLogPath();
        const entries = [
            { destination: 'B', sender: 'A', text: 'a-to-b', timestamp: '2026-01-01T00:00:00.000Z' },
            { destination: 'A', sender: 'B', text: 'b-to-a', timestamp: '2026-01-01T00:00:01.000Z' },
        ];
        fs.writeFileSync(logPath, JSON.stringify(entries));
        const result = loadFlowData(logPath);
        expect(result.edges).toHaveLength(2);
    });

    it('AC-2/AC-4: 30-entry cap excludes older entries — fixture file (T-4)', () => {
        const fixturePath = path.resolve(__dirname, '../../testdata/messages/message-log-flow-cap.json');
        const result = loadFlowData(fixturePath);
        // "old-only-sender" appears only in the oldest 20 of 520 entries —
        // the 30-entry cap (stricter than the old 500-entry cap) must exclude all of them.
        expect(result.nodes).not.toContain('old-only-sender');
        expect(result.nodes).not.toContain('Archivist');
        expect(result.edges.every(e => e.source !== 'old-only-sender' && e.target !== 'old-only-sender')).toBe(true);
    });

    it('sample fixture (T-5/T-6): both known sessions appear as nodes with a directional edge', () => {
        const fixturePath = path.resolve(__dirname, '../../testdata/messages/message-log-flow-sample.json');
        const result = loadFlowData(fixturePath);
        expect(result.nodes).toEqual(expect.arrayContaining(['Dev Engineer', 'Change Manager']));
        expect(result.edges.length).toBeGreaterThan(0);
    });
});
