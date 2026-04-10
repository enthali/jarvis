// Implementation: SPEC_MSG_MCPSERVER
// Requirements: REQ_MSG_MCPSERVER

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import * as http from 'http';
import { z } from 'zod';
import type * as vscode from 'vscode';

// Accumulated tool registrations (collected before server starts)
const toolRegistry = new Map<string, {
    description: string;
    schema: Record<string, z.ZodTypeAny>;
    handler: (args: Record<string, unknown>) => Promise<object>;
}>();

let mcpServer: McpServer | undefined;
let httpServer: http.Server | undefined;

/**
 * Register a tool on the MCP server. Must be called before startMcpServer().
 */
export function registerMcpTool(
    name: string,
    description: string,
    inputSchema: Record<string, z.ZodTypeAny>,
    handler: (args: Record<string, unknown>) => Promise<object>
): void {
    toolRegistry.set(name, { description, schema: inputSchema, handler });
}

/**
 * Start the MCP HTTP server on 127.0.0.1:port.
 */
export async function startMcpServer(port: number, log: vscode.LogOutputChannel): Promise<void> {
    // Read version from package.json
    let version = '0.0.0';
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        version = require('../package.json').version;
    } catch { /* use fallback */ }

    mcpServer = new McpServer({ name: 'jarvis', version });

    // Register all accumulated tools
    for (const [name, { description, schema, handler }] of toolRegistry) {
        mcpServer.tool(name, description, schema, async (args) => {
            const result = await handler(args as Record<string, unknown>);
            return {
                content: [{ type: 'text' as const, text: JSON.stringify(result) }]
            };
        });
    }

    // Create HTTP server (stateless mode — new transport per request)
    httpServer = http.createServer(async (req, res) => {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: { code: -32000, message: 'Method not allowed' },
                id: null
            }));
            return;
        }
        try {
            const reqTransport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
            res.on('close', () => { reqTransport.close(); });
            await mcpServer!.connect(reqTransport);
            await reqTransport.handleRequest(req, res);
        } catch (err: unknown) {
            log.error(`[MCP] request error: ${err instanceof Error ? err.message : String(err)}`);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    error: { code: -32603, message: 'Internal server error' },
                    id: null
                }));
            }
        }
    });

    await new Promise<void>((resolve, reject) => {
        httpServer!.listen(port, '127.0.0.1', () => {
            log.info(`[MCP] server started on 127.0.0.1:${port}`);
            resolve();
        });
        httpServer!.on('error', (err) => {
            log.error(`[MCP] server failed to start: ${err.message}`);
            reject(err);
        });
    });
}

/**
 * Stop the MCP server gracefully.
 */
export async function stopMcpServer(): Promise<void> {
    if (httpServer) {
        httpServer.close();
        httpServer = undefined;
    }
    if (mcpServer) {
        await mcpServer.close();
        mcpServer = undefined;
    }
}
