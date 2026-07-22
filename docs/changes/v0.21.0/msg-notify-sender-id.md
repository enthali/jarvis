# Change Document: msg-notify-sender-id

**Status**: design-complete
**Branch**: feature/msg-notify-sender-id
**Created**: 2026-07-20
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

The Jarvis message notification prompt currently does not reveal who sent the
message. This change adds the sender's identity (the originating actor or
session name) to the notification prompt so the user can see at a glance who
is reaching out. For messages that originate from non-actor sources (e.g. a
heartbeat job rather than a named actor), the notification should surface a
clear, non-actor source label instead of an actor name. Addresses GitHub
issue #40.

**GitHub Issue(s)**: #40

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_MSG_NOTIFICATION_TEMPLATE | Configurable Auto-Delivery Notification Template | modified | AC-3 updated: two → three placeholders (added `${sender}`) |

### New User Stories

_(none)_

### Decisions

- Decision 1: No new US needed — the existing US_MSG_NOTIFICATION_TEMPLATE already covers template customisation; adding a third placeholder is an incremental enhancement within its scope.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_MSG_NOTIFICATION_TEMPLATE | US_MSG_NOTIFICATION_TEMPLATE | modified | AC-3 extended to add `${sender}` placeholder; built-in default text updated to include `Sender(s): ${sender}` line |

### New Requirements

_(none)_

### Conflicts Detected

_(none)_

### Decisions

- Decision 1: `${sender}` is the comma-separated list of distinct sender names from the pending batch. No special-casing for non-actor sources — the `sender` field on `QueuedMessage` already contains an appropriate label (e.g. "Heartbeat", job name) for all message origins.
- Decision 2: The built-in default appends a third line `Sender(s): ${sender}` rather than embedding sender info in the first sentence, keeping the existing two lines unchanged for backward compatibility with users who pattern-match on the first line.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_MSG_SENDCOMMAND | REQ_MSG_NOTIFICATION_TEMPLATE | modified | vars object now includes `sender` (distinct senders from node.children) |
| SPEC_MSG_AUTODELIVER_POLL | REQ_MSG_NOTIFICATION_TEMPLATE | modified | vars object now includes `sender` (distinct senders from pending batch) |
| SPEC_CFG_MANIFEST | REQ_MSG_NOTIFICATION_TEMPLATE | modified | package.json description updated to list `${sender}` placeholder |

### New Design Elements

_(none)_

### Conflicts Detected

_(none)_

### Decisions

- Decision 1: Both call sites (manual send + auto-delivery) compute sender identically: `[...new Set(messages.map(m => m.sender))].join(', ')`.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_MSG_NOTIFICATION_TEMPLATE | REQ_MSG_NOTIFICATION_TEMPLATE | SPEC_MSG_SENDCOMMAND, SPEC_MSG_AUTODELIVER_POLL, SPEC_CFG_MANIFEST | ✅ |

### Artefakt-Removal-Check

*Not applicable — this CR adds a placeholder, removes no artefact.*

- [x] All class (a) active code/workflow references fixed in this CR
- [x] All class (b) active documentation references fixed in this CR
- [x] Class (c) historical Change Documents accepted as "acceptable historic stranding" and disclosed above

### Issues Found

- [x] Issue 1: QM Round 1 low finding (CD boilerplate unfilled, Status stale) — fix-now, closed by this finalisation.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with the rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-20

#### Scope

Scoped review per CM notification: `${sender}` placeholder addition to the notification template, both delivery call sites (manual `jarvis.sendMessages` + auto-delivery poll loop), non-actor source handling, and the UAT triad (T-15/T-16/T-17).

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | CD (process) | msg-notify-sender-id.md | The CD's own **Final Consistency Check** section is still the unfilled template (Status `⏳ not started \| ✅ passed \| ❌ failed`, placeholder Traceability row `US_xxx/REQ_xxx/SPEC_xxx`, empty Artefakt-Removal-Check, unchecked Issues Found / Sign-off boxes), and the document header `Status:` field still reads `in-progress` — despite the L0/L1/L2 sections being fully completed and the val report independently confirming a clean, thorough QUALITY PASS. The CD is not internally consistent with its own actual completion state. | low |

#### Independent Verification (for the record)

- `packages/core/src/extension.ts` — confirmed `sender` computed identically at both call sites (line 679 manual, line 1446 auto-delivery): `[...new Set(...map(m => m.sender))].join(', ')`, passed into `applyTemplate(...)`. Matches CD/val report exactly.
- Non-actor source handling: no special-casing found or needed — `sender` field is reused as-is from `QueuedMessage`, consistent with the CD's Decision 1 and the val report's verification.
- L0/L1/L2 spec sections (US/REQ_MSG_NOTIFICATION_TEMPLATE AC-3, SPEC_MSG_SENDCOMMAND, SPEC_MSG_AUTODELIVER_POLL, SPEC_CFG_MANIFEST) read as fully and consistently completed, matching val report claims — only the CD's own closing sections (Final Consistency Check / Sign-off) were left as template boilerplate.

**Verdict: CLEAR** for the actual code/spec change (no functional issues). One low, process-only finding recorded above (the CD document itself needs its closing sections filled in and `Status:` updated to `design-complete`) for PM disposition.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | fix-now | Process-only (CD boilerplate unfilled, Status stale). Trivial to close out and keeps the CD internally consistent for the Release Engineer's archival/traceability step. No code/spec impact. |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
