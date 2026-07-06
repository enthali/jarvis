# Idea: Consequent Actor Renaming + Unified Entity Tree

**Status:** Idea / unscoped (user 2026-07-03, expanded 2026-07-06)

## Background

`entity-taxonomy-rename` (v0.15.0) renamed the internal/spec concept
Session → Actor (Hewitt actor model), but deliberately left the VS Code
UI-facing label as "Sessions Tree" per a documented storage/UI-decoupling
rule — at the time, justified partly by storage still being
`.jarvis/sessions/` + `session.yaml`.

## Part 1 — Actor Renaming

User's actual long-term intent: move consequently to "Actor" wording
everywhere, not just internally — including the VS Code UI label, and the
on-disk folder/file names (`.jarvis/sessions/` → `.jarvis/actors/`,
`session.yaml` → `actor.yaml`). Also motivated by user prepping a LinkedIn
series on Actors.

**Migration approach (decided 2026-07-06):** soft transition, no forced
migration.
- Old `.jarvis/sessions/`/`session.yaml` remain supported **read-only** for
  existing projects — never written to again, never migrated in place.
- All NEW actor creation always uses the new Actor-based naming (folder +
  file names), regardless of what an existing project already uses.
- This means a single workspace could have a long-lived mix of old- and
  new-named actor folders, which the tooling must tolerate indefinitely
  (not just during a transition window).

## Part 2 — Unified Entity Tree ("Jarvis Entities")

Also motivated by the naming collision itself: "Session" is overloaded
(chat-session vs. entity-kind), but renaming the kind to "Actor" alone
doesn't fully resolve the UX — there'd still be an awkward catch-all like
"general purpose actor" for actors that aren't tied to a Project or Event.

**Idea:** collapse today's 3 separate top-level trees (Actors/Sessions,
Projects, Events) into a single tree, container named **"Jarvis Entities"**
(reuses the existing spec-level umbrella term from `entity-taxonomy-rename`
— avoids reusing "Actors" for both the container and a sub-category, which
would just move the same naming collision up one level).

- Category sub-groups (Actors / Projects / Events) appear **only when more
  than one kind is actually present** in the workspace. If e.g. only actors
  exist, the tree flattens — no category headers, just the actor list
  directly under "Jarvis Entities".

  ```
  Jarvis Entities                    Jarvis Entities (actors-only case)
  ├── Actors                         ├── Email Triage
  │   ├── Email Triage               ├── Jarvis
  │   ├── Jarvis                     └── Atlas
  │   └── Atlas
  ├── Projects
  │   ├── Project A
  │   └── Project B
  └── Events
      ├── Event A
      └── Event B
  ```

- **Search**: general/global across all categories — not per-category.
  Mechanism still open: live-filter the tree to only matching nodes vs. a
  dedicated search box. **To be discussed.**
- **Per-kind filters**: Projects and Events each have their own existing
  filter settings (different from each other). In the unified tree these
  filter controls would live on the respective category tree node
  (Projects' filter config on the Projects node, Events' on the Events
  node) rather than being global.

## Why parked

Explicitly NOT scoped or decided — original renaming idea was "too much
for this night" (2026-07-03); the tree-consolidation extension (2026-07-06)
is further still just a discussion, not a design. Revisit when there's
bandwidth for a real design pass (storage migration/back-compat shim,
tree/search mechanics, per-kind filter placement, docs/naming-convention
updates).

## Migration Phasing (agreed 2026-07-06)

Clarification first: "read-only" for old `.jarvis/sessions/`/`session.yaml`
projects means the **naming convention** (folder/file name) is never
auto-migrated — it does NOT mean the folder becomes generally unwritable.
`context.md` and everything else inside it stays fully live/writable as
today, forever, for old-named actors too.

Four clean, independently testable CRs, done one at a time:

1. **Terminology only** — UI labels, command titles, code identifiers,
   spec language → "Actor" wherever purely cosmetic. No storage/path
   change. Lowest risk, ships first.
2. **Dual-path scanner** — scanner reads both `.jarvis/sessions/*/session.yaml`
   (existing) and `.jarvis/actors/*/actor.yaml` (new), merging into one
   logical actor list. "New Actor" creation command switches to writing
   only the new convention. Old-named actors remain fully functional
   forever — no forced migration, no end date.
3. **Unified Entity Tree UI** — the actual "Jarvis Entities" single tree
   with conditional category grouping, global search (mechanism TBD),
   per-kind filters relocated onto the Projects/Events category nodes.
4. **(Optional, not required)** manual "migrate this actor to the new
   naming" command per actor (folder + file rename) — opt-in only, no
   pressure to use it.
