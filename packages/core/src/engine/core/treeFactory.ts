// Implementation: SPEC_ENG_TREEFACTORY, SPEC_ENT_ENTITY_FILE_CHILDREN
// Requirements: REQ_ENG_TREEFACTORY, REQ_ENT_ENTITY_FILE_CHILDREN

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import type { EntityKindConfig, SubtreeNode, TreeItemDecorator } from './types';
import type { TreeNode, LeafNode, KindDrivenScanner } from '../sessions/yamlScanner';
import { resolveAgentFileChild } from '../sessions/agentDiscovery';
import type { TouchStore, TouchEntry } from '../hooks/touchStore';
import { resolveTouchStorageKind } from '../hooks/touchStore';

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

// actor-owned-files-tree CR (SPEC_ENT_ENTITY_FILE_CHILDREN): provider-local
// node types for the Agent/Files category layer. Deliberately NOT added to
// yamlScanner.ts's exported TreeNode union — see the spec's design rationale
// (avoids widening the v0.15.1 collectLeaves() silent-gap risk class to every
// TreeNode-typed if/else consumer). They live here alongside ChildTreeNode,
// exactly where the existing provider-local subtree variant already lives.

/** Category node grouping "Agent"/"Files" (and future categories) under a leaf. */
export interface EntityFileCategoryNode {
    kind: 'entityFileCategory';
    category: 'agent' | 'files';   // extension point: add 'recent' here later
    label: string;                  // "Agent" | "Files"
    entityFolder: string;           // absolute path to the entity's own folder
    entityId: string;               // owning leaf id (convention file path) — for Agent re-resolution
}

/** A file within the recursive "Files" listing, or the Agent category's synthetic child. */
export interface EntityFileNode {
    kind: 'entityFile';
    filePath: string;   // absolute path, forward-slash normalized for tooltip
    label: string;      // basename (the parent "Agent" category node already provides context)
}

/** A subfolder within the recursive "Files" listing. */
export interface EntityFileFolderNode {
    kind: 'entityFileFolder';
    folderPath: string; // absolute path
    label: string;      // basename
}

export type EntityFilesSubtreeNode =
    EntityFileCategoryNode | EntityFileNode | EntityFileFolderNode;

// actor-touched-files CR (SPEC_ENT_TOUCHEDFILES): provider-local node types
// for the "Recently Touched Files" category — a third category sibling to
// Agent/Files, rendered from TouchStore's persisted per-entity data rather
// than a filesystem scan.
//
// Bugfix (PM F5 finding, GH #18): the field carrying the owning entity's kind
// is deliberately NOT named `entityKind` — UnifiedEntityTreeProvider's
// getChildren()/getTreeItem() duck-type their own (unrelated) CategoryNode via
// `'entityKind' in element`; a node here with that same field name gets
// silently misrouted as a root category node (wrong children, wrong render),
// with no exception ever thrown. Named `ownerKind` instead to avoid the collision.

/** Category node for the "Recently Touched Files" category under a leaf. */
export interface TouchedFilesCategoryNode {
    kind: 'touchedFilesCategory';
    ownerKind: string;
    entityName: string;
}

/** A folder segment within the touched-files hierarchy, derived from relative paths. */
export interface TouchedFileFolderNode {
    kind: 'touchedFileFolder';
    relFolderPath: string; // workspace-relative
    label: string;
    entries: Record<string, TouchEntry>; // entries scoped to this root, for children resolution
    ownerKind: string;
    entityName: string;
    rootUri?: string; // workspace folder URI that owns this folder's entries
}

/** A touched file leaf — structurally compatible with EntityFileNode for command reuse. */
export interface TouchedFileLeafNode {
    kind: 'touchedFileLeaf';
    filePath: string; // absolute
    label: string;
    entry: TouchEntry;
    ownerKind: string;
    entityName: string;
    resourceUri?: vscode.Uri; // D-17: resolved workspace URI for remote-capable open/reveal/diff
}

export type TouchedFilesSubtreeNode =
    TouchedFilesCategoryNode | TouchedFileFolderNode | TouchedFileLeafNode;

