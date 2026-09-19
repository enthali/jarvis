# Change Document: focus-restore-toggle

**Status**: in-progress
**Branch**: feature/focus-restore-toggle
**Created**: 2026-09-13
**Author**: Project Manager
**Operation Mode**: autonomous
**Note**: Previous branch (scaffolded 2026-09-02, commit `4223dbf`) was stale and
deleted 2026-09-13 — it carried unrelated changes (agent model updates, whoami
hookless docs that later landed on development independently). This branch is
recreated from current `development`; the Summary below is carried over
unchanged because it is still accurate.

---

## Summary

After delivering a message via prompt injection to a target chat session
(Actor/Project/Event), Jarvis currently restores focus to the originating
session unconditionally. This is disruptive when the target session uses a
free-tier model that frequently hits rate limits or timeouts — the user is
yanked back to the source session while the target session is still
processing. Add a user setting `jarvis.messaging.restoreFocusAfterDelivery`
(boolean, default `true` for backwards compatibility). When `false`, Jarvis
stays on the target session after injection so the user can observe progress
or retry manually. No breaking change; pure UX option. Backlog item (new); no
GitHub Issue.

---

## Level 0: User Stories

**Status**: ⏳ not started | 🔄 in progress | ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_MSG_FOCUS | As a user, I want to control whether focus returns to my source chat after a message is delivered, so that I can observe progress in the target session when it uses a rate-limited model. | modified | New AC-1 (default true = backward compat); AC-2 (false = stay on target). |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_MSG_FOCUS | As above | mandatory |

### Decisions

- Decision 1: Setting is boolean, default `true`; no breaking change.
- Decision 2: Only affects `injectPrompt` / `SEND` delivery path; no other session flows changed.

### Horizontal Check (MECE)

- [ ] No contradictions with existing User Stories
- [ ] No redundancies
- [ ] Gaps identified and addressed

### Sign-off

- [ ] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [ ] All conflicts resolved
- [ ] Traceability verified
- [ ] Ready for implementation

---

## Level 1: Requirements

**Status**: ⏳ not started | 🔄 in progress | ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_MSG_FOCUS | US_MSG_FOCUS | new | Add `jarvis.messaging.restoreFocusAfterDelivery` (bool, default true). |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_MSG_FOCUS | User-configurable focus restore after message delivery | US_MSG_FOCUS | mandatory |

### Conflicts Detected

- None.

### Decisions

- Decision 1: Default `true` preserves existing behavior; `false` is opt-in.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories

### Sign-off

- [ ] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [ ] All conflicts resolved
- [ ] Traceability verified
- [ ] Ready for implementation

---

## Level 2: Design

**Status**: ⏳ not started | 🔄 in progress | ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_MSG_FOCUSRESTORE | REQ_MSG_FOCUS | modified | Wrap `restoreFocus()` call in `injectPrompt` with setting check. |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_MSG_FOCUSRESTORE | Focus-restore toggle for message delivery | REQ_MSG_FOCUS |

### Conflicts Detected

- None.

### Decisions

- Decision 1: Only `extension.ts` (line ~1258 area) and `package.json` (contrib) changed.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

### Sign-off

- [ ] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [ ] All conflicts resolved
- [ ] Traceability verified
- [ ] Ready for implementation

---

## Final Consistency Check

**Status**: ⏳ not started | ✅ passed | ❌ failed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_xxx | REQ_xxx | SPEC_xxx | ✅ |

### Artefakt-Removal-Check

*Fill in only when this CR removes an artefact (file, field, configuration
key, REQ-ID).*

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| `{artefact name}` | {files + lines fixed / none} | {files + lines fixed / none} | {count — acceptable historic stranding} |

- [ ] All class (a) active code/workflow references fixed in this CR
- [ ] All class (b) active documentation references fixed in this CR
- [ ] Class (c) historical Change Documents accepted as "acceptable historic stranding"

### Issues Found

- [ ] Issue 1: ...

### Sign-off

- [ ] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [ ] All conflicts resolved
- [ ] Traceability verified
- [ ] Ready for implementation

---

## QM Findings

*QM writes findings directly into this section after each review round. PM
records decisions (fix-now / defer / accept-as-is) with rationale in the same
section. Multiple review rounds are appended as sub-sections. Existing CDs
without this section are unaffected — the section is additive, never required
retroactively.*

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
