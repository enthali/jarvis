/**
 * Unit tests for agent-session-reinit-fix change (#52).
 *
 * TC-1: sendPromptToFocusedAgentChat is NOT called when text is ''
 * TC-2: sendPromptToFocusedAgentChat IS called with init prompt on new session
 * TC-3: Init prompt content comes from injectPrompt.ts DEFAULT_INIT_PROMPT, not extension.ts
 * TC-4: extension.ts callers pass empty string, not skipInitPrompt
 * TC-5: coreApi.ts openActorSession passes empty string (no local composition)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const coreSrcDir = path.resolve(__dirname, '..', '..', 'packages', 'core', 'src');
const injectPromptSrc = fs.readFileSync(
    path.join(coreSrcDir, 'engine', 'sessions', 'injectPrompt.ts'), 'utf-8');
const extensionSrc = fs.readFileSync(path.join(coreSrcDir, 'extension.ts'), 'utf-8');
const coreApiSrc = fs.readFileSync(path.join(coreSrcDir, 'engine', 'core', 'coreApi.ts'), 'utf-8');

describe('TC-1: empty text does not trigger sendPromptToFocusedAgentChat', () => {
    it('step 4 in injectPrompt.ts guards on non-empty text', () => {
        // The guard pattern: if (text) { await sendPromptToFocusedAgentChat(text); }
        expect(injectPromptSrc).toMatch(/if\s*\(text\)\s*\{[\s\S]*?sendPromptToFocusedAgentChat\(text\)/);
    });
});

describe('TC-2: new session path injects init prompt via DEFAULT_INIT_PROMPT', () => {
    it('branch 3b calls sendPromptToFocusedAgentChat with initPrompt when skipInitPrompt is false', () => {
        // In the "new session" branch, the init prompt is built and sent
        expect(injectPromptSrc).toContain('await sendPromptToFocusedAgentChat(initPrompt)');
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
