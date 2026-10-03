// Implementation: SPEC_REC_TRANSCRIPTFILE — transcript file of one recording
// Requirements: REQ_REC_TRANSCRIPTFILE

import * as fs from 'fs';
import * as path from 'path';
import { Emitter } from './emitter';

const MARK_INTERVAL_MS = 60000;
const MAX_SUFFIX = 99;

function two(n: number): string { return String(n).padStart(2, '0'); }

/** `YYYY-MM-DD_HHmmss` in local time. */
export function transcriptStamp(d: Date): string {
    return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}_${two(d.getHours())}${two(d.getMinutes())}${two(d.getSeconds())}`;
}

export class TranscriptFile {
    private readonly _error = new Emitter<string>();
    readonly onError = this._error.event;

    private chain: Promise<void> = Promise.resolve();
    private lastMarkAt: number | undefined;
    private wroteAny = false;
    private errored = false;

    private constructor(readonly path: string, private fd: number) {}

    /** Creates the folder and the file; a file that exists is never overwritten (SPEC_REC_TRANSCRIPTFILE AC-2). */
    static create(actorFolder: string, startedAt: Date): TranscriptFile {
        const dir = path.join(actorFolder, 'transcripts');
        fs.mkdirSync(dir, { recursive: true });
        const stamp = transcriptStamp(startedAt);
        for (let n = 1; n <= MAX_SUFFIX; n++) {
            const file = path.join(dir, n === 1 ? `${stamp}.txt` : `${stamp}-${n}.txt`);
            try {
                const fd = fs.openSync(file, 'wx');
                return new TranscriptFile(file, fd);
            } catch (err) {
                if ((err as NodeJS.ErrnoException).code !== 'EEXIST') { throw err; }
            }
        }
        throw new Error(`no free transcript file name for ${stamp}`);
    }

    /** Writes the delta (with a time mark when one is due) and returns exactly the text it wrote. */
    append(delta: string, at: Date): string {
        let text = '';
        const now = at.getTime();
        if (this.lastMarkAt === undefined || now - this.lastMarkAt >= MARK_INTERVAL_MS) {
            text += `${this.wroteAny ? '\n' : ''}[${two(at.getHours())}:${two(at.getMinutes())}]\n`;
            this.lastMarkAt = now;
        }
        text += delta;
        this.wroteAny = true;
        const data = Buffer.from(text, 'utf8');
        this.chain = this.chain.then(() => new Promise<void>(resolve => {
            if (this.errored || this.fd < 0) { resolve(); return; }
            fs.write(this.fd, data, 0, data.length, null, err => {
                if (err) { this.raise(err.message); }
                resolve();
            });
        }));
        return text;
    }

    /** Waits for pending writes, then closes the handle. */
    async close(): Promise<void> {
        await this.chain;
        this.closeFd();
    }

    /** Closes the handle and deletes the file (a failed start leaves none). */
    async discard(): Promise<void> {
        await this.chain;
        this.closeFd();
        try { fs.unlinkSync(this.path); } catch { /* already gone */ }
    }

    private closeFd(): void {
        if (this.fd >= 0) {
            try { fs.closeSync(this.fd); } catch { /* closed */ }
            this.fd = -1;
        }
    }

    private raise(message: string): void {
        if (this.errored) { return; }
        this.errored = true;
        this._error.fire(`transcript file could not be written: ${message}`);
    }
}
