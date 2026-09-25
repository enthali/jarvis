import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type * as vscode from 'vscode';
import { LanguageModelTextPart } from './__mocks__/vscode';
import { ActorScanner } from '../../packages/core/src/engine/actors/actorScanner';
import { combineValidDestinations } from '../../packages/core/src/engine/sessions/sessionLookup';
import {
    createActorEntitySource,
    createListActorsHandler,
    resolveActorIdentity,
    type ActorEntitySource,
} from '../../packages/core/src/engine/actors/actorRuntime';

const roots: string[] = [];

afterEach(() => {
    for (const root of roots.splice(0)) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

describe('REQ_ACTOR_SCHEMA AC-7: registered listActors handler', () => {
    it('returns kindless direct Actors with ids and unchanged legacy entries', async () => {
        const root = makeRoot();
        writeActor(root, 'Direct Folder', 'Direct Actor');
        writeActor(root, 'archive/Nested Folder', 'Nested Actor');
        const actorScanner = new ActorScanner(() => root, () => {});
        await actorScanner.rescan();
        const legacySource = source([
            {
                id: path.join(root, 'legacy', 'session.yaml'),
                name: 'Legacy Actor',
                summary: 'Legacy summary',
                agent: 'Legacy Agent',
                kind: 'session',
                folder: path.join(root, 'legacy'),
            },
        ]);
        const log = { info: vi.fn() };
        const handler = createListActorsHandler(legacySource, actorScanner, log);

        const result = await handler(
            {} as vscode.LanguageModelToolInvocationOptions<unknown>,
            {} as vscode.CancellationToken,
        );
        const payload = JSON.parse((result.content[0] as LanguageModelTextPart).value);

        expect(payload.sessions).toEqual([
            {
                name: 'Legacy Actor',
                summary: 'Legacy summary',
                agent: 'Legacy Agent',
                folder: path.join(root, 'legacy'),
            },
            {
                name: 'Direct Actor',
                summary: '',
                agent: '',
                folder: path.join(root, 'Direct Folder'),
                id: path.join(root, 'Direct Folder', 'actor.yaml'),
            },
        ]);
        expect(payload.sessions.some((entry: { name: string }) => entry.name === 'Nested Actor')).toBe(false);
        expect(log.info).toHaveBeenCalledWith('[SES] listActors: 2 Actor(s)');
    });
});

describe('REQ_AUT_HEARTBEAT_RESOLVER_REUSE AC-3: unified destination union', () => {
    it('combines chats, legacy entities, and kindless direct-child Actors', async () => {
        const root = makeRoot();
        writeActor(root, 'Direct Folder', 'New Actor');
        writeActor(root, 'archive/Nested Folder', 'Nested Actor');
        const actorScanner = new ActorScanner(() => root, () => {});
        await actorScanner.rescan();
        const combined = createActorEntitySource(source([{
            id: path.join(root, 'legacy', 'session.yaml'),
            name: 'Legacy Actor',
            kind: 'session',
            folder: path.join(root, 'legacy'),
        }]), actorScanner);

        const destinations = combineValidDestinations(['Open Chat', 'Legacy Actor'], combined);

        expect(destinations).toEqual(['Open Chat', 'Legacy Actor', 'New Actor']);
        expect(destinations).not.toContain('Nested Actor');
    });
});

describe('REQ_ACTOR_WHOAMI AC-1: runtime identity resolution', () => {
    it('returns actor.yaml id for a new Actor and no id for a legacy Actor', async () => {
        const root = makeRoot();
        writeActor(root, 'New Folder', 'New Actor');
        const actorScanner = new ActorScanner(() => root, () => {});
        await actorScanner.rescan();
        const legacyFolder = path.join(root, 'legacy');
        const legacySource = source([{
            id: path.join(legacyFolder, 'session.yaml'),
            name: 'Legacy Actor',
            kind: 'session',
            folder: legacyFolder,
        }]);
        const combined = createActorEntitySource(legacySource, actorScanner);

        expect(resolveActorIdentity('New Actor', combined, actorScanner)).toEqual({
            kind: 'found',
            payload: {
                name: 'New Actor',
                contextPath: path.join(root, 'New Folder', 'context.md'),
                id: path.join(root, 'New Folder', 'actor.yaml'),
            },
        });
        expect(resolveActorIdentity('Legacy Actor', combined, actorScanner)).toEqual({
            kind: 'found',
            payload: {
                name: 'Legacy Actor',
                contextPath: path.join(legacyFolder, 'context.md'),
            },
        });
    });

    it('reports both convention paths for a same-name collision', async () => {
        const root = makeRoot();
        writeActor(root, 'New Folder', 'Shared Actor');
        const actorScanner = new ActorScanner(() => root, () => {});
        await actorScanner.rescan();
        const legacyPath = path.join(root, 'legacy', 'session.yaml');
        const combined = createActorEntitySource(source([{
            id: legacyPath,
            name: 'Shared Actor',
            kind: 'session',
            folder: path.dirname(legacyPath),
        }]), actorScanner);

        expect(resolveActorIdentity('Shared Actor', combined, actorScanner)).toEqual({
            kind: 'ambiguous',
            paths: [legacyPath, path.join(root, 'New Folder', 'actor.yaml')],
        });
    });
});

function makeRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-actor-runtime-'));
    roots.push(root);
    return root;
}

function writeActor(root: string, relativeFolder: string, name: string): void {
    const folder = path.join(root, relativeFolder);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'actor.yaml'), `name: ${name}\n`);
}

function source(entities: ActorEntitySource['entities']): ActorEntitySource {
    return { entities };
}