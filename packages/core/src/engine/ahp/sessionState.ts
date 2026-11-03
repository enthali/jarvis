import type { SessionSummary } from './protocol';

type SessionEvent = { method: string; params: Record<string, unknown> };

export class SessionState {
    private readonly sessions = new Map<string, SessionSummary>();
    private readonly listeners = new Set<(sessions: SessionSummary[]) => void>();
    private pending: SessionEvent[] | undefined;

    subscribe(listener: (sessions: SessionSummary[]) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    begin(): void { this.pending = []; }

    finish(sessions: SessionSummary[]): void {
        this.sessions.clear();
        for (const session of sessions) {
            if (session.resource) { this.sessions.set(session.resource, session); }
        }
        const pending = this.pending ?? [];
        this.pending = undefined;
        for (const event of pending) { this.apply(event); }
        this.emit();
    }

    clear(): void {
        this.pending = undefined;
        this.sessions.clear();
        this.emit();
    }

    notify(method: string, params: unknown): void {
        if (!['root/sessionAdded', 'root/sessionSummaryChanged', 'root/sessionRemoved'].includes(method)
            || !params || typeof params !== 'object') { return; }
        const event = { method, params: params as Record<string, unknown> };
        if (this.pending) { this.pending.push(event); return; }
        this.apply(event);
        this.emit();
    }

    private apply({ method, params }: SessionEvent): void {
        const summary = params.summary as SessionSummary | undefined;
        if (method === 'root/sessionAdded' && typeof summary?.resource === 'string') {
            this.sessions.set(summary.resource, summary);
        } else if (method === 'root/sessionRemoved' && typeof params.session === 'string') {
            this.sessions.delete(params.session);
        } else if (method === 'root/sessionSummaryChanged' && typeof params.session === 'string'
            && params.changes && typeof params.changes === 'object') {
            const previous = this.sessions.get(params.session);
            if (previous) { this.sessions.set(params.session, { ...previous, ...params.changes, resource: params.session }); }
        }
    }

    private emit(): void {
        const sessions = [...this.sessions.values()].map(session => ({ ...session }));
        for (const listener of this.listeners) { listener(sessions); }
    }
}