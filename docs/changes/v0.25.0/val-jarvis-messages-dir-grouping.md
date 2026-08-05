# Validation Report: jarvis-messages-dir-grouping

**Change Request**: jarvis-messages-dir-grouping (GH #59)
**Change Document**: [jarvis-messages-dir-grouping.md](jarvis-messages-dir-grouping.md)
**Verified by**: Verify Engineer
**Date**: 2026-08-05
**Verdict**: ✅ **PASSED**

---

## Scope

Verified only what the Change Document declares as changed. This is the widest
of the five CRs — it moves three runtime files and retargets every element that
named them.

### New elements

| ID | Level | Verified against |
|---|---|---|
| `US_CFG_RUNTIMELAYOUT` | L0 | discharged by `REQ_CFG_MSGDIR` + `REQ_CFG_STATEMIGRATION` |
| `REQ_CFG_MSGDIR` | L1 | `configPaths.ts` `getMessagesDir()` + three getters |
| `REQ_CFG_PATHSINGLESOURCE` | L1 | no path derivation left at any call site |
| `REQ_CFG_STATEMIGRATION` | L1 | union-read / write-current / remove-after-persist |
| `SPEC_CFG_STATEMIGRATION` | L2 | `messageQueue.ts` migration mechanism |

### Modified elements (verified as retargeted, not merely renamed)

`US_CFG_FIXEDPATHS`, `US_MSG_CHATQUEUE`, `REQ_CFG_FIXEDPATHS`, `REQ_MSG_QUEUE`,
`REQ_MSG_AUTODELIVER_CONFIG`, `REQ_MSG_AUDITLOG`, `REQ_MSG_REMINDERS_PERSIST`,
`REQ_MSG_AUTODELIVER_POLL`, `REQ_EXP_REMINDER_OPENFILE`, `REQ_FLOW_PACKAGE`,
`REQ_FLOW_DATASOURCE`, `REQ_FLOW_WEBVIEWPANEL`, `REQ_FLOW_LOGVIEWER`,
`REQ_FLOW_REQUEUE`, `SPEC_CFG_PATHRESOLVER`, `SPEC_CFG_WORKSPACEFILES`,
`SPEC_MSG_QUEUESTORE`, `SPEC_MSG_AUTODELIVER_STORE`, `SPEC_MSG_LOGSETTING`,
`SPEC_MSG_REMINDERSTORE`, `SPEC_MSG_REMINDERSLOOP`, `SPEC_MSG_REMINDERSCMDS`,
`SPEC_MSG_REMINDERSVIEW`, `SPEC_EXP_REMINDER_OPENFILE`, `SPEC_FLOW_DATASERVICE`,
`SPEC_FLOW_REQUEUE`, `SPEC_FLOW_LOGVIEWER`, `SPEC_FLOW_ACTORCLICK`,
`SPEC_MOD_FLOWPACKAGE`, `SPEC_SPL_NOTIFYACTOR`.

### Deprecated

`US_CFG_MSG`, `REQ_CFG_MSGPATH` — superseded, retained for history. ✅

---

## Traceability

| User Story | Requirements | Design |
|---|---|---|
| `US_CFG_RUNTIMELAYOUT` (new) | `REQ_CFG_MSGDIR`, `REQ_CFG_STATEMIGRATION` | `SPEC_CFG_WORKSPACEFILES`, `SPEC_CFG_PATHRESOLVER`, `SPEC_CFG_STATEMIGRATION` |
| `US_CFG_FIXEDPATHS` | `REQ_CFG_FIXEDPATHS`, `REQ_CFG_PATHSINGLESOURCE` | `SPEC_CFG_PATHRESOLVER` |
| `US_CFG_WORKSPACEFILES` | `REQ_CFG_STATEMIGRATION` AC-4 | `SPEC_CFG_WORKSPACEFILES` |
| `US_MSG_CHATQUEUE` | `REQ_MSG_QUEUE` | `SPEC_MSG_QUEUESTORE` |
| `US_MSG_LOGGING` | `REQ_MSG_AUDITLOG` | `SPEC_MSG_LOGSETTING` |
| `US_MSG_AUTODELIVERY` | `REQ_MSG_AUTODELIVER_CONFIG`, `_POLL` | `SPEC_MSG_AUTODELIVER_STORE` |
| `US_MSG_REMINDERS` | `REQ_MSG_REMINDERS_PERSIST`, `REQ_EXP_REMINDER_OPENFILE` | `SPEC_MSG_REMINDERSTORE`, `SPEC_EXP_REMINDER_OPENFILE` |
| `US_FLOW_CHORDVIEW`, `US_FLOW_LOGVIEWER` | `REQ_FLOW_*` | `SPEC_FLOW_DATASERVICE`, `SPEC_FLOW_REQUEUE`, `SPEC_FLOW_LOGVIEWER` |

The deprecated pair no longer carries downward authority — `REQ_MSG_QUEUE` and
`REQ_MSG_REMINDERS_PERSIST` both point at `REQ_CFG_FIXEDPATHS` instead. ✅

---

## Code vs. specification

| Spec claim | Evidence | Result |
|---|---|---|
| `getMessagesDir()` / `ensureMessagesDir()` exist | [configPaths.ts](../../packages/core/src/engine/core/configPaths.ts#L41-L49) | ✅ |
| Three getters resolve into `messages/` | [configPaths.ts](../../packages/core/src/engine/core/configPaths.ts#L55-L76) — `queue.json`, `log.json`, `autodelivery.json` | ✅ |
| Three read-only legacy getters exist | [configPaths.ts](../../packages/core/src/engine/core/configPaths.ts#L83-L91) | ✅ |
| Every queue read is a union read over current + legacy | [messageQueue.ts](../../packages/core/src/engine/sessions/messageQueue.ts#L82-L143) — `unionReadQueue` / `unionReadAutoDelivery` at every entry point | ✅ |
| Every write goes through one path that removes the legacy file after persisting | [messageQueue.ts](../../packages/core/src/engine/sessions/messageQueue.ts#L87-L143) — `writeAndRemoveLegacy` at every write | ✅ |
| Removal happens **after** the new file is persisted, never before | `writeAndRemoveLegacy` body read directly — write precedes unlink | ✅ |
| Flow (separate package) mirrors the resolver and never removes as a read-only consumer | `SPEC_FLOW_DATASERVICE` / `SPEC_FLOW_REQUEUE` and the flow sources read directly | ✅ |

The load-bearing claim here is not the rename but the **merge** semantics. The
System Designer replaced the CD's own proposed fallback-read with
merge-then-remove before implementation, on the grounds that a fallback read
would silently lose messages when core, flow and syspilot are upgraded
independently. That mechanism is what was verified above, call site by call
site: no read path bypasses the union, and no write path skips the removal.

---

## Build and tests

| Check | Result |
|---|---|
| `compile all` | ✅ clean |
| `npx vitest run` | ✅ 398 passed / 398, 39 files |

Migration coverage added on PM's `fix-now` in QM Round 2:
`message-queue-migration.test.ts` (10 assertions), `syspilot-migration.test.ts`,
`flow-migration.test.ts` (4), plus the extraction of flow's requeue into a
testable `requeueService.ts`.

---

## Findings

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 1 | — | QM Round 1: zero test coverage for the merge mechanism — the CR's highest-risk logic, governing pending user data. PM `fix-now`; three test files added and verified in Round 2. | Closed |
| 2 | low | No UAT scenario for the migration (CD Issue 5). Disclosed and scoped out by the CD. | Open, accepted |
| 3 | low | Removed-settings cluster (CD Issue 6). Disclosed and scoped out. | Open, separate CR |

No blocking issue.

---

## Status updates applied

`US_CFG_RUNTIMELAYOUT`, `REQ_CFG_MSGDIR`, `REQ_CFG_PATHSINGLESOURCE`,
`REQ_CFG_STATEMIGRATION`, `SPEC_CFG_STATEMIGRATION`: `approved` → `implemented`.
