# Idea: Consequent Actor Renaming

**Status:** Idea / unscoped (user 2026-07-03)

## Background

`entity-taxonomy-rename` (v0.15.0) renamed the internal/spec concept
Session → Actor (Hewitt actor model), but deliberately left the VS Code
UI-facing label as "Sessions Tree" per a documented storage/UI-decoupling
rule — at the time, justified partly by storage still being
`.jarvis/sessions/` + `session.yaml`.

## Idea

User's actual long-term intent: move consequently to "Actor" wording
everywhere, not just internally — including the VS Code UI label, and the
on-disk folder/file names (`.jarvis/sessions/` → `.jarvis/actors/`,
`session.yaml` → `actor.yaml`). Also motivated by user prepping a LinkedIn
series on Actors.

Floated approach: honor/support the old `.jarvis/sessions/`/`session.yaml`
names for existing projects (backward compat), but use the new Actor-based
naming (folder + UI label + file names) for anything created from now on.

## Why parked

Explicitly NOT scoped or decided — "too much for this night." Revisit when
there's bandwidth for a real design discussion (storage migration path,
back-compat shim design, UI label change, docs/naming-convention updates).
