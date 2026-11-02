# Jarvis MCP

Jarvis MCP (`enthali.jarvis-mcp`) exposes all tools registered with the Jarvis engine, including those from installed packages, over a local MCP (Model Context Protocol) HTTP server, so external clients can use them. It requires [Jarvis Core](core.md).

The server listens on localhost only. Tool input schemas come from the `languageModelTools` declarations of the installed extensions.

The Agent Host tools `jarvis_sendMessage`, `jarvis_receiveMessage`, `jarvis_listActors`, and `jarvis_createActorSession` are not registered with the engine and are not offered through MCP. External scripts that wake an Actor must use a heartbeat step instead of MCP messaging; see the migration section in [Getting Started](getting-started.md).

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `jarvis.mcp.enabled` | `true` | Start the embedded MCP server when the Jarvis MCP extension is active. Disable to keep the extension installed with the server off. |
| `jarvis.mcpPort` | `31415` | Port for the embedded MCP server. |
