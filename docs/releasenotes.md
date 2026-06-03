# Release Notes

## v0.7.0 — Entity Parity (BREAKING)

*2026-06-03*

YAML is the source of truth; the chat session is an ephemeral view. This
release delivers full feature parity across the three YAML-backed entity
types (Sessions, Projects, Events), a breaking tool-surface swap, KISS
folder-naming, schema strictness, uniform UX, and a shared destination
validator.

### Breaking Changes

- **tool-surface-swap**: `jarvis_listSessions` now returns **YAML-entity
  objects** (was: chat-tab title strings). The old string-list behaviour is
  now exposed as `jarvis_listChatSessions`. Agents that relied on
  `jarvis_listSessions` returning plain title strings must be updated to call
  `jarvis_listChatSessions` instead.

### New Features

- **jarvis_listEvents**: New MCP tool returning the list of YAML-backed event
  entities, analogous to `jarvis_listSessions` for sessions.

- **jarvis_createProject / jarvis_createEvent**: New MCP tools for creating
  projects and events programmatically, analogous to `jarvis_createSession`.
  Folder names are stored verbatim (raw name 1:1, KISS — no kebab/slug
  transformation). `validateInput` enforces the same name rules as sessions.
  Existing kebab-named project/event folders remain readable without
  migration.

- **schema-strictness-option-c**: `agent` is now a required field on project
  and event schemas. `summary` is required on event schemas. Legacy YAML
  files that omit these fields **fail-open** with a warn-log rather than
  crashing — backward compatibility is preserved at runtime.

- **ux-parity**: Tree-click opens the chat in the assigned agent mode for all
  three entity types (Sessions, Projects, Events). Inline action icons (YAML,
  context.md, Recording) are now uniform across all entity tree items. The
  lazy-bind picker has been removed (user decision v11): clicking an unbound
  entity opens the default chat directly without mutating the YAML.

- **unified-openChatForEntity**: A shared `openChatForEntity()` helper
  consolidates the four chat-open call sites (`openAgentSession`, `newProject`,
  `newEvent`, `newSession`), eliminating code duplication.

- **destination-validation-union**: `jarvis_sendToSession` now accepts
  destinations from the union of {YAML-backed entities (Session/Project/Event)}
  ∪ {active VS Code chat-session titles}. Auto-delivery poll opens the chat on
  first inbound message (same path as v0.6.1).

- **shared-destination-validator**: `jarvis_sendToSession` and heartbeat job
  registration (`jarvis_registerJob`) now share a single destination-validation
  function — drift between the two validation paths is eliminated by design.

- **prompt-templates-settings-group**: Session and message prompt-template
  settings are now grouped under a dedicated "Prompt Templates" settings
  group (previously scattered under "Sessions" / "Messages").

- **3-state-agent-scanner**: The agent-mode scanner now operates in three
  states (unset / set / no-agent), making agent-binding semantics explicit and
  preventing the empty-string → undefined coercion that caused a double-prompt
  regression in v0.6.x.

- **context-menu-regex-anchored**: The `view/item/context` menu contribution
  regex is now anchored (`/^jarvis(Project|Event|Session)(\+recording)?$/`)
  to prevent Messages-Tree items from inheriting entity inline icons or
  context-menu entries.

### Known Limitations / Future Work (deferred backlog)

The following items were found during this CR and accepted by PM as
non-blocking for v0.7.0. They will be addressed in follow-up CRs:

- **F-2, F-5, F-10, F-12, F-13, F-14, F-15, F-18** — Documentation,
  cosmetic, and scanner-warning gaps.
- **B-1** — Recording-icon is a dead feature (no underlying implementation).
- **B-2** — Chat-burst race condition (edge case, low frequency).
- **B-7** — UAT: destination-disappeared edge case in auto-delivery.
- **F-17** — Positive finding: agent-validation against available chat-modes
  works correctly; tracked for a follow-up hardening CR.

---

## v0.6.1 — Agent-mode and init-prompt reliability hotfix

*2026-05-23*

