// REQ_ENG_TOOLREF AC-1..AC-6, SPEC_ENG_TOOLREF AC-1..AC-5, US_MOD_TOOLREF AC-1..AC-4.
// Black-box checks over the four package manifests and maintained documents; expected values come from the spec table.
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

interface Tool {
    name: string;
    displayName?: string;
    toolReferenceName: string;
    modelDescription: string;
    canBeReferencedInPrompt?: boolean;
    icon?: unknown;
    inputSchema?: unknown;
}

// SPEC_ENG_TOOLREF "References after the change": tool name -> toolReferenceName, per package.
const EXPECTED: Record<string, Record<string, string>> = {
    core: {
        jarvis_createActor: 'jarvis_core_createActor',
        jarvis_sendToSession: 'jarvis_core_sendToSession',
        jarvis_sendMessage: 'jarvis_core_sendMessage',
        jarvis_listActors: 'jarvis_core_listActors',
        jarvis_listChatSessions: 'jarvis_core_listChatSessions',
        jarvis_readMessage: 'jarvis_core_readMessage',
        jarvis_receiveMessage: 'jarvis_core_receiveMessage',
        jarvis_registerJob: 'jarvis_core_registerJob',
        jarvis_unregisterJob: 'jarvis_core_unregisterJob',
        jarvis_listJobs: 'jarvis_core_listJobs',
        jarvis_listModels: 'jarvis_core_listModels',
        jarvis_setReminder: 'jarvis_core_setReminder',
        jarvis_listReminders: 'jarvis_core_listReminders',
        jarvis_cancelReminder: 'jarvis_core_cancelReminder',
        jarvis_injectPrompt: 'jarvis_core_injectPrompt',
    },
    kanban: {
        jarvis_createKanbanBoard: 'jarvis_kanban_createKanbanBoard',
        jarvis_verifyKanbanSchema: 'jarvis_kanban_verifyKanbanSchema',
        jarvis_openKanbanBoard: 'jarvis_kanban_openKanbanBoard',
        jarvis_updateKanbanItem: 'jarvis_kanban_updateKanbanItem',
        jarvis_addKanbanItem: 'jarvis_kanban_addKanbanItem',
        jarvis_deleteKanbanItem: 'jarvis_kanban_deleteKanbanItem',
        jarvis_listKanbanItems: 'jarvis_kanban_listKanbanItems',
        jarvis_listKanbanFilterValues: 'jarvis_kanban_listKanbanFilterValues',
        jarvis_updateKanbanFields: 'jarvis_kanban_updateKanbanFields',
    },
    pim: {
        jarvis_pim_category: 'jarvis_pim_category',
        jarvis_pim_task: 'jarvis_pim_task',
    },
    syspilot: {
        jarvis_delaySyspilotUpdate: 'jarvis_syspilot_delaySyspilotUpdate',
        jarvis_SyspilotSkipThisVersion: 'jarvis_syspilot_SyspilotSkipThisVersion',
    },
};

// REQ_MSG_READ AC-6, REQ_MSG_SENDTOSESSION AC-6.
const DEPRECATED = ['jarvis_readMessage', 'jarvis_sendToSession'];

const tools = (pkg: string): Tool[] =>
    JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', pkg, 'package.json'), 'utf8')).contributes.languageModelTools ?? [];

