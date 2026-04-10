# Change Document: message-inbox

**Status**: approved
**Branch**: feature/message-inbox
**Created**: 2026-04-10
**Author**: Change Agent

---

## Summary

Replace the push-based message delivery (Play-Button injects each message individually into the target session) with a pull-based inbox pattern. The Play-Button sends a single notification stub; the target session reads messages one-by-one via a new `jarvis_readMessage` LM Tool, giving the session control over its read cycle and avoiding message ordering issues.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_MSG_CHATQUEUE | Chat Message Queue | modified | AC-4 changes from "sends all messages" to "sends notification stub"; new AC for inbox read pattern |

### New User Stories

(none — the change is fully covered by modifying US_MSG_CHATQUEUE)

### Decisions

- D-1: Modify US_MSG_CHATQUEUE rather than creating a new US. The inbox pattern is an evolution of the same user need (delivering queued messages to chat sessions), not a separate feature.
- D-2: The notification stub text is in German ("Du hast {N} neue Nachrichten...") because session agents operate in German-language context.
- D-3: The read tool follows the same naming pattern as existing tools (`jarvis_readMessage` alongside `jarvis_sendToSession`, `jarvis_listSessions`).

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies — US_MSG_OPENSESSION and US_MSG_LISTSESSIONS are unaffected
- [x] No gaps — the change is self-contained within US_MSG_CHATQUEUE

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_MSG_SEND | US_MSG_CHATQUEUE | modified | Step 3 changes from submitting each message to sending a notification stub; step 4 (deleteByDestination) removed |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_MSG_READ | Read Message LM Tool | US_MSG_CHATQUEUE | mandatory |

### Decisions

- D-1: REQ_MSG_SEND AC-3 and AC-4 are replaced: instead of submitting each message via `workbench.action.chat.open`, send a single stub notification. No deletion on send.
- D-2: REQ_MSG_READ is a new requirement for the `jarvis_readMessage` LM Tool with pop-oldest semantics.
- D-3: REQ_MSG_QUEUE, REQ_MSG_EXPLORER, REQ_MSG_DELETE, REQ_MSG_SESSIONLOOKUP are NOT affected — the queue format and tree display remain unchanged.

### Horizontal Check (MECE)

- [x] No contradictions — REQ_MSG_SEND and REQ_MSG_READ are complementary (send notifies, read consumes)
- [x] No redundancies — REQ_MSG_DELETE (manual trash) and REQ_MSG_READ (tool-based pop) serve different purposes
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_MSG_SENDCOMMAND | REQ_MSG_SEND | modified | Step 3 → stub injection, step 4 removed |
| SPEC_MSG_QUEUESTORE | REQ_MSG_QUEUE | modified | New `popMessage` function added |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_MSG_READMESSAGE | Read Message LM Tool | REQ_MSG_READ; SPEC_MSG_QUEUESTORE; SPEC_MSG_SESSIONLOOKUP |

### Decisions

- D-1: `popMessage` added to messageQueue.ts — finds oldest message for destination, splices it out, writes back, returns message + remaining count
- D-2: SPEC_MSG_READMESSAGE tool registered via `vscode.lm.registerTool` with input schema `{ destination: string }`
- D-3: SPEC_MSG_SENDCOMMAND step 3 changes to single stub injection; step 4 (deleteByDestination) removed; `deleteByDestination` import can be removed from extension.ts
- D-4: package.json gets new `languageModelTools` entry for `jarvis_readMessage`

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements
- [x] SPEC_MSG_TREEPROVIDER, SPEC_MSG_OPENSESSION, SPEC_MSG_LISTSESSIONS, SPEC_MSG_SESSIONLOOKUP are unaffected

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_MSG_CHATQUEUE | REQ_MSG_SEND (mod) | SPEC_MSG_SENDCOMMAND (mod) | ✅ |
| US_MSG_CHATQUEUE | REQ_MSG_READ (new) | SPEC_MSG_READMESSAGE (new), SPEC_MSG_QUEUESTORE (mod) | ✅ |

### UAT Artifacts (modified)

| ID | Level | Notes |
|----|-------|-------|
| US_UAT_MSG | L0 | T-2/T-3/T-4 updated for stub pattern, T-6 added for readMessage |
| REQ_UAT_MSG_TESTDATA | L1 | AC-2 updated to include T-6 |
| SPEC_UAT_MSG_FILES | L2 | Test outcome table updated for inbox pattern |

### Issues Found

(none)

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation
