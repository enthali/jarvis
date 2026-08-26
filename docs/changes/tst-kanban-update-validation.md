# Test Protocol: kanban-update-validation

**Change Request**: kanban-update-validation  
**Branch**: `feature/kanban-update-validation`  
**UAT Spec**: [SPEC_UAT_KAN_UPDATE_VALID](../design/spec_uat_kanban_update_valid.rst);
amended [SPEC_UAT_KANBAN](../design/spec_uat_kanban.rst) T-22  
**Date**: 2026-08-26

---

## Execution Note

Executed as **code-based static analysis** against
`packages/kanban/src/extension.ts` commit `2114160`. All scenarios verify
structural properties of the implementation.

Module integration (compile/package/CI) is not covered here — verified by
the Verify Engineer in `val-kanban-update-validation.md`.

---

## Staleness Review of Existing `SPEC_UAT_KANBAN` Scenarios

The Verify Engineer flagged that pre-existing UAT scenarios asserting
non-`status` field values being "written through" may now be stale, since
invalid values are no longer accepted.

**Finding: no stale scenarios.**

All four existing `jarvis_updateKanbanItem` invocations in `SPEC_UAT_KANBAN`
use only `changes={"status":"Done"}` (T-19, T-20, T-21) or the already-amended
`changes={"id":99,"status":"Done"}` (T-22). No scenario asserts that a
non-`status` field value is accepted by the update tool. The pre-existing
scenarios require no amendment beyond T-22 (already amended in the UAT
artifacts commit `3feaada`).

---

## Test Scenarios

### Amended T-22 (SPEC_UAT_KANBAN) — id in changes returns error

**AC**: `REQ_KAN_UPDATE` AC-9; `REQ_KAN_WRITEVALID` AC-4

**Code evidence** — `extension.ts` L650-656:
```typescript
const validationErr = validateItemValues(input.changes, data);
if (validationErr) {
    return ... JSON.stringify({ error: validationErr })
}
```
`validateItemValues` L164-166:
```typescript
if ('id' in values) {
    return 'Cannot supply "id" — ids are auto-assigned.';
}
```
`input.changes` is passed directly as `values`. When `input.changes` contains
`"id": 99`, the guard fires and `validationErr` is non-null →
error returned before item lookup proceeds to mutation.

**Previous behaviour (superseded)**: The `id` key was silently skipped by a
`continue` in the per-key write loop; other changes were applied and the tool
returned `updated: true`. That `continue` is removed in `2114160`.

**Result**: ✅ PASS (static)

---

### T-1 — BC-1: invalid non-`status` single_select value rejected

**AC**: `REQ_KAN_UPDATE` AC-8; `REQ_KAN_WRITEVALID` AC-1

**Code evidence**: Same validation path (L650-656). When `input.changes =
{ "priority": "Critical" }`, `validateItemValues` reaches L197-202:
```typescript
if (fieldEntry.type === 'single_select' && fieldEntry.options && ...) {
    if (!fieldEntry.options.has(value)) {
        return `Invalid value "${value}" for field "${key}". Valid: ${...}`;
    }
}
```
`priority` is a declared `single_select` field; `"Critical"` is not in its
option set → error string returned → `validationErr` is non-null →
error returned at L652-657 before `writeFile`.

**Previous behaviour**: The value was written unconditionally; only `status`
had an inline check.

**Result**: ✅ PASS (static)

---

### T-2 — BC-2: undeclared key in changes rejected

**AC**: `REQ_KAN_UPDATE` AC-8; `REQ_KAN_WRITEVALID` AC-3

**Code evidence**: Same path. `silentTrap` is not in `fieldMap` and not in
`builtins`. `validateItemValues` L189-194:
```typescript
const fieldEntry = fieldMap.get(key);
if (!fieldEntry) {
    return `Unknown field "${key}". Declared fields: ${declared}`;
}
```
Error returned before mutation.

**Previous behaviour**: The key was written to the item node; it was accepted
by the schema but never rendered and only warned by `verifyKanbanSchema` —
the GH #57 trap on the write path.

**Result**: ✅ PASS (static)

---

### T-3 — Valid non-`status` field value passes new validation path

**AC**: `REQ_KAN_UPDATE` AC-8 (positive case)

**Code evidence**: `input.changes = { "priority": "High" }`. `validateItemValues`
finds `priority` in `fieldMap` with `type: single_select`; `"High"` is in its
options set → returns `undefined` (no error). L651: `validationErr` is `undefined`
→ error branch not taken. L661-665: item node mutated via `itemNode.set(key, value)`.
`writeFile` called → file updated. Returns `{ updated: true, itemId }`.

**Result**: ✅ PASS (static)

---

### T-4 — Backward compat: status-only change unaffected

**AC**: `REQ_KAN_UPDATE` AC-8 (backward compat); cross-refs `SPEC_UAT_KANBAN` T-19

**Code evidence**: `input.changes = { "status": "Done" }`. `validateItemValues`
L182-188 handles `status` (a builtin) by checking it against the status field's
options. `"Done"` is a declared option → returns `undefined`. Mutation proceeds;
`writeFile` called; returns `{ updated: true, itemId }`.

T-19 in `SPEC_UAT_KANBAN` specifies this scenario and its expected outcome;
this execution confirms it is not broken by the new validation path.

**Result**: ✅ PASS (static)

---

## Execution Summary

| # | Spec | Scenario | Result |
|---|------|----------|--------|
| T-22 (amended) | SPEC_UAT_KANBAN | id in changes → error, file unchanged | ✅ PASS (static) |
| T-1 | SPEC_UAT_KAN_UPDATE_VALID | BC-1: invalid non-status single_select value → error | ✅ PASS (static) |
| T-2 | SPEC_UAT_KAN_UPDATE_VALID | BC-2: undeclared key → error, file unchanged | ✅ PASS (static) |
| T-3 | SPEC_UAT_KAN_UPDATE_VALID | Valid non-status field value passes new path | ✅ PASS (static) |
| T-4 | SPEC_UAT_KAN_UPDATE_VALID | Status-only change backward compat | ✅ PASS (static) |

**Overall: 5 / 5 PASS**

**Staleness review:** No stale pre-existing scenarios found. All prior
`updateKanbanItem` invocations used status-only or already-amended payloads.

All scenarios verified against commit `2114160`.
