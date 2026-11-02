# Jarvis — The Actor Harness

Jarvis is a VS Code extension that turns chat **sessions** and agent
**personas** into **actors** — persistent entities with their own identity,
memory (`context.md`), inter-actor messaging, and scheduling. Jarvis itself is
the harness, not the assistant: the actors it hosts do the work — the syspilot
actors handle software engineering, and PIM provides Outlook categories and
tasks. Actors are stored as `actor.yaml` files in configurable folders.

> **Jarvis PIM: EXPERIMENTAL.** Email triage is not part of a Jarvis PIM
> release; it remains in an externally maintained skill.
>
> **Jarvis Syspilot: EXPERIMENTAL — DO NOT USE.** The upcoming syspilot 0.10
> release will break compatibility.

## Getting Started

New to Jarvis? Follow the [Getting Started guide](docs/user%20guides/getting-started.md).

## Agent Host Migration (Unreleased)

Actor chats and message delivery now use VS Code's Agent Host, not the old chat UI. Click an Actor in ACTORS to open or create its chat. In the Agents window, enable **Created In > jarvis-core** to see chats created by Jarvis. **Mark done** archives a chat; Jarvis restores it on use. Only **Delete** removes it.

Update project-owned prompts, skills and instructions before upgrading: use `jarvis_sendMessage(session, text)` without `senderSession`, and `jarvis_receiveMessage()` without `destination`. The sender and inbox come from the calling Actor chat. `jarvis_listActors()` returns names and descriptions; `jarvis_createActorSession(actor)` finds or creates a chat. These Agent Host tools replace the former package-prefixed messaging references and are not exposed through MCP. Prompt injection and its command are removed, as is `jarvis.messages.notificationTemplate`.

See the [migration guide](docs/user%20guides/getting-started.md#updating-to-the-agent-host-path) for the removed tools and provisioned-instruction update. Module tools and views in the Agents window remain unverified; a provisioned hook currently blocks tool calls on machines without `node`. Hook removal is a separate follow-up, not part of this migration.

## Version 0.31.1

This patch fixes conflicting CLI tool references without adding a new capability.
Chat tool references now use their package namespace, for example
`#jarvis_core_createActor` and `#jarvis_pim_task`. Update existing prompts to use
the new references; registered tool IDs and MCP tool names are unchanged.

The release includes the PIM and Syspilot readiness warnings above and removes
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

- **Actors & sessions** — persistent entities with their own `context.md` memory and Agent Host chats. The ACTORS view shows direct child folders with `actor.yaml`; activity states (Error, Waiting, Working) take priority over the recording mark, then the unread-mail icon. See [Core getting started](packages/core/README.md#getting-started) for folders and chat behavior.
- **Heartbeat scheduler** — cron-based jobs running scripts (Python, PowerShell), VS Code
  commands, or single-shot LLM agent steps. Each agent step must name `vendor` and `model`
  (the model ID); there is no default or fallback, so existing steps without both fail until
  updated. Use **Jarvis: List Language Models** or `jarvis_listModels` to inspect the pairs
  currently offered to Jarvis by VS Code.
- **Messaging, reminders & LM tools** — an inter-actor inbox with automatic or manual delivery announcements, reminders, and the four Agent Host tools described above. Extension tools remain available under package-prefixed references such as `#jarvis_core_listModels`, `#jarvis_core_createActor`, and `#jarvis_kanban_openKanbanBoard` while the chat is open in a window running Jarvis.
- **Module asset provisioning** — `provisionModuleAssets(context, config)` lets any add-on self-install its own bundled Copilot Skills/Instructions into the workspace's `.github/skills/` and `.github/instructions/` on activation; namespaced, idempotent, and orphan-safe, without touching user-authored or other modules' files
- **Actor kernel instructions** — core ships three bundled Copilot Instructions files (`jarvis-actor.kernel`, `jarvis-actor.memory`, `jarvis-actor.authoring`) that teach AI assistants the Jarvis actor behavioral contract; opt-in via `jarvis.actor.autoProvision: true`

### Jarvis PIM

- **Categories & tasks** — Outlook-backed category and task integration

### Jarvis Recorder

- Meeting recording from microphone and speaker output with local speech recognition (Windows only); live transcript view, transcript file in the Actor's folder, and a message to the Actor when it is complete

### Jarvis MCP

- Exposes tools in the Jarvis engine registry, including those contributed by installed modules, over MCP HTTP transport. The four Agent Host tools are not in that registry and are not exposed.

### Jarvis Message Flow

- **Chord diagram** — an interactive D3 visualization of message traffic between actors, with a time-lens slider; click an actor node to open its chat
- **Message history** — a browsable list of all messages behind the diagram

### Jarvis Kanban

- **Convention-based discovery** — place a `kanban.yaml` (or `<name>.kanban.yaml`) in an Actor folder; a board button appears automatically in the explorer tree
- **Read-only webview renderer** — GitHub-Projects-shaped schema (`fields[]` + `items[]`; `status` field drives columns); open via tree button or Command Palette **Jarvis: Open Kanban Board**
- **LM tools** — `jarvis_createKanbanBoard(boardName?, ownerName?)` creates the YAML file; `jarvis_verifyKanbanSchema(boardName?, ownerName?)` validates it; `jarvis_openKanbanBoard(boardName?, ownerName?)` opens the webview; `jarvis_updateKanbanItem(itemId, changes, boardName?, ownerName?)` updates an existing item by its stable integer ID; `jarvis_addKanbanItem`, `jarvis_deleteKanbanItem`, `jarvis_listKanbanItems` (compact by default; `details: true` returns full cards), `jarvis_listKanbanFilterValues` (status values and labels with card counts, for building filters), and `jarvis_updateKanbanFields` provide full board management (add, delete, query, and update field definitions)

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
