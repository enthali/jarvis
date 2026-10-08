// Implementation: SPEC_ACTOR_TREE, SPEC_ACTOR_FILES, SPEC_ACTOR_TOUCHEDFILES, SPEC_ACTOR_ACTIVITY, SPEC_ENG_ACTORMARK
// Requirements: REQ_ACTOR_TREE, REQ_ACTOR_FILES_TREE, REQ_ACTOR_TOUCHEDFILES, REQ_ACTOR_ACTIVITY, REQ_ENG_ACTORMARK

import * as vscode from 'vscode';
import { ActorScanner, ActorEntry } from './actorScanner';
import { resolveAgentFile, listFolder, ActorFileNode, ActorFileFolderNode } from './actorFiles';
import {
    readWindowDays, withinWindow, probeEntries, buildTouchedFileChildren,
    TouchedFileFolderNode, TouchedFileLeafNode,
} from './touchedFilesView';
import { TouchStore, ACTOR_TOUCH_KIND } from '../hooks/touchStore';

export interface ActorNode {
    kind: 'actor';
    id: string;
}

export interface ActorFileCategoryNode {
    kind: 'actorFileCategory';
    category: 'agent' | 'files' | 'touched';
    actorId: string;
    actorName: string;
    actorFolder: string;
}

export type ActorTreeNode =
    | ActorNode
    | ActorFileCategoryNode
    | ActorFileNode
    | ActorFileFolderNode
    | TouchedFileFolderNode
    | TouchedFileLeafNode;

export interface ActivityLike {
    isActive(name: string): boolean;
}

export class ActorTreeProvider implements vscode.TreeDataProvider<ActorTreeNode>, vscode.Disposable {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<ActorTreeNode | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private readonly _marks = new Map<string, { icon: vscode.ThemeIcon }>();

    constructor(
        private readonly _scanner: ActorScanner,
        private readonly _touchStore: TouchStore,
        private readonly _activity: ActivityLike,
    ) {}

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    /** Icon mark of an add-on on one Actor node; a second mark on the same id replaces the first (SPEC_ENG_ACTORMARK). */
    mark(actorId: string, icon: vscode.ThemeIcon): vscode.Disposable {
        const entry = { icon };
        this._marks.set(actorId, entry);
        this.refresh();
        return new vscode.Disposable(() => {
            if (this._marks.get(actorId) === entry) {
                this._marks.delete(actorId);
                this.refresh();
            }
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
            // 'touched'
            return this._touchedChildren(element.actorName, '');
        }
        if (element.kind === 'actorFileFolder') {
            return listFolder(element.folderPath);
        }
        if (element.kind === 'touchedFileFolder') {
            const probed = await probeEntries(element.entries);
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
            return buildTouchedFileChildren(probed, element.relFolderPath, workspaceRoot, element.actorName);
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

        const raw = await this._touchStore.getEntries(ACTOR_TOUCH_KIND, actor.name);
        const windowed = withinWindow(raw, readWindowDays());
        // REQ_ACTOR_TOUCHEDFILES AC-22: no attribution for an ambiguous name.
        if (this._scanner.resolveName(actor.name).status === 'found' && Object.keys(windowed).length > 0) {
            categories.push({ kind: 'actorFileCategory', category: 'touched', actorId: actor.id, actorName: actor.name, actorFolder: actor.folder });
        }
        return categories;
    }

    private async _touchedChildren(actorName: string, underFolder: string): Promise<(TouchedFileFolderNode | TouchedFileLeafNode)[]> {
        const raw = await this._touchStore.getEntries(ACTOR_TOUCH_KIND, actorName);
        const windowed = withinWindow(raw, readWindowDays());
        const probed = await probeEntries(windowed);
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        return buildTouchedFileChildren(probed, underFolder, workspaceRoot, actorName);
    }

    getTreeItem(element: ActorTreeNode): vscode.TreeItem {
        if (element.kind === 'actor') {
            const actor = this._scanner.getActor(element.id);
            const item = new vscode.TreeItem(actor?.name ?? '', vscode.TreeItemCollapsibleState.Collapsed);
            item.tooltip = actor?.summary ?? '';
            item.contextValue = 'jarvisActor';
            item.command = { command: 'jarvis.openActorSession', title: 'Open Actor Session', arguments: [element] };
            const mark = this._marks.get(element.id);
            if (mark) {
                item.iconPath = mark.icon;
            } else if (actor && this._activity.isActive(actor.name)) {
                item.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
            }
            return item;
        }
        if (element.kind === 'actorFileCategory') {
            const label = element.category === 'agent' ? 'Agent' : element.category === 'files' ? 'Files' : 'Recently Touched Files';
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
        if (element.kind === 'actorFileFolder') {
            const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
            item.resourceUri = vscode.Uri.file(element.folderPath);
            item.contextValue = 'jarvisActorFileFolder';
            return item;
        }
        if (element.kind === 'touchedFileFolder') {
            const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
            item.contextValue = 'jarvisTouchedFileFolder';
            return item;
        }
        // touchedFileLeaf
        const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
        item.resourceUri = element.resourceUri ?? vscode.Uri.file(element.filePath);
        item.contextValue = 'jarvisTouchedFile';
        item.command = { command: 'jarvis.openActorFile', title: 'Open File', arguments: [element] };
        return item;
    }
}
