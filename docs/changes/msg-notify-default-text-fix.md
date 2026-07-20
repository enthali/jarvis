# Change Document: msg-notify-default-text-fix

**Status**: complete
**Branch**: feature/msg-notify-default-text-fix
**Created**: 2026-07-20
**Author**: PM
**Operation Mode**: user-guided

---

## Summary

Manual Extension Host verification of the msg-notify-sender-id change (GH #40)
found that the built-in notification default text was never actually updated
to include the sender line, in any of the three places that declare it
(`packages/core/package.json` setting default, and the two hardcoded fallback
strings in `extension.ts` for the manual `jarvis.sendMessages` command and the
auto-delivery poll loop) — only the `sender` substitution variable was wired
up, not the template text itself, so it was silently computed but never
displayed. Separately, while investigating, an older, already-specified but
never-implemented requirement was found unresolved: `REQ_MSG_NOTIFICATION_TEMPLATE`
AC-7 (from the `message-api-rename` CR, v0.16.0) requires the built-in default
text to reference the canonical `jarvis_receiveMessage` tool rather than the
hard-deprecated `jarvis_readMessage` — two of the three locations still
reference the deprecated name, and one references a third, non-existent tool
id (`enthali.jarvis-core/receiveMessage`). This change brings all three
default-text locations in line with both requirements: sender line present,
and tool name consistently `jarvis_receiveMessage`.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_MSG_NOTIFICATION_TEMPLATE | Configurable Message Notification Template | unchanged | This CR fixes an implementation gap against its already-specified ACs — no new user need, no AC changes |

### New User Stories

None.

### Decisions

- Decision 1: No new US needed. This is a pure implementation correctness fix against two existing, already-specified ACs (AC-3: sender placeholder in default text; AC-7: `jarvis_receiveMessage` in default text). All acceptance criteria were already present in the spec; the code simply hadn't been updated to match.

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
| REQ_MSG_NOTIFICATION_TEMPLATE | US_MSG_NOTIFICATION_TEMPLATE | amended (illustration only) | AC-3 and AC-7 were already correctly specified. The verbatim illustration block in the RST was stale (wrong tool name, no Sender line) — corrected by System Designer (commit ae903f3) to match the shipped default text |

### New Requirements

None.

### Decisions

- Decision 1: No new REQ needed. The fix is a code correctness issue against existing ACs, not a missing requirement. The REQ illustration block correction is a documentation accuracy fix, not a spec change.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories (N/A — no new REQs)

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_MSG_SENDCOMMAND | REQ_MSG_NOTIFICATION_TEMPLATE | implementation fix | manual `jarvis.sendMessages` fallback default: added Sender(s) line, corrected tool name to `jarvis_receiveMessage` |
| SPEC_MSG_AUTODELIVER_POLL | REQ_MSG_NOTIFICATION_TEMPLATE | implementation fix | auto-delivery poll fallback default: added Sender(s) line |

### New Design Elements

None.

### Decisions

- Decision 1: `packages/core/package.json` setting default was already correct (Sender line present, correct tool name — fixed separately, likely by QM during the QUALITY PASS round). Only the two `extension.ts` fallback strings needed changing.
- Decision 2: A regression test (`src/tests/msg-notify-default-text.test.ts`, 3 cases) was added to assert the literal default text at all 3 sites, preventing recurrence.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements (N/A — no new SPECs)

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_MSG_NOTIFICATION_TEMPLATE | REQ_MSG_NOTIFICATION_TEMPLATE (AC-3, AC-7) | SPEC_MSG_SENDCOMMAND, SPEC_MSG_AUTODELIVER_POLL | ✅ |

### Artefakt-Removal-Check

No artefacts removed in this CR.

### Issues Found

None remaining. Both root causes (missing Sender line, wrong tool name) resolved at all three declaration sites.

### Sign-off

- [x] All levels completed
- [x] All conflicts resolved
- [x] Traceability verified (REQ_MSG_NOTIFICATION_TEMPLATE AC-3 and AC-7 now fully satisfied by implementation)
- [x] Ready for merge

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** MECE Engineer (val-msg-notify-default-text-fix.md) + Trace Engineer
**Review date:** 2026-07-21

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | None. MECE QUALITY PASS (explicit AC-3/AC-7 verification at all 3 sites); Trace verified REQ↔code consistency and additionally flagged a stale "verbatim" illustration block in REQ_MSG_NOTIFICATION_TEMPLATE, resolved same round by System Designer (ae903f3). | — |

#### PM Decisions

No fix-now/defer/accept-as-is decisions required — zero open findings after Round 1. Scope was a small, well-bounded follow-up fix (not a new feature); MECE + Trace coverage judged sufficient without a separate dedicated QM consolidation pass. Cleared for merge.

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
