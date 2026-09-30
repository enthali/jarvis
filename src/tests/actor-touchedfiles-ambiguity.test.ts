/**
 * Unit tests for QM round-1 Finding 6 (retire-legacy-actor-kinds):
 * REQ_ACTOR_TOUCHEDFILES AC-22 / SPEC_ACTOR_TOUCHEDFILES AC-9 — the
 * "Recently Touched Files" category is shown only when the Actor's name
 * resolves to `found`; an ambiguous name gets no attribution on either
 * duplicate folder.
 */
import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ActorScanner } from '../../packages/core/src/engine/actors/actorScanner';
import { ActorTreeProvider } from '../../packages/core/src/engine/actors/actorTreeProvider';
import { TouchStore, ACTOR_TOUCH_KIND } from '../../packages/core/src/engine/hooks/touchStore';

const roots: string[] = [];

afterEach(() => {
    for (const root of roots.splice(0)) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

function writeActor(root: string, folderName: string, name: string): void {
    const folder = path.join(root, folderName);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'actor.yaml'), `name: "${name}"\nsummary: ""\nagent: ""\n`);
}

const noActivity = { isActive: () => false };

describe('REQ_ACTOR_TOUCHEDFILES AC-22: touched-files category ambiguity gating', () => {
    it('shows the category for a uniquely-named Actor with recent touches', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-touched-gate-'));
        roots.push(root);
        writeActor(root, 'Solo', 'Solo Actor');
        const scanner = new ActorScanner(() => root, () => {});
        await scanner.rescan();

        const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-touchstore-'));
        roots.push(stateDir);
        const store = new TouchStore(stateDir);
        await store.recordTouches(ACTOR_TOUCH_KIND, 'Solo Actor', [{ rootUri: 'file:///ws', relPath: 'a.ts', resourceUri: 'file:///ws/a.ts' }], 'write');

        const provider = new ActorTreeProvider(scanner, store, noActivity);
        const actor = scanner.actors[0];
        const categories = await provider.getChildren({ kind: 'actor', id: actor.id });

        expect(categories.some(c => 'category' in c && c.category === 'touched')).toBe(true);
    });

    it('omits the category for both folders when the name is ambiguous', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-touched-gate-'));
        roots.push(root);
        writeActor(root, 'Dup1', 'Shared Name');
        writeActor(root, 'Dup2', 'Shared Name');
        const scanner = new ActorScanner(() => root, () => {});
        await scanner.rescan();

        const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-touchstore-'));
        roots.push(stateDir);
        const store = new TouchStore(stateDir);
        await store.recordTouches(ACTOR_TOUCH_KIND, 'Shared Name', [{ rootUri: 'file:///ws', relPath: 'a.ts', resourceUri: 'file:///ws/a.ts' }], 'write');

        const provider = new ActorTreeProvider(scanner, store, noActivity);
        for (const actor of scanner.actors) {
            const categories = await provider.getChildren({ kind: 'actor', id: actor.id });
            expect(categories.some(c => 'category' in c && c.category === 'touched')).toBe(false);
        }
    });
});
