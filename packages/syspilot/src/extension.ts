// Implementation: SPEC_SPL_PACKAGE, SPEC_SPL_SUSPEND, SPEC_SPL_SKIP, SPEC_SPL_MANUAL
// Requirements: REQ_SPL_PACKAGE, REQ_SPL_SUSPEND, REQ_SPL_SKIP, REQ_SPL_MANUAL

import * as vscode from 'vscode';
import type { JarvisCoreApi } from 'jarvis-core';
import { readState, writeState } from './state';
import { checkSyspilotVersion, manualSyspilotUpdate } from './versionCheck';

export function activate(context: vscode.ExtensionContext): void {
    const log = vscode.window.createOutputChannel('Jarvis Syspilot', { log: true });
    context.subscriptions.push(log);

    const coreExt = vscode.extensions.getExtension<JarvisCoreApi>('enthali.jarvis-core');
    const api = coreExt?.exports;
    if (!api) {
        log.warn('[SPL] enthali.jarvis-core not found; jarvis-syspilot is inactive.');
        return;
    }

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    // SPEC_SPL_STARTUP AC-1: fire-and-forget from activate(), does not block startup.
    if (workspaceRoot) {
        void checkSyspilotVersion(api, workspaceRoot, log).catch(err => {
            log.warn(`[SPL] checkSyspilotVersion failed: ${err}`);
        });
    }

    // SPEC_SPL_MANUAL: Command Palette entry, forces a re-check ignoring suspend/skip.
    context.subscriptions.push(vscode.commands.registerCommand('jarvis.syspilotUpdate', async () => {
        if (!workspaceRoot) { vscode.window.showWarningMessage('Jarvis: No workspace open.'); return; }
        await manualSyspilotUpdate(api, workspaceRoot, log);
    }));

    // SPEC_SPL_SUSPEND
    const delaySyspilotUpdate = async (days?: number): Promise<{ suspendedUntil: string }> => {
        if (!workspaceRoot) { throw new Error('jarvis.delaySyspilotUpdate: no workspace open'); }
        const d = days ?? 7;
        const until = new Date();
        until.setDate(until.getDate() + d);
        const state = readState(workspaceRoot);
        state.suspendedUntil = until.toISOString();
        writeState(workspaceRoot, state);
        vscode.window.showInformationMessage(
            `Syspilot update notifications suspended until ${until.toLocaleDateString()}.`
        );
        return { suspendedUntil: state.suspendedUntil };
    };
    context.subscriptions.push(vscode.commands.registerCommand('jarvis.delaySyspilotUpdate', delaySyspilotUpdate));
    context.subscriptions.push(api.registerTool(
        'jarvis_delaySyspilotUpdate',
        'Suspend syspilot update notifications for N days',
        async (options: vscode.LanguageModelToolInvocationOptions<any>) => {
            const days = options.input?.days;
            const result = await delaySyspilotUpdate(days);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Suspended for ${days ?? 7} day(s), until ${result.suspendedUntil}.`)
            ]);
        }
    ));

    // SPEC_SPL_SKIP
    const skipThisVersion = (): { skippedVersion?: string } => {
        if (!workspaceRoot) { throw new Error('jarvis.SyspilotSkipThisVersion: no workspace open'); }
        const state = readState(workspaceRoot);
        if (!state.lastSeenUpstreamVersion) {
            vscode.window.showWarningMessage('No pending syspilot version to skip.');
            return {};
        }
        state.skippedVersion = state.lastSeenUpstreamVersion;
        writeState(workspaceRoot, state);
        vscode.window.showInformationMessage(`Syspilot version ${state.skippedVersion} will be skipped.`);
        return { skippedVersion: state.skippedVersion };
    };
    context.subscriptions.push(vscode.commands.registerCommand('jarvis.SyspilotSkipThisVersion', skipThisVersion));
    context.subscriptions.push(api.registerTool(
        'jarvis_SyspilotSkipThisVersion',
        'Permanently skip the current pending syspilot version',
        async () => {
            const result = skipThisVersion();
            const text = result.skippedVersion
                ? `Skipped version ${result.skippedVersion}.`
                : 'No pending syspilot version to skip.';
            return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(text)]);
        }
    ));
}

export function deactivate(): void {
    // No explicit teardown needed — all listeners are registered via context.subscriptions.
}
