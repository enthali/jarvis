# Test Protocol: message-inbox

**Date**: 2026-04-10
**Change Document**: docs/changes/message-inbox.md
**Tester**: User (manual UAT)
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| T-2 | REQ_MSG_SEND | AC-3, AC-4 | Play-Button sends a single stub notification instead of individual messages; messages stay in queue | PASS |
| T-3 | REQ_MSG_SEND | AC-2, AC-6 | Notification stub sent to existing named session (focused via UUID) | PASS |
| T-4 | REQ_MSG_SEND | AC-6, AC-7 | Notification stub sent to closed session (restored via UUID) | PASS |
| T-6a | REQ_MSG_READ | AC-1, AC-2, AC-3, AC-4 | `jarvis_readMessage` returns oldest message + remaining count | PASS |
| T-6b | REQ_MSG_READ | AC-4, AC-6 | Messages removed from queue and tree after reading | PASS |
| T-6c | REQ_MSG_READ | AC-5 | Repeated calls until remaining=0 works correctly; final call returns `{ message: null, remaining: 0 }` | PASS |

## Notes

- All test scenarios from US_UAT_MSG (T-2 through T-6) confirmed passed by user during manual UAT.
- T-1 (queue write) and T-5 (delete single message) are pre-existing functionality not modified by this change; confirmed working.
