/**
 * Unit tests for config-driven tree factory hooks (S5a).
 * Uses SYNTHETIC kinds — no dependency on pim or recorder.
 *
 * Covers:
 * - AC-4: kind with no hooks → flat leaves, default command, tooltip = summary
 * - AC-5: kind with getChildren → Collapsed entity, recursive subtree nodes
 * - AC-6: kind with leafCommand → custom command on leaf click
 * - AC-7: subtree node with iconPath renders with that icon
 * - Decorator extension point still applies after hook changes
 */
import { describe, it, expect } from 'vitest';
import type { TreeNode, EntityEntry } from '../../packages/core/src/engine/yamlScanner';
import type { KindDrivenScanner } from '../../packages/core/src/engine/yamlScanner';
import { GenericTreeFactory, type TreeItemDecorator, type ProviderNode } from '../../packages/core/src/engine/treeFactory';
import type { EntityKindConfig, SubtreeNode } from '../../packages/core/src/engine/types';
import { TreeItemCollapsibleState, ThemeIcon } from './__mocks__/vscode';

// --- Test data -----------------------------------------------------------------

const entities = new Map<string, EntityEntry>([
    ['/things/alpha/thing.yaml', { name: 'Alpha Thing', summary: 'Alpha summary' }],
    ['/things/beta/thing.yaml', { name: 'Beta Thing', summary: 'Beta summary' }],
]);

const thingTree: TreeNode[] = [
    { kind: 'leaf', id: '/things/alpha/thing.yaml' },
    { kind: 'leaf', id: '/things/beta/thing.yaml' },
];

const stubScanner = {
    getEntity: (id: string) => entities.get(id),
    getTreeForKind: (kind: string) => kind === 'thing' ? thingTree : [],
    addKind: () => {},
    removeKind: () => {},
    rescan: async () => {},
    registeredKinds: ['thing'],
    entities: [],
} as unknown as KindDrivenScanner;

// --- AC-4: No hooks — session-compatible default behaviour ---------------------

describe('AC-4: kind with no hooks (session-compatible default)', () => {
    const factory = new GenericTreeFactory(stubScanner);
    factory.addKind({
        kind: 'thing',
        viewId: 'jarvisThings',
        folderSettingKey: 'jarvis.things.folder',
        label: (n: string) => n,
    });
    const provider = factory.getProvider('thing')!;

    it('leaf renders as flat (CollapsibleState.None)', () => {
        const leaf: TreeNode = { kind: 'leaf', id: '/things/alpha/thing.yaml' };
        const item = provider.getTreeItem(leaf);
        expect(item.collapsibleState).toBe(TreeItemCollapsibleState.None);
    });

    it('leaf command defaults to jarvis.openAgentSession', () => {
        const leaf: TreeNode = { kind: 'leaf', id: '/things/alpha/thing.yaml' };
        const item = provider.getTreeItem(leaf);
        expect(item.command?.command).toBe('jarvis.openAgentSession');
        expect(item.command?.title).toBe('Open Agent Session');
        expect(item.command?.arguments).toEqual([leaf]);
    });

    it('leaf tooltip defaults to entity summary', () => {
        const leaf: TreeNode = { kind: 'leaf', id: '/things/alpha/thing.yaml' };
        const item = provider.getTreeItem(leaf);
        expect(item.tooltip).toBe('Alpha summary');
    });

    it('leaf contextValue derived from kind', () => {
        const leaf: TreeNode = { kind: 'leaf', id: '/things/alpha/thing.yaml' };
        const item = provider.getTreeItem(leaf);
        expect(item.contextValue).toBe('jarvisThing');
    });

    it('getChildren of leaf returns empty (flat)', () => {
        const leaf: TreeNode = { kind: 'leaf', id: '/things/alpha/thing.yaml' };
        const children = provider.getChildren(leaf);
        expect(children).toEqual([]);
    });
});

// --- AC-5: getChildren hook — Collapsed entity with recursive subtree --------