/** Union of scanner TreeNodes, internal child nodes, entity-file, and touched-file subtree nodes. */
export type ProviderNode = TreeNode | ChildTreeNode | EntityFilesSubtreeNode | TouchedFilesSubtreeNode;

export type ProbeResult = 'present' | 'absent' | 'unknown';

/** D-14: probes a touch entry via workspace.fs.stat. Only FileNotFound = absent. */
export async function probeTouchEntry(entry: TouchEntry): Promise<{ result: ProbeResult; uri?: vscode.Uri }> {
    if (!entry.rootUri || !entry.relPath) { return { result: 'unknown' }; }
    // AC-24: validate rootUri against currently open workspace folders
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.some(f => f.uri.toString(true) === entry.rootUri)) { return { result: 'unknown' }; }
    try {
        const uri = vscode.Uri.joinPath(vscode.Uri.parse(entry.rootUri), entry.relPath);
        await vscode.workspace.fs.stat(uri);
        return { result: 'present', uri };
    } catch (e: any) {
        if (e?.code === 'FileNotFound' || e?.name === 'EntryNotFound (FileSystemError)' ||
            (e instanceof vscode.FileSystemError && e.code === 'FileNotFound')) {
            return { result: 'absent' };
        }
        return { result: 'unknown' };
    }
}

/**
 * D-14: filters entry map to entries that are probed as 'present'.
 * Returns entries with their resolved URIs attached.
 */
export async function probeEntries(entries: Record<string, TouchEntry>): Promise<Record<string, TouchEntry & { _resolvedUri?: vscode.Uri }>> {
    const result: Record<string, TouchEntry & { _resolvedUri?: vscode.Uri }> = {};
    const probes = await Promise.all(
        Object.entries(entries).map(async ([key, entry]) => {
            const probe = await probeTouchEntry(entry);
            return { key, entry, probe };
        })
    );
    for (const { key, entry, probe } of probes) {
        if (probe.result === 'present') {
            result[key] = { ...entry, _resolvedUri: probe.uri } as any;
        }
    }
    return result;
}

/** Reads jarvis.touchedFiles.windowDays from workspace config (0 = no limit). */
export function readWindowDays(): number {
    return vscode.workspace.getConfiguration('jarvis.touchedFiles').get<number>('windowDays', 0) ?? 0;
}

/** Filters entry map to entries whose most recent touch is within the rolling window. */
export function withinWindow(entries: Record<string, TouchEntry>, windowDays: number): Record<string, TouchEntry> {
    if (windowDays <= 0) { return entries; }
    const cutoff = Date.now() - windowDays * 86_400_000;
    const result: Record<string, TouchEntry> = {};
    for (const [relPath, entry] of Object.entries(entries)) {
        const ts = Math.max(
            entry.lastEdited ? new Date(entry.lastEdited).getTime() : 0,
            entry.lastRead ? new Date(entry.lastRead).getTime() : 0,
        );
        if (ts >= cutoff) { result[relPath] = entry; }
    }
    return result;
}

/**
 * Builds the hierarchical touched-files tree from a flat key -> TouchEntry map.
 * For new records, entry.relPath is used for hierarchy; for legacy, the key itself.
 * Walked fresh on every expansion, never cached (SPEC_ENT_TOUCHEDFILES AC-6).
 */
