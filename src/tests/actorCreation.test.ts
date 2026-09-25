import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createSimpleActorHandler } from '../../packages/core/src/engine/actors/actorCreation';

const roots: string[] = [];

afterEach(() => {
    for (const root of roots.splice(0)) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

describe('REQ_ACTOR_CREATE: registered simple Actor handler', () => {
    it('leaves an existing direct-child folder without actor.yaml unchanged', async () => {
        const actorsFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-actor-create-'));
        roots.push(actorsFolder);
        const actorName = 'Existing Actor';
        const targetFolder = path.join(actorsFolder, actorName);
        fs.mkdirSync(targetFolder);
        fs.writeFileSync(path.join(targetFolder, 'marker.txt'), 'unchanged', 'utf8');
        const before = snapshot(targetFolder);
        const showAlreadyExists = vi.fn();
        const pickAgentMode = vi.fn(async () => 'agent');
        const rescanLegacyActors = vi.fn(async () => {});
        const rescanActors = vi.fn(async () => {});
        const logCreated = vi.fn();
        const handler = createSimpleActorHandler({
            chooseEntry: async () => true,
            promptName: async () => actorName,
            resolveActorsFolder: () => actorsFolder,
            showNoWorkspace: vi.fn(),
            showAlreadyExists,
            pickAgentMode,
            rescanLegacyActors,
            rescanActors,
            yamlString: value => JSON.stringify(value),
            logCreated,
        });

        await handler();

        expect(showAlreadyExists).toHaveBeenCalledOnce();
        expect(showAlreadyExists).toHaveBeenCalledWith(actorName);
        expect(snapshot(targetFolder)).toEqual(before);
        expect(fs.existsSync(path.join(targetFolder, 'actor.yaml'))).toBe(false);
        expect(fs.existsSync(path.join(targetFolder, 'context.md'))).toBe(false);
        expect(pickAgentMode).not.toHaveBeenCalled();
        expect(rescanLegacyActors).not.toHaveBeenCalled();
        expect(rescanActors).not.toHaveBeenCalled();
        expect(logCreated).not.toHaveBeenCalled();
    });
});

function snapshot(folder: string): Array<{ name: string; content: string }> {
    return fs.readdirSync(folder).sort().map(name => ({
        name,
        content: fs.readFileSync(path.join(folder, name), 'utf8'),
    }));
}