Fix: agent-mode and init-prompt now applied reliably on all session-open paths.
Agent picker now uses **default-include opt-out** policy for agent discovery.

### Bug Fixes

- **session-init-prompt-on-autoopen**: Regression in v0.6.0 where auto-delivered
  sessions and tree-click-opened sessions did not pick up the agent-mode bound in
  `session.yaml`. Root cause: `workbench.action.openChat` creates a session using
  the user's currently-active mode; the post-creation `chat.open { mode }` call
  cannot retroactively change a session's mode. Fixed with the **mode-primed
  creation pattern**: the caller primes `workbench.action.chat.open { mode:
  entity.agent }` + 300 ms settle before `openNewChatEditor()`, so the new session
  is born in the bound agent mode. All three call sites patched: `openAgentSession`,
  `sendMessages` (new-session branch), and the auto-delivery poll loop (new-session
  branch). Init-prompt submission unchanged.

- **agent-discovery-default-include**: Agent picker (`pickAgentMode`) previously
  excluded any `*.agent.md` file that did not have `user-invocable: true` explicitly
  set — silently hiding newly created agent files. Policy changed to **default-include
  opt-out**: a file is included unless `user-invocable: false` is explicitly present.
  Orchestration agents (`syspilot.*` with `user-invocable: false`) are unaffected.
  Implemented via `isExplicitlyExcluded()` helper in `src/extension.ts`.

- **agent-identity-unification**: Agent identity is now resolved as
  `name?.trim() || filename-stem`, where `name` comes from the YAML frontmatter of
  the `*.agent.md` file. The picker displays and stores the frontmatter name (e.g.
  `Change Manager`) rather than the filename stem (e.g. `syspilot.cm`) when a
  `name:` key is present. Existing `session.yaml` files that store a filename-stem
  value continue to resolve correctly (backward compatible).

- **session-folder-verbatim-naming**: Session folders are now created with the
  exact name entered by the user — no slug or kebab-case transformation is applied.
  Names containing spaces (e.g. `Change Manager`) produce a folder with a literal
  embedded space. Invalid names (containing path separators, control characters, or
  Windows reserved device names) are rejected via real-time inline validation in the
  name InputBox; the OK button is disabled until a valid name is entered.


---

## v0.6.0 — Agent-aware Sessions

*2026-05-22*

Session–agent binding, heartbeat destination validation, and a spec-debt cleanup round.

### New Features

- **session-agent-binding**: Sessions can now be bound to a specific agent (chat mode) at creation time. An optional agent picker — populated from `.github/agents/*.agent.md` files with `user-invocable: true` in frontmatter — appears in the `jarvis.newSession` UI. The chosen agent is persisted as an optional `agent` field in `session.yaml`. When the session is opened, the chat editor switches directly to that agent mode. `jarvis_createSession` accepts an optional `agent` parameter; unknown agent names produce an error listing available agents. Existing `session.yaml` files without an `agent` field continue to work unchanged. Schema updated with optional `agent` field.

### Bug Fixes / Improvements

- **validate-session-destination**: `jarvis_sendToSession` now validates the destination session name before writing to the queue. Calling it with an unknown session name fails immediately with an error that includes the supplied name and the list of currently valid destination names. Valid destinations behave as before.
- **validate-heartbeat-queue-destination**: Heartbeat `queue` steps are now validated at `heartbeat.yaml` load time and at `jarvis_registerJob` invocation. Invalid destinations surface a visible notification and log warning containing job name, step index, and the invalid value. At fire time the invalid step is skipped (soft skip — remaining steps continue). `jarvis_registerJob` returns an error and refuses to persist a job with an invalid destination.

### Internal / Notes

- **spec-timing-cleanup**: Doc-only. Closed all 9 deferred MECE advisories from `chat-editor-reuse-on-session-open` (6) and `list-session-entities-gating-bug` (3). Sphinx build clean. No source changes.

## v0.5.11 — Sessions stack v1

*2026-05-20*

Sessions as a first-class entity type, reminders, a suite of new LM/MCP tools, and a disciplined agent init-prompt. Includes a **breaking settings reorganisation** — see migration notes below.

