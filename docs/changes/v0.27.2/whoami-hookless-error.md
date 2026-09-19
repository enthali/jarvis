# Change Document: whoami-hookless-error

**Status**: in-progress
**Branch**: feature/whoami-hookless-error
**Created**: 2026-09-05
**Author**: Project Manager
**Operation Mode**: autonomous

---

## Summary

When hooks are disabled (admin policy), the `jarvis_whoAmI` tool cannot capture the calling session's `sessionId` via the `PreToolUse` hook buffer. Currently it returns the misleading error "You are not a registered actor. Please ask the user which actor you are." — which confuses the session because it *is* a registered actor, just unable to prove it automatically. Change the error message to honestly state the root cause: "Unable to determine your identity automatically (hooks disabled or unavailable). Please confirm your identity with the user." This lets the session (agent) handle the confirmation flow itself (e.g., prompt the user). No new settings, no cache, no breaking change. Backlog item (new); no GitHub Issue.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_ACT_WHOAMI | Actor Identity Recovery Tool | unaffected | No US change — existing AC-5 already covers an undeterminable calling session (return an error rather than a guess); this CR only refines the underlying error text at the REQ/SPEC level |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| (none) | | |

### Decisions

- The error message change is a clarification, not a new user story. `us_act.rst` is **unchanged**: US_ACT_WHOAMI AC-5 already requires that "if the extension cannot determine which session asked, it SHALL say so and ask the user, rather than return a guess." This CR refines the underlying error text at the REQ/SPEC level to be honest about the root cause (hooks disabled/unavailable) rather than misleadingly claiming the session is not a registered actor; no user-story wording is affected.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_ACT_WHOAMI | US_ACT_WHOAMI | modified | AC-3 updated to specify honest error message when hook intake is unavailable |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| (none) | | | |

### Conflicts Detected

- None

### Decisions

- The error message change is a clarification of AC-3. The requirement already states that when hook intake is unavailable, the tool degrades to the AC-3 error. We now make that error message honest about the root cause.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_ACT_WHOAMI | REQ_ACT_WHOAMI | modified | Error message updated to be honest about hook unavailability |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| (none) | | |

### Conflicts Detected

- None

### Decisions

- The error message in SPEC_ACT_WHOAMI is updated from "You are not a registered actor. Please ask the user which actor you are." to "Unable to determine your identity automatically (hooks disabled or unavailable). Please confirm your identity with the user."
- This change is localized to the error message string; no logic changes are required.
- The log message already correctly states "no session_id from buffer (hooks disabled, absent, stale, or ambiguous)" — no change needed there.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ACT_WHOAMI | REQ_ACT_WHOAMI | SPEC_ACT_WHOAMI | ✅ |

### Artefakt-Removal-Check

*Fill in only when this CR removes an artefact (file, field, configuration key, REQ-ID).*  

This CR does not remove any artefacts — it only changes an error message string.

### Issues Found

- None

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-09-06

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | L0 | US_ACT_WHOAMI | The CD marks the user story as modified and says AC-2 was updated, but `us_act.rst` is unchanged. Existing AC-5 already covers an undeterminable calling session; correct the CD impact and decision text to describe that unchanged coverage. | low |
| 2 | UAT | SPEC_UAT_ACT_WHOAMI | T-3 still expects the retired error text and states that the zero-match scenario returns "the same error." Update the expected JSON and surrounding statement to the new AC-3 text. | medium |

#### Verdict

**CHANGES REQUIRED.** Implementation, requirement, and design are consistent,
but the normative UAT contradicts the changed behavior. Finding 2 must be fixed
before verification; Finding 1 is a documentation accuracy correction.

#### Validation

- Focused whoAmI tests: 15 passed.
- Full Vitest suite: 406 passed.
- Full cross-package compile: passed.
- Sphinx build with warnings as errors: passed.
- Active-source search found the retired literal only in `SPEC_UAT_ACT_WHOAMI` T-3.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | fix-now | CD must not claim a user-story modification that did not happen — a checkable statement that fails erodes trust in every other claim in the CD. Correct the wording to reference the unchanged AC-5 coverage. |
| 2 | 2 | fix-now | The normative UAT contradicts the changed behavior; leaving it would let a re-verification of T-3 fail and leave a stale retired literal in the spec suite. Must be fixed before verification. |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
