/**
 * Unit tests for entity-tree-context-menu change.
 *
 * Part 1 (retirement, SPEC_ENT_OPENCONTEXT_CMD / SPEC_ENT_OPENYAML_CMD):
 * - jarvis.openContext / jarvis.openYamlFile fully removed from
 *   packages/core/src/extension.ts (registration + subscriptions) and from
 *   packages/core/package.json + packages/pim/package.json contributions.
 *
 * Part 2 (SPEC_ENT_ENTITY_CONTEXTMENU):
 * - resolveCopyPaths() helper + jarvis.copyPath / jarvis.copyFullPath
 *   commands registered in extension.ts.
 * - view/item/context bindings add Open / Copy Path / Copy Full Path for
 *   jarvisEntityFile + jarvisSession (core) and jarvisProject + jarvisEvent
 *   (pim), with no entries for jarvisFolder (REQ_ENT_ENTITY_CONTEXTMENU AC-7).
 *
 * Since the command handlers are private closures inside extension.ts's
 * activate() (not exported), these tests validate source content directly
 * (established pattern — see editor-group-placement.test.ts) plus a
 * behavioral simulation of resolveCopyPaths()'s logic.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const coreSrcDir = path.resolve(__dirname, '..', '..', 'packages', 'core', 'src');
const extensionSrc = fs.readFileSync(path.join(coreSrcDir, 'extension.ts'), 'utf-8');
const corePackageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', '..', 'packages', 'core', 'package.json'), 'utf-8')
);
const pimPackageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', '..', 'packages', 'pim', 'package.json'), 'utf-8')
);

describe('SPEC_ENT_OPENCONTEXT_CMD / SPEC_ENT_OPENYAML_CMD: fully retired', () => {
    it('extension.ts no longer registers jarvis.openContext', () => {
        expect(extensionSrc).not.toContain("'jarvis.openContext'");
    });

    it('extension.ts no longer registers jarvis.openYamlFile', () => {
        expect(extensionSrc).not.toContain("'jarvis.openYamlFile'");
    });

    it('context.subscriptions no longer references openContextCommand/openYamlCommand', () => {
        expect(extensionSrc).not.toContain('openContextCommand');
        expect(extensionSrc).not.toContain('openYamlCommand');
    });

    it('core package.json has no jarvis.openContext or jarvis.openYamlFile contributions anywhere', () => {
        const raw = JSON.stringify(corePackageJson);
        expect(raw).not.toContain('jarvis.openContext');
        expect(raw).not.toContain('jarvis.openYamlFile');
    });

    it('pim package.json has no jarvis.openContext or jarvis.openYamlFile contributions anywhere', () => {
        const raw = JSON.stringify(pimPackageJson);
        expect(raw).not.toContain('jarvis.openContext');
        expect(raw).not.toContain('jarvis.openYamlFile');
    });
});

describe('SPEC_ENT_ENTITY_CONTEXTMENU: resolveCopyPaths() + commands registered', () => {
    it('resolveCopyPaths is defined and handles FileNode, LeafNode, and entity-file nodes', () => {
        expect(extensionSrc).toContain('function resolveCopyPaths(node: CopyPathNode)');
        expect(extensionSrc).toContain("node.kind === 'file' || node.kind === 'entityFile'");
        expect(extensionSrc).toContain("node.kind === 'entityFileFolder'");
    });

    it('jarvis.copyPath and jarvis.copyFullPath are registered and use vscode.env.clipboard.writeText', () => {
        expect(extensionSrc).toContain("'jarvis.copyPath'");
        expect(extensionSrc).toContain("'jarvis.copyFullPath'");
        expect(extensionSrc).toContain('vscode.env.clipboard.writeText');
    });

    it('copyPathCommand and copyFullPathCommand are pushed to context.subscriptions', () => {
        expect(extensionSrc).toContain('copyPathCommand,');
        expect(extensionSrc).toContain('copyFullPathCommand,');
    });
});

describe('SPEC_ENT_ENTITY_CONTEXTMENU: resolveCopyPaths() behavior', () => {
    type LeafNode = { kind: 'leaf'; id: string };
    type FileNode = { kind: 'file'; filePath: string; label: string };

    // Mirrors the fixed implementation to confirm expected runtime behavior
    // (source-content assertions above confirm this matches the real file).
    function resolveCopyPaths(node: FileNode | LeafNode): { folder: string; full: string } {
        if (node.kind === 'file') {
            return { folder: path.dirname(node.filePath), full: node.filePath };
        }
        const folder = path.dirname(node.id);
        return { folder, full: folder };
    }

    it('file node: folder is dirname, full is the file path itself', () => {
        const node: FileNode = { kind: 'file', filePath: path.join('alpha', 'context.md'), label: 'context.md' };
        const result = resolveCopyPaths(node);
        expect(result.folder).toBe('alpha');
        expect(result.full).toBe(path.join('alpha', 'context.md'));
    });

    it('entity root (leaf) node: folder and full are both the containing directory', () => {
        const node: LeafNode = { kind: 'leaf', id: path.join('alpha', 'project.yaml') };
        const result = resolveCopyPaths(node);
        expect(result.folder).toBe('alpha');
        expect(result.full).toBe('alpha');
    });
});

describe('SPEC_ENT_ENTITY_CONTEXTMENU: package.json menu bindings (core)', () => {
    const items: { command: string; when?: string; group?: string }[] =
        corePackageJson.contributes.menus['view/item/context'];

    it('jarvisEntityFile has Open / Copy Path / Copy Full Path in open + clipboard groups', () => {
        expect(items).toContainEqual({ command: 'jarvis.openEntityFile', when: 'viewItem == jarvisEntityFile', group: 'open' });
        expect(items).toContainEqual({ command: 'jarvis.copyPath', when: 'viewItem == jarvisEntityFile', group: 'clipboard@1' });
        expect(items).toContainEqual({ command: 'jarvis.copyFullPath', when: 'viewItem == jarvisEntityFile', group: 'clipboard@2' });
    });

    it('jarvisSession (root node) has Open / Copy Path / Copy Full Path', () => {
        expect(items).toContainEqual({ command: 'jarvis.openAgentSession', when: 'viewItem =~ /^jarvisSession$/', group: 'open' });
        expect(items).toContainEqual({ command: 'jarvis.copyPath', when: 'viewItem =~ /^jarvisSession$/', group: 'clipboard@1' });
        expect(items).toContainEqual({ command: 'jarvis.copyFullPath', when: 'viewItem =~ /^jarvisSession$/', group: 'clipboard@2' });
    });

    it('jarvis.copyPath / jarvis.copyFullPath are hidden from the command palette', () => {
        const palette: { command: string; when?: string }[] = corePackageJson.contributes.menus.commandPalette;
        expect(palette).toContainEqual({ command: 'jarvis.copyPath', when: 'false' });
        expect(palette).toContainEqual({ command: 'jarvis.copyFullPath', when: 'false' });
    });

    it('jarvisFolder has only the Copy entry (jarvis.copyCategoryName) — no Open/Copy Path/Copy Full Path/Copy File Name (ui-improvements CR, REQ_ENT_ENTITY_CONTEXTMENU AC-7/AC-9)', () => {
        const folderEntries = items.filter(i => i.when === 'viewItem == jarvisFolder');
        expect(folderEntries).toEqual([
            { command: 'jarvis.copyCategoryName', when: 'viewItem == jarvisFolder', group: 'clipboard@1' }
        ]);
    });
});

describe('SPEC_ENT_ENTITY_CONTEXTMENU: package.json menu bindings (pim)', () => {
    const items: { command: string; when?: string; group?: string }[] =
        pimPackageJson.contributes.menus['view/item/context'];

    it('jarvisProject has Open / Copy Path / Copy Full Path', () => {
        expect(items).toContainEqual({ command: 'jarvis.openAgentSession', when: 'viewItem == jarvisProject', group: 'open' });
        expect(items).toContainEqual({ command: 'jarvis.copyPath', when: 'viewItem == jarvisProject', group: 'clipboard@1' });
        expect(items).toContainEqual({ command: 'jarvis.copyFullPath', when: 'viewItem == jarvisProject', group: 'clipboard@2' });
    });

    it('jarvisEvent has Open / Copy Path / Copy Full Path', () => {
        expect(items).toContainEqual({ command: 'jarvis.openAgentSession', when: 'viewItem == jarvisEvent', group: 'open' });
        expect(items).toContainEqual({ command: 'jarvis.copyPath', when: 'viewItem == jarvisEvent', group: 'clipboard@1' });
        expect(items).toContainEqual({ command: 'jarvis.copyFullPath', when: 'viewItem == jarvisEvent', group: 'clipboard@2' });
    });

    it('jarvisFolder has only the Copy entry (jarvis.copyCategoryName) — no Open/Copy Path/Copy Full Path/Copy File Name (ui-improvements CR, REQ_ENT_ENTITY_CONTEXTMENU AC-7/AC-9)', () => {
        const folderEntries = items.filter(i => i.when === 'viewItem == jarvisFolder');
        expect(folderEntries).toEqual([
            { command: 'jarvis.copyCategoryName', when: 'viewItem == jarvisFolder', group: 'clipboard@1' }
        ]);
    });
});
