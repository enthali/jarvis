// Implementation: SPEC_PIM_SERVICE
// Requirements: REQ_PIM_SERVICE

import * as vscode from 'vscode';
import { Category, ICategoryProvider } from './ICategoryProvider';
import { DomainCache } from './DomainCache';

export class CategoryService {
    private _providers: ICategoryProvider[] = [];
    private _cache: DomainCache<Category[]>;
    private _log: vscode.LogOutputChannel;

    constructor(log: vscode.LogOutputChannel) {
        this._log = log;
        this._cache = new DomainCache<Category[]>(
            () => this._fetchAll()
        );
    }

    addProvider(provider: ICategoryProvider): void {
        this._providers.push(provider);
    }

    hasProviders(): boolean {
        return this._providers.length > 0;
    }

    async getCategories(filter?: string): Promise<Category[]> {
        let cats = this._cache.get();
        if (!cats) {
            cats = await this._cache.refresh();
        }
        if (filter) {
            const f = filter.toLowerCase();
            return cats.filter(c =>
                c.name.toLowerCase().startsWith(f) ||
                c.source.toLowerCase() === f
            );
        }
        return cats;
    }

    async setCategory(
        name: string,
        color: number,
        provider?: string
    ): Promise<void> {
        const targets = provider
            ? this._providers.filter(p => p.source === provider)
            : this._providers;
        for (const p of targets) {
            await p.setCategory(name, color);
        }
        this._cache.invalidate();
    }

    async deleteCategory(
        name: string,
        provider?: string,
        id?: string
    ): Promise<void> {
        const targets = provider
            ? this._providers.filter(p => p.source === provider)
            : this._providers;
        for (const p of targets) {
            await p.deleteCategory(id ?? name);
        }
        this._cache.invalidate();
    }

    async renameCategory(
        oldName: string,
        newName: string,
        provider?: string,
        id?: string
    ): Promise<void> {
        const targets = provider
            ? this._providers.filter(p => p.source === provider)
            : this._providers;
        for (const p of targets) {
            await p.renameCategory(id ?? oldName, newName);
        }
        this._cache.invalidate();
    }

    async refresh(): Promise<Category[]> {
        return this._cache.refresh();
    }

    invalidate(): void {
        this._cache.invalidate();
    }

    private async _fetchAll(): Promise<Category[]> {
        const results: Category[] = [];
        for (const p of this._providers) {
            try {
                const cats = await p.getCategories();
                results.push(...cats);
            } catch (e) {
                this._log.error(
                    `[PIM] Provider ${p.source} failed: ${e}`
                );
            }
        }
        return results;
    }
}
