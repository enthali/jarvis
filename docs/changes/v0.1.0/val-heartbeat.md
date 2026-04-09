# Verification Report: heartbeat

**Date**: 2026-04-08
**Change Document**: docs/changes/heartbeat.md
**Test Protocol**: docs/changes/tst-heartbeat.md
**Status**: ✅ PASSED

---

## Summary

| Category | Total | Verified | Issues |
|----------|-------|----------|--------|
| User Stories | 5 | 5 | 0 |
| Requirements | 10 | 10 | 0 |
| Designs | 7 | 7 | 0 |
| Implementations | 4 | 4 | 0 |
| Tests | 12 | 12 | 0 |
| Traceability | 17 | 17 | 0 |

---

## Test Protocol

**File**: docs/changes/tst-heartbeat.md
**Result**: PASSED

| # | REQ ID | AC | Description | Result |
|---|--------|----|-------------|--------|
| 1 | REQ_AUT_SCHEDULER | AC-1,2,3 | Cron job fires every minute, sentinel.txt written | PASS |
| 2 | REQ_AUT_JOBEXEC | AC-2 | PowerShell step executes via pwsh, output in channel | PASS |
| 3 | REQ_AUT_OUTPUT | AC-1,2 | Output Channel shows sentinel script output | PASS |
| 4 | REQ_AUT_STATUSBAR | AC-1,2,3 | Status bar shows next job + time after config loaded | PASS |
| 5 | REQ_AUT_MANUALRUN | AC-1,2 | `Jarvis: Run Heartbeat Job` QuickPick → job runs | PASS |
| 6 | REQ_AUT_JOBEXEC | AC-3 | Command step executes via executeCommand, logged | PASS |
| 7 | REQ_AUT_JOBEXEC | AC-1 | Python step runs via python.defaultInterpreterPath | PASS |
| 8 | REQ_AUT_OUTPUT | AC-2 | Python stdout visible in channel | PASS |
| 9 | REQ_AUT_JOBEXEC | AC-4 | Job aborts on exit 1, remaining steps skipped | PASS |
| 10 | REQ_AUT_OUTPUT | AC-3,4 | Error toast shown with job name + "powershell exit 1" | PASS |
| 11 | REQ_CFG_HEARTBEATPATH | AC-1,2,3 | jarvis.heartbeatConfigFile override loads jobs | PASS |
| 12 | REQ_CFG_HEARTBEATINTERVAL | AC-1,2 | jarvis.heartbeatInterval=10 → scheduler fires every ~10s | PASS |

---

## Requirements Coverage

| REQ ID | Description | SPEC | Code | Test | Status |
|--------|-------------|------|------|------|--------|
| REQ_AUT_JOBCONFIG | Job Definition Schema | SPEC_AUT_JOBSCHEMA | ✅ | ✅ | ✅ |
| REQ_AUT_SCHEDULER | Scheduler Tick and Cron Dispatch | SPEC_AUT_SCHEDULERLOOP | ✅ | ✅ | ✅ |
| REQ_AUT_JOBEXEC | Job Step Execution | SPEC_AUT_EXECUTOR | ✅ | ✅ | ✅ |
| REQ_AUT_MANUALRUN | Manual Job Trigger | SPEC_AUT_MANUALCOMMAND | ✅ | ✅ | ✅ |
| REQ_AUT_STATUSBAR | Status Bar Next-Job Display | SPEC_AUT_STATUSBARITEM | ✅ | ✅ | ✅ |
| REQ_AUT_OUTPUT | Output Channel and Failure Notification | SPEC_AUT_OUTPUTCHANNEL | ✅ | ✅ | ✅ |
| REQ_CFG_HEARTBEATPATH | Heartbeat Config File Resolution | SPEC_CFG_HEARTBEATSETTINGS | ✅ | ✅ | ✅ |
| REQ_CFG_HEARTBEATINTERVAL | Configurable Heartbeat Tick Interval | SPEC_CFG_HEARTBEATSETTINGS | ✅ | ✅ | ✅ |
| REQ_UAT_HEARTBEAT_TESTDATA | Heartbeat Test Data Files | SPEC_UAT_HEARTBEAT_FILES | ✅ | ✅ | ✅ |
| (test traceability) | US_UAT_HEARTBEAT — Heartbeat Acceptance Tests | — | testdata/heartbeat/ | tst-heartbeat.md | ✅ |

