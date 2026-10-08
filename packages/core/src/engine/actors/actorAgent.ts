// Implementation: SPEC_ACTOR_WHOAMI
// Requirements: REQ_ACTOR_WHOAMI

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { discoverAgentModes } from '../sessions/agentDiscovery';
import { getWorkspaceRoot } from '../core/configPaths';

export type EnsureAgentResult =
    | { status: 'ready'; mode: string }
    | { status: 'skipped'; reason: 'nameMismatch' | 'duplicateAgent' | 'noWorkspace' | 'writeFailed' };

const LINE1_PREFIX = 'You act as Actor ';
const LINE2_PREFIX = 'Your context memory is ';
const MODE_COMMAND_TIMEOUT_MS = 3000;
const MODE_COMMAND_POLL_MS = 100;

let _log: vscode.LogOutputChannel | undefined;

export function setActorAgentLogger(log: vscode.LogOutputChannel): void {
    _log = log;
}

// AC-9: serialize concurrent calls per Actor name.
const _locks = new Map<string, Promise<unknown>>();

// AC-6: a given warning (file + reason) is shown at most once per window session.
const _warnedOnce = new Set<string>();

function yamlString(value: string): string {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function toWorkspaceRelative(absPath: string, root: string): string {
    return path.relative(root, absPath).split(path.sep).join('/');
}

async function pathExists(filePath: string): Promise<boolean> {
    try {
        await fs.promises.access(filePath);
        return true;
    } catch {
        return false;
    }
}

function warnOnce(key: string, message: string): void {
    if (_warnedOnce.has(key)) { return; }
    _warnedOnce.add(key);
    void vscode.window.showWarningMessage(message);
}

/** Replaces or inserts the two Jarvis lines directly after the front matter, keeping everything else. */
function restoreLines(content: string, line1: string, line2: string): string {
    const eol = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(eol);
    let bodyStart = 0;
    if (lines[0] === '---') {
        const closeIdx = lines.indexOf('---', 1);
        if (closeIdx !== -1) { bodyStart = closeIdx + 1; }
    }
    const head = lines.slice(0, bodyStart);
    const rest = lines.slice(bodyStart);
    let idx = 0;
    const body: string[] = [];
    body.push(line1);
    if (rest[idx]?.startsWith(LINE1_PREFIX)) { idx++; }
    body.push(line2);
    if (rest[idx]?.startsWith(LINE2_PREFIX)) { idx++; }
    body.push(...rest.slice(idx));
    return [...head, ...body].join(eol);
}

/** Polls for VS Code to register the new agent's mode command; a timeout is not an error (step 6 still returns ready). */
async function waitForModeCommand(actorName: string): Promise<void> {
    const cmdId = `workbench.action.chat.open${actorName}`;
    const deadline = Date.now() + MODE_COMMAND_TIMEOUT_MS;
    while (Date.now() < deadline) {
        const available = await vscode.commands.getCommands(true);
        if (available.includes(cmdId)) { return; }
        await new Promise(resolve => setTimeout(resolve, MODE_COMMAND_POLL_MS));
    }
}

/**
 * Precondition: actor.name resolved to exactly one Actor, or the Actor was
 * just created. Never throws; a failure is logged and returned.
 */
export async function ensureActorAgent(
    actor: { name: string; folder: string }
): Promise<EnsureAgentResult> {
    const prior = _locks.get(actor.name) ?? Promise.resolve();
    const run = prior.catch(() => { /* a prior failure does not block this call */ }).then(() => _ensureActorAgent(actor));
    _locks.set(actor.name, run);
    try {
        return await run;
    } finally {
        if (_locks.get(actor.name) === run) { _locks.delete(actor.name); }
    }
}

async function _ensureActorAgent(
    actor: { name: string; folder: string }
): Promise<EnsureAgentResult> {
    const root = getWorkspaceRoot();
    if (!root) { return { status: 'skipped', reason: 'noWorkspace' }; }

    const modes = await discoverAgentModes();
    const candidates = modes.filter(m => m.name === actor.name);

    if (candidates.length > 1) {
        const files = candidates.map(c => c.filePath).join(', ');
        warnOnce(`duplicateAgent:${actor.name}:${files}`,
            `Jarvis: Several agents are named "${actor.name}": ${files}; the Actor opens without its own agent.`);
        return { status: 'skipped', reason: 'duplicateAgent' };
    }

    const contextRel = toWorkspaceRelative(path.join(actor.folder, 'context.md'), root);
    const line1 = `${LINE1_PREFIX}${actor.name}`;
    const line2 = `${LINE2_PREFIX}${contextRel}. Read it and the files it links if you did not do that already or after a compaction.`;

    if (candidates.length === 1) {
        const match = candidates[0];
        const targetPath = path.isAbsolute(match.filePath) ? match.filePath : path.join(root, match.filePath);
        try {
            const current = await fs.promises.readFile(targetPath, 'utf8');
            const restored = restoreLines(current, line1, line2);
            if (restored !== current) {
                await fs.promises.writeFile(targetPath, restored, 'utf8');
            }
        } catch (err) {
            _log?.warn(`[ACTOR] ensureActorAgent: failed to restore lines in "${targetPath}" for "${actor.name}": ${err}`);
            return { status: 'skipped', reason: 'writeFailed' };
        }
        return { status: 'ready', mode: actor.name };
    }

    // No candidate from discovery: target is <Actor name>.agent.md.
    const agentsDir = path.join(root, '.github', 'agents');
    const targetPath = path.join(agentsDir, `${actor.name}.agent.md`);
    if (await pathExists(targetPath)) {
        warnOnce(`nameMismatch:${targetPath}`,
            `Jarvis: ${toWorkspaceRelative(targetPath, root)} exists but is not the agent of Actor "${actor.name}"; the Actor opens without its own agent.`);
        return { status: 'skipped', reason: 'nameMismatch' };
    }

    try {
        await fs.promises.mkdir(agentsDir, { recursive: true });
        const content = ['---', `name: ${yamlString(actor.name)}`, '---', line1, line2, ''].join('\n');
        await fs.promises.writeFile(targetPath, content, 'utf8');
    } catch (err) {
        _log?.warn(`[ACTOR] ensureActorAgent: failed to create "${targetPath}" for "${actor.name}": ${err}`);
        return { status: 'skipped', reason: 'writeFailed' };
    }

    await waitForModeCommand(actor.name);
    return { status: 'ready', mode: actor.name };
}
