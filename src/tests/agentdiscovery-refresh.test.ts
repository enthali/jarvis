/**
 * Focused test for QM/VE Finding 2 (retire-legacy-actor-kinds):
 * REQ_ACTOR_AGENT_DISCOVERY AC-6 forbids a persistent cache — agent-file
 * discovery must run on demand so a newly added or changed agent file is
 * seen on the very next Actor file-tree resolution, without needing an
 * extension-host restart.
 */
import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscodeMock from 'vscode';
import { resolveAgentFile } from '../../packages/core/src/engine/actors/actorFiles';

const roots: string[] = [];

afterEach(() => {
    for (const root of roots.splice(0)) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

describe('REQ_ACTOR_AGENT_DISCOVERY AC-6 / SPEC_ACTOR_FILES: no persistent cache', () => {
    it('a newly added agent file is resolved on the very next call, no restart needed', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-agentdiscovery-'));
        roots.push(root);
        (vscodeMock.workspace as any).workspaceFolders = [{ uri: { fsPath: root } }];

        // Before the file exists: no agent file resolves (fail-open).
        expect(await resolveAgentFile('syspilot.fresh')).toBeUndefined();

        // Add the agent file after the first (empty) lookup.
        const agentsDir = path.join(root, '.github', 'agents');
        fs.mkdirSync(agentsDir, { recursive: true });
        fs.writeFileSync(path.join(agentsDir, 'syspilot.fresh.agent.md'), '---\nname: syspilot.fresh\n---\nBody.');

        // A cached first-lookup would still report undefined; on-demand discovery must not.
        const resolved = await resolveAgentFile('syspilot.fresh');
        expect(resolved).toBe(path.join(agentsDir, 'syspilot.fresh.agent.md'));
    });

    it('a removed agent file stops resolving on the next call', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-agentdiscovery-'));
        roots.push(root);
        (vscodeMock.workspace as any).workspaceFolders = [{ uri: { fsPath: root } }];
        const agentsDir = path.join(root, '.github', 'agents');
        fs.mkdirSync(agentsDir, { recursive: true });
        const agentFile = path.join(agentsDir, 'syspilot.temp.agent.md');
        fs.writeFileSync(agentFile, '---\nname: syspilot.temp\n---\nBody.');

        expect(await resolveAgentFile('syspilot.temp')).toBe(agentFile);

        fs.rmSync(agentFile);
        expect(await resolveAgentFile('syspilot.temp')).toBeUndefined();
    });
});
