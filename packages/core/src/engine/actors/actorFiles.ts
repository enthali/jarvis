// Implementation: SPEC_ACTOR_FILES
// Requirements: REQ_ACTOR_FILES_TREE

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { discoverAgentModes } from '../sessions/agentDiscovery';

export interface ActorFileNode {
    kind: 'actorFile';
    filePath: string; // absolute
    label: string;     // basename
}

export interface ActorFileFolderNode {
    kind: 'actorFileFolder';
    folderPath: string; // absolute
    label: string;       // basename
}

/**
 * Resolves the agent's `*.agent.md` file for the "Agent" category, freshly
 * on every call (no persistent cache, SPEC_ACTOR_FILES). Returns undefined
 * when there is no agent, the agent cannot be discovered, or the file no
 * longer exists — the category is then omitted by the caller.
 */
export async function resolveAgentFile(agent: string): Promise<string | undefined> {
    if (!agent) { return undefined; }
    const agents = await discoverAgentModes();
    const match = agents.find(a => a.name === agent);
    if (!match) { return undefined; }
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { return undefined; }
    const absolute = path.isAbsolute(match.filePath) ? match.filePath : path.join(root, match.filePath);
    return (await exists(absolute)) ? absolute : undefined;
}

/**
 * Alphabetical listing (files and folders sorted together, dotfiles
 * included) of one folder. Fail-open: an unreadable folder yields an empty
 * listing, never an error (SPEC_ACTOR_FILES).
 */
export async function listFolder(folder: string): Promise<(ActorFileNode | ActorFileFolderNode)[]> {
    let entries: fs.Dirent[];
    try {
        entries = await fs.promises.readdir(folder, { withFileTypes: true });
    } catch {
        return [];
    }
    return [...entries]
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
        .map(entry => {
            const fullPath = path.join(folder, entry.name);
            return entry.isDirectory()
                ? { kind: 'actorFileFolder' as const, folderPath: fullPath, label: entry.name }
                : { kind: 'actorFile' as const, filePath: fullPath, label: entry.name };
        });
}

async function exists(filePath: string): Promise<boolean> {
    try {
        await fs.promises.access(filePath);
        return true;
    } catch {
        return false;
    }
}
