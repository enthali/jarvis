/**
 * Unit tests for agent-session-reinit-fix change (#52) and
 * notification-agent-mode-reset (#54).
 *
 * TC-1: No submission when text is ''
 * TC-2: New session path injects init prompt via sendPromptModeSetting (no skip option)
 * TC-3: Init prompt content comes from injectPrompt.ts DEFAULT_INIT_PROMPT, not extension.ts
 * TC-4: extension.ts's jarvis.openActorSession passes empty string, no skipInitPrompt
 * TC-6: Mode-preserving submission for existing sessions (#54)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const coreSrcDir = path.resolve(__dirname, '..', '..', 'packages', 'core', 'src');
const injectPromptSrc = fs.readFileSync(
    path.join(coreSrcDir, 'engine', 'sessions', 'injectPrompt.ts'), 'utf-8');
const extensionSrc = fs.readFileSync(path.join(coreSrcDir, 'extension.ts'), 'utf-8');

describe('TC-1: empty text does not trigger submission', () => {
    it('step 4 in injectPrompt.ts guards on non-empty text', () => {
        // The guard pattern: if (text.trim()) { ... sendPromptModePreserving or sendPromptModeSetting ... }
        expect(injectPromptSrc).toMatch(/if\s*\(text\.trim\(\)\)\s*\{/);
    });
});

describe('TC-2: new session path injects init prompt via DEFAULT_INIT_PROMPT', () => {
    it('branch 3b calls sendPromptModeSetting with initPrompt', () => {
        // In the "new session" branch, the init prompt is built and sent via mode-setting variant
        expect(injectPromptSrc).toContain('await sendPromptModeSetting(initPrompt)');
    });

    it('the init prompt is always sent for a new session — no skip option exists', () => {
        expect(injectPromptSrc).not.toContain('skipInitPrompt');
    });
});

describe('TC-3: init prompt owned by injectPrompt.ts DEFAULT_INIT_PROMPT', () => {
    it('DEFAULT_INIT_PROMPT exists in injectPrompt.ts', () => {
        expect(injectPromptSrc).toContain('const DEFAULT_INIT_PROMPT');
    });

    it('DEFAULT_INIT_PROMPT contains all expected bullets', () => {
        const bullets = [
            'Store only long-lived items under Decision / Finding / Next.',
            'One concise line per bullet. Prune aggressively.',
            'Replace outdated bullets',
            'Never store retries, raw tool output, or transient chatter.',
            'Will this still matter in 2 weeks',
            'When a topic grows past ~5 bullets',
        ];
        for (const bullet of bullets) {
            expect(injectPromptSrc).toContain(bullet);
        }
    });

    it('extension.ts does NOT contain a local defaultInitPrompt for these callers', () => {
        // After the fix, extension.ts should not have the duplicated default prompt
        // in the openAgentSession/newActor handlers
        expect(extensionSrc).not.toMatch(/const defaultInitPrompt\s*=/);
    });
});

describe('TC-4: extension.ts callers pass empty string and no skipInitPrompt', () => {
    it('openActorSession calls injectPrompt with empty text', () => {
        // Should contain: injectPrompt(entity.name, '', { placement: 'main' })
        expect(extensionSrc).toMatch(/injectPrompt\(entity\.name,\s*'',\s*\{\s*placement:\s*'main'\s*\}\)/);
    });

    it('newActor does not pass skipInitPrompt', () => {
        // Count occurrences of skipInitPrompt in extension.ts — should be zero
        const matches = extensionSrc.match(/skipInitPrompt/g);
        expect(matches).toBeNull();
    });
});

describe('TC-6: mode-preserving submission for existing sessions (#54)', () => {
    it('sendPromptModePreserving function exists and uses chat.open without mode param', () => {
        expect(injectPromptSrc).toContain('async function sendPromptModePreserving');
        // Uses workbench.action.chat.open
        const fnStart = injectPromptSrc.indexOf('async function sendPromptModePreserving');
        const fnEnd = injectPromptSrc.indexOf('\n}', fnStart);
        const fnBody = injectPromptSrc.slice(fnStart, fnEnd);
        expect(fnBody).toContain("'workbench.action.chat.open'");
        // Must NOT carry a mode parameter
        expect(fnBody).not.toContain("mode:");
        expect(fnBody).not.toContain("mode :");
    });

    it('sendPromptModeSetting function exists and uses chat.openAgent', () => {
        expect(injectPromptSrc).toContain('async function sendPromptModeSetting');
        const fnStart = injectPromptSrc.indexOf('async function sendPromptModeSetting');
        const fnEnd = injectPromptSrc.indexOf('\n}', fnStart);
        const fnBody = injectPromptSrc.slice(fnStart, fnEnd);
        expect(fnBody).toContain("'workbench.action.chat.openAgent'");
    });

    it('step 4 uses sendPromptModePreserving for existing sessions (isExistingSession)', () => {
        // After branch 3a, isExistingSession = true → mode-preserving variant
        const step4Section = injectPromptSrc.split('// 4. Text injection')[1];
        expect(step4Section).toBeDefined();
        expect(step4Section).toContain('isExistingSession');
        expect(step4Section).toContain('sendPromptModePreserving(text)');
    });

    it('step 4 uses sendPromptModeSetting for new sessions', () => {
        const step4Section = injectPromptSrc.split('// 4. Text injection')[1];
        expect(step4Section).toContain('sendPromptModeSetting(text)');
    });

    it('isExistingSession is set to true only in branch 3a', () => {
        expect(injectPromptSrc).toContain('isExistingSession = true');
        // Should appear inside the uuid-truthy (3a) branch
        const branch3a = injectPromptSrc.slice(
            injectPromptSrc.indexOf('// 3a. Existing session'),
            injectPromptSrc.indexOf('// 3b. New session')
        );
        expect(branch3a).toContain('isExistingSession = true');
    });
});
