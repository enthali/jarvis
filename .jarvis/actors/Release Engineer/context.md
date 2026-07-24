# Session Context: Release Engineer

Role, duties, and workflow are defined in the agent description (`syspilot.release`).
This file captures operational details not covered there.

## Findings

- Latest release: v0.23.0 (2026-07-24, minor) — prompt-injection-tool (GH #43, feat), jarvis-whoami (GH #44, feat). Also archived #41/#42 (v0.22.0 cycle, docs-only miss). Prior: v0.22.0 (minor) heartbeat improvements.
- Workflow/branch-name/versioning/validation-suite are tailorable (2026-07-14 onward): re-read `syspilot.release.tailoring.md` + `syspilot.branching` skill + its `tailoring.md` fresh each release, not just the agent file. Jarvis specifics: branch is `develop`; feature branches local-only, retained by default (no deletion step); validation suite is `compile:packages` -> `lint` -> `test` (vitest) -> `sphinx-build -W`, run in order, stop at first failure, before touching any files.
- `docs/changes/` root scan is authoritative for archival, but verify each CD is actually merged first (squash-merges break `git log develop..branch`; use `git log develop --oneline --grep <name>` instead) — exclude stub/unimplemented CDs (zero code diff vs develop) and flag the exclusion to PM.
- New packages need adding to the version-bump file list each release (check `packages/` dir + tailoring's "Version Marker Location"); non-standard build steps (e.g. flow's `build.js`/`webview-build.js`) need separate validation beyond `tsc`.
- `release.yml` auto-creates the GitHub Release + publishes all VSIXs on tag push — `gh release create` then fails ("tag_name already exists"); use `gh release edit v{version} --notes-file ...` instead. Close referenced GH issues (`Shipped in v{version}.` comment) — a CD's "Tracked as GitHub Issue #N" in its Summary is enough, exact tailoring line format not required.
- Archive step: `git add docs/changes/v0.23.0/` does NOT stage the deletions from root — must also run `git rm docs/changes/*.md` (or `git add -u docs/changes/`) to remove root files; otherwise they persist on develop and appear as spurious adds in the squash merge.
