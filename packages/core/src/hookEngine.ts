// Implementation: SPEC_HOOK_LOG, SPEC_HOOK_INTAKE
// Requirements: REQ_HOOK_LOG, REQ_HOOK_INTAKE

import * as vscode from 'vscode';

export interface HookEvent {
    event: 'SessionStart' | 'UserPromptSubmit' | 'PreToolUse' | 'PostToolUse' | 'PreCompact' | 'SubagentStart' | 'SubagentStop' | 'Stop';
    timestamp: string;
    payload: unknown;
}

export class HookEngine {
    private readonly logger: vscode.LogOutputChannel;

    constructor(logger: vscode.LogOutputChannel) {
        this.logger = logger;
    }

    receive(event: HookEvent): void {
        this.logger.info(`[Hook] ${event.event}`, event.payload);
    }
}