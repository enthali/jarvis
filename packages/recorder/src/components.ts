// Implementation: SPEC_REC_COMPONENTS — pinned download, integrity check and guarded extraction
// Requirements: REQ_REC_SPEECH, REQ_REC_FAILURE
//
// Pure Node module (no vscode import) so the guards are unit-testable. The progress
// notification and the model location live in extension-side code that calls ensureComponents().

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import * as zlib from 'zlib';

export interface ExtractRule { from: string; to: string }

export interface ComponentEntry {
    id: string;
    version: string;
    url: string;
    /** Base64 SHA-512 as published by the registry (npm integrity, NuGet packageHash). */
    sha512: string;
    bytes: number;
    extract: ExtractRule[];
}

export interface ComponentManifest {
    sdkVersion: string;
    downloads: ComponentEntry[];
}

export type RequestFn = (url: URL, onResponse: (res: import('http').IncomingMessage) => void, onError: (err: Error) => void) => void;

export const MAX_REDIRECTS = 5;

export function manifestHash(manifest: ComponentManifest): string {
    return crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
}

/** REQ_REC_SPEECH / SPEC_REC_COMPONENTS AC-1: https only, registry.npmjs.org and *.nuget.org only. */
export function isAllowedUrl(url: URL): boolean {
    if (url.protocol !== 'https:') { return false; }
    const host = url.hostname.toLowerCase();
    return host === 'registry.npmjs.org' || host === 'nuget.org' || host.endsWith('.nuget.org');
}

/** SPEC_REC_COMPONENTS AC-2: resolve a relative path against the target and refuse anything outside it. */
export function resolveInside(targetDir: string, relative: string): string {
    if (path.isAbsolute(relative) || /^[a-zA-Z]:/.test(relative)) {
        throw new Error(`Refusing absolute path in archive: ${relative}`);
    }
    const root = path.resolve(targetDir);
    const full = path.resolve(root, relative);
    if (full !== root && !full.startsWith(root + path.sep)) {
        throw new Error(`Refusing path outside the target directory: ${relative}`);
    }
    return full;
}

const defaultRequest: RequestFn = (url, onResponse, onError) => {
    https.get(url, { headers: { 'User-Agent': 'jarvis-recorder' } }, onResponse).on('error', onError);
};

/** Download to a file, following at most MAX_REDIRECTS redirects, every hop checked against the allow list. */
export function download(
    startUrl: string,
    destFile: string,
    onBytes?: (n: number) => void,
    request: RequestFn = defaultRequest,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const visit = (urlText: string, redirects: number): void => {
            let url: URL;
            try { url = new URL(urlText); } catch { reject(new Error(`Invalid URL: ${urlText}`)); return; }
            if (!isAllowedUrl(url)) { reject(new Error(`Download host not allowed: ${url.protocol}//${url.hostname}`)); return; }
            request(url, res => {
                const status = res.statusCode ?? 0;
                if (status >= 300 && status < 400 && res.headers.location) {
                    res.resume();
                    if (redirects >= MAX_REDIRECTS) { reject(new Error('Too many redirects')); return; }
                    visit(new URL(res.headers.location, url).toString(), redirects + 1);
                    return;
                }
                if (status !== 200) { res.resume(); reject(new Error(`Download failed: HTTP ${status} for ${url.hostname}`)); return; }
                const out = fs.createWriteStream(destFile);
                res.on('data', (chunk: Buffer) => onBytes?.(chunk.length));
                res.on('error', err => { out.destroy(); reject(err); });
                out.on('error', reject);
                out.on('finish', () => resolve());
                res.pipe(out);
            }, reject);
        };
        visit(startUrl, 0);
    });
}

export function sha512Base64(file: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha512');
        fs.createReadStream(file)
            .on('data', d => hash.update(d))
            .on('error', reject)
            .on('end', () => resolve(hash.digest('base64')));
    });
}

/** Map an archive entry to its target-relative path, or undefined when no rule matches. */
export function mapEntry(entryName: string, rules: ExtractRule[]): string | undefined {
    for (const rule of rules) {
        if (rule.from.endsWith('/**')) {
            const base = rule.from.slice(0, -2);
            if (entryName.startsWith(base) && entryName.length > base.length) {
                return rule.to + entryName.slice(base.length);
            }
        } else if (rule.from.endsWith('/*')) {
            const base = rule.from.slice(0, -1);
            const rest = entryName.slice(base.length);
            if (entryName.startsWith(base) && rest.length > 0 && !rest.includes('/')) {
                return rule.to + rest;
            }
        } else if (entryName === rule.from) {
            return rule.to;
        }
    }
    return undefined;
}

function writeGuarded(targetDir: string, relative: string, data: Buffer): void {
    const full = resolveInside(targetDir, relative);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, data);
}

