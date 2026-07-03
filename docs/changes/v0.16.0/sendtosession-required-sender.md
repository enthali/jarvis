# Change Document: sendtosession-required-sender

**Status**: draft
**Branch**: feature/sendtosession-required-sender (not yet created)
**Created**: 2026-07-03
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

**Breaking change** to `jarvis_sendToSession` (LM + MCP tool): `senderSession` changes from optional to **required**, and is now validated against the same `getValidDestinations()` list as `destination`. No more silent fallback to the active editor tab label — callers must explicitly identify themselves.

**Root cause of the change:** `jarvis_sendToSession` currently falls back to `activeTab?.label` when `senderSession` is omitted. This produces incorrect sender attribution whenever the active tab is not the sending agent — e.g. after Focus-Snapshot/Restore (`editor-group-placement`) the active tab is restored to the user's prior file, so any subsequent `sendToSession` picks up that file's name instead of the agent's name. Observed live in `.jarvis/message-log.json` with `sender: "message-log.json"`, `sender: "syspilot.mece.agent.md"`, `sender: "Keyboard Shortcuts"`, etc.

**Changes:**

1. **Schema**: `senderSession` becomes a required field in both the LM tool (`inputSchema`) and the MCP schema (Zod) — removing the `.optional()` qualifier.
2. **Validation**: after confirming the field is present and non-empty, validate it against `getValidDestinations(scanner)` — same function already used for `destination`. Error on failure: `Sender session "${name}" does not exist. Valid senders: ${sorted list}`. Error on missing/empty: `senderSession is required — callers must explicitly identify the sending session`.
3. **All `.github/agents/*.agent.md` files**: must be updated to always pass `senderSession` explicitly (the agent's own session name). This is the mandatory adoption pass — any agent that calls `jarvis_sendToSession` without `senderSession` will now get an error.
4. **`syspilot.orchestration-jarvis` SKILL.md** (SEND section): update to document `senderSession` as required, add example.
5. **`jarvis.messages.notificationTemplate` (`.vscode/settings.json`)**: if it currently omits `senderSession`, it must be updated too — or documented as "Reminder sender doesn't go through sendToSession".

**Not in scope:** changes to `jarvis_sendToSession`'s destination validation (already exists), changes to the poll loop or Reminder delivery (those use `appendMessage` directly, not `jarvis_sendToSession`).

**Positive side-effect:** after this CR, the Chord Diagram (`jarvis-flow`) will show correct, trustworthy sender attribution in `.jarvis/message-log.json`.

---

## Level 0: User Stories

**Status**: ⏳ not started

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|

### New User Stories

| ID | Title | Priority |
|----|-------|----------|

### Decisions

-

### Horizontal Check (MECE)

- [ ] No contradictions with existing User Stories
- [ ] No redundancies
- [ ] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ⏳ not started

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|

### Conflicts Detected

-

### Decisions

-

### Horizontal Check (MECE)

- [ ] No contradictions with existing Requirements
- [ ] No redundancies
- [ ] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ⏳ not started

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_MSG_SENDTOSESSION | REQ_MSG_SENDTOSESSION | modified | senderSession required + validated |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|

### Conflicts Detected

-

### Decisions

-

### Horizontal Check (MECE)

- [ ] No contradictions with existing Designs
- [ ] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ⏳ not started

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|

### Artefakt-Removal-Check

_Not applicable — no artefact removed, change to existing tool interface._

### Issues Found

-

### Sign-off

- [ ] All levels completed
- [ ] All conflicts resolved
- [ ] Traceability verified
- [ ] Ready for implementation

---

## QM Findings

### Round 1

**Reviewed by:** QM
**Review date:** {DATE}

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|

---

## Appendix

**Impact scope (for System Designer's impact analysis):**
- `SPEC_MSG_SENDTOSESSION` / `REQ_MSG_SENDTOSESSION` (primary change)
- `REQ_MSG_DEST_ERROR` (existing — may need new companion REQ for sender error format)
- All `.github/agents/*.agent.md` files (adoption pass — Dev Engineer or Documentation Engineer)
- `syspilot.orchestration-jarvis/SKILL.md` (SEND section)
- `jarvis.messages.notificationTemplate` in `.vscode/settings.json` (check: does it set senderSession?)
- `REQ_MSG_SENDTOSESSION`'s existing `modelDescription` hint about `jarvis_listSessions` — needs updated text to mention `senderSession` is required

**Error message spec (for System Designer):**
- Missing/empty: `senderSession is required. Callers must explicitly provide their session name — do not rely on the active editor tab.`
- Invalid: `Sender session "${senderSession}" does not exist. Valid senders: ${sorted comma-separated list | "(none)"}`

---

*Pre-staged by PM (2026-07-03). Root cause: active-tab fallback for senderSession produces wrong attribution, especially after Focus-Snapshot/Restore. Observed in message-log.json during watchdog experiment. Dispatch after message-flow-diagram merges.*
