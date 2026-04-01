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
| **Release notes** | GitHub-generated (`generate_release_notes: true` in release.yml) |
| **Change doc policy** | Keep in `docs/changes/` — no archiving |
| **Merge strategy** | Squash merge feature branches into `main` (`git merge --squash`) |
| **Validation commands** | `npm run compile`, `npm run package`, `python -m sphinx -b html docs docs/_build/html -W --keep-going` |
| **Version bump strategy** | SemVer: MAJOR=breaking API change, MINOR=new user feature, PATCH=bugfix/docs |

## Constraints

- Do NOT force-push or rewrite history
- Do NOT delete change documents — archive them per change doc policy
- Do NOT skip validation — all checks must pass before tagging
- Do NOT modify User Stories, Requirements, or Design Specs — that's the Change Agent's job

## Bootstrapping

On first invocation when Release Decisions are empty:

1. Detect that the decisions table has no values filled in
2. Ask user project-specific questions to fill in each decision
3. Write the answers into the Release Decisions table above
4. Then proceed with the release
