/**
 * SPEC_REC_COMPONENTS: allow list, extraction guard, integrity check, marker.
 */
import { afterEach, describe, expect, it } from 'vitest';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as zlib from 'zlib';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import {
    ComponentManifest, RequestFn, download, ensureComponents, extractTgz, extractZip,
    isAllowedUrl, isComplete, manifestHash, mapEntry, resolveInside,
} from '../../packages/recorder/src/components';

const dirs: string[] = [];
function tmp(): string {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-comp-'));
    dirs.push(d);
    return d;
}
afterEach(() => { for (const d of dirs.splice(0)) { fs.rmSync(d, { recursive: true, force: true }); } });

function tarHeader(name: string, size: number, type = '0'): Buffer {
    const h = Buffer.alloc(512);
    h.write(name, 0, 'utf8');
    h.write('0000644\0', 100);
    h.write(size.toString(8).padStart(11, '0') + '\0', 124);
    h.write(type, 156);
    return h;
}
function makeTgz(files: Record<string, string>): Buffer {
    const parts: Buffer[] = [];
    for (const [name, body] of Object.entries(files)) {
        const data = Buffer.from(body);
        parts.push(tarHeader(name, data.length), data, Buffer.alloc((512 - (data.length % 512)) % 512));
    }
    parts.push(Buffer.alloc(1024));
    return zlib.gzipSync(Buffer.concat(parts));
}

function crc32(buf: Buffer): number {
    let c, crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        c = (crc ^ buf[i]) & 0xff;
        for (let k = 0; k < 8; k++) { c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; }
        crc = (crc >>> 8) ^ c;
    }
    return (crc ^ 0xffffffff) >>> 0;
}
function makeZip(files: Record<string, string>, deflate = true): Buffer {
    const locals: Buffer[] = [];
    const central: Buffer[] = [];
    let offset = 0;
    for (const [name, body] of Object.entries(files)) {
        const raw = Buffer.from(body);
        const data = deflate ? zlib.deflateRawSync(raw) : raw;
        const nameBuf = Buffer.from(name);
        const l = Buffer.alloc(30);
        l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(deflate ? 8 : 0, 8);
        l.writeUInt32LE(crc32(raw), 14); l.writeUInt32LE(data.length, 18); l.writeUInt32LE(raw.length, 22);
        l.writeUInt16LE(nameBuf.length, 26);
        const c = Buffer.alloc(46);
        c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(deflate ? 8 : 0, 10);
        c.writeUInt32LE(crc32(raw), 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(raw.length, 24);
        c.writeUInt16LE(nameBuf.length, 28); c.writeUInt32LE(offset, 42);
        locals.push(l, nameBuf, data);
        central.push(c, nameBuf);
        offset += 30 + nameBuf.length + data.length;
    }
    const dir = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10);
    end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, dir, end]);
}

describe('SPEC_REC_COMPONENTS AC-1: allow list', () => {
    it('accepts https from registry.npmjs.org and *.nuget.org only', () => {
        expect(isAllowedUrl(new URL('https://registry.npmjs.org/x.tgz'))).toBe(true);
        expect(isAllowedUrl(new URL('https://api.nuget.org/v3/x.nupkg'))).toBe(true);
        expect(isAllowedUrl(new URL('https://globalcdn.nuget.org/x'))).toBe(true);
        expect(isAllowedUrl(new URL('http://registry.npmjs.org/x'))).toBe(false);
        expect(isAllowedUrl(new URL('https://evilnuget.org/x'))).toBe(false);
        expect(isAllowedUrl(new URL('https://registry.npmjs.org.evil.com/x'))).toBe(false);
        expect(isAllowedUrl(new URL('https://example.com/x'))).toBe(false);
    });

    it('refuses a redirect to a host that is not allowed', async () => {
        const request: RequestFn = (url, onResponse) => {
            const res = new PassThrough() as unknown as import('http').IncomingMessage;
            Object.assign(res, { statusCode: 302, headers: { location: 'https://evil.example.com/x' } });
            onResponse(res);
        };
        await expect(download('https://registry.npmjs.org/a', path.join(tmp(), 'f'), undefined, request)).rejects.toThrow(/not allowed/);
    });

    it('stops after five redirects', async () => {
        const request: RequestFn = (url, onResponse) => {
            const res = new PassThrough() as unknown as import('http').IncomingMessage;
            Object.assign(res, { statusCode: 302, headers: { location: 'https://registry.npmjs.org/again' } });
            onResponse(res);
        };
        await expect(download('https://registry.npmjs.org/a', path.join(tmp(), 'f'), undefined, request)).rejects.toThrow(/redirects/);
    });
});

