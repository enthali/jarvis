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
        const catLower = filter.category?.toLowerCase();
        return tasks.filter(t => {
            if (catLower && !t.categories.some(c => c.toLowerCase().startsWith(catLower))) {
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
        // Invalidate synchronously so next get() re-fetches; refresh in background
        this._cache.invalidate();
        this._cache.refresh().catch(e =>
            console.error(`[TaskService] background refresh after modifyTask failed: ${e}`)
        );
    }

    async deleteTask(id: string, provider?: string): Promise<void> {
        for (const p of this._targets(provider)) {
            await p.deleteTask(id);
        }
        this._cache.invalidate();
        this._cache.refresh().catch(e =>
            console.error(`[TaskService] background refresh after deleteTask failed: ${e}`)
        );
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
                // log via console — TaskService has no logger injected
                console.error(`[TaskService] provider "${p.source}" getTasks failed: ${e}`);
            }
        }
        return results;
    }
}
