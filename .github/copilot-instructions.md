# Jarvis — The Actor Harness

## Overall Goal

We want to reach a goal together — for example, delivering a clean change. On
the way there we make mistakes; that's normal. Whenever anyone — user, agent,
or agent↔agent — spots something that doesn't fit (a discrepancy in agent
files, prompts, assumptions, or code), bring it up, let's discuss. We stay
positive and goal-oriented and find our way together through GitHub issues,
compile errors, and whatever else gets thrown in our path. Wir schaffen das. 😉

## Project Overview

Jarvis is a VS Code extension that turns chat **sessions** and agent
**personas** into **actors** — persistent entities with their own identity,
memory (`context.md`), inter-actor messaging, and scheduling. Jarvis is the
harness, not the assistant itself: the actors it hosts do the actual work —
the syspilot actors handle software engineering, the PIM actors handle email,
calendar, and tasks.

Entities like projects and events are actor variants — an `actor.yaml` with a
few extra properties — stored as YAML in configurable folders.

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

## Development Workflow

We work in increments called **changes**. Each change produces three artifacts
in `docs/changes/`:

- `<name>.md` — Change Document
- `tst-<name>.md` — Test Protocol
- `val-<name>.md` — Verification Report

## Git Workflow

Before any git operation, read and follow the `syspilot.branching` skill — it
is the source of truth for branching, commits, and merges.

## Session ↔ Actor Binding

A session re-activates an **actor** — a persistent entity with its own folder
and `context.md` under `.jarvis/actors/`. Reading its own `context.md` to
resume its identity is exactly what makes it an actor rather than a plain
agent (a stateless persona). The actor's `actor.yaml` may bind it to an agent
persona.

At session start, read your actor's `context.md` (ask the user which actor if
unknown). It is your persistent, stick-note memory — keep it short and
scannable:

- long-lived, action-oriented bullets only; one concise line each
- replace outdated bullets, don't append logs
- before writing, ask: "Will this still matter in 2 weeks?" — if no, skip
- a topic past ~5 bullets → move to a dedicated file, leave a one-line pointer

## Delegation Discipline

When invoking a specialist agent (subagent), communicate the goal, the rationale, and the inputs the specialist cannot find themselves. The specialist owns their own workflow; trust it, and re-state only what they cannot already know from their own agent file or `copilot-instructions.md`.