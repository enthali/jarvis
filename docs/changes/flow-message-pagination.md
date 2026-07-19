# Change Document: flow-message-pagination

**Status**: merged
**Branch**: feature/flow-message-pagination
**Created**: 2026-07-18
**Author**: PM
**Operation Mode**: autonomous
**GitHub Issue(s)**: #36

---

## Summary

Flow currently shows 500 messages initially with a +500 load-more
increment. In practice, users rarely need more than the last 20-30
messages before deciding to scroll back further. Reduce the initial load
and load-more increment to 30 (30 + load-more-30) instead of 500 +
load-more-500 — less initial render overhead, more sensible pagination
granularity. User-visible acceptance criterion: message list initially
shows the most recent 30 messages, with a "load more" action that reveals
30 additional older messages at a time, repeatable until history is
exhausted.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_FLOW_CHORDVIEW | Message Flow Chord Diagram | none (no rewording) | AC-8 ("expand how much message history is loaded") is number-agnostic — works with any default/increment value. No US-level change needed. |

### New User Stories

None. This is a pagination-constant change, not a new capability.

### Decisions

- Decision 1: No US modification — AC-8's wording is already parameterized ("beyond the default cap", no specific number).

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_FLOW_DATASOURCE | US_FLOW_CHORDVIEW | modified | AC-2: cap changed from 500 to 30 (annotated with CR reference) |
| REQ_FLOW_LOADMORE | US_FLOW_CHORDVIEW | modified | Title "+500"→"+30"; AC-1: increment 500→30 (30→60→90); AC-4: default cap 500→30 |
| REQ_FLOW_TIMELENS | US_FLOW_CHORDVIEW | modified | AC-5: default lens end rank min(total, 500)→min(total, 30) |

### New Requirements

None.

### UAT Requirements

| ID | Impact | Notes |
|----|--------|-------|
| REQ_UAT_FLOW_TESTDATA | modified | AC-1: cap fixture description updated 500→30; AC-2: "well under 30" |
| REQ_UAT_FLOW_TESTS | modified | AC-3, AC-9, AC-12, AC-13: all 500→30 references updated |

### Conflicts Detected

None. All changes are numeric-constant substitutions within existing ACs.

### Decisions

- Decision 1: Pure constant substitution at REQ level — no structural AC changes, no new ACs needed.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All amended REQs retain their existing links (unchanged)

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_FLOW_DATASERVICE | REQ_FLOW_DATASOURCE | modified | `DEFAULT_CAP = 500` → `DEFAULT_CAP = 30` in code sample; AC-4 text updated |
| SPEC_FLOW_WEBVIEW | REQ_FLOW_WEBVIEWPANEL | modified | Code sample: `currentCap += 500` → `currentCap += 30` |
| SPEC_FLOW_LOADMORE | REQ_FLOW_LOADMORE | modified | Title "+500"→"+30"; description `cap += 500` → `cap += 30`; AC-1: "adds 30" |
| SPEC_FLOW_TIMELENS | REQ_FLOW_TIMELENS | modified | AC-5: default LensState end `entries.length - 500` → `entries.length - 30` |

### UAT Design Elements

| ID | Impact | Notes |
|----|--------|-------|
| SPEC_UAT_FLOW_FILES | modified | Test data table descriptions: all 500→30 |
| SPEC_UAT_FLOW_PROCEDURES | modified | T-4, T-10, T-14, T-15: all 500→30 in scenario descriptions and expected results |

### New Design Elements

None.

### Conflicts Detected

None.

### Decisions

