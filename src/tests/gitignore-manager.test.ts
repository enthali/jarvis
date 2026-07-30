// SPEC_CFG_IGNOREMANAGER AC-2..AC-9, AC-11
// SPEC_CFG_PATHRESOLVER WORKSPACE_PATHS / getIgnoreEntries coverage invariant

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { locateRegion, detectEol, applyGitignoreAt } from '../../packages/core/src/engine/core/gitignoreManager';
import { WORKSPACE_PATHS, getIgnoreEntries } from '../../packages/core/src/engine/core/configPaths';

const BEGIN = '# BEGIN JARVIS MANAGED (see jarvis.gitignore.autoManage)';
const END = '# END JARVIS MANAGED';

// --- WORKSPACE_PATHS / getIgnoreEntries invariant (SPEC_CFG_PATHRESOLVER) ---

describe('SPEC_CFG_PATHRESOLVER: WORKSPACE_PATHS coverage invariant', () => {
    it('getIgnoreEntries returns exactly the transient entries', () => {
        const entries = getIgnoreEntries();
        const transient = WORKSPACE_PATHS.filter(p => p.durability === 'transient').map(p => p.rel);
        expect(entries).toEqual(transient);
    });

    it('no durable entry appears in getIgnoreEntries', () => {
        const entries = getIgnoreEntries();
        const durable = WORKSPACE_PATHS.filter(p => p.durability === 'durable').map(p => p.rel);
        for (const d of durable) {
            expect(entries).not.toContain(d);
        }
    });

    it('.jarvis/actors/ and .jarvis/sessions/ are durable (AC-11)', () => {
        const actors = WORKSPACE_PATHS.find(p => p.rel === '.jarvis/actors/');
        const sessions = WORKSPACE_PATHS.find(p => p.rel === '.jarvis/sessions/');
        expect(actors?.durability).toBe('durable');
        expect(sessions?.durability).toBe('durable');
    });

    it('every WORKSPACE_PATHS entry has a valid durability', () => {
        for (const p of WORKSPACE_PATHS) {
            expect(['transient', 'durable']).toContain(p.durability);
        }
    });
});

// --- locateRegion (SPEC_CFG_IGNOREMANAGER region parsing) ---

describe('SPEC_CFG_IGNOREMANAGER: locateRegion', () => {
    it('absent when no markers', () => {
        expect(locateRegion(['foo', 'bar'])).toEqual({ kind: 'absent' });
    });

    it('found with correct begin/end indices', () => {
        const lines = ['user line', BEGIN, '.jarvis/logs/', END, 'more user'];
        const r = locateRegion(lines);
        expect(r).toEqual({ kind: 'found', begin: 1, end: 3 });
    });

    it('malformed: duplicate begin markers', () => {
        const lines = [BEGIN, '.jarvis/logs/', BEGIN, END];
        const r = locateRegion(lines);
        expect(r.kind).toBe('malformed');
    });

    it('malformed: end before begin', () => {
        const lines = [END, BEGIN];
        const r = locateRegion(lines);
        expect(r.kind).toBe('malformed');
    });

    it('malformed: begin only, no end', () => {
        const lines = [BEGIN, '.jarvis/logs/'];
        const r = locateRegion(lines);
        expect(r.kind).toBe('malformed');
    });
});

// --- detectEol ---

describe('SPEC_CFG_IGNOREMANAGER: detectEol', () => {
    it('returns \\n for undefined (new file)', () => {
        expect(detectEol(undefined)).toBe('\n');
    });

    it('detects CRLF majority', () => {
        expect(detectEol('a\r\nb\r\nc\n')).toBe('\r\n');
    });

    it('detects LF majority', () => {
        expect(detectEol('a\nb\nc\r\n')).toBe('\n');
    });
});

// --- applyGitignoreAt: real function under test (SPEC_CFG_IGNOREMANAGER) ---

