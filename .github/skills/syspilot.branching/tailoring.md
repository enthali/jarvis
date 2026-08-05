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

## Branch naming (2026-07-28)

Renamed the integration branch from `develop` to `development` (was a
temporary deviation) — this project now matches the generic skill's naming
convention with no override needed.
