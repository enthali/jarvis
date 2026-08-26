# Test Protocol: kanban-management-tools

**Change Request**: kanban-management-tools  
**Branch**: `feature/kanban-management-tools`  
**UAT Spec**: [SPEC_UAT_KAN_MGMT](../design/spec_uat_kanban_mgmt.rst)  
**Date**: 2026-08-25

---

## Execution Note

Executed as **code-based static analysis** against `packages/kanban/src/extension.ts`
and `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md` on commit
`057632f`. All 21 scenarios were designed for static verification; no Extension
Development Host run is required.

Module integration (compile/package/CI) is not covered here — verified by
the Verify Engineer in `val-kanban-management-tools.md`.

---

## Test Scope

- T-1..T-6: `jarvis_addKanbanItem` + `validateItemValues`
- T-7..T-9: `jarvis_deleteKanbanItem`
- T-10..T-14: `jarvis_listKanbanItems`
- T-15..T-20: `jarvis_updateKanbanFields`
- T-21: Skill content (Tools table, id/reuse, compact projection caveat)

---

## Scenarios — ADD (T-1..T-6)

### T-1 — Auto id, nextId incremented, webview refreshes

**AC**: `REQ_KAN_ADD` AC-3, AC-7

**Code evidence** — `extension.ts`:
- L739: `itemId = data.nextId` (when present)
- L770: `doc.set('nextId', itemId + 1)` — incremented unconditionally
- L774: `refreshKanbanPanel(boardPath)` — fires after write
- L776: returns `{ path, added: true, itemId }`

**Result**: ✅ PASS (static)

---

### T-2 — Status defaults to first declared option when omitted

**AC**: `REQ_KAN_ADD` AC-5

**Code evidence**: L751-752:
```typescript
const itemStatus = input.status ?? (statusField?.options?.[0]?.name ?? 'Backlog');
```
When `input.status` is `undefined`, optional-chaining reads the first option name.

**Result**: ✅ PASS (static)

---

### T-3 — nextId absent: derived from max(ids)+1 and written

**AC**: `REQ_KAN_ADD` AC-3

**Code evidence** — L740-743:
```typescript
const ids = data.items.map(i => (i.id as number) || 0);
itemId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
```
L770: `doc.set('nextId', itemId + 1)` — reached in both the `data.nextId != null`
and the derived-from-max branches; `nextId` is always written.

**Result**: ✅ PASS (static)

---

### T-4 — WRITEVALID: invalid single_select value rejected before write

**AC**: `REQ_KAN_WRITEVALID` AC-1; `REQ_KAN_ADD` AC-6

**Code evidence** — `validateItemValues` L197-202:
```typescript
if (fieldEntry.type === 'single_select' && fieldEntry.options && typeof value === 'string') {
    if (!fieldEntry.options.has(value)) {
        return `Invalid value "${value}" for field "${key}". Valid: ${[...fieldEntry.options].join(', ')}`;
    }
}
```
L734-737 in `addKanbanItem`: error returned before any document mutation when
`validateItemValues` returns a non-null string. No write, no `nextId` change.

**Result**: ✅ PASS (static)

---

### T-5 — WRITEVALID: undeclared field key is an error, not a silent write

**AC**: `REQ_KAN_WRITEVALID` AC-3

**Code evidence** — `validateItemValues` L189-194:
```typescript
const fieldEntry = fieldMap.get(key);
if (!fieldEntry) {
    const declared = board.fields.map(f => f.name).join(', ');
    return `Unknown field "${key}". Declared fields: ${declared}`;
}
```
Returns an error string; `addKanbanItem` sees it at L734-737 and returns
`{ error }` without writing. Unlike `jarvis_verifyKanbanSchema`, which
pushes this to `warnings`, the write tool **rejects** it.

**Result**: ✅ PASS (static)

---

### T-6 — Caller-supplied id rejected

**AC**: `REQ_KAN_WRITEVALID` AC-4; `REQ_KAN_ADD` AC-4