- Decision 1: Code samples updated in place — the constant change is fully localized to `DEFAULT_CAP` and one `+= INCREMENT` line; no architectural change.
- Decision 2: Existing test fixture `message-log-flow-cap.json` (520 entries) remains valid — the 30-cap still excludes `old-only-sender` (in entries 1-20, well outside the newest 30). Dev Engineer should update the test description string in `message-flow-dataservice.test.ts` ("500-entry cap"→"30-entry cap") for accuracy but the assertion logic is unchanged.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All amended SPECs retain their existing links (unchanged)

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_FLOW_CHORDVIEW (unchanged) | REQ_FLOW_DATASOURCE AC-2 (30) | SPEC_FLOW_DATASERVICE (DEFAULT_CAP=30) | ✅ |
| US_FLOW_CHORDVIEW (unchanged) | REQ_FLOW_LOADMORE AC-1/AC-4 (30) | SPEC_FLOW_LOADMORE (+30), SPEC_FLOW_WEBVIEW (+=30) | ✅ |
| US_FLOW_CHORDVIEW (unchanged) | REQ_FLOW_TIMELENS AC-5 (30) | SPEC_FLOW_TIMELENS AC-5 (30) | ✅ |
| US_UAT_FLOW (updated) | REQ_UAT_FLOW_* (updated) | SPEC_UAT_FLOW_* (updated) | ✅ |

### Other consumers of the 500 constant (impact check)

- `packages/flow/src/dataService.ts`: `DEFAULT_CAP = 500` — Dev Engineer changes to 30
- `packages/flow/src/extension.ts`: `currentCap += 500` — Dev Engineer changes to 30
- `packages/flow/webview/chord.ts`: button label "+500", lens-end value="500" — Dev Engineer changes to "+30" / "30"
- `packages/flow/README.md`: multiple prose references to 500 — Dev Engineer updates
- `src/tests/message-flow-dataservice.test.ts`: test description "500-entry cap" — Dev Engineer updates description string (assertion logic unchanged: 30-cap still excludes old-only-sender from 520-entry fixture)
- No other code consumers found.

### Issues Found

None.

### Sign-off

- [x] All levels completed
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## QM Findings

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-19

#### Scope

Scoped review per CM notification: the 500→30 constant change across `dataService.ts`, `extension.ts`, `chord.ts`, the 7 amended REQ/SPEC IDs, and the UAT triad.

#### Findings

| # | Severity | Location | Description |
|---|----------|----------|--------------|
| 1 | Low | `docs/changes/val-flow-message-pagination.md` | Val report's only recorded round still shows verdict "⚠️ FINDINGS: 1 CRITICAL ISSUE" / "Do NOT merge" for the chord.ts:386 missed conversion. That issue was fixed in commit c24ff8e, and CM's notification states MECE was "re-verified after 1 fix," but no Round 2 / re-verification section was appended to the val report confirming the PASS. As it stands, the document contradicts the actual (fixed) state of the code — a documentation-currency gap for anyone reading the val report in isolation. |

#### Independent Verification (for the record)

- `packages/flow/src/dataService.ts:15` — `DEFAULT_CAP = 30`. ✅ matches CD.
- `packages/flow/src/extension.ts:152` — `currentCap += 30`. ✅ matches CD.
- `packages/flow/webview/chord.ts:36` — button label `+30`. ✅ matches CD.
- `packages/flow/webview/chord.ts:386` — `Math.max(0, currentData.entries.length - 30)` (the val report's flagged line). ✅ confirmed fixed, matches SPEC_FLOW_TIMELENS AC-5.
- `packages/flow/webview/chord.ts:243` (`clientHeight || 500`) and `extension.ts:12` (`POLL_MS = 5000`) confirmed unrelated to pagination — correctly left unchanged, per val report's own analysis.
- `packages/flow/README.md` and `docs/releasenotes.md` (v0.21.0 entry) confirmed updated to 30/+30.

**Verdict: CLEAR** (no code/spec issues). One low, non-blocking documentation-currency finding recorded above for PM disposition (fix-now / defer / accept-as-is). Ready for merge regardless of disposition, as the underlying code/spec is already correct.

#### PM Decisions

| Finding # | Decision | Rationale |
|-----------|----------|-----------|
| 1 | | |

---

*Generated by syspilot Change Agent*
