// Implementation: SPEC_EXP_EXTENSION
// Requirements: REQ_EXP_ACTIVITYBAR, REQ_EXP_TREEVIEW, REQ_EXP_REACTIVECACHE, REQ_CFG_FOLDERPATHS, REQ_CFG_SCANINTERVAL

import * as vscode from 'vscode';
import { ProjectTreeProvider } from './projectTreeProvider';
import { EventTreeProvider } from './eventTreeProvider';
import { YamlScanner } from './yamlScanner';

export function activate(context: vscode.ExtensionContext) {
    const scanner = new YamlScanner(() => {
        projectProvider.refresh();
        eventProvider.refresh();
    });

    const projectProvider = new ProjectTreeProvider(scanner);
    const eventProvider = new EventTreeProvider(scanner);

    function startScanner(): void {
        const config = vscode.workspace.getConfiguration('jarvis');
        const projectsFolder = config.get<string>('projectsFolder', '');
        const eventsFolder = config.get<string>('eventsFolder', '');
        const scanInterval = config.get<number>('scanInterval', 120);
        scanner.start(projectsFolder, eventsFolder, scanInterval);
    }

    const projectView = vscode.window.createTreeView('jarvisProjects', { treeDataProvider: projectProvider });
    const eventView = vscode.window.createTreeView('jarvisEvents', { treeDataProvider: eventProvider });

    // Start scanner immediately on activation (view may already be visible)
    startScanner();

    context.subscriptions.push(
        projectView,
        eventView,
        projectView.onDidChangeVisibility(e => {
            if (e.visible) {
                startScanner();
            } else {
                scanner.stop();
            }
        }),
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('jarvis')) {
                startScanner();
            }
        }),
        { dispose: () => scanner.stop() }
    );
}

export function deactivate() {}
