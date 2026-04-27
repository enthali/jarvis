# Test Protocol: tree-node-open-file

**Date**: 2026-04-15
**Change**: tree-node-open-file
**Branch**: feature/tree-node-open-file
**Result**: PASSED

---

## Scope

Manual UAT for `REQ_EXP_HEARTBEAT_OPENFILE` and `REQ_EXP_MESSAGE_OPENFILE`.
Test data: `testdata/heartbeat/heartbeat.yaml` (T-1..T-3), `testdata/msg/messages.json` (T-4..T-6).

**Pre-conditions:**
1. Press F5 in VS Code to launch Extension Development Host.
2. In the EDH workspace, configure `jarvis.heartbeatConfigFile` to point to `testdata/heartbeat/heartbeat.yaml`.
3. Configure `jarvis.messagesFile` to point to `testdata/msg/messages.json` (create the file with ≥2 message entries if absent).
4. Open Jarvis sidebar, expand Heartbeat and Messages views.

---

## Test Results

| # | REQ ID | AC | Description | Result | Tester | Date |
|---|--------|----|-------------|--------|--------|------|
| T-1 | REQ_EXP_HEARTBEAT_OPENFILE | AC-1, AC-2, AC-3 | Click any job node → `heartbeat.yaml` opens, cursor at `name: <jobName>` line | PASS | Georg | 2026-04-15 |
| T-2 | REQ_EXP_HEARTBEAT_OPENFILE | AC-4 | Temporarily rename a job in YAML (so name no longer matches node label), click node → file opens at line 0 | PASS | Georg | 2026-04-15 |
| T-3 | REQ_EXP_HEARTBEAT_OPENFILE | AC-6 | Set `jarvis.heartbeatConfigFile` to a non-existent path, click job node → warning toast appears, no crash | PASS | Georg | 2026-04-15 |
| T-4 | REQ_EXP_MESSAGE_OPENFILE | AC-1, AC-2, AC-3 | Click message node at index > 0 → `messages.json` opens, cursor at that message's line | PASS | Georg | 2026-04-15 |
| T-5 | REQ_EXP_MESSAGE_OPENFILE | AC-3 | Click index-0 and index-1 nodes alternately → cursor positions differ between clicks | PASS | Georg | 2026-04-15 |
| T-6 | REQ_EXP_MESSAGE_OPENFILE | AC-6 | Set `jarvis.messagesFile` to a non-existent path, click message node → warning toast appears, no crash | PASS | Georg | 2026-04-15 |

---

## Notes

- `npm run compile` exits 0 — no TypeScript errors (verified).
- T-1..T-6 require manual execution in the Extension Development Host (F5). All executed 2026-04-15 by Georg Doll.
