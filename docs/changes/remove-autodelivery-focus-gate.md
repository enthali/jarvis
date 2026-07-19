# Change Document: remove-autodelivery-focus-gate

**Status**: merged
**Branch**: feature/remove-autodelivery-focus-gate
**Created**: 2026-07-19
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

The Jarvis message auto-delivery system currently suppresses delivery when the target session has UI focus in VS Code (the "focus gate"). This was intended to prevent interrupting active conversations. However, it conflicts with the switchback mechanism that returns focus to the last-active actor after a pipeline step: when CM dispatches multiple actors in parallel (e.g. MECE + Trace Engineer simultaneously), only one can be "last active" — the other remains in focus, and the next message addressed to it is silently dropped. The two mechanisms compete and cause delivery deadlocks in parallel-pipeline scenarios.

This CR removes the focus gate from auto-delivery entirely. Explicit user control already exists via the enable/disable auto-delivery toggle per session — when the user wants to prevent interruption in a specific session, they disable auto-delivery for that session. Implicit focus inference is replaced by explicit opt-out, eliminating the conflict.

Acceptance criteria: (1) auto-delivery delivers messages to a session regardless of its focus state; (2) the per-session enable/disable auto-delivery toggle continues to function unchanged; (3) no regression in single-pipeline, sequential-actor scenarios.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_MSG_AUTODELIVERY_OPTOUT | Auto-Delivery Skips Actively-Used Sessions | deprecated | Entire story deprecated — the focus gate conflicts with parallel-pipeline dispatch (switchback leaves one actor's tab focused, silently suppressing delivery). Explicit per-session toggle replaces implicit focus inference. |

### New User Stories

None.

### UAT User Stories

| ID | Impact | Notes |
|----|--------|-------|
| US_UAT_MSG_AUTODELIVERY | modified | Removed `:links:` to `US_MSG_AUTODELIVERY_OPTOUT`; removed AC-10 (active-use opt-out); removed T-13 scenario; updated description (no longer mentions active-use opt-out) |

### Decisions

- Decision 1: Deprecate `US_MSG_AUTODELIVERY_OPTOUT` entirely rather than modifying it — the story's premise ("skip a session I am actively chatting in") is the behavior being removed; there is no way to amend it to mean "deliver regardless of focus" without contradicting the story's own "so that" clause.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed (explicit per-session toggle already covers user control: `US_MSG_AUTODELIVERY` AC-4)

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_MSG_AUTODELIVERY_OPTOUT | US_MSG_AUTODELIVERY_OPTOUT | deprecated | Entire REQ deprecated — all 5 ACs struck through |
| REQ_MSG_AUTODELIVER_POLL | US_MSG_AUTODELIVERY | modified | Removed `:links:` to `REQ_MSG_AUTODELIVERY_OPTOUT`; removed focus-gate references from description and AC-3 |

### New Requirements

None.

### UAT Requirements

| ID | Impact | Notes |
|----|--------|-------|
| REQ_UAT_MSG_AUTODELIVERY_POLL | modified | Removed `:links:` to `REQ_MSG_AUTODELIVERY_OPTOUT`; removed AC-7 (T-13 reference); updated description |

### Conflicts Detected

None.

### Decisions

- Decision 1: `REQ_MSG_AUTODELIVER_POLL` AC-3 simplified — the "and the session is not currently the active tab" clause removed entirely (no replacement condition). Manual delivery (`jarvis.sendMessages`, `REQ_MSG_AUTODELIVER_TAG` AC-4) is unaffected — it was never gated by focus and remains unchanged.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All amended REQs retain their existing links minus the deprecated one

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_MSG_AUTODELIVERY_OPTOUT | REQ_MSG_AUTODELIVERY_OPTOUT | deprecated | Entire SPEC deprecated — `isSessionActiveTab` function and its call site documented as removed; historical implementation kept for traceability |
| SPEC_MSG_AUTODELIVER_POLL | REQ_MSG_AUTODELIVER_POLL | modified | Removed `:links:` to `SPEC_MSG_AUTODELIVERY_OPTOUT`; removed `isSessionActiveTab` call from code sample; updated description and design notes |

### New Design Elements

None.

### UAT Design Elements

| ID | Impact | Notes |
|----|--------|-------|
| SPEC_UAT_MSG_AUTODELIVERY_SCENARIOS | modified | Removed T-13 row from test procedures table; updated description ("thirteen" not "fourteen"); removed T-13 test setup bullet |

### Conflicts Detected

None.

### Decisions

- Decision 1: The `isSessionActiveTab` function and its call in the poll loop are the only code changes needed — the focus-restore mechanism (`SPEC_MSG_FOCUSRESTORE`) is unaffected and continues to operate after every delivery regardless.
- Decision 2: Tests in `editor-group-placement.test.ts` that assert `isSessionActiveTab` exists and runs before `snapshotFocus` must be removed by Dev Engineer (the `SPEC_MSG_AUTODELIVERY_OPTOUT` describe block).

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All amended SPECs retain their existing links minus the deprecated one

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_MSG_AUTODELIVERY_OPTOUT (deprecated) | REQ_MSG_AUTODELIVERY_OPTOUT (deprecated) | SPEC_MSG_AUTODELIVERY_OPTOUT (deprecated) | ✅ |
| US_MSG_AUTODELIVERY (unchanged) | REQ_MSG_AUTODELIVER_POLL (modified, focus-gate references removed) | SPEC_MSG_AUTODELIVER_POLL (modified, isSessionActiveTab removed from code) | ✅ |
| US_UAT_MSG_AUTODELIVERY (modified) | REQ_UAT_MSG_AUTODELIVERY_POLL (modified) | SPEC_UAT_MSG_AUTODELIVERY_SCENARIOS (modified, T-13 removed) | ✅ |

### Artefakt-Removal-Check

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| `isSessionActiveTab()` function | `packages/core/src/extension.ts` line 371, 1406 — Dev Engineer removes | `spec_msg.rst` SPEC_MSG_AUTODELIVER_POLL code sample — already updated | none |
| `SPEC_MSG_AUTODELIVERY_OPTOUT` describe block in tests | `src/tests/editor-group-placement.test.ts` lines 110-122 — Dev Engineer removes | n/a | none |
| T-13 test scenario | `spec_uat_autodelivery.rst` — already removed | `us_uat_autodelivery.rst`, `req_uat_autodelivery.rst` — already removed | none |

- [x] All class (a) active code/workflow references identified for Dev Engineer
- [x] All class (b) active documentation references fixed in this CR
- [x] No class (c) historical Change Documents affected

### Issues Found

None.

### Sign-off

- [x] All levels completed
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
**Review date:** 2026-07-19

#### Scope

Scoped review per CM notification: deprecation of the focus-gate triad (US/REQ/SPEC_MSG_AUTODELIVERY_OPTOUT), the amended poll-loop triad (REQ/SPEC_MSG_AUTODELIVER_POLL), the UAT triad (T-13 removed, T-16 added), and the Artefakt-Removal-Check's two class-(a) code items.

#### Findings

None.

#### Independent Verification (for the record)

- `isSessionActiveTab` — grep across the workspace confirms zero occurrences in `packages/core/src/extension.ts` or any active test file; all remaining hits are in docs (historical v0.15.0 CD, deprecated-status notes in `spec_msg.rst`/`req_msg.rst`, and the new T-16 UAT description) — matches the CD's and val report's "clean removal" claim exactly.
- `src/tests/editor-group-placement.test.ts` — grep for `SPEC_MSG_AUTODELIVERY_OPTOUT` returns no matches; the describe block was fully removed, consistent with the reported 247→245 test-count drop.
- `packages/core/src/extension.ts` — `jarvis.enableAutoDelivery`/`jarvis.disableAutoDelivery` commands confirmed still registered and unchanged, consistent with the CD's claim that the per-session opt-out toggle is preserved and orthogonal to the focus-gate removal.

**Verdict: CLEAR.** No findings. Ready for merge.

---
