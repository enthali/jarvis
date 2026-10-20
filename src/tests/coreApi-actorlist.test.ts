/**
 * JarvisCoreApi.listActors() is a read-only view of the scanner cache.
 * REQ_ENG_ACTORLIST AC-3 (no filesystem scan of its own), SPEC_ENG_ACTORLIST AC-2 (no file-system access),
 * AC-3 ([] when no Actor exists or the actors folder is not resolvable).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { JarvisEngine } from '../../packages/core/src/engine/core/coreApi';
import { ActorScanner } from '../../packages/core/src/engine/actors/actorScanner';

vi.mock('fs', async () => {
    const actual = await vi.importActual<typeof import('fs')>('fs');
    const wrap = <K extends keyof typeof actual>(name: K) => vi.fn(actual[name] as never);
    return {
        ...actual,
        readFileSync: wrap('readFileSync'), readdirSync: wrap('readdirSync'), existsSync: wrap('existsSync'),
        statSync: wrap('statSync'), lstatSync: wrap('lstatSync'), accessSync: wrap('accessSync'),
        opendirSync: wrap('opendirSync'), openSync: wrap('openSync'),
    };
});

const roots: string[] = [];
afterEach(() => {
    vi.restoreAllMocks();
    for (const r of roots.splice(0)) { fs.rmSync(r, { recursive: true, force: true }); }
});

const SYNC_CALLS = ['readFileSync', 'readdirSync', 'existsSync', 'statSync', 'lstatSync', 'accessSync', 'opendirSync', 'openSync'] as const;
const ASYNC_CALLS = ['readdir', 'readFile', 'stat', 'lstat', 'access', 'opendir', 'open'] as const;

function fsCallCount(): number {
    let n = 0;
    for (const name of SYNC_CALLS) { n += (fs[name] as unknown as { mock: { calls: unknown[] } }).mock.calls.length; }
    return n;
}

function cache(scanner: ActorScanner, actors: { name: string; summary: string; folder: string; id: string }[]): void {
    // @ts-expect-error — set the private cache directly, as the other coreApi tests do
    scanner['_actors'] = actors;
}

describe('SPEC_ENG_ACTORLIST AC-3 / REQ_ENG_ACTORLIST: [] when no Actor exists or the folder is not resolvable', () => {
    it('a scanner with an empty cache returns []', () => {
        const engine = new JarvisEngine(new ActorScanner(() => '/anywhere', () => {}));
        expect(engine.listActors()).toEqual([]);
    });

    it('an actors folder that cannot be resolved (empty path) returns [] also after a scan', async () => {
        const scanner = new ActorScanner(() => '', () => {});
        const engine = new JarvisEngine(scanner);
        await scanner.rescan();
        expect(engine.listActors()).toEqual([]);
    });

    it('an actors folder that does not exist returns [] after a scan', async () => {
        const missing = path.join(os.tmpdir(), 'jarvis-no-such-actors-folder-' + Date.now());
        const scanner = new ActorScanner(() => missing, () => {});
        const engine = new JarvisEngine(scanner);
        await scanner.rescan();
        expect(engine.listActors()).toEqual([]);
    });

    it('a folder without any Actor returns []', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-empty-actors-'));
        roots.push(root);
        fs.mkdirSync(path.join(root, 'not-an-actor'));
        const scanner = new ActorScanner(() => root, () => {});
        const engine = new JarvisEngine(scanner);
        await scanner.rescan();
        expect(engine.listActors()).toEqual([]);
    });
});

describe('REQ_ENG_ACTORLIST AC-3 / SPEC_ENG_ACTORLIST AC-2: listActors never scans and touches no file system', () => {
    let scanner: ActorScanner;
    let engine: JarvisEngine;

    beforeEach(() => {
        // a folder that would yield an Actor if it were scanned: the result must come from the cache only
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-listactors-'));
        roots.push(root);
        fs.mkdirSync(path.join(root, 'OnDisk'));
        fs.writeFileSync(path.join(root, 'OnDisk', 'actor.yaml'), 'name: "OnDisk"\nsummary: ""\nagent: ""\n');
        scanner = new ActorScanner(() => root, () => {});
        engine = new JarvisEngine(scanner);
        cache(scanner, [{ name: 'Cached', summary: 's', folder: '/cached', id: '/cached/actor.yaml' }]);
    });

    it('does not call ActorScanner.rescan', () => {
        const rescan = vi.spyOn(scanner, 'rescan');
        engine.listActors();
        engine.listActors();
        expect(rescan).not.toHaveBeenCalled();
    });

    it('does not reach the scanner internals that read the disk (_doRescan, _scanRoot)', () => {
        const doRescan = vi.spyOn(scanner as unknown as { _doRescan: () => Promise<void> }, '_doRescan');
        const scanRoot = vi.spyOn(scanner as unknown as { _scanRoot: (f: string) => Promise<unknown[]> }, '_scanRoot');
        engine.listActors();
        expect(doRescan).not.toHaveBeenCalled();
        expect(scanRoot).not.toHaveBeenCalled();
    });

    it('performs no file-system access: no sync and no promise-API call', () => {
        const asyncSpies = ASYNC_CALLS.map(name => vi.spyOn(fs.promises, name as never));
        for (const name of SYNC_CALLS) { (fs[name] as unknown as { mockClear: () => void }).mockClear(); }

        const result = engine.listActors();

        expect(fsCallCount()).toBe(0);
        for (const spy of asyncSpies) { expect(spy).not.toHaveBeenCalled(); }
        expect(result).toEqual([{ name: 'Cached', summary: 's', agent: 'Cached', folder: '/cached', id: '/cached/actor.yaml' }]);
    });

    it('returns the cache, not the disk: the Actor on disk does not appear until a scan has run', async () => {
        expect(engine.listActors().map(a => a.name)).toEqual(['Cached']);
        await scanner.rescan();
        expect(engine.listActors().map(a => a.name)).toEqual(['OnDisk']);
    });

    it('the spies are live: a rescan does touch the file system (the check above can fail)', async () => {
        const readdir = vi.spyOn(fs.promises, 'readdir');
        await scanner.rescan();
        expect(readdir).toHaveBeenCalled();
    });
});
