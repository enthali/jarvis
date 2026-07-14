# Idea: PIM Modularization via Installable Sub-Extensions (drop per-component enable/disable)

**Status:** Idea / strategic direction (user 2026-07-13)

## Background / Trigger

Surfaced while debugging the `unified-entity-tree` (Phase 3) PIM activation
bug. Root cause there: PIM's only reliable activation path was coupled to a
conditionally-contributed view (`jarvisCategories`, gated behind
`showCategories && outlook.enabled`), because the old
`onView:jarvisProjects`/`onView:jarvisEvents` triggers were removed when the
three trees were unified. That tangle exists because two overlapping
mechanisms both answer "is this feature active?":

1. **Extension install/uninstall** — coarse modularity (do you have PIM?).
2. **Settings toggles** (`jarvis.projects.enabled`, `jarvis.events.enabled`,
   `jarvis.pim.showCategories`) — fine-grained on/off *within* PIM.

The second duplicates the first and adds a second dependency tree to manage
(activation × registration × setting-gate × conditional view).

## Idea

Now that Jarvis is modular (core + separately installable add-ons:
pim/recorder/mcp/flow), lean fully into "features = installable extensions"
and stop doing fine-grained enable/disable *inside* a package.

- **Drop the entity-kind toggles** (`jarvis.projects.enabled`,
  `jarvis.events.enabled`): if PIM is installed, Projects + Events register
  by default. Want finer control? Split PIM into smaller separately
  installable sub-extensions later, not settings.
- **Keep genuinely-external-dependency toggles** — `jarvis.outlook.enabled`
  is qualitatively different (connect to an external system with
  credentials, not "which entity kinds"). Integration toggles stay.
- **`showCategories`** — UI-preference grey area; likely obsolete under the
  unified tree. Revisit.

## Why this matters

- Removes the redundant "second dependency tree" that caused the Phase 3
  activation bug.
- Lets each package declare a clean, unconditional activation
  (`onStartupFinished` / `onView:jarvisEntities`) and register its kinds
  unconditionally.
- Aligns fine-grained control with the modular-install model already in
  place (jarvis-suite pack, per-add-on VSIXs) instead of a parallel
  settings-based model.

## Scope / Direction (not yet designed)

- Distinguish toggle *types*: entity-kind on/off (drop) vs. external
  integration on/off (keep) vs. UI preference (case-by-case).
- Consider splitting PIM into smaller installable units (e.g. Projects,
  Events, Outlook integration as separate add-ons) if finer granularity is
  actually wanted — via the install model, not settings.
- Breaking change for anyone relying on the dropped settings (acceptable
  pre-1.0, but call it out in release notes).

## Why parked (for now)

Deliberately NOT folded into `unified-entity-tree` (Phase 3) — that CR was
already long/multi-round. Phase 3 gets only a minimal activation fix
(`onView:jarvisEntities`) to unblock merge (user decision "Option A",
2026-07-13). This broader modularization is its own initiative, to be
designed systematically after Phase 3 ships, because it spans multiple
packages and changes the public settings surface.
