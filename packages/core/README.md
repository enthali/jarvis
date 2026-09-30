# Jarvis — Personal Assistant for VS Code

Jarvis is a personal assistant extension for Visual Studio Code that helps you manage actors, reminders, and sessions — all stored as simple YAML files in folders you control.

## Features

- **Actors** — Persistent personas with their own context, session binding, messaging, reminders, and heartbeat activation
- **Messaging** — Pass messages between Copilot sessions via a simple queue
- **Reminders** — Set cron-based or one-off reminders with VS Code notifications
- **Heartbeat** — Periodic background jobs with a live status view in the activity bar
- **Engine API** — Extension point for add-ons (PIM, Recorder, MCP) to register tools and to self-provision their bundled Copilot Skills/Instructions into `.github/` via `provisionModuleAssets`

## Add-ons

| Extension | Description |
|-----------|-------------|
| [Jarvis PIM](https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-pim) | Categories and task editing |
| [Jarvis Recorder](https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-recorder) | Audio recording with Whisper transcription |
| [Jarvis MCP](https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-mcp) | Model Context Protocol server exposing Jarvis tools to AI agents |
| [Jarvis Message Flow](https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-flow) | Interactive D3 chord-diagram visualization of inter-agent message traffic |
| [Jarvis Kanban](https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-kanban) | Convention-based kanban boards — read-only webview renderer with chat-driven updates |
| [Jarvis Syspilot](https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-syspilot) | syspilot install/update lifecycle detection and actor-guided setup |

## Getting Started

1. Install **Jarvis** from the VS Code Marketplace
2. Open the Jarvis view in the activity bar (sidebar icon)
3. Configure the data folder paths in **Settings → Extensions → Jarvis**:
   - `jarvis.actors.folder` — workspace-relative or absolute root for the dedicated **ACTORS** tree (default `.jarvis/actors`). Only direct child folders containing `actor.yaml` appear; nested folders are not scanned. Move or delete folders using the filesystem; there is no Jarvis archive feature.
   - `jarvis_listActors` and `jarvis_whoAmI` include the absolute `actor.yaml` path as `id`.
   - `jarvis.heartbeatFolder` — folder for heartbeat job files
4. Jarvis will scan your folders and populate the tree views automatically

## Requirements

- VS Code 1.95.0 or later

## Source & Issues

- GitHub: <https://github.com/enthali/Jarvis>
- Issues: <https://github.com/enthali/Jarvis/issues>
