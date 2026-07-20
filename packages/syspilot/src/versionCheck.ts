// Implementation: SPEC_SPL_STARTUP, SPEC_SPL_ACTOR, SPEC_SPL_NOTIFY, SPEC_SPL_MANUAL
// Requirements: REQ_SPL_STARTUP_CHECK, REQ_SPL_ACTOR, REQ_SPL_NOTIFY, REQ_SPL_MANUAL,
//               REQ_SPL_SUPPLY_CHAIN, REQ_SPL_STATE

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { JarvisCoreApi } from 'jarvis-core';
import { readState, writeState } from './state';

const ACTOR_NAME = 'Syspilot Setup Engineer';
const ACTOR_SUMMARY = 'Manages syspilot agent installation and updates';
const AGENT_FILE_NAME = 'syspilot.setup.agent.md';
const BOOTSTRAP_FILE_NAME = 'bootstrap.json';

/** Extracts the `version` Frontmatter key from an agent Markdown file's content. */
export function parseFrontmatterVersion(content: string): string | undefined {
    if (!content.startsWith('---')) { return undefined; }
    const closeIdx = content.indexOf('\n---', 3);
    if (closeIdx < 0) { return undefined; }
    const header = content.slice(3, closeIdx);
    const match = /^version:\s*(?:"([^"]*)"|'([^']*)'|(.+?))\s*$/m.exec(header);
    if (!match) { return undefined; }
    return (match[1] ?? match[2] ?? match[3] ?? '').trim() || undefined;
}

function getReleaseTag(): string {
    return vscode.workspace.getConfiguration('jarvis.syspilot').get<string>('releaseTag', 'main');
}

function upstreamUrl(tag: string, fileName: string): string {
    // SPEC_SPL_STARTUP / REQ_SPL_SUPPLY_CHAIN: fetched only from the pinned
    // syspilot release tag via raw.githubusercontent.com (HTTPS, trusted source).
    return `https://raw.githubusercontent.com/enthali/syspilot/${tag}/agents/${fileName}`;
}

async function fetchText(url: string, log: vscode.LogOutputChannel): Promise<string | undefined> {
    try {
        const resp = await fetch(url);
        if (!resp.ok) { log.warn(`[SPL] fetch failed for ${url}: ${resp.status}`); return undefined; }
        return await resp.text();
    } catch (err) {
        log.warn(`[SPL] network error fetching ${url}: ${err}`);
        return undefined;
    }
}

/** Copies bootstrap.json from upstream alongside the agent file, if present (best-effort). */
async function copyCompanionFiles(tag: string, targetDir: string, log: vscode.LogOutputChannel): Promise<void> {
    const content = await fetchText(upstreamUrl(tag, BOOTSTRAP_FILE_NAME), log);
    if (content === undefined) { return; }
    try {
        fs.writeFileSync(path.join(targetDir, BOOTSTRAP_FILE_NAME), content);
    } catch (err) {
        log.warn(`[SPL] failed to write ${BOOTSTRAP_FILE_NAME}: ${err}`);
    }
}

async function ensureActor(api: JarvisCoreApi, log: vscode.LogOutputChannel): Promise<void> {
    const exists = api.listJarvisSessions().some(s => s.name === ACTOR_NAME);
    if (exists) { return; }
    const options = {
        input: { name: ACTOR_NAME, summary: ACTOR_SUMMARY, agent: 'syspilot.setup' }
    } as vscode.LanguageModelToolInvocationOptions<unknown>;
    const tokenSource = new vscode.CancellationTokenSource();
    try {
        await api.invokeTool('jarvis_createActor', options, tokenSource.token);
    } catch (err) {
        log.warn(`[SPL] ensureActor: failed to create "${ACTOR_NAME}": ${err}`);
    } finally {
        tokenSource.dispose();
    }
}

