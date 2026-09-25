import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { KindDrivenScanner } from '../../packages/core/src/engine/sessions/yamlScanner';

const roots: string[] = [];

afterEach(() => {
    for (const root of roots.splice(0)) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

describe('REQ_ACTOR_SCHEMA / REQ_ACTOR_ACTIVATION: legacy Actor integration', () => {
    it('limits the Actor additional root to direct children without changing primary recursion', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-actor-roots-'));
        roots.push(root);
        const sessionsRoot = path.join(root, 'sessions');
        const actorsRoot = path.join(root, 'actors');
        writeYaml(sessionsRoot, 'group/Legacy Actor', 'session.yaml', 'name: Legacy Actor\n');
        writeYaml(actorsRoot, 'Folder Name', 'actor.yaml', 'name: YAML Name\n');
        writeYaml(actorsRoot, 'archive/Nested Actor', 'actor.yaml', 'name: Nested Actor\n');

        const scanner = new KindDrivenScanner(
            () => {},
            key => key === 'jarvis.sessions.folder' ? sessionsRoot : actorsRoot,
        );
        scanner.addKind({
            kind: 'session',
            viewId: 'jarvisEntities',
            folderSettingKey: 'jarvis.sessions.folder',
            label: name => name,
            additionalScanRoots: [
                { folderSettingKey: 'jarvis.actors.folder', conventionFile: 'actor.yaml', recursive: false },
            ],
        });

        await scanner.rescan();

        expect(scanner.entities.map(entity => entity.name).sort()).toEqual(['Legacy Actor', 'YAML Name']);
        expect(scanner.entities).toContainEqual(expect.objectContaining({
            id: path.join(actorsRoot, 'Folder Name', 'actor.yaml'),
            name: 'YAML Name',
            folder: path.join(actorsRoot, 'Folder Name'),
        }));
        expect(scanner.entities.some(entity => entity.name === 'Nested Actor')).toBe(false);
    });
});

function writeYaml(root: string, relativeFolder: string, fileName: string, content: string): void {
    const folder = path.join(root, relativeFolder);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, fileName), content);
}