// Implementation: SPEC_HOOK_LOG, SPEC_HOOK_INTAKE, SPEC_HOOK_ROUTE
// Requirements: REQ_HOOK_LOG, REQ_HOOK_INTAKE, REQ_HOOK_ROUTE

import * as vscode from 'vscode';

export interface HookEvent {
    eventName: string;
    sessionId?: string;
    timestamp?: string;
    payload: Record<string, unknown>;
}

type HookHandler = (event: HookEvent) => void;

export class HookEngine {
    private readonly logger: vscode.LogOutputChannel;
    private readonly handlers: Map<string, HookHandler[]> = new Map();

    constructor(logger: vscode.LogOutputChannel) {
        this.logger = logger;
    }

    /** Register a handler for a specific hook event name. */
    on(eventName: string, handler: HookHandler): void {
        const handlers = this.handlers.get(eventName) ?? [];
        handlers.push(handler);
        this.handlers.set(eventName, handlers);
    }

    /** Unregister a handler for a specific hook event name. */
    off(eventName: string, handler: HookHandler): void {
        const handlers = this.handlers.get(eventName);
        if (!handlers) { return; }
        const idx = handlers.indexOf(handler);
        if (idx !== -1) {
            handlers.splice(idx, 1);
            if (handlers.length === 0) {
                this.handlers.delete(eventName);
            }
        }
    }

    /** Intake point — called by the HTTP listener for each received event. */
    receive(event: HookEvent): void {
        // Dispatch to registered handlers for this event type
        this._dispatch(event);
        // MVP: also log via the logging sink (SPEC_HOOK_LOG)
        this._sink(event);
    }

    private _dispatch(event: HookEvent): void {
        const handlers = this.handlers.get(event.eventName);
        if (!handlers || handlers.length === 0) {
            return;
        }
        for (const handler of handlers) {
            try {
                handler(event);
            } catch (err) {
                this.logger.error(`[Hook] Handler error for ${event.eventName}: ${err}`);
            }
        }
    }

    private _sink(event: HookEvent): void {
        const sid = event.sessionId ? ` session=${event.sessionId}` : '';
        // trace: full payload, unchanged from the original single-entry
        // format — only visible when trace logging is explicitly enabled
        this.logger.trace(`[Hook] ${event.eventName}${sid} — ${JSON.stringify(event.payload)}`);
        // info: event name + session id only, no payload — default-visible
        this.logger.info(`[Hook] ${event.eventName}${sid}`);
    }
}