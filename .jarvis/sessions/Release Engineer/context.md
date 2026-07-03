# Session Context: Release Engineer

Role, duties, and workflow are defined in the agent description (`syspilot.release`).
This file captures operational details not covered there.

## Findings

- Latest release: v0.15.1 (2026-07-02, patch) — pim-treenode-filenode-fix hotfix. Prior: v0.15.0 (minor) — editor-group-placement, entity-files-tree, entity-open-context-cleanup, entity-taxonomy-rename.
- `git branch --merged develop` (workflow step 10) is routinely a no-op: CRs are squash-committed directly onto develop (not via `git merge`), so feature branch tips never become ancestors of develop and are never detected as merged. Stale local `feature/*` branches accumulate; treat step 10 as best-effort, not a reliable cleanup signal.
- CD "Status:" header fields (e.g. "in-progress") are often stale even after QM sign-off/CLEAR verdict — verify actual readiness via git log (QM sign-off commits) and the CD's own QM Findings section, not the header.
- PowerShell has no heredoc (`<<'EOF'`) — write release notes to a temp file and pass via `gh release create --notes-file`.
- Step 6 (validate) now includes a full package-suite build gate (`tsc -p` core/pim/recorder/mcp), added after v0.15.0 shipped a `pim` compile break undetected by sphinx-build alone — always re-read the agent file fresh, since PM/CM may patch it between releases.