### ⚠ Breaking Changes — Settings Migration Required

The `settings-cleanup` change reorganised all Jarvis settings into logical feature groups. The following settings have been **removed or renamed**:

| Old setting | Replacement | Notes |
|---|---|---|
| `jarvis.heartbeatConfigFile` | *(removed)* | Fixed path: `.jarvis/heartbeat.yaml` in workspace root |
| `jarvis.messagesFile` | *(removed)* | Fixed path: `.jarvis/messages.json` in workspace root |
| `jarvis.mcpEnabled` | `jarvis.mcp.enabled` | Consistent dotted-group naming |
| `jarvis.outlookEnabled` | `jarvis.outlook.enabled` | Consistent dotted-group naming |
| `jarvis.projectsFolder` | `jarvis.projects.folder` | Consistent dotted-group naming |
| `jarvis.eventsFolder` | `jarvis.events.folder` | Consistent dotted-group naming |

**Default changes:**
- `jarvis.messages.logging` default flips from `false` → `true` (opt-out, not opt-in).
- `jarvis.projects.enabled` defaults to **off** (was implicitly on via empty path).
- `jarvis.events.enabled` defaults to **off** (was implicitly on via empty path).

**Action required:** Open VS Code Settings (`Ctrl+,`), search for `jarvis`, and verify your configured values. All runtime files now live under `.jarvis/` in the workspace root — add `.jarvis/` to `.gitignore` if desired.

### New Features

- **sessions-feature**: New entity type **Sessions** — a lightweight alternative to Projects for Copilot-agent and dev-session workflows. `session.yaml` schema (`name` + `summary`), `SessionTreeProvider` in the sidebar, `jarvis.sessions.enabled` toggle (default on), fixed path `.jarvis/sessions/`, `jarvis.newSession` command, and full context-menu parity. Sessions are independent of the Projects/Events toggles.
- **reminders**: New Reminders feature. `jarvis_setReminder({ text, session, deliverAt })` schedules a future message delivery via the auto-delivery pipeline. `jarvis_listReminders()` lists open reminders with remaining time. `jarvis_cancelReminder({ id })` cancels before delivery. A dedicated **Reminders** sidebar view shows open reminders. Reminders persist across restarts via `.jarvis/reminders.yaml`.
- **list-jobs-tool**: New LM/MCP tool `jarvis_listJobs()` — returns all registered heartbeat jobs with `name`, `schedule`, `enabled`, and `nextFire` (ISO timestamp or `null` for manual/paused jobs). Registered via the standard `registerDualTool` pattern.
- **agent-prompt-tuning**: Disciplined default init-prompt for new agent sessions: forces `context.md` read on open, restricts entries to Decision/Finding/Next bullets, enforces a 2-week relevance gate, and prohibits raw tool output/transient chatter. Prompt is user-configurable via `jarvis.agentSession.initPromptTemplate` (`${kind}`, `${name}`, `${contextPath}` placeholders). Auto-delivery notification is now English by default and user-configurable via `jarvis.messages.notificationTemplate` (`${count}`, `${destination}` placeholders).
- **create-session-tool**: New LM/MCP tool `jarvis_createSession` — programmatically creates a session folder with `session.yaml` and `context.md`, optionally seeds an initial message, and auto-opens the agent chat. Idempotent: existing sessions are detected and returned as success without overwriting. Gated by `jarvis.sessions.enabled`.
- **session-tree-click-behavior**: Sessions Tree default click now opens the agent-chat editor (not `context.md`). A dedicated inline `$(book)` icon on each session item opens `context.md` directly. Aligns click semantics with primary session purpose.

### Bug Fixes

- **list-session-entities-gating-bug**: `jarvis_listSessionEntities` was registered unconditionally even when `jarvis.sessions.enabled=false`. It is now gated inside the same `if (sessions.enabled)` block as `jarvis_createSession`, consistent with the static-gating ADR.
- **chat-editor-reuse-on-session-open**: Opening a new Jarvis session now always produces a fresh, dedicated chat editor. Previously `vscode-chat-session://local/new` was reused across calls, causing init-prompt and conversation to land in the wrong chat. Fixed by replacing all three call sites with `workbench.action.openChat`.

