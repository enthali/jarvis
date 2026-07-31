// Implementation: SPEC_REL_RELEASENOTES
import * as vscode from 'vscode';
import * as fs from 'fs';
import { getJarvisDir, ensureStateDir, getReleaseNotesStatePath } from './configPaths';

const INTEGRATED_BROWSER = 'workbench.action.browser.open';
const SIMPLE_BROWSER_OPEN = 'simpleBrowser.api.open';

interface ReleaseNotesState { lastShownVersion?: string; }

function readState(): ReleaseNotesState | undefined {
    const file = getReleaseNotesStatePath();
    if (!file || !fs.existsSync(file)) { return undefined; }
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8')) as ReleaseNotesState;
    } catch {
        return undefined;
    }
}

function writeState(version: string): void {
    ensureStateDir();
    const file = getReleaseNotesStatePath()!;
    fs.writeFileSync(
        file, JSON.stringify({ lastShownVersion: version }, null, 2), 'utf8'
    );
}

function notesUri(version: string): vscode.Uri {
    return vscode.Uri.parse(
        `https://github.com/enthali/jarvis/releases/tag/v${version}`
    );
}

async function openInEditor(uri: vscode.Uri): Promise<boolean> {
    const commands = await vscode.commands.getCommands(true);
    if (!commands.includes(INTEGRATED_BROWSER)) { return false; }
    await vscode.commands.executeCommand(SIMPLE_BROWSER_OPEN, uri);
    return true;
}

async function open(version: string, log?: vscode.LogOutputChannel): Promise<void> {
    const uri = notesUri(version);
    try {
        if (await openInEditor(uri)) { return; }
        log?.warn(`[ReleaseNotes] integrated browser unavailable: ${uri.toString()}`);
    } catch (e) {
        log?.warn(`[ReleaseNotes] in-editor open failed: ${e}`);
    }
    const choice = await vscode.window.showInformationMessage(
        `Jarvis release notes: ${uri.toString()}`,
        'Open in Browser'
    );
    if (choice) { void vscode.env.openExternal(uri); }
}

export async function announceIfNewVersion(
    context: vscode.ExtensionContext,
    log?: vscode.LogOutputChannel
): Promise<void> {
    if (!getReleaseNotesStatePath()) {
        log?.warn('[ReleaseNotes] no workspace folder open, nothing to announce');
        return;
    }

    const installed: string = context.extension.packageJSON.version;
    const seen = readState()?.lastShownVersion;
    if (seen === installed) { return; }

    // Must be sampled before writeState(): ensureStateDir() creates
    // .jarvis/ and would make every workspace look known.
    const jarvisDir = getJarvisDir();
    const knownWorkspace = !!jarvisDir && fs.existsSync(jarvisDir);

    try {
        writeState(installed);
    } catch (e) {
        log?.error(`[ReleaseNotes] marker write failed, not opening: ${e}`);
        return;
    }

    if (seen === undefined && !knownWorkspace) {
        log?.info(`[ReleaseNotes] workspace new to Jarvis, recorded v${installed}`);
        return;
    }

    const enabled = vscode.workspace
        .getConfiguration('jarvis.releaseNotes')
        .get<boolean>('showOnUpdate', true);
    if (!enabled) { return; }

    log?.info(`[ReleaseNotes] ${seen ?? 'unrecorded'} → v${installed}, opening notes`);
    await open(installed, log);
}

export async function showReleaseNotes(
    context: vscode.ExtensionContext,
    log?: vscode.LogOutputChannel
): Promise<void> {
    await open(context.extension.packageJSON.version, log);
}
