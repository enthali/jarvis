// actor-creation-model CR, written from REQ_ACTOR_CREATE AC-4/5/8/11, REQ_ACTOR_CREATETOOL AC-1/10/11,
// REQ_ACTOR_WHOAMI AC-13/14 and REQ_COM_CHATNAME AC-5. Developer unit tests live in actorRuntime.test.ts and
// actorAgent.test.ts; these add the validators, the order of checks in the tool, the effect of a refusal on the
// message queue and agent file, the manifest, the "+" command wiring, the automatic path and the documents.
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type * as vscode from 'vscode';
import * as vscodeMock from 'vscode';
import { LanguageModelTextPart } from './__mocks__/vscode';
import { ActorScanner } from '../../packages/core/src/engine/actors/actorScanner';
import { createActorHandler } from '../../packages/core/src/engine/actors/actorRuntime';
import { actorSummaryProblem, validateActorSummary, validateModel } from '../../packages/core/src/engine/actors/actorCreation';
import { ensureActorAgent } from '../../packages/core/src/engine/actors/actorAgent';

const repo = path.resolve(__dirname, '../..');
const read = (rel: string): string => fs.readFileSync(path.join(repo, rel), 'utf8').replace(/\r\n/g, '\n');
const roots: string[] = [];

afterEach(() => {
    for (const r of roots.splice(0)) { fs.rmSync(r, { recursive: true, force: true }); }
    (vscodeMock.workspace as any).workspaceFolders = undefined;
    vi.restoreAllMocks();
});

function makeRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-creation-model-'));
    roots.push(root);
    (vscodeMock.workspace as any).workspaceFolders = [{ uri: { fsPath: root } }];
    return root;
}

const catalog = [{ vendor: 'copilot', model: 'gpt-x' }, { vendor: 'copilot', model: 'claude-y' }];

function rig(root: string, listModels: () => Promise<{ vendor: string; model: string }[]> = async () => catalog) {
    const scanner = new ActorScanner(() => root, () => {});
    const deps = {
        resolveActorsFolder: () => root,
        appendMessage: vi.fn(),
        reloadMessages: vi.fn(),
        actorScanner: scanner,
        openActorSession: vi.fn(async () => {}),
        openSessionOnCreate: () => true,
        listModels: vi.fn(listModels),
        log: { info: vi.fn(), warn: vi.fn() },
    };
    const handler = createActorHandler(deps);
    const call = (input: object) =>
        handler({ input } as vscode.LanguageModelToolInvocationOptions<unknown>, {} as vscode.CancellationToken);
    const payload = async (input: object) => JSON.parse(((await call(input)).content[0] as LanguageModelTextPart).value);
    return { deps, call, payload };
}

const agentFile = (root: string, name: string) => path.join(root, '.github', 'agents', `${name}.agent.md`);
const nothingCreated = (root: string, name: string) => {
    expect(fs.existsSync(path.join(root, name)), 'actor folder').toBe(false);
    expect(fs.existsSync(agentFile(root, name)), 'agent file').toBe(false);
};

describe('REQ_ACTOR_CREATETOOL AC-10 / REQ_ACTOR_CREATE AC-4: a description is required and not blank', () => {
    it.each([undefined, null, 5, '', ' ', '\t\n  '])('rejects %j', (value) => {
        expect(() => validateActorSummary(value)).toThrow(/^invalid actor summary: /);
        expect(typeof actorSummaryProblem(value as string)).toBe('string');
    });

    it('accepts a description with surrounding white space and gives no InputBox problem', () => {
        expect(() => validateActorSummary('  Reviews code ')).not.toThrow();
        expect(actorSummaryProblem('  Reviews code ')).toBeUndefined();
    });
});

