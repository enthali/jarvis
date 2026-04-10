# Test Protocol: mcp-server

**Date**: 2026-04-10
**Change Document**: docs/changes/mcp-server.md
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_MSG_MCPSERVER | AC-1, AC-7 | MCP server starts on port 31415, status bar shows `$(plug) Jarvis MCP: 31415` | PASS |
| 2 | REQ_MSG_MCPSERVER | AC-2, AC-6 | Server uses `@modelcontextprotocol/sdk` with `StreamableHTTPServerTransport`, binds to `127.0.0.1` | PASS |
| 3 | REQ_MSG_MCPSERVER | AC-3 | All 3 tools (sendToSession, readMessage, listSessions) registered via `registerDualTool()` | PASS |
| 4 | REQ_MSG_MCPSERVER | AC-4 | MCP handlers return plain JSON objects (not LanguageModelToolResult) | PASS |
| 5 | REQ_MSG_MCPSERVER | AC-5 | `deactivate()` calls `stopMcpServer()` | PASS |
| 6 | REQ_MSG_MCPSERVER | AC-3 | VS Code MCP client connects via `http://127.0.0.1:31415` and lists tools | PASS |
| 7 | REQ_MSG_MCPSERVER | AC-3 | Cross-session messaging works: send message from MCP client, receive in other session | PASS |
| 8 | REQ_CFG_MCPPORT | AC-1, AC-2 | Settings `jarvis.mcpPort` (default 31415) and `jarvis.mcpEnabled` (default true) present in package.json | PASS |
| 9 | REQ_CFG_MCPPORT | AC-3 | `mcpEnabled: false` → server does not start, status bar hidden | PASS |
| 10 | REQ_MSG_MCPSERVER | AC-3 | VS Code MCP client also connects via `http://localhost:31415` | PASS |

## Notes

- UAT performed by developer in Extension Development Host
- Initial 500 error was caused by shared transport (stateless mode requires per-request transport) — fixed in commit `3e47659`
- VS Code workspace MCP config: `"url": "http://127.0.0.1:31415"` with `"type": "http"`
- Both `127.0.0.1` and `localhost` URLs confirmed working
- Logging outputs `[MCP]` tags to shared "Jarvis" LogOutputChannel
