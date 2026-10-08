/**
 * heartbeat-agent-model-selection CR
 * US_AUT_AGENTMODEL, REQ_AUT_AGENTMODEL, REQ_AUT_LISTMODELS, SPEC_AUT_AGENTEXEC AC-1..6,
 * SPEC_AUT_LISTMODELS AC-1..4, SPEC_AUT_JOBREG AC-1, SPEC_AUT_STEP_OUTPUT_VARS AC-6
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import {
    HeartbeatJob, HeartbeatScheduler, executeJob, formatModelEntry, listAvailableModels, toModelEntries,
} from '../../packages/core/src/apps/session/heartbeat';

vi.mock('fs', async () => {
    const actual = await vi.importActual<typeof import('fs')>('fs');
    return {
        ...actual,
        readFileSync: vi.fn(actual.readFileSync),
        writeFileSync: vi.fn(actual.writeFileSync),
        appendFileSync: vi.fn(actual.appendFileSync),
    };
});
vi.mock('vscode', async () => {
    const actual = await vi.importActual<typeof import('vscode')>('vscode');
    return {
        ...actual,
        LanguageModelChatMessage: { User: (text: string) => ({ role: 'user', content: text }) },
        lm: { ...(actual as any).lm, selectChatModels: vi.fn() },
    };
});

const root = path.resolve(__dirname, '..', '..');
const realFs = await vi.importActual<typeof import('fs')>('fs');
const readText = (rel: string): string => realFs.readFileSync(path.join(root, rel), 'utf8');
const select = vscode.lm.selectChatModels as unknown as ReturnType<typeof vi.fn>;
const readFile = fs.readFileSync as unknown as ReturnType<typeof vi.fn>;
const writeFile = fs.writeFileSync as unknown as ReturnType<typeof vi.fn>;
const appendFile = fs.appendFileSync as unknown as ReturnType<typeof vi.fn>;

function oc() {
    return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), appendLine: vi.fn() } as unknown as import('vscode').LogOutputChannel & {
        info: ReturnType<typeof vi.fn>;
    };
}

function model(vendor: string, id: string, name = id) {
    return { vendor, id, name, family: 'f', sendRequest: vi.fn().mockResolvedValue({ text: (async function* () { yield 'answer'; })() }) };
}

async function run(steps: HeartbeatJob['steps'], channel = oc()) {
    const job: HeartbeatJob = { name: 'j', schedule: 'manual', steps };
    return { result: await executeJob(job, channel, '/cfg', '', { reload: vi.fn() } as any), channel };
}

beforeEach(() => {
    select.mockReset();
    readFile.mockReset();
    writeFile.mockReset();
    appendFile.mockReset();
    writeFile.mockImplementation(() => undefined);
    appendFile.mockImplementation(() => undefined);
    readFile.mockReturnValue('PROMPT');
});

describe('SPEC_AUT_AGENTEXEC AC-1: the model is looked up by exact vendor and id, nothing built in', () => {
    it('asks selectChatModels without a selector and uses the matching model', async () => {
        const a = model('copilot', 'gpt-4o');
        const b = model('ollama', 'llama3');
        select.mockResolvedValue([a, b]);
        const { result, channel } = await run([{ type: 'agent', prompt: 'p.md', vendor: 'ollama', model: 'llama3' }]);
        expect(result.success).toBe(true);
        expect(select).toHaveBeenCalledWith();
        expect(b.sendRequest).toHaveBeenCalledTimes(1);
        expect(a.sendRequest).not.toHaveBeenCalled();
        // AC-6: the model log line shows vendor/id
        expect((channel.info as any).mock.calls.some((c: string[]) => c[0] === '[Heartbeat] agent: model=ollama/llama3')).toBe(true);
    });

    it('the match is exact and case-sensitive, on vendor and on id', async () => {
        select.mockResolvedValue([model('copilot', 'gpt-4o')]);
        for (const step of [
            { vendor: 'Copilot', model: 'gpt-4o' },
            { vendor: 'copilot', model: 'GPT-4o' },
            { vendor: 'copilot', model: 'gpt-4' },
            { vendor: 'copilot ', model: 'gpt-4o' },
            { vendor: 'ollama', model: 'gpt-4o' },
        ]) {
            const { result } = await run([{ type: 'agent', prompt: 'p.md', ...step }]);
            expect(result.success, JSON.stringify(step)).toBe(false);
        }
    });

    it('the display name is never matched, the family is not used', async () => {
        select.mockResolvedValue([model('copilot', 'id-1', 'GPT-4o')]);
        const byName = await run([{ type: 'agent', prompt: 'p.md', vendor: 'copilot', model: 'GPT-4o' }]);
        expect(byName.result.success).toBe(false);
        const byFamily = await run([{ type: 'agent', prompt: 'p.md', vendor: 'copilot', model: 'f' }]);
        expect(byFamily.result.success).toBe(false);
    });

    it('no vendor, model or family is built in: the old fixed choice is gone from the source', () => {
        const src = readText('packages/core/src/apps/session/heartbeat.ts');
        expect(src).not.toMatch(/gpt-4o|no LM model available|family:\s*'/);
    });
});

describe('SPEC_AUT_AGENTEXEC AC-2..4: failure with the choice named and what is available', () => {
    const available = [model('copilot', 'gpt-4o', 'GPT-4o'), model('anthropic', 'claude-x')];

    it('AC-3/AC-4: neither value given: no default, (missing) for both, list sorted', async () => {
        select.mockResolvedValue(available);
        const { result } = await run([{ type: 'agent', prompt: 'p.md' }]);
        expect(result).toEqual({
            success: false, stepType: 'agent',
            error: 'language model not available: vendor=(missing), model=(missing)\nAvailable:\nvendor="anthropic" model="claude-x"\nvendor="copilot" model="gpt-4o"',
        });
    });

    it('AC-2: empty string and non-string values count as missing', async () => {
        select.mockResolvedValue(available);
        const empty = await run([{ type: 'agent', prompt: 'p.md', vendor: '', model: 'gpt-4o' }]);
        expect(empty.result.error).toContain('vendor=(missing), model="gpt-4o"');
        const num = await run([{ type: 'agent', prompt: 'p.md', vendor: 'copilot', model: 42 as unknown as string }]);
        expect(num.result.error).toContain('vendor="copilot", model=(missing)');
    });

    it('only one of the two given: the other is (missing), and no model is tried', async () => {
        select.mockResolvedValue(available);
        const { result } = await run([{ type: 'agent', prompt: 'p.md', vendor: 'copilot' }]);
        expect(result.error).toContain('vendor="copilot", model=(missing)');
        for (const m of available) { expect(m.sendRequest).not.toHaveBeenCalled(); }
    });

    it('AC-4: an unknown choice is named as given, in quotes', async () => {
        select.mockResolvedValue(available);
        const { result } = await run([{ type: 'agent', prompt: 'p.md', vendor: 'copilot', model: 'gpt-5-retired' }]);
        expect(result.success).toBe(false);
        expect(result.stepType).toBe('agent');
        expect(result.error).toBe('language model not available: vendor="copilot", model="gpt-5-retired"\nAvailable:\nvendor="anthropic" model="claude-x"\nvendor="copilot" model="gpt-4o"');
    });

    it('REQ_AUT_AGENTMODEL AC-4: the failure message shows no display name, one entry per line, same notation as the command', async () => {
        select.mockResolvedValue(available);
        const { result } = await run([{ type: 'agent', prompt: 'p.md', vendor: 'x', model: 'y' }]);
        const lines = result.error!.split('\n');
        expect(lines[0]).toBe('language model not available: vendor="x", model="y"');
        expect(lines[1]).toBe('Available:');
        expect(lines.slice(2)).toEqual(toModelEntries(available as never).map(formatModelEntry));
        expect(result.error).not.toContain('GPT-4o');
        expect(result.error).not.toMatch(/name/);
    });

    it('AC-4: no model available at all lists (none) on the Available line', async () => {
        select.mockResolvedValue([]);
        const { result } = await run([{ type: 'agent', prompt: 'p.md', vendor: 'copilot', model: 'gpt-4o' }]);
        expect(result.error).toBe('language model not available: vendor="copilot", model="gpt-4o"\nAvailable: (none)');
    });

    it('AC-3: a failing step sends no prompt, writes no output file, and aborts the job', async () => {
        select.mockResolvedValue(available);
        const { result } = await run([
            { type: 'agent', prompt: 'p.md', outputFile: 'out.txt', append: true },
            { type: 'agent', prompt: 'never.md', vendor: 'copilot', model: 'gpt-4o' },
        ]);
        expect(result.success).toBe(false);
        for (const m of available) { expect(m.sendRequest).not.toHaveBeenCalled(); }
        expect(writeFile).not.toHaveBeenCalled();
        expect(appendFile).not.toHaveBeenCalled();
        expect(readFile).toHaveBeenCalledTimes(1);
    });
});

describe('SPEC_AUT_AGENTEXEC AC-5/AC-6: prompt first, then the unchanged behaviour', () => {
    it('AC-5: an unreadable prompt file fails before the model list is asked', async () => {
        readFile.mockImplementation(() => { throw new Error('ENOENT: no such file'); });
        const { result } = await run([{ type: 'agent', prompt: 'missing.md', vendor: 'copilot', model: 'gpt-4o' }]);
        expect(result).toMatchObject({ success: false, stepType: 'agent', error: 'ENOENT: no such file' });
        expect(select).not.toHaveBeenCalled();
    });

    it('AC-6: matching model: response in output, outputFile written, append honoured, outputVar captured', async () => {
        const m = model('copilot', 'gpt-4o');
        select.mockResolvedValue([m]);
        const { result } = await run([{ type: 'agent', prompt: 'p.md', vendor: 'copilot', model: 'gpt-4o', outputFile: 'out.txt' }]);
        expect(result.error).toBeUndefined();
        expect(result.success).toBe(true);
        expect(m.sendRequest).toHaveBeenCalledWith([{ role: 'user', content: 'PROMPT' }], {});
        expect(writeFile).toHaveBeenCalledWith(expect.stringContaining('out.txt'), 'answer');

        const m2 = model('copilot', 'gpt-4o');
        select.mockResolvedValue([m2]);
        await run([{ type: 'agent', prompt: 'p.md', vendor: 'copilot', model: 'gpt-4o', outputFile: 'out.txt', append: true }]);
        expect(appendFile).toHaveBeenCalledWith(expect.stringContaining('out.txt'), 'answer');
    });
});

describe('SPEC_AUT_STEP_OUTPUT_VARS AC-6: vendor and model take ${VAR} like the other value fields', () => {
    it('both are interpolated from earlier step output before the lookup', async () => {
        const m = model('copilot', 'gpt-4o');
        select.mockResolvedValue([m]);
        const steps: HeartbeatJob['steps'] = [
            { type: 'agent', prompt: 'a.md', vendor: 'copilot', model: 'gpt-4o', outputVar: 'WHO' },
            { type: 'agent', prompt: 'b.md', vendor: 'copilot', model: 'gpt-4o', outputVar: 'ID' },
        ];
        m.sendRequest
            .mockResolvedValueOnce({ text: (async function* () { yield 'copilot'; })() })
            .mockResolvedValueOnce({ text: (async function* () { yield 'gpt-4o'; })() });
        const third = { type: 'agent' as const, prompt: 'c.md', vendor: '${WHO}', model: '${ID}' };
        const { result } = await run([...steps, third]);
        expect(result.success).toBe(true);
        expect(m.sendRequest).toHaveBeenCalledTimes(3);
    });

    it('an unresolved reference stays as written and shows in the failure message', async () => {
        select.mockResolvedValue([model('copilot', 'gpt-4o')]);
        const first = model('copilot', 'gpt-4o');
        select.mockResolvedValue([first]);
        const { result } = await run([
            { type: 'agent', prompt: 'a.md', vendor: 'copilot', model: 'gpt-4o', outputVar: 'X' },
            { type: 'agent', prompt: 'b.md', vendor: '${NOPE}', model: 'gpt-4o' },
        ]);
        expect(result.success).toBe(false);
        expect(result.error).toContain('vendor="${NOPE}"');
    });
});

describe('SPEC_AUT_AGENTEXEC toModelEntries / SPEC_AUT_LISTMODELS AC-3, AC-4', () => {
    it('entries carry vendor and model (= id) and nothing else, sorted by vendor then model, ignoring case', () => {
        const entries = toModelEntries([
            model('copilot', 'gpt-4o', 'GPT-4o'), model('Anthropic', 'b-model'), model('anthropic', 'A-model'), model('copilot', 'Gpt-4'),
        ] as never);
        expect(entries.map(e => `${e.vendor}/${e.model}`)).toEqual(['anthropic/A-model', 'Anthropic/b-model', 'copilot/Gpt-4', 'copilot/gpt-4o']);
        expect(entries[3]).toEqual({ vendor: 'copilot', model: 'gpt-4o' });
        for (const e of entries) { expect(Object.keys(e)).toEqual(['vendor', 'model']); }
        expect(JSON.stringify(entries)).not.toContain('GPT-4o');
    });

    it('formatModelEntry is the one notation: vendor="v" model="m", values written as they are', () => {
        expect(formatModelEntry({ vendor: 'copilot', model: 'gpt-4o' })).toBe('vendor="copilot" model="gpt-4o"');
        expect(formatModelEntry({ vendor: 'x', model: 'a/b:c' })).toBe('vendor="x" model="a/b:c"');
    });

    it('every entry of the list makes a step match: a choice copied from the list always works', async () => {
        const all = [model('copilot', 'gpt-4o', 'GPT-4o'), model('ollama', 'llama3:8b'), model('x', 'y/z')];
        select.mockResolvedValue(all);
        for (const e of toModelEntries(all as never)) {
            const { result } = await run([{ type: 'agent', prompt: 'p.md', vendor: e.vendor, model: e.model }]);
            expect(result.success, `${e.vendor}/${e.model}`).toBe(true);
        }
    });

    it('AC-4: listAvailableModels asks selectChatModels without selector on every call and keeps nothing', async () => {
        select.mockResolvedValueOnce([model('a', '1')]).mockResolvedValueOnce([]);
        expect(await listAvailableModels()).toEqual([{ vendor: 'a', model: '1' }]);
        expect(await listAvailableModels()).toEqual([]);
        expect(select).toHaveBeenCalledTimes(2);
        expect(select.mock.calls.every(c => c.length === 0)).toBe(true);
    });
});

describe('SPEC_AUT_LISTMODELS AC-1/AC-2 and SPEC_AUT_JOBREG AC-1: manifest and wiring', () => {
    const pkg = JSON.parse(readText('packages/core/package.json'));
    const ext = readText('packages/core/src/extension.ts');

    it('AC-1: jarvis.listModels is contributed with its title, in the Command Palette, and registered', () => {
        const cmd = pkg.contributes.commands.find((c: { command: string }) => c.command === 'jarvis.listModels');
        expect(cmd.title).toBe('Jarvis: List Language Models');
        const hidden = (pkg.contributes.menus.commandPalette as { command: string; when?: string }[])
            .find(m => m.command === 'jarvis.listModels' && m.when === 'false');
        expect(hidden).toBeUndefined();
        expect(ext).toContain("registerCommand('jarvis.listModels'");
        expect(ext).toMatch(/^\s*listModelsCommand,$/m);
    });

    it('AC-1: the command prints one line per entry, values quoted, or says that none is available', () => {
        expect(ext).toContain("log.info('[Models] no language model available')");
        expect(ext).toContain('log.info(`[Models] ${formatModelEntry(m)}`)');
        expect(ext).not.toMatch(/name="\$\{m\.name\}"/);
        expect(ext).toContain('language model(s) available; an agent step names vendor and model:');
        expect(ext).toContain('log.show(true)');
    });

    it('AC-2: jarvis_listModels is a declared tool without input, registered through engine.registerTool, and returns JSON entries', () => {
        const tool = pkg.contributes.languageModelTools.find((t: { name: string }) => t.name === 'jarvis_listModels');
        expect(tool.inputSchema).toEqual({ type: 'object', properties: {} });
        expect(tool.modelDescription).toContain('as an array of { vendor, model }.');
        expect(tool.modelDescription).not.toContain('{ vendor, model, name }');
        expect(ext).toContain("engine.registerTool('jarvis_listModels'");
        expect(ext).toMatch(/^\s*listModelsTool,$/m);
        expect(ext).toContain('JSON.stringify(models)');
    });

    it('SPEC_AUT_LISTMODELS AC-3: neither the command nor the tool output reads a display name', () => {
        const start = ext.indexOf('// listModels (SPEC_AUT_LISTMODELS)');
        const block = ext.slice(start, ext.indexOf('const reminderToolDependencies', start));
        expect(block.length).toBeGreaterThan(200);
        expect(block).not.toMatch(/\.name\b|\bname=|\bname:/);
        expect(block).toContain('JSON.stringify(models)');
    });

    it('SPEC_AUT_JOBREG AC-1: the registerJob input schema lists vendor and model on the step items', () => {
        const tool = pkg.contributes.languageModelTools.find((t: { name: string }) => t.name === 'jarvis_registerJob');
        const props = tool.inputSchema.properties.steps.items.properties;
        expect(props.vendor.type).toBe('string');
        expect(props.model.type).toBe('string');
        expect(props.vendor.description).toContain('jarvis_listModels');
        expect(tool.inputSchema.properties.steps.items.required).toEqual(['type']);
    });
});

describe('SPEC_AUT_JOBREG AC-1: a job registered with vendor and model is persisted with both', () => {
    const roots: string[] = [];
    afterEach(() => { for (const r of roots.splice(0)) { fs.rmSync(r, { recursive: true, force: true }); } });

    it('registerJob writes both fields to heartbeat.yaml', async () => {
        const realWrite = (await vi.importActual<typeof import('fs')>('fs')).writeFileSync;
        const realRead = (await vi.importActual<typeof import('fs')>('fs')).readFileSync;
        writeFile.mockImplementation(realWrite as never);
        readFile.mockImplementation(realRead as never);
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-hb-'));
        roots.push(dir);
        (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: dir } }];
        const scheduler = new HeartbeatScheduler();
        await scheduler.registerJob({
            name: 'with-model', schedule: 'manual',
            steps: [{ type: 'agent', prompt: 'p.md', vendor: 'copilot', model: 'gpt-4o' }],
        });
        const data = yaml.load(fs.readFileSync(path.join(dir, '.jarvis', 'heartbeat.yaml'), 'utf8')) as { jobs: HeartbeatJob[] };
        expect(data.jobs[0].steps[0]).toMatchObject({ vendor: 'copilot', model: 'gpt-4o' });
    });
});

describe('fixtures and artefact removal', () => {
    it('the agent step of the heartbeat test fixture names vendor and model', () => {
        const data = yaml.load(readText('testdata/heartbeat/heartbeat.yaml')) as { jobs: HeartbeatJob[] };
        const agentSteps = data.jobs.flatMap(j => j.steps).filter(s => s.type === 'agent');
        expect(agentSteps.length).toBeGreaterThan(0);
        for (const s of agentSteps) {
            expect(typeof s.vendor).toBe('string');
            expect(typeof s.model).toBe('string');
        }
    });
});