describe('REQ_ACTOR_CREATETOOL AC-11: model validation and its two errors', () => {
    it('accepts a listed model without further effect', async () => {
        await expect(validateModel('claude-y', async () => catalog)).resolves.toBeUndefined();
    });

    it('an unlisted model names the value and lists every available model as vendor and model', async () => {
        const err = await validateModel('nope', async () => catalog).catch((e: Error) => e);
        expect((err as Error).message).toMatch(/^model not available: "nope"/);
        expect((err as Error).message).toContain('vendor="copilot" model="gpt-x"');
        expect((err as Error).message).toContain('vendor="copilot" model="claude-y"');
    });

    it('an empty list is also "model not available"', async () => {
        await expect(validateModel('gpt-x', async () => [])).rejects.toThrow(/^model not available: "gpt-x"/);
    });

    it('a catalog that cannot be read is a different error', async () => {
        const err = await validateModel('gpt-x', async () => { throw new Error('boom'); }).catch((e: Error) => e);
        expect((err as Error).message).toMatch(/^jarvis_createActor: model catalog not available/);
        expect((err as Error).message).not.toMatch(/^model not available/);
    });

    it('matches the model value exactly, not by vendor or label', async () => {
        await expect(validateModel('copilot', async () => catalog)).rejects.toThrow(/model not available/);
        await expect(validateModel('GPT-X', async () => catalog)).rejects.toThrow(/model not available/);
    });
});

describe('REQ_ACTOR_CREATETOOL AC-10/11, REQ_ACTOR_CREATE AC-8: order of checks and refusals leave nothing behind', () => {
    it('a missing summary is refused before the folder exists check and before any catalog call', async () => {
        const root = makeRoot();
        fs.mkdirSync(path.join(root, 'Taken'));
        fs.writeFileSync(path.join(root, 'Taken', 'actor.yaml'), 'name: "Taken"\n');
        const { call, deps } = rig(root);
        await expect(call({ name: 'Taken' })).rejects.toThrow(/invalid actor summary:/);
        await expect(call({ name: 'Fresh' })).rejects.toThrow(/invalid actor summary:/);
        expect(deps.listModels).not.toHaveBeenCalled();
        nothingCreated(root, 'Fresh');
    });

    it('an existing Actor answers created:false even for an invalid model, and the catalog is not read', async () => {
        const root = makeRoot();
        fs.mkdirSync(path.join(root, 'Taken'));
        fs.writeFileSync(path.join(root, 'Taken', 'actor.yaml'), 'name: "Taken"\n');
        const { payload, deps } = rig(root);
        const result = await payload({ name: 'Taken', summary: 'S', model: 'nope', initialMessage: 'hi' });
        expect(result.created).toBe(false);
        expect(deps.listModels).not.toHaveBeenCalled();
        expect(deps.appendMessage).not.toHaveBeenCalled();
        expect(deps.openActorSession).not.toHaveBeenCalled();
    });

    it.each([
        ['an unlisted model', async () => catalog, /model not available/],
        ['an unreadable catalog', async () => { throw new Error('boom'); }, /model catalog not available/],
    ] as const)('%s creates no files or agent, queues no first message and opens no chat', async (_label, list, message) => {
        const root = makeRoot();
        const { call, deps } = rig(root, list as never);
        await expect(call({ name: 'Refused', summary: 'S', model: 'nope', initialMessage: 'first' })).rejects.toThrow(message);
        nothingCreated(root, 'Refused');
        expect(deps.appendMessage).not.toHaveBeenCalled();
        expect(deps.reloadMessages).not.toHaveBeenCalled();
        expect(deps.openActorSession).not.toHaveBeenCalled();
        const scanner = deps.actorScanner;
        await scanner.rescan();
        expect(scanner.actors.map(a => a.name)).not.toContain('Refused');
    }, 10_000);

    it('a valid model reaches the agent file only; actor.yaml and context.md carry no model', async () => {
        const root = makeRoot();
        const { payload, deps } = rig(root);
        expect((await payload({ name: 'Modelled', summary: 'Reviews code', model: 'claude-y', initialMessage: 'go' })).created).toBe(true);
        const agent = fs.readFileSync(agentFile(root, 'Modelled'), 'utf8');
        expect(agent).toContain('description: "Reviews code"\nmodel: "claude-y"\n---');
        expect(fs.readFileSync(path.join(root, 'Modelled', 'actor.yaml'), 'utf8')).not.toMatch(/model/);
        expect(fs.readFileSync(path.join(root, 'Modelled', 'context.md'), 'utf8')).toBe('# Modelled\n\nReviews code\n');
        expect(deps.appendMessage).toHaveBeenCalledWith('Modelled', 'jarvis_createActor', 'go');
    }, 10_000);

    it('no model and an empty model string leave the agent without a model line and never read the catalog', async () => {
        const root = makeRoot();
        const { payload, deps } = rig(root);
        await payload({ name: 'NoModel', summary: 'S' });
        await payload({ name: 'EmptyModel', summary: 'S', model: '' });
        for (const n of ['NoModel', 'EmptyModel']) {
            const agent = fs.readFileSync(agentFile(root, n), 'utf8');
            expect(agent).toContain('description: "S"');
            expect(agent).not.toMatch(/^model:/m);
        }
        expect(deps.listModels).not.toHaveBeenCalled();
    }, 10_000);
});