---

## Acceptance Criteria Verification

### REQ_AUT_JOBCONFIG
- [x] AC-1: `HeartbeatJob` interface has `name`, `schedule`, `steps` — `src/heartbeat.ts` ✅
- [x] AC-2: `HeartbeatStep` interface has `type` (`python|powershell|command`) and `run` — `src/heartbeat.ts` ✅
- [x] AC-3: `loadJobs()` wraps `fs.readFileSync` + `yaml.load` in try/catch; appends `[Heartbeat] Failed to load config: ...` to Output Channel — `src/heartbeat.ts:35-43` ✅

### REQ_AUT_SCHEDULER
- [x] AC-1: `setInterval(() => this.tick(), interval * 1000)` where `interval = Math.max(10, heartbeatInterval)` — `src/heartbeat.ts` ✅
- [x] AC-2: `matchesCron()` evaluates 5-field cron expressions against current wall-clock time — `src/heartbeat.ts` ✅
- [x] AC-3: Jobs matching `matchesCron()` are dispatched to `executeJob()` — `src/heartbeat.ts` ✅
- [x] AC-4: `lastFired.get(job.name) === minuteKey` deduplication prevents double-dispatch within same clock-minute — `src/heartbeat.ts` ✅
- [x] AC-5: No else-branch or log when no jobs match (silent idle) — `src/heartbeat.ts` ✅

### REQ_AUT_JOBEXEC
- [x] AC-1: Python step resolves interpreter via `python.defaultInterpreterPath`, falls back to `'python'` if empty — `src/heartbeat.ts` ✅
- [x] AC-2: PowerShell step spawns `pwsh -NonInteractive -File <script>` — `src/heartbeat.ts` ✅
- [x] AC-3: Command step calls `vscode.commands.executeCommand(step.run)` — `src/heartbeat.ts` ✅
- [x] AC-4: `executeJob()` aborts on first `result.success === false`; returns failure result immediately — `src/heartbeat.ts` ✅

### REQ_AUT_MANUALRUN
- [x] AC-1: `jarvis.runHeartbeatJob` registered; `runManualJob()` filters `schedule === 'manual'` — `src/heartbeat.ts` ✅
- [x] AC-2: `vscode.window.showQuickPick(manual.map(j => j.name), ...)` presents all manual jobs — `src/heartbeat.ts` ✅

### REQ_AUT_STATUSBAR
- [x] AC-1: `item.text = \`$(clock) ${best.name} ${hhmm}\`` shows name and next fire time — `src/heartbeat.ts` ✅
- [x] AC-2: `updateStatusBar()` called at end of every `tick()` — `src/heartbeat.ts` ✅
- [x] AC-3: `item.text = 'Heartbeat: idle'` when `scheduled.length === 0` — `src/heartbeat.ts` ✅

### REQ_AUT_OUTPUT
- [x] AC-1: `vscode.window.createOutputChannel('Jarvis Heartbeat')` in `activateHeartbeat()` — `src/heartbeat.ts` ✅
- [x] AC-2: `proc.stdout.on('data', ...)` and `proc.stderr.on('data', ...)` pipe all subprocess output to channel — `src/heartbeat.ts` ✅
- [x] AC-3: `vscode.window.showErrorMessage(msg)` called in `notifyFailure()` — `src/heartbeat.ts` ✅
- [x] AC-4: `msg` includes job name, `result.stepType`, and `result.error` (exit code / exception) — `src/heartbeat.ts` ✅

