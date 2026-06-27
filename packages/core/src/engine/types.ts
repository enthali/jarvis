// Implementation: SPEC_ENG_API, SPEC_ENG_REGISTER_KIND, SPEC_ENG_REGISTER_TOOL
// Requirements: REQ_ENG_CONTRACT, REQ_ENG_TOOLNS

import type * as vscode from 'vscode';
import type { TreeNode } from './yamlScanner';

/**
 * A recursive subtree node descriptor returned by a children provider.
 * Each node may itself have children, enabling arbitrary-depth trees
 * below an entity leaf (e.g. entity → taskGroup → taskLeaf).
 */
export interface SubtreeNode {
    /** Unique id for this node (e.g. task URI string, group id). */
    id: string;
    /** Display label (may include counts, e.g. "Uncategorized (3)"). */
    label: string;
    /** Optional tooltip. */
    tooltip?: string;
    /** Command to execute on click (default: none). */
    command?: vscode.Command;
    /** contextValue for when-clause scoping (default: derived from kind + 'Child'). */
    contextValue?: string;
    /**
     * Collapsible state for this node.
     * - 'collapsed' → TreeItemCollapsibleState.Collapsed
     * - 'expanded' → TreeItemCollapsibleState.Expanded
     * - 'none' (default if omitted) → TreeItemCollapsibleState.None (leaf)
     */
    collapsibleState?: 'collapsed' | 'expanded' | 'none';
    /** Icon for this node (ThemeIcon, Uri, or {light, dark} pair). */
    iconPath?: vscode.ThemeIcon | vscode.Uri | { light: vscode.Uri; dark: vscode.Uri };
    /** Child nodes (recursive). Empty or omitted → leaf node. */
    children?: SubtreeNode[];
}

/**
 * Configuration for an entity kind registered with the engine.
 */
export interface EntityKindConfig {
    /** Stable kind discriminator, e.g. 'session' | 'project' | 'event'. */
    kind: string;
    /** View id declared in the OWNING extension's package.json. */
    viewId: string;
    /** Settings key holding this kind's scan folder (read by the engine). */
    folderSettingKey: string;
    /** Display-label factory for tree items of this kind.
     *  Receives the entity name and optionally the full entity data for kinds
     *  that derive labels from entity fields (e.g. event datesStart prefix). */
    label(name: string, entity?: { data: Record<string, unknown> }): string;

    // --- Optional tree-rendering hooks (S5 generalization) ---

    /**
     * Return a subtree of nodes for an entity.
     * If omitted or returns empty/undefined, the entity renders as a flat
     * leaf (CollapsibleState.None) — session-compatible default.
     * If non-empty, the entity renders as CollapsibleState.Collapsed
     * (the user expands it on demand).
     * Subtree nodes are recursive — a node with its own children array
     * renders as a parent at arbitrary depth.
     */
    getChildren?(entity: { name: string; filePath: string; data: Record<string, unknown> }): SubtreeNode[] | undefined;

    /**
     * Command to execute on single-click of an entity leaf node.
     * Receives the TreeNode representing the entity.
     * Default (if omitted): { command: 'jarvis.openAgentSession', title: 'Open', arguments: [node] }
     */
    leafCommand?(node: TreeNode): vscode.Command;

    /**
     * Tooltip for an entity leaf node.
     * Default (if omitted): entity.summary (the YAML summary field).
     */
    leafTooltip?(entity: { name: string; summary?: string; data: Record<string, unknown> }): string | vscode.MarkdownString | undefined;
}

/**
 * Handler signature for tools registered with the engine.
 */
export type ToolHandler = (
    options: vscode.LanguageModelToolInvocationOptions<unknown>,
    token: vscode.CancellationToken
) => Promise<vscode.LanguageModelToolResult>;

/**
 * Descriptor for a registered tool (SPEC_ENG_TOOLREGISTRY).
 */
export interface ToolDescriptor {
    name: string;
    description: string;
}

// Re-export heartbeat types as public engine types (SPEC_ENG_HEARTBEAT_JOBAPI)
export type { HeartbeatJob, HeartbeatStep } from '../apps/session/heartbeat';

/**
 * Decoration contributor interface.
 * Add-ons can register a decorator for their own kind's tree items
 * without the engine knowing the decoration logic (SPEC_ENG_API).
 */
export interface TreeItemDecorator {
    /** Called after the engine builds a base TreeItem; may mutate it in place. */
    decorate(item: vscode.TreeItem, node: TreeNode, kind: string): void;
}

/**
 * A session entity as exposed by the Jarvis core API.
 * All optional fields are normalized to empty string for consistent shape.
 */
export interface JarvisSession {
    name: string;
    summary: string;
    agent: string;
    kind: string;
    folder: string;
}

/**
 * The public API surface exported by the Jarvis core extension.
 * Add-ons obtain this via `vscode.extensions.getExtension('enthali.jarvis-core')!.exports`.
 */
export interface JarvisCoreApi {
    /** Contract version — add-ons MUST check before using newer fields. */
    readonly version: 1;
    registerEntityKind(config: EntityKindConfig): vscode.Disposable;
    registerTool(name: string, description: string, handler: ToolHandler): vscode.Disposable;
    registerDecorator(kind: string, decorator: TreeItemDecorator): vscode.Disposable;
    /** Get the TreeDataProvider for a registered kind (for creating tree views). */
    getTreeDataProvider(kind: string): vscode.TreeDataProvider<unknown> | undefined;
    /** Trigger a tree-view refresh for a specific kind. */
    refreshKind(kind: string): void;
    /** Get the tree nodes for a registered kind. */
    getTreeForKind(kind: string): import('./yamlScanner').TreeNode[];
    /** Get an entity by its id (YAML file path). */
    getEntity(id: string): import('./yamlScanner').EntityEntry | undefined;
    /** Trigger a full rescan of all registered kinds. */
    rescan(): Promise<void>;

    // --- Session listing API (SPEC_ENG_SESSIONLIST, SPEC_MSG_JARVISSESSIONS) ---

    /** List all Jarvis sessions across all kinds (Sessions, Projects, Events, ...). */
    listJarvisSessions(): JarvisSession[];

    // --- Heartbeat job API (SPEC_ENG_HEARTBEAT_JOBAPI) ---

    /** Idempotent upsert of a heartbeat job (PERSISTENT — survives restart/uninstall). */
    registerJob(job: import('../apps/session/heartbeat').HeartbeatJob): Promise<void>;
    /** Remove a heartbeat job by name. */
    unregisterJob(name: string): Promise<void>;
    /** Return all currently persisted heartbeat jobs. */
    listJobs(): import('../apps/session/heartbeat').HeartbeatJob[];

    // --- Tool registry API (SPEC_ENG_TOOLREGISTRY) ---

    /** Return a snapshot of all currently registered tools. */
    getRegisteredTools(): ToolDescriptor[];
    /** Invoke a registered tool directly (no LM round-trip). Throws if not registered. */
    invokeTool(name: string, options: vscode.LanguageModelToolInvocationOptions<unknown>, token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult>;
}
