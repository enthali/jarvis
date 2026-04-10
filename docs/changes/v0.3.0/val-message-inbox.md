# Verification Report: message-inbox

**Date**: 2026-04-10
**Change Proposal**: docs/changes/message-inbox.md
**Branch**: feature/message-inbox
**Status**: ✅ PASSED

## Summary

| Category | Total | Verified | Issues |
|----------|-------|----------|--------|
| Requirements | 2 | 2 | 0 |
| Designs | 3 | 3 | 0 |
| Implementations | 3 | 3 | 0 |
| Tests | 6 | 6 | 0 |
| Traceability | 2 | 2 | 0 |

## Requirements Coverage

| REQ ID | Description | SPEC | Code | Test | Status |
|--------|-------------|------|------|------|--------|
| REQ_MSG_SEND (mod) | Send notification stub to chat session | SPEC_MSG_SENDCOMMAND | ✅ | ✅ | ✅ |
| REQ_MSG_READ (new) | Read Message LM Tool (pop-oldest) | SPEC_MSG_READMESSAGE, SPEC_MSG_QUEUESTORE | ✅ | ✅ | ✅ |

## Acceptance Criteria Verification

### REQ_MSG_SEND (modified)
- [x] AC-1: Send action on session group node → `jarvis.sendMessages` with `viewItem == messageSession` menu entry
- [x] AC-2: Focus target chat tab before submitting → `vscode.open` with session URI
- [x] AC-3: Single notification stub via `workbench.action.chat.open` → stub text matches spec
- [x] AC-4: Messages remain in queue after notification → no deletion call, only `messageProvider.reload()`
- [x] AC-5: Messages tree refreshes → `messageProvider.reload()` called
- [x] AC-6: Focus via `vscode.open(vscode-chat-session://local/<b64uuid>)` → code matches
- [x] AC-7: Session not found → opens `vscode-chat-session://local/new`

### REQ_MSG_READ (new)
- [x] AC-1: `jarvis_readMessage` registered via `vscode.lm.registerTool` with `canBeReferencedInPrompt: true` → code + package.json
- [x] AC-2: Accepts `destination` parameter (string) → input schema matches
- [x] AC-3: Returns JSON `{ message: { sender, text, timestamp } | null, remaining: number }` → code returns this structure
- [x] AC-4: Removes returned message from queue (pop-oldest via `popMessage` splice) → confirmed in messageQueue.ts
- [x] AC-5: No messages → `{ message: null, remaining: 0 }` → code handles this case
- [x] AC-6: Messages tree refreshes after each read → `messageProvider.reload()` called

## Design Verification

### SPEC_MSG_QUEUESTORE (modified)
- [x] New `popMessage` function present in `src/messageQueue.ts`
- [x] Signature matches spec: `popMessage(filePath, destination) → { message, remaining }`
- [x] Pop-oldest semantics via `findIndex` (FIFO order)
- [x] Remaining count calculated after splice
- [x] File rewritten after pop
- [x] Traceability comments: `// Implementation: SPEC_MSG_QUEUESTORE` and `// Requirements: REQ_MSG_READ`

### SPEC_MSG_SENDCOMMAND (modified)
- [x] Step 1: Resolve UUID via `lookupSessionUUID(node.destination)`
- [x] Step 2: Focus via `vscode.open` with base64-encoded UUID or `new`
- [x] Step 3: Single notification stub with count and `jarvis_readMessage` instruction
- [x] Step 4 (deleteByDestination) removed — no call to `deleteByDestination` in extension.ts
- [x] Warning when invoked without node argument
- [x] Stub format matches spec (German text, destination interpolation)
- [x] `messageProvider.reload()` called (messages stay in queue)

### SPEC_MSG_READMESSAGE (new)
- [x] Handler registered via `vscode.lm.registerTool('jarvis_readMessage', ...)`
- [x] Input schema: `{ destination: string }` (required)
- [x] Calls `popMessage(resolveMessagesPath(), destination)`
- [x] Returns JSON with `message` fields (sender, text, timestamp) + `remaining`
- [x] Returns `{ message: null, remaining: 0 }` when no messages
- [x] `messageProvider.reload()` called after each pop
- [x] Disposable pushed to `context.subscriptions` (`readMessageTool`)
- [x] package.json `languageModelTools` entry: name, displayName, icon `$(mail-read)`, inputSchema all match

## Test Protocol

**File**: docs/changes/tst-message-inbox.md
**Result**: PASSED

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| T-2 | REQ_MSG_SEND | AC-3, AC-4 | Play-Button sends single stub; messages stay in queue | PASS |
| T-3 | REQ_MSG_SEND | AC-2, AC-6 | Stub sent to existing named session (focused via UUID) | PASS |
| T-4 | REQ_MSG_SEND | AC-6, AC-7 | Stub sent to closed session (restored via UUID) | PASS |
| T-6a | REQ_MSG_READ | AC-1..AC-4 | readMessage returns oldest message + remaining count | PASS |
| T-6b | REQ_MSG_READ | AC-4, AC-6 | Messages removed from queue and tree after reading | PASS |
| T-6c | REQ_MSG_READ | AC-5 | Repeated calls until remaining=0; null return | PASS |

## Traceability Matrix

| Requirement | Design | Implementation | Test | Complete |
|-------------|--------|----------------|------|----------|
| REQ_MSG_SEND | SPEC_MSG_SENDCOMMAND | `src/extension.ts` (sendMessagesCommand) | T-2, T-3, T-4 | ✅ |
| REQ_MSG_READ | SPEC_MSG_READMESSAGE | `src/extension.ts` (readMessageTool) | T-6a, T-6b, T-6c | ✅ |
| REQ_MSG_READ | SPEC_MSG_QUEUESTORE | `src/messageQueue.ts` (popMessage) | T-6a, T-6b, T-6c | ✅ |

## Build Verification

```
$ npm run compile
> jarvis@0.2.0 compile
> tsc -p ./
(no errors)

$ sphinx-build -W --keep-going
build succeeded.
```

## Status Updates Applied

| ID | File | Old Status | New Status |
|----|------|-----------|------------|
| REQ_MSG_SEND | docs/requirements/req_msg.rst | approved | implemented |
| SPEC_MSG_QUEUESTORE | docs/design/spec_msg.rst | approved | implemented |
| SPEC_MSG_SENDCOMMAND | docs/design/spec_msg.rst | approved | implemented |

## Issues Found

(none)

## Conclusion

All requirements and design specs from the message-inbox change are correctly implemented. Code matches the design specifications. Traceability is complete from US_MSG_CHATQUEUE through requirements and design down to implementation. `npm run compile` and Sphinx docs build both succeed. Statuses updated to `implemented`.
