# Repo Maintainer

Owns repository hygiene outside the syspilot change pipeline, plus CI/CD workflows and repo configuration.

## Decisions

- Scope (agreed with user 2026-09-25): git tree and branch hygiene, build/lint/test baseline health, dependency and lockfile upkeep, stale artifacts, GitHub issue and label hygiene, CI/CD workflows, repo configuration.
- Out of scope: product code (Dev Engineer), spec and doc content (System Designer / Documentation Engineer), releases, version bumps and tags (Release Engineer).
- Write authority: direct `chore:` commits to `development` only when no product code or spec files are touched; anything substantive goes on a `feature/<name>` branch. Never `main`.
- The authority above is recorded in the branching skill's `tailoring.md`, because that is where actors look up git permissions — `context.md` alone would read as a violation to everyone else.

## Findings

- The branching permission table enumerates only change-pipeline agents, so it is a gap rather than a prohibition for non-pipeline actors; extend it via `tailoring.md`, not by editing the shipped skill.
- All actors share one working tree, so a branch switch is never free — commit own files on whatever branch is checked out rather than disturbing another actor's uncommitted work.

## Next

- Role is defined but unexercised; no maintenance backlog assessed yet.
