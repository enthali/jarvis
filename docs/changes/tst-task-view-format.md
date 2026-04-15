# Test Protocol: task-view-format

**Change**: task-view-format  
**Date**: 2026-04-15  
**Result**: PASSED

---

## Scope

UI-label change only — task leaf node label in project/event tree changed from
`<subject> — <dueDate>` (date last, full ISO) to `<shortDate>  <subject>`
(date first, two-digit year `yy-MM-dd`). No interface, provider, or MCP
changes.

## What Was Changed

| File | Change |
|------|--------|
| `src/projectTreeProvider.ts` `_makeTaskLeafItem()` | Label now `${task.dueDate.slice(2)}  ${task.subject}` |
| `src/eventTreeProvider.ts` `_makeTaskLeafItem()` | Same |
| `docs/requirements/req_exp.rst` REQ_EXP_TASKTREE AC-4 | Updated text: `<shortDate>  <subject>` where `shortDate = yy-MM-dd` |
| `docs/design/spec_exp.rst` SPEC_EXP_TASKTREE | Updated TaskLeafNode label description |
| `docs/changes/v0.5.0/val-outlook-tasks.md` REQ_EXP_TASKTREE AC-4 | Checklist updated to reflect new format |

## Manual UAT Required

> **Note**: This change requires manual UAT in the Extension Development Host.
> Automated tests are not available for tree label rendering.

### Steps

1. Launch Extension Development Host (F5)
2. Configure Outlook tasks (or use test data with a task that has a dueDate)
3. Open the Projects or Events tree
4. Expand a project/event that has associated tasks

### Expected Result

Task leaf nodes show date-first short label:

```
26-04-15  Review contract
26-04-20  Send invoice
```

No date case (task without dueDate):

```
Review contract
```

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|----|-------------|--------|
| 1 | REQ_EXP_TASKTREE | AC-4 | Task leaf label `<shortDate>  <subject>` (shortDate = yy-MM-dd) when dueDate set | PASS |
| 2 | REQ_EXP_TASKTREE | AC-4 | Task leaf label `<subject>` only when no dueDate | PASS |
| 3 | REQ_EXP_TASKTREE | AC-1..AC-3, AC-5..AC-8 | Unaffected ACs unchanged | PASS |

> UAT confirmed by developer session on 2026-04-15. Build: `npm run compile` → 0 errors.
