// Implementation: SPEC_SPL_STARTUP, SPEC_SPL_STATE
// Requirements: REQ_SPL_STARTUP_CHECK, REQ_SPL_STATE

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseFrontmatterVersion } from '../../packages/syspilot/src/versionCheck';
import { readState, writeState } from '../../packages/syspilot/src/state';

describe('SPEC_SPL_STARTUP: parseFrontmatterVersion', () => {
    it('extracts a plain version value from Frontmatter', () => {
        const content = '---\nname: syspilot.setup\nversion: 1.2.0\n---\n\nbody';
        expect(parseFrontmatterVersion(content)).toBe('1.2.0');
    });

    it('extracts a double-quoted version value', () => {
        const content = '---\nversion: "1.3.0"\n---\nbody';
        expect(parseFrontmatterVersion(content)).toBe('1.3.0');
    });

    it('extracts a single-quoted version value', () => {
        const content = "---\nversion: '1.4.0'\n---\nbody";
        expect(parseFrontmatterVersion(content)).toBe('1.4.0');
    });

    it('returns undefined when there is no Frontmatter block', () => {
        expect(parseFrontmatterVersion('no frontmatter here')).toBeUndefined();
    });

    it('returns undefined when the Frontmatter has no version key', () => {
        const content = '---\nname: syspilot.setup\n---\nbody';
        expect(parseFrontmatterVersion(content)).toBeUndefined();
    });
});

describe('SPEC_SPL_STATE: readState / writeState', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-syspilot-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('AC-2: returns empty state when the file does not exist', () => {
        expect(readState(tmpDir)).toEqual({});
    });

    it('AC-2: returns empty state when the file is malformed JSON', () => {
        const p = path.join(tmpDir, '.jarvis', 'syspilot-state.json');
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, '{not valid json');
        expect(readState(tmpDir)).toEqual({});
    });

    it('AC-1: writes to <workspaceRoot>/.jarvis/syspilot-state.json, creating the dir', () => {
        writeState(tmpDir, { suspendedUntil: '2026-08-01T00:00:00.000Z' });
        const p = path.join(tmpDir, '.jarvis', 'syspilot-state.json');
        expect(fs.existsSync(p)).toBe(true);
        expect(JSON.parse(fs.readFileSync(p, 'utf-8'))).toEqual({ suspendedUntil: '2026-08-01T00:00:00.000Z' });
    });

    it('round-trips all three optional fields', () => {
        const state = { suspendedUntil: '2026-08-01T00:00:00.000Z', skippedVersion: '1.2.0', lastSeenUpstreamVersion: '1.3.0' };
        writeState(tmpDir, state);
        expect(readState(tmpDir)).toEqual(state);
    });
});
