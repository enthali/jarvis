# Jarvis — Project Memory

## Project Overview

Jarvis is a VS Code extension that serves as a personal assistant for managing projects and events.
Projects and events are stored as YAML files in configurable folders.

## Tech Stack

- **Language**: TypeScript
- **Platform**: VS Code Extension API
- **Documentation**: Sphinx + sphinx-needs (syspilot v0.5.0)
- **Build**: Node.js / npm
- **Runtime dep**: cron-parser (next-run time computation for heartbeat)

## Project Structure

```
src/                    — Extension source (TypeScript)
  extension.ts          — Activation, commands (new-entity, filters, rescan, context-actions, agent sessions, category/task rename/delete/refresh, searchProjects/searchEvents with flattenLeaves() helper), populateDefaultPaths() for workspace-settings bootstrap, 8 LM+MCP tools (sendToSession, readMessage, listSessions, listProjects, registerJob, unregisterJob, jarvis_category, jarvis_task) via registerDualTool(), syncRescanJob()+syncCategoryRefreshJob()+syncTaskRefreshJob() heartbeat bridges, shared LogOutputChannel "Jarvis" (structured logging with levels and module tags)
  pim/ICategoryProvider.ts — Category + ICategoryProvider strategy-pattern interface
  pim/DomainCache.ts    — Generic in-memory cache with refresh callback
  pim/CategoryService.ts — Provider list + DomainCache<Category[]>; getCategories/setCategory/deleteCategory/renameCategory/refresh/hasProviders
  pim/CategoryTreeProvider.ts — TreeDataProvider for Categories sidebar view (contextValue: jarvisCategory)
  pim/ITaskProvider.ts  — Task + ITaskProvider strategy-pattern interface
  pim/TaskService.ts    — Provider list + DomainCache<Task[]>; getTasks/setTask/deleteTask/refresh/hasProviders
  pim/TaskEditorProvider.ts — CustomTextEditorProvider for task details (URI: task:///task.jarvis-task?id=<encodedId>); auto-save on field change
  outlookIntegration/OutlookCategoryProvider.ts — ICategoryProvider via PowerShell COM; resolveColor() maps name content to Outlook color index; single-quote escaping
  outlookIntegration/OutlookTaskProvider.ts — ITaskProvider via PowerShell COM; JSON sanitization (strips U+0000–U+001F before JSON.parse)
  yamlScanner.ts        — Convention-file scanner: folder with project.yaml/event.yaml = leaf; content-change detection; events sorted by datesStart+name, projects by name; no own timer (rescans via heartbeat)
  projectTreeProvider.ts — Tree UI for projects (owns _hiddenFolders filter; contextValue: jarvisProject)
  eventTreeProvider.ts  — Tree UI for events (owns _futureOnly filter; label: "datesStart — name"; contextValue: jarvisEvent)
  messageTreeProvider.ts — Tree UI for messages (grouped by destination session)
  heartbeatTreeProvider.ts — Tree UI for heartbeat jobs (contextValue: heartbeatJob)
  messageQueue.ts       — JSON message queue: append, delete, read, popMessage (oldest-first pull for LM tool)
  sessionLookup.ts      — Session UUID resolver via state.vscdb (sql.js)
  heartbeat.ts          — Heartbeat scheduler (cron dispatch, step executor, status bar, registerJob/unregisterJob for heartbeat.yaml); exports HeartbeatStep, HeartbeatJob, loadJobs(), executeJob(), notifyFailure()
  updateCheck.ts        — Self-update: GitHub Releases fetch, semver compare, .vsix download + install
resources/              — Static assets (SVG icons)
schemas/                — JSON Schemas for project/event YAML files
testdata/               — Convention-file test data for manual UAT
  projects/             — alpha/project.yaml, beta/…, active/delta/…
  events/               — 2025/<date-slug>/event.yaml, 2027/…, invalid-*/…
  heartbeat/            — heartbeat.yaml + scripts/ + prompts/ for UAT (T-1..T-7)
.vscode/                — launch.json (F5 = Run Extension), tasks.json
docs/
  userstories/          — User Stories (WHY)
  requirements/         — Requirements (WHAT)
  design/               — Design Specs (HOW)
  traceability/         — Cross-level tracing
  changes/              — Change Docs, Test Protocols (tst-*), Verify Reports (val-*)
  requirements.txt      — Pinned Sphinx/docs dependencies (install before building docs)
.github/
  agents/               — syspilot agent .md files (customized for Jarvis)
  skills/               — syspilot skills
  copilot-instructions.md
.syspilot/              — syspilot scripts and templates
```

## Naming Conventions (syspilot IDs)

This is a single-project repo — **no family prefix**.

Format: `<TYPE>_<THEME>_<SHORT_SLUG>`

