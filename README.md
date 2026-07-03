# Jarvis

A VS Code extension for personal project and event management.

## Features

### Explorer Sidebar

Jarvis adds a dedicated sidebar with three tree views:

- **Projects** — Displays projects from YAML files in a configurable folder, with subfolder hierarchy and folder filter
- **Events** — Displays events from YAML files, with a future-only toggle (end date ≥ today)
- **Messages** — Queued messages grouped by destination session, with manual delivery to chat sessions

Each project and event item has two inline action buttons:
- `$(go-to-file)` — Open the YAML file in the editor
- `$(comment-discussion)` — Open the agent chat session for that item

Project, Event, and Session nodes are expandable to reveal their core files (`context.md`, YAML config, and agent file if configured) as clickable children — click a file child to open it in the editor. Tooltips show the full file path.

### Heartbeat Scheduler

Cron-based job scheduling configured via YAML:
- **Script steps**: Python, PowerShell
- **Command steps**: Any VS Code command
- **Agent steps**: Single-shot LLM calls via `vscode.lm` API
- **Manual trigger**: `Jarvis: Run Heartbeat Job` from the Command Palette

### Message Queue & Session Tools

- Messages from heartbeat jobs (or any source) are queued and displayed in the Messages tree
- **Send to Chat**: Deliver messages to named VS Code chat sessions
- **Open Session**: Browse and open named sessions via QuickPick (`Jarvis: Open Chat Session`)
- **LM Tools**: `#listSessions` for session discovery, `#sendMessage`/`#receiveMessage` for inter-session messaging (`#sendToSession`/`#readMessage` are deprecated aliases, still functional but scheduled for removal), `#jarvis_listSessionEntities` to list entities in a session (includes `agent` field), `#jarvis_createSession` to programmatically create a new session folder with optional `agent` binding — validated against user-invocable agents in `.github/agents/` (idempotent, headless; both require `jarvis.sessions.enabled`)

### Message Flow Diagram (add-on: Jarvis Message Flow)

An interactive D3 chord-diagram visualization of inter-agent message traffic, sourced from the message queue (most recent 500 entries). Open it via the icon button on the Messages tree-view title bar or the Command Palette. Nodes are sessions/actors, edges are message counts; a "Fog of Time" slider fades older activity, and hovering an edge shows message count, time range, and a sample. Clicking an actor node opens that actor's chat.

The diagram opens as an editor tab in the same fixed column used for entity docs (`context.md`, YAML config, agent files) — if you only have 2 editor columns open, both the diagram and entity docs share that second column until you open a third.



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
