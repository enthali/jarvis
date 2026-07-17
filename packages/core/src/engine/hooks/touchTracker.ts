// Implementation: SPEC_ENT_TOUCHEDFILES
// Requirements: REQ_ENT_TOUCHEDFILES

import * as path from 'path';
import * as vscode from 'vscode';
import type { HookEngine, HookEvent } from './hookEngine';
import { getEntityNameForSessionId } from '../sessions/sessionLookup';
import type { TouchStore } from './touchStore';
import { resolveTouchStorageKind } from './touchStore';

type TouchKind = 'read' | 'write';
interface TouchRule { kind: TouchKind; extract: (input: any) => string[]; }

/**
 * Classification allowlist from the FI-2026-07-17 research spike, used
 * verbatim (REQ_ENT_TOUCHEDFILES AC-2). Any tool_name not listed here is
 * ignored — no heuristic path-sniffing fallback (AC-2d).
 */
const TOUCH_RULES: Record<string, TouchRule> = {
    read_file: { kind: 'read', extract: i => [i.filePath] },
    create_file: { kind: 'write', extract: i => [i.filePath] },
    replace_string_in_file: { kind: 'write', extract: i => [i.filePath] },
    multi_replace_string_in_file: { kind: 'write', extract: i => (i.replacements ?? []).map((r: any) => r.filePath) },
};

/**
 * Single PostToolUse subscription that classifies tool calls via
 * TOUCH_RULES, resolves the owning entity via getEntityNameForSessionId
 * (reused, no new session-id correlation mechanism), and persists the
 * touch via TouchStore. Mirrors ActivityTracker's shape.
 */
export class TouchTracker {
    constructor(
        hookEngine: HookEngine,
        private readonly _store: TouchStore,
        private readonly _resolveOwner: (entityName: string) => { kind: string; name: string; folder: string } | undefined,
        private readonly _onChange: (entityKind: string, entityName: string) => void,
        private readonly _log?: vscode.LogOutputChannel,
    ) {
        hookEngine.on('PostToolUse', (event) => { void this._handle(event); });
    }

    private async _handle(event: HookEvent): Promise<void> {
        if (!event.sessionId) { return; } // REQ_ENT_TOUCHEDFILES AC-4
        const rule = TOUCH_RULES[event.payload?.tool_name as string];
        if (!rule) { return; } // AC-2d — unknown tool, ignored
        const entityName = await getEntityNameForSessionId(event.sessionId);
        if (!entityName) {
            this._log?.debug(`[Touch] no entity match for session_id=${event.sessionId}`);
            return; // AC-4, fail-open (same as REQ_HOOK_ACTIVITY AC-9)
        }
        const owner = this._resolveOwner(entityName);
        if (!owner) { return; }
        // Bugfix (PM F5 finding, GH #18): the storage key must disambiguate
        // 'actor' from 'session' (see resolveTouchStorageKind) so two
        // same-named entities from different scan roots never collide on one
        // JSON file. onChange still receives owner.kind unchanged — that must
        // stay the real registered provider kind ('session') for
        // treeFactory.refreshKind() to find its provider.
        const storageKind = resolveTouchStorageKind(owner.kind, owner.folder);
        const cwd = event.payload?.cwd as string | undefined;
        if (!cwd) { return; }
        const absPaths: string[] = rule.extract(event.payload?.tool_input) ?? [];
        const relPaths = [...new Set(absPaths.filter(Boolean))] // dedupe, AC-2c
            .map(p => path.relative(cwd, p).replace(/\\/g, '/')); // AC-5
        if (relPaths.length === 0) { return; }
        await this._store.recordTouches(storageKind, owner.name, relPaths, rule.kind);
        this._log?.debug(`[Touch] ${rule.kind} x${relPaths.length} -> ${storageKind}:${owner.name}`);
        this._onChange(owner.kind, owner.name);
    }
}
