// Implementation: SPEC_EXP_UNIFIEDTREE
// Requirements: REQ_EXP_UNIFIEDTREE

import * as vscode from 'vscode';
import type { GenericTreeFactory } from './treeFactory';
import type { TreeNode } from '../sessions/yamlScanner';

/**
 * Convert ASCII letters/digits to Unicode Mathematical Sans-Serif Bold
 * codepoints, so a plain string renders visually bold in any theme/font —
 * VS Code's TreeItem API has no font-weight attribute (REQ_EXP_UNIFIEDTREE
 * AC-13). Non-alphanumeric characters (spaces, punctuation) pass through
 * unchanged.
 */
function toBoldUnicode(text: string): string {
    const boldUpperA = 0x1D5D4; // Mathematical Sans-Serif Bold Capital A
    const boldLowerA = 0x1D5EE; // Mathematical Sans-Serif Bold Small a
    const boldDigit0 = 0x1D7EC; // Mathematical Sans-Serif Bold Digit Zero
    let result = '';
    for (const ch of text) {
        const code = ch.codePointAt(0)!;
        if (code >= 65 && code <= 90) {
            result += String.fromCodePoint(boldUpperA + (code - 65));
        } else if (code >= 97 && code <= 122) {
            result += String.fromCodePoint(boldLowerA + (code - 97));
        } else if (code >= 48 && code <= 57) {
            result += String.fromCodePoint(boldDigit0 + (code - 48));
        } else {
            result += ch;
        }
    }
    return result;
}

/**
 * Category node for grouping entities by kind in the unified tree.
 */
export interface CategoryNode {
    kind: 'category';
    entityKind: string;
    label: string;
}

/**
 * Root node union for the unified entity tree.
 * Either a category grouping node or a direct entity TreeNode.
 */
export type UnifiedRootNode = CategoryNode | TreeNode;

/**
 * Unified tree provider that wraps per-kind providers (Actor, Project, Event).
 * Always shows category sub-groups for all registered kinds, regardless of
 * entity presence (amended per PM decision cc676cb, SPEC_EXP_UNIFIEDTREE).
 */
export class UnifiedEntityTreeProvider implements vscode.TreeDataProvider<UnifiedRootNode>, vscode.Disposable {
    private _onDidChangeTreeData = new vscode.EventEmitter<UnifiedRootNode | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private readonly _treeFactory: GenericTreeFactory;
    private readonly _subscriptions: vscode.Disposable[] = [];

    constructor(treeFactory: GenericTreeFactory) {
        this._treeFactory = treeFactory;

        // Forward refresh events from all per-kind providers to our own tree
        // SPEC_EXP_UNIFIEDTREE AC-6: refresh forwarding
        for (const kind of this._registeredKinds()) {
            const provider = this._treeFactory.getProvider(kind);
            if (provider) {
                this._subscriptions.push(
                    provider.onDidChangeTreeData(() => {
                        this._onDidChangeTreeData.fire(undefined);
                    })
                );
            }
        }

        // AC-12: Handle late-arriving kind registrations (e.g., PIM activates after core)
        this._subscriptions.push(
            treeFactory.onDidAddKind(kind => {
                const provider = treeFactory.getProvider(kind);
                if (provider) {
                    this._subscriptions.push(
                        provider.onDidChangeTreeData(() => {
                            this._onDidChangeTreeData.fire(undefined);
                        })
                    );
                }
                // Refresh entire tree so new category node appears
                this._onDidChangeTreeData.fire(undefined);
            })
        );
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
        for (const sub of this._subscriptions) {
            sub.dispose();
        }
    }

    getChildren(element?: UnifiedRootNode): UnifiedRootNode[] | Promise<UnifiedRootNode[]> {
        if (element === undefined) {
            // Root level: always show category nodes (amended SPEC_EXP_UNIFIEDTREE)
            // Flattening removed per PM decision (cc676cb)
            const present = this._registeredKinds();

            // Category grouping: show category nodes unconditionally
            return present.map(kind => ({
                kind: 'category' as const,
                entityKind: kind,
                label: this._pluralLabel(kind),
            }));
        }

        if ('entityKind' in element) {
            // Category node expands into that kind's root nodes
            const provider = this._kindProvider(element.entityKind);
            if (!provider) { return []; }
            const children = provider.getChildren();
            // At root level, getChildren returns TreeNode[] synchronously
            return Array.isArray(children) ? (children as TreeNode[]) : [];
        }

        // Any other node: delegate to its owning kind's provider
        const kindName = this._kindOf(element);
        const provider = this._kindProvider(kindName);
        if (!provider) { return []; }
        // Leaf nodes resolve their file/hook children asynchronously
        // (SPEC_EXP_ENTITY_FILE_CHILDREN) — pass the Promise through rather
        // than discarding it, VS Code's TreeDataProvider supports this.
        return provider.getChildren(element) as UnifiedRootNode[] | Promise<UnifiedRootNode[]>;
    }

    getTreeItem(element: UnifiedRootNode): vscode.TreeItem {
        if ('entityKind' in element) {
            // Category node — bold label (REQ_EXP_UNIFIEDTREE AC-13). VS Code's
            // TreeItem API has no real bold attribute; TreeItemLabel.highlights
            // renders as a search-match highlight color, not font weight, so we
            // substitute Unicode Mathematical Sans-Serif Bold characters instead.
            const item = new vscode.TreeItem(toBoldUnicode(element.label), vscode.TreeItemCollapsibleState.Expanded);
            item.contextValue = `jarvisEntityCategory:${element.entityKind}`;
            return item;
        }

        // Delegate to the owning kind's provider
        const kindName = this._kindOf(element);
        return this._kindProvider(kindName)?.getTreeItem(element) ?? new vscode.TreeItem('(unknown)');
    }

    /**
     * Get the list of registered entity kinds from the tree factory's scanner.
     */
    private _registeredKinds(): string[] {
        return this._treeFactory.registeredKinds;
    }

    /**
     * Get the provider for a given kind.
     */
    private _kindProvider(kind: string) {
        return this._treeFactory.getProvider(kind);
    }

    /**
     * Get the plural label for a kind (for category node display).
     */
    private _pluralLabel(kind: string): string {
        switch (kind) {
            case 'session': return 'Actors';
            case 'project': return 'Projects';
            case 'event': return 'Events';
            default: return kind;
        }
    }

    /**
     * Determine the kind of a TreeNode element.
     * For leaf nodes, we can infer from the file extension in the id.
     * For folder/file nodes, we need to check which provider owns them.
     */
    private _kindOf(element: TreeNode): string {
        if (element.kind === 'leaf') {
            // Leaf nodes have an id that is the file path
            if (element.id.endsWith('session.yaml') || element.id.endsWith('actor.yaml')) {
                return 'session';
            } else if (element.id.endsWith('project.yaml')) {
                return 'project';
            } else if (element.id.endsWith('event.yaml')) {
                return 'event';
            }
        }

        // Fallback: try each provider to see which one can handle this node
        for (const kind of this._registeredKinds()) {
            const provider = this._kindProvider(kind);
            if (provider) {
                try {
                    const item = provider.getTreeItem(element);
                    if (item) { return kind; }
                } catch {
                    // Provider doesn't own this node
                }
            }
        }

        return 'session'; // Default fallback
    }
}
