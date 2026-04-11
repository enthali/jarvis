# Change Document: qa-fix-critical

**Status**: approved
**Branch**: feature/qa-fix-critical
**Created**: 2026-04-10
**Author**: Change Agent

---

## Summary

Docs-only fix for two issues found in the QA report (qr-2026-04-10) after the v0.3.0 release:
(1) REQ_AUT_JOBCONFIG AC-5 references field name `session` but the implementation uses `destination`;
(2) US_UAT_SAMPLEDATA T-1 expects 3 sidebar sections but 4 exist since heartbeat-view was added.
No new US/REQ/SPEC needed — purely corrective text edits.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_UAT_SAMPLEDATA | Explorer Sidebar Acceptance Tests | modified | T-1 expected section count 3 → 4, add "Heartbeat" to list |

### New User Stories

_None._

### Decisions

- D-1: No new user stories needed — this is a text correction in an existing test scenario.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] No gaps — fix is scoped to the outdated count

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_AUT_JOBCONFIG | US_AUT_HEARTBEAT | modified | AC-5: field name `session` → `destination` |

### New Requirements

_None._

### Conflicts Detected

_None._

### Decisions

- D-2: No new requirements needed — this is a text correction aligning AC-5 with the implemented field name.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All existing links remain valid

---

## Level 2: Design

**Status**: ✅ completed (no design changes needed)

### Impacted Design Elements

_None._ — Both fixes are pure text corrections at US/REQ level. Design specs (SPEC_AUT_JOBSCHEMA etc.) already use the correct field name `destination`.

### Decisions

- D-3: No design changes needed.

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_UAT_SAMPLEDATA (T-1 fix) | — | — | ✅ |
| US_AUT_HEARTBEAT | REQ_AUT_JOBCONFIG (AC-5 fix) | SPEC_AUT_JOBSCHEMA (already correct) | ✅ |

### Issues Found

_None._

### Sign-off

- [x] All levels completed (no DEPRECATED markers)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation
