# Validation Report: kanban-update-validation

**CR:** kanban-update-validation  
**Verification Date:** 2026-08-26  
**Verify Engineer:** Verify Engineer  
**Status:** ✅ **APPROVED FOR MERGE**

---

## Scope

This verification covers the kanban-update-validation Change Request, which closes a specification contradiction by bringing `jarvis_updateKanbanItem` into the shared write validation contract (`REQ_KAN_WRITEVALID`). The tool now calls the same `validateItemValues` helper used by the four write tools in kanban-management-tools, replacing its previous status-only validation.

Verification spans:
- Requirements changes: REQ_KAN_UPDATE (AC-7 superseded, AC-8/AC-9/AC-10 added), REQ_KAN_WRITEVALID (AC-6 added, Applicable tools enumeration)
- Design specification: SPEC_KAN_UPDATE (algorithm rewritten, board projection widened, guarding test section added)
- Implementation in [packages/kanban/src/extension.ts](packages/kanban/src/extension.ts#L596-L688)
- Test fixes in [src/tests/kanban-comment-preservation.test.ts](src/tests/kanban-comment-preservation.test.ts#L14-L36)
- Commits: 7104481 (design), 3feaada (UAT), 2114160 (implementation)

---

## Per-Element Verification

### 1. REQ_KAN_UPDATE — Updated Requirement ✅ PASSED

**Element:** jarvis_updateKanbanItem tool requirement  
**Location:** [docs/requirements/req_kan.rst:255-307](docs/requirements/req_kan.rst#L255)

| AC | Requirement | Status |
|----|-------------|--------|
| AC-1 | Accepts itemId, changes, boardName, ownerName | ✅ PASS (unchanged) |
| AC-2 | Finds item by id and merges changes | ✅ PASS (unchanged) |
| AC-3 | Owner resolution follows uniform pattern | ✅ PASS (unchanged) |
| AC-4 | Success/error return shapes | ✅ PASS (unchanged) |
| AC-5 | id is immutable | ✅ PASS (unchanged, now enforced) |
| AC-6 | Comment preservation (GH #53) | ✅ PASS (unchanged) |
| AC-7 | **Superseded by AC-8/AC-9/AC-10** | ✅ SUPERSEDED |
| AC-8 | Validate complete changes via REQ_KAN_WRITEVALID | ✅ NEW AC ADDED |
| AC-9 | Reject id in changes with error | ✅ NEW AC ADDED |
| AC-10 | Validate before mutate (file byte-identical on error) | ✅ NEW AC ADDED |

**Finding:** AC-7 supersession is correctly documented. The criterion text explains what AC-7 froze and what remains unchanged (lookup by id, immutable id, error paths). AC-8/AC-9/AC-10 are clearly marked as added by kanban-update-validation CR.

---

### 2. REQ_KAN_WRITEVALID — Updated Shared Contract ✅ PASSED

**Element:** Board write validation contract  
**Location:** [docs/requirements/req_kan.rst:373-411](docs/requirements/req_kan.rst#L373)

| AC | Requirement | Evidence | Status |
|----|-------------|----------|--------|
| AC-1 | single_select value checking | Unchanged; enforced by shared helper | ✅ PASS |
| AC-2 | text field unchecked | Unchanged; enforced by shared helper | ✅ PASS |
| AC-3 | Undeclared key rejection | Unchanged; enforced by shared helper | ✅ PASS |
| AC-4 | id not settable, rejection not skip | Unchanged; now enforced by updateKanbanItem | ✅ PASS |
| AC-5 | Error shape | Unchanged | ✅ PASS |
| AC-6 | **One shared helper, not copies** | NEW AC — requires all applicable tools use SPEC_KAN_WRITEVALID | ✅ NEW AC ADDED |

**Applicable Tools Enumeration:** Added to requirement description:
- `jarvis_addKanbanItem` (REQ_KAN_ADD) — implements via validateItemValues [packages/kanban/src/extension.ts:722]
- `jarvis_updateKanbanItem` (REQ_KAN_UPDATE AC-8) — implements via validateItemValues [packages/kanban/src/extension.ts:651]
- `jarvis_updateKanbanFields` (REQ_KAN_FIELDS) — item-value paths implement via validateItemValues [packages/kanban/src/extension.ts:968]
- `jarvis_deleteKanbanItem` — explicitly out of scope (writes no values)

**Finding:** Requirement now resolves F-1 contradiction from kanban-management-tools. All applicable tools documented; jarvis_updateKanbanItem now included.

---

### 3. SPEC_KAN_UPDATE — Design Specification Rewritten ✅ PASSED

**Element:** jarvis_updateKanbanItem tool specification  
**Location:** [docs/design/spec_kan.rst:596-662](docs/design/spec_kan.rst)

#### Field Projection Cast Widening (D-L2-3)

**Requirement:** Board projection must include `type` so validateItemValues can branch on it.

**Evidence in Implementation:** [packages/kanban/src/extension.ts:643](packages/kanban/src/extension.ts#L643)

```typescript
const data = doc.toJSON() as {
    items: Array<Record<string, unknown>>;
    fields: Array<{ name: string; type: string; options?: Array<{ name: string }> }>;
};
```

✅ Cast includes `type: string` (critical for validateItemValues branching on field type)

#### Validation Order (D-L2-4)

**Requirement:** Validation must precede mutation so rejected update leaves file byte-identical.

**Evidence in Implementation:** [packages/kanban/src/extension.ts:651-654](packages/kanban/src/extension.ts#L651-L654)

```typescript
// Validate all changes via shared helper (SPEC_KAN_WRITEVALID)
const validationErr = validateItemValues(input.changes, data);
if (validationErr) {
    return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(JSON.stringify({ error: validationErr }))
    ]);
}
```

✅ Validation call at L651 (before any document mutation at L659+); early return on error = no file write

#### id Handling (D-L2-2)

**Requirement:** Silent id skip removed; validateItemValues rejects id.

**Evidence in Implementation:**

1. validateItemValues rejects id [packages/kanban/src/extension.ts:165-167]:
```typescript
if ('id' in values) {
    return 'Cannot supply "id" — ids are auto-assigned.';
}
```

2. Mutation loop [packages/kanban/src/extension.ts:659-662] has no id-skip filter:
```typescript
for (const [key, value] of Object.entries(input.changes)) {
    itemNode.set(key, value);
}
```

✅ Previous `if (key === 'id') continue;` is gone; id is rejected upstream

#### AC Verification

All SPEC_KAN_UPDATE acceptance criteria met:
- AC-8: Validation before mutation via validateItemValues ✅
- AC-9: id rejected (not skipped) ✅
- AC-10: Board-projection cast includes type ✅
- AC-11: File byte-identical on error path (validation before mutation) ✅
- AC-12: Panel refreshes on success [L680] ✅

---

### 4. SPEC_KAN_WRITEVALID — Caller Documentation ✅ PASSED

**Element:** Shared validation helper specification  
**Location:** [docs/design/spec_kan.rst:799-847](docs/design/spec_kan.rst)

**Addition:** Callers section documenting that this helper is reachable from:
- SPEC_KAN_ADD [L722] ✅
- SPEC_KAN_UPDATE [L651] ✅
- SPEC_KAN_FIELDS [L968] — the item-value path ✅

**Finding:** Spec correctly documents the one shared helper is used by all applicable tools, satisfying D-L1-4 and REQ_KAN_WRITEVALID AC-6.

---

### 5. Test TC-1: End Marker and Assertion ✅ PASSED

**Element:** Source-level test for updateKanbanItem  
**Location:** [src/tests/kanban-comment-preservation.test.ts:14-36](src/tests/kanban-comment-preservation.test.ts#L14)

#### End Marker Fix

**Before:** `// Tool: jarvis_openKanbanBoard` (included 4 intermediate tools)  
**After:** `// Tool: jarvis_addKanbanItem` (L21 in test file)  

```typescript
const toolEnd = extensionSrc.indexOf("// Tool: jarvis_addKanbanItem", toolStart);
```

✅ Slice now spans only jarvis_updateKanbanItem body (L596–688 in extension.ts)

#### Assertion Fix

**Before:** `/if\s*\(key\s*===\s*'id'\)/` (id-skip filter assertion)  
**After:** `validateItemValues(input.changes` delegation assertion (L35)

```typescript
it('delegates to validateItemValues for all change validation', () => {
    expect(toolHandlerSrc).toContain('validateItemValues(input.changes');
});
```

✅ New assertion correctly checks delegation to shared helper (the id check now happens in validateItemValues, not in updateKanbanItem)

**Test Results:** All 8 tests pass (TC-1 + TC-2/TC-3 unchanged) ✅

---

## Behaviour-Change Verification

The CD documents three behaviour changes now enforced:

| Call Signature | Before | After | Requirement |
|---|---|---|---|
| `changes` with bad value on non-status `single_select` field | accepted, written | rejected with error | REQ_KAN_UPDATE AC-8 |
| `changes` with undeclared key | accepted, written (never rendered) | rejected with error | REQ_KAN_UPDATE AC-8 |
| `changes` containing `id` | silently dropped, `updated: true` | rejected with error | REQ_KAN_UPDATE AC-9 |

**Verification:**

All three are now rejected by validateItemValues [L162-196]:
1. L188-190: single_select option validation
2. L183-186: undeclared field rejection
3. L165-167: id rejection

✅ All three behaviour changes verified in implementation

---

## Design Decisions

### D-L1-1: AC-7 Superseded in Place ✅ VERIFIED

AC-7 text preserved with supersession marker pointing to AC-8/AC-9/AC-10. Enables future readers (and `kanban-yaml-comment-preservation` CR verification) to understand what was frozen and why.

**Status in Implementation:** ✅ Text preserved in req_kan.rst L276-284

### D-L1-2: AC-7 Non-Validation Content Preserved ✅ VERIFIED

Lookup by id, immutable id, error paths (board-not-found, item-not-found, read/write errors) unchanged.

**Status in Implementation:** 
- Lookup by id: L647-650 ✅
- Immutable id: Enforced via validateItemValues L165-167 ✅
- Error paths: L621-629 (resolve), L635-638 (board check), L645-646 (lookup), L655-657 (file write) ✅

### D-L1-3: id as Error, Not Skip ✅ VERIFIED

Silent skip removed; validateItemValues returns error for id.

**Status in Implementation:** L165-167 (error), no if-skip in mutation loop ✅

### D-L1-4: One Shared Helper Requirement ✅ VERIFIED

REQ_KAN_WRITEVALID AC-6 added, requiring all applicable tools use SPEC_KAN_WRITEVALID (not independent implementations).

**Status in Specification:** req_kan.rst L405-408 ✅  
**Status in Implementation:** All four tools call validateItemValues [L722, L651, L968 (fields)] ✅

### D-L1-5: Applicable Tools Enumeration ✅ VERIFIED

jarvis_deleteKanbanItem explicitly listed as out-of-scope (writes no values).

**Status in Specification:** req_kan.rst L374 ✅

### D-L2-1: changes Passed Unmodified ✅ VERIFIED

No translation layer; `changes` already has correct shape `Record<string, unknown>`.

**Status in Implementation:** L651 passes `input.changes` directly ✅

### D-L2-2: id-Skip Filter Removed ✅ VERIFIED

Per-key filter removed from mutation loop; rule now enforced upstream in validateItemValues.

**Status in Implementation:** Mutation loop [L659-662] has no `if (key === 'id')` ✅

### D-L2-3: Board Projection Widened ✅ VERIFIED

Field projection cast includes `type` for validateItemValues branching.

**Status in Implementation:** L643 includes `type: string` ✅

### D-L2-4: Validation Before Mutation ✅ VERIFIED

validateItemValues call at L651, before document mutation at L659+.

**Status in Implementation:** L651 (validate), L659+ (mutate), early return on error ✅

### D-L2-5: id Guard Reachability ✅ NOTED

id guard in validateItemValues [L165-167] now has its first reachable caller (jarvis_updateKanbanItem at L651). Previously dead code on add path (per QM findings in kanban-management-tools), now live and essential.

**Status:** Correctly documented in spec as design-time finding ✅

---

## Design-Time Findings ✅ ADDRESSED

### TC-1 Slice Fragility

**Finding:** TC-1 test sliced from `jarvis_updateKanbanItem` to `jarvis_openKanbanBoard`. After kanban-management-tools inserted four tools, the slice included five tool bodies and every assertion was satisfiable by non-updateKanbanItem code.

**Resolution in This CR:**
1. End marker moved to `// Tool: jarvis_addKanbanItem` → slice now single-tool ✅
2. Assertion changed from id-skip regex to validateItemValues delegation → assertion now checks what this CR changes ✅

**Remaining Issue (Follow-up):** Test still brittle against future tool insertion. Robust form would match on `registerTool('jarvis_updateKanbanItem'` block rather than comment markers. Out of scope per spec.

---

## Compilation & Test Status ✅ PASSED

```
$ npx tsc -p packages/kanban --noEmit
(no output — success)

$ npm test -- kanban-comment-preservation
 Test Files  1 passed (1)
      Tests  8 passed (8)
   Duration  231ms
```

**Finding:** All packages compile cleanly; all tests pass including updated TC-1.

---

## Traceability ✅ VERIFIED

### Requirement-Spec Links

| Requirement | Spec | Evidence | Status |
|---|---|---|---|
| REQ_KAN_UPDATE AC-8/AC-9/AC-10 | SPEC_KAN_UPDATE | Algorithm rewritten; AC-8..AC-12 | ✅ |
| REQ_KAN_WRITEVALID AC-6 | SPEC_KAN_WRITEVALID AC-1 (extended) + Callers section | All tools call validateItemValues | ✅ |

### Spec-Implementation Links

| Spec | Implementation | Evidence | Status |
|---|---|---|---|
| SPEC_KAN_UPDATE step 4 (validate before mutate) | L651-654 | validateItemValues call + early return | ✅ |
| SPEC_KAN_UPDATE board-projection widening | L643 | Field cast includes type | ✅ |
| SPEC_KAN_WRITEVALID caller (updateKanbanItem) | L651 | validateItemValues delegation | ✅ |

---

## Outstanding Items (Follow-Up)

Per CD Issues Found section:

1. **REQ_UAT_KANBAN / SPEC_UAT_KANBAN** — Existing UAT scenarios predate this change and may assert old behaviour (e.g., non-status values written successfully). Test Designer must review and amend or add scenarios for the three behaviour changes. Not part of this CR.

2. **TC-1 Slice Brittleness** — Remaining issue recorded for future robustness work. Acceptable for now.

---

## Summary

✅ **VERIFICATION PASSED**

All acceptance criteria across updated requirements (REQ_KAN_UPDATE, REQ_KAN_WRITEVALID) and design specifications (SPEC_KAN_UPDATE, SPEC_KAN_WRITEVALID) have been verified against implementation.

**Key Findings:**

1. **Contradiction Resolved:** REQ_KAN_UPDATE AC-7 superseded; AC-8/AC-9/AC-10 bring tool into shared contract.
2. **Field Projection Widened:** Board cast includes `type` (D-L2-3) — critical for validateItemValues branching.
3. **Validation Ordering:** validateItemValues call at L651 precedes mutation (L659+); rejected updates leave file byte-identical.
4. **id Handling Changed:** Silent skip removed; validateItemValues rejects id in changes (REQ_KAN_UPDATE AC-9).
5. **Shared Helper Enforced:** REQ_KAN_WRITEVALID AC-6 requires one shared helper; all applicable tools now call validateItemValues.
6. **Test Fixed:** TC-1 end marker moved, assertion updated; all 8 tests pass.
7. **Behaviour Changes Documented:** Three calls now return errors instead of silently accepting/applying invalid changes; carried in Behaviour-Change Register.

**Design Decisions:** All decisions D-L1-1 through D-L2-5 correctly implemented.

**Build Status:** ✅ Clean compilation; ✅ All tests pass including amended TC-1.

---

## Recommendation

✅ **APPROVED FOR MERGE**

Implementation correctly satisfies all specification changes and acceptance criteria. jarvis_updateKanbanItem now conforms to the shared write-validation contract introduced in kanban-management-tools. Spec contradiction F-1 is resolved. Ready for merge to development branch.

**Next Steps (CM routing):**
- Test Designer: Review and amend/add UAT scenarios for the three behaviour changes
- No blocking issues detected

---

**Verified by:** Verify Engineer  
**Date:** 2026-08-26  
**Spec Reference:** docs/requirements/req_kan.rst (REQ_KAN_UPDATE, REQ_KAN_WRITEVALID), docs/design/spec_kan.rst (SPEC_KAN_UPDATE, SPEC_KAN_WRITEVALID)  
**Implementation Reference:** packages/kanban/src/extension.ts (L596–688), src/tests/kanban-comment-preservation.test.ts (TC-1)
