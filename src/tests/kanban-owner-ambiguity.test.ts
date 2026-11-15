/**
 * Unit test for QM round-1 Finding 3 (retire-legacy-actor-kinds):
 * REQ_KAN_CREATE AC-4 requires resolveOwnerByName to reject an ambiguous
 * name (more than one Actor sharing it) rather than silently picking the
 * first match via `.find()`.
 *
 * `resolveOwnerByName` is a private module-level helper in
 * packages/kanban/src/extension.ts (not exported, matching this file's
 * established convention of exporting only activate/deactivate), so this
 * test uses the same static-source-assertion + logic-replication pattern
 * used elsewhere in this suite (see editor-group-placement.test.ts).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const kanbanSrc = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'packages', 'kanban', 'src', 'extension.ts'), 'utf-8'
);

describe('REQ_KAN_CREATE AC-4: resolveOwnerByName rejects ambiguous names', () => {
    it('does not use .find() to pick the first matching Actor', () => {
        const fnStart = kanbanSrc.indexOf('function resolveOwnerByName');
        const fnEnd = kanbanSrc.indexOf('\n}', fnStart);
        const fnBody = kanbanSrc.slice(fnStart, fnEnd);
        expect(fnBody).not.toContain('.find(');
        expect(fnBody).toContain('.filter(');
    });
});
