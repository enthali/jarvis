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
const PM_MARKER_FILE_NAME = 'syspilot.pm.agent.md';

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

export function upstreamUrl(tag: string, fileName: string): string {
    // SPEC_SPL_STARTUP / REQ_SPL_SUPPLY_CHAIN: fetched only from the pinned
    // syspilot release tag via raw.githubusercontent.com (HTTPS, trusted source).
    // The upstream repo nests the agent files under an inner `syspilot/` package
    // directory (enthali/syspilot/<tag>/syspilot/agents/<file>), not directly
    // under `agents/`.
    return `https://raw.githubusercontent.com/enthali/syspilot/${tag}/syspilot/agents/${fileName}`;
}

type FetchTextResult =
    | { ok: true; text: string }
    | { ok: false; reason: 'not-found' | 'network' };

async function fetchText(url: string, log: vscode.LogOutputChannel): Promise<FetchTextResult> {
    try {
        const resp = await fetch(url);
        if (!resp.ok) {
            log.warn(`[SPL] fetch failed for ${url}: ${resp.status}`);
            return { ok: false, reason: resp.status === 404 ? 'not-found' : 'network' };
        }
        return { ok: true, text: await resp.text() };
    } catch (err) {
        log.warn(`[SPL] network error fetching ${url}: ${err}`);
        return { ok: false, reason: 'network' };
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

// SPEC_SPL_NOTIFY AC-3: a single unified message, no initial/update distinction,
// no embedded version number — offers three choices: install now, skip this
// version, or delay for N days. Uses the actual LM tool names (underscore
// notation) so the actor can invoke them directly.
export const UPDATE_NOTIFICATION_TEXT =
    'Please ask the user whether they want to install this update now, skip this version by ' +
    'calling jarvis_SyspilotSkipThisVersion(), or delay it for N days by calling jarvis_delaySyspilotUpdate(N).';

async function notifyActor(api: JarvisCoreApi, workspaceRoot: string, log: vscode.LogOutputChannel): Promise<void> {
    await ensureActor(api, log);
    api.sendMessage(ACTOR_NAME, 'jarvis-syspilot', UPDATE_NOTIFICATION_TEXT);
    log.info('[SPL] notifyActor: queued unified update notification');
    // SPEC_SPL_NOTIFY AC-4: idempotent, same pattern as the reminders feature
    // (SPEC_MSG_REMINDERS_POLL) — mirrored locally rather than imported from
    // messageQueue.ts, since that module is internal to packages/core and not
    // reachable across the package boundary (same precedent as packages/flow's
    // local path resolution mirrors). Full union-write-remove cycle (SPEC_CFG_STATEMIGRATION).
    addAutoDelivery(workspaceRoot, ACTOR_NAME);
    log.info('[SPL] notifyActor: ensured auto-delivery for actor');
}

/** Current auto-delivery path: <workspaceRoot>/.jarvis/messages/autodelivery.json (GH #59). */
function resolveAutoDeliveryPath(workspaceRoot: string): string {
    return path.join(workspaceRoot, '.jarvis', 'messages', 'autodelivery.json');
}

/** Legacy auto-delivery path for union read (SPEC_CFG_STATEMIGRATION). */
function resolveLegacyAutoDeliveryPath(workspaceRoot: string): string {
    return path.join(workspaceRoot, '.jarvis', 'autodelivery.json');
}

/**
 * Mirrors messageQueue.ts's addAutoDelivery(): idempotent append to autodelivery.json.
 * Full union-write-remove cycle (SPEC_CFG_STATEMIGRATION).
 */
function addAutoDelivery(workspaceRoot: string, sessionName: string): void {
    const adPath = resolveAutoDeliveryPath(workspaceRoot);
    const legacyPath = resolveLegacyAutoDeliveryPath(workspaceRoot);

    // Union read
    let current: string[] = [];
    try { if (fs.existsSync(adPath)) { current = JSON.parse(fs.readFileSync(adPath, 'utf8')) as string[]; } } catch { current = []; }
    let legacy: string[] = [];
    let legacyPresent = false;
    try { if (fs.existsSync(legacyPath)) { legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8')) as string[]; legacyPresent = true; } } catch { if (fs.existsSync(legacyPath)) { legacyPresent = true; } }

    const merged = [...new Set([...current, ...legacy])];
    if (merged.includes(sessionName)) {
        // Already present — still persist union to migrate if legacy exists
        if (legacyPresent) {
            fs.mkdirSync(path.dirname(adPath), { recursive: true });
            fs.writeFileSync(adPath, JSON.stringify(merged, null, 2));
            try { fs.unlinkSync(legacyPath); } catch { /* best-effort */ }
        }
        return;
    }
    merged.push(sessionName);
    fs.mkdirSync(path.dirname(adPath), { recursive: true });
    fs.writeFileSync(adPath, JSON.stringify(merged, null, 2));
    if (legacyPresent) { try { fs.unlinkSync(legacyPath); } catch { /* best-effort */ } }
}

function agentFilePath(workspaceRoot: string): string {
    return path.join(workspaceRoot, '.github', 'agents', AGENT_FILE_NAME);
}

/**
 * SPEC_SPL_STARTUP AC-6: installation-completeness marker, written by the
 * setup workflow (syspilot.pm.agent.md). Its absence means setup was never
 * completed — the module re-notifies on every activation until it appears.
 */
function isInstalled(workspaceRoot: string): boolean {
    return fs.existsSync(path.join(workspaceRoot, '.github', 'agents', PM_MARKER_FILE_NAME));
}

type FetchUpstreamAgentResult =
    | { ok: true; content: string; version: string | undefined; tag: string }
    | { ok: false; reason: 'not-found' | 'network' };

/** Fetches the upstream agent file and returns its content + parsed version, or a failure reason. */
async function fetchUpstreamAgent(log: vscode.LogOutputChannel): Promise<FetchUpstreamAgentResult> {
    const tag = getReleaseTag();
    const result = await fetchText(upstreamUrl(tag, AGENT_FILE_NAME), log);
    if (!result.ok) { return { ok: false, reason: result.reason }; }
    return { ok: true, content: result.text, version: parseFrontmatterVersion(result.text), tag };
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
    if (!upstream.ok) { return; }
    const { content: upstreamContent, version: upstreamVersion } = upstream;
    log.info(`[SPL] upstream version: ${upstreamVersion}`);

    const state = readState(workspaceRoot);
    if (upstreamVersion) {
        state.lastSeenUpstreamVersion = upstreamVersion;
        writeState(workspaceRoot, state);
    }

    const localPath = agentFilePath(workspaceRoot);
    let freshlyDownloaded = false;
    if (!fs.existsSync(localPath)) {
        log.info(`[SPL] local file missing — downloading from ${upstream.tag}`);
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, upstreamContent);
        freshlyDownloaded = true;
    }

    // SPEC_SPL_STARTUP AC-4: on first run (freshly downloaded) OR when
    // installation is incomplete (syspilot.pm.agent.md absent), always notify
    // regardless of version equality — skip the version-match early-return.
    const installed = isInstalled(workspaceRoot);
    if (installed && !freshlyDownloaded) {
        const localVersion = parseFrontmatterVersion(fs.readFileSync(localPath, 'utf-8'));
        log.info(`[SPL] local=${localVersion}, upstream=${upstreamVersion}, installed=${installed}`);
        if (localVersion === upstreamVersion) {
            log.info('[SPL] up to date — no action');
            return;
        }
    } else {
        log.info(`[SPL] freshlyDownloaded=${freshlyDownloaded}, installed=${installed} — bypassing version-match gate`);
    }

    if (state.skippedVersion === upstreamVersion) {
        log.info(`[SPL] version ${upstreamVersion} is skipped`);
        return;
    }
    if (state.suspendedUntil && new Date(state.suspendedUntil) > new Date()) {
        log.info(`[SPL] suspended until ${state.suspendedUntil}`);
        return;
    }

    log.info('[SPL] notifying Syspilot Setup Engineer');
    await notifyActor(api, workspaceRoot, log);
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
    if (!upstream.ok) {
        const message = upstream.reason === 'not-found'
            ? 'syspilot release not found (release tag or upstream path may be wrong).'
            : 'Could not reach syspilot release. Check network.';
        vscode.window.showWarningMessage(message);
        return;
    }
    if (!upstream.version) {
        vscode.window.showWarningMessage('syspilot release found but has no parseable version.');
        return;
    }
    const { content: upstreamContent, version: upstreamVersion } = upstream;

    const state = readState(workspaceRoot);
    state.lastSeenUpstreamVersion = upstreamVersion;
    writeState(workspaceRoot, state);

    const localPath = agentFilePath(workspaceRoot);
    let freshlyDownloaded = false;
    if (!fs.existsSync(localPath)) {
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, upstreamContent);
        freshlyDownloaded = true;
    }

    // SPEC_SPL_STARTUP AC-4/AC-6: same always-notify guard as the startup
    // flow — a freshly downloaded file or an incomplete installation
    // (syspilot.pm.agent.md absent) must not short-circuit here.
    const installed = isInstalled(workspaceRoot);
    if (installed && !freshlyDownloaded) {
        const localVersion = parseFrontmatterVersion(fs.readFileSync(localPath, 'utf-8'));
        if (localVersion === upstreamVersion) {
            vscode.window.showInformationMessage(`syspilot is up to date (${localVersion}).`);
            return;
        }
    }

    await notifyActor(api, workspaceRoot, log);
    vscode.window.showInformationMessage(`Notified Syspilot Setup Engineer about version ${upstreamVersion}.`);
}
