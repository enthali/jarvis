# Session Context: Release Engineer

Role, duties, and workflow are defined in the agent description (`syspilot.release`).
This file captures operational details not covered there.

## Findings

- Latest release: v0.31.0 (2026-10-20, minor) — kanban list `details` option, kanban filter values, actor-tree mail marker. Prior: v0.30.0 actor identity, v0.29.0 recorder.
- **CRITICAL**: uncommitted edits to this file do NOT survive between sessions — commit context.md right after every edit, never batch it (a full v0.28.0 memory update was lost this way).
- Shared working tree only; no worktrees for release (user rejected a worktree attempt in v0.31.0).
- Workflow, branch names, versioning, and validation are tailorable: re-read `syspilot.release.tailoring.md` and the `syspilot.branching` skill each release. Branch is `development`; feature branches are retained locally.
- Validation order: `compile:packages` → `lint` → vitest → strict Sphinx with `-E`; stop at the first failure, before any file is moved. On Windows, vitest needs the uppercase drive-letter root (`npm --prefix C:\workspace\jarvis test`); lowercase loads 0 suites.
- Version markers: root `package.json`, `packages/{core,core-gh,pim,recorder,mcp,flow,suite,syspilot,kanban}/package.json`, and the root and workspace entries in `package-lock.json`. Verify the lock against the files, not notes (v0.31.0 found lock entries still at 0.29.0).
- Kanban was once left out of the bump on a PM instruction that conflicted with the tailoring. Raise such conflicts; do not drop a marker on a PM instruction.
- `docs/changes/` root scan is authoritative for archival. Verify each CD is merged first with `git log development --oneline --grep <name>` (squash breaks `..` ranges). Exclude stub CDs (zero diff vs development) and flag the exclusion to PM.
- **Archive gate (SC-004)**: every `<name>.md` CD needs a matching `val-<name>.md`; if one is missing, STOP and report to PM.
- Scope gate: a CD still in-progress or with a PARTIAL validation is not release-ready. Ask the user before archiving or publishing it.
- Archive with `git mv`, never an OS move plus `git add`.
- `release.yml` on tag push creates the GitHub Release and publishes all VSIXs to the Marketplace (irreversible). Do not run `gh release create`; use `gh release edit v{version} --notes-file ...` for notes changes.
- Close GitHub issues referenced in a CD's Summary ("Tracked as GitHub Issue #N") with a `Shipped in v{version}.` comment.
- Local `main` can lag `origin/main`: `git merge --ff-only origin/main` before squashing.
- Squash conflicts: resolve with `-X theirs` per the release mode; stop and list them if the tailoring says otherwise.
- `eslint.config.js` ignores `.venv/**`. If a "error in unrelated vendor file" appears again, check for a new untracked dir that needs the same ignore.
- New packages: add to the version-bump list. Non-standard build steps (flow and kanban `build.js`, `webview-build.js`) need separate validation beyond `tsc`.
- On Windows, `gh` needs `$env:GH_PAGER=''`; pipe `gh run watch` to `Out-String` to block without opening the alternate buffer.
- Open: leftover `c:\workspace\jarvis-release\node_modules` junctions from the rejected worktree attempt. Cleanup only with PM and user OK.
