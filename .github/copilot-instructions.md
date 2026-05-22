# Jarvis — Project Memory

## Project Overview

Jarvis is a VS Code extension that serves as a personal assistant for managing projects and events.
Projects and events are stored as YAML files in configurable folders.

## Spec-Driven

This project follows a spec-driven approach (syspilot). All architecture,
requirements, and decisions live in the docs tree:

- `docs/userstories/` — User Stories (WHY)
- `docs/requirements/` — Requirements (WHAT)
- `docs/design/` — Design Specs (HOW)
- `docs/changes/` — Change Documents, Test Protocols, Verification Reports
- `docs/namingconventions.rst` — ID conventions (US_/REQ_/SPEC_, themes)

If you need to understand a feature, follow the specs. Do not duplicate spec
content here.

## Tech Stack

- TypeScript, VS Code Extension API
- Sphinx + sphinx-needs (syspilot)
- Node.js / npm; runtime dep: cron-parser

## Development Commands

```bash
npm run compile          # TypeScript build
npm run lint             # ESLint
npm run package          # Build .vsix
python -m sphinx -b html docs docs/_build/html -W --keep-going   # Docs
```

Press **F5** in VS Code to launch the Extension Development Host.

## Development Workflow

```
syspilot.cm (→ syspilot.uat) → syspilot.implement → syspilot.verify
```

Each change produces three artifacts in `docs/changes/`:

- `<name>.md` — Change Document
- `tst-<name>.md` — Test Protocol
- `val-<name>.md` — Verification Report

## Git Workflow

- `main` is protected. Only `syspilot.release` may merge into `main`.
- `develop` is the integration branch. Feature branches start from `develop`
  and squash-merge back into `develop`.
- Feature branches: `feature/<change-name>` (name matches Change Document).
- `develop` is never pushed to origin — only `main` is public.

## Session–Project Binding

Every chat session should be aware of which project it belongs to.

1. At session start, read your project's `context.md` from the project folder (e.g. `projects/project-manager/context.md`).
2. If you don't know which project this session belongs to, ask the user.
3. The `context.md` describes the role, tasks, and boundaries for this session's project. Follow it.

## Memory Considerations

In syspilot projects, workflow knowledge is part of the project and must be treated as code. Do not store workflow rules, roles, responsibilities, project decisions, or project-specific findings in Copilot Memory; keep them in the repository as they are part of the project and are versioned, reviewable, and branch-aware. User memory may only contain personal preferences that are independent of any project.