# Tailoring: syspilot.branching (Jarvis)

Project-specific overrides to the `syspilot.branching` skill. Instance-only —
never shipped by syspilot; survives skill updates.

## Do NOT push feature branches (2026-07-13)

Feature branches (`feature/<name>`) are **local-only**. Do NOT `git push`
them to the remote. Only `development` and `main` are pushed:

- `development` — pushed after each squash-merge (PM / integration).
- `main` — pushed by the Release Engineer at release time (+ tags).

**Rationale (Jarvis setup):**
- All agents (PM, CM, System Designer, Dev/Test/MECE/Trace/Doc Engineers, QM)
  operate on the **same local working tree** — the pipeline never fetches a
  feature branch from the remote, so pushing provides no cross-agent value.
- The repository is **public**; pushing feature branches would expose
  half-finished WIP publicly (conflicts with the "nothing goes public
  without user approval" rule).
- Off-machine backup is knowingly forgone for feature branches.

**Applies to every agent** that performs git operations on a feature branch,
not just PM. Commit locally as usual; just never `push` the feature branch.

## Repo Maintainer: bounded direct `development` commits (2026-09-25)

The `Repo Maintainer` actor MAY commit directly to `development` without
creating a feature branch, bounded to **both** of:

- commit type `chore:`, and
- no product code (`src/`, `packages/*/src/`) and no specification files
  (`docs/userstories/`, `docs/requirements/`, `docs/design/`, `docs/changes/`).

Anything outside those bounds — including any change with behavioural impact —
goes on a `feature/<name>` branch like every other engineer. The `main`
prohibition is unaffected: Repo Maintainer MUST NOT commit to `main`.

**Rationale:**
- Repo Maintainer works *between* changes, not inside one, so the
  one-branch-per-change isolation has nothing to isolate; a feature branch and
  squash-merge for a lockfile refresh or a stale-artifact deletion is ceremony
  without review value.
- The bound exists because `development` is pushed to the public remote.
  Restricting direct commits to `chore:` outside code and specs keeps the blast
  radius of a mistake at reversible housekeeping.
- The generic permission table enumerates only change-pipeline agents. It never
  considered a non-pipeline actor, so this is a gap being filled here rather
  than an exception being carved out of a deliberate rule.

## Branch naming (2026-07-28)

Renamed the integration branch from `develop` to `development` (was a
temporary deviation) — this project now matches the generic skill's naming
convention with no override needed.