### REQ_CFG_HEARTBEATPATH
- [x] AC-1: `resolveConfigPath()` returns override when `heartbeatConfigFile` is a non-empty string — `src/heartbeat.ts` ✅
- [x] AC-2: Falls back to `context.storageUri!/heartbeat.yaml` (workspace storage) — `src/heartbeat.ts` ✅
- [x] AC-3: No legacy `.jarvis/heartbeat.yaml` fallback path — `src/heartbeat.ts` ✅
- [x] AC-4: `onDidChangeConfiguration` restarts scheduler on `jarvis.heartbeatConfigFile` change — `src/heartbeat.ts` ✅

### REQ_CFG_HEARTBEATINTERVAL
- [x] AC-1: `jarvis.heartbeatInterval` setting; `default: 60`, `minimum: 10` in `package.json`; enforced via `Math.max(10, ...)` in code — `package.json`, `src/heartbeat.ts` ✅
- [x] AC-2: `onDidChangeConfiguration` handler calls `scheduler.dispose()` + `scheduler.start(...)` on change — `src/heartbeat.ts` ✅

### REQ_UAT_HEARTBEAT_TESTDATA
- [x] AC-1: `testdata/heartbeat/heartbeat.yaml` contains T-1 (cron/powershell), T-2 (manual/command), T-3 (python), T-4 (fail/exit 1) — verified ✅
- [x] AC-2: `testdata/heartbeat/scripts/` contains `write-sentinel.ps1`, `venv-check.py`, `fail-exit1.ps1` — verified ✅
- [x] AC-3: `fail-exit1.ps1` causes non-zero exit to trigger toast testing — verified ✅

### US_UAT_HEARTBEAT
- [x] AC-1: `testdata/heartbeat/` folder covers all three step types plus failure path ✅
- [x] AC-2: Test scenarios T-1..T-6 documented in `us_tst.rst` with expected observable outcomes ✅
- [x] AC-3: T-4 covers job failure with error toast and Output Channel log ✅
- [x] AC-4: T-6 covers `jarvis.heartbeatInterval` change causing scheduler restart ✅

---

## Design Adherence

### SPEC_AUT_JOBSCHEMA → `src/heartbeat.ts`
`HeartbeatStep`, `HeartbeatJob` interfaces and `loadJobs()` match the spec exactly. ✅

### SPEC_AUT_SCHEDULERLOOP → `src/heartbeat.ts`
`matchesCronField()` and `matchesCron()` identical to spec. `HeartbeatScheduler` class with `lastFired`, `start()`, `dispose()` present. Tick logic (minute-key deduplication, dispatch) matches spec.

**Observation (Low)**: Spec shows `tick(jobs: HeartbeatJob[])` as taking a parameter; implementation uses `private tick()` reading from `this.jobs`. This is a minor improvement in encapsulation — functionally equivalent. ✅

### SPEC_AUT_EXECUTOR → `src/heartbeat.ts`
`executeJob()`, `runStep()`, `spawnStep()` match the spec. Python interpreter resolution and powershell spawn match.

**Observation (Low)**: Spec notes "pwsh (fallback `powershell`)". Implementation spawns `pwsh` without an explicit `powershell` fallback. Not tested; not a requirement-level AC. No blocking issue. ✅

### SPEC_AUT_MANUALCOMMAND → `src/heartbeat.ts`
`runManualJob()` implementation matches spec (QuickPick, filter by `manual`, `executeJob`). Command registration moved into `activateHeartbeat()` in `heartbeat.ts` rather than `extension.ts` as shown in the spec snippet — this is a better architectural choice (single-responsibility) and functionally identical. `extension.ts` traceability comment includes `SPEC_AUT_MANUALCOMMAND`. ✅

### SPEC_AUT_STATUSBARITEM → `src/heartbeat.ts`
`nextFireMinutes()` (10080-minute scan) and `updateStatusBar()` (idle branch, best-job branch) match the spec code verbatim. ✅

### SPEC_AUT_OUTPUTCHANNEL → `src/heartbeat.ts`
Output Channel created with `'Jarvis Heartbeat'`, pushed to subscriptions. `notifyFailure()` shows error message and logs to channel.

**Observation (Low)**: Spec shows `notifyFailure(job, result)` closing over `outputChannel`; implementation uses `notifyFailure(job, result, outputChannel)` (explicit parameter). Functionally equivalent. ✅

