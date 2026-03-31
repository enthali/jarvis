// Implementation: SPEC_EXP_EXTENSION
// Requirements: REQ_EXP_ACTIVITYBAR, REQ_EXP_TREEVIEW

import * as vscode from 'vscode';
import { ProjectTreeProvider } from './projectTreeProvider';
import { EventTreeProvider } from './eventTreeProvider';

export function activate(context: vscode.ExtensionContext) {
    const projectProvider = new ProjectTreeProvider();
    const eventProvider = new EventTreeProvider();

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('jarvisProjects', projectProvider),
        vscode.window.registerTreeDataProvider('jarvisEvents', eventProvider)
    );
}

export function deactivate() {}
