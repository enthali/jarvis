# Change Document: self-update

**Status**: approved
**Branch**: feature/self-update
**Created**: 2026-04-10
**Author**: Change Agent

---

## Summary

Add a self-update check that queries the GitHub Releases API on extension activation (and via a manual command) to notify the user when a newer Jarvis version is available, with options to view release notes or download and install the `.vsix` directly.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_REL_RELEASE | Extension Release | none | Related context — defines .vsix asset creation. Not modified. |
| US_REL_VERSION | Semantic Versioning | none | Related context — version format used for comparison. Not modified. |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_REL_SELFUPDATE | Self-Update Check | optional |

### Decisions

- D-1: Single new US covers both automatic and manual update check — they share the same UX and logic, differing only in trigger.
- D-2: Theme is `REL` (Release) since this is about consuming releases, complementing the existing release-creation stories.
- D-3: No existing US require modification — the new story is additive.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies — US_REL_RELEASE is about *publishing* releases; US_REL_SELFUPDATE is about *consuming* them
- [x] No gaps — the single US covers auto-check, manual command, and config toggle

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| (none) | — | — | No existing REQs require modification |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_REL_UPDATECHECK | GitHub Release Version Check | US_REL_SELFUPDATE | mandatory |
| REQ_REL_UPDATENOTIFY | Update Notification with Actions | US_REL_SELFUPDATE | mandatory |
| REQ_REL_UPDATEINSTALL | Download and Install .vsix | US_REL_SELFUPDATE | mandatory |
| REQ_REL_UPDATECOMMAND | Manual Update Check Command | US_REL_SELFUPDATE | mandatory |
| REQ_CFG_UPDATECHECK | Update Check Configuration | US_REL_SELFUPDATE | optional |

### Decisions

- D-1: Split into 5 REQs for testability: check logic, notification UX, install flow, manual command, and configuration.
- D-2: REQ_CFG_UPDATECHECK goes in the CFG theme since it follows the existing config pattern.
- D-3: The install flow (REQ_REL_UPDATEINSTALL) is a separate REQ because it involves file download, CLI invocation, and reload — a distinct concern from notification display.
- D-4: No authentication required — public GitHub API with 60 req/h limit is sufficient.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies — existing REQ_REL_* cover CI/CD release creation, not client-side update
- [x] All new REQs link to US_REL_SELFUPDATE
- [x] Complete coverage: check → notify → install → manual trigger → config

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| (none) | — | — | No existing SPECs require modification |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_REL_UPDATECHECK | GitHub API Fetch and Version Compare | REQ_REL_UPDATECHECK |
| SPEC_REL_UPDATENOTIFY | Update Notification UX | REQ_REL_UPDATENOTIFY; REQ_REL_UPDATEINSTALL |
| SPEC_REL_UPDATECOMMAND | Command Registration and Activation Hook | REQ_REL_UPDATECOMMAND |
| SPEC_CFG_UPDATECHECK | Update Check Setting in package.json | REQ_CFG_UPDATECHECK |

### Decisions

- D-1: Consolidate notification + install into one SPEC (SPEC_REL_UPDATENOTIFY) since the install flow is triggered from the notification buttons.
- D-2: New module `src/updateCheck.ts` encapsulates all update logic — keeps extension.ts clean.
- D-3: Use Node.js native `https` module for the GitHub API call (no new dependencies).
- D-4: Semver comparison uses simple split-and-compare — no external library needed for MAJOR.MINOR.PATCH.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements
- [x] Complete: API check → notification UX → command wiring → config setting

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_REL_SELFUPDATE | REQ_REL_UPDATECHECK | SPEC_REL_UPDATECHECK | ✅ |
| US_REL_SELFUPDATE | REQ_REL_UPDATENOTIFY | SPEC_REL_UPDATENOTIFY | ✅ |
| US_REL_SELFUPDATE | REQ_REL_UPDATEINSTALL | SPEC_REL_UPDATENOTIFY | ✅ |
| US_REL_SELFUPDATE | REQ_REL_UPDATECOMMAND | SPEC_REL_UPDATECOMMAND | ✅ |
| US_REL_SELFUPDATE | REQ_CFG_UPDATECHECK | SPEC_CFG_UPDATECHECK | ✅ |

### Issues Found

- (none)

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] UAT artifacts generated: US_UAT_SELFUPDATE, REQ_UAT_SELFUPDATE_TESTDATA, SPEC_UAT_SELFUPDATE_FILES
- [x] Ready for implementation

---

*Generated by syspilot Change Agent*
