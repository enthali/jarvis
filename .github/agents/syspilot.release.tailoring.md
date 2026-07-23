# syspilot.release — Jarvis Project Tailoring

## Validation Suite (Step 2)

Before archiving/version-bump, run in order — stop and report if any fails:
1. `npm run compile:packages` — compiles every package in the workspace
2. `npm run lint`
3. `npm test` (vitest)
4. `python -m sphinx -b html docs docs/_build/html -W --keep-going`

## Versioning Scheme
Semantic versioning, pre-1.0 (`0.y.z`) — MAJOR is never incremented, even for
breaking changes (v0.16.0 shipped a hard API deprecation as MINOR).
- MINOR: release contains ≥1 Feature and/or Breaking Change.
- PATCH: release contains ONLY Fixes/Infrastructure entries (e.g. v0.15.1).

## Version Marker Location
Bump `version` in the root `package.json` AND every `packages/*/package.json`
(core, pim, recorder, mcp, flow, suite, core-gh, syspilot) — all must match
the new version. (Past miss: v0.12.0 shipped stale v0.11.2 VSIXs because only
root was bumped.)

## GitHub Issue Closure (addition to Step 6 — Document)
Jarvis tracks its backlog exclusively in GitHub Issues. Each Change Document
may carry a `**GitHub Issue(s)**:` line under its Summary. When generating
release notes, for every archived CD with that line, close each referenced
issue with a comment `Shipped in v{version}.` (skip silently if already
closed).

## README Staleness Gate (Step 6 — Document, before the Step 7 merge)

Right after generating the release notes in Step 6 — while the full change
context is freshly loaded, and before the Step 7 squash-merge to `main` —
compare the root `README.md` against what this release actually ships. If the
README contradicts the release (stale framing, removed/renamed features, wrong
description), **stop the release** and report the specific contradiction to the
PM, then wait for the PM's decision.

The report routes through the PM because the PM owns the release reminder and
cancels/re-sets it around the pause. Resume when the PM gives the go-ahead —
with either the old or an updated README.
