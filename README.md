# Jarvis — The Actor Harness

Jarvis 0.34.0 builds on 0.32.0, the first release with **Actors, messaging and Kanban in
VS Code's Agents window**, alongside the editor experience. Several Actor chats
can be open side by side. Tree markers, Flow, PIM and Recorder in the Agents
window are on the roadmap; there is no plan yet.

Jarvis turns chat sessions and agent personas into persistent **actors** with
identity, memory (`context.md`), messaging and scheduling. It is the harness,
not the assistant: the actors do the work. Actors are stored as `actor.yaml`
files in configurable folders.

> **Jarvis PIM: EXPERIMENTAL.** Email triage is not part of a Jarvis PIM
> release; it remains in an externally maintained skill.
>
> **Jarvis Syspilot is retired.** Jarvis no longer develops, builds or ships
> `jarvis-syspilot`. An installed copy is neither updated nor removed by Jarvis;
> uninstall it in VS Code. The syspilot framework itself is not affected.

## Getting Started

New to Jarvis? Follow the [Getting Started guide](docs/user%20guides/getting-started.md).

## Version 0.34.0

Jarvis now requires **VS Code 1.144.0 or later**; update VS Code before installing. See the [release notes](docs/releasenotes.md).

- **Codespaces.** Jarvis can find the VS Code Server Agent Host in a GitHub Codespace, so Actor messaging can work there. The finalized code was not separately deployed end-to-end in a Codespace; macOS, WSL and SSH are not verified. The [Core guide](docs/user%20guides/core.md#agent-host-environments-and-known-limits) lists what was checked.
- **Heartbeat `powershell` steps** try `pwsh`, then `powershell`, and report an error if neither is found.

## Version 0.33.0

Changed defaults and one retirement; see the [release notes](docs/releasenotes.md).

- **Actor instructions are now provisioned by default.** `jarvis.actor.autoProvision` defaults to `true`, so workspaces without an explicit setting receive the three bundled Actor instruction files on the first activation after upgrade. Set it to `false` to opt out; Jarvis then removes the files it provisioned. Old hyphenated copies (`jarvis-actor-kernel.instructions.md` and siblings) are not removed and would run the same rules twice; save any local edits and delete them by hand, see the [migration note](docs/user%20guides/getting-started.md#updating-with-actor-instructions-on-by-default).
- **Categories are opt-in.** `jarvis.outlook.categories.enabled` replaces `jarvis.pim.showCategories` and defaults to `false`; the old setting is not migrated. See the [PIM guide](docs/user%20guides/pim.md).
- **Kanban tools** reject a supplied `id` with an accurate message and require `labels` to be an array of strings; list results leave out non-string labels. See the [Kanban guide](docs/user%20guides/kanban.md).
- **Jarvis Syspilot is retired** (notice above); uninstall an installed copy manually.

## Version 0.32.0

Actor chats and message delivery now use VS Code's Agent Host, not the old chat UI. Click an Actor in ACTORS to open or create its chat. In the Agents window, enable **Created In > jarvis-core** to see chats created by Jarvis. **Mark done** archives a chat; Jarvis restores it on use. Only **Delete** removes it.

Update project-owned prompts, skills and instructions before upgrading: use `jarvis_sendMessage(session, text)` without `senderSession`, and `jarvis_receiveMessage()` without `destination`. The sender and inbox come from the calling Actor chat. `jarvis_listActors()` returns names and descriptions; `jarvis_createActorSession(actor)` finds or creates a chat. These Agent Host tools replace the former package-prefixed messaging references and are not exposed through MCP. Prompt injection and its command are removed, as is `jarvis.messages.notificationTemplate`.

See the [migration guide](docs/user%20guides/getting-started.md#updating-to-the-agent-host-path) for the removed tools and provisioned-instruction update, and the [Core guide](docs/user%20guides/core.md) for the observed Agents window behavior and full limitations. The same workspace in two windows is not tested and probably does not work; remote windows are not served.

Jarvis removes agent hooks and the hook-based **Recently Touched Files** feature without replacement in 0.32.0; Recently Touched Files is on the roadmap for a future version. On activation it cleans up the five known legacy hook files in the first workspace folder, leaving other files and old touched-files data untouched; see the [Core guide](docs/user%20guides/core.md). Actor tool calls need no external `node` command. Node/npm remain development and packaging prerequisites.

The MCP server is now off by default. Existing installations without an explicit `jarvis.mcp.enabled` value no longer start it automatically; set the value to `true` to opt in. Explicit settings remain effective.

## Version 0.31.1

This patch fixes conflicting CLI tool references without adding a new capability.
Chat tool references now use their package namespace, for example
`#jarvis_core_createActor` and `#jarvis_pim_task`. Update existing prompts to use
the new references; registered tool IDs and MCP tool names are unchanged.

The release included the PIM and Syspilot readiness warnings and removes
the deprecated Jarvis Suite from the repository and future distribution.
Existing Suite installations are not removed and receive no further Suite updates;
install individual extensions instead. Historical release assets remain available.
The obsolete Change generator and template are also removed; contributors use
the [Change Contract process](docs/Jarvis%20Contracts/change.md).

## Modules

Jarvis ships as a suite of VS Code extensions — one core harness plus optional
capability modules. Install only what you need.

| Module | Role |
|--------|------|
| **Jarvis Core** | The harness: actors and sessions, inter-actor messaging, reminders, heartbeat scheduler, and the engine |
| **Jarvis PIM** | Personal Information Manager: categories and tasks |
| **Jarvis Recorder** | Meeting recording with local speech recognition (Windows only): the transcript lands in the Actor's folder and the Actor is told |
| **Jarvis MCP** | MCP server exposing Jarvis tools over HTTP transport |
| **Jarvis Message Flow** | Interactive visualization and history of inter-actor message traffic |
| **Jarvis Kanban** | Read-only kanban board renderer — convention-based YAML discovery, schema validation, and webview rendering |

## Features

### Jarvis Core

- **Actors & sessions** — persistent entities with their own `context.md` memory and Agent Host chats. In the editor window, the ACTORS view shows direct child folders with `actor.yaml`; activity states (Error, Waiting, Working) take priority over the recording mark, then the unread-mail icon. See [Core getting started](packages/core/README.md#getting-started) for folders and chat behavior.
- **Heartbeat scheduler** — cron-based jobs running scripts (Python, PowerShell), VS Code
  commands, or single-shot LLM agent steps. Each agent step must name `vendor` and `model`
  (the model ID); there is no default or fallback, so existing steps without both fail until
  updated. Use **Jarvis: List Language Models** or `jarvis_listModels` to inspect the pairs
  currently offered to Jarvis by VS Code.
- **Messaging, reminders & LM tools** — an inter-actor inbox with automatic or manual delivery announcements, reminders, and the four Agent Host tools described above. Extension tools remain available under package-prefixed references such as `#jarvis_core_listModels`, `#jarvis_core_createActor`, and `#jarvis_kanban_openKanbanBoard` while the chat is open in a window running Jarvis.
- **Module asset provisioning** — `provisionModuleAssets(context, config)` lets any add-on self-install its own bundled Copilot Skills/Instructions into the workspace's `.github/skills/` and `.github/instructions/` on activation; namespaced, idempotent, and orphan-safe, without touching user-authored or other modules' files
- **Actor kernel instructions** — core ships three bundled Copilot Instructions files (`jarvis-actor.kernel`, `jarvis-actor.memory`, `jarvis-actor.authoring`) that teach AI assistants the Jarvis actor behavioral contract; provisioned by default, opt out via `jarvis.actor.autoProvision: false`

### Jarvis PIM

- **Categories & tasks** — Outlook-backed category and task integration on Windows with Outlook Classic

### Jarvis Recorder

- Meeting recording from microphone and speaker output with local speech recognition (Windows only); live transcript view, transcript file in the Actor's folder, and a message to the Actor when it is complete

### Jarvis MCP

- Opt-in MCP HTTP transport (`jarvis.mcp.enabled: true`) exposes tools in the Jarvis engine registry, including those contributed by installed modules. The four Agent Host tools are not in that registry and are not exposed.

### Jarvis Message Flow

- **Chord diagram** — an interactive D3 visualization of message traffic between actors, with a time-lens slider; click an actor node to open its chat
- **Message history** — a browsable list of all messages behind the diagram

### Jarvis Kanban

- **Convention-based discovery** — place a `kanban.yaml` (or `<name>.kanban.yaml`) in an Actor folder; a board button appears automatically in the explorer tree
- **Read-only webview renderer** — GitHub-Projects-shaped schema (`fields[]` + `items[]`; `status` field drives columns); open via tree button or Command Palette **Jarvis: Open Kanban Board**; read-only swimlanes by field or label, and a Refresh button in the editor title bar
- **LM tools** — `jarvis_createKanbanBoard(boardName?, ownerName?)` creates the YAML file; `jarvis_verifyKanbanSchema(boardName?, ownerName?)` validates it; `jarvis_openKanbanBoard(boardName?, ownerName?)` opens the webview; `jarvis_updateKanbanItem(itemId, changes, boardName?, ownerName?)` updates an existing item by its stable integer ID; `jarvis_addKanbanItem`, `jarvis_deleteKanbanItem`, `jarvis_listKanbanItems` (compact by default; `details: true` returns full cards; filters by status, labels and declared fields), `jarvis_listKanbanFilterValues` (status values, single-select field options and labels with card counts, for building filters), and `jarvis_updateKanbanFields` provide full board management (add, delete, query, and update field definitions)

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `jarvis.scanInterval` | Background rescan interval in minutes (0 = disabled) | 2 |
| `jarvis.heartbeatInterval` | Scheduler tick interval in seconds | 60 |
| `jarvis.gitignore.autoManage` | Maintain a marked region in the workspace `.gitignore` listing Jarvis transient runtime paths. Set to `false` to remove the region. | `true` |
| `jarvis.releaseNotes.showOnUpdate` | Open the release notes in the editor the first time a newly installed Jarvis version runs. | `true` |
| `jarvis.actor.autoProvision` | Provision bundled Actor Kernel Copilot Instructions files into `.github/instructions/`. Installed by default; set to `false` to remove them. | `true` |

## Installation

**Via GitHub Releases** (recommended):
1. Go to [Releases](https://github.com/enthali/Jarvis/releases)
2. Download `jarvis-<version>.vsix`
3. In VS Code: `Extensions` → `...` → `Install from VSIX...`

**From source**:
```bash
npm install
npm run package
# Then install the generated jarvis-*.vsix via VS Code
```

## Development

```bash
npm install        # Install dependencies
npm run compile    # TypeScript build
npm run watch      # Watch mode
npm run package    # Build .vsix
```

Press **F5** in VS Code to launch the Extension Development Host.

## Documentation

This project uses [syspilot](https://github.com/enthali/syspilot) for requirements engineering.
Published at: https://enthali.github.io/jarvis

- User Stories: `docs/userstories/`
- Requirements: `docs/requirements/`
- Design Specs: `docs/design/`
- Change Documents: `docs/changes/`

## License

MIT
