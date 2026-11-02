# Jarvis MCP

MCP (Model Context Protocol) HTTP transport for Jarvis.

This extension exposes all tools registered with the Jarvis engine
(`enthali.jarvis`) over a local MCP HTTP server. It dynamically enumerates
tools from the engine's registry and serves their input schemas from the
VS Code `languageModelTools` manifest declarations.

The four Agent Host tools (`jarvis_sendMessage`, `jarvis_receiveMessage`,
`jarvis_listActors`, `jarvis_createActorSession`) are not in the engine registry
and are not exposed through MCP. Move external Actor wake-up scripts to a
heartbeat step; see the [migration guide](../../docs/user%20guides/getting-started.md#updating-to-the-agent-host-path).

## Configuration

| Setting            | Default | Description                              |
|--------------------|---------|------------------------------------------|
| `jarvis.mcp.enabled` | `false` | Enable the embedded MCP server (localhost only). |
| `jarvis.mcpPort`     | `31415` | Port for the embedded MCP server.        |

## Requirements

- `enthali.jarvis` (Jarvis core) must be installed.