describe('SPEC_REC_COMPONENTS AC-2: extraction never leaves the target', () => {
    it('resolveInside rejects traversal and absolute paths', () => {
        const t = tmp();
        expect(() => resolveInside(t, '../x')).toThrow();
        expect(() => resolveInside(t, 'a/../../x')).toThrow();
        expect(() => resolveInside(t, 'C:\\evil')).toThrow();
        expect(() => resolveInside(t, '/etc/passwd')).toThrow();
        expect(resolveInside(t, 'a/b.txt').startsWith(path.resolve(t))).toBe(true);
    });

    it('mapEntry maps prefix, single-level and exact rules', () => {
        const rules = [
            { from: 'package/dist/**', to: 'dist/' },
            { from: 'package/package.json', to: 'package.json' },
            { from: 'package/prebuilds/win32-x64/*', to: 'prebuilds/win32-x64/' },
        ];
        expect(mapEntry('package/dist/a/b.js', rules)).toBe('dist/a/b.js');
        expect(mapEntry('package/package.json', rules)).toBe('package.json');
        expect(mapEntry('package/prebuilds/win32-x64/x.dll', rules)).toBe('prebuilds/win32-x64/x.dll');
        expect(mapEntry('package/prebuilds/win32-x64/sub/x.dll', rules)).toBeUndefined();
        expect(mapEntry('package/README.md', rules)).toBeUndefined();
    });

    it('extractTgz writes mapped files and rejects an entry that escapes', () => {
        const t = tmp();
        const ok = path.join(t, 'ok.tgz');
        fs.writeFileSync(ok, makeTgz({ 'package/dist/a.js': 'A', 'package/other.txt': 'no' }));
        const target = path.join(t, 'out');
        expect(extractTgz(ok, [{ from: 'package/dist/**', to: 'dist/' }], target)).toBe(1);
        expect(fs.readFileSync(path.join(target, 'dist', 'a.js'), 'utf8')).toBe('A');

        const evil = path.join(t, 'evil.tgz');
        fs.writeFileSync(evil, makeTgz({ 'package/dist/../../../escape.js': 'X' }));
        expect(() => extractTgz(evil, [{ from: 'package/dist/**', to: 'dist/' }], target)).toThrow();
        expect(fs.existsSync(path.join(t, 'escape.js'))).toBe(false);
    });

    it('extractZip reads deflated and stored entries and rejects an entry that escapes', () => {
        const t = tmp();
        const zip = path.join(t, 'a.zip');
        fs.writeFileSync(zip, makeZip({ 'runtimes/win-x64/native/a.dll': 'DLL-A', 'runtimes/other.txt': 'no' }));
        const target = path.join(t, 'out');
        expect(extractZip(zip, [{ from: 'runtimes/win-x64/native/a.dll', to: 'prebuilds/a.dll' }], target)).toBe(1);
        expect(fs.readFileSync(path.join(target, 'prebuilds', 'a.dll'), 'utf8')).toBe('DLL-A');

        const stored = path.join(t, 's.zip');
        fs.writeFileSync(stored, makeZip({ 'p/x.bin': 'STORED' }, false));
        expect(extractZip(stored, [{ from: 'p/**', to: 'd/' }], target)).toBe(1);
        expect(fs.readFileSync(path.join(target, 'd', 'x.bin'), 'utf8')).toBe('STORED');

        const evil = path.join(t, 'evil.zip');
        fs.writeFileSync(evil, makeZip({ 'p/../../escape.bin': 'X' }));
        expect(() => extractZip(evil, [{ from: 'p/**', to: 'd/' }], target)).toThrow();
    });
});

