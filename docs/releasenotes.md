# Release Notes

## v0.1.0

*2026-04-09*

First productive release — Jarvis is now a fully functional tool to build personal assistants. It can now support to manage projects and events in VS Code.

### New Features

- **subfolder-view**: Hierarchical folder tree — projects and events in subfolders appear as collapsible folder nodes with unlimited nesting
- **folder-filter**: Project folder filter — toggle folder visibility via QuickPick, filter state persists across sessions
- **event-filter**: Future events toggle — one-click filter to show only upcoming events (end date ≥ today)
- **open-yaml**: Open YAML from tree — inline `$(go-to-file)` button on project/event items opens the YAML file in the editor
- **heartbeat**: Heartbeat scheduler — cron-based job scheduling via YAML config, supports Python scripts, PowerShell scripts, and VS Code commands
- **background-agent**: Agent step type — single-shot LLM calls via `vscode.lm` API as heartbeat job steps, reads prompts from files
- **send-to-chat**: Message queue — messages from heartbeat jobs are queued and displayed in a new Messages tree view, with manual delivery to named chat sessions via `state.vscdb` session lookup
- **session-tools**: Session management — Open Session QuickPick command, `#listSessions` LM tool for session discovery, inline agent session button on project/event items

### Infrastructure

- **persona-cleanup**: Standardized persona names across all User Stories (Jarvis User / Jarvis Developer)
- **test-data**: Versioned test dataset in `testdata/` for reproducible UAT
- **sphinx-compat**: Sphinx config migrated to sphinx-needs 8.0.0 API
- **project-scan**: Load real YAML data with background scanner (replaced dummy data)
- **syspilot-update**: Updated syspilot tooling v0.2.3 → v0.3.0 → v0.3.1 → v0.4.0

## v0.0.1

*2026-04-01*

- **hello-explorer**: Minimal VS Code extension with Activity Bar icon, sidebar panel, and two TreeView groups (Projects & Events) with dummy data
- **manual-test**: Manual UAT step in Implement Agent workflow — launches Extension Development Host, presents test checklist, persists test protocols
- **release-setup**: Release pipeline — GitHub Pages deployment for Sphinx docs, GitHub Release with `.vsix` package on `v*` tag push
- **theme-cleanup**: Reorganize syspilot IDs — move Developer Tooling specs from `EXP` to new `DEV` theme
