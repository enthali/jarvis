# Jarvis — The Actor Harness

Jarvis is a VS Code extension that turns chat **sessions** and agent
**personas** into **actors** — persistent entities with their own identity,
memory (`context.md`), inter-actor messaging, and scheduling. Jarvis itself is
the harness, not the assistant: the actors it hosts do the work — the syspilot
actors handle software engineering, the PIM actors handle email, calendar, and
tasks. Projects and events are actor variants (an `actor.yaml` with a few extra
properties), stored as YAML in configurable folders.

## Modules

Jarvis ships as a suite of VS Code extensions — one core harness plus optional
capability modules. Install only what you need.

| Module | Role |
|--------|------|
| **Jarvis Core** | The harness: actors and sessions, inter-actor messaging, reminders, heartbeat scheduler, and the engine |
| **Jarvis PIM** | Personal Information Manager: projects, events, categories, and tasks |
| **Jarvis Recorder** | Session recording with a Whisper transcription pipeline and transcript notifications |
| **Jarvis MCP** | MCP server exposing Jarvis tools over HTTP transport |
| **Jarvis Message Flow** | Interactive visualization and history of inter-actor message traffic |

## Features

### Jarvis Core

- **Actors & sessions** — persistent entities with their own `context.md` memory, shown in an explorer sidebar and expandable to their core files and recently-touched files
- **Heartbeat scheduler** — cron-based jobs running scripts (Python, PowerShell), VS Code commands, or single-shot LLM calls
- **Messaging, reminders & LM tools** — an inter-actor message queue, reminders, and tools like `#listActors`, `#sendMessage`, `#receiveMessage`, `#createActor`, `#injectPrompt`, and `#whoAmI`
- **Prompt injection** — inject any text or slash-command (e.g. `/compact`) into a named actor's session via the `jarvis_injectPrompt` LM tool or the **Jarvis: Inject Prompt** command; spawns the session automatically if none exists. Useful for bulk operations such as compacting all actors after a CR:
  ```
  jarvis_injectPrompt(actor="Change Manager", text="/compact")
  ```

### Jarvis PIM

- **Projects & events** — loaded from YAML files in configurable folders, shown as filterable tree views with quick-open to the file or the agent chat
- **Categories & tasks** — Outlook-backed category and task integration

### Jarvis Recorder

- Session recording with a Whisper transcription pipeline and transcript notifications

### Jarvis MCP

- Exposes all registered Jarvis tools — including those contributed by installed modules — over MCP HTTP transport for external clients

### Jarvis Message Flow

- **Chord diagram** — an interactive D3 visualization of message traffic between actors, with a time-lens slider; click an actor node to open its chat
- **Message history** — a browsable list of all messages behind the diagram

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `jarvis.projectsFolder` | Absolute path to projects YAML folder | — |
| `jarvis.eventsFolder` | Absolute path to events YAML folder | — |
| `jarvis.scanInterval` | Background rescan interval in minutes (0 = disabled) | 2 |
| `jarvis.heartbeatConfigFile` | Absolute path to `heartbeat.yaml` | workspace storage |
| `jarvis.heartbeatInterval` | Scheduler tick interval in seconds | 60 |
| `jarvis.messagesFile` | Absolute path to `messages.json` | extension storage |
| `jarvis.hooks.autoInstall` | Auto-install hook bridge files in `.github/hooks/`. Set to `false` to remove managed files and opt out of hook management. | `true` |

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
Published at: https://enthali.github.io/Jarvis

- User Stories: `docs/userstories/`
- Requirements: `docs/requirements/`
- Design Specs: `docs/design/`
- Change Documents: `docs/changes/`

## License

MIT
