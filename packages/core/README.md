# Jarvis — Personal Assistant for VS Code

Jarvis is a personal assistant extension for Visual Studio Code that helps you manage projects, events, reminders, and sessions — all stored as simple YAML files in folders you control.

## Features

- **Actors** — Track your Copilot chat sessions and jump back to context quickly
- **Messaging** — Pass messages between Copilot sessions via a simple queue
- **Reminders** — Set cron-based or one-off reminders with VS Code notifications
- **Heartbeat** — Periodic background jobs with a live status view in the activity bar
- **Engine API** — Extension point for add-ons (PIM, Recorder, MCP) to register new entity kinds and tools, and to self-provision their bundled Copilot Skills/Instructions into `.github/` via `provisionModuleAssets`

## Add-ons

| Extension | Description |
|-----------|-------------|
| [Jarvis PIM](https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-pim) | Project & event management with task tracking |
| [Jarvis Recorder](https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-recorder) | Audio recording with Whisper transcription |
| [Jarvis MCP](https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-mcp) | Model Context Protocol server exposing Jarvis tools to AI agents |
| [Jarvis Message Flow](https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-flow) | Interactive D3 chord-diagram visualization of inter-agent message traffic |
| [Jarvis Kanban](https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-kanban) | Convention-based kanban boards — read-only webview renderer with chat-driven updates |
| [Jarvis Syspilot](https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-syspilot) | syspilot install/update lifecycle detection and actor-guided setup |

## Getting Started

1. Install **Jarvis** from the VS Code Marketplace
2. Open the Jarvis view in the activity bar (sidebar icon)
3. Configure the data folder paths in **Settings → Extensions → Jarvis**:
   - `jarvis.sessionsFolder` — folder containing Actor entities. New Actors are created as `actor.yaml` (current naming convention); pre-existing `session.yaml` folders are still fully recognized and supported side by side, permanently — no migration required. To convert an old-named actor to the new convention, run **Jarvis: Migrate Session to Actor** from the Command Palette (optional, one actor at a time)
   - `jarvis.heartbeatFolder` — folder for heartbeat job files
4. Jarvis will scan your folders and populate the tree views automatically

## Requirements

- VS Code 1.95.0 or later

## Source & Issues

- GitHub: <https://github.com/enthali/Jarvis>
- Issues: <https://github.com/enthali/Jarvis/issues>
