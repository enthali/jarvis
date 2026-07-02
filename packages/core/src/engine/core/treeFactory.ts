// Implementation: SPEC_ENG_TREEFACTORY, SPEC_EXP_ENTITY_FILE_CHILDREN
// Requirements: REQ_ENG_TREEFACTORY, REQ_EXP_ENTITY_FILE_CHILDREN

import * as vscode from 'vscode';
import * as path from 'path';
import type { EntityKindConfig, SubtreeNode, TreeItemDecorator } from './types';
import type { TreeNode, KindDrivenScanner } from '../sessions/yamlScanner';
import { getEntityFileChildren } from '../sessions/yamlScanner';

export type { TreeItemDecorator } from './types';

/**
 * Internal node type representing a subtree node under an entity leaf.
 * Carries the full SubtreeNode descriptor for recursive rendering.
 */
export interface ChildTreeNode {
    kind: 'child';
    descriptor: SubtreeNode;
    parentKind: string;
}

/** Union of scanner TreeNodes and internal child nodes for the provider. */
export type ProviderNode = TreeNode | ChildTreeNode;

/**
 * Generic tree-provider factory driven by registered entity kinds.
 * One instance per viewId; renders items uniformly from EntityKindConfig.
 */
export class GenericTreeFactory {
    private readonly _configs = new Map<string, EntityKindConfig>();
    private readonly _providers = new Map<string, GenericTreeDataProvider>();
    private readonly _decorators = new Map<string, TreeItemDecorator[]>();
    private readonly _scanner: KindDrivenScanner;

    constructor(scanner: KindDrivenScanner) {
        this._scanner = scanner;
    }

    addKind(config: EntityKindConfig): void {
        this._configs.set(config.kind, config);
        // Create or update provider for this kind's viewId
        if (!this._providers.has(config.kind)) {
            const provider = new GenericTreeDataProvider(config, this._scanner, this._decorators);
            this._providers.set(config.kind, provider);
        }
    }

    removeKind(kind: string): void {
        this._configs.delete(kind);
        this._providers.delete(kind);
        this._decorators.delete(kind);
    }

    /**
     * Get the TreeDataProvider for a given kind.
     * Returns undefined if the kind is not registered.
     */
    getProvider(kind: string): GenericTreeDataProvider | undefined {
        return this._providers.get(kind);
    }

    /**
     * Register a decorator for a specific kind's tree items.
     * Returns a Disposable that removes the decorator.
     * This is the documented extension point for add-on item decoration (SPEC_ENG_TREEFACTORY AC-3).
     */
    registerDecorator(kind: string, decorator: TreeItemDecorator): vscode.Disposable {
        if (!this._decorators.has(kind)) {
            this._decorators.set(kind, []);
        }
        this._decorators.get(kind)!.push(decorator);
        // Refresh the tree when a decorator is added
        this._providers.get(kind)?.refresh();

        return {
            dispose: () => {
                const list = this._decorators.get(kind);
                if (list) {
                    const idx = list.indexOf(decorator);
                    if (idx >= 0) { list.splice(idx, 1); }
                }
                this._providers.get(kind)?.refresh();
            }
        };
    }

    /** Refresh a specific kind's tree view. */
    refreshKind(kind: string): void {
        this._providers.get(kind)?.refresh();
    }

    /** Refresh all registered kinds. */
    refreshAll(): void {
        for (const provider of this._providers.values()) {
            provider.refresh();
        }
    }
}

/**
 * Generic TreeDataProvider that renders entities for a single registered kind.
 * Derives contextValue uniformly from the kind discriminator.
 */
