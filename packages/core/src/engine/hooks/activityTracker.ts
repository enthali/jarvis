// Implementation: SPEC_ACTOR_ACTIVITY
// Requirements: REQ_ACTOR_ACTIVITY

import * as vscode from 'vscode';
import type { HookEngine, HookEvent } from './hookEngine';
import { getEntityNameForSessionId } from '../sessions/sessionLookup';
import type { ActorScanner } from '../actors/actorScanner';

const ACTIVE_EVENTS = new Set([
    'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse',
    'PreCompact', 'SubagentStart', 'SubagentStop',
]);

/**
 * Maintains an in-memory set of currently-active Actor names, driven by
 * hook lifecycle events (SPEC_ACTOR_ACTIVITY). Consulted by
 * ActorTreeProvider to set the node's iconPath.
 */
export class ActivityTracker {
    private readonly _activeEntityNames = new Set<string>();

    constructor(
        hookEngine: HookEngine,
        private readonly _scanner: ActorScanner,
        private readonly _onChange: (entityName: string) => void,
        private readonly _log?: vscode.LogOutputChannel,
    ) {
        for (const name of [...ACTIVE_EVENTS, 'Stop']) {
            hookEngine.on(name, (event) => { void this._handle(event, name === 'Stop'); });
        }
    }

    /** AC-2a: false whenever the name does not resolve to exactly one Actor, regardless of the set. */
    isActive(entityName: string): boolean {
        if (this._scanner.resolveName(entityName).status !== 'found') { return false; }
        return this._activeEntityNames.has(entityName);
    }

    private async _handle(event: HookEvent, toInactive: boolean): Promise<void> {
        if (!event.sessionId) { return; } // REQ_ACTOR_ACTIVITY AC-6
        const title = await getEntityNameForSessionId(event.sessionId);
        if (!title) {
            // Diagnostic visibility for the linchpin session_id correlation
            // (SPEC_ACTOR_ACTIVITY design note) — helps confirm/deny the
            // assumption during F5 verification without needing a debugger.
            this._log?.debug(`[Activity] no entity match for session_id=${event.sessionId} (event=${event.eventName})`);
            return; // REQ_ACTOR_ACTIVITY AC-6/AC-9
        }
        if (this._scanner.resolveName(title).status !== 'found') {
            // Unknown or ambiguous title — ignored silently (REQ_ACTOR_ACTIVITY AC-10).
            return;
        }
        const entityName = title;
        const wasActive = this._activeEntityNames.has(entityName);
        if (toInactive) { this._activeEntityNames.delete(entityName); }
        else { this._activeEntityNames.add(entityName); }
        if (wasActive !== this._activeEntityNames.has(entityName)) {
            this._log?.info(`[Activity] "${entityName}" -> ${this._activeEntityNames.has(entityName) ? 'active' : 'inactive'} (event=${event.eventName})`);
            this._onChange(entityName);
        }
    }
}
