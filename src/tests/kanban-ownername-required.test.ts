/**
 * Unit tests for REQ_KAN_CREATE AC-3 / SPEC_KAN_CREATE AC-5 (and the seven
 * pointing Kanban tool specs): `ownerName` is always required.
 *
 * `resolveOwner` is a private module-level helper in
 * packages/kanban/src/extension.ts (not exported, matching this file's
 * established convention of exporting only activate/deactivate), so this
 * test uses the same static-source-assertion + logic-replication pattern
 * used elsewhere in this suite (see kanban-owner-ambiguity.test.ts).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const kanbanSrc = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'packages', 'kanban', 'src', 'extension.ts'), 'utf-8'
);
const kanbanPackageJson = JSON.parse(fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'packages', 'kanban', 'package.json'), 'utf-8'
));

describe('REQ_KAN_CREATE AC-3 / SPEC_KAN_CREATE AC-5: resolveOwner requires ownerName', () => {
    it('returns the ownerName-required error before resolving by name, no jarvis_whoAmI fallback', () => {
        const fnStart = kanbanSrc.indexOf('async function resolveOwner');
        const fnEnd = kanbanSrc.indexOf('\n}', fnStart);
        const fnBody = kanbanSrc.slice(fnStart, fnEnd);
        expect(fnBody).toContain("return { error: 'ownerName required' };");
        expect(fnBody).not.toContain('jarvis_whoAmI');
    });

    it('replicated logic: missing/empty ownerName, unknown name, and a resolvable name', () => {
        interface Actor { name: string; folder: string }
        function resolveOwnerByName(name: string, actors: Actor[]): Actor | undefined {
            const matches = actors.filter(a => a.name === name);
            if (matches.length !== 1 || !matches[0].folder) { return undefined; }
            return matches[0];
        }
        function resolveOwner(ownerName: string | undefined, actors: Actor[]): Actor | { error: string } {
            if (!ownerName) { return { error: 'ownerName required' }; }
            const owner = resolveOwnerByName(ownerName, actors);
            if (!owner) { return { error: 'actor unknown' }; }
            return owner;
        }

        const actors: Actor[] = [{ name: 'Solo Actor', folder: '/one' }];

        expect(resolveOwner(undefined, actors)).toEqual({ error: 'ownerName required' });
        expect(resolveOwner('', actors)).toEqual({ error: 'ownerName required' });
        expect(resolveOwner('No Such Actor', actors)).toEqual({ error: 'actor unknown' });
        expect(resolveOwner('Solo Actor', actors)).toEqual({ name: 'Solo Actor', folder: '/one' });
    });

    it('no jarvis_whoAmI reference anywhere in the kanban extension source', () => {
        expect(kanbanSrc).not.toContain('jarvis_whoAmI');
    });
});

describe('SPEC_KAN_CREATE AC-5: ownerName is required in every tool inputSchema', () => {
    const tools: string[] = [
        'jarvis_createKanbanBoard',
        'jarvis_verifyKanbanSchema',
        'jarvis_openKanbanBoard',
        'jarvis_updateKanbanItem',
        'jarvis_addKanbanItem',
        'jarvis_deleteKanbanItem',
        'jarvis_listKanbanItems',
        'jarvis_updateKanbanFields',
    ];

    const entries: { name: string; inputSchema: { required?: string[] } }[] =
        kanbanPackageJson.contributes.languageModelTools;

    it.each(tools)('%s lists ownerName as required', (toolName) => {
        const entry = entries.find(e => e.name === toolName);
        expect(entry).toBeDefined();
        expect(entry!.inputSchema.required).toContain('ownerName');
    });

    it('exactly the 8 Kanban tools are declared', () => {
        const kanbanToolNames = entries.map(e => e.name).filter(n => n.startsWith('jarvis_') && n.toLowerCase().includes('kanban'));
        expect(kanbanToolNames.sort()).toEqual([...tools].sort());
    });
});
