# Jarvis — Project Memory

## Project Overview

Jarvis is a VS Code extension that serves as a personal assistant for managing projects and events.
Projects and events are stored as YAML files in configurable folders.

## Tech Stack

- **Language**: TypeScript
- **Platform**: VS Code Extension API
- **Documentation**: Sphinx + sphinx-needs (syspilot v0.4.0)
- **Build**: Node.js / npm
- **Runtime dep**: cron-parser (next-run time computation for heartbeat)

## Project Structure

```
src/                    — Extension source (TypeScript)
  extension.ts          — Activation, commands (new-entity, filters, rescan, context-actions, agent sessions), populateDefaultPaths() for workspace-settings bootstrap, 6 LM+MCP tools (sendToSession, readMessage, listSessions, listProjects, registerJob, unregisterJob) via registerDualTool(), syncRescanJob() heartbeat bridge, shared LogOutputChannel "Jarvis" (structured logging with levels and module tags)
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
- Themes: `EXP` (Explorer UI), `DEV` (Developer Tooling), `CFG` (Config), `PRJ` (Projects), `EVT` (Events), `MSG` (Message Queue / Chat Sessions), `REL` (Release), `UAT` (User Acceptance Tests), `AUT` (Automation/Scheduling)
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
syspilot.change (→ syspilot.uat) → syspilot.implement → syspilot.verify → syspilot.memory
```

The Change Agent calls `syspilot.uat` as a subagent after MECE analysis to generate UAT artifacts (US_UAT_\*, REQ_UAT_\*, SPEC_UAT_\*) before handing off to implementation.

Each change produces three artifacts in `docs/changes/`:
- `<name>.md` — Change Document (approved by Change Agent)
- `tst-<name>.md` — Test Protocol (created by Implement Agent after manual UAT)
- `val-<name>.md` — Verification Report (created by Verify Agent)

Feature branches accumulate changes until a release. **Merge to `main` only at release time** via `syspilot.release`.

## Git Workflow

**`main` is protected.** Only the Release Manager (via `syspilot.release`) may commit to or merge into `main`. No other session or role may commit directly to `main` — no exceptions.

**`develop`** is the integration branch. PM and QA work here directly (roadmap, context.md, QA reports). Feature branches start from `develop` and merge back into `develop`.

Each change lives on `feature/<change-name>` (name matches Change Document).
Feature branches branch from `develop`, not from `main` or other feature branches.
Change Managers merge completed feature branches back into `develop`.
At release: the PM triggers `syspilot.release` which merges `develop` into `main` and tags.

## Key Schemas

- **Projects**: `name` (free-form string), `summary`, `stakeholders`, `externalStatus`, `internalStatus`
- **Events**: `name` (free-form string), `location`, `dates.start/end`, `status`, `role`, `summary`

JSON Schemas: `schemas/project.schema.json`, `schemas/event.schema.json`

## Session–Project Binding

Every chat session should be aware of which project it belongs to.

1. At session start, read your project's `context.md` from the project folder (e.g. `projects/project-manager/context.md`).
2. If you don't know which project this session belongs to, ask the user.
3. The `context.md` describes the role, tasks, and boundaries for this session's project. Follow it.
