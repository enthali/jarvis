// Implementation: SPEC_HOOK_ACTIVITY
// Requirements: REQ_HOOK_ACTIVITY

import * as vscode from 'vscode';
import type { HookEngine, HookEvent } from './hookEngine';
import { getEntityNameForSessionId } from '../sessions/sessionLookup';

const ACTIVE_EVENTS = new Set([
    'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse',
    'PreCompact', 'SubagentStart', 'SubagentStop',
]);

/**
 * Maintains an in-memory set of currently-active entity names, driven by
 * hook lifecycle events (SPEC_HOOK_ACTIVITY). Consulted by ActivityDecorator
 * to prefix tree node labels with a codicon glyph.
 */
export class ActivityTracker {
    private readonly _activeEntityNames = new Set<string>();

    constructor(
        hookEngine: HookEngine,
        private readonly _onChange: (entityName: string) => void,
        private readonly _log?: vscode.LogOutputChannel,
    ) {
        for (const name of [...ACTIVE_EVENTS, 'Stop']) {
            hookEngine.on(name, (event) => { void this._handle(event, name === 'Stop'); });
        }
    }

    isActive(entityName: string): boolean {
        return this._activeEntityNames.has(entityName);
    }

    private async _handle(event: HookEvent, toInactive: boolean): Promise<void> {
        if (!event.sessionId) { return; } // REQ_HOOK_ACTIVITY AC-6
        const entityName = await getEntityNameForSessionId(event.sessionId);
        if (!entityName) {
            // Diagnostic visibility for the linchpin session_id correlation
            // (SPEC_HOOK_ACTIVITY design note) — helps confirm/deny the
            // assumption during F5 verification without needing a debugger.
            this._log?.debug(`[Activity] no entity match for session_id=${event.sessionId} (event=${event.eventName})`);
            return; // REQ_HOOK_ACTIVITY AC-7 / AC-9
        }
        const wasActive = this._activeEntityNames.has(entityName);
        if (toInactive) { this._activeEntityNames.delete(entityName); }
        else { this._activeEntityNames.add(entityName); }
        if (wasActive !== this.isActive(entityName)) {
            this._log?.info(`[Activity] "${entityName}" -> ${this.isActive(entityName) ? 'active' : 'inactive'} (event=${event.eventName})`);
            this._onChange(entityName);
        }
    }
}
