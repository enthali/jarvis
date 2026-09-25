import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..', '..');
const coreManifest = JSON.parse(fs.readFileSync(path.join(root, 'packages/core/package.json'), 'utf8'));
const actorSchema = JSON.parse(fs.readFileSync(path.join(root, 'schemas/actor.schema.json'), 'utf8'));
const packagedActorSchema = JSON.parse(fs.readFileSync(path.join(root, 'packages/core/schemas/actor.schema.json'), 'utf8'));
const extensionSource = fs.readFileSync(path.join(root, 'packages/core/src/extension.ts'), 'utf8');
const actorCreationSource = fs.readFileSync(path.join(root, 'packages/core/src/engine/actors/actorCreation.ts'), 'utf8');

describe('REQ_ACTOR_SCHEMA', () => {
    it('defines and packages the strict actor.yaml schema', () => {
        expect(actorSchema.required).toEqual(['name']);
        expect(actorSchema.properties.name).toMatchObject({ type: 'string', minLength: 1 });
        expect(actorSchema.properties.summary.type).toBe('string');
        expect(actorSchema.properties.agent.type).toBe('string');
        expect(actorSchema.additionalProperties).toBe(false);
        expect(packagedActorSchema).toEqual(actorSchema);
        expect(coreManifest.contributes.yamlValidation).toContainEqual({
            fileMatch: 'actor.yaml',
            url: './schemas/actor.schema.json',
        });
    });
});

describe('REQ_ACTOR_TREE / REQ_ACTOR_CREATE', () => {
    it('contributes the dedicated ACTORS view and title-only creation command', () => {
        expect(coreManifest.contributes.views['jarvis-explorer']).toContainEqual({
            id: 'jarvisActors',
            name: 'ACTORS',
        });
        expect(coreManifest.contributes.commands).toContainEqual(expect.objectContaining({
            command: 'jarvis.newActorSimple',
            title: 'Jarvis: New Simple Actor',
            icon: '$(add)',
        }));
        expect(coreManifest.contributes.menus.commandPalette).toContainEqual({
            command: 'jarvis.newActorSimple',
            when: 'false',
        });
        expect(coreManifest.contributes.menus['view/title']).toContainEqual({
            command: 'jarvis.newActorSimple',
            when: 'view == jarvisActors',
            group: 'navigation@1',
        });
    });

    it('registers the Actor-only New Entry flow and configured-folder rescan', () => {
        expect(extensionSource).toContain("'jarvis.newActorSimple'");
        expect(extensionSource).toContain("[{ label: 'Create Actor' }]");
        expect(extensionSource).toContain("{ title: 'New Entry', placeHolder: 'Choose an entry type' }");
        expect(extensionSource).toContain("e.affectsConfiguration('jarvis.actors.folder')");
        expect(extensionSource).toContain("if (/^\\.+$/.test(trimmed))");
    });

    it('keeps new Actors out of KindDrivenScanner registration', () => {
        const sessionConfigStart = extensionSource.indexOf('const sessionKindConfig');
        const sessionConfigEnd = extensionSource.indexOf('sessionKindDisposable =', sessionConfigStart);
        const sessionConfig = extensionSource.slice(sessionConfigStart, sessionConfigEnd);

        expect(sessionConfig).not.toContain('jarvis.actors.folder');
        expect(sessionConfig).not.toContain('actor.yaml');
        expect(extensionSource).toContain('createActorEntitySource(kindDrivenScanner, actorScanner)');
        expect(extensionSource).toContain('activateHeartbeat(context, messageProvider, resolveMessagesPath, log, entitySource)');
        expect(extensionSource).toContain('getValidDestinations(entitySource)');
    });

    it('uses the verbatim Actor name and rejects any existing direct child folder', () => {
        const commandStart = extensionSource.indexOf("'jarvis.newActorSimple'");
        const commandEnd = extensionSource.indexOf('// Helper: flatten tree', commandStart);
        const commandSource = extensionSource.slice(commandStart, commandEnd);

        expect(commandSource).toContain('createSimpleActorHandler({');
        expect(actorCreationSource).toContain('const targetFolder = path.join(actorsFolder, name)');
        expect(actorCreationSource).toContain('if (fs.existsSync(targetFolder))');
        expect(actorCreationSource.indexOf('if (fs.existsSync(targetFolder))'))
            .toBeLessThan(actorCreationSource.indexOf('await fs.promises.mkdir(targetFolder'));
        expect(actorCreationSource).toContain('`name: ${dependencies.yamlString(name)}`');
        expect(actorCreationSource).toContain("'summary: \"\"'");
        expect(actorCreationSource).toContain('`# ${name}\\n\\n`');
    });
});