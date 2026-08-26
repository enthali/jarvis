# Test Protocol: kanban-skill-content

**Change Request**: kanban-skill-content  
**Branch**: `feature/kanban-skill-content`  
**UAT Spec**: [SPEC_UAT_KAN_SKILL](../design/spec_uat_kanban_skill.rst)  
**Date**: 2026-08-24

---

## Execution Note

This protocol was executed as a **code-based static analysis** of the
implementation on `feature/kanban-skill-content` commit `7b36f90`. Dynamic
runtime verification (Extension Development Host) was not available for this
execution pass.

For each scenario the relevant code path or file content is cited as evidence.
All scenarios are statically verifiable given the completeness of the
implementation. A human tester running a live EDH can confirm any scenario
independently using the steps in `SPEC_UAT_KAN_SKILL`.

Module integration (compile, package, CI) is **not** covered here; verified
by the Verify Engineer in `val-kanban-skill-content.md`.

---

## Test Scope

1. **Text field happy path** — declares a `text` field, validates clean (T-1)
2. **Text field renderer** — value shown as labelled pair on card (T-2)
3. **Backward compatibility** — existing board unchanged (T-3)
4. **Invalid: text field with options** — structural error (T-4)
5. **Invalid: single_select without options** — structural error (T-5)
6. **Invalid: status as text** — semantic error (T-6)
7. **Undeclared key** — warning, not error; not rendered (T-7)
8. **Instructions applyTo** — matches `kanban.yaml` filename (T-8)
9. **Instructions content** — `name` not `title`; `nextId` optional (T-9)
10. **Skill sections** — all 8 required sections present (T-10)
11. **Skill owner resolution** — says omit, not pre-resolve (T-11)
12. **Skill pitfalls** — undeclared-key trap named with observable symptom (T-12)

---

## Test Environment

### Prerequisites

- VS Code EDH launched from `feature/kanban-skill-content` with core + kanban
- Workspace `testdata/test.code-workspace`
- Provisioned assets present: `.github/skills/jarvis-kanban.board/SKILL.md`
  and `.github/instructions/jarvis-kanban.yaml.instructions.md`
- Fixture: `testdata/kanban/sample-with-textfield.kanban.yaml` (present ✅)

### Relevant Implementation Files

| File | Role |
|------|------|
| `schemas/kanban.schema.json` | `type: text`, if/then options binding (T-1, T-3..T-5) |
| `packages/kanban/src/extension.ts` L155–228 | `semanticValidate` (T-6, T-7) |
| `packages/kanban/webview/kanban.ts` L68–135, L138–175 | Renderer (T-2) |
| `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md` | Skill content (T-10..T-12) |
| `packages/kanban/assets/instructions/jarvis-kanban.yaml.instructions.md` | Instructions content (T-8, T-9) |
| `testdata/kanban/sample-with-textfield.kanban.yaml` | T-1/T-2 fixture |

---

## Test Scenarios

### T-1 — Text field: board with declared `text` field validates clean

**AC**: `REQ_KAN_TEXTFIELD` AC-1, AC-3; `REQ_KAN_SCHEMA` AC-6

**Precondition**: `testdata/kanban/sample-with-textfield.kanban.yaml` copied as
`testdata/.jarvis/actors/Change Manager/sample-tf.kanban.yaml`.

**Expected**: `jarvis_verifyKanbanSchema` returns `errors: []`.

**Code evidence**: `schemas/kanban.schema.json` — `type` enum includes `"text"`.
`semanticValidate` L215: `else if (fieldEntry.type === 'single_select' && ...)` —
text fields skip the option constraint branch entirely (confirmed by comment
`// text fields: any string accepted, no check`). Fixture has a valid
`description: text` field with values on items → no structural or semantic error.

**Result**: ✅ PASS (static)

---

### T-2 — Text field: value renders as labelled `name: value` pair

**AC**: `REQ_KAN_RENDERER` AC-3a; `SPEC_KAN_RENDERER`

**Precondition**: Board from T-1 open in renderer.

**Expected**: Cards for items with `description` values show
`description: <value>` as a labelled pair (same style as `priority`). The label
`description` is visible. `notes` (item 3) renders separately below, unlabelled.

**Code evidence**: `kanban.ts` L79:
```typescript
const otherFields = board.fields.filter(f => f.name !== 'status');
```
`renderCard` L158–164:
```typescript
for (const field of otherFields) {
    const val = item[field.name];
    if (typeof val === 'string' && val) {
        html += `<div ...>${escapeHtml(field.name)}: ${escapeHtml(val)}</div>`;
    }
}
```
`description` is in `otherFields`; items 1 and 2 have string `description`
values → they render as `description: <value>`. `notes` is rendered separately
(L163–168) without a label — structural difference confirmed.

**Result**: ✅ PASS (static)

---

### T-3 — Backward compatibility: existing board validates and renders unchanged

