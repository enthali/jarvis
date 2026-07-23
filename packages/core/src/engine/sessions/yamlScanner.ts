// Implementation: SPEC_ENG_SCANNER
// Requirements: REQ_ENG_SCANNER, REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE, REQ_EVT_EVENTFILTER, REQ_ENT_NAMESORT

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface EntityEntry {
    name: string;
    summary?: string;    // session/project summary; undefined if absent
    agent?: string;      // NEW — optional chat-mode binding for sessions
    datesStart?: string; // event start date YYYY-MM-DD; undefined for projects or if absent
    datesEnd?: string;   // event end date YYYY-MM-DD; undefined for projects or if absent
    kind?: 'project' | 'event' | 'session'; // entity kind; set by scanner
    folder?: string;     // absolute path to the containing directory
}

export interface FolderNode {
    kind: 'folder';
    name: string;
    children: TreeNode[];
}

export interface LeafNode {
    kind: 'leaf';
    id: string;
}

export interface FileNode {
    kind: 'file';
    filePath: string;   // absolute path, forward-slash normalized for tooltip
    label: string;      // basename shown as the tree item label
}

export type TreeNode = FolderNode | LeafNode | FileNode;

// ---------------------------------------------------------------------------
// Kind-driven scanner (SPEC_ENG_SCANNER)
// ---------------------------------------------------------------------------

import type { EntityKindConfig } from '../core/types';

export interface KindScanConfig {
    kind: string;
    folderSettingKey: string;
    conventionFile: string;
    additionalScanRoots?: { folderSettingKey: string; conventionFile: string }[];
}

/**
 * Kind-driven scanner that maintains a dynamic scan set based on registered kinds.
 * Each kind resolves its folder from its folderSettingKey; scan set updates without reload.
 */
export class KindDrivenScanner {
    private readonly _kinds = new Map<string, KindScanConfig>();
    private readonly _trees = new Map<string, TreeNode[]>();
    private readonly _entities = new Map<string, EntityEntry>();
    private _onCacheChanged: () => void;
    private _folderResolver: (settingKey: string) => string;

    constructor(onCacheChanged: () => void, folderResolver: (settingKey: string) => string) {
        this._onCacheChanged = onCacheChanged;
        this._folderResolver = folderResolver;
    }

    /** Add a kind to the scan set; triggers rescan. */
    addKind(config: EntityKindConfig): void {
        const conventionFile = `${config.kind}.yaml`;
        this._kinds.set(config.kind, {
            kind: config.kind,
            folderSettingKey: config.folderSettingKey,
            conventionFile,
            additionalScanRoots: config.additionalScanRoots,
        });
        this._trees.set(config.kind, []);
        // Trigger async rescan
        this.rescan();
    }

    /** Remove a kind from the scan set; clears its tree and entities. */
    removeKind(kind: string): void {
        this._kinds.delete(kind);
        // Remove entities belonging to this kind
        for (const [id, entry] of this._entities) {
            if (entry.kind === kind) {
                this._entities.delete(id);
            }
        }
        this._trees.delete(kind);
        this._onCacheChanged();
    }

    /** Get the tree for a specific kind. */
    getTreeForKind(kind: string): TreeNode[] {
        return this._trees.get(kind) ?? [];
    }

    /** Get entity by id. */
    getEntity(id: string): EntityEntry | undefined {
        return this._entities.get(id);
    }

    /** All entities across all registered kinds. */
    get entities(): (EntityEntry & { id: string; kind: 'project' | 'event' | 'session'; folder: string })[] {
        return [...this._entities.entries()].map(([id, entry]) => ({
            ...entry,
            id,
            kind: entry.kind ?? 'project' as 'project' | 'event' | 'session',
            folder: entry.folder ?? path.dirname(id),
        }));
    }

    /** The set of currently registered kind names. */
    get registeredKinds(): string[] {
        return [...this._kinds.keys()];
    }

    /** SPEC_ENG_SESSIONLIST: thin projection of all entities for JarvisCoreApi. */
    listJarvisSessions(): { name: string; summary: string; agent: string; kind: string; folder: string }[] {
        return this.entities.map(e => ({
            name: e.name ?? '',
            summary: e.summary ?? '',
            agent: e.agent ?? '',
            kind: e.kind,
            folder: e.folder,
        }));
    }

    /** Rescan all registered kinds. */
    async rescan(): Promise<void> {
        let changed = false;
        const newEntities = new Map<string, EntityEntry>();

        for (const [kind, scanConfig] of this._kinds) {
            // Primary root (unchanged behavior for Project/Event; also the
            // existing .jarvis/sessions/ root for session/actor)
            const folder = this._folderResolver(scanConfig.folderSettingKey);
            let newTree = await this._buildTree(folder, newEntities, scanConfig.conventionFile, kind as 'project' | 'event' | 'session');

            // Additional roots (actor-dualpath-scanner CR) — merge in place
            for (const root of scanConfig.additionalScanRoots ?? []) {
                const altFolder = this._folderResolver(root.folderSettingKey);
                const altTree = await this._buildTree(altFolder, newEntities, root.conventionFile, kind as 'project' | 'event' | 'session');
                newTree = this._mergeSortedTrees(newTree, altTree);
            }

            const oldTree = this._trees.get(kind) ?? [];
            if (!treesEqual(newTree, oldTree)) {
                this._trees.set(kind, newTree);
                changed = true;
            }
        }

        // Check entity changes
        if (!changed) {
            changed = !entitiesEqual(newEntities, this._entities);
        }

        if (changed) {
            this._entities.clear();
            for (const [k, v] of newEntities) {
                this._entities.set(k, v);
            }
            this._onCacheChanged();
        }
    }

