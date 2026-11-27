// Implementation: SPEC_ACTOR_TREE, SPEC_ACTOR_FILES, SPEC_COM_STATE, SPEC_ENG_ACTORMARK, SPEC_ENG_ACTORINDICATOR
// Requirements: REQ_ACTOR_TREE, REQ_ACTOR_FILES_TREE, REQ_COM_STATE, REQ_ENG_ACTORMARK, REQ_ENG_ACTORINDICATOR

import * as vscode from 'vscode';
import { ActorScanner, ActorEntry } from './actorScanner';
import { resolveAgentFile, listFolder, ActorFileNode, ActorFileFolderNode } from './actorFiles';
import type { ActorActivityState } from './actorActivity';

export interface ActorNode {
    kind: 'actor';
    id: string;
}

export interface ActorFileCategoryNode {
    kind: 'actorFileCategory';
    category: 'agent' | 'files';
    actorId: string;
    actorName: string;
    actorFolder: string;
}

export type ActorTreeNode =
    | ActorNode
    | ActorFileCategoryNode
    | ActorFileNode
    | ActorFileFolderNode;

export interface ActivityLike {
    state(name: string): ActorActivityState;
}

export class ActorTreeProvider implements vscode.TreeDataProvider<ActorTreeNode>, vscode.Disposable {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<ActorTreeNode | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    /** Icon marks per Actor id, oldest first; the last one still set is shown (SPEC_ENG_ACTORMARK). */
    private readonly _marks = new Map<string, { icon: vscode.ThemeIcon }[]>();
    /** Add-on indicators per Actor id, oldest first; weaker than marks (SPEC_ENG_ACTORINDICATOR). */
    private readonly _indicators = new Map<string, { icon: vscode.ThemeIcon }[]>();

    constructor(
        private readonly _scanner: ActorScanner,
        private readonly _activity: ActivityLike,
    ) {}

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    /**
     * Icon mark of an add-on on one Actor node. Marks on the same id stack; the node
     * shows the most recent one still set (SPEC_ENG_ACTORMARK AC-1, AC-2, AC-3).
     */
    mark(actorId: string, icon: vscode.ThemeIcon): vscode.Disposable {
        return this._stack(this._marks, actorId, icon);
    }

    /** Status indicator of an add-on; shown only below activity and marks (SPEC_ENG_ACTORINDICATOR). */
    indicate(actorId: string, icon: vscode.ThemeIcon): vscode.Disposable {
        return this._stack(this._indicators, actorId, icon);
    }

    private _stack(
        store: Map<string, { icon: vscode.ThemeIcon }[]>, actorId: string, icon: vscode.ThemeIcon,
    ): vscode.Disposable {
        const entry = { icon };
        store.set(actorId, [...(store.get(actorId) ?? []), entry]);
        this.refresh();
        let disposed = false;
        return new vscode.Disposable(() => {
            if (disposed) { return; }
            disposed = true;
            const rest = (store.get(actorId) ?? []).filter(e => e !== entry);
            if (rest.length > 0) { store.set(actorId, rest); } else { store.delete(actorId); }
            this.refresh();
        });
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }

    async getChildren(element?: ActorTreeNode): Promise<ActorTreeNode[]> {
        if (!element) {
            return this._scanner.actors.map(actor => ({ kind: 'actor', id: actor.id }));
        }
        if (element.kind === 'actor') {
            const actor = this._scanner.getActor(element.id);
            if (!actor) { return []; }
            return this._actorChildren(actor);
        }
        if (element.kind === 'actorFileCategory') {
            if (element.category === 'agent') {
                const actor = this._scanner.getActor(element.actorId);
                const agentFile = actor ? await resolveAgentFile(actor.name) : undefined;
                if (!agentFile) { return []; }
                const label = agentFile.split(/[\\/]/).pop() ?? agentFile;
                return [{ kind: 'actorFile', filePath: agentFile, label }];
            }
            if (element.category === 'files') {
                return listFolder(element.actorFolder);
            }
            return [];
        }
        if (element.kind === 'actorFileFolder') {
            return listFolder(element.folderPath);
        }
        return [];
    }

    private async _actorChildren(actor: ActorEntry): Promise<ActorFileCategoryNode[]> {
        const categories: ActorFileCategoryNode[] = [];
        const agentFile = await resolveAgentFile(actor.name);
        if (agentFile) {
            categories.push({ kind: 'actorFileCategory', category: 'agent', actorId: actor.id, actorName: actor.name, actorFolder: actor.folder });
        }
        categories.push({ kind: 'actorFileCategory', category: 'files', actorId: actor.id, actorName: actor.name, actorFolder: actor.folder });
        return categories;
    }

    getTreeItem(element: ActorTreeNode): vscode.TreeItem {
        if (element.kind === 'actor') {
            const actor = this._scanner.getActor(element.id);
            const item = new vscode.TreeItem(actor?.name ?? '', vscode.TreeItemCollapsibleState.Collapsed);
            item.tooltip = actor?.summary ?? '';
            item.contextValue = 'jarvisActor';
            item.command = { command: 'jarvis.openActorSession', title: 'Open Actor Session', arguments: [element] };
            const marks = this._marks.get(element.id);
            const mark = marks?.[marks.length - 1];
            const indicators = this._indicators.get(element.id);
            const indicator = indicators?.[indicators.length - 1];
            const state = actor ? this._activity.state(actor.name) : 'idle';
            if (state === 'error') {
                item.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
            } else if (state === 'waiting') {
                item.iconPath = new vscode.ThemeIcon('question', new vscode.ThemeColor('charts.blue'));
            } else if (state === 'working') {
                item.iconPath = new vscode.ThemeIcon('loading~spin');
            } else if (mark) {
                item.iconPath = mark.icon;
            } else if (indicator) {
                item.iconPath = indicator.icon;
            }
            return item;
        }
        if (element.kind === 'actorFileCategory') {
            const label = element.category === 'agent' ? 'Agent' : 'Files';
            const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
            item.contextValue = `jarvisActorFileCategory:${element.category}`;
            return item;
        }
        if (element.kind === 'actorFile') {
            const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
            item.resourceUri = vscode.Uri.file(element.filePath);
            item.contextValue = 'jarvisActorFile';
            item.command = { command: 'jarvis.openActorFile', title: 'Open File', arguments: [element] };
            return item;
        }
        // actorFileFolder
        const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
        item.resourceUri = vscode.Uri.file(element.folderPath);
        item.contextValue = 'jarvisActorFileFolder';
        return item;
    }
}
