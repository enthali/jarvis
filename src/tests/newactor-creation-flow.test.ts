/**
 * Unit tests for `jarvis.newActor` (SPEC_ACTOR_CREATE).
 *
 * The command handler is a private closure inside extension.ts's
 * activate() (not exported), so this test uses the same static-source-
 * assertion pattern used elsewhere in this suite (see
 * editor-group-placement.test.ts).
 *
 * The first two assertions below were originally added for QM round-1
 * finding 8 (retire-legacy-actor-kinds) and restored here after
 * actor-identity-via-agent-file deleted the file that held them (Verify
 * Issue 1): they still describe live behaviour. The third assertion
 * replaces the old picker/writeActorAgent check with the new
 * ensureActorAgent wiring.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const extensionSrc = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'packages', 'core', 'src', 'extension.ts'), 'utf-8'
);

function newActorHandlerBody(): string {
    const start = extensionSrc.indexOf("'jarvis.newActor'");
    const end = extensionSrc.indexOf('context.subscriptions.push(newActorCommand)', start);
    return extensionSrc.slice(start, end);
}

describe('SPEC_ACTOR_CREATE: jarvis.newActor preserves the verbatim name', () => {
    it('does not trim the InputBox value before using it', () => {
        const body = newActorHandlerBody();
        expect(body).not.toContain('nameInput.trim()');
        expect(body).toContain('const name = nameInput;');
    });

    it('checks existingActorFolder before any write, not just target-folder existence', () => {
        const body = newActorHandlerBody();
        expect(body).toContain('existingActorFolder(actorsFolder, name, actorScanner)');
        expect(body).not.toContain('fs.existsSync(targetPath)');
    });
});

describe('SPEC_ACTOR_WHOAMI: jarvis.newActor calls ensureActorAgent, no picker', () => {
    it('calls ensureActorAgent after writeActorFiles, and shows no agent picker', () => {
        const body = newActorHandlerBody();
        const writeIdx = body.indexOf('writeActorFiles(');
        expect(writeIdx).toBeGreaterThan(-1);
        const afterWrite = body.slice(writeIdx);
        expect(afterWrite).toContain('ensureActorAgent(');
        expect(body).not.toContain('pickAgentMode');
        expect(body).not.toContain('writeActorAgent(');
    });
});
