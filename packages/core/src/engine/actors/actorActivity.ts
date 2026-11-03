import { sessionHasFolder, type SessionSummary } from '../ahp/protocol';

export type ActorActivityState = 'idle' | 'working' | 'waiting' | 'error';

const priority: Record<ActorActivityState, number> = { idle: 0, working: 1, waiting: 2, error: 3 };

export function activityForStatus(status: number): ActorActivityState {
    if ((status & 24) === 24) { return 'waiting'; }
    if (status & 8) { return 'working'; }
    if (status & 2) { return 'error'; }
    return 'idle';
}

export class ActorActivity {
    private sessions: SessionSummary[] = [];
    private states = new Map<string, ActorActivityState>();

    constructor(private readonly folder: string, private readonly actorNames: () => string[], private readonly changed: () => void) {}

    state(name: string): ActorActivityState { return this.states.get(name) ?? 'idle'; }

    update(sessions: SessionSummary[]): void {
        this.sessions = sessions;
        this.refresh();
    }

    refresh(): void {
        const counts = new Map<string, number>();
        for (const name of this.actorNames()) { counts.set(name, (counts.get(name) ?? 0) + 1); }
        const next = new Map<string, ActorActivityState>();
        for (const session of this.sessions) {
            const name = session.title;
            if (!name || counts.get(name) !== 1 || !sessionHasFolder(session, this.folder)) { continue; }
            const state = activityForStatus(session.status ?? 0);
            if (priority[state] > priority[next.get(name) ?? 'idle']) { next.set(name, state); }
        }
        if (next.size === this.states.size && [...next].every(([name, state]) => this.states.get(name) === state)) { return; }
        this.states = next;
        this.changed();
    }
}