describe('AC-5: kind with getChildren → Collapsed entity, recursive subtree', () => {
    const subtree: SubtreeNode[] = [
        {
            id: 'group-1',
            label: 'Task Group A',
            collapsibleState: 'collapsed',
            children: [
                { id: 'task-1', label: 'Task One', tooltip: 'First task', command: { command: 'vscode.openWith', title: 'Open', arguments: ['task-1', 'jarvis.taskEditor'] } },
                { id: 'task-2', label: 'Task Two', contextValue: 'customChild' },
            ],
        },
        {
            id: 'uncategorized',
            label: 'Uncategorized (3)',
            iconPath: new ThemeIcon('warning'),
            collapsibleState: 'collapsed',
            children: [
                { id: 'task-3', label: 'Task Three' },
            ],
        },
    ];

    const factory = new GenericTreeFactory(stubScanner);
    factory.addKind({
        kind: 'thing',
        viewId: 'jarvisThings',
        folderSettingKey: 'jarvis.things.folder',
        label: (n: string) => n,
        getChildren: (_entity) => subtree,
    });
    const provider = factory.getProvider('thing')!;

    it('entity leaf is Collapsed (not Expanded, not None)', () => {
        const leaf: TreeNode = { kind: 'leaf', id: '/things/alpha/thing.yaml' };
        const item = provider.getTreeItem(leaf);
        expect(item.collapsibleState).toBe(TreeItemCollapsibleState.Collapsed);
    });

    it('getChildren(entityNode) yields top-level subtree nodes', () => {
        const leaf: TreeNode = { kind: 'leaf', id: '/things/alpha/thing.yaml' };
        const children = provider.getChildren(leaf) as ProviderNode[];
        expect(children).toHaveLength(2);
        expect(children[0].kind).toBe('child');
        expect(children[1].kind).toBe('child');
    });

    it('group node renders as Collapsed with its label', () => {
        const leaf: TreeNode = { kind: 'leaf', id: '/things/alpha/thing.yaml' };
        const children = provider.getChildren(leaf) as ProviderNode[];
        const groupItem = provider.getTreeItem(children[0]);
        expect(groupItem.label).toBe('Task Group A');
        expect(groupItem.collapsibleState).toBe(TreeItemCollapsibleState.Collapsed);
    });

    it('group node children are returned recursively', () => {
        const leaf: TreeNode = { kind: 'leaf', id: '/things/alpha/thing.yaml' };
        const groups = provider.getChildren(leaf) as ProviderNode[];
        const groupChildren = provider.getChildren(groups[0]) as ProviderNode[];
        expect(groupChildren).toHaveLength(2);
        expect(groupChildren[0].kind).toBe('child');
    });

    it('leaf child under group renders with command and None state', () => {
        const leaf: TreeNode = { kind: 'leaf', id: '/things/alpha/thing.yaml' };
        const groups = provider.getChildren(leaf) as ProviderNode[];
        const groupChildren = provider.getChildren(groups[0]) as ProviderNode[];
        const taskItem = provider.getTreeItem(groupChildren[0]);
        expect(taskItem.label).toBe('Task One');
        expect(taskItem.command?.command).toBe('vscode.openWith');
        expect(taskItem.collapsibleState).toBe(TreeItemCollapsibleState.None);
    });

    it('child node uses descriptor contextValue when provided', () => {
        const leaf: TreeNode = { kind: 'leaf', id: '/things/alpha/thing.yaml' };
        const groups = provider.getChildren(leaf) as ProviderNode[];
        const groupChildren = provider.getChildren(groups[0]) as ProviderNode[];
        const taskItem = provider.getTreeItem(groupChildren[1]);
        expect(taskItem.contextValue).toBe('customChild');
    });

    it('child node defaults contextValue to jarvis<Kind>Child', () => {
        const leaf: TreeNode = { kind: 'leaf', id: '/things/alpha/thing.yaml' };
        const groups = provider.getChildren(leaf) as ProviderNode[];
        const groupChildren = provider.getChildren(groups[0]) as ProviderNode[];
        const taskItem = provider.getTreeItem(groupChildren[0]);
        expect(taskItem.contextValue).toBe('jarvisThingChild');
    });
});

// --- AC-7: subtree node with iconPath ----------------------------------------

describe('AC-7: subtree node with iconPath renders with that icon', () => {
    const subtree: SubtreeNode[] = [
        {
            id: 'warn-node',
            label: 'Uncategorized (3)',
            iconPath: new ThemeIcon('warning'),
            collapsibleState: 'collapsed',
            children: [{ id: 'child-1', label: 'Child' }],
        },
    ];

    const factory = new GenericTreeFactory(stubScanner);
    factory.addKind({
        kind: 'thing',
        viewId: 'jarvisThings',
        folderSettingKey: 'jarvis.things.folder',
        label: (n: string) => n,
        getChildren: (_entity) => subtree,
    });
    const provider = factory.getProvider('thing')!;

    it('subtree node has iconPath set on TreeItem', () => {
        const leaf: TreeNode = { kind: 'leaf', id: '/things/alpha/thing.yaml' };
        const children = provider.getChildren(leaf) as ProviderNode[];
        const item = provider.getTreeItem(children[0]);
        expect(item.iconPath).toBeInstanceOf(ThemeIcon);
        expect((item.iconPath as InstanceType<typeof ThemeIcon>).id).toBe('warning');
    });
});

// --- AC-6: leafCommand hook — custom command on leaf click ---------------------

describe('AC-6: kind with leafCommand → custom command', () => {
    const factory = new GenericTreeFactory(stubScanner);
    factory.addKind({
        kind: 'thing',
        viewId: 'jarvisThings',
        folderSettingKey: 'jarvis.things.folder',
        label: (n: string) => n,
        leafCommand: (node) => ({ command: 'vscode.openWith', title: 'Open With', arguments: [node.id, 'custom-editor'] }),
    });
    const provider = factory.getProvider('thing')!;

    it('leaf uses custom command from leafCommand hook', () => {
        const leaf: TreeNode = { kind: 'leaf', id: '/things/alpha/thing.yaml' };
        const item = provider.getTreeItem(leaf);
        expect(item.command?.command).toBe('vscode.openWith');
        expect(item.command?.arguments).toEqual(['/things/alpha/thing.yaml', 'custom-editor']);
    });
});

// --- Decorator extension point still applies -----------------------------------

describe('Decorator extension point applies to leaf items with hooks', () => {
    const factory = new GenericTreeFactory(stubScanner);
    factory.addKind({
        kind: 'thing',
        viewId: 'jarvisThings',
        folderSettingKey: 'jarvis.things.folder',
        label: (n: string) => n,
        getChildren: () => [{ id: 'child-1', label: 'Child' }],
    });

    const decorator: TreeItemDecorator = {
        decorate(item, _node, _kind) {
            item.description = 'decorated';
        },
    };
    factory.registerDecorator('thing', decorator);
    const provider = factory.getProvider('thing')!;

    it('decorator is applied to entity leaf', () => {
        const leaf: TreeNode = { kind: 'leaf', id: '/things/alpha/thing.yaml' };
        const item = provider.getTreeItem(leaf);
        expect(item.description).toBe('decorated');
    });
});
