# Session Context: Release Engineer

Role, duties, and workflow are defined in the agent description (`syspilot.release`).
This file captures operational details not covered there.

## Findings

- Latest release: v0.16.0 (2026-07-03, minor) — message-flow-diagram (new package jarvis-flow), flow-time-lens, message-api-rename (breaking hard-deprecation of jarvis_sendToSession/jarvis_readMessage). Prior: v0.15.2 (patch); v0.15.1 (patch); v0.15.0 (minor).
- New packages (e.g. `packages/flow`) need their own version bump line added to the release script's file list — check `packages/` dir listing each release, don't assume the package set is static. `flow` also has its own `build.js`/`webview-build.js` beyond `tsc` — validate those too when a package has a non-standard build step.
- Superseded/folded-in CDs (e.g. `sendtosession-required-sender` folded into `message-api-rename`) still get archived and a release-notes entry, cross-referenced to the CD that absorbed them — don't skip archiving just because a CD says "superseded".
- Versioning stays within 0.x (MINOR bump) even for breaking API changes, consistent with semver's "anything may change pre-1.0" convention and this project's established pattern — MAJOR has never been used here.
- `git branch --merged develop` (workflow step 10) is routinely a no-op: CRs are squash-committed directly onto develop (not via `git merge`), so feature branch tips never become ancestors of develop and are never detected as merged. Stale local `feature/*` branches accumulate; treat step 10 as best-effort, not a reliable cleanup signal.
- CD "Status:" header fields (e.g. "in-progress") are often stale even after QM sign-off/CLEAR verdict — verify actual readiness via git log (QM sign-off commits) and the CD's own QM Findings section, not the header.
- PowerShell has no heredoc (`<<'EOF'`) — write release notes to a temp file and pass via `gh release create --notes-file`.
- Step 6 (validate) now includes a full package-suite build gate (`tsc -p` core/pim/recorder/mcp), added after v0.15.0 shipped a `pim` compile break undetected by sphinx-build alone — always re-read the agent file fresh, since PM/CM may patch it between releases.
