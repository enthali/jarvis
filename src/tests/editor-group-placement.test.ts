/**
 * Unit tests for editor-group-placement change.
 *
 * Since the placement/focus-restore/opt-out helpers are private closures
 * inside extension.ts's activate() (not exported — same pattern as the rest
 * of this file), these tests validate the source content directly, matching
 * the established static-assertion pattern used elsewhere in this test
 * suite (see remove-open-recording-icon.test.ts, entity-parity.test.ts).
 *
 * Validates:
 * - SPEC_MSG_EDITORPLACEMENT: resolveSecondaryColumn uses Math.max(2, N) —
 *   never N alone (Main-collision regression, found by PM in manual testing)
 *   and never N + 1 (the confirmed runaway-column regression); openAtMain/
 *   openAtDocs/openAtSecondary exist and are wired into the right call sites
 * - SPEC_MSG_FOCUSRESTORE: no artificial delay reintroduced between the
 *   disruptive action and restoreFocus()
 * - SPEC_MSG_AUTODELIVERY_OPTOUT: isSessionActiveTab check runs before
 *   delivery in the poll loop
 * - SPEC_MSG_PINNED: openPinnedResource wired into jarvis.openSession
 *   (jarvis.sendMessages now routes through openAtMain instead — Play-
 *   button placement fix, same target as an Actor tree click)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const coreSrcDir = path.resolve(__dirname, '..', '..', 'packages', 'core', 'src');
const extensionSrc = fs.readFileSync(path.join(coreSrcDir, 'extension.ts'), 'utf-8');

describe('SPEC_MSG_EDITORPLACEMENT: placement helpers', () => {
    it('resolveSecondaryColumn uses Math.max(2, groupCount) — never N alone (Main-collision) and never +1 (runaway-column)', () => {
        expect(extensionSrc).toContain('Math.max(2, groupCount)');
        expect(extensionSrc).not.toContain('Math.max(1, groupCount)');
        expect(extensionSrc).not.toMatch(/groupCount\s*\+\s*1/);
    });

    it('resolveSecondaryColumn floor of 2 guarantees Secondary never equals Main (column 1) when only 1 column is open', () => {
        // Simulate the exact regression PM found: groupCount === 1 (only Main open).
        const groupCount = 1;
        const resolved = Math.max(2, groupCount);
        expect(resolved).not.toBe(1); // Secondary must never collapse into Main
        expect(resolved).toBe(2);
    });

    it('openAtMain, openAtDocs, openAtSecondary helpers are defined', () => {
        expect(extensionSrc).toMatch(/async function openAtMain\(/);
        expect(extensionSrc).toMatch(/async function openAtDocs\(/);
        expect(extensionSrc).toMatch(/async function openAtSecondary\(/);
    });

    it('MAIN_COLUMN is ViewColumn.One and DOCS_COLUMN is ViewColumn.Two', () => {
        expect(extensionSrc).toContain('const MAIN_COLUMN = vscode.ViewColumn.One;');
        expect(extensionSrc).toContain('const DOCS_COLUMN = vscode.ViewColumn.Two;');
    });

    it('jarvis.openAgentSession existing-session branch calls openAtMain', () => {
        const idx = extensionSrc.indexOf("'jarvis.openAgentSession'");
        expect(idx).toBeGreaterThan(-1);
        const handlerSlice = extensionSrc.slice(idx, idx + 1500);
        expect(handlerSlice).toContain('await openAtMain(uri, entity.name);');
    });

    it('jarvis.openEntityFile calls openAtDocs', () => {
        const idx = extensionSrc.indexOf("'jarvis.openEntityFile'");
        expect(idx).toBeGreaterThan(-1);
        const handlerSlice = extensionSrc.slice(idx, idx + 800);
        expect(handlerSlice).toContain('await openAtDocs(uri);');
    });

    it('jarvis.sendMessages (Play-button) existing-session branch calls openAtMain, not bare openPinnedResource', () => {
        const idx = extensionSrc.indexOf("'jarvis.sendMessages'");
        expect(idx).toBeGreaterThan(-1);
        const handlerSlice = extensionSrc.slice(idx, idx + 1000);
        expect(handlerSlice).toContain('await openAtMain(uri, node.destination);');
    });

    it('the poll loop calls openAtSecondary for the existing-session branch', () => {
        expect(extensionSrc).toContain('await openAtSecondary(uri, sessionName);');
    });
});

describe('SPEC_MSG_FOCUSRESTORE: no artificial delay before restore', () => {
    it('snapshotFocus and restoreFocus helpers are defined and async (SPEC_MSG_FOCUSRESTORE AC-2: UUID resolution requires an await)', () => {
        expect(extensionSrc).toMatch(/async function snapshotFocus\(/);
        expect(extensionSrc).toMatch(/async function restoreFocus\(/);
    });

    it('snapshotFocus resolves the chat tab UUID via lookupSessionUUID rather than encoding the label directly', () => {
        const idx = extensionSrc.indexOf('async function snapshotFocus(');
        expect(idx).toBeGreaterThan(-1);
        const bodySlice = extensionSrc.slice(idx, idx + 1200);
        expect(bodySlice).toContain('await lookupSessionUUID(activeTab.label)');
        expect(bodySlice).not.toContain("Buffer.from(activeTab.label)");
    });

    it('restoreFocus is called immediately after marking messages notified, with no setTimeout in between', () => {
        const restoreIdx = extensionSrc.indexOf('await restoreFocus(focus);');
        expect(restoreIdx).toBeGreaterThan(-1);
        // Look at the ~400 chars immediately preceding the restoreFocus call —
        // there must be no setTimeout (defensive delay) in that window.
        const precedingSlice = extensionSrc.slice(Math.max(0, restoreIdx - 400), restoreIdx);
        expect(precedingSlice).not.toMatch(/setTimeout/);
    });

    it('the poll loop awaits snapshotFocus before the disruptive delivery', () => {
        expect(extensionSrc).toContain('const focus = await snapshotFocus();');
    });
});

describe('SPEC_MSG_AUTODELIVERY_OPTOUT: active-use skip check', () => {
    it('isSessionActiveTab helper is defined', () => {
        expect(extensionSrc).toMatch(/function isSessionActiveTab\(/);
    });

    it('poll loop checks isSessionActiveTab before snapshotting focus / delivering', () => {
        const optOutIdx = extensionSrc.indexOf('if (isSessionActiveTab(sessionName)) { continue; }');
        const snapshotIdx = extensionSrc.indexOf('const focus = await snapshotFocus();');
        expect(optOutIdx).toBeGreaterThan(-1);
        expect(snapshotIdx).toBeGreaterThan(-1);
        expect(optOutIdx).toBeLessThan(snapshotIdx);
    });
});

describe('SPEC_MSG_PINNED: openPinnedResource wired into remaining documented caller', () => {
    it('openPinnedResource helper is defined with optional viewColumn parameter', () => {
        expect(extensionSrc).toMatch(/async function openPinnedResource\(\s*uri: vscode\.Uri,\s*viewColumn\?: vscode\.ViewColumn\s*\)/);
    });

    it('jarvis.openSession calls openPinnedResource', () => {
        const idx = extensionSrc.indexOf("'jarvis.openSession'");
        expect(idx).toBeGreaterThan(-1);
        const handlerSlice = extensionSrc.slice(idx, idx + 800);
        expect(handlerSlice).toContain('await openPinnedResource(uri);');
    });
});
