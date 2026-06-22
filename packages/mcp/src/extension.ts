// Implementation: SPEC_MOD_MCP_PKG, SPEC_ENG_TOOLREGISTRY
// MCP extension — serves the aggregate tool registry over MCP HTTP transport.

import * as vscode from 'vscode';
import type { JarvisCoreApi, ToolDescriptor } from 'jarvis';
import { startMcpServer, stopMcpServer } from './mcpServer';
import type { McpToolDescriptor } from './mcpServer';

let mcpStatusBar: vscode.StatusBarItem | undefined;
let serverRunning = false;

/**
 * Build the tool descriptor list dynamically from the engine registry
 * + VS Code languageModelTools metadata (for input schemas).
 */
function buildToolDescriptors(api: JarvisCoreApi): McpToolDescriptor[] {
    const registeredTools: ToolDescriptor[] = api.getRegisteredTools();
    const lmTools = vscode.lm.tools; // all declared languageModelTools across extensions

    return registeredTools.map(tool => {
        // Find the manifest-declared inputSchema for this tool
        const lmTool = lmTools.find(t => t.name === tool.name);
        const inputSchema = (lmTool?.inputSchema as Record<string, unknown> | undefined) ?? { type: 'object', properties: {} };

        return {
            name: tool.name,
            description: tool.description,
            inputSchema,
            invoke: async (args: Record<string, unknown>) => {
                const options: vscode.LanguageModelToolInvocationOptions<unknown> = {
                    input: args,
                    toolInvocationToken: undefined as any,
                };
                const tokenSource = new vscode.CancellationTokenSource();
                try {
                    const result = await api.invokeTool(tool.name, options, tokenSource.token);
                    // Extract text from LanguageModelToolResult
                    const parts: string[] = [];
                    for (const part of result.content) {
                        if (part instanceof vscode.LanguageModelTextPart) {
                            parts.push(part.value);
                        }
                    }
                    const text = parts.join('');
                    // Try to parse as JSON, otherwise wrap
                    try {
                        return JSON.parse(text);
                    } catch {
                        return { result: text };
                    }
                } finally {
                    tokenSource.dispose();
                }
            }
        };
    });
}

async function start(api: JarvisCoreApi, log: vscode.LogOutputChannel): Promise<void> {
    if (serverRunning) { return; }
    const port = vscode.workspace.getConfiguration('jarvis').get<number>('mcpPort', 31415);
    await startMcpServer(port, log, () => buildToolDescriptors(api));
    serverRunning = true;
    if (!mcpStatusBar) {
        mcpStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    }
    mcpStatusBar.text = `Jarvis MCP: ${port}`;
    mcpStatusBar.tooltip = 'Jarvis MCP Server';
    mcpStatusBar.show();
}

async function stop(): Promise<void> {
    if (!serverRunning) { return; }
    await stopMcpServer();
    serverRunning = false;
    mcpStatusBar?.hide();
}

export function activate(context: vscode.ExtensionContext): void {
    const log = vscode.window.createOutputChannel('Jarvis MCP', { log: true });
    context.subscriptions.push(log);

    const coreExt = vscode.extensions.getExtension('enthali.jarvis');
    if (!coreExt) {
        log.error('[MCP] Jarvis core extension (enthali.jarvis) not found');
        return;
    }

    const api = coreExt.exports as JarvisCoreApi | undefined;
    if (!api || api.version !== 1) {
        log.error('[MCP] Jarvis core API version mismatch or unavailable');
        return;
    }

    // Start if enabled (default true — install = enable, but user can disable without uninstalling)
    const enabled = vscode.workspace.getConfiguration('jarvis').get<boolean>('mcp.enabled', true);
    if (enabled) {
        start(api, log).catch(err => {
            log.error(`[MCP] Failed to start: ${err instanceof Error ? err.message : String(err)}`);
        });
    }

    // React to enabled + port changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async e => {
            if (e.affectsConfiguration('jarvis.mcp.enabled') || e.affectsConfiguration('jarvis.mcpPort')) {
                const en = vscode.workspace.getConfiguration('jarvis').get<boolean>('mcp.enabled', true);
                if (en) {
                    await stop();
                    await start(api, log);
                } else {
                    await stop();
                }
            }
        })
    );

    context.subscriptions.push({ dispose: () => { stop(); } });
}

export async function deactivate(): Promise<void> {
    await stop();
}
