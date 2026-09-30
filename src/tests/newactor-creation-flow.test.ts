/**
 * Unit test for QM round-1 Finding 8 (retire-legacy-actor-kinds):
 * SPEC_ACTOR_CREATE requires `jarvis.newActor` to preserve the entered
 * name verbatim (no trimming) and to rewrite only the `agent` field via
 * `writeActorAgent` after the agent picker, never a second full
 * `writeActorFiles` call that could overwrite a context.md edit.
 *
 * The command handler is a private closure inside extension.ts's
 * activate() (not exported), so this test uses the same static-source-
 * assertion pattern used elsewhere in this suite (see
 * editor-group-placement.test.ts).
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

    it('rewrites only the agent field via writeActorAgent after the picker, never a second writeActorFiles', () => {
        const body = newActorHandlerBody();
        const pickerIdx = body.indexOf('pickAgentMode()');
        expect(pickerIdx).toBeGreaterThan(-1);
        const afterPicker = body.slice(pickerIdx);
        expect(afterPicker).toContain('writeActorAgent(');
        expect(afterPicker).not.toContain('writeActorFiles(');
    });
});
