# Change Document: message-logging

**Branch:** `feature/message-logging`  
**Date:** 2026-05-02  
**Status:** Implemented

---

## Summary

Add optional message logging — when enabled, every `appendMessage()` call also
writes to a persistent `message-log.json` audit log that is never cleaned up by
read/delete operations.

---

## Motivation

Messages are consumed from `messages.json` by `popMessage()` and removed by
`deleteMessage()`. Once delivered, no record of past messages exists. An
append-only audit log provides traceability for debugging and administration
without affecting queue semantics.

---

## Specification Elements

| Level | ID | Title |
|-------|----|-------|
| US | `US_MSG_LOGGING` | Message Audit Log |
| REQ | `REQ_MSG_LOGSETTING` | Message Logging Setting |
| REQ | `REQ_MSG_AUDITLOG` | Message Audit Log File |
| SPEC | `SPEC_MSG_LOGSETTING` | Message Logging Setting Configuration |
| SPEC | `SPEC_MSG_AUDITLOG` | Message Audit Log Implementation |

---

## Design Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D-1 | Separate file (`message-log.json`) | Keeps queue semantics of `messages.json` clean; consumers are not confused by extra entries |
| D-2 | Append-only | Audit trail must be immutable; read/delete operations must not affect it |
| D-3 | Same `QueuedMessage` format | No new interfaces needed; consistent with existing data model |
| D-4 | Setting read live inside `appendMessage()` | No signature change; hot-changes to setting take effect immediately without restart |
| D-5 | No max-size / rotation (out of scope) | Deferred; acceptable for now given typical message volumes |

---

## Scope

**In scope:**
- `jarvis.messages.logging` boolean setting in `package.json`
- `resolveLogPath()` internal helper in `messageQueue.ts`
- Extended `appendMessage()` in `messageQueue.ts`

**Out of scope:**
- Log rotation / max file size
- UI to view or clear the log
- Filtering which messages get logged

---

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Add `jarvis.messages.logging` to Messages settings group |
| `src/messageQueue.ts` | Add `resolveLogPath()`, extend `appendMessage()` |
| `docs/userstories/us_msg.rst` | Append `US_MSG_LOGGING` |
| `docs/requirements/req_msg.rst` | Append `REQ_MSG_LOGSETTING`, `REQ_MSG_AUDITLOG` |
| `docs/design/spec_msg.rst` | Append `SPEC_MSG_LOGSETTING`, `SPEC_MSG_AUDITLOG` |
