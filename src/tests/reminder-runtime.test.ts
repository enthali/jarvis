import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type * as vscode from 'vscode';
import { LanguageModelTextPart } from './__mocks__/vscode';
import { processDueReminders } from '../../packages/core/src/apps/session/reminderDelivery';
import {
    createCancelReminderHandler,
    createListRemindersHandler,
    createSetReminderHandler,
    findReminderLine,
    type ReminderToolDependencies,
} from '../../packages/core/src/apps/session/reminderRuntime';
import { popDueReminders, readReminders, writeReminders, type Reminder } from '../../packages/core/src/apps/session/reminders';
import { RemindersTreeProvider } from '../../packages/core/src/apps/session/remindersTreeProvider';

let root: string;
let remindersPath: string;
let messagesPath: string;
let reload: ReturnType<typeof vi.fn>;
let info: ReturnType<typeof vi.fn>;
const now = new Date('2026-09-25T10:00:00.000Z');

vi.mock('../../packages/core/src/engine/core/configPaths', () => ({
    getMessagesPath: () => messagesPath,
    getMessageLogPath: () => path.join(root, 'message-log.json'),
    getAutoDeliveryPath: () => path.join(root, 'autodelivery.json'),
    getLegacyMessagesPath: () => undefined,
    getLegacyMessageLogPath: () => undefined,
    getLegacyAutoDeliveryPath: () => undefined,
    ensureMessagesDir: () => root,
    getRemindersPath: () => remindersPath,
}));

beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-reminder-runtime-'));
    remindersPath = path.join(root, 'reminders.yaml');
    messagesPath = path.join(root, 'queue.json');
    reload = vi.fn();
    info = vi.fn();
});

afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
});

describe('T-1/T-4/T-5: registered reminder tool callbacks', () => {
    it('registers the production handler factories for all three LM tools', () => {
        const extensionSource = fs.readFileSync(
            path.resolve(__dirname, '..', '..', 'packages', 'core', 'src', 'extension.ts'),
            'utf8'
        );

        expect(extensionSource).toContain("engine.registerTool('jarvis_setReminder'");
        expect(extensionSource).toContain('createSetReminderHandler(reminderToolDependencies)');
        expect(extensionSource).toContain("engine.registerTool('jarvis_listReminders'");
        expect(extensionSource).toContain('createListRemindersHandler(reminderToolDependencies)');
        expect(extensionSource).toContain("engine.registerTool('jarvis_cancelReminder'");
        expect(extensionSource).toContain('createCancelReminderHandler(reminderToolDependencies)');
    });

    it('returns id/deliverAt, reloads the tree, and rejects past timestamps', async () => {
        const handler = createSetReminderHandler(dependencies());
        const deliverAt = '2026-09-25T10:05:00.000Z';

        const created = await invoke(handler, { text: 'Future', session: 'TestTarget', deliverAt });

        expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(created.deliverAt).toBe(deliverAt);
        expect(readReminders(remindersPath)).toEqual([
            expect.objectContaining({ id: created.id, text: 'Future', session: 'TestTarget', deliverAt }),
        ]);
        expect(reload).toHaveBeenCalledOnce();

        const rejected = await invoke(handler, {
            text: 'Past', session: 'TestTarget', deliverAt: '2026-09-25T09:59:59.000Z',
        });
        expect(rejected).toEqual({ error: 'deliverAt must be in the future' });
        expect(readReminders(remindersPath)).toHaveLength(1);
    });

    it('lists authoritative wrapped shape and excludes removed reminders', async () => {
        const pending = reminder('pending', 'Pending', '2026-09-25T10:02:00.000Z');
        writeReminders(remindersPath, [pending]);
        const handler = createListRemindersHandler(dependencies());

        const payload = await invoke(handler, {});

        expect(payload).toEqual({ reminders: [{ ...pending, remainingMs: 120_000 }] });
    });

    it('returns cancelled/not_found and a cancelled reminder never queues', async () => {
        const pending = reminder('cancel-me', 'Cancelled', '2026-09-25T10:01:00.000Z');
        writeReminders(remindersPath, [pending]);
        const handler = createCancelReminderHandler(dependencies());

        expect(await invoke(handler, { id: pending.id })).toEqual({ status: 'cancelled' });
        expect(await invoke(handler, { id: pending.id })).toEqual({ status: 'not_found' });
        expect(readReminders(remindersPath)).toEqual([]);

        processDueReminders(dueDependencies(new Date('2026-09-25T10:02:00.000Z')));
        expect(fs.existsSync(messagesPath)).toBe(false);
    });
});

