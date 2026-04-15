# Quality Report — outlook-tasks

**Datum:** 2026-04-15  
**Quality Manager:** Quality Manager Session  
**Scope:** `outlook-tasks` on `develop` before v0.5.0 release  
**Review Unit:** `US_PIM_TASKS` + `US_OLK_TASKS` with impacted tree integration in `US_EXP_SIDEBAR`

---

## Executive Summary

The feature is close to releasable, but the current implementation still contains one user-visible data-loss bug and two meaningful behavior gaps that were not surfaced by the existing verification report.

| Severity | Count |
|---|---:|
| HIGH | 1 |
| MEDIUM | 3 |
| LOW | 1 |

**Release assessment:** do **not** treat the current verification report as sufficient for release sign-off. At minimum, the HIGH issue should be fixed before v0.5.0.

---

## Findings

### HIGH-1 — Opening the task editor can silently erase an existing task body

**Files:** `src/pim/TaskEditorProvider.ts`, `src/outlookIntegration/OutlookTaskProvider.ts`, `docs/design/spec_pim.rst`

**What happens**

- The editor opens a task from `TaskService.getTasks()` in `openCustomDocument()`.
- `OutlookTaskProvider.getTasks()` never loads the Outlook body field.
- The editor still renders `<textarea id="body">${task.body ?? ''}</textarea>` and always sends `body: document.getElementById('body').value` on save.
- `OutlookTaskProvider.modifyTask()` writes `$task.Body = '...'` whenever `changes.body !== undefined`.

**Impact**

If a task already has body text in Outlook, opening it in Jarvis and changing an unrelated field such as priority or category will save an empty string back to Outlook and wipe the body.

**Why this is especially serious**

`SPEC_PIM_TASKEDITOR` explicitly says that if the body was not already loaded, the editor loads it on open via a separate `includeBody: true` call. That load path is missing in code. The current verification report does not catch this.

**Recommended action**

Before release, either:

1. load the body before rendering/saving the editor, or
2. omit `body` from `changes` unless the user actually changed it.

---

### MEDIUM-1 — Clearing a due date in the editor does not work

**Files:** `src/pim/TaskEditorProvider.ts`, `src/outlookIntegration/OutlookTaskProvider.ts`

**What happens**

- The editor serializes an empty date input as `dueDate: ... || undefined`.
- The provider only clears a due date when `changes.dueDate === ''` and then writes Outlook's no-date sentinel (`[DateTime]::MaxValue`).

**Impact**

Users can set a due date, but they cannot remove one through the editor. Clearing the date field results in no update at all.

**Recommended action**

Preserve the empty-string signal through the editor save path so the provider can explicitly clear the due date.

---

### MEDIUM-2 — `jarvis_task set` violates the documented multi-provider contract

**Files:** `src/pim/TaskService.ts`, `src/extension.ts`, `docs/requirements/req_pim.rst`

**What happens**

- `REQ_PIM_TASKTOOL` AC-6 says that without `provider`, the operation is broadcast to all providers.
- `TaskService.setTask()` currently calls only `targets[0].setTask(task)`.
- The LM/MCP tool directly uses `taskService.setTask(input, input.provider)`.

**Impact**

The current single-provider UAT does not expose this, but the advertised exchangeable-provider architecture already breaks as soon as a second task provider is added. `get`, `modify`, and `delete` are provider-fan-out aware; `set` is not.

**Recommended action**

Either implement true fan-out semantics for `set`, or narrow the requirement/tool contract so creation is intentionally single-provider unless one is selected.

---

### MEDIUM-3 — Task badge semantics in the tree do not match the approved requirement text

**Files:** `src/projectTreeProvider.ts`, `src/eventTreeProvider.ts`, `docs/requirements/req_exp.rst`, `docs/changes/val-outlook-tasks.md`

**What happens**

- `REQ_EXP_TASKTREE` AC-5/AC-6 describes textual user-facing states like `My Project (3)`, `(n !)`, and `⚠`.
- The implementation uses `item.description = n` plus icon changes and `charts.yellow` color.
- The verification report treats this mostly as a cosmetic color deviation and marks AC-5/AC-6 as verified.

**Impact**

The shipped UI may still be acceptable, but the current documentation and verification story are inaccurate. This matters because PM and Developer are currently making release decisions based on a verification report that overstates alignment.

**Recommended action**

Choose one truth and align all three artifacts:

1. keep the current UI and update REQ/SPEC/verification wording accordingly, or
2. change the UI to the documented textual badge semantics.

---

### LOW-1 — `tasks-design.md` still contains stale pre-decision UX statements

**Files:** `projects/project-manager/tasks-design.md`

The lower decision table reflects the newer design decisions, but the earlier narrative examples still describe older behavior:

- due-status color semantics on the project node
- `Uncategorized Tasks` at the bottom
- the removed `Open in Outlook` button
- delayed tree update on the next heartbeat

**Impact**

This is not a shipping blocker, but it weakens the design reference that PM explicitly pointed to for this review.

**Recommended action**

Clean the upper narrative sections so they match the current accepted v1 decisions.

---

## UAT Coverage Assessment

The existing UAT is useful, but it missed two important editor-state cases:

1. opening a task with an existing body and changing only a non-body field
2. clearing an existing due date in the editor

These should be added before the next Outlook-related release cycle.

---

## Documentation Currency Assessment

- `docs/changes/val-outlook-tasks.md` overstates conformance for the tree badge behavior.
- `projects/project-manager/tasks-design.md` is partially stale in the prose sections.
- `docs/design/spec_pim.rst` still describes body-on-open behavior that is not implemented.

---

## Recommendation

1. Fix HIGH-1 before v0.5.0 release.
2. Fix MEDIUM-1 if task editing is expected to be complete for v0.5.0.
3. Resolve MEDIUM-3 by aligning code, requirements, and verification wording.
4. Either fix or explicitly defer MEDIUM-2 before a second task provider is introduced.
5. Update the stale design and verification documentation as part of release hardening.