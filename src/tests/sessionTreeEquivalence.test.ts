/**
 * Behavioural-equivalence test: proves that GenericTreeDataProvider (session kind)
 * produces TreeItems identical to the legacy SessionTreeProvider for the same
 * scanner input, EXCEPT for leaf collapsibleState.
 *
 * SPEC_EXP_ENTITY_FILE_CHILDREN (entity-files-tree CR) intentionally changes leaf
 * collapsibleState from None to Collapsed in GenericTreeDataProvider so entity
 * leaves can expand to show file children (context.md, YAML, agent file). The
 * legacy SessionTreeProvider is unmodified reference code and still returns None
 * for leaves — this divergence is expected and tested explicitly below.
 *
 * This is the genuine "session behaviour unchanged through the factory migration"
 * proof for all OTHER rendering properties. It imports and exercises the REAL
 * provider classes — no inline mirrors allowed.
 */
import { describe, it, expect } from 'vitest';
import * as vscode from 'vscode';
import type { TreeNode, EntityEntry } from '../../packages/core/src/engine/sessions/yamlScanner';
import type { YamlScanner } from '../../packages/core/src/engine/sessions/yamlScanner';
import type { KindDrivenScanner } from '../../packages/core/src/engine/sessions/yamlScanner';
import { SessionTreeProvider } from '../../packages/core/src/apps/session/sessionTreeProvider';
import { GenericTreeFactory } from '../../packages/core/src/engine/core/treeFactory';

// --- Test data -----------------------------------------------------------------

const folderNode: TreeNode = {
    kind: 'folder',
    name: 'active-sessions',
    children: [
        { kind: 'leaf', id: '/sessions/alpha/session.yaml' },
        { kind: 'leaf', id: '/sessions/beta/session.yaml' },
    ],
};

const leafWithEntity: TreeNode = { kind: 'leaf', id: '/sessions/alpha/session.yaml' };
const leafWithEntity2: TreeNode = { kind: 'leaf', id: '/sessions/beta/session.yaml' };
const leafMissingEntity: TreeNode = { kind: 'leaf', id: '/sessions/gamma/session.yaml' };

const sessionTree: TreeNode[] = [folderNode, leafMissingEntity];

const entities = new Map<string, EntityEntry>([
    ['/sessions/alpha/session.yaml', { name: 'Alpha Session', summary: 'First session summary' }],
    ['/sessions/beta/session.yaml', { name: 'Beta Session', summary: 'Second session summary' }],
    // gamma deliberately missing → exercises path.basename fallback
]);

// --- Stub scanner satisfying both YamlScanner and KindDrivenScanner interfaces --

const stubScanner = {
    getEntity: (id: string) => entities.get(id),
    getSessionTree: () => sessionTree,
    getTreeForKind: (kind: string) => kind === 'session' ? sessionTree : [],
    // Remaining members needed to satisfy type casts (never called in this test)
    addKind: () => {},
    removeKind: () => {},
    rescan: async () => {},
    registeredKinds: ['session'],
    entities: [],
} as unknown as KindDrivenScanner;

// --- Instantiate the REAL providers --------------------------------------------

const oldProvider = new SessionTreeProvider(stubScanner as unknown as YamlScanner);

const factory = new GenericTreeFactory(stubScanner);
factory.addKind({
    kind: 'session',
    viewId: 'jarvisSessions',
    folderSettingKey: 'jarvis.sessions.folder',
    label: (n: string) => n,
});
const newProvider = factory.getProvider('session')!;

// --- Equivalence assertions ----------------------------------------------------

describe('Session tree factory/provider equivalence (real classes)', () => {
    function assertTreeItemsEqual(node: TreeNode, tag: string) {
        const oldItem = oldProvider.getTreeItem(node);
        const newItem = newProvider.getTreeItem(node);

        expect(newItem.label, `${tag}: label`).toEqual(oldItem.label);
        expect(newItem.contextValue, `${tag}: contextValue`).toEqual(oldItem.contextValue);
        expect(newItem.tooltip, `${tag}: tooltip`).toEqual(oldItem.tooltip);
        expect(newItem.command?.command, `${tag}: command.command`).toEqual(oldItem.command?.command);
        expect(newItem.command?.arguments, `${tag}: command.arguments`).toEqual(oldItem.command?.arguments);
    }

    it('folder node renders identically (including collapsibleState)', () => {
        assertTreeItemsEqual(folderNode, 'folder');
        expect(newProvider.getTreeItem(folderNode).collapsibleState)
            .toEqual(oldProvider.getTreeItem(folderNode).collapsibleState);
    });

    it('leaf node with entity renders identically (excluding collapsibleState)', () => {
        assertTreeItemsEqual(leafWithEntity, 'leaf-alpha');
        assertTreeItemsEqual(leafWithEntity2, 'leaf-beta');
    });

    it('leaf node with missing entity (basename fallback) renders identically (excluding collapsibleState)', () => {
        assertTreeItemsEqual(leafMissingEntity, 'leaf-missing');
    });

    it('SPEC_EXP_ENTITY_FILE_CHILDREN: leaf collapsibleState intentionally diverges (old=None, new=Collapsed)', () => {
        expect(oldProvider.getTreeItem(leafWithEntity).collapsibleState)
            .toEqual(vscode.TreeItemCollapsibleState.None);
        expect(newProvider.getTreeItem(leafWithEntity).collapsibleState)
            .toEqual(vscode.TreeItemCollapsibleState.Collapsed);
    });

    it('getChildren parity at root', () => {
        const oldChildren = oldProvider.getChildren(undefined);
        const newChildren = newProvider.getChildren(undefined);
        expect(newChildren).toEqual(oldChildren);
    });

    it('getChildren parity for folder node', () => {
        const oldChildren = oldProvider.getChildren(folderNode);
        const newChildren = newProvider.getChildren(folderNode);
        expect(newChildren).toEqual(oldChildren);
    });
});