**AC**: `REQ_KAN_TEXTFIELD` AC-5; `SPEC_KAN_SCHEMA` AC-8

**Precondition**: `testdata/kanban/sample.kanban.yaml` (no `text` fields).

**Expected**: `jarvis_verifyKanbanSchema` returns `errors: []`; board renders
with the same columns and cards as before this CR.

**Code evidence**: Schema change is additive — `"text"` added to an existing
enum; `allOf` conditional makes `options` **required** for `single_select`
(already present in all existing boards) and **forbidden** for `text` (never
present in existing boards). Existing boards therefore pass both `if/then`
conditions without change. `semanticValidate` fieldMap widening only adds
`type` alongside options — no behavior change for `single_select` fields.

**Result**: ✅ PASS (static)

---

### T-4 — Invalid: `text` field with `options` is a structural error

**AC**: `REQ_KAN_TEXTFIELD` AC-2; `SPEC_KAN_SCHEMA` AC-7

**Expected**: `jarvis_verifyKanbanSchema` returns at least one structural error.

**Code evidence**: `schemas/kanban.schema.json` `allOf` second rule:
```json
{
  "if": { "properties": { "type": { "const": "text" } }, "required": ["type"] },
  "then": { "not": { "required": ["options"] } }
}
```
`"not": { "required": ["options"] }` validates true only when `options` is
absent. If `options` is present, `{ "required": ["options"] }` validates true,
making `not` evaluate to false → the `then` fails → structural validation error.

**Result**: ✅ PASS (static)

---

### T-5 — Invalid: `single_select` without `options` is a structural error

**AC**: `REQ_KAN_TEXTFIELD` AC-2; `SPEC_KAN_SCHEMA` AC-7

**Expected**: `jarvis_verifyKanbanSchema` returns at least one structural error.

**Code evidence**: `schemas/kanban.schema.json` `allOf` first rule:
```json
{
  "if": { "properties": { "type": { "const": "single_select" } }, "required": ["type"] },
  "then": { "required": ["options"] }
}
```
With `options` absent, `{ "required": ["options"] }` validates false → the
`then` fails → structural validation error.

**Result**: ✅ PASS (static)

---

### T-6 — Invalid: `status` field of `type: text` is a semantic error

**AC**: `REQ_KAN_TEXTFIELD` AC-4; `SPEC_KAN_VERIFY`

**Expected**: `jarvis_verifyKanbanSchema` returns a semantic error
("The 'status' field must be of type 'single_select'") in the `errors` array.

**Note**: A `type: text` field has no `options`, so it also passes structural
validation (T-4 is about a text field WITH options; this is a text field
without options). The structural schema cannot reach across array elements to
constrain the one named `status`, so the error is semantic only.

**Code evidence**: `extension.ts` L172–174:
```typescript
if (statusFields.length === 1 && statusFields[0].type !== 'single_select') {
    errors.push({ field: 'fields', message: "The 'status' field must be of type 'single_select'." });
}
```
With `status.type === 'text'`, condition is true → pushed to `errors`.

**Result**: ✅ PASS (static)

---

### T-7 — Undeclared item key: warning, not error; value not rendered

**AC**: `REQ_KAN_SKILLCONTENT` AC-3; `SPEC_KAN_VERIFY`

**Expected**: `jarvis_verifyKanbanSchema` returns `errors: []`; `warnings`
contains an entry for `silentTrap`. Board renders without showing the value.

**Code evidence** (validator): `extension.ts` L208–213:
```typescript
const fieldEntry = fieldMap.get(key);
if (!fieldEntry) {
    warnings.push({ field: key, message: `Unknown field "${key}" — not defined in fields[].`, ... });
} else if (fieldEntry.type === 'single_select' && ...) { ... }
// text fields: any string accepted, no check
```
Undeclared key → `fieldMap.get(key)` returns `undefined` → `warnings.push`.
Not in the `errors` array.

**Code evidence** (renderer): `kanban.ts` L79 builds `otherFields` from
`board.fields`. `silentTrap` is not in `board.fields`; therefore it is not in
`otherFields`; therefore `renderCard` never produces output for it.

**Result**: ✅ PASS (static)

---

### T-8 — Instructions `applyTo`: matches `kanban.yaml` filename

**AC**: `REQ_KAN_INSTRUCTIONS` AC-6; `SPEC_KAN_INSTRUCTIONS` AC-1

**Expected**: Instructions apply to a file named exactly `kanban.yaml`.

**File content** (`jarvis-kanban.yaml.instructions.md` frontmatter):
```yaml
---
applyTo: "**/{kanban.yaml,*.kanban.yaml}"
---
```
The brace pattern `{kanban.yaml,*.kanban.yaml}` matches the literal filename
`kanban.yaml` (first alternative) as well as any `*.kanban.yaml` file (second
alternative). The previous glob `**/*.kanban.yaml` would not have matched
`kanban.yaml`.