describe('REQ_ACTOR_WHOAMI AC-13/AC-14, REQ_COM_CHATNAME AC-5: automatic preparation of a legacy Actor', () => {
    it('writes the Actor name as description and no model line for a missing or blank summary', async () => {
        const root = makeRoot();
        await ensureActorAgent({ name: 'Legacy', folder: path.join(root, 'Legacy') });
        await ensureActorAgent({ name: 'Legacy2', folder: path.join(root, 'Legacy2'), summary: '\n ' });
        for (const n of ['Legacy', 'Legacy2']) {
            const agent = fs.readFileSync(agentFile(root, n), 'utf8');
            expect(agent).toContain(`description: "${n}"`);
            expect(agent).not.toMatch(/^model:/m);
            expect(agent).not.toContain('Actor ' + n + '"');
        }
    }, 10_000);

    it('a multi-line summary becomes one description line', async () => {
        const root = makeRoot();
        await ensureActorAgent({ name: 'Multi', folder: path.join(root, 'Multi'), summary: 'First line\nSecond   line' });
        expect(fs.readFileSync(agentFile(root, 'Multi'), 'utf8')).toContain('description: "First line Second line"');
    }, 10_000);

    it('an existing agent file keeps its model entry and custom body while the missing description is added', async () => {
        const root = makeRoot();
        fs.mkdirSync(path.dirname(agentFile(root, 'Kept')), { recursive: true });
        fs.writeFileSync(agentFile(root, 'Kept'), '---\nname: "Kept"\nmodel: "claude-y"\n---\nCustom body.\n', 'utf8');
        await ensureActorAgent({ name: 'Kept', folder: path.join(root, 'Kept') });
        const agent = fs.readFileSync(agentFile(root, 'Kept'), 'utf8');
        expect(agent).toContain('description: "Kept"');
        expect(agent).toContain('model: "claude-y"');
        expect(agent).toContain('Custom body.');
    }, 10_000);

    it('chat preparation never passes a model or queries the catalog', () => {
        const src = read('packages/core/src/extension.ts');
        const prep = src.slice(src.indexOf('async function resolveActorForChat'), src.indexOf('function desktopRegistryDirs'));
        expect(prep).toMatch(/ensureActorAgent\(\{ name: actor\.name, folder: actor\.folder, summary: actor\.summary \}\)/);
        expect(prep).not.toMatch(/model|listAvailableModels|listModels/);
        const other = [...src.matchAll(/ensureActorAgent\(/g)].length;
        expect(other).toBe(2);
    });
});

describe('REQ_ACTOR_CREATETOOL AC-1: manifest of jarvis_createActor', () => {
    const tool = JSON.parse(read('packages/core/package.json')).contributes.languageModelTools
        .find((t: { name: string }) => t.name === 'jarvis_createActor');

    it('requires exactly name and summary and offers model and initialMessage as optional strings', () => {
        expect(tool.inputSchema.required).toEqual(['name', 'summary']);
        for (const key of ['name', 'summary', 'model', 'initialMessage']) {
            expect(tool.inputSchema.properties[key].type, key).toBe('string');
        }
        expect(tool.inputSchema.properties).not.toHaveProperty('agent');
    });

    it('tells the model that the summary is required and where valid models come from', () => {
        expect(tool.modelDescription).toMatch(/non-blank summary/);
        expect(tool.modelDescription).toMatch(/jarvis_listModels/);
        expect(tool.inputSchema.properties.model.description).toMatch(/jarvis_listModels/);
        expect(tool.toolReferenceName).toBe('jarvis_core_createActor');
    });
});

describe('REQ_ACTOR_CREATE AC-4/5/8/11: wiring of the "+" command', () => {
    const src = read('packages/core/src/extension.ts');
    const body = src.slice(src.indexOf("'jarvis.newActor',"), src.indexOf('context.subscriptions.push(newActorCommand)'));
    const at = (needle: string) => { const i = body.indexOf(needle); expect(i, needle).toBeGreaterThan(-1); return i; };

    it('asks name, then checks for an existing Actor, then the summary, then the model', () => {
        expect(at('Actor name')).toBeLessThan(at('existingActorFolder('));
        expect(at('existingActorFolder(')).toBeLessThan(at('Description of the Actor (required)'));
        expect(at('Description of the Actor (required)')).toBeLessThan(at('showQuickPick('));
    });

    it('the summary input rejects a blank value inline and Escape in each step returns before anything is written', () => {
        expect(body).toMatch(/validateInput: actorSummaryProblem/);
        const write = at('writeActorFiles(');
        for (const guard of ['if (!nameInput) { return; }', 'if (summaryInput === undefined) { return; }', 'if (!pick) { return; }']) {
            expect(at(guard), guard).toBeLessThan(write);
        }
    });

    it('the picker starts with "No model", then the catalog as model with vendor; a failing catalog is logged as a warning', () => {
        expect(body).toMatch(/\[\s*\{ label: 'No model', model: undefined as string \| undefined \},\s*\.\.\.catalog\.map\(entry => \(\{ label: entry\.model, description: entry\.vendor/);
        expect(body).toMatch(/catch \(err\) \{\s*log\.warn\(/);
        expect(body).not.toMatch(/validateModel\(/);
    });

    it('shows no agent picker and hands the chosen model to the agent after the files are written', () => {
        expect(body.match(/showQuickPick\(/g)).toHaveLength(1);
        expect(at('writeActorFiles(')).toBeLessThan(at('ensureActorAgent({ name, folder: targetPath, summary, model: pick.model })'));
        expect(at('ensureActorAgent(')).toBeLessThan(at('actorScanner.rescan()'));
    });
});

describe('Documents: Needs, journeys and guides', () => {
    function status(id: string): string | undefined {
        const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
            e.isDirectory() ? (['_build', 'changes'].includes(e.name) ? [] : walk(path.join(d, e.name))) : e.name.endsWith('.rst') ? [path.join(d, e.name)] : []);
        for (const f of walk(path.join(repo, 'docs'))) {
            const m = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n').match(new RegExp(`:id: ${id}\\n\\s+:status: (\\w+)`));
            if (m) { return m[1]; }
        }
        return undefined;
    }

    it.each(['US_ACTOR_CREATE', 'US_ACTOR_CREATETOOL', 'REQ_ACTOR_CREATE', 'REQ_ACTOR_CREATETOOL', 'REQ_ACTOR_WHOAMI',
        'REQ_COM_CHATNAME', 'SPEC_ACTOR_CREATE', 'SPEC_ACTOR_CREATETOOL', 'SPEC_ACTOR_WHOAMI', 'SPEC_COM_INJECT'])(
        '%s is implemented', (id) => { expect(status(id)).toBe('implemented'); });

    it('the create journeys are approved and validate the two User stories', () => {
        const rst = read('docs/acceptance/ac_actor_identity.rst');
        const block = (id: string) => rst.slice(rst.indexOf(`:id: ${id}`)).split(/\n\.\. ac::/)[0];
        expect(block('AC_ACTOR_CREATE_JOURNEY')).toMatch(/:status: approved[\s\S]*:validates: US_ACTOR_CREATE;/);
        const refusal = block('AC_ACTOR_CREATE_REFUSAL_JOURNEY');
        expect(refusal).toMatch(/:status: approved/);
        expect(refusal).toMatch(/:validates: [^\n]*US_ACTOR_CREATETOOL/);
        expect(refusal).toMatch(/jarvis_createActor/);
    });

    it('Getting Started names the description rule, the model choice and the tool rules', () => {
        const guide = read('docs/user guides/getting-started.md');
        expect(guide).toMatch(/blank description is rejected/);
        expect(guide).toMatch(/\*\*No model\*\*/);
        expect(guide).toMatch(/Escape[^\n]*cancels, and nothing is created/);
        expect(guide).toMatch(/non-blank `summary`[^\n]*`jarvis_listModels`/);
        expect(guide).toMatch(/Actor's name as description and no model/);
    });

    it('the Core guide and README state that creation asks for a required description and an optional model', () => {
        expect(read('packages/core/README.md')).toMatch(/required description and an optional model/);
        expect(read('docs/user guides/core.md')).toMatch(/description/i);
    });
});