**Code evidence** — `validateItemValues` L164-166:
```typescript
if ('id' in values) {
    return 'Cannot supply "id" — ids are auto-assigned.';
}
```
The `values` object is built from `input.fields` (L729), which is the caller's
route for additional field key-value pairs. Passing `{ id: 999 }` inside
`input.fields` places `'id'` in `values` and triggers this guard before any
document mutation.

**Result**: ✅ PASS (static)

---

## Scenarios — DELETE (T-7..T-9)

### T-7 — Happy path: item removed, nextId unchanged, webview refreshes

**AC**: `REQ_KAN_DELETE` AC-4, AC-5

**Code evidence**: L820: `itemsSeq.delete(itemIndex)` removes the item.
The delete handler has no `doc.set('nextId', ...)` call — `nextId` is not
touched. L827: `refreshKanbanPanel(boardPath)`. L828: returns
`{ path, deleted: true, itemId }`.

**Result**: ✅ PASS (static)

---

### T-8 — id not found: error, file unchanged

**AC**: `REQ_KAN_DELETE` AC-3

**Code evidence** — L815-817:
```typescript
if (itemIndex === -1) {
    return ... JSON.stringify({ error: 'item not found', itemId: input.itemId })
}
```
Returns immediately before `writeFile`; file not written.

**Result**: ✅ PASS (static)

---

### T-9 — Diff confined: surviving items not reformatted

**AC**: `REQ_KAN_DELETE` AC-6; `REQ_KAN_SCHEMA` AC-9

**Code evidence**: The delete handler uses `yaml.parseDocument` (round-trip
representation) and `itemsSeq.delete(itemIndex)` — removes one element from
the `YAMLSeq` without rebuilding the sequence. `doc.toString()` re-serialises
only the changed node; untouched nodes retain their original text, including
comments and formatting. This is the design decision documented as D-L2-6 in
the CD.

**Result**: ✅ PASS (static)

---

## Scenarios — LIST (T-10..T-14)

### T-10 — No filter: all items, compact projection only

**AC**: `REQ_KAN_LIST` AC-3, AC-4, AC-8

**Code evidence** — L877-882:
```typescript
const projected = items.map(i => ({
    id: i.id, name: i.name, status: i.status,
    labels: (i.labels as string[]) ?? [],
}));
```
Exactly four fields. `notes` and declared-field values are not included.
Returns `{ path, count, items: projected }`.

The list tool uses `yaml.parse` (plain parse, not `parseDocument`) — correct
for a read-only tool that never writes (D-L2-3).

**Result**: ✅ PASS (static)

---

### T-11 — Status filter: matching items only

**AC**: `REQ_KAN_LIST` AC-2

**Code evidence** — L869-871:
```typescript
if (input.status) {
    items = items.filter(i => i.status === input.status);
}
```

**Result**: ✅ PASS (static)

---

### T-12 — Labels AND filter: item must carry all requested labels

**AC**: `REQ_KAN_LIST` AC-2

**Code evidence** — L872-876:
```typescript
items = items.filter(i => {
    const itemLabels = (i.labels as string[]) ?? [];
    return input.labels!.every(l => itemLabels.includes(l));
});
```
`.every()` implements AND semantics: all requested labels must be present.

**Result**: ✅ PASS (static)

---

### T-13 — Unknown status filter: error naming valid options

**AC**: `REQ_KAN_LIST` AC-6

**Code evidence** — L857-864:
```typescript
if (input.status) {
    const statusField = data.fields.find(f => f.name === 'status');
    const validOptions = statusField?.options?.map(o => o.name) ?? [];
    if (!validOptions.includes(input.status)) {
        return ... JSON.stringify({
            error: `Unknown status "${input.status}". Valid: ${validOptions.join(', ')}`,
        })
    }
}
```
Error returned before filtering; valid options enumerated in message.

**Result**: ✅ PASS (static)

---

### T-14 — No-match filter: empty list, not error

**AC**: `REQ_KAN_LIST` AC-5

