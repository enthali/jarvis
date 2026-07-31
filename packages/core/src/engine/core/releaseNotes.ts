// Implementation: SPEC_REL_RELEASENOTES
import * as vscode from 'vscode';

const MARKER_KEY = 'jarvis.releaseNotes.lastShownVersion';

function notesUri(version: string): vscode.Uri {
    return vscode.Uri.parse(
        `https://github.com/enthali/jarvis/releases/tag/v${version}`
    );
}

async function open(version: string, log?: vscode.LogOutputChannel): Promise<void> {
    const uri = notesUri(version);
    const opened = await vscode.env.openExternal(uri);
    if (!opened) {
        log?.warn(`[ReleaseNotes] openExternal declined: ${uri.toString()}`);
        void vscode.window.showInformationMessage(
            `Jarvis release notes: ${uri.toString()}`
        );
    }
}

export async function announceIfNewVersion(
    context: vscode.ExtensionContext,
    log?: vscode.LogOutputChannel
): Promise<void> {
    const installed: string = context.extension.packageJSON.version;
    const seen = context.globalState.get<string>(MARKER_KEY);
    if (seen === installed) { return; }

    try {
        await context.globalState.update(MARKER_KEY, installed);
    } catch (e) {
        log?.error(`[ReleaseNotes] marker write failed, not opening: ${e}`);
        return;
    }

    if (seen === undefined) {
        log?.info(`[ReleaseNotes] first install, recorded v${installed}`);
        return;
    }

    const enabled = vscode.workspace
        .getConfiguration('jarvis.releaseNotes')
        .get<boolean>('showOnUpdate', true);
    if (!enabled) { return; }

    log?.info(`[ReleaseNotes] v${seen} → v${installed}, opening notes`);
    await open(installed, log);
}

export async function showReleaseNotes(
    context: vscode.ExtensionContext,
    log?: vscode.LogOutputChannel
): Promise<void> {
    await open(context.extension.packageJSON.version, log);
}
