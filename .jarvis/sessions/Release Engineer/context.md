# Session Context: Release Engineer

Role, duties, and workflow are defined in the agent description (`syspilot.release`).
This file captures operational details not covered there.

## Findings

- Latest release: v0.17.0 (2026-07-14, minor) — Consequent Actor Renaming (Phases 1-5) + pre-release polish, incl. 1 breaking change (actor-tool-rename hard cutover). Prior: v0.16.0 (minor), v0.15.2/v0.15.1 (patch), v0.15.0 (minor).
- Agent definition went generic (2026-07-14): workflow steps, branch name, versioning scheme, and validation suite now live in `syspilot.release.tailoring.md` + the `syspilot.branching` skill + its `tailoring.md` — re-read all three fresh each release, not just the agent file.
- Jarvis branch is `develop` (tailoring overrides the skill's generic `development`); feature branches are local-only (never pushed) and retained by default after merge — no branch-deletion step exists.
- Validation suite (tailored): `npm run compile:packages` -> `npm run lint` -> `npm test` (vitest) -> `sphinx-build -W --keep-going` — run in order, stop at first failure, before touching any files.
- `docs/changes/` root file-system scan is authoritative for archival, but verify each CD is actually merged into develop first: squash-merges mean a feature branch's commits never become ancestors of develop, so check `git log develop --oneline --grep <name>` for its squash-commit instead of `git log develop..branch`. Exclude stub/unimplemented CDs (zero code diff vs develop, e.g. `agent-mode-persistence` in v0.17.0) even if physically present in the folder, and flag the exclusion to PM.
- New packages need adding to the version-bump file list (check `packages/` dir + tailoring's "Version Marker Location" each release); packages with non-standard build steps (e.g. flow's `build.js`/`webview-build.js`) need separate build validation beyond `tsc`.
- PowerShell has no heredoc — write release notes/`gh release` bodies to a temp file, pass via `--notes-file`.
