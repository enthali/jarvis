// Implementation: SPEC_EXP_SCANNER
// Requirements: REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export class YamlScanner {
    private _projects: string[] = [];
    private _events: string[] = [];
    private _timer: NodeJS.Timeout | undefined;
    private _onCacheChanged: () => void;

    constructor(onCacheChanged: () => void) {
        this._onCacheChanged = onCacheChanged;
    }

    start(projectsFolder: string, eventsFolder: string, intervalSec: number): void {
        this.stop();
        const effectiveInterval = Math.max(20, intervalSec) * 1000;
        this._scan(projectsFolder, eventsFolder);
        this._timer = setInterval(() => this._scan(projectsFolder, eventsFolder), effectiveInterval);
    }

    stop(): void {
        if (this._timer !== undefined) {
            clearInterval(this._timer);
            this._timer = undefined;
        }
    }

    getProjects(): string[] {
        return this._projects;
    }

    getEvents(): string[] {
        return this._events;
    }

    private async _scan(projectsFolder: string, eventsFolder: string): Promise<void> {
        const newProjects = await this._readNames(projectsFolder);
        const newEvents = await this._readNames(eventsFolder);

        const changed =
            !this._arraysEqual(newProjects, this._projects) ||
            !this._arraysEqual(newEvents, this._events);

        if (changed) {
            this._projects = newProjects;
            this._events = newEvents;
            this._onCacheChanged();
        }
    }

    private async _readNames(folder: string): Promise<string[]> {
        if (!folder) {
            return [];
        }
        const names: string[] = [];
        await this._collectNames(folder, names);
        return names;
    }

    private async _collectNames(folder: string, names: string[]): Promise<void> {
        let entries: fs.Dirent[];
        try {
            entries = await fs.promises.readdir(folder, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            const fullPath = path.join(folder, entry.name);
            if (entry.isDirectory()) {
                await this._collectNames(fullPath, names);
            } else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
                try {
                    const content = await fs.promises.readFile(fullPath, 'utf8');
                    const doc = yaml.load(content) as Record<string, unknown>;
                    if (doc && typeof doc['name'] === 'string') {
                        names.push(doc['name']);
                    }
                } catch {
                    // skip unparseable files
                }
            }
        }
    }

    private _arraysEqual(a: string[], b: string[]): boolean {
        if (a.length !== b.length) {
            return false;
        }
        return a.every((v, i) => v === b[i]);
    }
}
