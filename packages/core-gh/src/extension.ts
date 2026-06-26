// Implementation: SPEC_REL_RETIRESHIM
// Requirements: REQ_REL_RETIRESHIM

import * as vscode from 'vscode';
import { migrate } from './migrate';

export function activate(context: vscode.ExtensionContext): void {
    // Register NO views, NO heartbeat, NO message processing, NO commands.
    // The shim's only job is to migrate to enthali.jarvis-core and remove itself.
    void vscode.window.showInformationMessage(
        'Jarvis has moved to "Jarvis Core" (enthali.jarvis-core). Migrating\u2026'
    );
    void migrate(context);
}

export function deactivate(): void { /* nothing */ }
