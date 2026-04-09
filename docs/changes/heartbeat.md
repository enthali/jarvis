# Change Document: heartbeat

**Status**: approved
**Branch**: feature/heartbeat
**Created**: 2026-04-08
**Author**: Jarvis Developer

---

## Summary

Port the Heartbeat Scheduler from the old Jarvis extension into the new one.
Heartbeat allows scheduled jobs (cron expressions) and manual jobs to be configured
via YAML. Jobs can execute Python scripts, PowerShell scripts, or VS Code commands.

Config location priority:
1. `jarvis.heartbeatConfigFile` (settings override, absolute path)
2. `context.storageUri/heartbeat.yaml` (default, workspace-specific, not in repo)
3. `.jarvis/heartbeat.yaml` in workspace root (legacy fallback)

Scope: Heartbeat scheduler only. LLM-based background agent and `sendToChat`
are separate future changes.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact |
|----|-------|--------|
| US_CFG_PROJECTPATH | Configurable Folder Paths | none — different config concern |
| US_EXP_SIDEBAR | Project & Event Explorer | none — heartbeat is independent |

### New Theme: AUT (Automation/Scheduling)

New user story file `us_aut.rst` will be created.

### New User Stories

#### US_AUT_HEARTBEAT: Scheduled and Manual Automation Jobs

```rst
.. story:: Scheduled and Manual Automation Jobs
   :id: US_AUT_HEARTBEAT
   :status: draft
   :priority: optional

   **As a** Jarvis User,
   **I want** to configure and run scheduled and manual automation jobs from VS Code,
   **so that** I can automate recurring tasks (scripts, VS Code commands) without
   leaving the editor.

   **Acceptance Criteria:**

   * AC-1: A YAML file defines named jobs with a cron schedule or ``"manual"`` trigger
   * AC-2: Jobs can execute Python scripts, PowerShell scripts, or VS Code commands as steps
   * AC-3: Scheduled jobs fire automatically based on their cron expression
   * AC-4: Manual jobs can be triggered on demand from VS Code
   * AC-5: A status bar item shows the next scheduled job and its fire time
   * AC-6: Job output is visible in a dedicated Output Channel
```

#### US_CFG_HEARTBEAT: Heartbeat Config File Location

```rst
.. story:: Heartbeat Config File Location
   :id: US_CFG_HEARTBEAT
   :status: draft
   :priority: optional

   **As a** Jarvis User,
   **I want** to control where Jarvis reads the heartbeat configuration,
   **so that** I can keep job definitions out of the repository by default
   or share them via an explicit path.

   **Acceptance Criteria:**

   * AC-1: By default, ``heartbeat.yaml`` is read from the VS Code workspace storage
     folder (workspace-specific, not committed to the repo)
   * AC-2: A setting ``jarvis.heartbeatConfigFile`` overrides the location with an
     absolute path to any ``heartbeat.yaml``
   * AC-3: A setting ``jarvis.heartbeatInterval`` controls the scheduler tick interval
     in seconds (default: 60)
```

### Decisions

- Decision 1: New AUT theme for automation/scheduling user stories and requirements
- Decision 2: Legacy fallback (`.jarvis/heartbeat.yaml` in workspace root) removed — not needed
- Decision 3: Two stories split by concern: scheduler behavior (AUT) vs. config (CFG)
- Decision 4: Tick interval is configurable via settings (not hardcoded to 60s)
- Decision 5: Silent idle tick — no log output when tick fires but no jobs run
- Decision 6: Job failure notifies user via VS Code toast (error notification) + Output Channel log (AC-7 added to US_AUT_HEARTBEAT)
- Decision 7: Manual trigger mechanism (AC-4) left deliberately vague at US level — decided at SPEC level
- Decision 8: Cross-links added between US_AUT_HEARTBEAT and US_CFG_HEARTBEAT (bidirectional `:links:`)

### Horizontal Check (MECE)

- ✅ US_CFG_PROJECTPATH: folder config for projects/events — different domain, no overlap
- ✅ US_AUT_HEARTBEAT and US_CFG_HEARTBEAT: complementary (behavior vs. config), no overlap
- ✅ AC-1..7 cover full heartbeat scope (jobs, steps, scheduling, manual trigger, status bar, output, failure notification)
- ✅ Scope boundary: LLM/sendToChat explicitly excluded (separate future changes)
- ✅ MECE advisory run; G-1 resolved via AC-7; G-2 deferred to SPEC; O-1 non-issue; L-1 resolved via :links:

---

## Level 1: Requirements

**Status**: ✅ completed

### New Requirements (req_aut.rst — new file)

| ID | Title | Links To |
|----|-------|----------|
| REQ_AUT_JOBCONFIG | Job Definition Schema | US_AUT_HEARTBEAT |
| REQ_AUT_SCHEDULER | Scheduler Tick and Cron Dispatch | US_AUT_HEARTBEAT |
| REQ_AUT_JOBEXEC | Job Step Execution | US_AUT_HEARTBEAT |
| REQ_AUT_MANUALRUN | Manual Job Trigger | US_AUT_HEARTBEAT |
| REQ_AUT_STATUSBAR | Status Bar Next-Job Display | US_AUT_HEARTBEAT |
| REQ_AUT_OUTPUT | Output Channel and Failure Notification | US_AUT_HEARTBEAT |

### New Requirements (appended to req_cfg.rst)

| ID | Title | Links To |
|----|-------|----------|
| REQ_CFG_HEARTBEATPATH | Heartbeat Config File Resolution | US_CFG_HEARTBEAT |
| REQ_CFG_HEARTBEATINTERVAL | Configurable Heartbeat Tick Interval | US_CFG_HEARTBEAT |

