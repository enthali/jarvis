# Idea: Actor Activity Indicator in the Tree

**Status:** Idea / unscoped (user 2026-07-13)

## Background

VS Code's own chat UI shows a live activity indicator per chat session
(e.g. "working", idle, error). Jarvis's Actor tree currently shows no
equivalent — you can't tell at a glance which Actor is currently active,
which one errored out, and which are just sitting idle.

## Idea

Add a simple activity-state indicator per Actor node in the tree, driven by
the existing hooks mechanism (no new infrastructure needed — hooks already
observe session lifecycle events).

Keep it deliberately simple for a first pass — three states only:

- **Active** — the actor is currently running/processing
- **Error** — the actor's last action ended in an error
- **Inactive** — idle, nothing currently happening

Likely surfaced via a tree-item icon/badge/color on the Actor node
(decorator pattern already exists for other tree annotations, e.g. task
badges in PIM) — exact visual treatment TBD at design time.

## Why parked

Not yet scoped or designed — captured as a first-pass idea only. Needs a
proper design pass to determine: which hook events map to which state,
how state transitions/timeouts work (e.g. when does "active" fall back to
"inactive"?), and the exact visual treatment on the tree node.
