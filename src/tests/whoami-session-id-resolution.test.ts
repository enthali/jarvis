/**
 * Unit tests for whoami-session-id-resolution (#51).
 *
 * TC-1: Source-level — no editor-focus API in whoAmI handler
 * TC-2: Source-level — session-id resolution via getEntityNameForSessionId
 * TC-3: Source-level — buffer: filter, consume, expire, ambiguity, absence
 * TC-4: Source-level — error paths converge on single error string
 * TC-5: Source-level — trace log of tool_name for live payload verification
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const coreSrcDir = path.resolve(__dirname, '..', '..', 'packages', 'core', 'src');
const extensionSrc = fs.readFileSync(path.join(coreSrcDir, 'extension.ts'), 'utf-8');

// Extract the whoAmI-related section (buffer + tool handler)
const whoAmIStart = extensionSrc.indexOf('// whoAmI correlation buffer');
const whoAmIEnd = extensionSrc.indexOf('// Inject prompt tool', whoAmIStart);
const whoAmISection = extensionSrc.slice(whoAmIStart, whoAmIEnd);

describe('TC-1: no editor-focus API in whoAmI handler', () => {
    it('does not reference activeTab in the whoAmI section', () => {
        expect(whoAmISection).not.toContain('activeTab');
    });

    it('does not reference vscode.window.tabGroups in the whoAmI section', () => {
        expect(whoAmISection).not.toContain('tabGroups');
    });

    it('does not reference activeTextEditor in the whoAmI section', () => {
        expect(whoAmISection).not.toContain('activeTextEditor');
    });
});

describe('TC-2: session-id resolution via getEntityNameForSessionId', () => {
    it('calls getEntityNameForSessionId with the session_id', () => {
        expect(whoAmISection).toContain('getEntityNameForSessionId(sessionId)');
    });

    it('getEntityNameForSessionId is imported', () => {
        expect(extensionSrc).toMatch(/import\s*\{[^}]*getEntityNameForSessionId[^}]*\}\s*from\s*'\.\/engine\/sessions\/sessionLookup'/);
    });

    it('resolves entity name and checks kind === session', () => {
        expect(whoAmISection).toContain("e.kind === 'session'");
        expect(whoAmISection).toContain('e.name === entityName');
    });
});

describe('TC-3: buffer behavioural properties', () => {
    it('filter at capture: only retains jarvis_whoAmI events', () => {
        // The hookEngine.on('PreToolUse', ...) handler checks tool_name
        expect(whoAmISection).toContain("hookEngine.on('PreToolUse'");
        expect(whoAmISection).toContain("jarvis_whoAmI");
    });

    it('consume on read: buffer is spliced/drained on take', () => {
        // splice(0) drains the array
        expect(whoAmISection).toContain('whoAmIBuffer.splice(0)');
    });

    it('expire on age: stale entries are filtered by freshness window', () => {
        expect(whoAmISection).toContain('WHOAMI_FRESHNESS_MS');
        expect(whoAmISection).toMatch(/now\s*-\s*e\.timestamp/);
    });

    it('ambiguity is an error: multiple distinct session_ids returns undefined', () => {
        expect(whoAmISection).toContain('uniqueIds.size > 1');
        // Should return undefined, not pick one
        expect(whoAmISection).toMatch(/if\s*\(uniqueIds\.size\s*>\s*1\)/);
    });

    it('absence is an error: empty buffer returns undefined', () => {
        expect(whoAmISection).toMatch(/if\s*\(fresh\.length\s*===\s*0\)/);
    });
});

describe('TC-4: error paths converge on single error string', () => {
    it('uses one consistent error message for all failure paths', () => {
        const errorMsg = 'You are not a registered actor. Please ask the user which actor you are.';
        expect(whoAmISection).toContain(`const ERROR_MSG = '${errorMsg}'`);
        // All error returns use ERROR_MSG, not custom strings
        const errorReturns = whoAmISection.match(/error:\s*ERROR_MSG/g);
        expect(errorReturns).not.toBeNull();
        expect(errorReturns!.length).toBe(3); // no sessionId, no entityName, no actor
    });

    it('does not contain the old "No active tab" error', () => {
        expect(whoAmISection).not.toContain('No active tab');
    });
});

describe('TC-5: trace log of tool_name for payload verification (Decision 6)', () => {
    it('logs payload.tool_name at trace level', () => {
        expect(whoAmISection).toContain('log.trace');
        expect(whoAmISection).toContain('PreToolUse payload.tool_name');
    });

    it('matching predicate uses endsWith to handle transport prefixes', () => {
        expect(whoAmISection).toContain("toolName.endsWith('jarvis_whoAmI')");
    });
});
