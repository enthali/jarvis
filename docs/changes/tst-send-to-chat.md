# Test Protocol: send-to-chat

**Date**: 2026-04-08
**Change Document**: docs/changes/send-to-chat.md
**Result**: PASSED (with note)

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|----|-------------|--------|
| 1 | REQ_MSG_QUEUE | AC-1 | Queue entries contain `destination`, `sender`, `text`, `timestamp` | PASS |
| 2 | REQ_MSG_QUEUE | AC-2 | Queue file is a JSON array | PASS |
| 3 | REQ_MSG_QUEUE | AC-3 | Append preserves existing entries | PASS |
| 4 | REQ_MSG_QUEUE | AC-4 | Queue path from `jarvis.messagesFile` setting | PASS |
| 5 | REQ_MSG_EXPLORER | AC-1 | Messages grouped under collapsible parent nodes | PASS |
| 6 | REQ_MSG_EXPLORER | AC-2 | Parent label shows count suffix (e.g. `Test Session (2)`) | PASS |
| 7 | REQ_MSG_EXPLORER | AC-3 | Child nodes show truncated message text | PASS |
| 8 | REQ_MSG_EXPLORER | AC-4 | Empty queue shows "nothing to deliver" | PASS |
| 9 | REQ_MSG_SEND | AC-1 | Send action available on session group node (play icon) | PASS |
| 10 | REQ_MSG_SEND | AC-2 | Extension focuses target chat tab before submitting | PASS |
| 11 | REQ_MSG_SEND | AC-3 | Messages submitted via `workbench.action.chat.open({ query })` | PASS |
| 12 | REQ_MSG_SEND | AC-4 | Delivered messages removed from queue | PASS |
| 13 | REQ_MSG_SEND | AC-5 | Tree refreshes after send | PASS |
| 14 | REQ_MSG_SEND | AC-6 | Session focused via `vscode-chat-session://local/<b64uuid>` | PASS |
| 15 | REQ_MSG_DELETE | AC-1 | Trash icon inline button on message nodes | PASS |
| 16 | REQ_MSG_DELETE | AC-2 | Clicking removes message from queue file | PASS |
| 17 | REQ_MSG_DELETE | AC-3 | Tree refreshes after deletion | PASS |
| 18 | REQ_MSG_SESSIONLOOKUP | AC-1 | Reads `chat.ChatSessionStore.index` from state.vscdb | PASS |
| 19 | REQ_MSG_SESSIONLOOKUP | AC-2 | Live DB read each time (no caching) | PASS |
| 20 | REQ_MSG_SESSIONLOOKUP | AC-3 | Session not found → opens new chat session | PASS |
| 21 | REQ_MSG_SESSIONLOOKUP | AC-4 | Duplicate names → first match + warning | PASS |
| 22 | REQ_MSG_SESSIONLOOKUP | AC-5 | Uses `sql.js` (pure JS/WASM) | PASS |
| 23 | REQ_MSG_SESSIONLOOKUP | AC-6 | Workspace-scoped state.vscdb via `context.storageUri` | PASS |
| 24 | REQ_CFG_MSGPATH | AC-1 | `jarvis.messagesFile` setting works (override) | SKIP |
| 25 | REQ_CFG_MSGPATH | AC-2 | Default to `context.storageUri/messages.json` | PASS |

## Notes

- Round-trip test confirmed: Developer Session → Session 3 → Test Session → Developer Session
- Heartbeat T-8 queue step tested: `sender` correctly set to `heartbeat`
- LM Tool `jarvis_sendToSession` tested: `sender` auto-detected from active tab label
- Message preamble `[Jarvis Message Service — from: X, to: Y]` appears in delivered messages
- Unknown destination correctly creates new editor chat session
- `jarvis.openSession` QuickPick shows only workspace-scoped sessions
- REQ_CFG_MSGPATH AC-1 (override path) was not explicitly tested in isolation but the test workspace uses an override path (`testdata/msg/messages.json`) which worked throughout testing
