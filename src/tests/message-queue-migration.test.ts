// SPEC_CFG_STATEMIGRATION: union-read / write-current / remove-after-persist
// Tests for core messageQueue migration behavior.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let tmpDir: string;
let currentDir: string; // .jarvis/messages/
let legacyDir: string;  // .jarvis/

beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-mq-migration-'));
    currentDir = path.join(tmpDir, '.jarvis', 'messages');
    legacyDir = path.join(tmpDir, '.jarvis');
    fs.mkdirSync(currentDir, { recursive: true });

    vi.doMock('../../packages/core/src/engine/core/configPaths', () => ({
        getMessagesPath: () => path.join(currentDir, 'queue.json'),
        getMessageLogPath: () => path.join(currentDir, 'log.json'),
        getAutoDeliveryPath: () => path.join(currentDir, 'autodelivery.json'),
        getLegacyMessagesPath: () => path.join(legacyDir, 'messages.json'),
        getLegacyMessageLogPath: () => path.join(legacyDir, 'message-log.json'),
        getLegacyAutoDeliveryPath: () => path.join(legacyDir, 'autodelivery.json'),
        ensureMessagesDir: () => { fs.mkdirSync(currentDir, { recursive: true }); return currentDir; },
    }));
});

afterEach(() => {
    vi.resetModules();
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

vi.mock('vscode', () => ({
    workspace: {
        getConfiguration: () => ({ get: (_key: string, def: unknown) => def }),
        workspaceFolders: [{ uri: { fsPath: '/mock' } }],
    },
}));

describe('SPEC_CFG_STATEMIGRATION: queue union-read / write-current / remove', () => {
    it('union-read merges legacy + current, deduplicates by identity tuple', async () => {
        const shared = { destination: 'A', sender: 'B', text: 'dup', timestamp: '2026-01-01T00:00:00.000Z' };
        const legacyOnly = { destination: 'A', sender: 'B', text: 'old', timestamp: '2026-01-01T01:00:00.000Z' };
        const currentOnly = { destination: 'A', sender: 'B', text: 'new', timestamp: '2026-01-01T02:00:00.000Z' };

        fs.writeFileSync(path.join(legacyDir, 'messages.json'), JSON.stringify([shared, legacyOnly]));
        fs.writeFileSync(path.join(currentDir, 'queue.json'), JSON.stringify([shared, currentOnly]));

        const { readQueue } = await import('../../packages/core/src/engine/sessions/messageQueue');
        const result = readQueue(path.join(currentDir, 'queue.json'));

        expect(result).toHaveLength(3); // shared (deduped), legacyOnly, currentOnly
        expect(result.map(m => m.text)).toEqual(['dup', 'old', 'new']);
    });

    it('union-read orders by ascending timestamp', async () => {
        const m1 = { destination: 'A', sender: 'B', text: 'third', timestamp: '2026-01-03T00:00:00.000Z' };
        const m2 = { destination: 'A', sender: 'B', text: 'first', timestamp: '2026-01-01T00:00:00.000Z' };
        const m3 = { destination: 'A', sender: 'B', text: 'second', timestamp: '2026-01-02T00:00:00.000Z' };

        fs.writeFileSync(path.join(legacyDir, 'messages.json'), JSON.stringify([m1, m2]));
        fs.writeFileSync(path.join(currentDir, 'queue.json'), JSON.stringify([m3]));

        const { readQueue } = await import('../../packages/core/src/engine/sessions/messageQueue');
        const result = readQueue(path.join(currentDir, 'queue.json'));

        expect(result.map(m => m.text)).toEqual(['first', 'second', 'third']);
    });

    it('writeQueue removes legacy after persisting union to current path', async () => {
        const legacy = [{ destination: 'A', sender: 'B', text: 'old', timestamp: '2026-01-01T00:00:00.000Z' }];
        fs.writeFileSync(path.join(legacyDir, 'messages.json'), JSON.stringify(legacy));

        const { writeQueue } = await import('../../packages/core/src/engine/sessions/messageQueue');
        writeQueue(path.join(currentDir, 'queue.json'), legacy);

        expect(fs.existsSync(path.join(legacyDir, 'messages.json'))).toBe(false);
        expect(JSON.parse(fs.readFileSync(path.join(currentDir, 'queue.json'), 'utf8'))).toEqual(legacy);
    });

    it('popMessage union-reads then removes legacy after write', async () => {
        const m1 = { destination: 'X', sender: 'S', text: 'pop-me', timestamp: '2026-01-01T00:00:00.000Z' };
        fs.writeFileSync(path.join(legacyDir, 'messages.json'), JSON.stringify([m1]));

        const { popMessage } = await import('../../packages/core/src/engine/sessions/messageQueue');
        const result = popMessage(path.join(currentDir, 'queue.json'), 'X');

        expect(result.message?.text).toBe('pop-me');
        expect(result.remaining).toBe(0);
        expect(fs.existsSync(path.join(legacyDir, 'messages.json'))).toBe(false);
        expect(JSON.parse(fs.readFileSync(path.join(currentDir, 'queue.json'), 'utf8'))).toEqual([]);
    });

    it('steady state: no legacy file means no removal attempted', async () => {
        const m = [{ destination: 'A', sender: 'B', text: 'msg', timestamp: '2026-01-01T00:00:00.000Z' }];
        fs.writeFileSync(path.join(currentDir, 'queue.json'), JSON.stringify(m));

        const { readQueue } = await import('../../packages/core/src/engine/sessions/messageQueue');
        const result = readQueue(path.join(currentDir, 'queue.json'));

        expect(result).toEqual(m);
        // No legacy file existed, none created
        expect(fs.existsSync(path.join(legacyDir, 'messages.json'))).toBe(false);
    });
});

describe('SPEC_CFG_STATEMIGRATION: autodelivery union-read / write-current / remove', () => {
    it('union-read merges legacy + current, deduplicates', async () => {
        fs.writeFileSync(path.join(legacyDir, 'autodelivery.json'), JSON.stringify(['A', 'B']));
        fs.writeFileSync(path.join(currentDir, 'autodelivery.json'), JSON.stringify(['B', 'C']));

        const { readAutoDelivery } = await import('../../packages/core/src/engine/sessions/messageQueue');
        const result = readAutoDelivery();

        expect(result.sort()).toEqual(['A', 'B', 'C']);
    });

    it('addAutoDelivery persists union and removes legacy', async () => {
        fs.writeFileSync(path.join(legacyDir, 'autodelivery.json'), JSON.stringify(['A']));

        const { addAutoDelivery } = await import('../../packages/core/src/engine/sessions/messageQueue');
        addAutoDelivery('', 'B');

        expect(fs.existsSync(path.join(legacyDir, 'autodelivery.json'))).toBe(false);
        const written = JSON.parse(fs.readFileSync(path.join(currentDir, 'autodelivery.json'), 'utf8'));
        expect(written.sort()).toEqual(['A', 'B']);
    });

    it('removeAutoDelivery persists filtered union and removes legacy', async () => {
        fs.writeFileSync(path.join(legacyDir, 'autodelivery.json'), JSON.stringify(['A', 'B']));
        fs.writeFileSync(path.join(currentDir, 'autodelivery.json'), JSON.stringify(['C']));

        const { removeAutoDelivery } = await import('../../packages/core/src/engine/sessions/messageQueue');
        removeAutoDelivery('', 'A');

        expect(fs.existsSync(path.join(legacyDir, 'autodelivery.json'))).toBe(false);
        const written = JSON.parse(fs.readFileSync(path.join(currentDir, 'autodelivery.json'), 'utf8'));
        expect(written.sort()).toEqual(['B', 'C']);
    });
});

describe('SPEC_CFG_STATEMIGRATION: appendMessage log migration', () => {
    it('appendMessage union-reads log legacy, writes current, removes legacy log', async () => {
        const oldLog = { destination: 'X', sender: 'S', text: 'old-log', timestamp: '2026-01-01T00:00:00.000Z' };
        fs.writeFileSync(path.join(legacyDir, 'message-log.json'), JSON.stringify([oldLog]));

        const { appendMessage } = await import('../../packages/core/src/engine/sessions/messageQueue');
        appendMessage(path.join(currentDir, 'queue.json'), 'Y', 'T', 'new');

        // Legacy log removed
        expect(fs.existsSync(path.join(legacyDir, 'message-log.json'))).toBe(false);
        // Current log has both old and new
        const log = JSON.parse(fs.readFileSync(path.join(currentDir, 'log.json'), 'utf8'));
        expect(log).toHaveLength(2);
        expect(log[0].text).toBe('old-log');
        expect(log[1].text).toBe('new');
    });
});