**Code evidence**: The filter functions (`Array.filter`) return `[]` when no
item matches. The handler returns `{ path, count: 0, items: [] }` — no error
branch for a valid filter that matches nothing.

**Result**: ✅ PASS (static)

---

## Scenarios — FIELDS (T-15..T-20)

### T-15 — addField: text and single_select with options

**AC**: `REQ_KAN_FIELDS` AC-2

**Code evidence** — L951-957 (`addField` case):
- text field: checks `ftype === 'text' && input.options` → error if options present
- single_select: checks `!input.options || input.options.length === 0` → error if absent
- On success: `fieldsSeq.add(doc.createNode(newField))`
`refreshKanbanPanel` called; returns `{ updated: true, operation: 'addField' }`.

**Result**: ✅ PASS (static)

---

### T-16 — addField "status" name rejected

**AC**: `REQ_KAN_FIELDS` AC-3

**Code evidence** — L947:
```typescript
if (input.fieldName === 'status') {
    return makeError('Cannot add a field named "status" — it already exists as the column driver.');
}
```

**Result**: ✅ PASS (static)

---

### T-17 — removeField: no item references → removed

**AC**: `REQ_KAN_FIELDS` AC-4

**Code evidence** — L966-970 (`removeField` case):
```typescript
const referencingIds = data.items
    .filter(i => input.fieldName in i)
    .map(i => i.id);
if (referencingIds.length > 0) { return makeError(...); }
fieldsSeq.delete(fieldIdx);
```
When `referencingIds` is empty, `fieldsSeq.delete(fieldIdx)` executes.

**Result**: ✅ PASS (static)

---

### T-18 — removeField referenced: error naming item ids

**AC**: `REQ_KAN_FIELDS` AC-4

**Code evidence**: Same L966-970 — `referencingIds.join(', ')` names
the ids in the error message. Field not removed.

**Result**: ✅ PASS (static)

---

### T-19 — addOption added; duplicate rejected; text field rejected

**AC**: `REQ_KAN_FIELDS` AC-6

**Code evidence** (`addOption` case):
- L978-979: `if (field.type === 'text') { return makeError('Cannot add options to a text field.'); }`
- L981-983: `if (field.options?.some(o => o.name === input.optionName)) { return makeError(`Option ... already exists`); }`
- L984-993: adds option to the field's `options` sequence via `YAMLSeq.add`.

**Result**: ✅ PASS (static)

---

### T-20 — removeOption: referenced and last-option guards

**AC**: `REQ_KAN_FIELDS` AC-7, AC-8

**Code evidence** (`removeOption` case):
- L1008-1010: `if (field2.options.length === 1) { return makeError('Cannot remove the last option...'); }` — last-option guard checked before reference guard
- L1011-1014: reference guard scans items for `i[input.fieldName] === input.optionName`; returns ids

**Result**: ✅ PASS (static)

---

## Scenario — SKILL CONTENT (T-21)

### T-21 — Skill: 8 tools listed; id/reuse and compact projection documented

**AC**: `REQ_KAN_SKILLCONTENT` AC-8..AC-10

*(Re-derived from actual file content after fix commit `d1f12ed`.)*

**File evidence** — `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md`
Tools table (complete, post-fix):

```markdown
| `jarvis_createKanbanBoard` | Create a new board for an entity |
| `jarvis_openKanbanBoard` | Open a board in the webview renderer |
| `jarvis_verifyKanbanSchema` | Validate structure and semantics |
| `jarvis_updateKanbanItem` | Update fields on an existing item by ID |
| `jarvis_addKanbanItem` | Add a new item (auto-assigns id) |
| `jarvis_deleteKanbanItem` | Delete an item by ID (id is never reused) |
| `jarvis_listKanbanItems` | List/filter items (compact projection) |
| `jarvis_updateKanbanFields` | Add/remove field definitions or options |
```

All **8 tools** present on separate rows. The pre-fix file had
`jarvis_updateKanbanItem` and `jarvis_addKanbanItem` merged onto a single line
(missing newline); `d1f12ed` corrects this.