async function notifyActor(
    api: JarvisCoreApi,
    version: string,
    reason: 'initial' | 'update',
    log: vscode.LogOutputChannel
): Promise<void> {
    await ensureActor(api, log);
    const text = reason === 'initial'
        ? `syspilot has been set up for this workspace (version ${version}). ` +
          `Run your setup workflow to configure the workspace.`
        : `A new syspilot version is available (${version}).\n\n` +
          `You have three options:\n` +
          `1. Install the update — run your normal setup workflow.\n` +
          `2. Suspend notifications — call jarvis.delaySyspilotUpdate(<days>) to pause for N days.\n` +
          `3. Skip this version — call jarvis.SyspilotSkipThisVersion() to never be notified about this version again.`;
    api.sendMessage(ACTOR_NAME, 'jarvis-syspilot', text);
    log.info(`[SPL] notifyActor: reason=${reason}, version=${version}`);
}

function agentFilePath(workspaceRoot: string): string {
    return path.join(workspaceRoot, '.github', 'agents', AGENT_FILE_NAME);
}

/** Fetches the upstream agent file and returns its content + parsed version, or undefined on failure. */
async function fetchUpstreamAgent(log: vscode.LogOutputChannel): Promise<{ content: string; version: string | undefined; tag: string } | undefined> {
    const tag = getReleaseTag();
    const content = await fetchText(upstreamUrl(tag, AGENT_FILE_NAME), log);
    if (content === undefined) { return undefined; }
    return { content, version: parseFrontmatterVersion(content), tag };
}

/**
 * SPEC_SPL_STARTUP: runs once per activation, asynchronously, fire-and-forget
 * from activate(). Respects suspend/skip state.
 */
export async function checkSyspilotVersion(
    api: JarvisCoreApi,
    workspaceRoot: string,
    log: vscode.LogOutputChannel
): Promise<void> {
    const upstream = await fetchUpstreamAgent(log);
    if (!upstream) { return; }
    const { content: upstreamContent, version: upstreamVersion, tag } = upstream;

    const state = readState(workspaceRoot);
    if (upstreamVersion) {
        state.lastSeenUpstreamVersion = upstreamVersion;
        writeState(workspaceRoot, state);
    }

    const localPath = agentFilePath(workspaceRoot);
    if (!fs.existsSync(localPath)) {
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, upstreamContent);
        await copyCompanionFiles(tag, path.dirname(localPath), log);
        await notifyActor(api, upstreamVersion ?? 'unknown', 'initial', log);
        return;
    }

    const localVersion = parseFrontmatterVersion(fs.readFileSync(localPath, 'utf-8'));
    if (localVersion === upstreamVersion) { return; }

    if (state.skippedVersion === upstreamVersion) { return; }
    if (state.suspendedUntil && new Date(state.suspendedUntil) > new Date()) { return; }

    await notifyActor(api, upstreamVersion ?? 'unknown', 'update', log);
}

/**
 * SPEC_SPL_MANUAL: same check as startup, but ignores suspend/skip state and
 * surfaces the result via information/warning messages.
 */
export async function manualSyspilotUpdate(
    api: JarvisCoreApi,
    workspaceRoot: string,
    log: vscode.LogOutputChannel
): Promise<void> {
    const upstream = await fetchUpstreamAgent(log);
    if (!upstream || !upstream.version) {
        vscode.window.showWarningMessage('Could not reach syspilot release. Check network.');
        return;
    }
    const { content: upstreamContent, version: upstreamVersion, tag } = upstream;

    const state = readState(workspaceRoot);
    state.lastSeenUpstreamVersion = upstreamVersion;
    writeState(workspaceRoot, state);

    const localPath = agentFilePath(workspaceRoot);
    if (!fs.existsSync(localPath)) {
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, upstreamContent);
        await copyCompanionFiles(tag, path.dirname(localPath), log);
        await notifyActor(api, upstreamVersion, 'initial', log);
        vscode.window.showInformationMessage(`Notified Syspilot Setup Engineer about version ${upstreamVersion}.`);
        return;
    }

    const localVersion = parseFrontmatterVersion(fs.readFileSync(localPath, 'utf-8'));
    if (localVersion === upstreamVersion) {
        vscode.window.showInformationMessage(`syspilot is up to date (${localVersion}).`);
        return;
    }

    await notifyActor(api, upstreamVersion, 'update', log);
    vscode.window.showInformationMessage(`Notified Syspilot Setup Engineer about version ${upstreamVersion}.`);
}
