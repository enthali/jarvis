# Idea: Reorganize `.jarvis/` Layout

**Status:** parked, not urgent (user: "im Moment nicht sooo wichtig")
**Date:** 2026-07-21

## Problem

`.jarvis/` currently mixes flat files from different modules at the top level:
`actors/` (clearly its own thing), plus `autodelivery.json`, `heartbeat.yaml`,
`messages.json`, `message-log.json` (core messaging engine), plus
`syspilot-state.json` (jarvis-syspilot module state) — no subfolder grouping,
looks "drunter und drüber" as modules are added.

## Sketch (not decided)

- `.jarvis/core/` — `autodelivery.json`, `heartbeat.yaml`, `messages.json`,
  `message-log.json`
- `.jarvis/syspilot/` — `syspilot-state.json`
- `.jarvis/actors/` — unchanged
- Possibly a generic `.jarvis/state/` bucket instead of per-module folders —
  undecided, needs more thought once more modules exist to see the real
  pattern.

## Open Questions

- Migration path for existing installs (rename + backward-compat read, or
  clean break)?
- Does this belong to `SPEC_CFG` (paths) as a breaking change, needing its
  own CR?
- Wait until pim/recorder/mcp modules' own `.jarvis/`-writing needs are
  clearer, so the grouping convention isn't guessed prematurely from just
  core + syspilot?

## Trigger to revisit

When adding the next module that writes its own `.jarvis/`-rooted file, or
when the flat layout causes an actual collision/confusion (not just visual
clutter).