**id/reuse** — Workflow section: *"Add items — `jarvis_addKanbanItem` (id is
auto-assigned, never supply it)"*; *"Delete items — `jarvis_deleteKanbanItem`
(deleted ids are never reused)"*.

**Compact projection** — Workflow: *"List/filter — `jarvis_listKanbanItems` —
returns only `id`, `name`, `status`, `labels` (use item id to fetch full
details)"*.

**Result**: ✅ PASS (static)

---

### T-22 — ADD/WV: builtin key in `input.fields` rejected before validation

**AC**: `REQ_KAN_WRITEVALID` AC-3 (addendum — fix `d1f12ed`)

**What T-5 tested**: an *undeclared* field key (e.g. `silentTrap`) passed via
`input.fields`.  
**What T-22 tests**: a *builtin* property name (`name`, `status`, `labels`,
`notes`) passed inside `input.fields` instead of as its top-level parameter —
a distinct failure mode added by fix `d1f12ed`.

**Code evidence** — `extension.ts` L727-735:
```typescript
// Reject builtin property names in input.fields
const builtinProps = new Set(['id', 'name', 'status', 'labels', 'notes']);
if (input.fields) {
    for (const key of Object.keys(input.fields)) {
        if (builtinProps.has(key)) {
            return ... JSON.stringify({
                error: `"${key}" must be set as a top-level parameter, not via fields.`,
            })
        }
    }
}
```
This guard runs before the `values` object is assembled and before
`validateItemValues` is called. Passing `input.fields = { status: "Backlog" }`
(instead of `input.status = "Backlog"`) returns an error; file is not written.

**Result**: ✅ PASS (static)

---

## Execution Summary

| # | Tool | Scenario | Result |
|---|------|----------|--------|
| T-1 | ADD | Auto id, nextId incremented, webview refreshes | ✅ PASS (static) |
| T-2 | ADD | Status defaults to first declared option | ✅ PASS (static) |
| T-3 | ADD | nextId absent → derived and written | ✅ PASS (static) |
| T-4 | ADD/WV | Invalid single_select value → error before write | ✅ PASS (static) |
| T-5 | ADD/WV | Undeclared field key → error (not silent write) | ✅ PASS (static) |
| T-6 | ADD/WV | Caller-supplied id rejected | ✅ PASS (static) |
| T-7 | DELETE | Item removed, nextId unchanged, webview refreshes | ✅ PASS (static) |
| T-8 | DELETE | id not found → error, file unchanged | ✅ PASS (static) |
| T-9 | DELETE | Diff confined via YAMLSeq.delete | ✅ PASS (static) |
| T-10 | LIST | No filter → all items, compact projection only | ✅ PASS (static) |
| T-11 | LIST | Status filter → matching items | ✅ PASS (static) |
| T-12 | LIST | Labels AND filter | ✅ PASS (static) |
| T-13 | LIST | Unknown status → error naming valid options | ✅ PASS (static) |
| T-14 | LIST | No-match → empty list, not error | ✅ PASS (static) |
| T-15 | FIELDS | addField text + single_select | ✅ PASS (static) |
| T-16 | FIELDS | addField "status" rejected | ✅ PASS (static) |
| T-17 | FIELDS | removeField no references → removed | ✅ PASS (static) |
| T-18 | FIELDS | removeField referenced → error naming ids | ✅ PASS (static) |
| T-19 | FIELDS | addOption; duplicate + text field rejected | ✅ PASS (static) |
| T-20 | FIELDS | removeOption: reference + last-option guards | ✅ PASS (static) |
| T-21 | Skill | 8 tools on separate rows; id/reuse; compact projection documented | ✅ PASS (static) |
| T-22 | ADD/WV | Builtin key in `input.fields` rejected before validation | ✅ PASS (static) |

**Overall: 22 / 22 PASS**

T-1..T-20 verified against commit `057632f`.
T-21 re-derived from actual file content; T-22 added against fix commit `d1f12ed`.
