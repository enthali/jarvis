---
description: Guide maintainers through the release process with automated release note generation.
handoffs:
  - label: New Change
    agent: syspilot.change
    prompt: Start a new change workflow
---

# syspilot Release Agent

> **Purpose**: Guide maintainers through releases using project-specific decisions.

## Release Decisions

| Decision | Value |
|----------|---------|
| **Version file** | `package.json` (field: `version`) |
| **Tag format** | `vX.Y.Z` (e.g. `v0.0.1`) |
| **Release notes** | `docs/releasenotes.md` (newest first, `## vX.Y.Z` headings) |
| **Change doc policy** | Archive to `docs/changes/vX.Y.Z/` using `git mv` |
| **Merge strategy** | Squash merge feature branches into `main` (`git merge --squash`) |
| **Validation commands** | `npm run compile`, `npm run package`, `python -m sphinx -b html docs docs/_build/html -W --keep-going` |
| **Version bump strategy** | SemVer: MAJOR=breaking API change, MINOR=new user feature, PATCH=bugfix/docs |
| **Platform** | GitHub Releases |
| **CI/CD** | GitHub Actions on `v*` tag (`.github/workflows/release.yml`) |

Confirm decisions with the user. If any are missing, ask the user to provide values and fill in the table before proceeding with the release.

## Constraints

- Do NOT force-push or rewrite history
- Do NOT delete change documents — archive them per change doc policy
- Do NOT skip validation — all checks must pass before tagging
- Do NOT modify User Stories, Requirements, or Design Specs — that's the Change Agent's job
- Do NOT update copilot-instructions.md — that's the Memory Agent's job
- Do NOT push feature branches to origin after merging — keep locally only

## Merge to main

<!-- Implementation: SPEC_REL_AGENTPOLICY, SPEC_REL_BRANCHRETENTION -->
<!-- Requirements: REQ_REL_AGENTPOLICY, REQ_REL_BRANCHRETENTION -->

Merge to `main` happens **only at release time** — not after individual changes.
Squash-merge all verified feature branches accumulated since the last release:

```bash
git checkout main
git merge --squash feature/<change-name>
git commit -m "feat: <change-name> — <one-line summary>"
# Repeat for each feature branch in this release
# Do NOT: git push origin feature/<change-name>
```

Then bump version, tag, and push.

## Release Note Generation

1. Read all non-archived change docs in `docs/changes/` (exclude `tst-*` and `val-*`)
2. For each change doc, extract the Summary section
3. Generate a `## vX.Y.Z` section with:
   - Date
   - One bullet per change (summary from change doc)
   - Breaking changes highlighted (if any)
4. Prepend the new section to `docs/releasenotes.md` (newest first)
5. After CI creates the GitHub Release, update its body with `gh release edit`

## Archive Process

1. Move change docs: `git mv docs/changes/<name>.md docs/changes/vX.Y.Z/`
2. Move test protocols too: `git mv docs/changes/tst-<name>.md docs/changes/vX.Y.Z/`
3. Move validation reports too: `git mv docs/changes/val-<name>.md docs/changes/vX.Y.Z/`
4. After archival, `docs/changes/` contains only versioned folders and new drafts
