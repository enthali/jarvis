// settle-draft-specifications CR, written from the specification.
// Zero draft/open Needs; macOS wording; Flow requeue notifications (REQ_FLOW_REQUEUE AC-4/5,
// SPEC_FLOW_REQUEUE AC-6); heartbeat scanner wiring and start-time validation
// (SPEC_AUT_HEARTBEAT_LOAD_VALIDATION, REQ_AUT_HEARTBEAT_LOAD_VALIDATION AC-4,
// REQ_AUT_HEARTBEAT_VALIDATION_NOREGRESSION AC-4, US_AUT_HEARTBEAT_VALIDATION AC-1/AC-5).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import { activateHeartbeat } from '../../packages/core/src/apps/session/heartbeat';
import { activate as activateFlow } from '../../packages/flow/src/extension';

const root = path.resolve(__dirname, '../..');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');

function rstFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { return ['changes', '_build', 'node_modules'].includes(e.name) ? [] : rstFiles(full); }
        return e.name.endsWith('.rst') ? [full] : [];
    });
}

describe('settled specifications: no Need is left draft or open', () => {
    it('no Need in docs/**/*.rst (outside docs/changes) carries :status: draft or :status: open', () => {
        const offenders = rstFiles(path.join(root, 'docs')).flatMap(f =>
            fs.readFileSync(f, 'utf8').split(/\r?\n/)
                .map((line, i) => ({ line, n: i + 1 }))
                .filter(x => /^\s*:status:\s*(draft|open)\s*$/.test(x.line))
                .map(x => `${path.relative(root, f)}:${x.n}`));
        expect(offenders).toEqual([]);
    });
});

describe('macOS verification wording in the Core docs', () => {
    for (const rel of ['docs/user guides/core.md', 'packages/core/README.md']) {
        it(`${rel} states macOS verified on 2026-11-24 and WSL/SSH unverified`, () => {
            const text = read(rel);
            expect(text).toMatch(/On macOS, the User verified on 2026-11-24 that Jarvis worked without issues/);
            expect(text).toMatch(/WSL and SSH were not verified/);
            expect(text).not.toMatch(/macOS[^.]*(not verified|unverified|untested)/i);
        });
    }
});

describe('REQ_FLOW_REQUEUE AC-4/AC-5: requeue shows a notification', () => {
    let handler: ((msg: any) => void) | undefined;
    let posted: any[];
    let tmp: string;

    beforeEach(() => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-flow-requeue-'));
        (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: tmp } }];
        posted = [];
        handler = undefined;
        const panel = {
            webview: {
                html: '', asWebviewUri: (u: unknown) => u, cspSource: '',
                postMessage: (m: unknown) => { posted.push(m); return Promise.resolve(true); },
                onDidReceiveMessage: (fn: (m: unknown) => void) => { handler = fn; return { dispose() {} }; },
            },
            onDidDispose: () => ({ dispose() {} }), reveal() {}, visible: true,
        };
        (vscode.window as any).createWebviewPanel = vi.fn(() => panel);
        (vscode.window as any).createOutputChannel = () => ({ dispose() {}, info() {}, warn() {}, error() {} });
        (vscode.Uri as any).joinPath ??= () => ({});
        vi.spyOn(vscode.extensions, 'getExtension').mockReturnValue({ exports: { version: 2 } } as any);
    });
    afterEach(() => {
        vi.restoreAllMocks();
        fs.rmSync(tmp, { recursive: true, force: true });
    });

    async function openLogAndRequeue(entry: unknown): Promise<void> {
        const commands = new Map<string, () => void>();
        vi.spyOn(vscode.commands, 'registerCommand').mockImplementation(((id: string, fn: () => void) => {
            commands.set(id, fn);
            return { dispose() {} };
        }) as any);
        activateFlow({ subscriptions: [], extensionUri: { fsPath: tmp } } as any);
        commands.get('jarvis.openMessageLog')!();
        handler!({ type: 'requeue', entry });
        await vi.waitFor(() => expect(posted.some(m => m.type === 'requeueResult')).toBe(true));
    }

    it('a successful requeue shows an information message naming the destination', async () => {
        const info = vi.spyOn(vscode.window, 'showInformationMessage');
        const err = vi.spyOn(vscode.window, 'showErrorMessage');
        await openLogAndRequeue({ sender: 'a', destination: 'Bob', text: 'hi', timestamp: '2026-01-01T00:00:00.000Z' });
        expect(info).toHaveBeenCalledWith('Requeued to "Bob"');
        expect(err).not.toHaveBeenCalled();
        expect(posted.find(m => m.type === 'requeueResult').ok).toBe(true);
    });

    it('a failed requeue shows an error message naming the destination and the reason', async () => {
        (vscode.workspace as any).workspaceFolders = undefined;
        const info = vi.spyOn(vscode.window, 'showInformationMessage');
        const err = vi.spyOn(vscode.window, 'showErrorMessage');
        await openLogAndRequeue({ sender: 'a', destination: 'Bob', text: 'hi', timestamp: '2026-01-01T00:00:00.000Z' });
        expect(err).toHaveBeenCalledWith('Requeue to "Bob" failed: No workspace open');
        expect(info).not.toHaveBeenCalled();
        expect(posted.find(m => m.type === 'requeueResult').ok).toBe(false);
    });
});

