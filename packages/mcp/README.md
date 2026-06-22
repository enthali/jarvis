# Jarvis MCP

MCP (Model Context Protocol) HTTP transport for Jarvis.

This extension exposes all tools registered with the Jarvis engine
(`enthali.jarvis`) over a local MCP HTTP server. It dynamically enumerates
tools from the engine's registry and serves their input schemas from the
VS Code `languageModelTools` manifest declarations.

## Configuration

| Setting            | Default | Description                              |
|--------------------|---------|------------------------------------------|
| `jarvis.mcp.enabled` | `false` | Enable the embedded MCP server (localhost only). |
| `jarvis.mcpPort`     | `31415` | Port for the embedded MCP server.        |

## Requirements

- `enthali.jarvis` (Jarvis core) must be installed.
