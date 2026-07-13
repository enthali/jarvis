# Tailoring: syspilot.branching (Jarvis)

Project-specific overrides to the `syspilot.branching` skill. Instance-only —
never shipped by syspilot; survives skill updates.

## Do NOT push feature branches (2026-07-13)

Feature branches (`feature/<name>`) are **local-only**. Do NOT `git push`
them to the remote. Only `develop` and `main` are pushed:

- `develop` — pushed after each squash-merge (PM / integration).
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

## Branch naming note

This project's integration branch is named **`develop`** (not `development`
as the generic skill diagram shows). Use `develop` everywhere the skill says
`development`.
