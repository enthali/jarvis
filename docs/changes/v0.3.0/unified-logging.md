# Change Document: unified-logging

**Status**: approved
**Branch**: feature/unified-logging
**Created**: 2026-04-10
**Author**: Change Agent

---

## Summary

Replace the heartbeat-only plain `OutputChannel` with a single `LogOutputChannel` ("Jarvis") shared by all modules. Add structured log levels (trace/debug/info/warn/error) and category tags (`[Heartbeat]`, `[MSG]`, `[Scanner]`, `[Update]`) so users can diagnose issues via the VS Code Output panel's built-in level dropdown.

---

## Level 0: User Stories

**Status**: ✅ completed

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_DEV_LOGGING | Structured logging across all Jarvis modules | mandatory |

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_AUT_HEARTBEAT | Scheduled and Manual Automation Jobs | none | AC-6 ("output visible in Output Channel") still satisfied — channel is now shared but output remains visible. No text change needed. |

### Decisions

- D-1: Create one new US `US_DEV_LOGGING` in the DEV theme — this is developer tooling, not automation
- D-2: `US_AUT_HEARTBEAT` AC-6 is unaffected — it says "dedicated Output Channel" meaning "a specific place to see output" which remains true with the shared "Jarvis" channel

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies — US_AUT_HEARTBEAT is about automation; US_DEV_LOGGING is about cross-cutting log infrastructure
- [x] No gaps — single US covers entire logging change

---

## Level 1: Requirements

**Status**: ✅ completed

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_DEV_LOGGING | Unified LogOutputChannel with levels and module tags | US_DEV_LOGGING | mandatory |

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_AUT_OUTPUT | US_AUT_HEARTBEAT | modified | AC-1: channel name changes from "Jarvis Heartbeat" to "Jarvis"; AC-2 unchanged; add note that channel is now a shared LogOutputChannel |

### Decisions

- D-1: Single new REQ `REQ_DEV_LOGGING` specifies the unified channel, log levels, and module tags
- D-2: `REQ_AUT_OUTPUT` AC-1 updated to reference the shared "Jarvis" channel instead of "Jarvis Heartbeat"
- D-3: No new settings needed — VS Code's built-in log-level dropdown on LogOutputChannel handles filtering

### Horizontal Check (MECE)

- [x] No contradictions — REQ_DEV_LOGGING defines the shared channel; REQ_AUT_OUTPUT now references it
- [x] No redundancies — REQ_DEV_LOGGING covers channel creation + levels; REQ_AUT_OUTPUT covers heartbeat-specific output routing
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_DEV_LOGCHANNEL | Unified LogOutputChannel implementation | REQ_DEV_LOGGING |

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_AUT_OUTPUTCHANNEL | REQ_AUT_OUTPUT | modified | Remove channel creation from activateHeartbeat(); accept shared LogOutputChannel; use .error() in notifyFailure() |
| SPEC_AUT_JOBSCHEMA | REQ_AUT_JOBCONFIG | modified | loadJobs() parameter type OutputChannel → LogOutputChannel |
| SPEC_AUT_AGENTEXEC | REQ_AUT_JOBEXEC | modified | executeAgentStep() parameter type change; use .debug()/.info() |
| SPEC_AUT_EXECUTOR | REQ_AUT_JOBEXEC | modified | spawnStep() parameter type change; use .info() per line |

### Decisions

- D-1: LogOutputChannel created in `activate()` and passed to all modules
- D-2: `activateHeartbeat()` signature gains a `LogOutputChannel` parameter, removes internal creation
- D-3: `checkForUpdates()` gains a `LogOutputChannel` parameter
- D-4: `YamlScanner` constructor gains a `LogOutputChannel` parameter
- D-5: All `OutputChannel` types in heartbeat.ts become `LogOutputChannel`
- D-6: spawn stdout/stderr uses `.info()` per line instead of raw `.append()`

### Horizontal Check (MECE)

- [x] No contradictions with existing specs
- [x] No redundancies — SPEC_DEV_LOGCHANNEL defines the channel + per-module patterns; existing specs updated for type change
- [x] All new SPECs link to Requirements

---

## UAT

| ID | Title |
|----|-------|
| US_UAT_LOGGING | UAT for US_DEV_LOGGING |
| REQ_UAT_LOGGING | UAT for REQ_DEV_LOGGING |
| SPEC_UAT_LOGGING | UAT for SPEC_DEV_LOGCHANNEL |
