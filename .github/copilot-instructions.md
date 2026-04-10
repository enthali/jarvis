# Jarvis — Project Memory

## Project Overview

Jarvis is a VS Code extension that serves as a personal assistant for managing projects and events.
Projects and events are stored as YAML files in configurable folders.

## Tech Stack

- **Language**: TypeScript
- **Platform**: VS Code Extension API
- **Documentation**: Sphinx + sphinx-needs (syspilot v0.4.0)
- **Build**: Node.js / npm

## Project Structure

```
src/                    — Extension source (TypeScript)
  extension.ts          — Activation, commands (new-entity, filters, agent sessions), LM tools
  yamlScanner.ts        — Convention-file scanner: folder with project.yaml/event.yaml = leaf; public rescan()
  projectTreeProvider.ts — Tree UI for projects (owns _hiddenFolders filter; contextValue: jarvisProject)
  eventTreeProvider.ts  — Tree UI for events (owns _futureOnly filter; contextValue: jarvisEvent)
  messageTreeProvider.ts — Tree UI for messages (grouped by destination session)
  messageQueue.ts       — JSON message queue: append, delete, read
  sessionLookup.ts      — Session UUID resolver via state.vscdb (sql.js)
  heartbeat.ts          — Heartbeat scheduler (cron dispatch, step executor, status bar)
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

Each change lives on `feature/<change-name>` (name matches Change Document).
Feature branches stay open until a release — **do not merge individual changes to `main`**.
At release: squash-merge all pending feature branches into `main`, then tag.

## Key Schemas

- **Projects**: `name` (free-form string), `summary`, `stakeholders`, `externalStatus`, `internalStatus`
- **Events**: `name` (free-form string), `location`, `dates.start/end`, `status`, `role`, `summary`

JSON Schemas: `schemas/project.schema.json`, `schemas/event.schema.json`
