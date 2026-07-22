// Implementation: SPEC_SPL_STATE
// Requirements: REQ_SPL_STATE

import * as fs from 'fs';
import * as path from 'path';
import type { SyspilotState } from './types';

function statePath(workspaceRoot: string): string {
    return path.join(workspaceRoot, '.jarvis', 'syspilot-state.json');
}

/** Read persisted state; malformed or missing files are treated as empty state (AC-2). */
export function readState(workspaceRoot: string): SyspilotState {
    const p = statePath(workspaceRoot);
    if (!fs.existsSync(p)) { return {}; }
    try {
        return JSON.parse(fs.readFileSync(p, 'utf-8')) as SyspilotState;
    } catch {
        return {};
    }
}

/** Write persisted state, creating the .jarvis/ directory if needed (AC-1). */
export function writeState(workspaceRoot: string, state: SyspilotState): void {
    const p = statePath(workspaceRoot);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(state, null, 2));
}