describe('T-2/T-3/T-6/T-7: persistence and due processing', () => {
    it('survives a provider reload and exposes a sidebar node', () => {
        const pending = reminder('persisted', 'Persisted reminder', '2026-09-25T10:05:00.000Z');
        writeReminders(remindersPath, [pending]);

        const providerAfterReload = new RemindersTreeProvider(() => remindersPath);
        const nodes = providerAfterReload.getChildren();
        const item = providerAfterReload.getTreeItem(nodes[0]);

        expect(nodes).toEqual([{ kind: 'reminder', reminder: pending }]);
        expect(item.label).toContain('Persisted reminder');
        expect(item.command).toEqual({
            command: 'jarvis.openReminderFile',
            title: 'Open in reminders file',
            arguments: [nodes[0]],
        });
    });

    it('queues overdue reminders on the next processor call, removes them, and refreshes both trees', () => {
        const overdue = reminder('overdue', 'Overdue', '2026-09-25T09:59:50.000Z');
        const future = reminder('future', 'Future', '2026-09-25T10:05:00.000Z');
        writeReminders(remindersPath, [overdue, future]);
        const deps = dueDependencies(now);

        const due = processDueReminders(deps);

        expect(due).toEqual([overdue]);
        expect(readReminders(remindersPath)).toEqual([future]);
        expect(JSON.parse(fs.readFileSync(messagesPath, 'utf8'))).toEqual([
            expect.objectContaining({ destination: 'TestTarget', sender: 'Reminder', text: 'Overdue' }),
        ]);
        expect(deps.reloadReminders).toHaveBeenCalledOnce();
        expect(deps.reloadMessages).toHaveBeenCalledOnce();
        expect(deps.warn).not.toHaveBeenCalled();
    });

    it('contains a pop/write failure and retries cleanly on the next tick', () => {
        const overdue = reminder('retry', 'Retry after write failure', '2026-09-25T09:59:50.000Z');
        writeReminders(remindersPath, [overdue]);
        const popDue = vi.fn()
            .mockImplementationOnce(() => { throw new Error('writeReminders failed'); })
            .mockImplementation((filePath: string, at: Date) => popDueReminders(filePath, at));
        const deps = { ...dueDependencies(now), popDue };

        expect(processDueReminders(deps)).toEqual([]);
        expect(deps.warn).toHaveBeenCalledWith('[MSG] Reminder scan failed: Error: writeReminders failed');
        expect(fs.existsSync(messagesPath)).toBe(false);
        expect(readReminders(remindersPath)).toEqual([overdue]);
        expect(deps.reloadReminders).not.toHaveBeenCalled();
        expect(deps.reloadMessages).not.toHaveBeenCalled();

        expect(processDueReminders(deps)).toEqual([overdue]);
        expect(readReminders(remindersPath)).toEqual([]);
        expect(JSON.parse(fs.readFileSync(messagesPath, 'utf8'))).toEqual([
            expect.objectContaining({ destination: 'TestTarget', text: 'Retry after write failure' }),
        ]);
    });
});

describe('T-8: click-to-file line targeting', () => {
    it('finds the matching id line and falls back to the first line when absent', () => {
        const lines = ['reminders:', '  - id: first', '    text: One', '  - id: target-id', '    text: Two'];

        expect(findReminderLine(lines, 'target-id')).toBe(3);
        expect(findReminderLine(lines, 'missing')).toBe(0);
    });
});

function dependencies(): ReminderToolDependencies {
    return {
        remindersPath: () => remindersPath,
        reload,
        info,
        now: () => now,
    };
}

function dueDependencies(at: Date) {
    return {
        remindersPath,
        messagesPath,
        now: at,
        reloadReminders: vi.fn(),
        reloadMessages: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    };
}

function reminder(id: string, text: string, deliverAt: string): Reminder {
    return { id, text, session: 'TestTarget', deliverAt, createdAt: '2026-09-25T09:00:00.000Z' };
}

async function invoke(handler: (options: vscode.LanguageModelToolInvocationOptions<unknown>, token: vscode.CancellationToken) => Promise<vscode.LanguageModelToolResult>, input: unknown) {
    const result = await handler(
        { input } as vscode.LanguageModelToolInvocationOptions<unknown>,
        {} as vscode.CancellationToken,
    );
    return JSON.parse((result.content[0] as LanguageModelTextPart).value);
}