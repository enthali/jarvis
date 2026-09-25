import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

let root: string;
let messagesDir: string;
let queuePath: string;
let autoDeliveryPath: string;

vi.mock('vscode', () => ({
    workspace: {
        getConfiguration: () => ({ get: (_key: string, fallback: unknown) => fallback === true ? false : fallback }),
    },
}));

beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-reminder-delivery-'));
    messagesDir = path.join(root, '.jarvis', 'messages');
    queuePath = path.join(messagesDir, 'queue.json');
    autoDeliveryPath = path.join(messagesDir, 'autodelivery.json');
    fs.mkdirSync(messagesDir, { recursive: true });

    vi.doMock('../../packages/core/src/engine/core/configPaths', () => ({
        getMessagesPath: () => queuePath,
        getMessageLogPath: () => path.join(messagesDir, 'log.json'),
        getAutoDeliveryPath: () => autoDeliveryPath,
        getLegacyMessagesPath: () => path.join(root, '.jarvis', 'messages.json'),
        getLegacyMessageLogPath: () => path.join(root, '.jarvis', 'message-log.json'),
        getLegacyAutoDeliveryPath: () => path.join(root, '.jarvis', 'autodelivery.json'),
        ensureMessagesDir: () => messagesDir,
    }));
});

afterEach(() => {
    vi.resetModules();
    fs.rmSync(root, { recursive: true, force: true });
});

describe('REQ_MSG_REMINDERS_DELIVER AC-3: delivery preference ownership', () => {
    it('wires the poll callback to queue without auto-delivery enrollment', () => {
        const extensionSource = fs.readFileSync(
            path.resolve(__dirname, '..', '..', 'packages', 'core', 'src', 'extension.ts'),
            'utf8'
        );
        const reminderStart = extensionSource.indexOf('// Reminder delivery');
        const reminderEnd = extensionSource.indexOf('}, 5000)', reminderStart);
        const reminderCallback = extensionSource.slice(reminderStart, reminderEnd);

        expect(reminderCallback).toContain('processDueReminders({');
        expect(reminderCallback).not.toContain('addAutoDelivery');
        expect(reminderCallback).not.toContain('injectPrompt');
    });

    it('queues an Actor reminder without enrolling an OFF target', async () => {
        fs.writeFileSync(autoDeliveryPath, '[]', 'utf8');
        const { processDueReminders } = await import('../../packages/core/src/apps/session/reminderDelivery');
        const { writeReminders } = await import('../../packages/core/src/apps/session/reminders');
        const { readAutoDelivery, readQueue } = await import('../../packages/core/src/engine/sessions/messageQueue');
        const due = reminder('Closed Actor');
        writeReminders(path.join(root, 'reminders.yaml'), [due]);

        processDueReminders(processDependencies(root));

        expect(readQueue(queuePath)).toEqual([
            expect.objectContaining({ destination: 'Closed Actor', sender: 'Reminder', text: 'Wake up' }),
        ]);
        expect(readAutoDelivery()).toEqual([]);
    });

    it('queues an Actor reminder while preserving an ON target', async () => {
        fs.writeFileSync(autoDeliveryPath, JSON.stringify(['Auto Actor']), 'utf8');
        const { processDueReminders } = await import('../../packages/core/src/apps/session/reminderDelivery');
        const { writeReminders } = await import('../../packages/core/src/apps/session/reminders');
        const { readAutoDelivery, readQueue } = await import('../../packages/core/src/engine/sessions/messageQueue');
        const due = reminder('Auto Actor');
        writeReminders(path.join(root, 'reminders.yaml'), [due]);

        processDueReminders(processDependencies(root));

        expect(readQueue(queuePath)).toEqual([
            expect.objectContaining({ destination: 'Auto Actor', sender: 'Reminder', text: 'Wake up' }),
        ]);
        expect(readAutoDelivery()).toEqual(['Auto Actor']);
    });
});

function reminder(session: string) {
    return {
        id: 'reminder-1',
        text: 'Wake up',
        session,
        deliverAt: '2026-09-25T08:00:00.000Z',
        createdAt: '2026-09-25T07:00:00.000Z',
    };
}

function processDependencies(remindersRoot: string) {
    return {
        remindersPath: path.join(remindersRoot, 'reminders.yaml'),
        messagesPath: queuePath,
        now: new Date('2026-09-25T08:01:00.000Z'),
        reloadReminders: vi.fn(),
        reloadMessages: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    };
}