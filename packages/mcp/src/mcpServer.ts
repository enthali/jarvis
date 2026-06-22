// Implementation: SPEC_MOD_MCP_PKG
// MCP HTTP server — serves tools dynamically from a provider function.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import * as http from 'http';
import { z } from 'zod';
import type * as vscode from 'vscode';

/**
 * Descriptor for a tool to be served via MCP.
 */
export interface McpToolDescriptor {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>; // JSON Schema from manifest
    invoke(args: Record<string, unknown>): Promise<object>;
}

/**
 * A provider that enumerates tools dynamically (called per MCP list/call).
 */
export type ToolProvider = () => McpToolDescriptor[];

let mcpServer: McpServer | undefined;
let httpServer: http.Server | undefined;

/**
 * Convert a JSON Schema "properties" object into a zod record for the MCP SDK.
 * Only handles string, number, integer, boolean, array, object at the top level.
 */
function jsonSchemaToZod(jsonSchema: Record<string, unknown>): Record<string, z.ZodTypeAny> {
    const properties = (jsonSchema as { properties?: Record<string, { type?: string; description?: string }> }).properties;
    const required = (jsonSchema as { required?: string[] }).required ?? [];
    if (!properties) { return {}; }

    const result: Record<string, z.ZodTypeAny> = {};
    for (const [key, prop] of Object.entries(properties)) {
        let field: z.ZodTypeAny;
        switch (prop.type) {
            case 'number':
            case 'integer':
                field = z.number();
                break;
            case 'boolean':
                field = z.boolean();
                break;
            case 'array':
                field = z.array(z.any());
                break;
            case 'object':
                field = z.record(z.string(), z.any());
                break;
            default:
                field = z.string();
                break;
        }
        if (prop.description) {
            field = field.describe(prop.description);
        }
        if (!required.includes(key)) {
            field = field.optional() as z.ZodTypeAny;
        }
        result[key] = field;
    }
    return result;
}

/**
 * Start the MCP HTTP server on 127.0.0.1:port.
 * Tools are resolved dynamically from the provider on each request.
 */
export async function startMcpServer(
    port: number,
    log: vscode.LogOutputChannel,
    toolProvider: ToolProvider
): Promise<void> {
    // Create HTTP server (stateless mode — new McpServer per request for fresh tool list)
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
            // Fresh server per request — enumerates tools dynamically
            const server = new McpServer({ name: 'jarvis', version: '0.7.0' });
            const tools = toolProvider();
            for (const tool of tools) {
                const zodSchema = jsonSchemaToZod(tool.inputSchema);
                server.tool(tool.name, tool.description, zodSchema, async (args) => {
                    const result = await tool.invoke(args as Record<string, unknown>);
                    return {
                        content: [{ type: 'text' as const, text: JSON.stringify(result) }]
                    };
                });
            }

            const reqTransport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
            res.on('close', () => { reqTransport.close(); });
            await server.connect(reqTransport);
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

    mcpServer = undefined; // not needed in stateless mode
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
