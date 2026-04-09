# Change Document: syspilot-update

**Status**: approved
**Branch**: feature/subfolder-view
**Created**: 2026-04-02
**Author**: Jarvis Team

---

## Summary

Update syspilot from v0.2.3 to v0.3.0 using the setup agent's update workflow.
The update replaced methodology-owned agents, prompts, and skills with new versions.
One issue was discovered: the verify agent lost the project-specific Test Protocol
Verification section. This was re-merged manually under Section 4 (Test Verification).

Filed as [enthali/syspilot#16](https://github.com/enthali/syspilot/issues/16).

---

## Changes

### Updated (methodology-owned)
- `.github/agents/syspilot.memory.agent.md` — minor changes
- `.github/agents/syspilot.setup.agent.md` — major rewrite (+154 lines)
- `.github/agents/syspilot.verify.agent.md` — restructured, project extension re-merged
- `.github/prompts/syspilot.*.prompt.md` — 5 prompts updated
- `.github/skills/syspilot.ask-questions/SKILL.md` — updated

### Skipped (project-owned)
- `syspilot.release.agent.md` — Jarvis-specific release decisions
- `syspilot.implement.agent.md` — Jarvis-specific implementation workflow

### Post-update merge
- Verify agent: re-inserted Test Protocol Check under Section 4 (Test Verification)
  - Traceability: `SPEC_DEV_VERIFYPROTOCOL`, `REQ_DEV_TESTPROTOCOL`

### Version marker
- `.syspilot/version.json`: 0.2.3 → 0.3.0