export function buildTouchedFileChildren(
    entries: Record<string, TouchEntry & { _resolvedUri?: vscode.Uri }>,
    underFolder: string,
    workspaceRoot: string, ownerKind: string, entityName: string,
): (TouchedFileFolderNode | TouchedFileLeafNode)[] {
    const seenFolders = new Set<string>();
    const result: (TouchedFileFolderNode | TouchedFileLeafNode)[] = [];
    for (const [key, entry] of Object.entries(entries)) {
        const relPath = entry.relPath ?? key;
        if (underFolder && !relPath.startsWith(underFolder + '/')) { continue; }
        const rest = underFolder ? relPath.slice(underFolder.length + 1) : relPath;
        const sepIndex = rest.indexOf('/');
        if (sepIndex === -1) {
            const resourceUri = (entry as any)._resolvedUri as vscode.Uri | undefined;
            result.push({
                kind: 'touchedFileLeaf', label: rest, entry, ownerKind, entityName,
                filePath: resourceUri?.fsPath ?? path.join(workspaceRoot, relPath),
                resourceUri,
            });
        } else {
            const folderName = rest.slice(0, sepIndex);
            const relFolderPath = underFolder ? `${underFolder}/${folderName}` : folderName;
            const rootUri = entry.rootUri;
            // F3/F6: dedup on rootUri + relFolderPath for multi-root correctness
            const dedupKey = `${rootUri ?? ''}|${relFolderPath}`;
            if (seenFolders.has(dedupKey)) { continue; }
            seenFolders.add(dedupKey);
            // Scope entries to this root so children resolution stays within one root
            const scopedEntries = rootUri
                ? Object.fromEntries(Object.entries(entries).filter(([, e]) => e.rootUri === rootUri))
                : entries;
            result.push({ kind: 'touchedFileFolder', relFolderPath, label: folderName, entries: scopedEntries, ownerKind, entityName, rootUri });
        }
    }
    return result.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

/**
 * Recursive alphabetical scan of an entity's own folder (files and folders
 * sorted together, hidden entries included — fs.promises.readdir returns
 * dot-prefixed entries by default). Fail-open: an unreadable folder yields an
 * empty listing rather than an error (SPEC_ENT_ENTITY_FILE_CHILDREN).
 */
async function scanEntityFilesRecursive(
    folder: string
): Promise<(EntityFileNode | EntityFileFolderNode)[]> {
    let entries: fs.Dirent[];
    try {
        entries = await fs.promises.readdir(folder, { withFileTypes: true });
    } catch {
        return []; // fail-open: unreadable folder → empty listing, no error
    }
    const sorted = [...entries].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
    return sorted.map(entry => {
        const fullPath = path.join(folder, entry.name);
        return entry.isDirectory()
            ? { kind: 'entityFileFolder' as const, folderPath: fullPath, label: entry.name }
            : { kind: 'entityFile' as const, filePath: fullPath, label: entry.name };
    });
}

/**
 * Generic tree-provider factory driven by registered entity kinds.
 * One instance per viewId; renders items uniformly from EntityKindConfig.
 */
export class GenericTreeFactory {
    private readonly _configs = new Map<string, EntityKindConfig>();
    private readonly _providers = new Map<string, GenericTreeDataProvider>();
    private readonly _decorators = new Map<string, TreeItemDecorator[]>();
    private readonly _scanner: KindDrivenScanner;
    private readonly _onDidAddKind = new vscode.EventEmitter<string>();
    private _touchStore: TouchStore | undefined;

    /** Fired when a new entity kind is registered. */
    readonly onDidAddKind = this._onDidAddKind.event;

    constructor(scanner: KindDrivenScanner) {
        this._scanner = scanner;
    }

    /**
     * Injects the TouchStore used to render the "Recently Touched Files"
     * category (SPEC_ENT_TOUCHEDFILES). Set once, early in extension.ts —
     * a setter (rather than a constructor param) because TouchStore only
     * needs the workspace root and can be constructed independently of
     * scanner wiring order.
     */
    setTouchStore(store: TouchStore): void {
        this._touchStore = store;
    }

    addKind(config: EntityKindConfig): void {
        this._configs.set(config.kind, config);
        // Create or update provider for this kind's viewId
        if (!this._providers.has(config.kind)) {
            const provider = new GenericTreeDataProvider(config, this._scanner, this._decorators, () => this._touchStore);
            this._providers.set(config.kind, provider);
            // AC-12: Fire event for late-registration handling
            this._onDidAddKind.fire(config.kind);
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

    /** Get the list of registered entity kinds. */
    get registeredKinds(): string[] {
        return Array.from(this._providers.keys());
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
    private readonly _getTouchStore: () => TouchStore | undefined;
    
    // Filter state (SPEC_PRJ_FILTERCOMMAND, SPEC_EVT_EVENTFILTER_CMD)
    private _hiddenFolders: Set<string> = new Set();
    private _futureOnly: boolean = false;
    private _searchQuery: string = '';

    constructor(
        config: EntityKindConfig,
        scanner: KindDrivenScanner,
        decorators: Map<string, TreeItemDecorator[]>,
        getTouchStore: () => TouchStore | undefined = () => undefined
    ) {
        this._config = config;
        this._scanner = scanner;
        this._decorators = decorators;
        this._getTouchStore = getTouchStore;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    // Filter methods (SPEC_PRJ_FILTERCOMMAND)
    setHiddenFolders(folders: Set<string>): void {
        this._hiddenFolders = folders;
        this.refresh();
    }

    getHiddenFolders(): Set<string> {
        return this._hiddenFolders;
    }

    // Filter methods (SPEC_EVT_EVENTFILTER_CMD)
    setFutureOnly(value: boolean): void {
        this._futureOnly = value;
        this.refresh();
    }

    isFutureOnly(): boolean {
        return this._futureOnly;
    }

    // Live search filter
    setSearchFilter(query: string): void {
        this._searchQuery = query.toLowerCase().trim();
        this.refresh();
    }

    getSearchFilter(): string {
        return this._searchQuery;
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
            // Auto-expand folders when search filter is active (so matches are visible)
            const collapsibleState = this._searchQuery 
                ? vscode.TreeItemCollapsibleState.Expanded 
                : vscode.TreeItemCollapsibleState.Collapsed;
            const item = new vscode.TreeItem(element.name, collapsibleState);
            item.contextValue = 'jarvisFolder';
            return item;
        }

        // FileNode — entity file child (legacy TreeNode variant, retained for
        // TreeNode-consumer compatibility; no longer produced by this provider
        // since actor-owned-files-tree replaced the fixed 3-file list).
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

        // actor-owned-files-tree CR (SPEC_ENT_ENTITY_FILE_CHILDREN): category node
        if (element.kind === 'entityFileCategory') {
            const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
            item.contextValue = `jarvisEntityFileCategory:${element.category}`;
            return item;
        }

        // Recursive "Files" subfolder — expandable, scanned on demand
        if (element.kind === 'entityFileFolder') {
            const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
            item.tooltip = element.folderPath.replace(/\\/g, '/');
            item.contextValue = 'jarvisEntityFileFolder';
            return item;
        }

        // File child (either category) — leaf, click opens via jarvis.openEntityFile
        if (element.kind === 'entityFile') {
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

        // actor-touched-files CR (SPEC_ENT_TOUCHEDFILES): "Recently Touched Files" category
        if (element.kind === 'touchedFilesCategory') {
            const item = new vscode.TreeItem('Recently Touched Files', vscode.TreeItemCollapsibleState.Collapsed);
            item.contextValue = 'jarvisEntityFileCategory:touched';
            return item;
        }

        // Touched-files subfolder — distinct contextValue for remove command targeting
        if (element.kind === 'touchedFileFolder') {
            const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
            item.tooltip = element.relFolderPath;
            item.contextValue = 'jarvisTouchedFileFolder';
            // AC-27: disambiguate when multiple workspace roots are open
            const folders = vscode.workspace.workspaceFolders;
            if (folders && folders.length > 1 && element.rootUri) {
                const root = folders.find(f => f.uri.toString(true) === element.rootUri);
                if (root) { item.description = root.name; }
            }
            return item;
        }

        // Touched-file leaf — tooltip shows last-read/last-edited, click opens via jarvis.openEntityFile
        if (element.kind === 'touchedFileLeaf') {
            const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
            const { lastRead, lastEdited } = element.entry;
            item.tooltip = [
                lastEdited ? `Last edited: ${new Date(lastEdited).toLocaleString()}` : undefined,
                lastRead ? `Last read: ${new Date(lastRead).toLocaleString()}` : undefined,
            ].filter(Boolean).join('\n');
            item.contextValue = 'jarvisTouchedFile';
            item.command = { command: 'jarvis.openEntityFile', title: 'Open File', arguments: [element] };
            return item;
        }

        // LeafNode — render from kind config with hook support
        const entity = this._scanner.getEntity(element.id);
        const name = entity ? entity.name : path.basename(path.dirname(element.id));

        // SPEC_ENT_ENTITY_FILE_CHILDREN: leaf is always expandable — the
        // "Files" category child is always present (and "Agent" conditionally),
        // so at least one category node always exists under a leaf.
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
            let rootNodes = this._scanner.getTreeForKind(this._config.kind);
            // Apply filters at root level
            rootNodes = this._applyFilters(rootNodes);
            return rootNodes;
        }
        if (element.kind === 'folder') {
            // For event kind with future-only filter, also filter folder children
            if (this._config.kind === 'event' && this._futureOnly) {
                const filtered = this._applyEventFilter(element.children);
                return filtered;
            }
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
        // actor-owned-files-tree CR (SPEC_ENT_ENTITY_FILE_CHILDREN):
        // category / recursive-folder / file expansion — computed on-the-fly.
        if (element.kind === 'entityFileCategory') {
            if (element.category === 'agent') {
                return this._getAgentCategoryChildren(element);
            }
            // category === 'files'
            return scanEntityFilesRecursive(element.entityFolder);
        }
        if (element.kind === 'entityFileFolder') {
            return scanEntityFilesRecursive(element.folderPath);
        }
        if (element.kind === 'entityFile') {
            return []; // leaf — no further descent
        }
        // actor-touched-files CR (SPEC_ENT_TOUCHEDFILES): rendered from TouchStore's
        // persisted data, walked fresh on every expansion (never cached).
        if (element.kind === 'touchedFilesCategory') {
            return this._getTouchedCategoryChildren(element);
        }
        if (element.kind === 'touchedFileFolder') {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
            return buildTouchedFileChildren(element.entries, element.relFolderPath, workspaceRoot, element.ownerKind, element.entityName);
        }
        if (element.kind === 'touchedFileLeaf') {
            return []; // leaf — no further descent
        }
        // Leaf node — category children (always) + hook-based children (if any)
        if (element.kind === 'leaf') {
            return this._getLeafChildren(element);
        }
        return [];
    }

    private _applyFilters(nodes: TreeNode[]): TreeNode[] {
        // Apply kind-specific filters first
        if (this._config.kind === 'project' && this._hiddenFolders.size > 0) {
            // Filter out hidden root-level folders
            nodes = nodes.filter(n => n.kind !== 'folder' || !this._hiddenFolders.has(n.name));
        } else if (this._config.kind === 'event' && this._futureOnly) {
            nodes = this._applyEventFilter(nodes);
        }

        // Apply search filter if active
        if (this._searchQuery) {
            nodes = this._applySearchFilter(nodes);
        }

        return nodes;
    }

    private _applySearchFilter(nodes: TreeNode[]): TreeNode[] {
        const filtered: TreeNode[] = [];

        for (const node of nodes) {
            if (node.kind === 'leaf') {
                // Check if entity name matches search query
                const entity = this._scanner.getEntity(node.id);
                const name = entity?.name?.toLowerCase() ?? '';
                const summary = entity?.summary?.toLowerCase() ?? '';
                if (name.includes(this._searchQuery) || summary.includes(this._searchQuery)) {
                    filtered.push(node);
                }
            } else if (node.kind === 'folder') {
                // Recursively filter folder children
                const filteredChildren = this._applySearchFilter(node.children);
                if (filteredChildren.length > 0) {
                    filtered.push({ ...node, children: filteredChildren });
                }
            } else {
                // file nodes - pass through
                filtered.push(node);
            }
        }

        return filtered;
    }

    private _applyEventFilter(nodes: TreeNode[]): TreeNode[] {
        const today = new Date().toISOString().slice(0, 10);
        const filtered: TreeNode[] = [];

        for (const node of nodes) {
            if (node.kind === 'leaf') {
                // Filter out past events
                const entity = this._scanner.getEntity(node.id);
                const datesEnd = entity?.datesEnd;
                if (!datesEnd || datesEnd >= today) {
                    filtered.push(node);
                }
            } else if (node.kind === 'folder') {
                // Recursively filter folder children, prune if empty
                const filteredChildren = this._applyEventFilter(node.children);
                if (filteredChildren.length > 0) {
                    filtered.push({ ...node, children: filteredChildren });
                }
            } else {
                // file nodes, etc - pass through
                filtered.push(node);
            }
        }

        return filtered;
    }

    private async _getLeafChildren(element: LeafNode): Promise<ProviderNode[]> {
        const entity = this._scanner.getEntity(element.id);
        const entityFolder = path.dirname(element.id);
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';

        // Agent category (conditional) then Files category (always), on-the-fly
        // per SPEC_ENT_ENTITY_FILE_CHILDREN AC-2/AC-4/AC-5. Never cached in the
        // scanner or in KindDrivenScanner's own tree structures.
        const categoryNodes: (EntityFileCategoryNode | TouchedFilesCategoryNode)[] = [];
        const agentFile = await resolveAgentFileChild(entity?.agent, workspaceRoot);
        if (agentFile) {
            categoryNodes.push({
                kind: 'entityFileCategory', category: 'agent', label: 'Agent',
                entityFolder, entityId: element.id,
            });
        }
        categoryNodes.push({
            kind: 'entityFileCategory', category: 'files', label: 'Files',
            entityFolder, entityId: element.id,
        });

        // actor-touched-files CR (SPEC_ENT_TOUCHEDFILES AC-5): omitted entirely
        // when the entity's touch map is empty. Storage key resolved via
        // resolveTouchStorageKind (bugfix, GH #18) — must match the key
        // TouchTracker wrote under, not just this._config.kind (always
        // 'session' for both raw sessions and actors).
        // Category visibility keyed to withinWindow only — never to the existence check.
        const touchStore = this._getTouchStore();
        if (touchStore) {
            const name = entity ? entity.name : path.basename(entityFolder);
            const ownerKind = resolveTouchStorageKind(this._config.kind, entityFolder);
            const touchEntries = await touchStore.getEntries(ownerKind, name);
            const visible = withinWindow(touchEntries, readWindowDays());
            if (Object.keys(visible).length > 0) {
                categoryNodes.push({
                    kind: 'touchedFilesCategory', ownerKind, entityName: name,
                });
            }
        }

        let hookChildren: ProviderNode[] = [];
        if (this._config.getChildren) {
            const name = entity ? entity.name : path.basename(entityFolder);
            const entityData = { name, filePath: element.id, data: (entity ?? {}) as Record<string, unknown> };
            const descriptors = this._config.getChildren(entityData);
            if (descriptors && descriptors.length > 0) {
                hookChildren = descriptors.map(d => ({ kind: 'child' as const, descriptor: d, parentKind: this._config.kind }));
            }
        }
        return [...categoryNodes, ...hookChildren];
    }

    /**
     * Re-resolves the "Agent" category's single synthetic file child. Re-resolved
     * on every expansion (cheap: one module-level cache lookup + array find) rather
     * than cached, per SPEC_ENT_ENTITY_FILE_CHILDREN AC-2c.
     */
    private async _getAgentCategoryChildren(element: EntityFileCategoryNode): Promise<ProviderNode[]> {
        const entity = this._scanner.getEntity(element.entityId);
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        const agentFile = await resolveAgentFileChild(entity?.agent, workspaceRoot);
        return agentFile
            ? [{ kind: 'entityFile' as const, filePath: agentFile.filePath, label: agentFile.label }]
            : [];
    }

    /**
     * Resolves the "Recently Touched Files" category's children from
     * TouchStore, walked fresh on every expansion (SPEC_ENT_TOUCHEDFILES AC-6).
     * Applies withinWindow then probeEntries (tri-state) as display filters.
     */
    private async _getTouchedCategoryChildren(element: TouchedFilesCategoryNode): Promise<ProviderNode[]> {
        const store = this._getTouchStore();
        const raw = store ? await store.getEntries(element.ownerKind, element.entityName) : {};
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        const windowed = withinWindow(raw, readWindowDays());
        const entries = await probeEntries(windowed);
        return buildTouchedFileChildren(entries, '', workspaceRoot, element.ownerKind, element.entityName);
    }

    getParent(_element: ProviderNode): ProviderNode | null {
        return null;
    }
}
