# Change Document: hello-explorer

**Status**: approved
**Branch**: feature/hello-explorer
**Created**: 2026-03-31
**Author**: Change Agent

---

## Summary

Create a minimal VS Code extension ("Jarvis") that registers a custom Activity Bar entry with a sidebar containing two TreeView groups: "Projects" and "Events", populated with hardcoded dummy data. This establishes the extension infrastructure and validates the development workflow.

---

## Level 0: User Stories

**Status**: ✅ completed

### New User Stories
- US_EXP_SIDEBAR: Project & Event Explorer

---

## Level 1: Requirements

**Status**: ✅ completed

### New Requirements
- REQ_EXP_ACTIVITYBAR: Activity Bar Registration
- REQ_EXP_TREEVIEW: Project and Event Tree Views
- REQ_EXP_DUMMYDATA: Static Dummy Data

---

## Level 2: Design

**Status**: ✅ completed

### New Design Elements
- SPEC_EXP_EXTENSION: Extension Manifest & Activation
- SPEC_EXP_PROVIDER: Tree Data Providers

### Key Decisions
1. Two separate TreeDataProvider classes (Projects and Events will diverge)
2. Flat list, no tree nesting (hello-world scope)
3. contextValue set from the start (enables future context menus)

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_EXP_SIDEBAR (AC-1, AC-2) | REQ_EXP_ACTIVITYBAR | SPEC_EXP_EXTENSION | ✅ |
| US_EXP_SIDEBAR (AC-3, AC-4) | REQ_EXP_TREEVIEW | SPEC_EXP_PROVIDER | ✅ |
| US_EXP_SIDEBAR (data) | REQ_EXP_DUMMYDATA | SPEC_EXP_PROVIDER | ✅ |

### Sign-off
- [x] All levels completed
- [x] All conflicts resolved
- [x] Traceability verified
- [x] User approved
- [x] RST files written with status: approved