function fakeRequest(bodies: Record<string, Buffer>): RequestFn {
    return (url, onResponse) => {
        const body = bodies[url.pathname];
        const res = new PassThrough() as unknown as import('http').IncomingMessage;
        Object.assign(res, { statusCode: body ? 200 : 404, headers: {} });
        onResponse(res);
        (res as unknown as PassThrough).end(body ?? Buffer.alloc(0));
    };
}
function sha512(b: Buffer): string { return crypto.createHash('sha512').update(b).digest('base64'); }

describe('SPEC_REC_COMPONENTS ensure(): integrity, marker', () => {
    const tgz = makeTgz({ 'package/dist/index.js': 'js', 'package/package.json': '{}' });
    const manifest = (hash: string): ComponentManifest => ({
        sdkVersion: '1.0.0',
        downloads: [{
            id: 'sdk', version: '1.0.0', url: 'https://registry.npmjs.org/sdk.tgz', sha512: hash, bytes: tgz.length,
            extract: [{ from: 'package/dist/**', to: 'dist/' }, { from: 'package/package.json', to: 'package.json' }],
        }],
    });

    it('AC-1: a hash mismatch fails, extracts nothing and leaves no marker', async () => {
        const target = tmp();
        await expect(ensureComponents({ manifest: manifest(sha512(Buffer.from('other'))), targetDir: target, request: fakeRequest({ '/sdk.tgz': tgz }) }))
            .rejects.toThrow(/Integrity/);
        expect(fs.existsSync(path.join(target, 'dist'))).toBe(false);
        expect(isComplete(manifest('x'), target)).toBe(false);
        expect(fs.existsSync(path.join(target, '.download'))).toBe(false);
    });

    it('AC-3: a verified download is extracted, marked complete, and a second ensure downloads nothing', async () => {
        const target = tmp();
        const m = manifest(sha512(tgz));
        const progress: number[] = [];
        await ensureComponents({ manifest: m, targetDir: target, request: fakeRequest({ '/sdk.tgz': tgz }), onProgress: d => progress.push(d) });
        expect(fs.readFileSync(path.join(target, 'dist', 'index.js'), 'utf8')).toBe('js');
        expect(isComplete(m, target)).toBe(true);
        expect(progress.length).toBeGreaterThan(0);

        let calls = 0;
        await ensureComponents({ manifest: m, targetDir: target, request: () => { calls++; } });
        expect(calls).toBe(0);
    });

    it('a changed manifest invalidates the marker', async () => {
        const target = tmp();
        const m = manifest(sha512(tgz));
        await ensureComponents({ manifest: m, targetDir: target, request: fakeRequest({ '/sdk.tgz': tgz }) });
        expect(isComplete({ ...m, sdkVersion: '2.0.0' }, target)).toBe(false);
        expect(manifestHash(m)).not.toBe(manifestHash({ ...m, sdkVersion: '2.0.0' }));
    });
});

describe('components.json (pinned manifest)', () => {
    const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../packages/recorder/resources/components.json'), 'utf8')) as ComponentManifest;
    it('pins SDK 2.1.0 and every download over an allowed host with a SHA-512', () => {
        expect(manifest.sdkVersion).toBe('2.1.0');
        expect(manifest.downloads).toHaveLength(3);
        for (const d of manifest.downloads) {
            expect(isAllowedUrl(new URL(d.url))).toBe(true);
            expect(Buffer.from(d.sha512, 'base64')).toHaveLength(64);
            expect(d.extract.length).toBeGreaterThan(0);
        }
    });
    it('puts both native libraries next to foundry_local.dll', () => {
        const targets = manifest.downloads.flatMap(d => d.extract.map(e => e.to));
        expect(targets).toContain('prebuilds/win32-x64/onnxruntime.dll');
        expect(targets).toContain('prebuilds/win32-x64/onnxruntime-genai.dll');
        expect(targets).toContain('package.json');
    });
});

void EventEmitter;
