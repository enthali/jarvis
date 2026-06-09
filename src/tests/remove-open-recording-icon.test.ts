/**
 * Unit tests for remove-open-recording-icon change.
 *
 * Validates SPEC_EXP_ENTITY_ICONS negative ACs:
 * - No jarvis.openRecording command in package.json or extension.ts
 * - No +recording contextValue suffix in tree providers
 * - Exactly 2 inline icons per entity kind (openContext, openYamlFile)
 * - when-clauses use anchored regex without +recording optional group
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const rootDir = path.resolve(__dirname, '..', '..');
const srcDir = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));

// --- SPEC_EXP_ENTITY_ICONS AC-5: No openRecording command in package.json --
describe('SPEC_EXP_ENTITY_ICONS AC-5: no openRecording command', () => {
    it('contributes.commands does not contain jarvis.openRecording', () => {
        const commands: { command: string }[] = packageJson.contributes.commands;
        const found = commands.find(c => c.command === 'jarvis.openRecording');
        expect(found).toBeUndefined();
    });

    it('commandPalette does not reference jarvis.openRecording', () => {
        const palette: { command: string }[] = packageJson.contributes.menus.commandPalette;
        const found = palette.find(c => c.command === 'jarvis.openRecording');
        expect(found).toBeUndefined();
    });

    it('view/item/context does not reference jarvis.openRecording', () => {
        const items: { command: string }[] = packageJson.contributes.menus['view/item/context'];
        const found = items.find(c => c.command === 'jarvis.openRecording');
        expect(found).toBeUndefined();
    });

    it('extension.ts does not register jarvis.openRecording handler', () => {
        const extensionSrc = fs.readFileSync(path.join(srcDir, 'extension.ts'), 'utf-8');
        expect(extensionSrc).not.toContain("'jarvis.openRecording'");
        expect(extensionSrc).not.toContain('"jarvis.openRecording"');
    });
});

// --- SPEC_EXP_ENTITY_ICONS AC-6: No +recording contextValue suffix ---------
describe('SPEC_EXP_ENTITY_ICONS AC-6: no +recording contextValue', () => {
    const treeProviders = [
        'projectTreeProvider.ts',
        'eventTreeProvider.ts',
        'sessionTreeProvider.ts',
    ];

    for (const file of treeProviders) {
        it(`${file} does not contain +recording suffix`, () => {
            const content = fs.readFileSync(path.join(srcDir, file), 'utf-8');
            expect(content).not.toContain('+recording');
        });

        it(`${file} does not contain fs.existsSync recording check`, () => {
            const content = fs.readFileSync(path.join(srcDir, file), 'utf-8');
            expect(content).not.toMatch(/fs\.existsSync.*recording/);
        });
    }
});

// --- SPEC_EXP_ENTITY_ICONS AC-1/AC-2/AC-3: Exactly 2 inline icons ----------
describe('SPEC_EXP_ENTITY_ICONS AC-1..AC-3: entity inline icon count and order', () => {
    const entityInlineItems: { command: string; group: string; when: string }[] =
        packageJson.contributes.menus['view/item/context'].filter(
            (entry: { group?: string; when?: string }) =>
                entry.group?.startsWith('inline@') &&
                entry.when?.includes('jarvis(Project|Event|Session)')
        );

    it('exactly 2 inline icon entries for entity items', () => {
        expect(entityInlineItems.length).toBe(2);
    });

    it('inline@1 is openContext ($(notebook))', () => {
        const item = entityInlineItems.find(e => e.group === 'inline@1');
        expect(item).toBeDefined();
        expect(item!.command).toBe('jarvis.openContext');
    });

    it('inline@2 is openYamlFile ($(go-to-file))', () => {
        const item = entityInlineItems.find(e => e.group === 'inline@2');
        expect(item).toBeDefined();
        expect(item!.command).toBe('jarvis.openYamlFile');
    });

    it('when-clauses use anchored regex without +recording optional group', () => {
        for (const item of entityInlineItems) {
            expect(item.when).not.toContain('+recording');
            expect(item.when).toMatch(/\$\/$/); // ends with $/ (anchored)
        }
    });
});

// --- SPEC_EXP_ENTITY_ICONS AC-7: All three entity kinds use same icon set ---
describe('SPEC_EXP_ENTITY_ICONS AC-7: uniform icon set across entity kinds', () => {
    it('contextValue in each tree provider is plain (no conditional branching)', () => {
        const expected: Record<string, string> = {
            'projectTreeProvider.ts': 'jarvisProject',
            'eventTreeProvider.ts': 'jarvisEvent',
            'sessionTreeProvider.ts': 'jarvisSession',
        };

        for (const [file, value] of Object.entries(expected)) {
            const content = fs.readFileSync(path.join(srcDir, file), 'utf-8');
            expect(content).toContain(`item.contextValue = '${value}'`);
            // No ternary for contextValue
            expect(content).not.toMatch(/contextValue\s*=.*\?/);
        }
    });
});
