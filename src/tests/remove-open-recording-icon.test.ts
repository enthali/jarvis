/**
 * Unit tests for remove-open-recording-icon change.
 *
 * Validates SPEC_EXP_ENTITY_ICONS negative ACs:
 * - No jarvis.openRecording command in package.json or extension.ts
 * - No +recording contextValue suffix in tree providers
 * - when-clauses use anchored regex without +recording optional group
 *
 * Note: the original "exactly 2 inline icons (openContext, openYamlFile)"
 * assertion was retired by the entity-tree-context-menu CR — both commands
 * are now fully retired (SPEC_ENT_OPENCONTEXT_CMD / SPEC_ENT_OPENYAML_CMD),
 * replaced by the right-click Open/Copy Path/Copy Full Path context menu
 * (SPEC_ENT_ENTITY_CONTEXTMENU). See the updated AC-1..AC-3 block below.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const rootDir = path.resolve(__dirname, '..', '..');
const srcDir = path.resolve(__dirname, '..');
const coreSrcDir = path.resolve(__dirname, '..', '..', 'packages', 'core', 'src');
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'packages', 'core', 'package.json'), 'utf-8'));

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
        const extensionSrc = fs.readFileSync(path.join(coreSrcDir, 'extension.ts'), 'utf-8');
        expect(extensionSrc).not.toContain("'jarvis.openRecording'");
        expect(extensionSrc).not.toContain('"jarvis.openRecording"');
    });
});

// --- SPEC_EXP_ENTITY_ICONS AC-6: No +recording contextValue suffix ---------
describe('SPEC_EXP_ENTITY_ICONS AC-6: no +recording contextValue', () => {
    // Note (actor-internal-identifiers-rename CR): the session/actor kind's
    // legacy standalone SessionTreeProvider (apps/session/sessionTreeProvider.ts)
    // was removed — it was a deliberately-kept but unused-in-production
    // reference implementation (only referenced by the now-also-removed
    // sessionTreeEquivalence.test.ts). Session/Actor contextValue is now
    // derived purely by the generic factory from EntityKindConfig, same as
    // Project/Event — no per-kind file to grep here any more.
    const treeProviders = [
        { file: path.join('src', 'projectKind.ts'), base: path.resolve(__dirname, '..', '..', 'packages', 'pim') },
        { file: path.join('src', 'eventKind.ts'), base: path.resolve(__dirname, '..', '..', 'packages', 'pim') },
    ];

    for (const { file, base } of treeProviders) {
        it(`${file} does not contain +recording suffix`, () => {
            const content = fs.readFileSync(path.join(base, file), 'utf-8');
            expect(content).not.toContain('+recording');
        });

        it(`${file} does not contain fs.existsSync recording check`, () => {
            const content = fs.readFileSync(path.join(base, file), 'utf-8');
            expect(content).not.toMatch(/fs\.existsSync.*recording/);
        });
    }
});

// --- SPEC_EXP_ENTITY_ICONS AC-1/AC-2/AC-3: entity inline icon count and order ----
// Updated by entity-tree-context-menu CR: jarvis.openContext/jarvis.openYamlFile
// are fully retired (SPEC_ENT_OPENCONTEXT_CMD/SPEC_ENT_OPENYAML_CMD) — there are
// no longer any inline@N icons for session entity items. Reachable instead via
// the right-click Open/Copy Path/Copy Full Path menu (SPEC_ENT_ENTITY_CONTEXTMENU).
describe('SPEC_EXP_ENTITY_ICONS AC-1..AC-3: entity inline icon count and order', () => {
    const entityInlineItems: { command: string; group: string; when: string }[] =
        packageJson.contributes.menus['view/item/context'].filter(
            (entry: { group?: string; when?: string }) =>
                entry.group?.startsWith('inline@') &&
                entry.when?.includes('jarvisSession')
        );

    it('no inline@N icon entries remain for session entity items (openContext/openYamlFile retired)', () => {
        expect(entityInlineItems.length).toBe(0);
    });

    it('jarvis.openContext is fully retired — no command declaration remains', () => {
        const commands: { command: string }[] = packageJson.contributes.commands;
        expect(commands.find(c => c.command === 'jarvis.openContext')).toBeUndefined();
    });

    it('jarvis.openYamlFile is fully retired — no command declaration remains', () => {
        const commands: { command: string }[] = packageJson.contributes.commands;
        expect(commands.find(c => c.command === 'jarvis.openYamlFile')).toBeUndefined();
    });

    it('when-clauses use anchored regex without +recording optional group', () => {
        const sessionItems: { when: string }[] =
            packageJson.contributes.menus['view/item/context'].filter(
                (entry: { when?: string }) => entry.when?.includes('=~ /^jarvisSession')
            );
        for (const item of sessionItems) {
            expect(item.when).not.toContain('+recording');
            expect(item.when).toMatch(/\$\/$/); // ends with $/ (anchored)
        }
    });
});

// --- SPEC_EXP_ENTITY_ICONS AC-7: All three entity kinds use same icon set ---
describe('SPEC_EXP_ENTITY_ICONS AC-7: uniform icon set across entity kinds', () => {
    it('extension.ts registers the session/actor EntityKindConfig without a recording-conditional contextValue', () => {
        // Project and event kinds use the generic factory which derives contextValue from
        // EntityKindConfig.kind — verified by projectTreeExpectation.test.ts and eventTreeExpectation.test.ts.
        // Session/Actor also uses the generic factory (its own standalone legacy provider was
        // removed by the actor-internal-identifiers-rename CR — see AC-6 note above); there is
        // no dedicated sessionTreeExpectation.test.ts yet (coverage gap, flagged for Test Designer
        // as a follow-up, mirroring projectTreeExpectation.test.ts/eventTreeExpectation.test.ts).
        // Here we verify at minimum that extension.ts's session EntityKindConfig registration has
        // no conditional/ternary branching on contextValue (the generic factory always derives it
        // plainly from `kind`, matching AC-7's "no conditional branching" requirement).
        const extensionSrc = fs.readFileSync(path.join(coreSrcDir, 'extension.ts'), 'utf-8');
        const sessionKindConfigMatch = extensionSrc.match(/const sessionKindConfig[\s\S]*?\n {8}\};/);
        expect(sessionKindConfigMatch).not.toBeNull();
        expect(sessionKindConfigMatch![0]).not.toMatch(/contextValue\s*=.*\?/);
    });
});
