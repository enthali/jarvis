// REQ_COM_OPEN AC-7 / SPEC_FLOW_ACTORCLICK; Agents window support of the packages with Actor tools (ahp-mvp step 4, User decision 2026-10-28).
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const manifest = (pkg: string) => JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', pkg, 'package.json'), 'utf8'));

describe('Agents window: packages that contribute Actor tools may run there', () => {
    it.each(['core', 'kanban', 'pim'])('%s sets capabilities.agentsWindow.supported', pkg => {
        expect(manifest(pkg).capabilities?.agentsWindow?.supported).toBe(true);
    });

    it('every package that contributes language model tools is among them', () => {
        const withTools = fs.readdirSync(path.join(ROOT, 'packages'))
            .filter(pkg => fs.existsSync(path.join(ROOT, 'packages', pkg, 'package.json')))
            .filter(pkg => (manifest(pkg).contributes?.languageModelTools ?? []).length > 0);
        for (const pkg of withTools) {
            expect(manifest(pkg).capabilities?.agentsWindow?.supported, pkg).toBe(true);
        }
    });
});

describe('SPEC_FLOW_ACTORCLICK: the Flow actor click uses the Messages-group command of core', () => {
    const src = fs.readFileSync(path.join(ROOT, 'packages', 'flow', 'src', 'extension.ts'), 'utf8');

    it('calls jarvis.openMessageActorChat with the destination, and no removed command', () => {
        expect(src).toContain("executeCommand('jarvis.openMessageActorChat', { destination: name })");
        expect(src).not.toContain('jarvis.openMessageSession');
    });

    it('the command is contributed by core', () => {
        const commands: { command: string }[] = manifest('core').contributes.commands;
        expect(commands.map(c => c.command)).toContain('jarvis.openMessageActorChat');
    });
});
