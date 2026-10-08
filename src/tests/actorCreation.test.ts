import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { actorNameProblem, existingActorFolder, validateActorName, writeActorFiles } from '../../packages/core/src/engine/actors/actorCreation';
import { ActorScanner } from '../../packages/core/src/engine/actors/actorScanner';

const roots: string[] = [];

afterEach(() => {
    for (const root of roots.splice(0)) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

describe('REQ_ACTOR_CREATE: validateActorName', () => {
    it('accepts a plain name', () => {
        expect(() => validateActorName('My Actor')).not.toThrow();
    });

    it('rejects an empty or whitespace-only name', () => {
        expect(() => validateActorName('')).toThrow(/must not be empty/);
        expect(() => validateActorName('   ')).toThrow(/must not be empty/);
    });

    it('rejects a name consisting only of dots', () => {
        expect(() => validateActorName('..')).toThrow(/only of dots/);
    });

    it('rejects forbidden path characters', () => {
        expect(() => validateActorName('bad/name')).toThrow(/forbidden character/);
        expect(() => validateActorName('bad:name')).toThrow(/forbidden character/);
    });

    it('rejects control characters', () => {
        expect(() => validateActorName('bad\x00name')).toThrow(/control character/);
    });

    it('rejects Windows-reserved device names', () => {
        expect(() => validateActorName('CON')).toThrow(/reserved Windows device name/);
        expect(() => validateActorName('con')).toThrow(/reserved Windows device name/);
    });
});

describe('REQ_ACTOR_CREATE: actorNameProblem (InputBox validator)', () => {
    it('returns null for a valid name', () => {
        expect(actorNameProblem('Valid Actor')).toBeNull();
    });

    it('returns the error message for an invalid name', () => {
        expect(actorNameProblem('bad/name')).toMatch(/forbidden character/);
    });
});

describe('REQ_ACTOR_CREATE: writeActorFiles', () => {
    it('writes actor.yaml with name/summary and context.md with the summary', async () => {
        const actorsFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-actor-create-'));
        roots.push(actorsFolder);

        const target = await writeActorFiles(actorsFolder, { name: 'New Actor', summary: 'A summary' });

        expect(target).toBe(path.join(actorsFolder, 'New Actor'));
        const yaml = fs.readFileSync(path.join(target, 'actor.yaml'), 'utf8');
        expect(yaml).toContain('name: "New Actor"');
        expect(yaml).toContain('summary: "A summary"');
        expect(yaml).not.toContain('agent:');
        expect(fs.readFileSync(path.join(target, 'context.md'), 'utf8')).toBe('# New Actor\n\nA summary\n');
    });

    it('writes an empty summary when omitted', async () => {
        const actorsFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-actor-create-'));
        roots.push(actorsFolder);

        const target = await writeActorFiles(actorsFolder, { name: 'Quiet Actor' });

        const yaml = fs.readFileSync(path.join(target, 'actor.yaml'), 'utf8');
        expect(yaml).toContain('summary: ""');
        expect(fs.readFileSync(path.join(target, 'context.md'), 'utf8')).toBe('# Quiet Actor\n\n');
    });
});

describe('REQ_ACTOR_CREATE AC-3 / REQ_ACTOR_CREATETOOL AC-7: existingActorFolder (finding 2)', () => {
    it('returns undefined when the name is free', async () => {
        const actorsFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-actor-create-'));
        roots.push(actorsFolder);
        const scanner = new ActorScanner(() => actorsFolder, () => {});

        expect(await existingActorFolder(actorsFolder, 'Fresh Name', scanner)).toBeUndefined();
    });

    it('blocks on an existing target folder even without actor.yaml', async () => {
        const actorsFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-actor-create-'));
        roots.push(actorsFolder);
        fs.mkdirSync(path.join(actorsFolder, 'Taken'));
        const scanner = new ActorScanner(() => actorsFolder, () => {});

        expect(await existingActorFolder(actorsFolder, 'Taken', scanner)).toBe(path.join(actorsFolder, 'Taken'));
    });

    it('blocks on a name already carried by an Actor in a different folder (rescans first)', async () => {
        const actorsFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-actor-create-'));
        roots.push(actorsFolder);
        // Hand-edited actor.yaml under a differently-named folder, added after scanner construction.
        await writeActorFiles(actorsFolder, { name: 'Existing Name', summary: '' });
        const scanner = new ActorScanner(() => actorsFolder, () => {});

        const blocking = await existingActorFolder(actorsFolder, 'Existing Name', scanner);
        expect(blocking).toBe(path.join(actorsFolder, 'Existing Name'));
    });

    it('blocks on an ambiguous name, returning the first match', async () => {
        const actorsFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-actor-create-'));
        roots.push(actorsFolder);
        fs.mkdirSync(path.join(actorsFolder, 'Alpha Folder'), { recursive: true });
        fs.writeFileSync(path.join(actorsFolder, 'Alpha Folder', 'actor.yaml'), 'name: "Dup"\n');
        fs.mkdirSync(path.join(actorsFolder, 'Beta Folder'), { recursive: true });
        fs.writeFileSync(path.join(actorsFolder, 'Beta Folder', 'actor.yaml'), 'name: "Dup"\n');
        const scanner = new ActorScanner(() => actorsFolder, () => {});

        const blocking = await existingActorFolder(actorsFolder, 'Dup', scanner);
        expect(blocking).toBe(path.join(actorsFolder, 'Alpha Folder'));
    });
});