**Result**: ✅ PASS (static)

---

### T-9 — Instructions content: `name` not `title`; `nextId` optional

**AC**: `REQ_KAN_INSTRUCTIONS` AC-1, AC-2; `SPEC_KAN_INSTRUCTIONS` AC-2

**Expected**: Instructions state `name` as the item property; state `nextId`
as optional.

**File content** (`jarvis-kanban.yaml.instructions.md`):
> "Board-level required keys: `title`, `fields`, `items`. `nextId` is optional;
> when present it must only ever increase."
> "The item title property is `name`, not `title`."

Both pilot errors (marking `nextId` required; calling the property `title`)
are corrected. No contradiction with `schemas/kanban.schema.json` (confirmed:
`nextId` is not in the schema's `required` array; item `required` contains
`id`, `name`, `status`).

**Result**: ✅ PASS (static)

---

### T-10 — Skill: all 8 required sections present and non-empty

**AC**: `REQ_KAN_SKILLCONTENT` AC-1..AC-6; `SPEC_KAN_SKILLCONTENT` AC-1

**Expected**: SKILL.md contains all eight sections.

**File content** — sections verified in `SKILL.md`:

| Section | Present | Non-empty |
|---------|---------|-----------|
| `## Tools` | ✅ | ✅ (4-row table) |
| `## Owner Resolution` | ✅ | ✅ (3 bullets) |
| `## Board Anatomy` | ✅ | ✅ (4-row table + note on `status`) |
| `## Field Types` | ✅ | ✅ (2-row table + note on `status`) |
| `## Item Properties` | ✅ | ✅ (6-row table) |
| `## Pitfalls` | ✅ | ✅ (5 entries) |
| `## Example` | ✅ | ✅ (valid YAML block) |
| `## Workflow` | ✅ | ✅ (4-step list) |

**Result**: ✅ PASS (static)

---

### T-11 — Skill Owner Resolution: says omit, not pre-resolve

**AC**: `REQ_KAN_SKILLCONTENT` AC-4; `SPEC_KAN_SKILLCONTENT` AC-3

**Expected**: Owner Resolution section says to omit `ownerName`. Does NOT
say to call `jarvis_whoAmI` first and pass the result.

**File content** — Owner Resolution section:
> "**Omit `ownerName`** to address the calling actor's own board. The tool
> resolves the caller via `jarvis_whoAmI` internally."
> "Supply `ownerName` only to address a *different* entity's board."

No instruction to pre-call `jarvis_whoAmI` present. The forbidden pattern
from `D-L0-1` and `SPEC_KAN_SKILLCONTENT` is absent.

**Result**: ✅ PASS (static)

---

### T-12 — Skill Pitfalls: undeclared-key trap named with observable symptom

**AC**: `REQ_KAN_SKILLCONTENT` AC-3; `SPEC_KAN_SKILLCONTENT` AC-4

**Expected**: Pitfalls section contains the undeclared-key entry naming its
observable symptom (board renders, verification looks clean, value absent).

**File content** — Pitfall 1:
> "**Undeclared key is silently ignored.** An item key that matches no
> declared field is schema-valid, is reported by `jarvis_verifyKanbanSchema`
> as a *warning* (not an error), and is **never rendered**. Symptom: the
> board renders, verification looks clean (check the `warnings` array),
> and the value is absent from the card."

Symptom is named. The word "warning" (vs "error") is present. The trap from
GH #57 is fully documented.

**Result**: ✅ PASS (static)

---

## Execution Summary

| # | Scenario | Result |
|---|----------|--------|
| T-1 | Text field: board validates clean | ✅ PASS (static) |
| T-2 | Text field: value renders as labelled pair | ✅ PASS (static) |
| T-3 | Backward compatibility: existing board unchanged | ✅ PASS (static) |
| T-4 | Invalid: text field with options → structural error | ✅ PASS (static) |
| T-5 | Invalid: single_select without options → structural error | ✅ PASS (static) |
| T-6 | Invalid: status as text → semantic error | ✅ PASS (static) |
| T-7 | Undeclared key → warning not error; not rendered | ✅ PASS (static) |
| T-8 | Instructions applyTo matches `kanban.yaml` | ✅ PASS (static) |
| T-9 | Instructions: `name` not `title`; `nextId` optional | ✅ PASS (static) |
| T-10 | Skill: all 8 sections present and non-empty | ✅ PASS (static) |
| T-11 | Skill Owner Resolution: says omit, not pre-resolve | ✅ PASS (static) |
| T-12 | Skill Pitfalls: undeclared-key trap with symptom | ✅ PASS (static) |

**Overall: 12 / 12 PASS**

All scenarios verified against the implementation on commit `7b36f90`.
Code evidence or file content cited per scenario. No failures, no deviations
from spec.
