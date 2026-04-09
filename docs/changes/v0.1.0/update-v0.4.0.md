# Change Document: update-v0.4.0

**Status**: completed
**Branch**: update/v0.4.0
**Created**: 2026-04-08
**Author**: @syspilot.setup

## Summary

Automated update from syspilot v0.3.1 to v0.4.0.

## Replaced Files (methodology-owned)

- `.github/agents/syspilot.change.agent.md` — major refactor: MECE subagent integration, per-level write protocol, decision log terminology
- `.github/agents/syspilot.setup.agent.md` — extended: update workflow additions, post-update review, update branch support
- `.github/agents/syspilot.verify.agent.md` — merged: v0.4.0 removed Test Protocol Check (33 lines); section restored (see Post-Update Review)
- `.github/agents/syspilot.mece.agent.md` — synced (no content change)
- `.github/agents/syspilot.trace.agent.md` — synced (no content change)
- `.github/agents/syspilot.memory.agent.md` — synced (no content change)
- `.github/prompts/syspilot.change.prompt.md` — synced
- `.github/prompts/syspilot.verify.prompt.md` — synced
- `.github/prompts/syspilot.mece.prompt.md` — synced
- `.github/prompts/syspilot.trace.prompt.md` — synced
- `.github/prompts/syspilot.memory.prompt.md` — synced
- `.github/prompts/syspilot.setup.prompt.md` — synced
- `.github/skills/syspilot.ask-questions/SKILL.md` — synced
- `.syspilot/scripts/python/get_need_links.py` — synced
- `.syspilot/templates/change-document.md` — synced
- `docs/build.ps1` — synced
- `docs/build.sh` — synced
- `.syspilot/version.json` — updated: 0.3.1 → 0.4.0

## Skipped Files (project-owned — never modified)

- `.github/agents/syspilot.release.agent.md`
- `.github/agents/syspilot.implement.agent.md`
- `.github/prompts/syspilot.release.prompt.md`
- `.github/prompts/syspilot.implement.prompt.md`

## Post-Update Review

`.github/agents/syspilot.verify.agent.md` — v0.4.0 removed the `#### Test Protocol Check`
section (33 lines) which is critical for the Jarvis workflow (`tst-*.md` files).
**Decision**: Merge — restored the Test Protocol Check section into the new v0.4.0 base.
The verify agent now contains all v0.4.0 changes plus the restored section.

## Validation

sphinx-build 9.1.0 (via `python -m sphinx --version`) — OK.
