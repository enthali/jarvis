/**
 * message-flow-diagram CR
 * REQ_FLOW_PACKAGE (SPEC_MOD_FLOW_PKG): manifest shape.
 * REQ_MOD_ADDONS (SPEC_MOD_SUITE): suite pack includes jarvis-flow as the 5th extension.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const flowPkg = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../packages/flow/package.json'), 'utf-8')
);
const suitePkg = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../packages/suite/package.json'), 'utf-8')
);

describe('SPEC_MOD_FLOW_PKG: packages/flow manifest', () => {
    it('AC-1: declares extensionDependencies on enthali.jarvis-core', () => {
        expect(flowPkg.extensionDependencies).toEqual(['enthali.jarvis-core']);
    });

    it('AC-2: contributes jarvis.openMessageFlow command + its own view/title button', () => {
        const commandIds = flowPkg.contributes.commands.map((c: { command: string }) => c.command);
        expect(commandIds).toContain('jarvis.openMessageFlow');

        const titleEntries = flowPkg.contributes.menus['view/title'];
        expect(titleEntries).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ command: 'jarvis.openMessageFlow', when: 'view == jarvisMessages' }),
            ])
        );
    });

    it('AC-3: no PIM/recorder dependency declared', () => {
        expect(flowPkg.extensionDependencies).not.toContain('enthali.jarvis-pim');
        expect(flowPkg.extensionDependencies).not.toContain('enthali.jarvis-recorder');
    });
});

describe('SPEC_MOD_SUITE: extension pack includes jarvis-flow (5th extension)', () => {
    it('AC-1: installing the pack installs all five extensions', () => {
        expect(suitePkg.extensionPack).toEqual([
            'enthali.jarvis-core',
            'enthali.jarvis-pim',
            'enthali.jarvis-recorder',
            'enthali.jarvis-mcp',
            'enthali.jarvis-flow',
        ]);
    });
});
