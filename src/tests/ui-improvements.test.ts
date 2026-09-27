/**
 * Unit tests for ui-improvements change (5 additive items).
 *
 * 1. jarvis.copyCategoryName — single "Copy" menu on jarvisFolder nodes.
 * 2. jarvis.copyFileName — file-child nodes only, bare filename.
 * 3. context.md rendered preview — jarvis.openActorFile branches to
 *    markdown.showPreview for exact basename "context.md" only.
 * 4. Collapse All — showCollapseAll: true at all 6 createTreeView() sites.
 * 5. Messages tree group-node click-to-open — jarvis.openMessageSession,
 *    bound via SessionGroupNode's TreeItem.command (not a context menu).
 *
 * Source-content assertions follow the established pattern (see
 * editor-group-placement.test.ts) since the relevant handlers are private
 * closures inside extension.ts's activate().
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const coreSrcDir = path.resolve(__dirname, '..', '..', 'packages', 'core', 'src');
const extensionSrc = fs.readFileSync(path.join(coreSrcDir, 'extension.ts'), 'utf-8');
const heartbeatSrc = fs.readFileSync(path.join(coreSrcDir, 'apps', 'session', 'heartbeat.ts'), 'utf-8');
const messageTreeProviderSrc = fs.readFileSync(path.join(coreSrcDir, 'apps', 'session', 'messageTreeProvider.ts'), 'utf-8');
const corePackageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', '..', 'packages', 'core', 'package.json'), 'utf-8')
);
const pimPackageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', '..', 'packages', 'pim', 'package.json'), 'utf-8')
);

describe('Item 1: jarvis.copyCategoryName is fully retired (Actor consolidation)', () => {
    it('extension.ts no longer registers jarvis.copyCategoryName', () => {
        expect(extensionSrc).not.toContain('jarvis.copyCategoryName');
    });

    it('core package.json has no jarvis.copyCategoryName contribution', () => {
        expect(JSON.stringify(corePackageJson)).not.toContain('jarvis.copyCategoryName');
    });

    it('pim package.json has no jarvis.copyCategoryName contribution', () => {
        expect(JSON.stringify(pimPackageJson)).not.toContain('jarvis.copyCategoryName');
    });
});

describe('Item 2: jarvis.copyFileName (SPEC_ACTOR_CONTEXTMENU AC-10)', () => {
    it('extension.ts registers jarvis.copyFileName using path.basename', () => {
        expect(extensionSrc).toContain("'jarvis.copyFileName'");
        const idx = extensionSrc.indexOf("'jarvis.copyFileName'");
        const slice = extensionSrc.slice(idx, idx + 200);
        expect(slice).toContain('path.basename(node.filePath)');
    });

    it('copyFileNameCommand is pushed to context.subscriptions', () => {
        expect(extensionSrc).toContain('copyFileNameCommand,');
    });

    it('core package.json: jarvisActorFile has Copy File Name as clipboard@3, hidden from command palette', () => {
        const items: { command: string; when?: string; group?: string }[] = corePackageJson.contributes.menus['view/item/context'];
        expect(items).toContainEqual({ command: 'jarvis.copyFileName', when: 'viewItem == jarvisActorFile', group: 'clipboard@3' });
        const palette: { command: string; when?: string }[] = corePackageJson.contributes.menus.commandPalette;
        expect(palette).toContainEqual({ command: 'jarvis.copyFileName', when: 'false' });
    });
});

describe('Item 3: .md rendered preview (SPEC_ACTOR_FILES — actor-owned-files-tree CR)', () => {
    it('jarvis.openActorFile branches on .md EXTENSION to markdown.showPreview with explicit DOCS_COLUMN', () => {
        const idx = extensionSrc.indexOf("'jarvis.openActorFile'");
        expect(idx).toBeGreaterThan(-1);
        const slice = extensionSrc.slice(idx, idx + 1700);
        expect(slice).toContain("path.extname(node.filePath).toLowerCase() === '.md'");
        expect(slice).toContain("vscode.commands.executeCommand('markdown.showPreview', uri, DOCS_COLUMN)");
        // Non-.md branch goes through openAtDocs in preview mode
        expect(slice).toContain('await openAtDocs(uri, { preview: true });');
    });

    it('uses an extension check (deliberately includes *.agent.md), not an exact-basename match', () => {
        const idx = extensionSrc.indexOf("'jarvis.openActorFile'");
        const slice = extensionSrc.slice(idx, idx + 1700);
        expect(slice).not.toContain("path.basename(node.filePath) === 'context.md'");
    });
});

describe('Item 4: Collapse All — showCollapseAll: true at all createTreeView() sites', () => {
    it('packages/core/src/extension.ts: jarvisActors, jarvisMessages, jarvisReminders', () => {
        for (const viewId of ['jarvisActors', 'jarvisMessages', 'jarvisReminders']) {
            const idx = extensionSrc.indexOf(`createTreeView('${viewId}'`);
            expect(idx, `${viewId} createTreeView call site`).toBeGreaterThan(-1);
            expect(extensionSrc.slice(idx, idx + 200)).toContain('showCollapseAll: true');
        }
    });

    it('packages/core/src/apps/session/heartbeat.ts: jarvisHeartbeat', () => {
        const idx = heartbeatSrc.indexOf("createTreeView('jarvisHeartbeat'");
        expect(idx).toBeGreaterThan(-1);
        expect(heartbeatSrc.slice(idx, idx + 150)).toContain('showCollapseAll: true');
    });
});

describe('Item 5: Messages tree group-node click-to-open (SPEC_MSG_EDITORPLACEMENT / SPEC_MSG_TREEPROVIDER)', () => {
    it('messageTreeProvider.ts sets item.command on SessionGroupNode to jarvis.openMessageSession', () => {
        const getTreeItemIdx = messageTreeProviderSrc.indexOf('getTreeItem(element');
        expect(getTreeItemIdx).toBeGreaterThan(-1);
        const idx = messageTreeProviderSrc.indexOf("element.kind === 'session'", getTreeItemIdx);
        expect(idx).toBeGreaterThan(-1);
        const slice = messageTreeProviderSrc.slice(idx, idx + 650);
        expect(slice).toContain('arguments: [element]');
    });

    it('extension.ts registers jarvis.openMessageSession using lookupSessionUUID + openAtMain, silent no-op on miss', () => {
        const idx = extensionSrc.indexOf("'jarvis.openMessageSession'");
        expect(idx).toBeGreaterThan(-1);
        const slice = extensionSrc.slice(idx, idx + 500);
        expect(slice).toContain('await lookupSessionUUID(node.destination)');
        expect(slice).toContain('if (!uuid) { return; }');
        expect(slice).toContain('await openAtMain(uri, node.destination)');
    });

    it('openMessageSessionCommand is pushed to context.subscriptions', () => {
        expect(extensionSrc).toContain('openMessageSessionCommand,');
    });

    it('core package.json declares jarvis.openMessageSession, hidden from command palette (no view/item/context binding — bound via TreeItem.command instead)', () => {
        const commands: { command: string }[] = corePackageJson.contributes.commands;
        expect(commands.find(c => c.command === 'jarvis.openMessageSession')).toBeDefined();
        const palette: { command: string; when?: string }[] = corePackageJson.contributes.menus.commandPalette;
        expect(palette).toContainEqual({ command: 'jarvis.openMessageSession', when: 'false' });
        const items: { command: string }[] = corePackageJson.contributes.menus['view/item/context'];
        expect(items.find(i => i.command === 'jarvis.openMessageSession')).toBeUndefined();
    });
});
