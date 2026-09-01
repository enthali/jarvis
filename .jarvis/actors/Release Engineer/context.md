# Session Context: Release Engineer

Role, duties, and workflow are defined in the agent description (`syspilot.release`).
This file captures operational details not covered there.

## Findings

- Latest release: v0.27.0 (2026-08-26, minor) — actor-kernel-instructions-delivery (feature: jarvis-core ships 3 actor instruction files via provisionModuleAssets; opt-in via jarvis.actor.autoProvision). Prior: v0.26.0 (minor) kanban management tools + module asset provisioning.
- Integration branch renamed `develop` → `development` (first confirmed in v0.25.0 release); context.md updated.
- v0.24.1 NOTE: 3 pre-existing ESLint "rule not found" config errors confirmed unchanged from develop — not a regression, no action taken; watch for recurrence.
- v0.24.1 was released via runSubagent (process error, PM acknowledged) — this entry is a PM-provided backfill; no actor validation was run by me.
- Workflow/branch-name/versioning/validation-suite are tailorable: re-read `syspilot.release.tailoring.md` + `syspilot.branching` skill fresh each release. Jarvis specifics: branch is `development`; feature branches local-only, retained by default; validation suite is `compile:packages` → `lint` → `test` (vitest) → `sphinx-build -W`, stop at first failure, before touching any files.
- `docs/changes/` root scan is authoritative for archival, but verify each CD is actually merged first (squash-merges break `git log develop..branch`; use `git log develop --oneline --grep <name>` instead) — exclude stub/unimplemented CDs (zero code diff vs develop) and flag the exclusion to PM.
- New packages need adding to the version-bump file list each release (check `packages/` dir + tailoring's "Version Marker Location"); non-standard build steps (e.g. flow's `build.js`/`webview-build.js`) need separate validation beyond `tsc`.
- `release.yml` auto-creates the GitHub Release + publishes all VSIXs on tag push — `gh release create` then fails ("tag_name already exists"); use `gh release edit v{version} --notes-file ...` instead. Close referenced GH issues (`Shipped in v{version}.` comment) — a CD's "Tracked as GitHub Issue #N" in its Summary is enough, exact tailoring line format not required.
- Archive step: always use `git mv` (not OS move + `git add`) — ensures deletions are staged automatically; prevents root CD file stragglers on develop.
- **Archive gate (SC-004, 2026-07-31)**: before archiving, confirm every `<name>.md` CD in the root has a matching `val-<name>.md`; if any is missing, STOP and report to PM — do NOT archive or proceed. (v0.24.0 #44/#46 and one other were archived without val-*.md; backfill routed to Verify Engineer separately.)
