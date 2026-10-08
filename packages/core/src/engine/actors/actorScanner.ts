// Implementation: SPEC_ACTOR_SCANNER
// Requirements: REQ_ACTOR_SCHEMA, REQ_ACTOR_ACTIVATION, REQ_ACTOR_TREE, REQ_EXP_REACTIVECACHE, REQ_CFG_SCANINTERVAL

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/** One Actor as discovered from `<actorsFolder>/<name>/actor.yaml`. */
export interface ActorEntry {
    id: string;      // absolute path of actor.yaml
    name: string;    // actor.yaml name; fallback: folder name
    summary: string; // "" when absent
    folder: string;  // absolute Actor folder
}

export type ActorLookup =
    | { status: 'found'; actor: ActorEntry }
    | { status: 'unknown' }
    | { status: 'ambiguous'; matches: ActorEntry[] };

/** `Actor name "<name>" is ambiguous: <folder>, <folder>` (REQ_ACTOR_SCHEMA AC-7). */
export function ambiguousActorMessage(name: string, matches: ActorEntry[]): string {
    return `Actor name "${name}" is ambiguous: ${matches.map(m => m.folder).join(', ')}`;
}

/**
 * The single source of Actors. Every consumer — the ACTORS view, the Actor
 * tools, the injection primitive, destination validation for heartbeat,
 * reminders and messages, and JarvisCoreApi.listActors() — reads this cache.
 * No other component enumerates Actor folders (SPEC_ACTOR_SCANNER).
 */
export class ActorScanner {
    private _actors: ActorEntry[] = [];
    private _timer: ReturnType<typeof setInterval> | undefined;
    private _rescanPromise: Promise<void> | undefined;

    constructor(
        private readonly _resolveRoot: () => string,
        private readonly _onDidChange: () => void,
    ) {}

    /** Sorted like the tree (localeCompare, base sensitivity). */
    get actors(): ActorEntry[] {
        return this._actors;
    }

    getActor(id: string): ActorEntry | undefined {
        return this._actors.find(a => a.id === id);
    }

    /**
     * The one place that turns a name into an Actor: `found` for exactly one
     * matching entry, `unknown` for none, `ambiguous` (with every match) for
     * several. Never picks one of several (REQ_ACTOR_SCHEMA AC-7).
     */
    resolveName(name: string): ActorLookup {
        const matches = this._actors.filter(a => a.name === name);
        if (matches.length === 0) { return { status: 'unknown' }; }
        if (matches.length > 1) { return { status: 'ambiguous', matches }; }
        return { status: 'found', actor: matches[0] };
    }

    /** A rescan already in flight is not started twice — returns the same promise. */
    rescan(): Promise<void> {
        if (this._rescanPromise) { return this._rescanPromise; }
        const promise = this._doRescan().finally(() => {
            if (this._rescanPromise === promise) { this._rescanPromise = undefined; }
        });
        this._rescanPromise = promise;
        return promise;
    }

    private async _doRescan(): Promise<void> {
        const actors = await this._scanRoot(this._resolveRoot());
        if (actorsEqual(actors, this._actors)) { return; }
        this._actors = actors;
        this._onDidChange();
    }

    private async _scanRoot(folder: string): Promise<ActorEntry[]> {
        if (!folder) { return []; }
        let entries: fs.Dirent[];
        try {
            entries = await fs.promises.readdir(folder, { withFileTypes: true });
        } catch {
            return [];
        }

        const actors: ActorEntry[] = [];
        for (const entry of entries) {
            if (!entry.isDirectory()) { continue; }
            const actorFolder = path.join(folder, entry.name);
            const actorFile = path.join(actorFolder, 'actor.yaml');
            if (await exists(actorFile)) {
                actors.push(await readActor(actorFile, actorFolder, entry.name));
            }
        }
        actors.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        return actors;
    }

    /** Owned periodic rescan — a plain setInterval, not a heartbeat job. */
    startTimer(minutes: number): void {
        this.stopTimer();
        if (minutes > 0) {
            this._timer = setInterval(() => { void this.rescan(); }, minutes * 60_000);
        }
    }

    stopTimer(): void {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = undefined;
        }
    }

    dispose(): void {
        this.stopTimer();
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
        const name = document?.['name'];
        const summary = document?.['summary'];
        // A legacy `agent` key, if present, is not read (REQ_ACTOR_SCHEMA AC-2).
        return {
            id: actorFile,
            name: typeof name === 'string' && name ? name : fallbackName,
            summary: typeof summary === 'string' ? summary : '',
            folder,
        };
    } catch {
        return { id: actorFile, name: fallbackName, summary: '', folder };
    }
}

function actorsEqual(a: ActorEntry[], b: ActorEntry[]): boolean {
    if (a.length !== b.length) { return false; }
    for (let i = 0; i < a.length; i++) {
        const x = a[i], y = b[i];
        if (x.id !== y.id || x.name !== y.name || x.summary !== y.summary || x.folder !== y.folder) {
            return false;
        }
    }
    return true;
}