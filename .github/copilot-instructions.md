# Jarvis — Project Memory

## Project Overview

Jarvis is a VS Code extension that serves as a personal assistant for managing projects and events.
Projects and events are stored as YAML files in configurable folders.

## Tech Stack

- **Language**: TypeScript
- **Platform**: VS Code Extension API
- **Documentation**: Sphinx + sphinx-needs (syspilot v0.2.3)
- **Build**: Node.js / npm

## Project Structure

```
src/                    — Extension source (TypeScript)
resources/              — Static assets (SVG icons)
schemas/                — JSON Schemas for project/event YAML files
.vscode/                — launch.json (F5 = Run Extension), tasks.json
docs/
  userstories/          — User Stories (WHY)
  requirements/         — Requirements (WHAT)
  design/               — Design Specs (HOW)
  traceability/         — Cross-level tracing
  changes/              — Change Docs, Test Protocols (tst-*), Verify Reports (val-*)
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
- Themes: `EXP` (Explorer UI), `CFG` (Config), `PRJ` (Projects), `EVT` (Events), `REL` (Release)
- Example: `US_EXP_SIDEBAR`, `REQ_EXP_TREEVIEW`, `SPEC_EXP_PROVIDER`

Full conventions: `docs/namingconventions.rst`

## Development Commands

```bash
npm run compile          # TypeScript build
npm run lint             # ESLint
python -m sphinx -b html docs docs/_build/html -W --keep-going   # Docs build
```

Press **F5** in VS Code to launch the Extension Development Host.

## Development Workflow

```
syspilot.change → syspilot.implement → syspilot.verify → syspilot.memory
```

Each change produces three artifacts in `docs/changes/`:
- `<name>.md` — Change Document (approved by Change Agent)
- `tst-<name>.md` — Test Protocol (created by Implement Agent after manual UAT)
- `val-<name>.md` — Verification Report (created by Verify Agent)

## Key Schemas

- **Projects**: `name` ("Project: XYZ"), `summary`, `stakeholders`, `externalStatus`, `internalStatus`
- **Events**: `name` ("Event: XYZ"), `location`, `dates.start/end`, `status`, `role`, `summary`

JSON Schemas: `schemas/project.schema.json`, `schemas/event.schema.json`