export class GenericTreeDataProvider implements vscode.TreeDataProvider<ProviderNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private readonly _config: EntityKindConfig;
    private readonly _scanner: KindDrivenScanner;
    private readonly _decorators: Map<string, TreeItemDecorator[]>;

    constructor(
        config: EntityKindConfig,
        scanner: KindDrivenScanner,
        decorators: Map<string, TreeItemDecorator[]>
    ) {
        this._config = config;
        this._scanner = scanner;
        this._decorators = decorators;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ProviderNode): vscode.TreeItem {
        // Child node rendering (recursive subtree nodes)
        if (element.kind === 'child') {
            const desc = element.descriptor;

            // Determine collapsible state from descriptor
            let childCollapsible = vscode.TreeItemCollapsibleState.None;
            if (desc.children && desc.children.length > 0) {
                // Node has children — use its declared state or default to Collapsed
                if (desc.collapsibleState === 'expanded') {
                    childCollapsible = vscode.TreeItemCollapsibleState.Expanded;
                } else {
                    childCollapsible = vscode.TreeItemCollapsibleState.Collapsed;
                }
            } else if (desc.collapsibleState === 'collapsed') {
                childCollapsible = vscode.TreeItemCollapsibleState.Collapsed;
            } else if (desc.collapsibleState === 'expanded') {
                childCollapsible = vscode.TreeItemCollapsibleState.Expanded;
            }

            const item = new vscode.TreeItem(desc.label, childCollapsible);
            item.tooltip = desc.tooltip;
            item.command = desc.command;
            item.contextValue = desc.contextValue ?? `jarvis${element.parentKind.charAt(0).toUpperCase()}${element.parentKind.slice(1)}Child`;
            if (desc.iconPath) {
                item.iconPath = desc.iconPath;
            }

            return item;
        }

        if (element.kind === 'folder') {
            const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.Collapsed);
            item.contextValue = 'jarvisFolder';
            return item;
        }

        // FileNode — entity file child (SPEC_EXP_ENTITY_FILE_CHILDREN)
        if (element.kind === 'file') {
            const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
            item.tooltip = element.filePath.replace(/\\/g, '/');
            item.contextValue = 'jarvisEntityFile';
            item.command = {
                command: 'jarvis.openEntityFile',
                title: 'Open File',
                arguments: [element],
            };
            return item;
        }

        // LeafNode — render from kind config with hook support
        const entity = this._scanner.getEntity(element.id);
        const name = entity ? entity.name : path.basename(path.dirname(element.id));

        // SPEC_EXP_ENTITY_FILE_CHILDREN: leaf is always expandable — file children
        // (context.md + YAML, at minimum) guarantee at least 2 children exist.
        const collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

        const item = new vscode.TreeItem(this._config.label(name, { data: (entity ?? {}) as Record<string, unknown> }), collapsibleState);

        // Tooltip: config hook or default to summary
        if (this._config.leafTooltip) {
            item.tooltip = this._config.leafTooltip({ name, summary: entity?.summary, data: (entity ?? {}) as Record<string, unknown> });
        } else {
            item.tooltip = entity?.summary;
        }

        // SPEC_ENG_TREEFACTORY AC-2: contextValue derived uniformly from kind
        item.contextValue = `jarvis${this._config.kind.charAt(0).toUpperCase()}${this._config.kind.slice(1)}`;

        // Command: config hook or default to openAgentSession
        if (this._config.leafCommand) {
            item.command = this._config.leafCommand(element);
        } else {
            item.command = {
                command: 'jarvis.openAgentSession',
                title: 'Open Agent Session',
                arguments: [element],
            };
        }

        // Apply decorators (SPEC_ENG_TREEFACTORY AC-3)
        const kindDecorators = this._decorators.get(this._config.kind);
        if (kindDecorators) {
            for (const decorator of kindDecorators) {
                decorator.decorate(item, element, this._config.kind);
            }
        }

        return item;
    }

    getChildren(element?: ProviderNode): ProviderNode[] | Promise<ProviderNode[]> {
        if (!element) {
            return this._scanner.getTreeForKind(this._config.kind);
        }
        if (element.kind === 'folder') {
            return element.children;
        }
        if (element.kind === 'child') {
            // Recursive: subtree node may have its own children
            const desc = element.descriptor;
            if (desc.children && desc.children.length > 0) {
                return desc.children.map(d => ({ kind: 'child' as const, descriptor: d, parentKind: element.parentKind }));
            }
            return [];
        }
        if (element.kind === 'file') {
            // File nodes are leaves — no children
            return [];
        }
        // Leaf node — file children (always) + hook-based children (if any)
        if (element.kind === 'leaf') {
            return this._getLeafChildren(element);
        }
        return [];
    }

    private async _getLeafChildren(element: import('../sessions/yamlScanner').LeafNode): Promise<ProviderNode[]> {
        const entity = this._scanner.getEntity(element.id);
        const fileChildren: ProviderNode[] = await getEntityFileChildren(element, entity);

        let hookChildren: ProviderNode[] = [];
        if (this._config.getChildren) {
            const name = entity ? entity.name : path.basename(path.dirname(element.id));
            const entityData = { name, filePath: element.id, data: (entity ?? {}) as Record<string, unknown> };
            const descriptors = this._config.getChildren(entityData);
            if (descriptors && descriptors.length > 0) {
                hookChildren = descriptors.map(d => ({ kind: 'child' as const, descriptor: d, parentKind: this._config.kind }));
            }
        }
        return [...fileChildren, ...hookChildren];
    }

    getParent(_element: ProviderNode): ProviderNode | null {
        return null;
    }
}