- `US_` = User Story, `REQ_` = Requirement, `SPEC_` = Design Spec
- Themes: `EXP` (Explorer UI), `DEV` (Developer Tooling), `CFG` (Config), `PRJ` (Projects), `EVT` (Events), `MSG` (Message Queue / Chat Sessions), `PIM` (Personal Information Manager — categories), `OLK` (Outlook integration), `REL` (Release), `UAT` (User Acceptance Tests), `AUT` (Automation/Scheduling)
- Example: `US_EXP_SIDEBAR`, `REQ_DEV_LAUNCHCONFIG`, `SPEC_REL_RELEASEACTION`, `US_AUT_HEARTBEAT`

Full conventions: `docs/namingconventions.rst`

## Development Commands

```bash
npm run compile          # TypeScript build
npm run lint             # ESLint
npm run package          # Build .vsix (jarvis-x.y.z.vsix)
python -m sphinx -b html docs docs/_build/html -W --keep-going   # Docs build
```

Press **F5** in VS Code to launch the Extension Development Host.

## Development Workflow

```
syspilot.cm (→ syspilot.uat) → syspilot.implement → syspilot.verify
```

The Change Manager (`syspilot.cm`) orchestrates the full change workflow, invoking engineers in sequence. It calls `syspilot.uat` as a subagent after MECE analysis to generate UAT artifacts (US_UAT_\*, REQ_UAT_\*, SPEC_UAT_\*) before handing off to implementation.

Each change produces three artifacts in `docs/changes/`:
- `<name>.md` — Change Document (approved by Change Manager)
- `tst-<name>.md` — Test Protocol (created by Implement Agent after manual UAT)
- `val-<name>.md` — Verification Report (created by Verify Agent)

Feature branches accumulate changes until a release. **Merge to `main` only at release time** via `syspilot.release`.

## Git Workflow

**`main` is protected.** Only the Release Manager (via `syspilot.release`) may commit to or merge into `main`. No other session or role may commit directly to `main` — no exceptions.

**`develop`** is the integration branch. PM and QA work here directly (roadmap, context.md, QA reports). Feature branches start from `develop` and merge back into `develop`.

Each change lives on `feature/<change-name>` (name matches Change Document).
Feature branches branch from `develop`, not from `main` or other feature branches.
Change Managers squash-merge completed feature branches into `develop` (`git merge --squash feature/<name>`), then commit with a short summary message.
At release: `syspilot.release` squash-merges `develop` into `main` (`git merge --squash develop`) and tags.
`develop` is never pushed to origin — only `main` is public.

## Key Schemas

- **Projects**: `name` (free-form string), `summary`, `stakeholders`, `externalStatus`, `internalStatus`
- **Events**: `name` (free-form string), `location`, `dates.start/end`, `status`, `role`, `summary`

JSON Schemas: `schemas/project.schema.json`, `schemas/event.schema.json`

## VS Code Extension Gotchas

- **When-clauses**: Boolean config values require explicit `== true` (e.g. `config.jarvis.pim.showCategories == true`); bare identifiers don't work.
- **Settings groups**: Consolidate by feature theme (e.g. PIM), not by technical layer (e.g. Outlook vs. extension internals).
- **Category naming**: No prefix is added automatically — raw user input flows to `categoryService.setCategory()`. Color is resolved by `resolveColor()` in `OutlookCategoryProvider` based on name content. YAML `name` is used as-is as the Outlook category/task match key; users own naming conventions.
- **Optional integration guard**: When calling optional integrations (e.g., category/task sync) from a primary command, wrap in try/catch and log.warn only — errors must never block the primary operation.
- **Tree status display**: Use `item.description` (string) for count badges and `item.iconPath = new vscode.ThemeIcon(icon, new vscode.ThemeColor(color))` for status color. `item.badge` does NOT exist on `TreeItem` (only on `WebviewView`).
- **CustomEditor URI**: Put the entry ID in query params, not authority — `task:///task.jarvis-task?id=<encodedId>`.
- **PowerShell JSON**: Strip U+0000–U+001F control chars before `JSON.parse()` — `ConvertTo-Json` does not escape all of them.
- **DomainCache population**: Fire-and-forget `refresh()` after provider registration — `DomainCache.get()` returns `undefined` synchronously until first refresh completes.
- **Heartbeat command registration**: If `syncXxxJob()` references a command name, that command MUST be registered via `vscode.commands.registerCommand()` — otherwise heartbeat jobs fail silently with "command not found".
- **TreeView.reveal()**: Pass the exact item object from the provider (not a reconstructed copy). The `TreeView` must be created with `canSelectMany: false` and the provider must implement `getParent()` for reveal to work correctly.

## Session–Project Binding

Every chat session should be aware of which project it belongs to.

1. At session start, read your project's `context.md` from the project folder (e.g. `projects/project-manager/context.md`).
2. If you don't know which project this session belongs to, ask the user.
3. The `context.md` describes the role, tasks, and boundaries for this session's project. Follow it.
