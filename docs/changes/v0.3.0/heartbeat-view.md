# Change Document: heartbeat-view

**Status**: approved
**Branch**: feature/heartbeat-view
**Created**: 2026-04-10
**Author**: Change Agent

---

## Summary

Add a 4th tree view "Heartbeat" (`jarvisHeartbeat`) to the Jarvis activity bar that visualizes all jobs from `heartbeat.yaml`. Job nodes show job name + next execution time; step nodes show step details. Provides inline `$(play)` to run a single job, view-title actions to run all non-manual jobs and refresh the tree. Uses `cron-parser` for next-time computation. Requires exporting `loadJobs()` and extracting/exporting `executeJob()` from `heartbeat.ts`.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_AUT_HEARTBEAT | Scheduled and Manual Automation Jobs | modified | Add AC for visual overview of jobs in sidebar tree view |
| US_EXP_SIDEBAR | Project & Event Explorer | modified | Add "Heartbeat" as 4th section in sidebar |

### New User Stories

_(none — existing US_AUT_HEARTBEAT covers the heartbeat domain; extend with new ACs)_

### Decisions

- D-1: Extend `US_AUT_HEARTBEAT` rather than creating a new US — the heartbeat tree view is a natural visual extension of the existing heartbeat user story
- D-2: Extend `US_EXP_SIDEBAR` AC-3 to mention the 4th section "Heartbeat"

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies — heartbeat tree view is unique, no other US covers job visualization
- [x] Gaps identified and addressed — running individual jobs (play button) and running all jobs are covered via US_AUT_HEARTBEAT AC extensions

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_AUT_MANUALRUN | US_AUT_HEARTBEAT | unchanged | Single job run now covered by new REQ_AUT_RUNJOB for tree context; QuickPick path unchanged |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_AUT_HEARTBEATVIEW | Heartbeat Tree View | US_AUT_HEARTBEAT; US_EXP_SIDEBAR | optional |
| REQ_AUT_RUNJOB | Run Single Heartbeat Job | US_AUT_HEARTBEAT; REQ_AUT_JOBEXEC | optional |

### Decisions

- D-1: REQ_AUT_HEARTBEATVIEW covers tree structure, next-time display, refresh action, and cyclic auto-refresh
- D-2: REQ_AUT_RUNJOB covers inline play button for single job execution
- D-3: `cron-parser` is the library for next-time computation (AC-3 of REQ_AUT_HEARTBEATVIEW)
- D-4: Run-all removed — manual jobs should be triggered individually, not in bulk

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies — REQ_AUT_MANUALRUN covers QuickPick manual trigger, REQ_AUT_RUNJOB covers tree inline trigger. Different scopes, no overlap.
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_AUT_JOBSCHEMA | REQ_AUT_JOBCONFIG | modified | `loadJobs()`, `HeartbeatJob`, `HeartbeatStep` interfaces need `export` |
| SPEC_AUT_EXECUTOR | REQ_AUT_JOBEXEC | modified | `executeJob()` needs `export` |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_AUT_HEARTBEATPROVIDER | Heartbeat Tree Provider | REQ_AUT_HEARTBEATVIEW; SPEC_AUT_JOBSCHEMA; SPEC_AUT_SCHEDULERLOOP |
| SPEC_AUT_RUNJOBCOMMAND | Run Job and Run-All Commands | REQ_AUT_RUNJOB; REQ_AUT_RUNALLJOBS; REQ_AUT_HEARTBEATVIEW; SPEC_AUT_EXECUTOR |

### Decisions

- D-1: New file `heartbeatTreeProvider.ts` — clean separation, analogous to `projectTreeProvider.ts`
- D-2: `cron-parser` npm dependency for reliable next-time computation
- D-3: `formatNextRun()` uses short German weekday + time format
- D-4: `executeJob()` and `loadJobs()` exported from heartbeat.ts for tree provider access
- D-5: Three commands: `jarvis.runJob`, `jarvis.runAllJobs`, `jarvis.refreshHeartbeat`

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_AUT_HEARTBEAT (AC-8..11) | REQ_AUT_HEARTBEATVIEW | SPEC_AUT_HEARTBEATPROVIDER | ✅ |
| US_AUT_HEARTBEAT (AC-10) | REQ_AUT_RUNJOB | SPEC_AUT_RUNJOBCOMMAND | ✅ |
| US_EXP_SIDEBAR (AC-3) | REQ_AUT_HEARTBEATVIEW | SPEC_AUT_HEARTBEATPROVIDER | ✅ |

### Sign-off

- [x] All levels completed
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## UAT Artifacts

| Level | ID | Title |
|-------|----|-------|
| L0 | US_UAT_HEARTBEATVIEW | Heartbeat Tree View Acceptance Tests |
| L1 | REQ_UAT_HEARTBEATVIEW_TESTS | Heartbeat Tree View Test Procedures |
| L2 | SPEC_UAT_HEARTBEATVIEW_PROCEDURES | Heartbeat Tree View UAT Procedures |

---

*Generated by syspilot Change Agent*
