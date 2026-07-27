/**
 * Unit tests for agent-session-reinit-fix change (#52) and
 * notification-agent-mode-reset (#54).
 *
 * TC-1: No submission when text is ''
 * TC-2: New session path injects init prompt via sendPromptModeSetting
 * TC-3: Init prompt content comes from injectPrompt.ts DEFAULT_INIT_PROMPT, not extension.ts
 * TC-4: extension.ts callers pass empty string, not skipInitPrompt
 * TC-5: coreApi.ts openActorSession passes empty string (no local composition)
 * TC-6: Mode-preserving submission for existing sessions (#54)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const coreSrcDir = path.resolve(__dirname, '..', '..', 'packages', 'core', 'src');
const injectPromptSrc = fs.readFileSync(
    path.join(coreSrcDir, 'engine', 'sessions', 'injectPrompt.ts'), 'utf-8');
const extensionSrc = fs.readFileSync(path.join(coreSrcDir, 'extension.ts'), 'utf-8');
const coreApiSrc = fs.readFileSync(path.join(coreSrcDir, 'engine', 'core', 'coreApi.ts'), 'utf-8');

describe('TC-1: empty text does not trigger submission', () => {
    it('step 4 in injectPrompt.ts guards on non-empty text', () => {
        // The guard pattern: if (text) { ... sendPromptModePreserving or sendPromptModeSetting ... }
        expect(injectPromptSrc).toMatch(/if\s*\(text\)\s*\{/);
    });
});

describe('TC-2: new session path injects init prompt via DEFAULT_INIT_PROMPT', () => {
    it('branch 3b calls sendPromptModeSetting with initPrompt when skipInitPrompt is false', () => {
        // In the "new session" branch, the init prompt is built and sent via mode-setting variant
        expect(injectPromptSrc).toContain('await sendPromptModeSetting(initPrompt)');
    });

    it('skipInitPrompt defaults to false', () => {
        expect(injectPromptSrc).toMatch(/skipInitPrompt\s*=\s*options\?\.skipInitPrompt\s*\?\?\s*false/);
    });

    it('init prompt is only sent when !skipInitPrompt', () => {
        expect(injectPromptSrc).toMatch(/if\s*\(!skipInitPrompt\)/);
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
    it('openAgentSession calls injectPrompt with empty text', () => {
        // Should contain: injectPrompt(entity.name, '', { placement: 'main' })
        expect(extensionSrc).toMatch(/injectPrompt\(entity\.name,\s*'',\s*\{\s*placement:\s*'main'\s*\}\)/);
    });

    it('newActor calls injectPrompt with empty text', () => {
        // Should contain: injectPrompt(nameInput, '', { placement: 'main' })
        expect(extensionSrc).toMatch(/injectPrompt\(nameInput,\s*'',\s*\{\s*placement:\s*'main'\s*\}\)/);
    });

    it('neither caller passes skipInitPrompt: true', () => {
        // Count occurrences of skipInitPrompt in extension.ts — should be zero
        const matches = extensionSrc.match(/skipInitPrompt/g);
        expect(matches).toBeNull();
    });
});

describe('TC-5: coreApi.ts openActorSession passes empty string', () => {
    it('openActorSession calls injectPrompt with empty text', () => {
        expect(coreApiSrc).toMatch(/inject\(entityName,\s*'',\s*\{\s*placement:/);
    });

    it('openActorSession does not compose a local defaultInitPrompt', () => {
        // The openActorSession method should not contain any init prompt template
        const methodStart = coreApiSrc.indexOf('async openActorSession');
        const methodEnd = coreApiSrc.indexOf('}', coreApiSrc.indexOf('return inject', methodStart));
        const methodBody = coreApiSrc.slice(methodStart, methodEnd);
        expect(methodBody).not.toContain('defaultInitPrompt');
        expect(methodBody).not.toContain('initTemplate');
        expect(methodBody).not.toContain('rawTemplate');
    });

    it('openActorSession does not pass skipInitPrompt', () => {
        const methodStart = coreApiSrc.indexOf('async openActorSession');
        const methodEnd = coreApiSrc.indexOf('}', coreApiSrc.indexOf('return inject', methodStart));
        const methodBody = coreApiSrc.slice(methodStart, methodEnd);
        expect(methodBody).not.toContain('skipInitPrompt');
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
