# Change Document: scanner-refresh

**Status**: approved
**Branch**: feature/scanner-refresh
**Created**: 2026-04-10
**Author**: Change Agent

---

## Summary

Three related improvements to the YAML scanner and explorer UI: (1) Fix a bug where YAML content changes (e.g. editing `name:`) don't trigger a tree refresh because `_treesEqual()` only compares tree structure, not entity data; (2) Add a rescan button (`$(refresh)`) to the title bar of both Projects and Events tree views; (3) Sort tree nodes by YAML entity `name` instead of filesystem folder name.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_SIDEBAR | Project & Event Explorer | context | Parent story — scanner behavior is part of sidebar contract (AC-4 hierarchy) |
| US_EXP_NEWENTITY | Create New Project or Event | context | Relies on scanner rescan; rescan button is conceptually similar to AC-5 immediate refresh |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_EXP_SCANREFRESH | As a Jarvis User, I want to manually trigger a rescan of projects and events, so that I can see changes immediately without waiting for the next scan cycle | mandatory |
| US_EXP_CONTENTDETECT | As a Jarvis User, I want changes to YAML file content (e.g. renaming a project) to be reflected in the sidebar after the next scan, so that the displayed data stays accurate | mandatory |
| US_EXP_NAMESORT | As a Jarvis User, I want the tree items sorted by entity name rather than folder name, so that I can find projects and events alphabetically by their display name | optional |

### Decisions

- D-0.1: Bug fix (content detection) gets its own US because it represents a distinct user expectation (data accuracy)
- D-0.2: Rescan button gets its own US because it's a distinct user interaction (manual refresh)
- D-0.3: Name-based sort gets its own US because it changes the browsing experience independently
- D-0.4: All three US link back to US_EXP_SIDEBAR as the parent explorer story

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies — US_EXP_NEWENTITY covers *creation*-triggered rescan; US_EXP_SCANREFRESH covers *user-triggered* rescan; US_EXP_CONTENTDETECT covers *data-change detection*
- [x] No gaps — all three aspects of the change request are covered

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_EXP_REACTIVECACHE | US_EXP_SIDEBAR | modified | AC-4 "cache actually changed" must include entity data changes, not just tree structure |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_EXP_RESCAN_BTN | Rescan Button in Title Bar | US_EXP_SCANREFRESH | mandatory |
| REQ_EXP_NAMESORT | Sort Tree by Entity Name | US_EXP_NAMESORT | optional |

### Decisions

- D-1.1: Content-detection fix is addressed by strengthening REQ_EXP_REACTIVECACHE AC-4 — no new REQ needed
- D-1.2: Rescan button is a new REQ because it's a new UI element + command
- D-1.3: Name sort is a new REQ because it changes the observable tree order

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies — REQ_EXP_REACTIVECACHE handles detection; REQ_EXP_RESCAN_BTN handles manual trigger; REQ_EXP_NAMESORT handles ordering
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_EXP_SCANNER | REQ_EXP_REACTIVECACHE, REQ_EXP_NAMESORT | modified | `_scan()` must compare entity maps; `_buildTree()` must sort nodes by name |
| SPEC_EXP_EXTENSION | REQ_EXP_RESCAN_BTN | modified | New command + menu entries in package.json |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_EXP_RESCAN_CMD | Rescan Command | REQ_EXP_RESCAN_BTN; SPEC_EXP_SCANNER; SPEC_EXP_EXTENSION |

### Decisions

- D-2.1: Entity comparison in `_scan()` via serialized Map comparison (JSON.stringify on sorted entries) — simple and sufficient for small entity sets
- D-2.2: Sort in `_buildTree()` after building nodes — locale-insensitive case-insensitive compare on entity name (leaves) or folder name (folders), interleaved
- D-2.3: Single command `jarvis.rescan` shared by both views, registered in `view/title` for both `jarvisProjects` and `jarvisEvents`
- D-2.4: Command hidden from Command Palette (requires no arguments but is only meaningful from the view)

### Horizontal Check (MECE)

- [x] No contradictions with existing Design elements
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_EXP_CONTENTDETECT | REQ_EXP_REACTIVECACHE (modified) | SPEC_EXP_SCANNER (modified) | ✅ |
| US_EXP_SCANREFRESH | REQ_EXP_RESCAN_BTN | SPEC_EXP_RESCAN_CMD, SPEC_EXP_EXTENSION (modified) | ✅ |
| US_EXP_NAMESORT | REQ_EXP_NAMESORT | SPEC_EXP_SCANNER (modified) | ✅ |

### Issues Found

- None

### Sign-off

Approved by Change Agent — all levels consistent, MECE verified.

---

## UAT Artifacts

| Level | ID | File |
|-------|----|------|
| US | US_UAT_SCANREFRESH | docs/userstories/us_uat_scanrefresh.rst |
| US | US_UAT_CONTENTDETECT | docs/userstories/us_uat_scanrefresh.rst |
| US | US_UAT_NAMESORT | docs/userstories/us_uat_scanrefresh.rst |
| REQ | REQ_UAT_SCANREFRESH_TESTDATA | docs/requirements/req_uat_scanrefresh.rst |
| SPEC | SPEC_UAT_SCANREFRESH_FILES | docs/design/spec_uat_scanrefresh.rst |

### Test Scenarios: 10 total (4 rescan + 3 content detect + 3 sort)

### Test Data: Reuses existing testdata/ — no new permanent files needed

### Testability Concerns: None
