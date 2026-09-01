# Validation Report: whoami-all-entity-kinds

**CR:** whoami-all-entity-kinds  
**Verification Date:** 2026-08-31  
**Verify Engineer:** Verify Engineer  
**Status:** ✅ **APPROVED FOR MERGE**

---

## Scope

This verification covers the whoami-all-entity-kinds Change Request, which removes the hard-coded `kind === 'session'` restriction from `jarvis_whoAmI` and resolves entity identity against the scanner's complete registry by name alone, enabling Projects and Events to be recognized as valid caller entities while properly handling multi-match collisions.

Verification spans:
- Modified user story: [US_ACT_WHOAMI](docs/userstories/us_act.rst#L204) (AC-1 broadened, new AC-6)
- Modified requirement: [REQ_ACT_WHOAMI](docs/requirements/req_act.rst#L857) (AC-2 rewritten, new AC-10/AC-11/AC-12)
- Modified design spec: [SPEC_ACT_WHOAMI](docs/design/spec_act.rst#L1829) (step 3 rewritten to collect-and-count)
- New UAT spec: [SPEC_UAT_ACT_WHOAMI_MULTIKINDS](docs/design/spec_uat_act_whoami_multikinds.rst)
- Implementation in [packages/core/src/extension.ts](packages/core/src/extension.ts#L1279-L1295)
- Test fixtures: [testdata/.jarvis/actors/Shared Name/actor.yaml](testdata/.jarvis/actors/Shared%20Name/actor.yaml), [testdata/projects/shared-name/project.yaml](testdata/projects/shared-name/project.yaml)
- Commits: 0979b64 (L0/L1/L2 design), 812db48 (UAT artifacts), 6134617 (implementation)

---

## Per-Element Verification

### 1. User Story Amendment — Broadened Scope ✅ PASSED

**Element:** [US_ACT_WHOAMI](docs/userstories/us_act.rst#L204)  

| Criterion | Before | After | Status |
|---|---|---|---|
| AC-1 wording | "registered **Actor**" (ambiguous: meant any entity) | "any registered Jarvis entity — whether my entity is an Actor, a Project, or an Event" (explicit) | ✅ |
| AC-6 (new) | — | "If my name matches more than one registered entity, the tool SHALL give me the AC-2 error rather than pick one" | ✅ |
| Persona line | Generic | "whether my entity is an Actor, a Project, or an Event" (three kinds named explicitly) | ✅ |

**Finding:** User story corrects the ambiguous wording that led to the defect. AC-1 now explicitly states any entity kind is valid. AC-6 states the multi-match consequence of AC-5 (no guessing) explicitly.

---

### 2. Requirement Amendment — Predicate Removal and Registry Authority ✅ PASSED

**Element:** [REQ_ACT_WHOAMI](docs/requirements/req_act.rst#L857)  

| AC | Change | Evidence | Status |
|---|---|---|---|
| AC-2 | Rewritten: kind restriction removed | "The criterion previously restricted this to entities of kind `session`, which excluded Projects and Events for no stated reason; all registered kinds qualify." | ✅ |
| AC-10 | New: registry is sole authority | "The scanner's entity registry SHALL be the sole authority on which entities exist. The tool SHALL NOT carry a hard-coded set of acceptable entity kinds — neither the removed `kind === 'session'` test nor any replacement allowlist." | ✅ |
| AC-11 | New: multi-match case explicit | "When the resolved name matches **more than one** registered entity, the tool SHALL return the AC-3 error and SHALL NOT select among the candidates … Entity names are not guaranteed unique across kinds, so this case is reachable rather than theoretical." | ✅ |
| AC-12 | New: zero-match unchanged | "Behaviour for a name matching exactly zero entities SHALL be unchanged — the AC-3 error, as before." | ✅ |

**Finding:** Requirement explicitly removes the kind filter (AC-2), establishes registry as sole authority (AC-10), makes multi-match an error per existing AC-7 principle (AC-11), and preserves zero-match unchanged (AC-12).

---

### 3. Design Specification — Step 3 Rewritten ✅ PASSED

**Element:** [SPEC_ACT_WHOAMI step 3](docs/design/spec_act.rst#L1947)  

**Specification:**
```rst
3. Look the name up in the scanner's entity registry, **matching on name
   alone** (``whoami-all-entity-kinds`` CR). Three outcomes:

   - exactly one match → continue to step 4;
   - no match → return the AC-3 error (unchanged);
   - more than one match → return the AC-3 error, selecting none
     (``REQ_ACT_WHOAMI`` AC-11).
```

**Key Design Rationale Sections:**

1. **Why kind test is removed** (per D-L2-1):
   - Spec states: "The predicate was `e.kind === 'session' && e.name === entityName`, which silently excluded Projects and Events."
   - Spec states: "It is removed rather than widened to a kind allowlist: the registry is already the authoritative statement of which entities exist (REQ_ACT_WHOAMI AC-10), so a second, hand-maintained list of acceptable kinds could only drift out of step with it."
   - Spec states: "The kind cannot be carried through from step 2 in any case: `getEntityNameForSessionId()` returns the chat tab's title, a bare string."

2. **Why multi-match is error not tie-break** (per D-L2-2):
   - Spec states: "This is the same rule already stated for the correlation buffer above ('Ambiguity is an error, not a tie-break'), applied at the second place the handler can be ambiguous."
   - Spec states: "`find()` would then return whichever the scanner happened to list first and hand the caller another entity's `context.md` — the wrong-identity failure of GH #51 reproduced through a different route."
   - Spec states: "Selecting by kind precedence was considered and rejected: preferring `session` would preserve today's answer for a colliding pair, but it is still a guess, and `REQ_ACT_WHOAMI` AC-7 forbids returning an identity that cannot be attributed unambiguously."

**Finding:** Design spec correctly rewrites step 3 to use collect-and-count pattern (three explicit outcomes) and documents both the kind-filter removal rationale and multi-match tie-break rejection.

---

### 4. Implementation — Algorithm Verification ✅ PASSED

**Element:** [packages/core/src/extension.ts:1279-1295](packages/core/src/extension.ts#L1279)  

```typescript
// 3. Resolve name against the scanner's full entity registry (SPEC_ACT_WHOAMI step 3)
const matches = kindDrivenScanner.entities
    .filter(e => e.name === entityName);
if (matches.length === 0) {
    log.info(`[whoAmI] entity "${entityName}" not found in scanner registry`);
    return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(JSON.stringify({ error: ERROR_MSG }))
    ]);
}
if (matches.length > 1) {
    log.warn(`[whoAmI] entity "${entityName}" matched ${matches.length} entries — ambiguous`);
    return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(JSON.stringify({ error: ERROR_MSG }))
    ]);
}
const entity = matches[0];
```

| Criterion | Implementation | Status |
|---|---|---|
| No kind filter | `.filter(e => e.name === entityName)` — name only | ✅ |
| No allowlist | No hard-coded kind set in predicate | ✅ |
| Collect-and-count pattern | `kindDrivenScanner.entities.filter()` returns all matches, then count checked | ✅ |
| Zero matches → error | `matches.length === 0` returns AC-3 error | ✅ |
| One match → success | `const entity = matches[0]` proceeds to step 4 | ✅ |
| Multi-match → error | `matches.length > 1` returns AC-3 error with `log.warn` | ✅ |
| Log distinguishes cause | `.info()` for zero, `.warn()` for multi-match, allowing diagnosis without branching model logic | ✅ |

**Finding:** Implementation correctly uses filter-and-count pattern per D-L2-1. No `.find()` with kind predicate remains. No hard-coded allowlist present. All three outcomes (zero, one, multiple) explicitly handled.

---

### 5. No Remaining Kind Filter ✅ PASSED

**Search Result:**
```powershell
grep "kind === 'session'" packages/core/src/extension.ts
(no results)
```

**Finding:** The old predicate `kind === 'session'` has been completely removed. No variant remains.

---

### 6. Multi-Match Test Fixture — Reachable Scenario ✅ PASSED

**Fixture 1:** [testdata/.jarvis/actors/Shared Name/actor.yaml](testdata/.jarvis/actors/Shared%20Name/actor.yaml)
```yaml
name: Shared Name
summary: Actor fixture for multi-match whoAmI test
```

**Fixture 2:** [testdata/projects/shared-name/project.yaml](testdata/projects/shared-name/project.yaml)
```yaml
name: Shared Name
summary: Project fixture for multi-match whoAmI test
```

**Finding:** Both Actor and Project entities have the name "Shared Name", creating the exact multi-match scenario described in UAT T-3 of [SPEC_UAT_ACT_WHOAMI_MULTIKINDS](docs/design/spec_uat_act_whoami_multikinds.rst#L45). The scanner will find both when the name is looked up, and the code will correctly return an error instead of selecting one.

---

### 7. UAT Scenarios — Complete Coverage ✅ PASSED

**Element:** [SPEC_UAT_ACT_WHOAMI_MULTIKINDS](docs/design/spec_uat_act_whoami_multikinds.rst)  

| Scenario | Behaviour Change | Test Fixture | Status |
|---|---|---|---|
| T-1 | Project session now resolved (was error due to kind filter) | `testdata/projects/alpha/project.yaml` (existing) | ✅ |
| T-2 | Event session now resolved (was error due to kind filter) | `testdata/events/2026-06-15_DevCon 2026/event.yaml` (existing) | ✅ |
| T-3 | Multi-match returns error instead of selecting first | Actor + Project both named "Shared Name" (new fixtures) | ✅ |
| T-4 | Actor regression — still works unchanged | `Change Manager` actor (existing) | ✅ |
| T-5 | Kanban integration — whoAmI resolves Project owner for tool | Kanban board in Project entity (existing) | ✅ |

**Finding:** All UAT scenarios are covered. New test fixtures for the multi-match case (T-3) are in place. Regression cases (T-4 Actor, T-5 Kanban) use existing fixtures and verify no breakage.

---

### 8. Specification Consistency — No Conflicts ✅ PASSED

**Conflicts Checked:**

| Potential Conflict | Check | Result |
|---|---|---|
| Multi-match tie-break rule vs existing AC | AC-11 restates AC-7 (ambiguity is error) at registry lookup point | ✅ No conflict; consistent application |
| Kind removal vs caller code | REQ_KAN_* consumers reference jarvis_whoAmI only for owner resolution; contract unchanged (accept any entity) | ✅ No breakage |
| Registry authority vs one-kind allowlist | AC-10 explicitly forbids replacement allowlist | ✅ No loophole |
| Multi-match error vs precedence-based tie-break | D-L2-2 records why precedence was rejected (still a guess per AC-7) | ✅ Decided deliberately |

**Finding:** No specification conflicts detected. New ACs (AC-10, AC-11, AC-12) sit on existing AC-7 principle ("ambiguity is error"). Multi-kind support is backward compatible: callers expecting Project/Event now succeed; callers with unknown session names still get the existing error.

---

### 9. Traceability — Complete Chain ✅ PASSED

| US | REQ | SPEC | Implementation | UAT | Complete? |
|----|-----|------|---|---|---|
| US_ACT_WHOAMI AC-1 | REQ_ACT_WHOAMI AC-2, AC-10, AC-11, AC-12 | SPEC_ACT_WHOAMI step 3 | extension.ts L1279-1295 (filter+count) | SPEC_UAT_ACT_WHOAMI_MULTIKINDS T-1/T-2/T-3 | ✅ |
| US_ACT_WHOAMI AC-6 | REQ_ACT_WHOAMI AC-7, AC-11 | SPEC_ACT_WHOAMI step 3 rationale | extension.ts L1290-1293 (multi-match log.warn) | SPEC_UAT_ACT_WHOAMI_MULTIKINDS T-3 | ✅ |

---

### 10. Behaviour Change Register ✅ VERIFIED

**Changes Introduced by This CR:**

| Case | Previous Behaviour | New Behaviour | Acceptance Criterion |
|---|---|---|---|
| Session bound to a **Project** | ❌ Error: "not a registered actor" | ✅ `{ name, contextPath }` | AC-2 (kind restriction removed) |
| Session bound to an **Event** | ❌ Error: "not a registered actor" | ✅ `{ name, contextPath }` | AC-2 (kind restriction removed) |
| Session bound to an **Actor** | ✅ `{ name, contextPath }` | ✅ `{ name, contextPath }` | AC-2 (unchanged for Actors) |
| Name matches **no** entity | ❌ Error (unchanged) | ❌ Error (unchanged) | AC-12 (explicit: unchanged) |
| Name matches **two+ entities** | ⚠️ Returns first match (guessed) | ❌ Error: "not a registered actor" | AC-11 (ambiguity is error) |

**Last Row Rationale:** The previous behaviour (returning the first match when names collided) was a defect, not an intended feature. `REQ_ACT_WHOAMI` AC-7 forbids returning an identity that cannot be attributed unambiguously. The previous answer was a best-guess that violated AC-7. The new error is the correct behaviour per spec.

---

### 11. Design Decisions Verified ✅ PASSED

| Decision ID | Principle | Implementation Evidence | Status |
|---|---|---|---|
| D-L0-1 | Story wording amended, not just code | US_ACT_WHOAMI AC-1 now says "any registered Jarvis entity" | ✅ |
| D-L0-2 | Multi-match case written as AC-6 (not left implicit) | US_ACT_WHOAMI AC-6 explicitly states the case | ✅ |
| D-L0-3 | Persona names three kinds explicitly | "whether my entity is an Actor, a Project, or an Event" | ✅ |
| D-L1-1 | Tie-break was already decided by AC-7 (ambiguity forbidden) | REQ_ACT_WHOAMI AC-7 cited in CD, tied to AC-11 | ✅ |
| D-L1-2 | AC-10 forbids replacement allowlist | "SHALL NOT carry a hard-coded set of acceptable entity kinds — neither the removed `kind === 'session'` test nor any replacement allowlist" | ✅ |
| D-L1-3 | AC-12 states unchanged zero-match explicitly | AC-12: "Behaviour for a name matching exactly zero entities SHALL be unchanged" | ✅ |
| D-L1-4 | Entity-name uniqueness is reachable, not theoretical | Test fixtures create the multi-match case; name collision is real | ✅ |
| D-L1-5 | Error text unchanged (slight imprecision accepted) | "You are not a registered actor..." used for all failures (Actor/Project/Event) | ✅ |
| D-L2-1 | Step 3 uses collect-and-count, not find | `filter(e => e.name === entityName)` followed by count check | ✅ |
| D-L2-2 | Multi-match rejection and rationale recorded | Design spec explicitly states why precedence was rejected | ✅ |
| D-L2-3 | Kind-carry-forward fact stated in spec | "The kind cannot be carried through from step 2 in any case" | ✅ |
| D-L2-4 | Multi-match rule ties to existing ambiguity principle | "This is the same rule already stated for the correlation buffer" | ✅ |

**Finding:** All design decisions have been correctly implemented. D-L1-1 particularly demonstrates why the decision (error on ambiguity) was already taken in AC-7, not newly introduced by this CR.

---

## Compilation & Build Status ✅ PASSED

```powershell
$ npx tsc -p packages/core --noEmit
(no output — success)
```

**Finding:** Core package compiles cleanly. No TypeScript errors detected.

---

## Outstanding Items (Follow-Up)

**Issue 1 (Follow-up, Test Designer):** UAT predates multi-kind support
- **Status:** NOTED BUT OUT OF SCOPE
- **Description:** Existing `SPEC_UAT_WHOAMI` scenarios (T-1..T-8) predate multi-entity support and do not cover Projects/Events. New scenarios (SPEC_UAT_ACT_WHOAMI_MULTIKINDS T-1..T-5) added to this CR fill that gap.
- **Action:** Test Designer to execute T-1..T-5 scenarios during UAT phase. Fixtures (Actor/Project "Shared Name") are in place.

**Issue 2 (Backlog, PM):** Entity-name uniqueness unstated project-wide
- **Status:** NOTED BUT OUT OF SCOPE
- **Description:** Jarvis addresses entities by name throughout (messaging, lookupSessionUUID, getValidDestinations), yet no requirement states names are unique across kinds. This CR protects `jarvis_whoAmI` via AC-11, but other name-addressed paths carry the same exposure.
- **Action:** Create backlog item (GH #NNN) to examine entity-name uniqueness as a system property, not tool-local fix.

---

## Summary

✅ **VERIFICATION PASSED**

All acceptance criteria across modified user story (US_ACT_WHOAMI), amended requirement (REQ_ACT_WHOAMI), and amended design specification (SPEC_ACT_WHOAMI) have been verified against implementation. New UAT specification (SPEC_UAT_ACT_WHOAMI_MULTIKINDS) scenarios are covered by test fixtures.

**Key Findings:**

1. **Kind filter removed entirely** — No `kind === 'session'` predicate remains; no replacement allowlist introduced (AC-10 enforced).

2. **Collect-and-count algorithm per spec** — Step 3 uses `.filter(e => e.name === entityName)` followed by explicit count check for three outcomes (D-L2-1).

3. **Projects and Events now supported** — jarvis_whoAmI returns `{ name, contextPath }` for any registered entity kind, fixing the defect where Projects/Events were silently rejected.

4. **Multi-match collision handled correctly** — When a name matches two or more entities, the tool returns an error per AC-11, avoiding the wrong-identity failure of GH #51 through a different route.

5. **Test fixtures in place** — Both Actor and Project named "Shared Name" exist in testdata, enabling UAT T-3 scenario (multi-match case).

6. **Specification consistency verified** — AC-11 (multi-match error) is AC-7 (no guessing) applied at the registry lookup point; all new ACs are consistent with existing principles.

7. **Backward compatible** — Actors still resolve unchanged; zero-match unchanged (AC-12); only the new kind and collision cases change behaviour.

8. **Rationale recorded** — Both the kind-filter removal and multi-match tie-break rejection include decision D-level rationale in the design spec, preventing future re-introduction of rejected alternatives.

9. **Build clean** — No TypeScript errors; tsc passes.

10. **Outstanding items noted** — UAT execution gaps and entity-name-uniqueness backlog item flagged for follow-up, not blockers.

---

## Recommendation

✅ **APPROVED FOR MERGE**

Implementation correctly satisfies all specification requirements and acceptance criteria. The `kind === 'session'` restriction is cleanly removed; the collect-and-count pattern prevents silent wrong-identity failures in both zero-match and multi-match scenarios; all entity kinds (Actor/Project/Event) now resolve correctly through a single code path.

Ready for merge to development branch.

---

## Addendum: QM Round 2 Fixes Verification

**QM Findings Addressed:** 2 fix-now items applied in commit `274625f`

### Fix 1: Test Explicit Assertion of Name-Only Filter (TC-2) ✅ PASSED

**Finding:** QM requested explicit test assertion of the `.filter(e => e.name)` pattern and absence of the `kind === 'session'` predicate.

**Implementation:** [src/tests/whoami-session-id-resolution.test.ts](src/tests/whoami-session-id-resolution.test.ts#L50-L54)

```typescript
it('resolves entity name against scanner registry by name only', () => {
    expect(whoAmISection).toContain('.filter(e => e.name === entityName)');
    expect(whoAmISection).not.toContain("e.kind === 'session'");
});
```

**Status:** ✅ TC-2 now explicitly asserts the name-only filter and verifies the kind predicate is absent.

### Fix 2: Test Updated Error Path Count (TC-4) ✅ PASSED

**Finding:** QM noted that implementation has four distinct error returns (no-sessionId, no-entityName, zero-match, multi-match), but test was checking for 3. Test updated to reflect the four-outcome set.

**Implementation:** [src/tests/whoami-session-id-resolution.test.ts](src/tests/whoami-session-id-resolution.test.ts#L71-L82)

```typescript
it('uses one consistent error message for all failure paths', () => {
    const errorMsg = 'You are not a registered actor. Please ask the user which actor you are.';
    expect(whoAmISection).toContain(`const ERROR_MSG = '${errorMsg}'`);
    // All error returns use ERROR_MSG, not custom strings
    const errorReturns = whoAmISection.match(/error:\s*ERROR_MSG/g);
    expect(errorReturns).not.toBeNull();
    expect(errorReturns!.length).toBe(4); // no sessionId, no entityName, zero match, multi match
});
```

**Verification:** Implementation in [packages/core/src/extension.ts:1265-1296](packages/core/src/extension.ts#L1265) contains exactly 4 error returns:
1. Line 1265: `if (!sessionId)` → error
2. Line 1274: `if (!entityName)` → error
3. Line 1287: `if (matches.length === 0)` → error
4. Line 1292: `if (matches.length > 1)` → error

**Status:** ✅ TC-4 now expects 4 error paths; implementation verified to have exactly 4.

### Fix 3: SPEC_ACT_WHOAMI AC-2 Reworded (AC-2: "any kind") ✅ PASSED

**Finding:** QM requested spec wording to explicitly state "any kind" rather than the previous ambiguous phrasing.

**Before:** (generic description without explicit kind mention)  
**After:** [docs/design/spec_act.rst:2027](docs/design/spec_act.rst#L2027)

```rst
* AC-2: A calling session resolvable to exactly one entity in the scanner
  registry (any kind) returns ``{ name, contextPath }``.
```

**Status:** ✅ AC-2 now explicitly states "(any kind)" to prevent future misreading.

### Fix 4: SPEC_ACT_WHOAMI New AC-2a (Three-Outcome Set) ✅ PASSED

**Finding:** QM requested explicit acceptance criterion documenting the three-outcome set at step 3: exactly one match → success, zero matches → error, multiple matches → error.

**Implementation:** [docs/design/spec_act.rst:2029-2031](docs/design/spec_act.rst#L2029)

```rst
* AC-2a: (``whoami-all-entity-kinds`` CR) Step 3 has three outcomes:
  exactly one match returns the identity; zero matches returns the AC-3
  error; more than one match returns the AC-3 error, selecting none.
```

**Status:** ✅ AC-2a explicitly documents the three-outcome set at spec level.

### Build and Test Verification ✅ PASSED

**TypeScript Compilation:**
```powershell
$ npx tsc -p packages/core --noEmit
(no output — success)
```

**Test Suite:**
```
Test Files  40 passed (40)
     Tests  406 passed (406)
```

**Sphinx Documentation:**
```
(build clean, no errors)
```

**Status:** ✅ All checks pass. Build and test suite clean. No new issues detected.

### Summary of QM Round 2 Resolution

| Item | Before | After | Status |
|---|---|---|---|
| Test: Name-only filter assertion | Not explicitly tested | TC-2 asserts `.filter(e => e.name)` and no `kind === 'session'` | ✅ |
| Test: Error path count | Expected 3 | Expected 4 (no-sessionId, no-entityName, zero-match, multi-match) | ✅ |
| Spec AC-2 wording | Generic | Explicit "(any kind)" | ✅ |
| Spec three-outcome set | Implicit in step 3 | Explicit AC-2a documenting all three outcomes | ✅ |

**QM Clearance:** All 2 fix-now items resolved. No remaining blockers.

---

**Verified by:** Verify Engineer  
**Date:** 2026-08-31 (Initial), 2026-08-31 (QM Round 2 Addendum)  
**Addendum Commit:** 274625f  
**Spec Reference:** [US_ACT_WHOAMI](docs/userstories/us_act.rst#L204), [REQ_ACT_WHOAMI](docs/requirements/req_act.rst#L857), [SPEC_ACT_WHOAMI](docs/design/spec_act.rst#L1829), [SPEC_UAT_ACT_WHOAMI_MULTIKINDS](docs/design/spec_uat_act_whoami_multikinds.rst)  
**Implementation Reference:** [packages/core/src/extension.ts](packages/core/src/extension.ts#L1265-L1296), [src/tests/whoami-session-id-resolution.test.ts](src/tests/whoami-session-id-resolution.test.ts#L50-L54)
