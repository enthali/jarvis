# Session Context: Release Engineer

Role, duties, and workflow are defined in the agent description (`syspilot.release`).
This file captures operational details not covered there.

## Findings

- Latest release: v0.17.1 (2026-07-14, patch) — agent-mode-persistence (GH #25 fix). Prior: v0.17.0 (minor) Consequent Actor Renaming Phases 1-5 + polish; v0.16.0 (minor); v0.15.x (patch/minor).
- Workflow/branch-name/versioning/validation-suite are tailorable (2026-07-14 onward): re-read `syspilot.release.tailoring.md` + `syspilot.branching` skill + its `tailoring.md` fresh each release, not just the agent file. Jarvis specifics: branch is `develop`; feature branches local-only, retained by default (no deletion step); validation suite is `compile:packages` -> `lint` -> `test` (vitest) -> `sphinx-build -W`, run in order, stop at first failure, before touching any files.
- `docs/changes/` root scan is authoritative for archival, but verify each CD is actually merged first (squash-merges break `git log develop..branch`; use `git log develop --oneline --grep <name>` instead) — exclude stub/unimplemented CDs (zero code diff vs develop) and flag the exclusion to PM.
- New packages need adding to the version-bump file list each release (check `packages/` dir + tailoring's "Version Marker Location"); non-standard build steps (e.g. flow's `build.js`/`webview-build.js`) need separate validation beyond `tsc`.
- `release.yml` auto-creates the GitHub Release + publishes all VSIXs on tag push — `gh release create` then fails ("tag_name already exists"); use `gh release edit v{version} --notes-file ...` instead. Close referenced GH issues (`Shipped in v{version}.` comment) — a CD's "Tracked as GitHub Issue #N" in its Summary is enough, exact tailoring line format not required.
- PowerShell has no heredoc — write release notes/`gh release` bodies to a temp file, pass via `--notes-file`.