describe('REQ_ENG_TOOLREF / SPEC_ENG_TOOLREF: tool reference and description namespace', () => {
    for (const pkg of Object.keys(EXPECTED)) {
        describe(`package ${pkg}`, () => {
            it('AC-4 (SPEC): contributes exactly the specified set of tools, none added or removed', () => {
                expect(tools(pkg).map(t => t.name).sort()).toEqual(Object.keys(EXPECTED[pkg]).sort());
            });

            it('AC-1: every toolReferenceName is the specified jarvis_<package>_<former reference>', () => {
                for (const t of tools(pkg)) {
                    expect(t.toolReferenceName, t.name).toBe(EXPECTED[pkg][t.name]);
                }
            });

            it('AC-2: every modelDescription begins with "jarvis_<package>: " followed by text', () => {
                for (const t of tools(pkg)) {
                    expect(t.modelDescription.startsWith(`jarvis_${pkg}: `), t.name).toBe(true);
                    expect(t.modelDescription.slice(`jarvis_${pkg}: `.length).trim().length, t.name).toBeGreaterThan(0);
                }
            });

            it('AC-3 (REQ): only the deprecated tools carry the notice, directly after the package prefix', () => {
                for (const t of tools(pkg)) {
                    const rest = t.modelDescription.slice(`jarvis_${pkg}: `.length);
                    if (DEPRECATED.includes(t.name)) {
                        expect(rest.startsWith('[DEPRECATED AND DISABLED —'), t.name).toBe(true);
                    } else {
                        expect(t.modelDescription, t.name).not.toContain('[DEPRECATED');
                    }
                }
            });

            it('AC-5 (REQ): identity and shape fields are present and the tool stays referenceable', () => {
                for (const t of tools(pkg)) {
                    expect(t.name, t.name).toMatch(/^jarvis_/);
                    expect(t.canBeReferencedInPrompt, t.name).toBe(true);
                    expect(t.displayName, t.name).toBeTruthy();
                    expect(t.icon, t.name).toBeDefined();
                    expect(t.inputSchema, t.name).toBeDefined();
                }
            });
        });
    }

    it('AC-3 (SPEC) / AC-4 (REQ): toolReferenceName values are unique across all four packages', () => {
        const refs = Object.keys(EXPECTED).flatMap(pkg => tools(pkg).map(t => t.toolReferenceName));
        expect(refs.length).toBe(28);
        expect(new Set(refs).size).toBe(refs.length);
    });

    it('registered names stay pairwise different across packages (name is not the collision)', () => {
        const names = Object.keys(EXPECTED).flatMap(pkg => tools(pkg).map(t => t.name));
        expect(new Set(names).size).toBe(names.length);
    });

    it('AC-1 (US): every reference begins with jarvis_ and its owning package', () => {
        for (const pkg of Object.keys(EXPECTED)) {
            for (const t of tools(pkg)) {
                expect(t.toolReferenceName.startsWith(`jarvis_${pkg}_`), t.name).toBe(true);
            }
        }
    });
});

describe('REQ_ENG_TOOLREF AC-6 / SPEC_ENG_TOOLREF AC-5 / US_MOD_TOOLREF AC-4: maintained documents use the new references', () => {
    const former = Object.values(EXPECTED).flatMap(m => Object.values(m)).map(ref => ref.replace(/^jarvis_[a-z]+_/, ''));
    // A former reference is stale as a "#" chat reference; "#" inside a path, URL or word is not a chat reference.
    const staleRef = new RegExp(`(?<![\\w./-])#(?:${[...new Set(former)].join('|')})\\b`, 'g');

    const walk = (rel: string): string[] => {
        const abs = path.join(ROOT, rel);
        if (!fs.existsSync(abs)) { return []; }
        if (fs.statSync(abs).isFile()) { return [rel]; }
        return fs.readdirSync(abs).flatMap(entry => walk(path.posix.join(rel.replace(/\\/g, '/'), entry)));
    };

    it('no former "#" reference in README, package READMEs, user guides, instructions, skills or shipped assets', () => {
        const roots = [
            'README.md',
            ...fs.readdirSync(path.join(ROOT, 'packages')).map(p => `packages/${p}/README.md`),
            ...fs.readdirSync(path.join(ROOT, 'packages')).map(p => `packages/${p}/assets`),
            'docs/user guides',
            '.github/instructions',
            '.github/skills',
            '.github/agents',
            '.github/prompts',
            'resources',
            'testdata/.github',
        ];
        const files = roots.flatMap(walk).filter(f => /\.(md|json|ya?ml|txt|prompt|agent)$/i.test(f));
        const hits: string[] = [];
        for (const f of files) {
            fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/).forEach((line, i) => {
                const m = line.match(staleRef);
                if (m) { hits.push(`${f}:${i + 1} ${[...new Set(m)].join(' ')}`); }
            });
        }
        expect(hits).toEqual([]);
    });
});
