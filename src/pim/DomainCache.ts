// Implementation: SPEC_PIM_CACHE
// Requirements: REQ_PIM_CACHE

export class DomainCache<T> {
    private _data: T | undefined;
    private _refreshFn: () => Promise<T>;

    constructor(refreshFn: () => Promise<T>) {
        this._refreshFn = refreshFn;
    }

    get(): T | undefined {
        return this._data;
    }

    invalidate(): void {
        this._data = undefined;
    }

    async refresh(): Promise<T> {
        this._data = await this._refreshFn();
        return this._data;
    }
}
