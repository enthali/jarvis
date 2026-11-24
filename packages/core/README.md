# Jarvis — Personal Assistant for VS Code

Jarvis Core 0.34.0 is the actor harness for Visual Studio Code. Since 0.32.0 it supports Actors, messaging and Kanban in the Agents window, where several Actor chats can be open side by side, as well as in the editor. Actor definitions, memory and scheduling live in folders you control.

## Features

- **Actors** — Persistent personas with their own `context.md` and agent file; Jarvis creates or repairs the agent file with the Actor name and memory path when needed
- **Messaging** — Actor inboxes with automatic or manual announcements through VS Code's Agent Host; message content is read by a tool, never inserted into a prompt
- **Reminders** — Set one-off, time-scheduled reminders; a due reminder is queued as a message to the Actor and announced under the normal delivery setting, with no VS Code notification of its own
- **Heartbeat** — Periodic background jobs with a live status view in the activity bar
- **Engine API** — Extension point for add-ons (PIM, Recorder, MCP) to register tools and to self-provision their bundled Copilot Skills/Instructions into `.github/` via `provisionModuleAssets`

## Add-ons

| Extension | Description |
|-----------|-------------|
| [Jarvis PIM](https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-pim) | Categories and task editing |
| [Jarvis Recorder](https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-recorder) | Meeting recording with local speech recognition (Windows only) |
| [Jarvis MCP](https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-mcp) | Model Context Protocol server exposing Jarvis tools to AI agents |
| [Jarvis Message Flow](https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-flow) | Interactive D3 chord-diagram visualization of inter-agent message traffic |
| [Jarvis Kanban](https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-kanban) | Convention-based kanban boards — read-only webview renderer with chat-driven updates |

## Getting Started

1. Install **Jarvis** from the VS Code Marketplace
2. Open the Jarvis view in the activity bar (sidebar icon)
3. Configure the data folder paths in **Settings → Extensions → Jarvis**:
   - `jarvis.actors.folder` — workspace-relative or absolute root for the dedicated **ACTORS** tree (default `.jarvis/actors`). Only direct child folders containing `actor.yaml` appear; nested folders are not scanned. Move or delete folders using the filesystem; there is no Jarvis archive feature.
   - `jarvis_listActors()` returns Actor names and short descriptions. Each Actor's own agent file carries its identity; its persona is referenced from `context.md`. Creating an Actor does not prompt for an agent.
4. Jarvis will scan your folders and populate the tree views automatically

## Actor Chats and Messaging

Actor chats require an available, authenticated VS Code Agent Host; there is no fallback to the old chat UI. Click an Actor in ACTORS or choose **Open** to find its chat or create it. Messages and Message Flow open an existing Actor chat only; delivery never opens a tab. Jarvis reuses an existing editor tab or opens a pinned tab in the first editor group. In the Agents window, tick **Created In > jarvis-core** to show Jarvis-created chats. **Mark done** archives a chat; Jarvis restores it on opening or delivery. Only **Delete** removes it.

The Jarvis client publishes and approves its own four tools:

| Call | Purpose |
|------|---------|
| `jarvis_sendMessage(session, text)` | Queue a message for the recipient Actor; the sender comes from the calling chat. |
| `jarvis_receiveMessage()` | Read and remove the calling Actor's oldest message; repeat until `remaining` is `0`. |
| `jarvis_listActors()` | List Actor names and short descriptions. |
| `jarvis_createActorSession(actor)` | Find or create an Actor chat and return its session address. |

Remove `senderSession` and `destination` from send and receive calls in existing instructions and skills. These tools are not exposed through MCP. The old session-list, read-message, send-to-session and prompt-injection tools, the Inject Prompt command and `jarvis.messages.notificationTemplate` are removed. Provisioning refreshes bundled instructions when enabled; project-owned copies require manual updates.

Extension tools retain references such as `#jarvis_core_listJobs` and reach an Actor chat while it is open in a window running Jarvis. The client serves the first workspace folder only; cross-workspace routing is outside this MVP. The same workspace in two windows is not tested and probably does not work. While disconnected, announcements wait.

In GitHub Codespaces, the User exercised an installed discovery prototype, and Agent Host discovery, Actor messaging and opening Actor chats worked (2026-11-19); the finalized code was compared with it but not separately deployed end-to-end. Replies, Dev Tunnels and the Agents window connected to a Codespace were outside that validation. On Windows, the connection and a message exchange were checked in the Windows Sandbox (VS Code 1.144.0, 2026-11-19). macOS, WSL and SSH were not verified.

In the editor window, activity icons come from the Agent Host: red cross for Error, blue question mark for Waiting, spinner for Working, none for Idle. Activity takes priority over the recording mark, then the mail icon.

## Agents Window and Known Limits

The User observed Actor chats, messaging and the Kanban board working in the Windows Sandbox on 2026-11-03. Flow (message view and log) cannot be opened there yet. Jarvis features offered through the status bar or a tree do not work there: ACTORS activity/mail markers, the PIM mail notification in the tree, and Recorder, which has no UI that can be triggered there. Tree markers, Flow, PIM and Recorder support there is on the roadmap; there is no plan yet.

The manual Agent Host scenarios and upgrade cleanup with old hook files were not run in the validation of 0.32.0, and no later run is recorded. See the [Core guide](../../docs/user%20guides/core.md) for the full limitations.

## Upgrading from a Hook-Based Version

Agent hooks and the hook-based **Recently Touched Files** category, its diff/remove/cleanup actions and the time-window setting are removed without replacement in 0.32.0; Recently Touched Files is on the roadmap for a future version. Actor activity still comes from the Agent Host; recording and mail indicators in the editor window are unchanged. Actor tool calls need no external `node` command; Node/npm are still used to build and package the extensions.

On activation, Jarvis removes only `.github/hooks/jarvis-hooks.json`, `jarvis-bridge.mjs`, `jarvis-port`, `bridge.mjs` and `port` in that directory in the first workspace folder. No setting is needed. The directory, other files and old `.jarvis/state/touched-files/` data remain; that data is no longer read. Cleanup failures are logged and retried at the next activation. Existing `jarvis.hooks.autoInstall` and `jarvis.touchedFiles.windowDays` values are ignored.

Full migration details are in the [Getting Started guide](../../docs/user%20guides/getting-started.md#updating-to-the-agent-host-path).

The MCP server is off by default since 0.32.0, including for upgrades without an explicit setting. Set `jarvis.mcp.enabled` to `true` to opt in.

## Requirements

- VS Code 1.144.0 or later; Actor chats additionally require Agent Host support. Live evidence covers Windows on 1.143.1 and clean Actor startup on 1.144.0.

## Source & Issues

- GitHub: <https://github.com/enthali/Jarvis>
- Issues: <https://github.com/enthali/Jarvis/issues>
