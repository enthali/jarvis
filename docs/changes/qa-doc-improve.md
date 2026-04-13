# Change Document: qa-doc-improve

**Status**: approved
**Branch**: feature/qa-doc-improvements
**Created**: 2026-04-12
**Author**: Change Agent (from QA Report qr-2026-04-10)

---

## Summary

Addresses QA findings M-1, M-2, M-5 (new REQ/SPEC artifacts) and 20 LOW findings (missing `:links:` directives) from the QA Report dated 2026-04-10. Part A creates `REQ_DEV_ACTIVATION`, `REQ_DEV_DISPOSAL`, and `SPEC_EXP_RESCANBRIDGE` with corresponding design specs. Part B adds 20 missing link directives across all three specification levels. No new user stories required — all new REQs trace to existing US. Code changes limited to verifying disposal completeness (M-2).

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories (link hygiene only)

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_CFG_PROJECTPATH | Configurable Folder Paths | link added | Add link to `US_AUT_HEARTBEAT` (scanInterval drives heartbeat registration) |
| US_DEV_LOGGING | Structured Logging | link added | Add links to module stories (`US_EXP_SIDEBAR`, `US_AUT_HEARTBEAT`, `US_REL_SELFUPDATE`, `US_MSG_CHATQUEUE`) |
| US_REL_GITWORKFLOW | Git Branch & Merge Workflow | link added | Add link to `US_DEV_CONVENTIONS` |

### UAT Link Cleanup

| ID | Impact | Notes |
|----|--------|-------|
| US_UAT_JOBREG | link added | Add link to `US_CFG_PROJECTPATH` (T-14..T-18 test scanInterval) |
| US_UAT_HEARTBEAT | link removed | Remove REQ-level links from US-level story (wrong abstraction level) |
| US_UAT_HEARTBEATVIEW | link removed | Remove REQ-level links from US-level story (wrong abstraction level) |

### New User Stories

None. REQ_DEV_ACTIVATION and REQ_DEV_DISPOSAL are lifecycle/quality requirements that trace to existing stories:
- REQ_DEV_ACTIVATION → US_DEV_MANUALTEST (proper boot sequence is prerequisite for correct testing)
- REQ_DEV_DISPOSAL → US_DEV_MANUALTEST (graceful shutdown is part of extension quality)

### Decisions

- D-L0-1: No new user stories needed — activation and disposal are developer-facing quality concerns covered by US_DEV_MANUALTEST
- D-L0-2: US_DEV_LOGGING gets links to four module stories (cross-cutting concern)
- D-L0-3: US_UAT_HEARTBEAT and US_UAT_HEARTBEATVIEW: remove `:links:` entries that point to REQ-level IDs (these belong at US level only)

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed (logging cross-links, heartbeat/config link)

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements (link hygiene)

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_EXP_REACTIVECACHE | US_EXP_SIDEBAR | link added | → `REQ_CFG_SCANINTERVAL` |
| REQ_CFG_SCANINTERVAL | US_CFG_PROJECTPATH | link added | → `REQ_AUT_JOBREG` |
| REQ_EXP_NEWPROJECT | US_EXP_SIDEBAR | link added | → `REQ_CFG_FOLDERPATHS` |
| REQ_EXP_NEWEVENT | US_EXP_SIDEBAR | link added | → `REQ_CFG_FOLDERPATHS` |
| REQ_EXP_PROJECTFILTER | US_EXP_PROJECTFILTER | link added | → `REQ_EXP_FILTERPERSIST` |
| REQ_EXP_EVENTFILTER | US_EXP_EVENTFILTER | link added | → `REQ_EXP_EVENTFILTERPERSIST` |
| REQ_AUT_JOBEXEC | US_AUT_HEARTBEAT | link added | → `REQ_AUT_JOBCONFIG` |
| REQ_DEV_TESTSUMMARY | US_DEV_MANUALTEST | link added | → `REQ_DEV_TESTPROTOCOL` |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_DEV_ACTIVATION | Activation Events & Boot Sequence | US_DEV_MANUALTEST | mandatory |
| REQ_DEV_DISPOSAL | Graceful Deactivation | US_DEV_MANUALTEST | mandatory |

**REQ_DEV_ACTIVATION**: The extension SHALL declare activation events in `package.json` and follow a defined boot sequence: Logger → Scanner → Scheduler → Tree Providers → MCP Server.

