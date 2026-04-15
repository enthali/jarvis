# Test Protocol: tree-node-open-file

**Date**: 2026-04-15
**Change**: tree-node-open-file
**Branch**: feature/tree-node-open-file
**Result**: PASSED

---

## Scope

Manual UAT for `REQ_EXP_HEARTBEAT_OPENFILE` and `REQ_EXP_MESSAGE_OPENFILE`.
Test data: `testdata/heartbeat/heartbeat.yaml` (T-1..T-3), `testdata/msg/messages.json` (T-4..T-6).

---

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|----|-------------|--------|
| T-1 | REQ_EXP_HEARTBEAT_OPENFILE | AC-1, AC-2, AC-3 | Click `t1-cron-sentinel` job node → `heartbeat.yaml` opens at job name line | PASS |
| T-2 | REQ_EXP_HEARTBEAT_OPENFILE | AC-4 | Click stale job node (name absent in YAML) → file opens at line 0 | PASS |
| T-3 | REQ_EXP_HEARTBEAT_OPENFILE | AC-6 | Click job node when `heartbeat.yaml` path does not exist → warning toast, no crash | PASS |
| T-4 | REQ_EXP_MESSAGE_OPENFILE | AC-1, AC-2, AC-3 | Click message node at index 1 → `messages.json` opens at second message | PASS |
| T-5 | REQ_EXP_MESSAGE_OPENFILE | AC-3 | Click index-0 and index-1 nodes alternately → cursor positions differ | PASS |
| T-6 | REQ_EXP_MESSAGE_OPENFILE | AC-6 | Click message node when `messages.json` does not exist → warning toast, no crash | PASS |

---

## Notes

- `npm run compile` exits 0 — no TypeScript errors.
- Both commands are read-only; no side effects on queue or tree data were observed.
- Fallback to line 0 (T-2, implicitly T-4 out-of-range) confirmed by spec design; no error dialog shown.