describe('heartbeat: scanner wiring and start-time validation', () => {
    let tmp: string;
    let queuePath: string;
    let commands: Map<string, (...a: any[]) => any>;
    let configHandler: ((e: { affectsConfiguration: (k: string) => boolean }) => void) | undefined;
    const scanner = { actors: [{ name: 'good' }] };
    const saved: Record<string, unknown> = {};

    const channel = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) as any;
    const writeJobs = (jobs: unknown[]) => fs.writeFileSync(path.join(tmp, '.jarvis', 'heartbeat.yaml'), yaml.dump({ jobs }), 'utf8');
    const queueJob = (extra: Record<string, unknown> = {}) => ({
        name: 'q', schedule: '* * * * *',
        steps: [{ type: 'queue', destination: 'good', sender: 's', text: 'ping' }], ...extra,
    });
    const activate = () => {
        const sched = activateHeartbeat(
            { subscriptions: [] } as any, { reload: vi.fn() } as any, () => queuePath, channel(), scanner);
        return sched;
    };
    const queued = (): string => (fs.existsSync(queuePath) ? fs.readFileSync(queuePath, 'utf8') : '');

    beforeEach(() => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-hb-'));
        fs.mkdirSync(path.join(tmp, '.jarvis'));
        queuePath = path.join(tmp, 'queue.json');
        (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: tmp } }];
        commands = new Map();
        configHandler = undefined;
        for (const k of ['getConfiguration', 'onDidChangeConfiguration']) { saved[k] = (vscode.workspace as any)[k]; }
        for (const k of ['createStatusBarItem', 'createTreeView']) { saved[k] = (vscode.window as any)[k]; }
        saved.StatusBarAlignment = (vscode as any).StatusBarAlignment;
        (vscode as any).StatusBarAlignment = { Left: 1 };
        (vscode.window as any).createStatusBarItem = () => ({ show() {}, dispose() {}, text: '' });
        (vscode.window as any).createTreeView = () => ({ dispose() {} });
        (vscode.workspace as any).getConfiguration = () => ({ get: (_k: string, d: unknown) => (_k === 'heartbeatInterval' ? 10 : d) });
        (vscode.workspace as any).onDidChangeConfiguration = (fn: typeof configHandler) => { configHandler = fn; return { dispose() {} }; };
        vi.spyOn(vscode.commands, 'registerCommand').mockImplementation(((id: string, fn: () => void) => {
            commands.set(id, fn);
            return { dispose() {} };
        }) as any);
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        for (const k of ['getConfiguration', 'onDidChangeConfiguration']) { (vscode.workspace as any)[k] = saved[k]; }
        for (const k of ['createStatusBarItem', 'createTreeView']) { (vscode.window as any)[k] = saved[k]; }
        (vscode as any).StatusBarAlignment = saved.StatusBarAlignment;
        fs.rmSync(tmp, { recursive: true, force: true });
    });

    it('warns exactly once per invalid queue destination when the heartbeat starts', async () => {
        writeJobs([{
            name: 'mixed', schedule: 'manual',
            steps: [{ type: 'queue', destination: 'bad', sender: 's', text: 't' }, { type: 'queue', destination: 'good', sender: 's', text: 't' }],
        }]);
        const warn = vi.spyOn(vscode.window, 'showWarningMessage');
        const sched = activate();
        await vi.waitFor(() => expect(warn).toHaveBeenCalled());
        await new Promise(r => setTimeout(r, 50));
        sched.dispose();
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain('job="mixed" step=0 destination="bad"');
    });

    it('does not warn when every queue destination is valid', async () => {
        writeJobs([queueJob({ schedule: 'manual' })]);
        const warn = vi.spyOn(vscode.window, 'showWarningMessage');
        const sched = activate();
        await new Promise(r => setTimeout(r, 50));
        sched.dispose();
        expect(warn).not.toHaveBeenCalled();
    });

    it('a scheduler restarted by a jarvis.heartbeatInterval change still delivers valid queue steps', async () => {
        writeJobs([queueJob()]);
        vi.useFakeTimers({ toFake: ['setInterval', 'Date'] });
        const sched = activate();
        configHandler!({ affectsConfiguration: k => k === 'jarvis.heartbeatInterval' });
        await vi.advanceTimersByTimeAsync(10_000);
        vi.useRealTimers();
        await vi.waitFor(() => expect(queued()).toContain('ping'));
        sched.dispose();
    });

    it('a job resumed from the tree still delivers valid queue steps', async () => {
        writeJobs([queueJob({ schedule: 'manual', enabled: false })]);
        const sched = activate();
        await commands.get('jarvis.resumeHeartbeatJob')!({ job: { name: 'q' } });
        await vi.waitFor(() => expect(queued()).toContain('ping'));
        sched.dispose();
    });
});
