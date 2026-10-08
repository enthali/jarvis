import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ActorScanner } from '../../packages/core/src/engine/actors/actorScanner';

const roots: string[] = [];

afterEach(() => {
    for (const root of roots.splice(0)) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

describe('REQ_ACTOR_SCHEMA AC-9: ActorEntry carries no agent field', () => {
    it('a legacy agent key in actor.yaml has no effect on the entry', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-actors-'));
        roots.push(root);
        writeActor(root, 'Legacy Folder', 'name: Legacy Actor\nsummary: Has a legacy key\nagent: syspilot.cm\n');
        const scanner = new ActorScanner(() => root, () => {});

        await scanner.rescan();
        expect(scanner.actors[0]).not.toHaveProperty('agent');
        expect(scanner.actors[0]).toMatchObject({ name: 'Legacy Actor', summary: 'Has a legacy key' });
    });
});

describe('REQ_ACTOR_SCHEMA / REQ_ACTOR_TREE: ActorScanner', () => {
    it('discovers only direct child actors and uses the absolute actor.yaml path as id', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-actors-'));
        roots.push(root);
        writeActor(root, 'Folder Name', 'name: YAML Name\nsummary: Direct\nagent: alpha\n');
        writeActor(root, 'Second Folder', 'name: YAML Name\nsummary: Duplicate name\nagent: beta\n');
        writeActor(root, 'archive/Nested Actor', 'name: Nested Actor\nsummary: Hidden\nagent: beta\n');
        const onDidChange = vi.fn();
        const scanner = new ActorScanner(() => root, onDidChange);

        await scanner.rescan();

        expect(scanner.actors).toHaveLength(2);
        expect(scanner.actors).toContainEqual(expect.objectContaining({
            id: path.join(root, 'Folder Name', 'actor.yaml'),
            name: 'YAML Name',
            folder: path.join(root, 'Folder Name'),
        }));
        expect(scanner.actors).toContainEqual(expect.objectContaining({
            id: path.join(root, 'Second Folder', 'actor.yaml'),
            name: 'YAML Name',
            folder: path.join(root, 'Second Folder'),
        }));
        expect(new Set(scanner.actors.map(actor => actor.id)).size).toBe(2);
        expect(scanner.actors.every(actor => path.isAbsolute(actor.id))).toBe(true);
        expect(onDidChange).toHaveBeenCalledOnce();
    });

    it('falls back to the folder name and returns an empty list for an unresolved root', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-actors-'));
        roots.push(root);
        writeActor(root, 'Fallback Actor', 'summary: Missing name\n');
        const scanner = new ActorScanner(() => root, () => {});

        await scanner.rescan();
        expect(scanner.actors[0]).toMatchObject({ name: 'Fallback Actor', summary: 'Missing name' });

        const unresolved = new ActorScanner(() => '', () => {});
        await unresolved.rescan();
        expect(unresolved.actors).toEqual([]);
    });
});

function writeActor(root: string, relativeFolder: string, content: string): void {
    const folder = path.join(root, relativeFolder);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'actor.yaml'), content);
}