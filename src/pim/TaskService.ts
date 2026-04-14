// Implementation: SPEC_PIM_TASKSERVICE
// Requirements: REQ_PIM_TASKSERVICE

import { Task, ITaskProvider } from './ITaskProvider';
import { DomainCache } from './DomainCache';

export interface TaskFilter {
    category?: string;
    status?: string;
    dueBefore?: string;   // ISO date string
}

export class TaskService {
    private _providers: ITaskProvider[] = [];
    private _cache: DomainCache<Task[]>;

    constructor() {
        this._cache = new DomainCache<Task[]>(
            () => this._fetchAll()
        );
    }

    addProvider(p: ITaskProvider): void {
        this._providers.push(p);
    }

    hasProviders(): boolean {
        return this._providers.length > 0;
    }

    async getTasks(filter?: TaskFilter): Promise<Task[]> {
        let tasks = this._cache.get();
        if (!tasks) { tasks = await this._cache.refresh(); }
        if (!filter) { return tasks; }
        return tasks.filter(t => {
            if (filter.category && !t.categories.includes(filter.category)) {
                return false;
            }
            if (filter.status && t.status !== filter.status) { return false; }
            if (filter.dueBefore && t.dueDate && t.dueDate > filter.dueBefore) {
                return false;
            }
            return true;
        });
    }

    async setTask(task: Partial<Task>, provider?: string): Promise<Task> {
        const targets = this._targets(provider);
        const result = await targets[0].setTask(task);
        this._cache.invalidate();
        await this._cache.refresh();
        return result;
    }

    async modifyTask(
        id: string, changes: Partial<Task>, provider?: string
    ): Promise<void> {
        for (const p of this._targets(provider)) {
            await p.modifyTask(id, changes);
        }
        this._cache.invalidate();
        await this._cache.refresh();
    }

    async deleteTask(id: string, provider?: string): Promise<void> {
        for (const p of this._targets(provider)) {
            await p.deleteTask(id);
        }
        this._cache.invalidate();
        await this._cache.refresh();
    }

    async refresh(): Promise<void> {
        await this._cache.refresh();
    }

    private _targets(provider?: string): ITaskProvider[] {
        if (!provider) { return this._providers; }
        const t = this._providers.find(p => p.source === provider);
        if (!t) { throw new Error(`Unknown provider: ${provider}`); }
        return [t];
    }

    private async _fetchAll(): Promise<Task[]> {
        const results: Task[] = [];
        for (const p of this._providers) {
            try {
                results.push(...await p.getTasks());
            } catch (e) {
                // log but do not propagate — one failing provider must not
                // block others
            }
        }
        return results;
    }
}
