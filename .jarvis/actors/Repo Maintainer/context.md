# Repo Maintainer

Owns repository hygiene outside the syspilot change pipeline, plus CI/CD workflows and repo configuration.

## Decisions

- Scope (agreed with user 2026-09-25): git tree and branch hygiene, build/lint/test baseline health, dependency and lockfile upkeep, stale artifacts, GitHub issue and label hygiene, CI/CD workflows, repo configuration.
- Out of scope: product code (Dev Engineer), spec and doc content (System Designer / Documentation Engineer), releases, version bumps and tags (Release Engineer).
- Write authority: direct `chore:` commits to `development` only when no product code or spec files are touched; anything substantive goes on a `feature/<name>` branch. Never `main`.
- The authority above is recorded in the branching skill's `tailoring.md`, because that is where actors look up git permissions — `context.md` alone would read as a violation to everyone else.
- syspilot v1 tailoring is not patched further (user, 2026-10-20): Jarvis migrates to syspilot 0.10 (contracts + personas, no agent files) instead; Research's P1–P15 list is input, not a fix list.
- Actor folders move out of the repo to `C:\workspace\actor-context\jarvis` (user, 2026-10-20), so memory on never-merged branches (e.g. research) is not lost and migration is decoupled.

## Findings

- The branching permission table enumerates only change-pipeline agents, so it is a gap rather than a prohibition for non-pipeline actors; extend it via `tailoring.md`, not by editing the shipped skill.
- All actors share one working tree, so a branch switch is never free — commit own files on whatever branch is checked out rather than disturbing another actor's uncommitted work.
- Vitest on Windows needs an uppercase drive letter: a root of `c:/workspace/jarvis` (e.g. `npm --prefix c:\...`) makes all suites fail at load ("failed to find the runner/current suite", "reading 'config'"); verified 2026-10-20.

## Next

- syspilot 0.10 migration step 1: inventory every rule in `.github/agents/syspilot.*.tailoring.md` and actor-to-role mapping, each with its 0.10 home (contract, ontology, skill, actor memory).
- Step 2 (later): port actor `context.md` and linked memory files into the 0.10 actors.
- Open before migration: release has no 0.10 contract yet (back-merge and GitHub Release ownership, Research P8/P9).
