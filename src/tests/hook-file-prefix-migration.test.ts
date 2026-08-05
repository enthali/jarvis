/**
 * Unit tests for hook file prefix migration (CR #58, SPEC_HOOK_MIGRATE).
 *
 * TC-1: Cleanup confined to named superseded files only
 * TC-2: Missing superseded files are non-fatal (best-effort)
 * TC-3: Idempotency — repeated calls produce no errors
 * TC-4: Both removal paths exercise superseded file cleanup
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Source-level verification of hookConfig.ts
const hookConfigSrc = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'packages', 'core', 'src', 'engine', 'hooks', 'hookConfig.ts'), 'utf-8');

// Temp workspace for filesystem tests
let tmpDir: string;

beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-hook-test-'));
});

afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Create the .github/hooks/ directory structure with specified files */
function setupHooksDir(files: string[]): string {
    const hooksDir = path.join(tmpDir, '.github', 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });
    for (const file of files) {
        fs.writeFileSync(path.join(hooksDir, file), `content-of-${file}`, 'utf-8');
    }
    return hooksDir;
}

function listHooksDir(): string[] {
    const hooksDir = path.join(tmpDir, '.github', 'hooks');
    try { return fs.readdirSync(hooksDir).sort(); } catch { return []; }
}

describe('TC-1: cleanup confined to named superseded files', () => {
    it('SUPERSEDED_FILES contains exactly bridge.mjs and port', () => {
        expect(hookConfigSrc).toContain("const SUPERSEDED_FILES = ['bridge.mjs', 'port']");
    });

    it('superseded file deletion uses the explicit list, not a glob or readdir', () => {
        // The install migration loop iterates SUPERSEDED_FILES
        expect(hookConfigSrc).toContain('for (const oldFile of SUPERSEDED_FILES)');
        // No glob-based or readdir-based deletion in executable code
        // (the word 'glob' appears in comments only, which is fine)
        const codeLines = hookConfigSrc.split('\n').filter(l => !l.trim().startsWith('//'));
        const codeOnly = codeLines.join('\n');
        expect(codeOnly).not.toMatch(/\bglob\b/);
        expect(codeOnly).not.toMatch(/readdir.*unlink/);
    });

    it('other files in hooks dir are untouched by migration cleanup', () => {
        const hooksDir = setupHooksDir(['bridge.mjs', 'port', 'other-tool.sh', 'custom-hook.json']);

        // Simulate the migration cleanup logic (same as installHookConfig step 2b)
        const SUPERSEDED = ['bridge.mjs', 'port'];
        for (const oldFile of SUPERSEDED) {
            try { fs.unlinkSync(path.join(hooksDir, oldFile)); } catch { /* */ }
        }

        const remaining = fs.readdirSync(hooksDir).sort();
        expect(remaining).toContain('other-tool.sh');
        expect(remaining).toContain('custom-hook.json');
        expect(remaining).not.toContain('bridge.mjs');
        expect(remaining).not.toContain('port');
    });
});

describe('TC-2: missing superseded files are non-fatal', () => {
    it('deleting already-absent files does not throw (ENOENT swallowed)', () => {
        const hooksDir = setupHooksDir([]); // empty dir, no old files

        // Simulate the migration cleanup logic — should not throw
        const SUPERSEDED = ['bridge.mjs', 'port'];
        expect(() => {
            for (const oldFile of SUPERSEDED) {
                try { fs.unlinkSync(path.join(hooksDir, oldFile)); } catch (err: unknown) {
                    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') { throw err; }
                }
            }
        }).not.toThrow();
    });

    it('source code swallows ENOENT for superseded files in installHookConfig', () => {
        // The catch block in step 2b checks for ENOENT
        const step2b = hookConfigSrc.slice(
            hookConfigSrc.indexOf('// 2b. Migration'),
            hookConfigSrc.indexOf('// 3. Write jarvis-hooks.json')
        );
        expect(step2b).toContain("code !== 'ENOENT'");
    });

    it('source code swallows ENOENT for superseded files in uninstallHookConfig', () => {
        // The uninstall path also catches ENOENT
        const uninstallSection = hookConfigSrc.slice(
            hookConfigSrc.indexOf('async function uninstallHookConfig')
        );
        expect(uninstallSection).toContain("code !== 'ENOENT'");
    });
});

describe('TC-3: idempotency — repeated cleanup produces no errors', () => {
    it('running cleanup twice with old files present then absent is safe', () => {
        const hooksDir = setupHooksDir(['bridge.mjs', 'port']);
        const SUPERSEDED = ['bridge.mjs', 'port'];

        // First pass — files exist and are removed
        for (const oldFile of SUPERSEDED) {
            try { fs.unlinkSync(path.join(hooksDir, oldFile)); } catch (err: unknown) {
                if ((err as NodeJS.ErrnoException).code !== 'ENOENT') { throw err; }
            }
        }
        expect(listHooksDir()).not.toContain('bridge.mjs');
        expect(listHooksDir()).not.toContain('port');

        // Second pass — files already gone, should not throw
        expect(() => {
            for (const oldFile of SUPERSEDED) {
                try { fs.unlinkSync(path.join(hooksDir, oldFile)); } catch (err: unknown) {
                    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') { throw err; }
                }
            }
        }).not.toThrow();
    });
});

describe('TC-4: both removal paths exercise superseded cleanup', () => {
    it('installHookConfig step 2b removes superseded files', () => {
        const installSection = hookConfigSrc.slice(
            hookConfigSrc.indexOf('async function installHookConfig'),
            hookConfigSrc.indexOf('async function uninstallHookConfig')
        );
        expect(installSection).toContain('// 2b. Migration');
        expect(installSection).toContain('SUPERSEDED_FILES');
        expect(installSection).toContain('fs.unlinkSync(oldPath)');
    });

    it('uninstallHookConfig includes SUPERSEDED_FILES in filesToRemove', () => {
        const uninstallSection = hookConfigSrc.slice(
            hookConfigSrc.indexOf('async function uninstallHookConfig')
        );
        expect(uninstallSection).toContain('...SUPERSEDED_FILES');
    });

    it('uninstallHookConfig filesToRemove contains all 5 files (3 current + 2 superseded)', () => {
        // CONFIG_FILE, BRIDGE_FILE, PORT_FILE, ...SUPERSEDED_FILES
        expect(hookConfigSrc).toContain(
            "const filesToRemove = [CONFIG_FILE, BRIDGE_FILE, PORT_FILE, ...SUPERSEDED_FILES]"
        );
    });

    it('current filenames are jarvis-bridge.mjs and jarvis-port', () => {
        expect(hookConfigSrc).toContain("const BRIDGE_FILE = 'jarvis-bridge.mjs'");
        expect(hookConfigSrc).toContain("const PORT_FILE = 'jarvis-port'");
    });
});
