# Change Document: event-sort

**Status**: approved
**Branch**: feature/event-sort
**Created**: 2026-04-13
**Author**: Change Agent

---

## Summary

Events in the Jarvis Explorer are currently sorted alphabetically by entity name. This change adds chronological sorting by start date and prefixes the tree item label with the date (`yyyy-mm-dd — name`). Since the scanner already sorts alphabetically and dates use ISO format, alphabetical sorting of the date-prefixed key produces chronological order automatically.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_NAMESORT | Sort Tree by Entity Name | unchanged | Still applies to projects; events get date-based sorting via US_EVT_DATESORT |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_EVT_DATESORT | Chronological Event Sorting | optional |

### Decisions

- D-1: Create a separate US for event date sorting rather than modifying US_EXP_NAMESORT — the name-sort US is generic and still valid for projects
- D-2: Events without `dates.start` fall back to name-only label and name-based sort (fail-open)

### Horizontal Check (MECE)

- [x] No contradictions — US_EXP_NAMESORT covers general alphabetical sort; US_EVT_DATESORT specializes for events
- [x] No redundancies — different scope (projects vs events)
- [x] No gaps — both project and event sorting are now explicitly specified

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_EXP_NAMESORT | US_EXP_NAMESORT | unchanged | Still governs general scanner sort; event override via REQ_EVT_DATESORT |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_EVT_DATESORT | Chronological Event Sorting | US_EVT_DATESORT | optional |

### Decisions

- D-1: Date handling: JS Date objects → `toISOString().slice(0,10)`; strings → use directly; absent → fallback to name
- D-2: Label format: `<dates.start> — <name>` with em-dash separator
- D-3: Scanner extracts `datesStart` alongside existing `datesEnd`; sort key for events uses `datesStart + name`

### Horizontal Check (MECE)

- [x] No contradictions with REQ_EXP_NAMESORT — that REQ continues to apply for the general sort, event sort overrides for event leaves
- [x] No redundancies
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_EXP_SCANNER | REQ_EXP_NAMESORT | modified | Add `datesStart` to EntityEntry, extract in `_buildTree`, event-aware sort key |
| SPEC_EXP_PROVIDER | REQ_EXP_TREEVIEW | modified | EventTreeProvider.getTreeItem composes date-prefixed label |

### New Design Elements

None — changes fit into existing specs.

### Decisions

- D-1: Add `datesStart?: string` to `EntityEntry` interface
- D-2: In `_buildTree`, extract `dates.start` from YAML — handle both string and Date object
- D-3: Sort key for event leaves: `(datesStart ?? '') + name` — events with dates sort before dateless ones
- D-4: In `EventTreeProvider.getTreeItem`, compose label as `${datesStart} — ${name}` when datesStart is available

### Horizontal Check (MECE)

- [x] No contradictions with existing design specs
- [x] All modified SPECs link to requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_EVT_DATESORT | REQ_EVT_DATESORT | SPEC_EXP_SCANNER (modified), SPEC_EXP_PROVIDER (modified) | ✅ |

### Issues Found

None.

### Sign-off

All levels consistent. Ready for implementation.