### Internal / Notes

- **tool-deregistration (rejected)**: Runtime LM tool add/remove is not achievable with the current VS Code API — `dispose()` on a tool registration does not remove it from the Tool Picker. Retained as an ADR. Static gating at activation (with reload) remains the project standard.
- **Pre-existing ESLint issue**: `ESLint couldn't find an eslint.config.(js|mjs|cjs) file` — ESLint v9 vs `.eslintrc.*` config mismatch. Pre-existing, not introduced in this release. Deferred.
- **6 deferred MECE advisories** from `chat-editor-reuse-on-session-open`: minor spec/wording improvements noted during MECE final pass; deferred to a future maintenance CR.

## v0.5.10

*2026-05-18*

Context-file auto-discovery with QuickPick, and heartbeat job pause/resume.

### New Features

- **context-file-discovery**: `jarvis.openContext` now auto-discovers `context.md` one level deep when none exists at the entity root. If multiple matches are found, a QuickPick lets the user choose. Direct hits take precedence (no picker). Hidden folders are ignored.
- **heartbeat-pause-resume**: Heartbeat jobs can be paused and resumed without removing them from `heartbeat.yaml`. Active jobs show a `$(debug-pause)` inline button; paused jobs show `$(debug-continue)` (resume + immediate run). Pause state is persisted as `enabled: false` in YAML and survives restarts. The manual `$(play)` trigger works on both active and paused jobs independently of pause state.

## v0.5.9

*2026-05-07*

Inline context.md button on tree nodes, devcontainer-compatible session lookup, and heartbeat play-button feedback toast.

### New Features

- **open-context**: New `jarvis.openContext` command adds an inline `$(notebook)` button on project and event leaf nodes. Opens `context.md` from the entity's folder directly in the VS Code text editor. Shows an info message when the file does not exist.
- **heartbeat-feedback-toast**: An info toast is shown immediately when the user manually triggers a heartbeat job via the play button, confirming the job has started.

### Fixes

- **devcontainer-session-lookup**: Session lookup now derives the `state.vscdb` path from `globalStorageUri` instead of a hard-coded relative path. Fixes an off-by-one segment error (`../..` instead of `../../..`) that broke session lookup on Windows and in Remote/Devcontainer environments.

## v0.5.8

*2026-05-05*

Hotfix: auto-delivery notification no longer resets agent/mode selection of target sessions.

### Fixes

- **auto-delivery**: Use `workbench.action.chat.open` instead of `openAgent` for notification delivery — preserves session agent mode
- **session-rename**: New sessions created by auto-delivery or manual send are `/rename`d to the destination name for future lookup

## v0.5.7

*2026-05-05*

Stable session opening and initialization.

### New Features

- **stable-session-open**: Three new helpers (`openPinnedResource`, `openNewChatEditor`, `sendPromptToFocusedAgentChat`), `/rename` after session creation, context.md initialization prompt. Replaces fragile `vscode-chat-session://local/new` approach.

## v0.5.6

*2026-05-02*

Optional audit logging for the message queue.

### New Features

- **message-logging**: New setting `jarvis.messages.logging` (boolean, default `false`). When enabled, `appendMessage()` also writes each message to an append-only `message-log.json` file (sibling to `messages.json`). The log is never cleaned up by read or delete operations, providing a persistent audit trail.

## v0.5.5

*2026-05-01*

Direct Delivery mode for message sessions — auto-deliver notifications without manual Play-button clicks.

### New Features

- **auto-delivery**: AutoDeliver-Sessions receive notifications automatically via a 5-second poll loop. New `autodelivery.json` config file (sibling to `messages.json`) stores the list of enabled session names. Messages gain a `notified` flag to prevent duplicate delivery (max 1 message per tick). The Messages tree adds an "Auto Delivery" group (⚡ icon) at root level. Enable/disable via context menu commands (`jarvis.enableAutoDelivery` / `jarvis.disableAutoDelivery`).

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