### SPEC_CFG_HEARTBEATSETTINGS → `package.json`, `src/heartbeat.ts`
Both settings appear in `contributes.configuration` with correct types, defaults, and minimum values. `resolveConfigPath()` matches spec. Config-change handler (dispose + restart) matches spec. ✅

---

## Traceability Matrix

| User Story | Requirement | Specification | Implementation | Test | Complete |
|------------|-------------|---------------|----------------|------|----------|
| US_AUT_HEARTBEAT | REQ_AUT_JOBCONFIG | SPEC_AUT_JOBSCHEMA | `src/heartbeat.ts` | tst-heartbeat #1 | ✅ |
| US_AUT_HEARTBEAT | REQ_AUT_SCHEDULER | SPEC_AUT_SCHEDULERLOOP | `src/heartbeat.ts` | tst-heartbeat #1,4 | ✅ |
| US_AUT_HEARTBEAT | REQ_AUT_JOBEXEC | SPEC_AUT_EXECUTOR | `src/heartbeat.ts` | tst-heartbeat #2,6,7,9 | ✅ |
| US_AUT_HEARTBEAT | REQ_AUT_MANUALRUN | SPEC_AUT_MANUALCOMMAND | `src/heartbeat.ts` | tst-heartbeat #5 | ✅ |
| US_AUT_HEARTBEAT | REQ_AUT_STATUSBAR | SPEC_AUT_STATUSBARITEM | `src/heartbeat.ts` | tst-heartbeat #4 | ✅ |
| US_AUT_HEARTBEAT | REQ_AUT_OUTPUT | SPEC_AUT_OUTPUTCHANNEL | `src/heartbeat.ts` | tst-heartbeat #3,8,10 | ✅ |
| US_CFG_HEARTBEAT | REQ_CFG_HEARTBEATPATH | SPEC_CFG_HEARTBEATSETTINGS | `heartbeat.ts`, `package.json` | tst-heartbeat #11 | ✅ |
| US_CFG_HEARTBEAT | REQ_CFG_HEARTBEATINTERVAL | SPEC_CFG_HEARTBEATSETTINGS | `heartbeat.ts`, `package.json` | tst-heartbeat #12 | ✅ |
| US_UAT_HEARTBEAT | REQ_UAT_HEARTBEAT_TESTDATA | SPEC_UAT_HEARTBEAT_FILES | `testdata/heartbeat/` | tst-heartbeat.md | ✅ |

---

## Observations (Non-Blocking)

| # | Severity | Category | Description |
|---|----------|----------|-------------|
| O-1 | Low | Design | `tick()` in implementation takes no parameters (reads `this.jobs`); spec showed it as parameter. Better encapsulation — no functional impact. |
| O-2 | Low | Design | `notifyFailure()` takes explicit `outputChannel` parameter; spec showed it closing over it. Functionally equivalent. |
| O-3 | Low | Design | `jarvis.runHeartbeatJob` registered inside `activateHeartbeat()` in `heartbeat.ts` rather than `extension.ts` as spec snippet suggested. Better separation of concerns; traceability comment in `extension.ts` preserves discoverability. |
| O-4 | Low | Design | `pwsh` fallback to `powershell` mentioned in spec but not implemented. Not a REQ-level AC; no test exercises the fallback. Low risk. |

---

## Conclusion

All 8 automation/config requirements (REQ_AUT_* and REQ_CFG_HEARTBEAT*) are fully implemented in `src/heartbeat.ts` and `package.json`. All 7 design specifications (SPEC_AUT_* and SPEC_CFG_HEARTBEATSETTINGS) are correctly implemented. Test traceability items (US_UAT_HEARTBEAT, REQ_UAT_HEARTBEAT_TESTDATA, SPEC_UAT_HEARTBEAT_FILES) are in place. The test protocol result is **PASSED** with 12/12 test rows passing. Four low-severity observations were noted — none require rework before merge.

**Verification result: ✅ PASSED**