/** Minimal tar reader over a gunzipped buffer: regular files only. */
export function extractTgz(file: string, rules: ExtractRule[], targetDir: string): number {
    const tar = zlib.gunzipSync(fs.readFileSync(file));
    let offset = 0;
    let written = 0;
    let longName: string | undefined;
    while (offset + 512 <= tar.length) {
        const header = tar.subarray(offset, offset + 512);
        if (header.every(b => b === 0)) { break; }
        let name = header.toString('utf8', 0, 100).replace(/\0.*$/, '');
        const prefix = header.toString('utf8', 345, 500).replace(/\0.*$/, '');
        if (prefix) { name = `${prefix}/${name}`; }
        const size = parseInt(header.toString('ascii', 124, 136).replace(/\0.*$/, '').trim() || '0', 8);
        const type = String.fromCharCode(header[156] || 48);
        const dataStart = offset + 512;
        if (type === 'L') {
            longName = tar.toString('utf8', dataStart, dataStart + size).replace(/\0.*$/, '');
        } else if (type === '0') {
            const entryName = longName ?? name;
            longName = undefined;
            const rel = mapEntry(entryName, rules);
            if (rel !== undefined) {
                writeGuarded(targetDir, rel, Buffer.from(tar.subarray(dataStart, dataStart + size)));
                written++;
            }
        } else {
            longName = undefined;
        }
        offset = dataStart + Math.ceil(size / 512) * 512;
    }
    return written;
}

/** Minimal zip reader via the central directory (no Zip64): stored and deflated entries. */
export function extractZip(file: string, rules: ExtractRule[], targetDir: string): number {
    const fd = fs.openSync(file, 'r');
    try {
        const size = fs.fstatSync(fd).size;
        const tailLen = Math.min(size, 65557);
        const tail = Buffer.alloc(tailLen);
        fs.readSync(fd, tail, 0, tailLen, size - tailLen);
        let eocd = -1;
        for (let i = tailLen - 22; i >= 0; i--) {
            if (tail.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
        }
        if (eocd < 0) { throw new Error('Not a zip file (no end-of-directory record)'); }
        const entries = tail.readUInt16LE(eocd + 10);
        const dirSize = tail.readUInt32LE(eocd + 12);
        const dirOffset = tail.readUInt32LE(eocd + 16);
        if (dirOffset === 0xffffffff || dirSize === 0xffffffff || entries === 0xffff) { throw new Error('Zip64 archives are not supported'); }
        const dir = Buffer.alloc(dirSize);
        fs.readSync(fd, dir, 0, dirSize, dirOffset);

        let written = 0;
        let p = 0;
        for (let n = 0; n < entries; n++) {
            if (dir.readUInt32LE(p) !== 0x02014b50) { throw new Error('Corrupt zip directory'); }
            const method = dir.readUInt16LE(p + 10);
            const compSize = dir.readUInt32LE(p + 20);
            const nameLen = dir.readUInt16LE(p + 28);
            const extraLen = dir.readUInt16LE(p + 30);
            const commentLen = dir.readUInt16LE(p + 32);
            const localOffset = dir.readUInt32LE(p + 42);
            const name = dir.toString('utf8', p + 46, p + 46 + nameLen);
            p += 46 + nameLen + extraLen + commentLen;

            const rel = name.endsWith('/') ? undefined : mapEntry(name, rules);
            if (rel === undefined) { continue; }
            const local = Buffer.alloc(30);
            fs.readSync(fd, local, 0, 30, localOffset);
            if (local.readUInt32LE(0) !== 0x04034b50) { throw new Error('Corrupt zip entry header'); }
            const dataStart = localOffset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28);
            const comp = Buffer.alloc(compSize);
            fs.readSync(fd, comp, 0, compSize, dataStart);
            let data: Buffer;
            if (method === 0) { data = comp; }
            else if (method === 8) { data = zlib.inflateRawSync(comp); }
            else { throw new Error(`Unsupported zip compression method ${method}`); }
            writeGuarded(targetDir, rel, data);
            written++;
        }
        return written;
    } finally {
        fs.closeSync(fd);
    }
}

export interface EnsureOptions {
    manifest: ComponentManifest;
    targetDir: string;
    /** Bytes received so far and total expected, over all downloads. */
    onProgress?: (doneBytes: number, totalBytes: number) => void;
    request?: RequestFn;
}

const MARKER = '.complete';

export function isComplete(manifest: ComponentManifest, targetDir: string): boolean {
    try {
        return fs.readFileSync(path.join(targetDir, MARKER), 'utf8').trim() === manifestHash(manifest);
    } catch {
        return false;
    }
}

/** SPEC_REC_COMPONENTS ensure(): marker check, then download, verify, extract, mark. */
export async function ensureComponents(opts: EnsureOptions): Promise<void> {
    const { manifest, targetDir } = opts;
    if (isComplete(manifest, targetDir)) { return; }

    const tmpDir = path.join(targetDir, '.download');
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });
    const total = manifest.downloads.reduce((s, d) => s + d.bytes, 0);
    let done = 0;
    try {
        for (const entry of manifest.downloads) {
            const tmp = path.join(tmpDir, `${entry.id}-${entry.version}.pkg`);
            await download(entry.url, tmp, n => { done += n; opts.onProgress?.(done, total); }, opts.request);
            const actual = await sha512Base64(tmp);
            if (actual !== entry.sha512) {
                fs.rmSync(tmp, { force: true });
                throw new Error(`Integrity check failed for ${entry.id} ${entry.version}`);
            }
            const written = entry.url.endsWith('.tgz') ? extractTgz(tmp, entry.extract, targetDir) : extractZip(tmp, entry.extract, targetDir);
            if (written === 0) { throw new Error(`Nothing extracted from ${entry.id} ${entry.version}`); }
        }
        fs.writeFileSync(path.join(targetDir, MARKER), manifestHash(manifest));
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
}
