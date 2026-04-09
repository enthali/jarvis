# Test Protocol: session-tools

**Date**: 2026-04-09
**Change Document**: docs/changes/session-tools.md
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_MSG_SESSIONFILTER | AC-1 | Named = non-empty title | PASS |
| 2 | REQ_MSG_SESSIONFILTER | AC-2 | Empty/missing titles excluded | PASS |
| 3 | REQ_MSG_SESSIONFILTER | AC-3 | Filter used by both Open Session and List Sessions | PASS |
| 4 | REQ_MSG_OPENSESSION | AC-1 | `jarvis.openSession` opens QuickPick with named sessions | PASS |
| 5 | REQ_MSG_OPENSESSION | AC-2 | QuickPick filtered by REQ_MSG_SESSIONFILTER | PASS |
| 6 | REQ_MSG_OPENSESSION | AC-3 | Selecting session opens it via vscode-chat-session URI | PASS |
| 7 | REQ_MSG_OPENSESSION | AC-4 | No named sessions → info notification | SKIP |
| 8 | REQ_MSG_OPENSESSION | AC-5 | Stale session race accepted as-is | SKIP |
| 9 | REQ_MSG_LISTSESSIONS | AC-1 | `jarvis_listSessions` registered with canBeReferencedInPrompt | PASS |
| 10 | REQ_MSG_LISTSESSIONS | AC-2 | Returns list of session titles | PASS |
| 11 | REQ_MSG_LISTSESSIONS | AC-3 | Returned list filtered by REQ_MSG_SESSIONFILTER | PASS |
| 12 | REQ_MSG_LISTSESSIONS | AC-4 | Empty list when no sessions | SKIP |
| 13 | REQ_EXP_AGENTSESSION | AC-1 | Inline $(comment-discussion) button on project/event items | PASS |
| 14 | REQ_EXP_AGENTSESSION | AC-2 | Button opens matching session by entity name | PASS |
| 15 | REQ_EXP_AGENTSESSION | AC-3 | No session → creates new + init prompt with entity name | PASS |
| 16 | REQ_EXP_AGENTSESSION | AC-4 | Folder nodes do NOT display button | PASS |

## Notes

- AC-4/AC-5 for REQ_MSG_OPENSESSION and AC-4 for REQ_MSG_LISTSESSIONS skipped: requires a workspace with zero named sessions, not practically testable in current environment.
- User noted VS Code default session title is "Chat" not "New Chat" — current filter still works correctly as these sessions have non-empty titles. Existing filter is consistent with spec.
- listSessions tool returns JSON array string e.g. `["Test Session","Developer Session",...]` — confirmed via chat tool invocation.
