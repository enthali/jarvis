# Jarvis — The Actor Harness

Jarvis is a VS Code extension that turns chat **sessions** and agent
**personas** into **actors** — persistent entities with their own identity,
memory (`context.md`), inter-actor messaging, and scheduling. Jarvis itself is
the harness, not the assistant: the actors it hosts do the work — the syspilot
actors handle software engineering, the PIM actors handle email, calendar, and
tasks. Actors are stored as `actor.yaml` files in configurable folders.

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

- **Actors & sessions** — persistent entities with their own `context.md` memory. Each Actor's own agent file contains two Jarvis identity lines (name and memory path); Jarvis creates or repairs them when needed, without an agent picker. The ACTORS view shows direct child folders with `actor.yaml`. See [Core getting started](packages/core/README.md#getting-started) for folder and tool-ID behavior.
- **Heartbeat scheduler** — cron-based jobs running scripts (Python, PowerShell), VS Code
  commands, or single-shot LLM agent steps, configured in the fixed workspace file
  `.jarvis/heartbeat.yaml`. Each agent step must name `vendor` and `model`
  (the model ID); there is no default or fallback, so existing steps without both fail until
  updated. Use **Jarvis: List Language Models** or `jarvis_listModels` to inspect the pairs
  currently offered to Jarvis by VS Code.
- **Messaging, reminders & LM tools** — an inter-actor message queue, reminders, and tools like `#listActors`, `#listModels`, `#sendMessage`, `#receiveMessage`, `#createActor`, `#injectPrompt`, `#createKanbanBoard`, `#verifyKanbanSchema`, and `#openKanbanBoard`
- **Prompt injection** — inject any text or slash-command (e.g. `/compact`) into a named actor's session via the `jarvis_injectPrompt` LM tool or the **Jarvis: Inject Prompt** command; spawns the session automatically if none exists. Useful for bulk operations such as compacting all actors after a CR:
  ```
  jarvis_injectPrompt(actor="Change Manager", text="/compact")
  ```
- **Module asset provisioning** — `provisionModuleAssets(context, config)` lets any add-on self-install its own bundled Copilot Skills/Instructions into the workspace's `.github/skills/` and `.github/instructions/` on activation; namespaced, idempotent, and orphan-safe, without touching user-authored or other modules' files
- **Actor kernel instructions** — core ships three bundled Copilot Instructions files (`jarvis-actor.kernel`, `jarvis-actor.memory`, `jarvis-actor.authoring`) that teach AI assistants the Jarvis actor behavioral contract; opt-in via `jarvis.actor.autoProvision: true`

### Jarvis PIM

- **Categories & tasks** — Outlook-backed category and task integration

### Jarvis Recorder

- Meeting recording from microphone and speaker output with local speech recognition (Windows only); live transcript view, transcript file in the Actor's folder, and a message to the Actor when it is complete

### Jarvis MCP

- Exposes all registered Jarvis tools — including those contributed by installed modules — over MCP HTTP transport for external clients

### Jarvis Message Flow

- **Chord diagram** — an interactive D3 visualization of message traffic between actors, with a time-lens slider; click an actor node to open its chat
- **Message history** — a browsable list of all messages behind the diagram

### Jarvis Kanban

- **Convention-based discovery** — place a `kanban.yaml` (or `<name>.kanban.yaml`) in an Actor folder; a board button appears automatically in the explorer tree
- **Read-only webview renderer** — GitHub-Projects-shaped schema (`fields[]` + `items[]`; `status` field drives columns); open via tree button or Command Palette **Jarvis: Open Kanban Board**
- **LM tools** — `jarvis_createKanbanBoard`, `jarvis_verifyKanbanSchema`, `jarvis_openKanbanBoard`, `jarvis_updateKanbanItem`, `jarvis_addKanbanItem`, `jarvis_deleteKanbanItem`, `jarvis_listKanbanItems`, and `jarvis_updateKanbanFields` create, inspect, and manage boards. Supply `ownerName` explicitly for every Kanban tool.

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `jarvis.scanInterval` | Background rescan interval in minutes (0 = disabled) | 2 |
| `jarvis.heartbeatInterval` | Scheduler tick interval in seconds | 60 |
| `jarvis.hooks.autoInstall` | Auto-install hook bridge files in `.github/hooks/`. Set to `false` to remove managed files and opt out of hook management. | `true` |
| `jarvis.gitignore.autoManage` | Maintain a marked region in the workspace `.gitignore` listing Jarvis transient runtime paths. Set to `false` to remove the region. | `true` |
| `jarvis.releaseNotes.showOnUpdate` | Open the release notes in the editor the first time a newly installed Jarvis version runs. | `true` |
| `jarvis.touchedFiles.windowDays` | Rolling window in days — only files touched within this window are shown in Recently Touched Files (0 = no limit). | `0` |
| `jarvis.actor.autoProvision` | Provision bundled Actor Kernel Copilot Instructions files into `.github/instructions/`. Set to `true` to install; set back to `false` to remove. | `false` |

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
