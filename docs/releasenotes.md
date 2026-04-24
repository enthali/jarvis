# Release Notes

## v0.5.3

*2026-04-24*

Tree search, syspilot tooling update, and documentation fixes.

### New Features

- **tree-search**: QuickPick-based search for Projects and Events tree views — press the search icon in the title bar to fuzzy-filter all items and reveal the selected entry in the tree. Uses `TreeView.reveal()` with `getParent()` support. Search is unfiltered (hidden items remain searchable). Two new commands: `jarvis.searchProjects`, `jarvis.searchEvents`.

### Fixes & Docs

- **doc-traceability-fix**: Fixed traceability inconsistencies for `US_EXP_FEATURETOGGLE` and `US_EXP_NAMESORT`.
- **tree-search-spec-fix**: Aligned `SPEC_EXP_SEARCH_CMD` and `SPEC_EXP_SEARCH_MANIFEST` with implementation (QM review MEDIUM-1/2, LOW-3/4).

### Infra & Tooling

- **syspilot v0.5.0**: Agent refactoring, skills, prompts — updated from syspilot 0.4.0 to 0.5.0.
- Housekeeping: `.mcp.json` configuration, research docs, workflow fix, workspace file removed.

## v0.5.0

*2026-04-15*

Outlook Tasks and Categories integration with a generic PIM layer, auto-category creation for new entities, and spec alignment fixes.

### New Features

- **outlook-categories**: Generic PIM category layer (`ICategoryProvider`, `DomainCache<T>`, `CategoryService`, `jarvis_category` LM+MCP tool, Categories sidebar view, `jarvis.pim.showCategories` setting). Outlook COM provider (`OutlookCategoryProvider`) plugs in as the first concrete provider, gated by `jarvis.outlookEnabled`. Architecture decouples generic PIM (theme `PIM`) from Outlook-specific code (theme `OLK`) for future provider extensibility.
- **outlook-tasks**: Outlook Tasks integration inline in the Project/Event tree (`ITaskProvider`, `TaskService`, `DomainCache<Task[]>`, `OutlookTaskProvider`, inline task nodes, `TaskEditorProvider` Custom Editor, `jarvis_task` LM+MCP tool). Tasks linked to projects/events via Outlook `categories` field. Gated by `jarvis.outlookEnabled === true` AND `jarvis.outlook.tasks.enabled === true`. "Uncategorized Tasks" section at top of tree for unlinked tasks.
- **new-entity-category**: When creating a new project or event via `jarvis.newEntity`, an Outlook category is automatically created using the pattern `"Project: <name>"` / `"Event: <name>"`, guarded by `jarvis.outlookEnabled` and `categoryService.hasProviders()`. Errors never block entity creation.

### Fixes & Docs

- **outlook-tasks-spec-fix**: Docs-only alignment of `REQ_PIM_TASKEDITOR` and `SPEC_PIM_TASKEDITOR` with the actual implemented Task Editor UI — auto-save replaces explicit Save button, "Open in Outlook" button removed. `val-outlook-tasks.md` updated accordingly.

## v0.4.0

*2026-04-13*

New user features: grouped settings, feature-toggled sidebar views, context menu actions, chronological event sorting, and a new listProjects tool.

### New Features

- **list-projects**: New `jarvis_listProjects` LM+MCP tool — exposes all scanned projects via `registerDualTool()`, available to both VS Code language models and MCP clients.
- **settings-grp**: Settings reorganized into 6 categories (Projects, Events, Heartbeat, Messages, MCP Server, Updates). Sidebar views for Events, Messages, and Heartbeat are now feature-toggled — hidden when their corresponding setting is empty. `populateDefaultPaths()` writes defaults at activation so Messages and Heartbeat appear automatically.
- **context-actions**: Three context menu actions on project and event nodes — Reveal in Explorer, Reveal in File Explorer, and Open in Terminal. Delegates to VS Code built-in commands.
- **event-sort**: Events are sorted chronologically by `dates.start` instead of alphabetically. Labels show date prefix: `2025-06-24 — Event Name`.

### Fixes

- Zod `.describe()` added to all MCP tool parameter schemas for better client-side documentation.
- MCP client config moved to `testdata/.vscode/mcp.json`.

### Docs & Infra

- Role renaming: Developer → Change Manager, QA-Engineer → Quality Manager.
- QA doc improvements: new REQ/SPEC artifacts (`REQ_DEV_ACTIVATION`, `REQ_DEV_DISPOSAL`, `SPEC_EXP_RESCANBRIDGE`), 21 link hygiene fixes.
- Git workflow updated to develop-based squash-merge strategy.

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
