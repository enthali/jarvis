# Change Document: manual-test

**Status**: approved
**Branch**: feature/manual-test
**Created**: 2026-03-31
**Author**: Change Agent

---

## Summary

Add a manual user acceptance test step to the Implement Agent workflow. After code is compiled, the agent launches a VS Code Extension Development Host and presents the user with a change-specific checklist of what to verify manually.

---

## Level 0: User Stories

**Status**: ✅ completed

### New User Stories
- US_EXP_MANUALTEST: Manual Extension Testing

---

## Level 1: Requirements

**Status**: ✅ completed

### New Requirements
- REQ_EXP_LAUNCHCONFIG: VS Code Launch Configuration
- REQ_EXP_TESTSUMMARY: User-Facing Test Summary

---

## Level 2: Design

**Status**: ✅ completed

### New Design Elements
- SPEC_EXP_LAUNCHCONFIG: Launch Configuration File
- SPEC_EXP_IMPLTEST: Implement Agent Manual Test Step

### Key Decisions
1. Agent uses `code --extensionDevelopmentPath=` (CLI); launch.json is for interactive F5
2. Manual test step placed after quality gates, before documentation/commit
3. `ask_questions` tool for pass/fail confirmation

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_EXP_MANUALTEST (AC-1) | REQ_EXP_LAUNCHCONFIG | SPEC_EXP_LAUNCHCONFIG | ✅ |
| US_EXP_MANUALTEST (AC-2, AC-3, AC-4) | REQ_EXP_TESTSUMMARY | SPEC_EXP_IMPLTEST | ✅ |

### Sign-off
- [x] All levels completed
- [x] All conflicts resolved
- [x] Traceability verified
- [x] User approved
- [x] RST files written with status: approved