describe('SPEC_CFG_IGNOREMANAGER: applyGitignoreAt', () => {
    let tmpDir: string;

    beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-ignore-')); });
    afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

    function gi(): string { return path.join(tmpDir, '.gitignore'); }
    function read(): string { return fs.readFileSync(gi(), 'utf8'); }

    // AC-2: no .gitignore → creates one with region
    it('AC-2: creates .gitignore with markers and entries when none exists', () => {
        applyGitignoreAt(tmpDir, true);

        const content = read();
        expect(content).toContain(BEGIN);
        expect(content).toContain(END);
        for (const e of getIgnoreEntries()) {
            expect(content).toContain(e);
        }
    });

    // AC-3: existing .gitignore without region → appends
    it('AC-3: appends region to existing file, preserves user content', () => {
        fs.writeFileSync(gi(), 'node_modules/\n');

        applyGitignoreAt(tmpDir, true);

        const content = read();
        expect(content).toContain('node_modules/');
        expect(content).toContain(BEGIN);
        expect(content).toContain(END);
    });

    // AC-4: stale region → rewrites only between markers
    it('AC-4: rewrites stale region, preserves surrounding content', () => {
        fs.writeFileSync(gi(), 'user-before\n' + BEGIN + '\nold-entry\n' + END + '\nuser-after\n');

        applyGitignoreAt(tmpDir, true);

        const content = read();
        expect(content).toContain('user-before');
        expect(content).toContain('user-after');
        expect(content).not.toContain('old-entry');
        for (const e of getIgnoreEntries()) {
            expect(content).toContain(e);
        }
    });

    // AC-5: idempotency — no write when already current
    it('AC-5: does not rewrite when region already matches', () => {
        applyGitignoreAt(tmpDir, true);
        const mtime1 = fs.statSync(gi()).mtimeMs;

        // Small delay to ensure mtime would differ on rewrite
        const start = Date.now(); while (Date.now() - start < 50) { /* spin */ }

        applyGitignoreAt(tmpDir, true);
        const mtime2 = fs.statSync(gi()).mtimeMs;
        expect(mtime2).toBe(mtime1);
    });

    // AC-6: malformed markers → no write, file unchanged
    it('AC-6: malformed markers → leaves file untouched', () => {
        const malformed = BEGIN + '\nstuff\n' + BEGIN + '\n' + END + '\n';
        fs.writeFileSync(gi(), malformed);

        applyGitignoreAt(tmpDir, true);

        expect(read()).toBe(malformed);
    });

    // AC-7: managed=false removes region, file stays
    it('AC-7: opt-out removes region and markers, preserves rest', () => {
        fs.writeFileSync(gi(), 'keep-before\n' + BEGIN + '\n.jarvis/logs/\n' + END + '\nkeep-after\n');

        applyGitignoreAt(tmpDir, false);

        const content = read();
        expect(content).toContain('keep-before');
        expect(content).toContain('keep-after');
        expect(content).not.toContain(BEGIN);
        expect(content).not.toContain(END);
        expect(fs.existsSync(gi())).toBe(true);
    });

    // AC-7 supplement: opt-out with no region is a no-op
    it('AC-7: opt-out with no region leaves file unchanged', () => {
        fs.writeFileSync(gi(), 'user-content\n');

        applyGitignoreAt(tmpDir, false);

        expect(read()).toBe('user-content\n');
    });

    // AC-9: no .gitignore + managed=false → no file created
    it('AC-9: opt-out with no .gitignore does not create the file', () => {
        applyGitignoreAt(tmpDir, false);

        expect(fs.existsSync(gi())).toBe(false);
    });

    // EOL: majority EOL is used for the region; pure-EOL-only changes are suppressed
    it('EOL: CRLF file gets CRLF region', () => {
        fs.writeFileSync(gi(), 'a\r\nb\r\n');

        applyGitignoreAt(tmpDir, true);

        const content = read();
        expect(content).toContain('\r\n');
        expect(content).toContain(BEGIN);
    });

    it('EOL: content-changing write normalizes to majority EOL', () => {
        // A file with mixed endings gets its EOL normalized when applyGitignoreAt
        // writes a content change (region create/update). This is the narrowed
        // contract: mixed EOL is preserved only when no write occurs (AC-5
        // idempotency), not across content-changing writes.
        fs.writeFileSync(gi(), 'line-a\r\nline-b\n');

        applyGitignoreAt(tmpDir, true);

        const content = read();
        // Region was appended → content changed → majority EOL (LF) applied
        expect(content).toContain(BEGIN);
        // The CRLF in line-a is normalized to LF
        expect(content).not.toContain('\r\n');
    });
});
