/**
 * Unit tests for initprompt-extract-overflow change.
 *
 * TC-1: Verbatim presence of the new bullet
 * TC-2: New bullet is the last bullet in the list
 * TC-3: No per-kind branching — same default across project/event/session
 * TC-4: Non-regression on the five pre-existing bullets
 * TC-5: Custom-template override path unbroken
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const srcDir = path.resolve(__dirname, '..');
const extensionSrc = fs.readFileSync(path.join(srcDir, 'extension.ts'), 'utf-8');
const packageJson = JSON.parse(fs.readFileSync(path.join(srcDir, '..', 'package.json'), 'utf-8'));

const NEW_BULLET = '- When a topic grows past ~5 bullets, move it to a dedicated file beside `context.md` and leave a one-line summary with a relative link in `context.md`.';

const EXISTING_BULLETS = [
    '- Store only long-lived items under Decision / Finding / Next.',
    '- One concise line per bullet. Prune aggressively.',
    '- Replace outdated bullets — never append logs.',
    '- Never store retries, raw tool output, or transient chatter.',
    '- Before writing, ask: "Will this still matter in 2 weeks?" If no, skip.',
];

// Extract the default from package.json
const initPromptSetting = packageJson.contributes.configuration
    .find((section: any) => section.properties?.['jarvis.agentSession.initPromptTemplate'])
    ?.properties['jarvis.agentSession.initPromptTemplate'];
const packageDefault: string = initPromptSetting.default;

describe('TC-1: Verbatim presence of the new bullet', () => {
    it('package.json default contains the exact new bullet', () => {
        expect(packageDefault).toContain(NEW_BULLET);
    });

    it('extension.ts source contains the exact new bullet text', () => {
        // In template literals, backticks are escaped as \`, so we check the core text
        expect(extensionSrc).toContain('When a topic grows past ~5 bullets, move it to a dedicated file beside');
        expect(extensionSrc).toContain('and leave a one-line summary with a relative link in');
    });
});

describe('TC-2: New bullet is the last bullet in the list', () => {
    it('package.json default ends with the new bullet (no trailing bullet after it)', () => {
        const lines = packageDefault.split('\n');
        const bulletLines = lines.filter(l => l.startsWith('- '));
        expect(bulletLines[bulletLines.length - 1]).toBe(NEW_BULLET);
    });

    it('the new bullet follows the "2 weeks" bullet in package.json', () => {
        const idx2weeks = packageDefault.indexOf(EXISTING_BULLETS[4]);
        const idxNew = packageDefault.indexOf(NEW_BULLET);
        expect(idx2weeks).toBeGreaterThan(-1);
        expect(idxNew).toBeGreaterThan(idx2weeks);
    });
});

describe('TC-3: No per-kind branching — identical default across kinds', () => {
    it('extension.ts has no conditional branching around the new bullet', () => {
        // The defaultInitPrompt strings should not be wrapped in kind-specific if/switch
        // We verify by counting occurrences of the new bullet — should match the number of
        // defaultInitPrompt declarations (3 copies currently)
        const matches = extensionSrc.match(/When a topic grows past ~5 bullets/g);
        expect(matches).not.toBeNull();
        expect(matches!.length).toBeGreaterThanOrEqual(3);
    });

    it('package.json default does not mention specific entity kinds in bullet list', () => {
        const bulletSection = packageDefault.split('Keep it minimal and action-oriented:')[1];
        expect(bulletSection).not.toMatch(/\bif\b.*\bkind\b/);
        expect(bulletSection).not.toContain('project:');
        expect(bulletSection).not.toContain('event:');
        expect(bulletSection).not.toContain('session:');
    });
});

describe('TC-4: Non-regression on the five pre-existing bullets', () => {
    for (const bullet of EXISTING_BULLETS) {
        it(`package.json default still contains: "${bullet.slice(0, 50)}..."`, () => {
            expect(packageDefault).toContain(bullet);
        });
    }

    it('all five original bullets appear in extension.ts', () => {
        for (const bullet of EXISTING_BULLETS) {
            // Bullets in template literals have escaped backticks, check core text
            const core = bullet.replace(/`/g, '');
            expect(extensionSrc).toContain(core);
        }
    });
});

describe('TC-5: Custom-template override path unbroken', () => {
    it('extension.ts still checks rawInitTemplate.trim() before falling back to default', () => {
        const pattern = /rawInitTemplate\.trim\(\)\s*\?\s*rawInitTemplate\s*:\s*defaultInitPrompt/;
        const matches = extensionSrc.match(pattern);
        expect(matches).not.toBeNull();
        expect(matches!.length).toBeGreaterThanOrEqual(1);
    });

    it('package.json setting has type string and allows empty override', () => {
        expect(initPromptSetting.type).toBe('string');
        expect(initPromptSetting.description).toContain('Leave empty');
    });
});