    private async _buildTree(folder: string, entities: Map<string, EntityEntry>, conventionFile: string, kind: 'project' | 'event' | 'session'): Promise<TreeNode[]> {
        if (!folder) { return []; }

        let entries: fs.Dirent[];
        try {
            entries = await fs.promises.readdir(folder, { withFileTypes: true });
        } catch {
            return [];
        }

        const nodes: (LeafNode | FolderNode)[] = [];

        for (const entry of entries) {
            const fullPath = path.join(folder, entry.name);
            if (entry.isDirectory()) {
                const conventionPath = path.join(fullPath, conventionFile);
                let hasConventionFile = false;
                try {
                    await fs.promises.access(conventionPath);
                    hasConventionFile = true;
                } catch { /* no convention file */ }

                if (hasConventionFile) {
                    try {
                        const content = await fs.promises.readFile(conventionPath, 'utf8');
                        const doc = yaml.load(content) as Record<string, unknown>;
                        if (doc && typeof doc['name'] === 'string') {
                            const dates = doc['dates'] as Record<string, unknown> | undefined;
                            const datesEnd = dates?.['end'];
                            const rawStart = dates?.['start'];
                            const datesStart = rawStart instanceof Date
                                ? rawStart.toISOString().slice(0, 10)
                                : typeof rawStart === 'string' ? rawStart : undefined;
                            const summary = typeof doc['summary'] === 'string' ? doc['summary'] : undefined;
                            let agent: string | undefined;
                            if ('agent' in doc) {
                                if (typeof doc['agent'] === 'string') {
                                    agent = doc['agent'];
                                } else {
                                    agent = undefined;
                                }
                            }
                            entities.set(conventionPath, {
                                name: doc['name'],
                                ...(summary ? { summary } : {}),
                                ...(agent !== undefined ? { agent } : {}),
                                ...(datesStart ? { datesStart } : {}),
                                ...(typeof datesEnd === 'string' ? { datesEnd } : {}),
                                kind,
                                folder: fullPath,
                            });
                        } else {
                            entities.set(conventionPath, { name: entry.name, kind, folder: fullPath });
                        }
                    } catch {
                        entities.set(conventionPath, { name: entry.name, kind, folder: fullPath });
                    }
                    nodes.push({ kind: 'leaf', id: conventionPath });
                } else {
                    const children = await this._buildTree(fullPath, entities, conventionFile, kind);
                    if (children.length > 0) {
                        nodes.push({ kind: 'folder', name: entry.name, children });
                    }
                }
            }
        }

        // Sort: event leaves by (datesStart+name), others by name
        const isEvent = conventionFile === 'event.yaml';
        nodes.sort((a, b) => {
            const keyA = a.kind === 'leaf'
                ? (isEvent
                    ? ((entities.get(a.id)?.datesStart ?? '') + (entities.get(a.id)?.name ?? '')).toLowerCase()
                    : (entities.get(a.id)?.name?.toLowerCase() ?? path.basename(path.dirname(a.id)).toLowerCase()))
                : a.name.toLowerCase();
            const keyB = b.kind === 'leaf'
                ? (isEvent
                    ? ((entities.get(b.id)?.datesStart ?? '') + (entities.get(b.id)?.name ?? '')).toLowerCase()
                    : (entities.get(b.id)?.name?.toLowerCase() ?? path.basename(path.dirname(b.id)).toLowerCase()))
                : b.name.toLowerCase();
            return keyA.localeCompare(keyB);
        });

        return nodes;
    }

    /**
     * Merges two already-name-sorted node lists (each independently
     * produced by _buildTree, which sorts its own root's nodes) into one
     * combined, still name-sorted list — a simple sorted-merge, not a
     * concatenate-then-resort, to avoid re-deriving each node's sort key.
     * Folder nodes with the same display name from different roots are
     * NOT merged into one folder — they appear as two sibling folder
     * nodes with that name (REQ_ACT_DUALPATH_SCANNER AC-7, accepted
     * cosmetic edge case).
     */
    private _mergeSortedTrees(a: TreeNode[], b: TreeNode[]): TreeNode[] {
        const keyOf = (n: TreeNode) => {
            if (n.kind === 'folder') return n.name.toLowerCase();
            if (n.kind === 'leaf') return this._entities.get(n.id)?.name?.toLowerCase() ?? '';
            return ''; // FileNode case (shouldn't happen from _buildTree)
        };
        const merged: TreeNode[] = [];
        let i = 0, j = 0;
        while (i < a.length && j < b.length) {
            merged.push(keyOf(a[i]).localeCompare(keyOf(b[j])) <= 0 ? a[i++] : b[j++]);
        }
        return merged.concat(a.slice(i), b.slice(j));
    }
}

// Shared tree comparison utilities
function treesEqual(a: TreeNode[], b: TreeNode[]): boolean {
    if (a.length !== b.length) { return false; }
    return a.every((nodeA, i) => nodeEqual(nodeA, b[i]));
}

function nodeEqual(a: TreeNode, b: TreeNode): boolean {
    if (a.kind !== b.kind) { return false; }
    if (a.kind === 'leaf' && b.kind === 'leaf') { return a.id === b.id; }
    if (a.kind === 'folder' && b.kind === 'folder') {
        return a.name === b.name && treesEqual(a.children, b.children);
    }
    return false;
}

function entitiesEqual(a: Map<string, EntityEntry>, b: Map<string, EntityEntry>): boolean {
    if (a.size !== b.size) { return false; }
    const serialize = (m: Map<string, EntityEntry>) =>
        JSON.stringify([...m.entries()].sort(([k1], [k2]) => k1.localeCompare(k2)).map(([k, v]) => [k, JSON.stringify(v)]));
    return serialize(a) === serialize(b);
}
