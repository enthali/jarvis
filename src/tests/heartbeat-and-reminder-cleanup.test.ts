// heartbeat-and-reminder-cleanup CR (K53, K54, K28, K29), written from the specification.
// REQ_AUT_JOBREG AC-5, SPEC_ENG_API AC-11, REQ_CFG_FIXEDPATHS, REQ_MSG_REMINDERS_TOOLS AC-4/5,
// REQ_MSG_REMINDERS_VIEW AC-2, REQ_MSG_REMINDERS_DELIVER AC-7.
import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import { HeartbeatJob, HeartbeatScheduler } from '../../packages/core/src/apps/session/heartbeat';

const root = path.resolve(__dirname, '../..');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const pkg = JSON.parse(read('packages/core/package.json'));
const tool = (name: string) => pkg.contributes.languageModelTools.find((t: { name: string }) => t.name === name);

// Step fields REQ_AUT_JOBCONFIG defines
const stepFields = ['type', 'run', 'prompt', 'outputFile', 'append', 'outputVar', 'vendor', 'model', 'destination', 'sender', 'text'];

function rstFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { return ['changes', '_build', 'node_modules'].includes(e.name) ? [] : rstFiles(full); }
        return e.name.endsWith('.rst') ? [full] : [];
    });
}
const specs = rstFiles(path.join(root, 'docs')).map(f => ({ rel: path.relative(root, f), text: fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n') }));
const needBlock = (id: string): string => {
    const hit = specs.map(s => s.text).find(t => new RegExp(`:id: ${id}\\b`).test(t)) ?? '';
    const start = hit.search(new RegExp(`:id: ${id}\\b`));
    const rest = hit.slice(start);
    const next = rest.search(/\n\.\. (req|spec|story)::/);
    return next < 0 ? rest : rest.slice(0, next);
};

describe('REQ_AUT_JOBREG AC-5 / SPEC_ENG_API AC-11: registerJob accepts every step field', () => {
    const roots: string[] = [];
    afterEach(() => { roots.splice(0).forEach(d => fs.rmSync(d, { recursive: true, force: true })); });

    it('the jarvis_registerJob schema declares every step field the YAML accepts, outputVar as a string', () => {
        const items = tool('jarvis_registerJob').inputSchema.properties.steps.items;
        expect(Object.keys(items.properties).sort()).toEqual([...stepFields].sort());
        expect(items.properties.outputVar.type).toBe('string');
        expect(items.required).toEqual(['type']);
    });

    it('SPEC_ENG_API names outputVar in the HeartbeatStep block', () => {
        expect(needBlock('SPEC_ENG_API')).toMatch(/outputVar\?/);
    });

    it('a registered job keeps outputVar on its steps in heartbeat.yaml and upserts by name', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-cleanup-'));
        roots.push(dir);
        (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: dir } }];
        const scheduler = new HeartbeatScheduler();
        const job: HeartbeatJob = {
            name: 'chain', schedule: 'manual',
            steps: [{ type: 'python', run: 'a.py', outputVar: 'A' }, { type: 'queue', destination: 'x', sender: 's', text: '${A}' }],
        };
        await scheduler.registerJob(job);
        await scheduler.registerJob({ ...job, schedule: '0 * * * *' });
        const data = yaml.load(fs.readFileSync(path.join(dir, '.jarvis', 'heartbeat.yaml'), 'utf8')) as { jobs: HeartbeatJob[] };
        expect(data.jobs).toHaveLength(1);
        expect(data.jobs[0].schedule).toBe('0 * * * *');
        expect(data.jobs[0].steps[0].outputVar).toBe('A');
        expect(data.jobs[0].steps[1].text).toBe('${A}');
    });
});

describe('K54: jarvis.heartbeatConfigFile is no longer a live setting', () => {
    it('no manifest declares it', () => {
        expect(Object.keys(pkg.contributes.configuration.properties ?? {})).not.toContain('jarvis.heartbeatConfigFile');
    });

    it('outside retirement notes no specification, guide or README names it, or the retired Needs', () => {
        const ids = /REQ_CFG_HEARTBEATPATH|SPEC_MSG_DUALREGISTRATION/;
        expect(specs.filter(s => ids.test(s.text)).map(s => s.rel)).toEqual([]);
        for (const rel of ['README.md', 'packages/core/README.md', 'docs/user guides/core.md']) {
            expect(read(rel), rel).not.toMatch(/heartbeatConfigFile/);
        }
        const live = specs.flatMap(s => s.text.split('\n').filter(l => /heartbeatConfigFile/.test(l) && !/replaced by fixed path/.test(l)).map(() => s.rel));
        expect(live).toEqual([]);
    });

    it('US_CFG_HEARTBEAT states no config-file-path outcome', () => {
        expect(needBlock('US_CFG_HEARTBEAT')).not.toMatch(/config(uration)? file|heartbeatConfigFile/i);
    });
});

describe('K28: reminder tools go through the shared registry', () => {
    it('no spec or source names registerDualTool', () => {
        expect(specs.filter(s => /registerDualTool/.test(s.text)).map(s => s.rel)).toEqual([]);
        const sources = ['packages/core/src/extension.ts', 'packages/pim/src/extension.ts'];
        for (const rel of sources) { expect(read(rel), rel).not.toMatch(/registerDualTool/); }
    });

    it('REQ_MSG_REMINDERS_TOOLS AC-4/5: three tools declared in the manifest and registered once via engine.registerTool', () => {
        const src = read('packages/core/src/extension.ts');
        for (const name of ['jarvis_setReminder', 'jarvis_listReminders', 'jarvis_cancelReminder']) {
            expect(tool(name), name).toBeDefined();
            expect(tool(name).inputSchema, name).toBeDefined();
            expect(src.split(`engine.registerTool('${name}'`).length - 1, name).toBe(1);
        }
    });

    it('REQ_MSG_REMINDERS_VIEW AC-2: the Reminders view is gated on messages.enabled and reminders.enabled', () => {
        const view = pkg.contributes.views[Object.keys(pkg.contributes.views)[0]].find((v: { id: string }) => v.id === 'jarvisReminders');
        expect(view.when).toMatch(/jarvis\.messages\.enabled/);
        expect(view.when).toMatch(/jarvis\.reminders\.enabled/);
        expect(view.when).not.toMatch(/messagesFile/);
    });
});

describe('K29: reminder delivery wording matches queue delivery', () => {
    it('REQ_MSG_REMINDERS_DELIVER AC-7 states fire-once, no notification of its own', () => {
        expect(needBlock('REQ_MSG_REMINDERS_DELIVER')).toMatch(/AC-7[\s\S]*fire once[\s\S]*no VS Code\s+notification of its own/);
    });

    it('the Core guide and README no longer call reminders cron-based or claim a notification', () => {
        const guide = read('docs/user guides/core.md');
        const readme = read('packages/core/README.md');
        const line = (t: string) => t.split('\n').filter(l => /reminder/i.test(l)).join('\n');
        for (const t of [line(guide), line(readme)]) {
            expect(t).not.toMatch(/cron/i);
            expect(t).toMatch(/queued as a message/);
            expect(t).toMatch(/no VS Code notification/);
        }
    });

    it('the delivery code appends a message and raises no VS Code notification', () => {
        expect(read('packages/core/src/apps/session/reminderDelivery.ts')).not.toMatch(/show(Information|Warning|Error)Message/);
    });
});
