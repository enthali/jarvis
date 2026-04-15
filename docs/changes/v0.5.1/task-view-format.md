# Change Document: task-view-format

**Status**: approved
**Branch**: feature/task-view-format
**Created**: 2026-04-15
**Author**: Change Agent

---

## Summary

Change the task leaf node label format in the project/event tree from
`<subject> — <dueDate>` (date last, full ISO) to `<shortDate>  <subject>`
(date first, two-digit year short ISO `yy-MM-dd`). No date shown when
`dueDate` is absent. UI-label change only — no interface, provider, or
MCP-parameter changes.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_PIM_TASKS | Task Sync via Exchangeable Task Providers | modified | AC-6 text currently describes TaskEditor; the *display* label format is governed by this story's AC for "displayed per project/event" intent — tighten wording to reflect date-first format |

### New User Stories

None — scope fits within existing US_PIM_TASKS.

### Decisions

- D-1: No new user story required; the change is a cosmetic refinement of the
  existing task-in-tree display covered by US_PIM_TASKS.
- D-2: Short ISO `yy-MM-dd` (strip century) chosen for compact rendering;
  single-space separator between date and subject for visual clarity.

### Horizontal Check (MECE)

- ✅ No contradiction with US_EXP_SIDEBAR (general sidebar story, no AC on
  label format)
- ✅ No redundancy with any other user story
- ✅ No gaps — "no dueDate → subject only" behaviour unchanged

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_EXP_TASKTREE | US_PIM_TASKS, US_EXP_SIDEBAR | modified | AC-4 text must change: old `<subject> — <dueDate>`, new `<shortDate>  <subject>` with `shortDate = yy-MM-dd` |

### New Requirements

None.

### Decisions

- D-3: AC-4 is the single requirement governing the task leaf label; all other
  ACs (groups, badges, guards) are unaffected.
- D-4: `shortDate` defined as `yy-MM-dd` (last two digits of year, then
  month, then day) — consistent with ISO 8601 reduced precision, no locale
  dependency.
- D-5: When `dueDate` is absent the label remains `<subject>` only — no change
  to that branch of AC-4.

### Horizontal Check (MECE)

- ✅ No other requirement governs task leaf label format
- ✅ REQ_EXP_TASKTREE AC-1 through AC-3 and AC-5 through AC-8 unaffected
- ✅ SPEC_EXP_TASKTREE and `val-outlook-tasks.md` identified as downstream
  artefacts that need updating by the Implement Agent

---

## Level 2: Design

**Status**: ⏳ not started (out of scope — implementation only)

Design change is trivially scoped to `_makeTaskLeafItem()` in
`src/projectTreeProvider.ts` and `src/eventTreeProvider.ts`.
A full SPEC-level write is not required; the Implement Agent SHALL update
SPEC_EXP_TASKTREE in place to reflect the new label format and update
`val-outlook-tasks.md` accordingly.

---

## Implementation Notes (for Implement Agent)

1. **`src/projectTreeProvider.ts`** — `_makeTaskLeafItem()`:
   - When `dueDate` is set: format as `yy-MM-dd` (pad month/day; strip century)
     and build label `${shortDate}  ${subject}`
   - When `dueDate` is absent: label = `${subject}` (unchanged)

2. **`src/eventTreeProvider.ts`** — same `_makeTaskLeafItem()` change.

3. **`docs/design/spec_exp.rst`** — update `SPEC_EXP_TASKTREE` `TaskLeafNode`
   label description to `<shortDate>  <subject>` / `<subject>`.

4. **`docs/requirements/req_exp.rst`** — update `REQ_EXP_TASKTREE` AC-4 to
   `<shortDate>  <subject>` where `shortDate = yy-MM-dd`.

5. **`docs/changes/v0.5.0/val-outlook-tasks.md`** — update any step that
   verifies task label format to match new format.
