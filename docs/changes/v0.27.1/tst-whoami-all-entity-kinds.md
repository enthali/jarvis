# Test Protocol: whoami-all-entity-kinds

**Change Request**: whoami-all-entity-kinds  
**Branch**: `feature/whoami-all-entity-kinds`  
**UAT Spec**: [SPEC_UAT_ACT_WHOAMI_MULTIKINDS](../design/spec_uat_act_whoami_multikinds.rst);
amended [SPEC_UAT_WHOAMI](../design/spec_uat_whoami.rst) T-3  
**Date**: 2026-08-31

---

## Execution Note

Executed as **code-based static analysis** against commit `6134617`.
Evidence from `packages/core/src/extension.ts` L1279-1305 (the `whoAmI` step 3
rewrite) and `packages/kanban/src/extension.ts` L52-90 (`resolveOwner`).

Module integration is not covered here — verified by the Verify Engineer
in `val-whoami-all-entity-kinds.md`.

---

## Amended T-3 (SPEC_UAT_WHOAMI) — Zero-match → unchanged error

**AC**: `REQ_ACT_WHOAMI` AC-3, AC-12

**Code evidence** — `extension.ts` L1283-1288:
```typescript
if (matches.length === 0) {
    log.info(`[whoAmI] entity "${entityName}" not found in scanner registry`);
    return ... JSON.stringify({ error: ERROR_MSG })
}
```
Behavior unchanged — a session name not matching any entity of any kind still
returns the same `ERROR_MSG`. T-3's amendment is purely textual (wording +
AC-12 reference); no code change is needed or present.

**Result**: ✅ PASS (static)

---

## T-1 — Project session resolved

**AC**: `REQ_ACT_WHOAMI` AC-2, AC-10

**Code evidence** — `extension.ts` L1280-1300:
```typescript
const matches = kindDrivenScanner.entities
    .filter(e => e.name === entityName);
```
No kind filter. `kindDrivenScanner.entities` contains all registered kinds
(session, project, event) — confirmed by L437:
`for (const kind of ['session', 'project', 'event'])`. For a session named
`"Project: Alpha Initiative"`, the filter finds the single project entity.
`matches.length === 1` → L1295-1300:
```typescript
const entity = matches[0];
const contextPath = path.join(entity.folder, 'context.md');
return ... JSON.stringify({ name: entity.name, contextPath })
```

**Previous behaviour**: Old predicate
`kindDrivenScanner.entities.find(e => e.name === entityName && e.kind === 'session')`
returned `undefined` for a project entity → AC-3 error.

**Result**: ✅ PASS (static)

---

## T-2 — Event session resolved

**AC**: `REQ_ACT_WHOAMI` AC-2, AC-10

**Code evidence**: Same path as T-1. For `"DevCon 2026"`, the name-only filter
finds the single event entity → returns `{ name: "DevCon 2026", contextPath: ... }`.

**Result**: ✅ PASS (static)

---

## T-3 — Multi-match across kinds → error

**AC**: `REQ_ACT_WHOAMI` AC-7, AC-11

**Fixture verified**:
- `testdata/.jarvis/actors/Shared Name/actor.yaml`: `name: Shared Name` ✅
- `testdata/projects/shared-name/project.yaml`: `name: Shared Name` ✅

**Code evidence** — `extension.ts` L1289-1293:
```typescript
if (matches.length > 1) {
    log.warn(`[whoAmI] entity "${entityName}" matched ${matches.length} entries — ambiguous`);
    return ... JSON.stringify({ error: ERROR_MSG })
}
```
Filter yields 2 matches → `matches.length > 1` → error returned. The Actor's
`contextPath` is not returned. Both entities are in `kindDrivenScanner.entities`
(one as `kind: 'session'`, one as `kind: 'project'`), so the filter correctly
catches the collision.

**Result**: ✅ PASS (static)

---

## T-4 — Actor regression: Change Manager resolved unchanged

**AC**: `REQ_ACT_WHOAMI` AC-2; regression guard

**Code evidence**: Same filter for `"Change Manager"` — only one entity with
that name in the scanner (the actor). `matches.length === 1` → returns
`{ name: "Change Manager", contextPath: ... }`. No behavioral change for the
single-kind-Actor case.

**Result**: ✅ PASS (static)

---

## T-5 — Kanban regression: Project owner resolved via whoAmI

**AC**: `US_UAT_ACT_WHOAMI_MULTIKINDS` AC-4; `REQ_KAN_LIST` AC-1 (implicit)

**Code evidence** — `packages/kanban/src/extension.ts` L61-89, `resolveOwner`:

When `ownerName` is omitted, the kanban tool calls `api.invokeTool('jarvis_whoAmI', ...)`.
With the fixed `whoAmI`:
1. Returns `{ name: "Project: Alpha Initiative" }` for a project-titled session.
2. `resolveOwnerByName("Project: Alpha Initiative", api)` (L52-59) calls
   `api.listJarvisSessions()` — which returns entities across all kinds —
   and finds the project by name.
3. Returns `{ name, folder }` → board path resolved correctly.
4. The kanban tool proceeds to find/list items. Returns items or
   `{ error: "board not found" }` — **not** `{ error: "actor unknown" }`.

**Result**: ✅ PASS (static)

---

## Execution Summary

| # | Spec | Scenario | Result |
|---|------|----------|--------|
| T-3 (amended) | SPEC_UAT_WHOAMI | Zero-match → unchanged error (AC-12 regression) | ✅ PASS (static) |
| T-1 | SPEC_UAT_ACT_WHOAMI_MULTIKINDS | Project session resolved | ✅ PASS (static) |
| T-2 | SPEC_UAT_ACT_WHOAMI_MULTIKINDS | Event session resolved | ✅ PASS (static) |
| T-3 | SPEC_UAT_ACT_WHOAMI_MULTIKINDS | Multi-match → error (fixtures verified) | ✅ PASS (static) |
| T-4 | SPEC_UAT_ACT_WHOAMI_MULTIKINDS | Actor regression: Change Manager unchanged | ✅ PASS (static) |
| T-5 | SPEC_UAT_ACT_WHOAMI_MULTIKINDS | Kanban: Project owner resolved via whoAmI | ✅ PASS (static) |

**Overall: 6 / 6 PASS**

All scenarios verified against commit `6134617`.
