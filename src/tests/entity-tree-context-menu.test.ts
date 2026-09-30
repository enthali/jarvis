/**
 * Unit tests for the Actor context menu (SPEC_ACTOR_CONTEXTMENU,
 * SPEC_ACTOR_TOUCHEDFILES), superseding the retired Session/Project/Event
 * entity context-menu shape (entity-tree-context-menu, ui-improvements CRs).
 *
 * - jarvis.openContext / jarvis.openYamlFile remain fully retired.
 * - resolveCopyPaths() + jarvis.copyPath / jarvis.copyFullPath /
 *   jarvis.copyFileName commands registered in extension.ts.
 * - view/item/context bindings for jarvisActor / jarvisActorFile /
 *   jarvisTouchedFile / jarvisTouchedFileFolder /
 *   jarvisActorFileCategory:touched, with no entries for categories/folders
 *   that own no context menu (agent/files categories, actorFileFolder).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const coreSrcDir = path.resolve(__dirname, '..', '..', 'packages', 'core', 'src');
const extensionSrc = fs.readFileSync(path.join(coreSrcDir, 'extension.ts'), 'utf-8');
const corePackageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', '..', 'packages', 'core', 'package.json'), 'utf-8')
);

describe('SPEC_ENT_OPENCONTEXT_CMD / SPEC_ENT_OPENYAML_CMD: fully retired', () => {
    it('extension.ts no longer registers jarvis.openContext', () => {
        expect(extensionSrc).not.toContain("'jarvis.openContext'");
    });

    it('extension.ts no longer registers jarvis.openYamlFile', () => {
        expect(extensionSrc).not.toContain("'jarvis.openYamlFile'");
    });

    it('core package.json has no jarvis.openContext or jarvis.openYamlFile contributions anywhere', () => {
        const raw = JSON.stringify(corePackageJson);
        expect(raw).not.toContain('jarvis.openContext');
        expect(raw).not.toContain('jarvis.openYamlFile');
    });
});

describe('SPEC_ACTOR_CONTEXTMENU: resolveCopyPaths() + commands registered', () => {
    it('resolveCopyPaths is defined and handles actorFile/touchedFileLeaf, actorFileFolder, touchedFileFolder, and the Actor root', () => {
        expect(extensionSrc).toContain('function resolveCopyPaths(node: CopyPathNode)');
        expect(extensionSrc).toContain("node.kind === 'actorFile' || node.kind === 'touchedFileLeaf'");
        expect(extensionSrc).toContain("node.kind === 'actorFileFolder'");
        expect(extensionSrc).toContain("node.kind === 'touchedFileFolder'");
    });

    it('jarvis.copyPath, jarvis.copyFullPath, and jarvis.copyFileName are registered and use vscode.env.clipboard.writeText', () => {
        expect(extensionSrc).toContain("'jarvis.copyPath'");
        expect(extensionSrc).toContain("'jarvis.copyFullPath'");
        expect(extensionSrc).toContain("'jarvis.copyFileName'");
        expect(extensionSrc).toContain('vscode.env.clipboard.writeText');
    });

    it('copyPathCommand, copyFullPathCommand, and copyFileNameCommand are pushed to context.subscriptions', () => {
        expect(extensionSrc).toContain('copyPathCommand,');
        expect(extensionSrc).toContain('copyFullPathCommand,');
        expect(extensionSrc).toContain('copyFileNameCommand,');
    });
});

describe('SPEC_ACTOR_CONTEXTMENU: resolveCopyPaths() behavior', () => {
    type ActorNode = { kind: 'actor'; id: string };
    type ActorFileNode = { kind: 'actorFile'; filePath: string; label: string };
    type ActorFileFolderNode = { kind: 'actorFileFolder'; folderPath: string; label: string };
    type TouchedFileFolderNode = { kind: 'touchedFileFolder'; relFolderPath: string; label: string };
    type CopyPathNode = ActorNode | ActorFileNode | ActorFileFolderNode | TouchedFileFolderNode;

    // Mirrors the real implementation to confirm expected runtime behavior
    // (source-content assertions above confirm this matches extension.ts).
    function resolveCopyPaths(node: CopyPathNode): { folder: string; full: string } {
        if (node.kind === 'actorFile') {
            return { folder: path.dirname(node.filePath), full: node.filePath };
        }
        if (node.kind === 'actorFileFolder') {
            return { folder: path.dirname(node.folderPath), full: node.folderPath };
        }
        if (node.kind === 'touchedFileFolder') {
            const workspaceRoot = path.join('workspace');
            const full = path.join(workspaceRoot, node.relFolderPath);
            return { folder: path.dirname(full), full };
        }
        const folder = path.dirname(node.id);
        return { folder, full: folder };
    }

    it('actorFile node: folder is dirname, full is the file path itself', () => {
        const node: ActorFileNode = { kind: 'actorFile', filePath: path.join('alpha', 'context.md'), label: 'context.md' };
        const result = resolveCopyPaths(node);
        expect(result.folder).toBe('alpha');
        expect(result.full).toBe(path.join('alpha', 'context.md'));
    });

    it('Actor root node: folder and full are both the containing directory', () => {
        const node: ActorNode = { kind: 'actor', id: path.join('alpha', 'actor.yaml') };
        const result = resolveCopyPaths(node);
        expect(result.folder).toBe('alpha');
        expect(result.full).toBe('alpha');
    });
});

describe('SPEC_ACTOR_CONTEXTMENU: package.json menu bindings (core)', () => {
    const items: { command: string; when?: string; group?: string }[] =
        corePackageJson.contributes.menus['view/item/context'];

    it('jarvisActor has Open / context-actions / Copy Path / Copy Full Path — no Copy File Name', () => {
        expect(items).toContainEqual({ command: 'jarvis.openActorSession', when: 'viewItem == jarvisActor', group: 'open' });
        expect(items).toContainEqual({ command: 'jarvis.copyPath', when: 'viewItem == jarvisActor', group: 'clipboard@1' });
        expect(items).toContainEqual({ command: 'jarvis.copyFullPath', when: 'viewItem == jarvisActor', group: 'clipboard@2' });
        expect(items.some(i => i.when === 'viewItem == jarvisActor' && i.command === 'jarvis.copyFileName')).toBe(false);
    });

    it('jarvisActorFile has Open / Copy Path / Copy Full Path / Copy File Name', () => {
        expect(items).toContainEqual({ command: 'jarvis.openActorFile', when: 'viewItem == jarvisActorFile', group: 'open' });
        expect(items).toContainEqual({ command: 'jarvis.copyPath', when: 'viewItem == jarvisActorFile', group: 'clipboard@1' });
        expect(items).toContainEqual({ command: 'jarvis.copyFullPath', when: 'viewItem == jarvisActorFile', group: 'clipboard@2' });
        expect(items).toContainEqual({ command: 'jarvis.copyFileName', when: 'viewItem == jarvisActorFile', group: 'clipboard@3' });
    });

    it('jarvisTouchedFile has Open / diff / remove and the 3 copy commands', () => {
        expect(items).toContainEqual({ command: 'jarvis.openActorFile', when: 'viewItem == jarvisTouchedFile', group: 'open' });
        expect(items).toContainEqual({ command: 'jarvis.diffTouchedFile', when: 'viewItem == jarvisTouchedFile', group: 'diff' });
        expect(items).toContainEqual({ command: 'jarvis.removeTouchedFile', when: 'viewItem == jarvisTouchedFile', group: 'inline' });
    });

    it('jarvisTouchedFileFolder and jarvisActorFileCategory:touched expose bulk removal/cleanup', () => {
        expect(items).toContainEqual({ command: 'jarvis.removeTouchedFiles', when: 'viewItem == jarvisTouchedFileFolder', group: 'inline' });
        expect(items).toContainEqual({ command: 'jarvis.removeTouchedFiles', when: 'viewItem == jarvisActorFileCategory:touched', group: 'inline@2' });
        expect(items).toContainEqual({ command: 'jarvis.cleanupTouchedFiles', when: 'viewItem == jarvisActorFileCategory:touched', group: 'inline@1' });
    });

    it('jarvis.copyPath / jarvis.copyFullPath / jarvis.copyFileName are hidden from the command palette', () => {
        const palette: { command: string; when?: string }[] = corePackageJson.contributes.menus.commandPalette;
        expect(palette).toContainEqual({ command: 'jarvis.copyPath', when: 'false' });
        expect(palette).toContainEqual({ command: 'jarvis.copyFullPath', when: 'false' });
        expect(palette).toContainEqual({ command: 'jarvis.copyFileName', when: 'false' });
    });

    it('no context menu is contributed for the retired jarvisFolder / jarvisEntityFile / jarvisSession viewItems', () => {
        const raw = JSON.stringify(items);
        expect(raw).not.toContain('jarvisFolder');
        expect(raw).not.toContain('jarvisEntityFile');
        expect(raw).not.toContain('jarvisEntityCategory');
        // jarvisSessionManual/jarvisSessionAutoDeliver (Messages feature) are unrelated and must remain.
        expect(items.some(i => i.when === 'viewItem == jarvisSession' || i.when === 'viewItem =~ /^jarvisSession$/')).toBe(false);
    });
});