### Decisions

- Decision 9: Job failure = single toast for the job (no per-step toasts); simplifies error surface
- Decision 10: Cron syntax = standard 5-field minute-resolution; no seconds or @-aliases for now
- Decision 11: Manual trigger surface pinned to VS Code command (`jarvis.runHeartbeatJob`) at REQ level — SPEC decides picker UI
- Decision 12: Config file validation (malformed/missing YAML) handled in REQ_AUT_JOBCONFIG AC-3
- Decision 13: REQ_AUT_JOBEXEC AC-5 removed (stdout/stderr routing owned solely by REQ_AUT_OUTPUT AC-2); cross-link added instead
- Decision 14: REQ_CFG_HEARTBEATPATH AC-4 added — config reload on setting change (mirrors REQ_CFG_FOLDERPATHS AC-3 pattern)
- Decision 15: Horizontal `:links:` added — JOBCONFIG→HEARTBEATPATH, SCHEDULER→HEARTBEATINTERVAL, JOBEXEC→OUTPUT, MANUALRUN→JOBEXEC, STATUSBAR→SCHEDULER

### Horizontal Check (MECE)

- ✅ REQ_CFG_SCANINTERVAL / REQ_CFG_HEARTBEATINTERVAL: same pattern, different subsystems — no conflict
- ✅ REQ_CFG_FOLDERPATHS: different config concern, no overlap
- ✅ All 7 ACs of US_AUT_HEARTBEAT covered: AC-1→JOBCONFIG, AC-2→JOBEXEC, AC-3→SCHEDULER, AC-4→MANUALRUN, AC-5→STATUSBAR, AC-6→OUTPUT, AC-7→OUTPUT
- ✅ All 3 ACs of US_CFG_HEARTBEAT covered: AC-1/2→HEARTBEATPATH, AC-3→HEARTBEATINTERVAL
- ✅ MECE advisory run; R-1 resolved (JOBEXEC AC-5 removed); G-1 resolved (HEARTBEATPATH AC-4); O-1 resolved (horizontal links)

---

## Level 2: Design

**Status**: ✅ completed

### New Specifications (spec_aut.rst — new file)

| ID | Title | Links To |
|----|-------|----------|
| SPEC_AUT_JOBSCHEMA | YAML Job Schema and TypeScript Interfaces | REQ_AUT_JOBCONFIG |
| SPEC_AUT_SCHEDULERLOOP | Scheduler Timer and Cron Dispatch | REQ_AUT_SCHEDULER, REQ_AUT_JOBCONFIG |
| SPEC_AUT_EXECUTOR | Job Step Executor | REQ_AUT_JOBEXEC, REQ_AUT_OUTPUT |
| SPEC_AUT_MANUALCOMMAND | Manual Job VS Code Command | REQ_AUT_MANUALRUN, REQ_AUT_EXECUTOR |
| SPEC_AUT_STATUSBARITEM | Status Bar Next-Job Display | REQ_AUT_STATUSBAR, SPEC_AUT_SCHEDULERLOOP |
| SPEC_AUT_OUTPUTCHANNEL | Output Channel and Failure Notification | REQ_AUT_OUTPUT, SPEC_AUT_EXECUTOR |

### New Specifications (appended to spec_cfg.rst)

| ID | Title | Links To |
|----|-------|----------|
| SPEC_CFG_HEARTBEATSETTINGS | Heartbeat Settings in package.json | REQ_CFG_HEARTBEATPATH, REQ_CFG_HEARTBEATINTERVAL |

### Decisions

- Decision 16: `command` step failure = caught JS exception only; no-throw = success (matches existing executeCommand usage pattern)
- Decision 17: Inline cron micro-matcher (~20 lines) — no new npm dependency; covers `*`, `*/n`, ranges, lists, exact values
- Decision 18: Single `src/heartbeat.ts` module for all heartbeat logic
- Decision 19: `nextFireMinutes` scans forward up to 10080 minutes (7 days) for status bar display
- Decision 20: `SPEC_AUT_STATUSBARITEM` links to `SPEC_AUT_SCHEDULERLOOP` (cross-SPEC link) — status bar is driven by scheduler tick
- Decision 21: Python executable = `python.defaultInterpreterPath` (VS Code Python extension) → fallback `python`; picks up active venv
- Decision 22: PowerShell executable = `pwsh` → fallback `powershell`
- Decision 23: `onDidChangeConfiguration` restart owned solely by `SPEC_CFG_HEARTBEATSETTINGS`; SPEC_AUT_SCHEDULERLOOP delegates via `:links:`
- Decision 24: `updateStatusBar` shows `'Heartbeat: idle'` when scheduled jobs exist but none fire within 7 days

### Horizontal Check (MECE)

- ✅ SPEC_CFG_SETTINGS: adds folder/scan settings; SPEC_CFG_HEARTBEATSETTINGS adds heartbeat settings — same block, no conflict
- ✅ All REQ_AUT_* covered: JOBCONFIG→JOBSCHEMA, SCHEDULER→SCHEDULERLOOP, JOBEXEC→EXECUTOR, MANUALRUN→MANUALCOMMAND, STATUSBAR→STATUSBARITEM, OUTPUT→OUTPUTCHANNEL
- ✅ Both REQ_CFG_HEARTBEAT* covered by SPEC_CFG_HEARTBEATSETTINGS
- ✅ No existing SPEC modified (SPEC_CFG_SETTINGS untouched)
- ✅ MECE advisory run; C-1 resolved (onDidChangeConfiguration ownership); G-1 resolved (Python path); G-2 resolved (statusbar else-branch)
