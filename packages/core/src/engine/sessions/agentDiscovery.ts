// Implementation: SPEC_ACTOR_AGENT_DISCOVERY, SPEC_ACTOR_FILES
// Requirements: REQ_ACTOR_AGENT_DISCOVERY

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface AgentModeEntry {
    name: string;
    filePath: string;
}

function isExplicitlyExcluded(content: string, key: string): boolean {
    if (!content.startsWith('---')) { return false; }
    const closeIdx = content.indexOf('\n---', 3);
    if (closeIdx < 0) { return false; }
    const header = content.slice(3, closeIdx);
    const re = new RegExp(`^${key}:\\s*false\\s*$`, 'm');
    return re.test(header);
}

function readFrontmatterString(content: string, key: string): string | undefined {
    if (!content.startsWith('---')) { return undefined; }
    const closeIdx = content.indexOf('\n---', 3);
    if (closeIdx < 0) { return undefined; }
    const header = content.slice(3, closeIdx);
    const re = new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|(.+?))\\s*$`, 'm');
    const m = re.exec(header);
    if (!m) { return undefined; }
    const value = m[1] ?? m[2] ?? m[3] ?? '';
    return value.trim() || undefined;
}

function getAgentIdentity(content: string, filename: string): string {
    const name = readFrontmatterString(content, 'name');
    if (name) { return name; }
    return filename.endsWith('.agent.md')
        ? filename.slice(0, -'.agent.md'.length)
        : filename;
}

export async function discoverAgentModes(): Promise<AgentModeEntry[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
    const agents: AgentModeEntry[] = [];

    for (const workspaceFolder of workspaceFolders) {
        const agentsDir = path.join(workspaceFolder.uri.fsPath, '.github', 'agents');
        let entries: fs.Dirent[];
        try {
            entries = await fs.promises.readdir(agentsDir, { withFileTypes: true });
        } catch {
            continue;
        }

        for (const entry of entries) {
            if (!entry.isFile()) { continue; }
            const lower = entry.name.toLowerCase();
            if (!lower.endsWith('.agent.md')) { continue; }

            const agentPath = path.join(agentsDir, entry.name);
            let content: string;
            try {
                content = await fs.promises.readFile(agentPath, 'utf8');
            } catch {
                continue;
            }
            if (isExplicitlyExcluded(content, 'user-invocable')) {
                continue;
            }

            const agentName = getAgentIdentity(content, entry.name);
            agents.push({
                name: agentName,
                filePath: path.relative(workspaceFolder.uri.fsPath, agentPath),
            });
        }
    }

    return agents.sort((a, b) => a.name.localeCompare(b.name));
}