**REQ_DEV_DISPOSAL**: All background timers, file watchers, output channels, and the MCP server SHALL be registered in `context.subscriptions` for clean disposal during `deactivate()`.

### Decisions

- D-L1-1: REQ_DEV_ACTIVATION covers both the `activationEvents` declaration and the startup ordering
- D-L1-2: REQ_DEV_DISPOSAL mandates `context.subscriptions` registration (VS Code's built-in disposal pattern)
- D-L1-3: All 8 link-hygiene items add peer-level cross-references, no structural changes

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies (REQ_DEV_ACTIVATION is new territory, REQ_DEV_DISPOSAL complements REQ_AUT_SCHEDULER)
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements (link hygiene)

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_EXP_SCANNER | REQ_EXP_REACTIVECACHE | link added | → `REQ_EXP_NAMESORT` |
| SPEC_AUT_AGENTEXEC | REQ_AUT_JOBEXEC | link added | → `SPEC_DEV_LOGCHANNEL` |
| SPEC_AUT_QUEUEEXEC | REQ_AUT_JOBEXEC | link added | → `SPEC_DEV_LOGCHANNEL` |
| SPEC_AUT_RUNJOBCOMMAND | REQ_AUT_JOBEXEC | link added | → `SPEC_AUT_HEARTBEATPROVIDER` |
| SPEC_REL_UPDATECHECK | REQ_REL_UPDATECHECK | link added | → `SPEC_DEV_LOGCHANNEL` |
| SPEC_REL_UPDATECOMMAND | REQ_REL_UPDATECHECK | link added | → `SPEC_DEV_LOGCHANNEL` |
| SPEC_UAT_JOBREG_PROCEDURES | — | link added | → `SPEC_AUT_JOBREG` |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_DEV_ACTIVATION | Activation Events & Boot Sequence | REQ_DEV_ACTIVATION, SPEC_EXP_EXTENSION |
| SPEC_DEV_DISPOSAL | Graceful Deactivation | REQ_DEV_DISPOSAL |
| SPEC_EXP_RESCANBRIDGE | syncRescanJob Bridge | REQ_CFG_SCANINTERVAL, SPEC_AUT_JOBREG, SPEC_EXP_SCANNER |

**SPEC_DEV_ACTIVATION**: Documents the declared `activationEvents` list, the startup sequence in `activate()`, and the dependency order between subsystems.

**SPEC_DEV_DISPOSAL**: Documents which disposables are registered in `context.subscriptions` (heartbeat scheduler, file watchers, output channel, MCP server) and the `deactivate()` contract.

**SPEC_EXP_RESCANBRIDGE**: Extracts the `syncRescanJob()` logic from SPEC_EXP_EXTENSION prose into a dedicated, traceable spec with links to Scanner and Heartbeat subsystems.

### Decisions

- D-L2-1: SPEC_DEV_ACTIVATION and SPEC_DEV_DISPOSAL go into `spec_dev.rst` (developer tooling theme)
- D-L2-2: SPEC_EXP_RESCANBRIDGE stays in `spec_exp.rst` (explorer theme — bridges scanner to heartbeat)
- D-L2-3: SPEC_EXP_EXTENSION keeps its existing prose about syncRescanJob but SPEC_EXP_RESCANBRIDGE becomes the normative, traceable reference

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements
- [x] SPEC_EXP_RESCANBRIDGE cleanly separates from SPEC_EXP_EXTENSION (bridge vs. manifest/activation)

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_DEV_MANUALTEST | REQ_DEV_ACTIVATION | SPEC_DEV_ACTIVATION | ✅ |
| US_DEV_MANUALTEST | REQ_DEV_DISPOSAL | SPEC_DEV_DISPOSAL | ✅ |
| US_CFG_PROJECTPATH / US_EXP_SIDEBAR | REQ_CFG_SCANINTERVAL | SPEC_EXP_RESCANBRIDGE | ✅ |

### Link Hygiene Summary

| Level | Links Added | Links Removed |
|-------|-------------|---------------|
| US | 4 added | 2 cleaned (REQ-links in UAT stories) |
| REQ | 8 added | 0 |
| SPEC | 7 added | 0 |
| **Total** | **19 added** | **2 cleaned** |

### Issues Found

- None

### Sign-off

- [x] All levels completed (no DEPRECATED markers)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

*Generated by syspilot Change Agent from QA Report qr-2026-04-10*
