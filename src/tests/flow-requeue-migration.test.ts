// SPEC_CFG_STATEMIGRATION: flow requeueWithMigration full union-write-remove

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { requeueWithMigration } from '../../packages/flow/src/requeueService';

let tmpDir: string;
let currentPath: string;
let legacyPath: string;

beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-requeue-mig-'));
    currentPath = path.join(tmpDir, 'messages', 'queue.json');
    legacyPath = path.join(tmpDir, 'messages.json');
    fs.mkdirSync(path.dirname(currentPath), { recursive: true });
});

afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

describe('SPEC_CFG_STATEMIGRATION: flow requeueWithMigration union-write-remove', () => {
    it('writes to current path when no legacy exists', async () => {
        const entry = { destination: 'A', sender: 'B', text: 'msg', timestamp: '2026-01-01T00:00:00.000Z' };

        await requeueWithMigration(currentPath, legacyPath, entry);

        expect(fs.existsSync(currentPath)).toBe(true);
        const written = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
        expect(written).toEqual([entry]);
        expect(fs.existsSync(legacyPath)).toBe(false);
    });

    it('union-reads legacy + current, deduplicates by identity, appends new entry', async () => {
        const shared = { destination: 'A', sender: 'B', text: 'dup', timestamp: '2026-01-01T00:00:00.000Z' };
        const legacyOnly = { destination: 'A', sender: 'B', text: 'old', timestamp: '2026-01-01T01:00:00.000Z' };
        const currentOnly = { destination: 'A', sender: 'B', text: 'cur', timestamp: '2026-01-01T02:00:00.000Z' };
        const newEntry = { destination: 'A', sender: 'B', text: 'new', timestamp: '2026-01-01T03:00:00.000Z' };

        fs.writeFileSync(legacyPath, JSON.stringify([shared, legacyOnly]));
        fs.writeFileSync(currentPath, JSON.stringify([shared, currentOnly]));

        await requeueWithMigration(currentPath, legacyPath, newEntry);

        const written = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
        // shared deduped, legacyOnly + currentOnly + newEntry = 4
        expect(written).toHaveLength(4);
        expect(written.map((m: any) => m.text)).toEqual(['dup', 'old', 'cur', 'new']);
    });

    it('orders merged entries by ascending timestamp before appending new', async () => {
        const m1 = { destination: 'A', sender: 'B', text: 'third', timestamp: '2026-01-03T00:00:00.000Z' };
        const m2 = { destination: 'A', sender: 'B', text: 'first', timestamp: '2026-01-01T00:00:00.000Z' };
        const newEntry = { destination: 'A', sender: 'B', text: 'newest', timestamp: '2026-01-04T00:00:00.000Z' };

        fs.writeFileSync(legacyPath, JSON.stringify([m1]));
        fs.writeFileSync(currentPath, JSON.stringify([m2]));

        await requeueWithMigration(currentPath, legacyPath, newEntry);

        const written = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
        expect(written.map((m: any) => m.text)).toEqual(['first', 'third', 'newest']);
    });

    it('removes legacy file after persisting union to current path', async () => {
        const legacy = [{ destination: 'A', sender: 'B', text: 'old', timestamp: '2026-01-01T00:00:00.000Z' }];
        fs.writeFileSync(legacyPath, JSON.stringify(legacy));
        const newEntry = { destination: 'X', sender: 'Y', text: 'n', timestamp: '2026-01-02T00:00:00.000Z' };

        await requeueWithMigration(currentPath, legacyPath, newEntry);

        expect(fs.existsSync(legacyPath)).toBe(false);
        const written = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
        expect(written).toHaveLength(2);
    });

    it('empty legacy file (exists but empty array) still triggers removal', async () => {
        fs.writeFileSync(legacyPath, JSON.stringify([]));
        const entry = { destination: 'A', sender: 'B', text: 'x', timestamp: '2026-01-01T00:00:00.000Z' };

        await requeueWithMigration(currentPath, legacyPath, entry);

        expect(fs.existsSync(legacyPath)).toBe(false);
    });
});
