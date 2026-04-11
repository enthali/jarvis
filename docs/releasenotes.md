# Release Notes

## v0.3.1

*2026-04-11*

Bugfixes, new heartbeat tools, and documentation corrections.

### New Features

- **heartbeat-job-tools**: Two new LM+MCP tools (`jarvis_registerJob`, `jarvis_unregisterJob`) — exposes the existing heartbeat job registration API via `registerDualTool()`, making it available to both VS Code language models and MCP clients.

### Fixes

- **sender-fix**: `jarvis_sendToSession` now prioritises the explicit `senderSession` parameter over the ambient active-tab label, fixing agent-to-agent sender identification.
- **qa-fix-critical**: Fixed `session` → `destination` field name in REQ_AUT_JOBCONFIG AC-5; updated sidebar section count from 3 to 4 in US_UAT_SAMPLEDATA T-1.
- **qa-doc-cleanup**: Corrected `OutputChannel` → `LogOutputChannel` in 5 SPECs, moved US_EXP_AGENTSESSION to the correct file (`us_exp.rst`), clarified UAT scope overlap in US_UAT_EXPLORER.

## v0.3.0

*2026-04-10*

Six new features: scanner improvements, heartbeat UI and registration API, pull-based message inbox, structured logging, and an embedded MCP server.

### New Features

- **scanner-refresh**: Fix YAML content-change detection (tree refresh now triggers on entity data changes, not just structure), add rescan button to Projects and Events title bars, and sort tree nodes by entity `name` instead of filesystem folder name.
- **heartbeat-view**: Add a 4th tree view "Heartbeat" to the Jarvis sidebar — visualizes all jobs from `heartbeat.yaml` with job name + next execution time, step details, inline play button per job, and view-title actions to run all non-manual jobs and refresh.
- **heartbeat-register**: Job registration API (`registerJob`/`unregisterJob`) for the heartbeat scheduler — extension modules register heartbeat jobs instead of managing their own timers. `jarvis.scanInterval` changes from seconds to minutes (0 = disabled).
- **message-inbox**: Replace push-based message delivery with a pull-based inbox pattern — the Play-Button sends a single notification stub; the target session reads messages one-by-one via the new `jarvis_readMessage` LM Tool.
- **unified-logging**: Replace the heartbeat-only `OutputChannel` with a single shared `LogOutputChannel` ("Jarvis") — structured log levels (trace/debug/info/warn/error) and module tags (`[Heartbeat]`, `[MSG]`, `[Scanner]`, `[Update]`, `[MCP]`).
- **mcp-server**: Embed an MCP (Model Context Protocol) HTTP server — all existing LM Tools (`jarvis_sendToSession`, `jarvis_listSessions`, `jarvis_readMessage`) are also exposed as MCP Tools via HTTP/SSE on localhost. Dual-registration wrapper registers each tool with both `vscode.lm` and MCP simultaneously.

## v0.2.0

*2026-04-10*

Three new features: convention-file scanning model, entity creation commands, and self-update checks.

### New Features

- **proj-folders**: Switch project and event scanners to a folder-convention model — a folder containing `project.yaml` (or `event.yaml`) becomes a leaf node. EventTreeProvider gains empty-branch pruning when the future-only filter hides all events in a grouping folder.
- **new-entity**: Add `Jarvis: New Project` and `Jarvis: New Event` commands — create a convention-file folder with YAML template, trigger immediate scanner refresh, and open an agent session for the new entity.
- **self-update**: Self-update check via GitHub Releases API — queries for newer versions on activation (and via manual command), with options to view release notes or download and install the `.vsix` directly.

## v0.1.1

*2026-04-09*

Hotfix for v0.1.0 — extension failed to activate due to missing runtime dependencies.

- **Fix**: Include `node_modules/` in `.vsix` package (no bundler configured)
- **Fix**: Hide `jarvis.openAgentSession` from Command Palette (tree-item-only command)
- **Fix**: Exclude `testdata/` and `.jarvis/` from `.vsix` package
- **Fix**: Add `repository` field to `package.json`
- **Updated**: README.md rewritten to reflect v0.1.0 feature set
- **Specs**: `SPEC_REL_VSCEPKG` (`.vscodeignore` constraints), `SPEC_EXP_AGENTSESSION` (`commandPalette` hide)
- **Reqs**: `REQ_REL_VSCEPKG` AC-4, `REQ_EXP_AGENTSESSION` AC-5

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
