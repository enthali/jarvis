# Change Document: outlook-tasks-spec-fix

**Status**: approved
**Branch**: feature/outlook-tasks-spec-fix
**Created**: 2026-04-15
**Author**: Change Agent

---

## Summary

Docs-only alignment of `REQ_PIM_TASKEDITOR` and `SPEC_PIM_TASKEDITOR` with the
actual implemented Task Editor UI. Two UAT-accepted deviations were never back-ported
to the requirements and design specs: (1) auto-save replaced the explicit Save button,
and (2) the "Open in Outlook" button was removed. The `val-outlook-tasks.md` verification
report is updated correspondingly so the deviation notes become confirmations.

No code changes are needed.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_PIM_TASKS | Manage tasks via Jarvis | context only | No text change needed — the US is general; spec alignment happens at L1/L2 |

### Decisions

- D-0-1: No user-story text change necessary. The user story already covers the intent at the right abstraction level.

### Horizontal Check (MECE)

- ✅ No contradictions with existing User Stories

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_PIM_TASKEDITOR | US_PIM_TASKS | modified | AC-4 removed (Open in Outlook not in v1); AC-5 updated to auto-save; dueDate clearing note added |

### Decisions

- D-1-1: AC-4 ("Open in Outlook" button) removed — `outlook://` URI not registered on Windows; accepted in UAT (T-47 N/A). Mark as "not in v1" rather than delete to preserve audit trail.
- D-1-2: AC-5 updated to describe auto-save (300ms debounce for text, immediate for select/date/categories) instead of explicit Ctrl+S.
- D-1-3: Add clarification to AC-2 that clearing an existing dueDate is not supported in v1 (consistent with REQ_PIM_TASKTOOL AC-3 which already states this).

### Horizontal Check (MECE)

- ✅ REQ_PIM_TASKTOOL AC-3 already documents "due date deletion not supported in v1" — consistent
- ✅ No contradictions with other REQs

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_PIM_TASKEDITOR | REQ_PIM_TASKEDITOR | modified | Remove "Open in Outlook"; update categories field; update save flow; add "jarvis task" label + webviewPanel.title; fix completedDate rendering detail |

### Decisions

- D-2-1: Remove the "Conditional: Open in Outlook button" bullet from Editor fields.
- D-2-2: Categories field: replace "multi-checkbox list" with accurate description of collapsed multi-select with tag display and ▶/▼ toggle button.
- D-2-3: Save flow: replace the explicit-save steps with auto-save description (immediate for selects/date/categories, 300ms debounce for text/textarea).
- D-2-4: Add "jarvis task" label above the `<h2>` subject heading to match HTML layout.
- D-2-5: Add webviewPanel.title = task.subject (set in resolveCustomEditor).
- D-2-6: completedDate rendered as read-only text row (showing `—` when empty string) whenever task.isComplete is true.

### Horizontal Check (MECE)

- ✅ No other SPECs reference these UI details
- ✅ No contradictions

---

## Verification Report Impact

- `val-outlook-tasks.md`: Update REQ_PIM_TASKEDITOR AC-4 and AC-5 checklist items and remove the open-as-deviation descriptions (they are now per-spec).

---

## Conclusion

All changes are documentation-only. The implementation is already correct and UAT-passed.
This change closes the spec-vs-implementation gap introduced by UAT-accepted deviations
during feature/outlook-tasks.
