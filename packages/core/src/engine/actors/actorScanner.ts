import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface ActorEntry {
    id: string;
    name: string;
    summary: string;
    agent: string;
    folder: string;
}

export interface ActorLeafNode {
    kind: 'actor';
    id: string;
}

export type ActorTreeNode = ActorLeafNode;

export class ActorScanner {
    private _tree: ActorTreeNode[] = [];
    private _actors = new Map<string, ActorEntry>();

    constructor(
        private readonly _resolveRoot: () => string,
        private readonly _onDidChange: () => void,
    ) {}

    get tree(): ActorTreeNode[] {
        return this._tree;
    }

    get actors(): ActorEntry[] {
        return [...this._actors.values()];
    }

    getActor(id: string): ActorEntry | undefined {
        return this._actors.get(id);
    }

    async rescan(): Promise<void> {
        const actors = new Map<string, ActorEntry>();
        const tree = await this._scanRoot(this._resolveRoot(), actors);
        if (JSON.stringify(tree) === JSON.stringify(this._tree)
            && JSON.stringify([...actors]) === JSON.stringify([...this._actors])) {
            return;
        }

        this._tree = tree;
        this._actors = actors;
        this._onDidChange();
    }

    private async _scanRoot(folder: string, actors: Map<string, ActorEntry>): Promise<ActorTreeNode[]> {
        if (!folder) { return []; }

        let entries: fs.Dirent[];
        try {
            entries = await fs.promises.readdir(folder, { withFileTypes: true });
        } catch {
            return [];
        }

        const nodes: ActorTreeNode[] = [];
        for (const entry of entries) {
            if (!entry.isDirectory()) { continue; }

            const actorFolder = path.join(folder, entry.name);
            const actorFile = path.join(actorFolder, 'actor.yaml');
            if (await exists(actorFile)) {
                actors.set(actorFile, await readActor(actorFile, actorFolder, entry.name));
                nodes.push({ kind: 'actor', id: actorFile });
            }
        }

        nodes.sort((left, right) => nodeLabel(left, actors).localeCompare(
            nodeLabel(right, actors), undefined, { sensitivity: 'base' }
        ));
        return nodes;
    }
}

async function exists(filePath: string): Promise<boolean> {
    try {
        await fs.promises.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function readActor(actorFile: string, folder: string, fallbackName: string): Promise<ActorEntry> {
    try {
        const document = yaml.load(await fs.promises.readFile(actorFile, 'utf8')) as Record<string, unknown> | undefined;
        return {
            id: actorFile,
            name: typeof document?.['name'] === 'string' && document['name'] ? document['name'] : fallbackName,
            summary: typeof document?.['summary'] === 'string' ? document['summary'] : '',
            agent: typeof document?.['agent'] === 'string' ? document['agent'] : '',
            folder,
        };
    } catch {
        return { id: actorFile, name: fallbackName, summary: '', agent: '', folder };
    }
}

function nodeLabel(node: ActorTreeNode, actors: Map<string, ActorEntry>): string {
    return actors.get(node.id)?.name ?? '';
}