# Jarvis — The Actor Harness

Jarvis runs in the VS Code editor and in VS Code's Agents window, where several
Actor chats can be open side by side. Features that are not yet available in the
Agents window are listed in the [Core guide](docs/user%20guides/core.md#agent-host-environments-and-known-limits).

Jarvis turns chat sessions and agent personas into persistent **actors** with
identity, memory (`context.md`), messaging and scheduling. It is the harness,
not the assistant: the actors do the work. Actors are stored as `actor.yaml`
files in configurable folders.

> **Jarvis PIM: EXPERIMENTAL.** Email triage is not part of a Jarvis PIM
> release; it remains in an externally maintained skill.

## Getting Started

New to Jarvis? Follow the [Getting Started guide](docs/user%20guides/getting-started.md).

## Release notes

What changed in each version, including upgrade steps, is in the [release notes](docs/releasenotes.md).

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

- **Actors & sessions** — persistent entities with their own `context.md` memory and Agent Host chats. In the editor window, the ACTORS view shows direct child folders with `actor.yaml`; activity states (Error, Waiting, Working) take priority over the recording mark, then the follow-up flag or unread-mail icon that Jarvis PIM adds. See [Core getting started](packages/core/README.md#getting-started) for folders and chat behavior.
- **Heartbeat scheduler** — cron-based jobs running scripts (Python, PowerShell), VS Code
  commands, or single-shot LLM agent steps. Each agent step must name `vendor` and `model`
  (the model ID); there is no default or fallback. Use **Jarvis: List Language Models** or `jarvis_listModels` to inspect the pairs
  currently offered to Jarvis by VS Code.
- **Messaging, reminders & LM tools** — an inter-actor inbox with automatic or manual delivery announcements, reminders, and the four Agent Host tools described above. Extension tools remain available under package-prefixed references such as `#jarvis_core_listModels`, `#jarvis_core_createActor`, and `#jarvis_kanban_openKanbanBoard` while the chat is open in a window running Jarvis.
- **Module asset provisioning** — `provisionModuleAssets(context, config)` lets any add-on self-install its own bundled Copilot Skills/Instructions into the workspace's `.github/skills/` and `.github/instructions/` on activation; namespaced, idempotent, and orphan-safe, without touching user-authored or other modules' files
- **Actor kernel instructions** — core ships three bundled Copilot Instructions files (`jarvis-actor.kernel`, `jarvis-actor.memory`, `jarvis-actor.authoring`) that teach AI assistants the Jarvis actor behavioral contract; provisioned by default, opt out via `jarvis.actor.autoProvision: false`

### Jarvis PIM

- **Categories & tasks** — Outlook-backed category and task integration on Windows with Outlook Classic
- **Actor mail indicators** — flag and mail icons on Actor nodes for pending follow-ups and unread mail in the Outlook folder of the same name under your Inbox

### Jarvis Recorder

- Meeting recording from microphone and speaker output with local speech recognition (Windows only); live transcript view, transcript file in the Actor's folder, and a message to the Actor when it is complete

### Jarvis MCP

- Opt-in MCP HTTP transport (`jarvis.mcp.enabled: true`) exposes tools in the Jarvis engine registry, including those contributed by installed modules. The four Agent Host tools are not in that registry and are not exposed.

### Jarvis Message Flow

- **Chord diagram** — an interactive D3 visualization of message traffic between actors, with a time-lens slider; click an actor node to open its chat
- **Message history** — a browsable list of all messages behind the diagram

### Jarvis Kanban

- **Convention-based discovery** — place a `kanban.yaml` (or `<name>.kanban.yaml`) in an Actor folder; click it under the Actor's **Files** category in ACTORS, or use **Jarvis: Open Kanban Board** in the Command Palette
- **Read-only webview renderer** — GitHub-Projects-shaped schema (`fields[]` + `items[]`; `status` field drives columns); open via the Actor's **Files** category in ACTORS or Command Palette **Jarvis: Open Kanban Board**; read-only swimlanes by field or label, and a Refresh button in the editor title bar
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
