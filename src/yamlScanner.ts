// Implementation: SPEC_EXP_SCANNER
// Requirements: REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE, REQ_EXP_EVENTFILTER, REQ_EXP_NAMESORT

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface EntityEntry {
    name: string;
    datesEnd?: string;  // event end date YYYY-MM-DD; undefined for projects or if absent
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

export type TreeNode = FolderNode | LeafNode;

export class YamlScanner {
    private _projectTree: TreeNode[] = [];
    private _eventTree: TreeNode[] = [];
    private _entities: Map<string, EntityEntry> = new Map();
    private _onCacheChanged: () => void;
    private _projectsFolder = '';
    private _eventsFolder = '';

    constructor(onCacheChanged: () => void) {
        this._onCacheChanged = onCacheChanged;
    }

    start(projectsFolder: string, eventsFolder: string): void {
        this.stop();
        this._projectsFolder = projectsFolder;
        this._eventsFolder = eventsFolder;
        this._scan(projectsFolder, eventsFolder);
    }

    async rescan(): Promise<void> {
        if (!this._projectsFolder && !this._eventsFolder) { return; }
        await this._scan(this._projectsFolder, this._eventsFolder);
    }

    stop(): void {
        // No-op — timer logic removed; periodic rescans managed via heartbeat
    }

    getProjectTree(): TreeNode[] {
        return this._projectTree;
    }

    getEventTree(): TreeNode[] {
        return this._eventTree;
    }

    getEntity(id: string): EntityEntry | undefined {
        return this._entities.get(id);
    }

    private async _scan(projectsFolder: string, eventsFolder: string): Promise<void> {
        const newEntities = new Map<string, EntityEntry>();
        const newProjectTree = await this._buildTree(projectsFolder, newEntities, 'project.yaml');
        const newEventTree = await this._buildTree(eventsFolder, newEntities, 'event.yaml');

        // Entity-map comparison (scanner-refresh change): detect YAML content changes
        // even when tree structure is unchanged
        const changed =
            !this._treesEqual(newProjectTree, this._projectTree) ||
            !this._treesEqual(newEventTree, this._eventTree) ||
            !this._entitiesEqual(newEntities, this._entities);

        if (changed) {
            this._projectTree = newProjectTree;
            this._eventTree = newEventTree;
            this._entities = newEntities;
            this._onCacheChanged();
        }
    }

    private async _buildTree(folder: string, entities: Map<string, EntityEntry>, conventionFile: string): Promise<TreeNode[]> {
        if (!folder) {
            return [];
        }

        let entries: fs.Dirent[];
        try {
            entries = await fs.promises.readdir(folder, { withFileTypes: true });
        } catch {
            return [];
        }

        const nodes: TreeNode[] = [];

        for (const entry of entries) {
            const fullPath = path.join(folder, entry.name);
            if (entry.isDirectory()) {
                const conventionPath = path.join(fullPath, conventionFile);
                let hasConventionFile = false;
                try {
                    await fs.promises.access(conventionPath);
                    hasConventionFile = true;
                } catch {
                    // no convention file
                }

                if (hasConventionFile) {
                    // Leaf node — read convention file, no further descent
                    try {
                        const content = await fs.promises.readFile(conventionPath, 'utf8');
                        const doc = yaml.load(content) as Record<string, unknown>;
                        if (doc && typeof doc['name'] === 'string') {
                            const datesEnd = (doc['dates'] as Record<string, unknown>)?.['end'];
                            entities.set(conventionPath, {
                                name: doc['name'],
                                ...(typeof datesEnd === 'string' ? { datesEnd } : {})
                            });
                        } else {
                            // Fallback: convention file present but missing/invalid name
                            entities.set(conventionPath, { name: entry.name });
                        }
                    } catch {
                        // Fallback: convention file present but unparseable
                        entities.set(conventionPath, { name: entry.name });
                    }
                    nodes.push({ kind: 'leaf', id: conventionPath });
                } else {
                    // Grouping folder — recurse, only include if non-empty
                    const children = await this._buildTree(fullPath, entities, conventionFile);
                    if (children.length > 0) {
                        nodes.push({ kind: 'folder', name: entry.name, children });
                    }
                }
            }
            // Non-directory entries (files) are ignored — only convention files inside folders matter
        }

        // Sort nodes alphabetically: leaves by entity name, folders by folder name
        nodes.sort((a, b) => {
            const keyA = a.kind === 'leaf'
                ? (entities.get(a.id)?.name?.toLowerCase() ?? path.basename(path.dirname(a.id)).toLowerCase())
                : a.name.toLowerCase();
            const keyB = b.kind === 'leaf'
                ? (entities.get(b.id)?.name?.toLowerCase() ?? path.basename(path.dirname(b.id)).toLowerCase())
                : b.name.toLowerCase();
            return keyA.localeCompare(keyB);
        });

        return nodes;
    }

    private _entitiesEqual(a: Map<string, EntityEntry>, b: Map<string, EntityEntry>): boolean {
        if (a.size !== b.size) { return false; }
        const serialize = (m: Map<string, EntityEntry>) =>
            JSON.stringify([...m.entries()].sort(([k1], [k2]) => k1.localeCompare(k2)).map(([k, v]) => [k, JSON.stringify(v)]));
        return serialize(a) === serialize(b);
    }

    private _treesEqual(a: TreeNode[], b: TreeNode[]): boolean {
        if (a.length !== b.length) {
            return false;
        }
        return a.every((nodeA, i) => this._nodeEqual(nodeA, b[i]));
    }

    private _nodeEqual(a: TreeNode, b: TreeNode): boolean {
        if (a.kind !== b.kind) {
            return false;
        }
        if (a.kind === 'leaf' && b.kind === 'leaf') {
            return a.id === b.id;
        }
        if (a.kind === 'folder' && b.kind === 'folder') {
            return a.name === b.name && this._treesEqual(a.children, b.children);
        }
        return false;
    }
}
