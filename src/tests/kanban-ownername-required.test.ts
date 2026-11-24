/**
 * REQ_KAN_CREATE AC-3..AC-5 / SPEC_KAN_CREATE AC-5 (and the pointing Kanban tool specs): `ownerName` is
 * always required, and it resolves only when exactly one Actor carries the name.
 *
 * The nine registered tool handlers of packages/kanban/src/extension.ts are driven with a fake core API;
 * nothing here copies the private resolveOwner logic out of the source (kanban-cleanup K62).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { activate } from '../../packages/kanban/src/extension';

type Handler = (options: { input: unknown }, token: unknown) => Promise<{ content: Array<{ value: string }> }>;

const kanbanPackage = path.resolve(__dirname, '..', '..', 'packages', 'kanban');
const kanbanPackageJson = JSON.parse(fs.readFileSync(path.join(kanbanPackage, 'package.json'), 'utf-8'));
const handlers = new Map<string, Handler>();
const actors: Array<{ name: string; folder?: string }> = [];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kanban-owner-'));

const tools: string[] = [
    'jarvis_createKanbanBoard',
    'jarvis_verifyKanbanSchema',
    'jarvis_openKanbanBoard',
    'jarvis_updateKanbanItem',
    'jarvis_addKanbanItem',
    'jarvis_deleteKanbanItem',
    'jarvis_listKanbanItems',
    'jarvis_listKanbanFilterValues',
    'jarvis_updateKanbanFields',
];

async function call(tool: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const handler = handlers.get(tool);
    if (!handler) { throw new Error(`tool not registered: ${tool}`); }
    const result = await handler({ input }, {});
    return JSON.parse(result.content[0].value) as Record<string, unknown>;
}

beforeAll(() => {
    const solo = path.join(tmp, 'Solo');
    fs.mkdirSync(solo, { recursive: true });
    actors.push(
        { name: 'Solo', folder: solo },
        { name: 'Twin', folder: path.join(tmp, 'Twin1') },
        { name: 'Twin', folder: path.join(tmp, 'Twin2') },
    );
    const api = {
        version: 2,
        listActors: () => actors,
        markActor: () => undefined,
        provisionModuleAssets: async () => undefined,
        registerTool: (name: string, _description: string, handler: Handler) => { handlers.set(name, handler); return { dispose() { /* nothing */ } }; },
    };
    Object.assign(vscode.extensions, { getExtension: () => ({ exports: api }) });
    Object.assign(vscode.workspace, { getConfiguration: () => ({ get: (_key: string, fallback: unknown) => fallback }) });
    Object.assign(vscode.window, { registerCustomEditorProvider: () => ({ dispose() { /* nothing */ } }) });
    activate({
        subscriptions: [],
        extensionUri: vscode.Uri.file(kanbanPackage),
        asAbsolutePath: (p: string) => path.join(kanbanPackage, p),
    } as unknown as vscode.ExtensionContext);
});

afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
});

describe('REQ_KAN_CREATE AC-3..AC-5: every real tool handler resolves ownerName the same way', () => {
    it('registers exactly the nine Kanban tools', () => {
        expect([...handlers.keys()].sort()).toEqual([...tools].sort());
    });

    it.each(tools)('%s: a missing or empty ownerName returns "ownerName required"', async (tool) => {
        expect(await call(tool, {})).toEqual({ error: 'ownerName required' });
        expect(await call(tool, { ownerName: '' })).toEqual({ error: 'ownerName required' });
    });

    it.each(tools)('%s: an unknown name returns "actor unknown"', async (tool) => {
        expect(await call(tool, { ownerName: 'No Such Actor' })).toEqual({ error: 'actor unknown' });
    });

    it.each(tools)('%s: a name shared by two Actors returns "actor unknown", the first match is not picked', async (tool) => {
        expect(await call(tool, { ownerName: 'Twin' })).toEqual({ error: 'actor unknown' });
    });

    it('one Actor with the name resolves: a board is created in that Actor\'s folder', async () => {
        const r = await call('jarvis_createKanbanBoard', { ownerName: 'Solo' });
        expect(r.path).toBe(path.join(tmp, 'Solo', 'kanban.yaml'));
        expect(fs.existsSync(path.join(tmp, 'Solo', 'kanban.yaml'))).toBe(true);
    });
});

describe('SPEC_KAN_CREATE AC-5: ownerName is required in every tool inputSchema', () => {
    const entries: { name: string; inputSchema: { required?: string[] } }[] =
        kanbanPackageJson.contributes.languageModelTools;

    it.each(tools)('%s lists ownerName as required', (toolName) => {
        const entry = entries.find(e => e.name === toolName);
        expect(entry).toBeDefined();
        expect(entry!.inputSchema.required).toContain('ownerName');
    });

    it('exactly the 9 Kanban tools are declared', () => {
        const kanbanToolNames = entries.map(e => e.name).filter(n => n.startsWith('jarvis_') && n.toLowerCase().includes('kanban'));
        expect(kanbanToolNames.sort()).toEqual([...tools].sort());
    });
});
