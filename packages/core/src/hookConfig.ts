// Implementation: SPEC_HOOK_CONFIG
// Requirements: REQ_HOOK_INTAKE

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const HOOKS_DIR = '.github/hooks';
const CONFIG_FILE = 'jarvis-hooks.json';
const BRIDGE_FILE = 'bridge.mjs';
const PORT_FILE = 'port';

const ALL_EVENTS = [
    'SessionStart',
    'UserPromptSubmit',
    'PreToolUse',
    'PostToolUse',
    'PreCompact',
    'SubagentStart',
    'SubagentStop',
    'Stop',
];

const BRIDGE_SOURCE = `// Jarvis Hook Bridge — stdlib only, always continue: true
// Reads hook event JSON from stdin, POSTs to the port in .jarvis/hooks/port
// Never blocks the agent — exit 0, {"continue": true} always.

import { readFileSync } from 'fs';
import { resolve } from 'path';
import http from 'http';

function main() {
    const hooksDir = resolve('.github', 'hooks');
    const portFile = resolve(hooksDir, 'port');

    let port;
    try {
        port = parseInt(readFileSync(portFile, 'utf-8').trim(), 10);
    } catch {
        // Port file missing — log and continue
        console.error('[Jarvis Hook Bridge] Port file not found, continuing');
        process.stdout.write(JSON.stringify({ continue: true }));
        return;
    }

    let input = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => { input += chunk; });
    process.stdin.on('end', () => {
        if (!input.trim()) {
            process.stdout.write(JSON.stringify({ continue: true }));
            return;
        }

        const postData = input;
        const options = {
            hostname: '127.0.0.1',
            port,
            path: '/hooks',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },
        };

        const req = http.request(options, res => {
            res.on('data', () => {});
            res.on('end', () => {
                process.stdout.write(JSON.stringify({ continue: true }));
            });
        });

        req.on('error', () => {
            // Transport error — swallow, always continue
            process.stdout.write(JSON.stringify({ continue: true }));
        });

        req.write(postData);
        req.end();
    });
}

main();
`;

export async function installHookConfig(workspaceRoot: string, log: vscode.LogOutputChannel): Promise<void> {
    const hooksDir = path.join(workspaceRoot, HOOKS_DIR);
    const configPath = path.join(hooksDir, CONFIG_FILE);
    const bridgePath = path.join(hooksDir, BRIDGE_FILE);

    try {
        // 1. Ensure hooks directory exists
        fs.mkdirSync(hooksDir, { recursive: true });

        // 2. Write bridge.mjs (always overwrite to keep in sync)
        fs.writeFileSync(bridgePath, BRIDGE_SOURCE, 'utf-8');

        // 3. Write jarvis-hooks.json (always regenerate to keep in sync with spec)
        const hookEntries: Record<string, unknown> = {};
        for (const event of ALL_EVENTS) {
            hookEntries[event] = [{ type: 'command', command: `node .github/hooks/${BRIDGE_FILE}`, timeout: 10 }];
        }
        const hooksConfig = { hooks: hookEntries };

        fs.writeFileSync(configPath, JSON.stringify(hooksConfig, null, 2), 'utf-8');

        // 4. Merge into workspace settings (chat.hookFilesLocations)
        const settingsPath = path.join(workspaceRoot, '.vscode', 'settings.json');
        let settings: Record<string, unknown> = {};
        try {
            const existingSettings = fs.readFileSync(settingsPath, 'utf-8');
            settings = JSON.parse(existingSettings);
        } catch { /* no existing settings */ }

        const hookLocations = (settings['chat.hookFilesLocations'] as Record<string, boolean>) ?? {};
        hookLocations[HOOKS_DIR] = true;
        settings['chat.hookFilesLocations'] = hookLocations;

        fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');

        log.info('[HookConfig] Self-install complete: config, bridge, workspace settings merged');
    } catch (err) {
        log.warn(`[HookConfig] Self-install failed (best-effort): ${err}`);
        // Best-effort — never throw
    }
}

export async function uninstallHookConfig(workspaceRoot: string, log: vscode.LogOutputChannel): Promise<void> {
    const hooksDir = path.join(workspaceRoot, HOOKS_DIR);
    const filesToRemove = [CONFIG_FILE, BRIDGE_FILE, PORT_FILE];

    try {
        for (const file of filesToRemove) {
            const filePath = path.join(hooksDir, file);
            try {
                fs.unlinkSync(filePath);
            } catch (err: unknown) {
                if ((err as NodeJS.ErrnoException).code !== 'ENOENT') { throw err; }
            }
        }

        // Remove chat.hookFilesLocations entry from .vscode/settings.json
        const settingsPath = path.join(workspaceRoot, '.vscode', 'settings.json');
        try {
            const raw = fs.readFileSync(settingsPath, 'utf-8');
            const settings: Record<string, unknown> = JSON.parse(raw);
            const hookLocations = settings['chat.hookFilesLocations'] as Record<string, boolean> | undefined;
            if (hookLocations && HOOKS_DIR in hookLocations) {
                delete hookLocations[HOOKS_DIR];
                if (Object.keys(hookLocations).length === 0) {
                    delete settings['chat.hookFilesLocations'];
                } else {
                    settings['chat.hookFilesLocations'] = hookLocations;
                }
                fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
            }
        } catch {
            // settings.json missing or unparseable — nothing to clean
        }

        log.info('[HookConfig] Teardown complete: managed hook files removed');
    } catch (err) {
        log.warn(`[HookConfig] Teardown failed (best-effort): ${err}`);
    }
}

export function getHooksDir(workspaceRoot: string): string {
    return path.join(workspaceRoot, HOOKS_DIR);
}

export function getPortFile(workspaceRoot: string): string {
    return path.join(workspaceRoot, HOOKS_DIR, PORT_FILE);
}