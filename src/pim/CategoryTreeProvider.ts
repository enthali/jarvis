// Implementation: SPEC_PIM_CATVIEW
// Requirements: REQ_PIM_CATVIEW

import * as vscode from 'vscode';
import { CategoryService } from './CategoryService';

interface CategoryLeafNode {
    kind: 'category';
    id?: string;
    name: string;
    source: string;
    color: number;
}

interface EmptyNode {
    kind: 'empty';
}

type CategoryNode = CategoryLeafNode | EmptyNode;

export class CategoryTreeProvider implements vscode.TreeDataProvider<CategoryNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<CategoryNode | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private _service: CategoryService) {}

    async refresh(): Promise<void> {
        await this._service.refresh();
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: CategoryNode): vscode.TreeItem {
        if (element.kind === 'category') {
            const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.None);
            item.description = `[${element.source}]`;
            item.contextValue = 'jarvisCategory';
            return item;
        }
        return new vscode.TreeItem('no categories', vscode.TreeItemCollapsibleState.None);
    }

    async getChildren(element?: CategoryNode): Promise<CategoryNode[]> {
        if (element) {
            return [];
        }
        const cats = await this._service.getCategories();
        if (cats.length === 0) {
            return [{ kind: 'empty' }];
        }
        const nodes: CategoryLeafNode[] = cats.map(c => ({
            kind: 'category' as const,
            id: c.id,
            name: c.name,
            source: c.source,
            color: c.color
        }));
        nodes.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        return nodes;
    }
}
