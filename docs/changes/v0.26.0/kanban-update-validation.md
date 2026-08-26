# Change Document: kanban-update-validation

**Status**: merged
**Branch**: feature/kanban-update-validation (stacked on feature/kanban-management-tools — depends on `validateItemValues`, not yet in `development`)
**Created**: 2026-08-26
**Author**: Project Manager
**Operation Mode**: autonomous

- **autonomous** — every actor decides on its own; when genuinely unsure, it asks the user directly (not routed through CM) and pauses only its own step until answered.

---

## Summary

`jarvis_updateKanbanItem` currently validates only the `status` key of `input.changes` (checked inline against the `status` field's declared options); every other key is written unconditionally with no validation, allowing invalid values on other `single_select` fields and silently accepting undeclared/typo'd keys (the "GH #57 trap"). This was flagged as open finding F-1 in `kanban-management-tools`, which introduced a shared validation helper, `validateItemValues(values, board)`, used by all of that CR's new write tools (`jarvis_addKanbanItem`, `jarvis_updateKanbanFields`) but not retrofitted onto the pre-existing `jarvis_updateKanbanItem` (frozen there by `REQ_KAN_UPDATE` AC-7 at the time). This change closes that gap: `jarvis_updateKanbanItem` calls the same shared `validateItemValues` helper instead of its narrower inline status-only check, so all four write tools share one write-validation contract.

---

## Level 0: User Stories

**Status**: ⏳ not started

### Impacted User Stories

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

Impact analysis run from `REQ_KAN_UPDATE` and `REQ_KAN_WRITEVALID`
(`--direction in --depth 1`). Raw output in Appendix.

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_KAN_TOOLS | Kanban Board Tools | not impacted | AC-6 already says the update tool applies changes without hand-editing; how strictly it validates is a Level 1 concern |
| US_KAN_QUERY | Query a Board Without Reading All of It | not impacted | Read path; untouched |

### New User Stories

None.

### Decisions

- D-L0-1: No new User Story. The user-facing capability is unchanged — an actor could already update an item. What changes is which inputs are refused, which is a correctness property of an existing capability, not a new one.
- D-L0-2: The user-visible behaviour change is nevertheless real and is recorded at Level 1 (`REQ_KAN_UPDATE` AC-9): calls that previously returned `updated: true` now return an error. "No new story" must not be read as "no observable change".

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories — no story asserts that invalid values are accepted.
- [x] No redundancies — nothing added at this level.
- [x] Gaps identified and addressed — the behaviour delta is carried at Level 1 rather than left implicit at Level 0.

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_KAN_UPDATE | US_KAN_TOOLS | modified | AC-7 superseded; new AC-8 (full validation), AC-9 (`id` rejected), AC-10 (validate before mutate) |
| REQ_KAN_WRITEVALID | US_KAN_TOOLS | modified | "Applicable tools" list added incl. `jarvis_updateKanbanItem`; AC-4 sharpened; new AC-6 (one shared helper, not per-tool copies) |
| REQ_KAN_ADD / REQ_KAN_FIELDS | US_KAN_TOOLS | not impacted | Already conform to the contract |
| REQ_KAN_DELETE | US_KAN_TOOLS | not impacted | Writes no item values — explicitly out of the contract's scope |
| REQ_KAN_VERIFY | US_KAN_TOOLS | not impacted | Read-side rules unchanged; this CR moves the write side onto them |
| REQ_UAT_KANBAN | US_UAT_KANBAN | **needs follow-up** | Existing UAT scenarios for the update tool predate this change — see Issues Found |
| REQ_UAT_KAN_MGMT | US_UAT_KAN_MGMT | not impacted | Covers the four new tools, unchanged |

### New Requirements

None — this CR resolves a contradiction between two existing requirements
rather than adding capability.

### Conflicts Detected

- ⚠️ **`REQ_KAN_WRITEVALID` description vs. `REQ_KAN_UPDATE` AC-7.** The contract said "every tool that writes item values"; AC-7 froze `jarvis_updateKanbanItem` at status-only. Both were approved, so the spec asserted two incompatible things about the same tool. This was created knowingly in `kanban-management-tools` and disclosed there as F-1.
  - Resolution: AC-7 superseded by AC-8/AC-9/AC-10; `REQ_KAN_WRITEVALID` gains an explicit "Applicable tools" enumeration so the scope is stated rather than inferred from prose.

### Decisions

- D-L1-1: AC-7 is **superseded in place** — the text is kept, marked superseded, and points at what replaces it. Deleting it would strand the `kanban-yaml-comment-preservation` CR's reasoning about what it froze and why, and a future reader finding AC-8 alone would not know a deliberate freeze had ever existed.
- D-L1-2: AC-7's non-validation content is explicitly preserved (lookup by `id`, immutable `id`, the four error paths). AC-7 froze several behaviours at once; superseding only the validation part requires saying which parts survive, or the supersession reads as licence to change all of them.
- D-L1-3: `id` in `changes` becomes an **error** (AC-9), not a continued silent skip. `REQ_KAN_WRITEVALID` AC-4 already required this on every write path, so the existing spec decides it; the tool was simply the exception. Silently dropping a caller's stated intent returns `updated: true` for something that did not happen — the same false-success pattern documented in `agent-mode-reset-race`.
- D-L1-4: `REQ_KAN_WRITEVALID` gains AC-6 requiring the *one shared helper*, not merely equivalent behaviour. Two conforming implementations both pass every other AC and are free to diverge afterwards without any test failing — which is precisely how the original divergence arose.
- D-L1-5: `jarvis_deleteKanbanItem` is named as out of scope in the applicable-tools list rather than omitted. An unexplained absence invites someone to "fix" it later.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements — the one that existed is the subject of this CR and is now resolved.
- [x] No redundancies — validation rules remain stated once in `REQ_KAN_WRITEVALID`; `REQ_KAN_UPDATE` references them rather than restating them.
- [x] No new REQs, so the link-to-US check is vacuous; both amended REQs retain their existing parents.

- [ ] No contradictions with existing Requirements
- [ ] No redundancies
- [ ] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_KAN_UPDATE | REQ_KAN_UPDATE, REQ_KAN_WRITEVALID | modified | Algorithm steps 4–5 rewritten; board-projection cast widened; AC-8..AC-12; guarding-test section added |
| SPEC_KAN_WRITEVALID | REQ_KAN_WRITEVALID | modified | F-1 rationale marked resolved; Callers section added; `id`-guard reachability note; AC-1 extended |
| SPEC_KAN_ADD | REQ_KAN_ADD | not impacted | Its call site is the pattern being mirrored, unchanged |
| SPEC_KAN_VERIFY | REQ_KAN_VERIFY | not impacted | Read side unchanged |
| SPEC_UAT_KANBAN | REQ_UAT_KANBAN | **needs follow-up** | See Issues Found |

### New Design Elements

None.

### Conflicts Detected

None remaining after the Level 1 resolution.

### Decisions

- D-L2-1: `changes` is passed to `validateItemValues` **unmodified**. It is already the flat `Record<string, unknown>` the helper expects, unlike `addKanbanItem` which must compose `values` from its `fields` map plus top-level parameters. Reshaping it would add a translation step whose only job would be to preserve the shape it already has.
- D-L2-2: The per-key `if (key === 'id') continue;` filter is **removed** from the mutation loop rather than kept as belt-and-braces. With AC-9 in force `id` never reaches the loop, so the filter would be unreachable code asserting a rule that is now enforced elsewhere — and the next reader would have to determine which of the two is authoritative.
- D-L2-3: **The board projection cast must be widened to include `fields[].type`.** This is the one change in the CR that can fail silently: `validateItemValues` branches on `type`, and if the projection omits it, every `fieldEntry.type === 'single_select'` comparison is false at runtime, so option checking is skipped on exactly the fields this CR exists to check. TypeScript will reject the call, and the tempting fix — `as any` — makes the whole CR a no-op that still passes its own happy-path tests. Called out in `SPEC_KAN_UPDATE` for this reason.
- D-L2-4: Validation moves **ahead of** mutation. Previously the `status` check sat after item lookup while the `id` skip was interleaved with the writes; the helper is pure, so hoisting it guarantees a rejected update leaves the file byte-identical (AC-11) instead of half-applied.
- D-L2-5: The `id` guard inside `validateItemValues` is documented as gaining its first *reachable* caller here. QM recorded it as dead code on the add path (Round 3, non-blocking); that observation stays true for `addKanbanItem`, but the guard is live from this CR onward and is the mechanism enforcing `REQ_KAN_UPDATE` AC-9.

### Design-Time Finding — the guarding test no longer guards

`src/tests/kanban-comment-preservation.test.ts` TC-1 asserts source-level
properties of `jarvis_updateKanbanItem` by slicing `extension.ts` between
`'jarvis_updateKanbanItem'` and the next `// Tool: jarvis_openKanbanBoard`
marker. Verified against the current file:

| Marker | Line |
|---|---|
| `// Tool: jarvis_updateKanbanItem` | 596 |
| `// Tool: jarvis_addKanbanItem` | 689 |
| `// Tool: jarvis_deleteKanbanItem` | 796 |
| `// Tool: jarvis_listKanbanItems` | 847 |
| `// Tool: jarvis_updateKanbanFields` | 915 |
| `// Tool: jarvis_openKanbanBoard` | **1065** |

`kanban-management-tools` inserted four tools between `updateKanbanItem` and
`openKanbanBoard`, so the slice grew from one tool body to five. Every TC-1
assertion is now satisfiable by code belonging to a different tool — the test
passes while no longer testing what its name claims. It was green through that
CR's verification, so greenness is not evidence here.

Two fixes belong in this CR because both concern code it is changing:

1. End marker → `// Tool: jarvis_addKanbanItem`, restoring a single-tool slice.
2. TC-1's `skips id field (immutable guard)` case asserts
   `/if\s*\(key\s*===\s*'id'\)/` — the exact line D-L2-2 removes. Rewritten to
   assert delegation to `validateItemValues`, which is what enforces
   immutability now.

Making the slice robust against future insertion (rather than correct for
today's file order) is **not** attempted here — see Issues Found.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs — `SPEC_KAN_ADD`'s call site and `SPEC_KAN_UPDATE`'s new one both route through the single helper; neither redefines the rules.
- [x] No new SPECs, so the link-to-REQ check is vacuous; `SPEC_KAN_UPDATE` gains `REQ_KAN_WRITEVALID` in its `:links:` so the new obligation is traceable.

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

No new elements, so nothing can be orphaned. Both amended requirements retain
their parents and children; `SPEC_KAN_UPDATE` gained `REQ_KAN_WRITEVALID` in its
`:links:` so its new obligation is reachable from the contract, and
`SPEC_KAN_WRITEVALID` gained `SPEC_KAN_UPDATE` so its caller set is traceable.

| Requirement | Design | Verified |
|---|---|---|
| REQ_KAN_UPDATE (AC-8..AC-10) | SPEC_KAN_UPDATE (AC-8..AC-12) | ✅ |
| REQ_KAN_WRITEVALID (AC-4, AC-6) | SPEC_KAN_WRITEVALID (AC-1), SPEC_KAN_UPDATE step 4 | ✅ |

### Behaviour-Change Register

Two calls that succeed today will return errors after this CR. Both are
intended; both need to reach Test Designer rather than surface as regressions.

| Call | Before | After | Requirement |
|---|---|---|---|
| `changes` with a bad value on a non-`status` `single_select` field | written, `updated: true` | `{ error: ... }`, file untouched | REQ_KAN_UPDATE AC-8 |
| `changes` with an undeclared key | written, never rendered | `{ error: ... }`, file untouched | REQ_KAN_UPDATE AC-8 |
| `changes` containing `id` | silently dropped, `updated: true` | `{ error: ... }`, file untouched | REQ_KAN_UPDATE AC-9 |

### Artefakt-Removal-Check

No artefact is removed. `REQ_KAN_UPDATE` AC-7 is **superseded in place**, not
deleted — its ID remains resolvable, so references from
`kanban-yaml-comment-preservation` and its verification report do not strand.
The `if (key === 'id')` line is implementation detail, not an artefact; its only
external reference is the TC-1 assertion, which this CR updates.

### Issues Found

1. **`REQ_UAT_KANBAN` / `SPEC_UAT_KANBAN` predate this change (follow-up).** The
   existing kanban UAT scenarios cover the update tool under the old status-only
   contract. The three rows in the Behaviour-Change Register need scenarios, and
   any existing scenario asserting that a non-`status` value is written now
   asserts the wrong thing. Not fixed here: UAT authorship belongs to Test
   Designer, and this CR should not write its scenarios for it. Flagged to CM
   for routing.
2. **The TC-1 slice is fragile by construction (follow-up).** Fixing the end
   marker restores correctness for today's file order but the next tool inserted
   before `addKanbanItem` silently widens it again. A robust form — matching the
   handler by its `registerTool(` block rather than by neighbouring comments —
   is a test-infrastructure change beyond this CR's scope. Recorded so the
   recurrence is expected rather than rediscovered.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## UAT

**UAT Spec**: [SPEC_UAT_KAN_UPDATE_VALID](../design/spec_uat_kanban_update_valid.rst);
amended [SPEC_UAT_KANBAN](../design/spec_uat_kanban.rst) T-22  
**Test Protocol**: [tst-kanban-update-validation.md](tst-kanban-update-validation.md)  
**Execution date**: 2026-08-26  
**Executed by**: Test Designer (static code analysis, commit `2114160`)

**Staleness review**: No stale pre-existing scenarios. All prior
`updateKanbanItem` invocations in `SPEC_UAT_KANBAN` used status-only or
already-amended payloads.

| # | Spec | Scenario | Result |
|---|------|----------|--------|
| T-22 (amended) | SPEC_UAT_KANBAN | id in changes → error, file unchanged | ✅ PASS |
| T-1 | SPEC_UAT_KAN_UPDATE_VALID | BC-1: invalid non-status single_select → error | ✅ PASS |
| T-2 | SPEC_UAT_KAN_UPDATE_VALID | BC-2: undeclared key → error, file unchanged | ✅ PASS |
| T-3 | SPEC_UAT_KAN_UPDATE_VALID | Valid non-status field value passes new path | ✅ PASS |
| T-4 | SPEC_UAT_KAN_UPDATE_VALID | Status-only change backward compat | ✅ PASS |

**All 5 scenarios PASS.** Full evidence in `tst-kanban-update-validation.md`.

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.*

### Round 1 — MECE Consistency Check

**Reviewed by:** MECE Engineer
**Review date:** 2026-08-26

#### Analysis

**Mutual Exclusivity verification:**

This CR amends two existing requirements rather than adding new elements, so the MECE check focuses on whether the amendments create contradictions or leave the two amended elements distinct from each other.

- `REQ_KAN_UPDATE` AC-8..AC-10 (what the update tool validates) vs. `REQ_KAN_WRITEVALID` AC-1..AC-6 (validation rules applicable to all write tools) are **orthogonal**: one is a tool's acceptance criteria, the other is the underlying validation contract. REQ_KAN_UPDATE AC-8 *references* REQ_KAN_WRITEVALID's rules rather than restating them; no contradiction. ✅
- The three BC (behaviour-change) items are mutually exclusive failure modes:
  - BC-1 (bad non-status single_select value)
  - BC-2 (undeclared field key)
  - BC-3 (id in changes)
  Each is caught by a different branch in validateItemValues; no overlap. ✅

**Collective Exhaustiveness verification:**

All three behaviour changes are covered by UAT:
- BC-1 (invalid non-status single_select): ✅ T-1
- BC-2 (undeclared key): ✅ T-2
- BC-3 (id in changes): ✅ T-22 (amended)

All three error paths from the Behaviour-Change Register are covered. ✅

Backward compatibility verified:
- T-3: Valid non-status field values pass (new path works)
- T-4: Status-only changes backward compatible (existing callers unaffected)

**Traceability verification:**

No new elements, so no new orphan risk. Both amended requirements retain their existing parents:
- `REQ_KAN_UPDATE` still linked from `US_KAN_TOOLS` ✅
- `REQ_KAN_WRITEVALID` still linked from `US_KAN_TOOLS` ✅

Forward traceability added:
- `SPEC_KAN_UPDATE` gained `REQ_KAN_WRITEVALID` in `:links:` (now traces the new obligation) ✅
- `SPEC_KAN_WRITEVALID` gained `SPEC_KAN_UPDATE` in Callers section ✅
- UAT elements (`REQ_UAT_KAN_UPDATE_VALID`, `SPEC_UAT_KAN_UPDATE_VALID`) link to the amended requirement ✅

**Contradiction check:**

- The one contradiction that existed (F-1 in kanban-management-tools): `REQ_KAN_WRITEVALID` description said "every tool that writes item values"; `REQ_KAN_UPDATE` AC-7 froze `jarvis_updateKanbanItem` at status-only. Both were approved, creating a spec contradiction.
  - Resolution: AC-7 superseded in place by AC-8/AC-9/AC-10; `REQ_KAN_WRITEVALID` gains explicit "Applicable tools" enumeration (REQ_KAN_ADD, REQ_KAN_UPDATE, REQ_KAN_FIELDS — not REQ_KAN_DELETE). Contradiction resolved. ✅

- No new contradictions introduced. ✅
- In-place amendment (D-L1-1) preserves the reference from `kanban-yaml-comment-preservation` CR, avoiding a dangling reference that would confuse future readers. ✅

**Orthogonality with existing specs:**

- vs. `REQ_KAN_ADD` / `SPEC_KAN_ADD`: These call validateItemValues unchanged; this CR adds a new caller, not an alteration. ✅
- vs. `REQ_KAN_FIELDS`: Read-only call of validateItemValues for both remove operations' reference guards; this CR adds validation-before-write to UPDATE, orthogonal. ✅
- vs. `REQ_KAN_VERIFY`: Read-side rules unchanged; this CR moves WRITE side onto them. ✅
- vs. `REQ_KAN_SCHEMA` / `SPEC_KAN_SCHEMA`: No schema shape change; validation of values written according to existing schema. ✅

**Implementation coverage verification:**

All three behaviour changes implemented:
- BC-1 (invalid non-status single_select): validateItemValues called before mutation (step 4) ✅
- BC-2 (undeclared key): validateItemValues checks membership (AC-3) ✅
- BC-3 (id in changes): validateItemValues AC-4 rejects it; error path removes silent skip (line 629 removed) ✅

Field projection widened to include `type` (D-L2-3) — validateItemValues branches on type; omitting it would skip option checking silently. ✅

Validation moved before mutation (D-L2-4) — file left byte-identical on error (AC-11). ✅

Test landmark adjusted (D-L2-2) — TC-1 marker moved from openKanbanBoard to addKanbanItem, restoring single-tool slice. Assertion rewritten to check validateItemValues delegation instead of immutable `id` guard (which this CR relocates). ✅

**UAT coverage verification:**

All 5 scenarios pass (static analysis per CD):
- T-22 (amended, SPEC_UAT_KANBAN): id in changes → error ✅
- T-1 (new, SPEC_UAT_KAN_UPDATE_VALID): invalid non-status single_select → error ✅
- T-2 (new, SPEC_UAT_KAN_UPDATE_VALID): undeclared key → error ✅
- T-3 (new, SPEC_UAT_KAN_UPDATE_VALID): valid non-status value passes ✅
- T-4 (new, SPEC_UAT_KAN_UPDATE_VALID): status-only backward compatible ✅

Both new and amended UAT elements linked correctly. ✅

**Issues Found Assessment:**

1. Pre-existing UAT scenarios may assert old contract (Issue 1 in CD): This is a follow-up for Test Designer, not a MECE issue — the new scenarios correctly cover the new contract.

2. TC-1 slice fragility (Issue 2 in CD): Test infrastructure concern, not a MECE issue. The fix in this CR is correct for today's layout.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | No MECE issues detected. The single contradiction (F-1) is resolved by amending AC-7 in place and adding explicit tool enumeration to REQ_KAN_WRITEVALID. Both amended requirements remain properly traceable. All three behaviour changes (BC-1/BC-2/BC-3) have UAT coverage. 5/5 UAT PASS. | — |

---

### Round 2 — QM Independent Review

**Reviewed by:** Quality Manager
**Review date:** 2026-08-26

#### Analysis

Independently re-verified traceability (`REQ_KAN_UPDATE`/`REQ_KAN_WRITEVALID`
→ `SPEC_KAN_UPDATE`/`SPEC_KAN_WRITEVALID`, both read in full) and diffed
`packages/kanban/src/extension.ts` and
`src/tests/kanban-comment-preservation.test.ts` directly against
`feature/kanban-management-tools` (not just the CD's own algorithm prose,
consistent with the merge-order lesson from that CR's Round 2).

**Fix confirmed correct and complete.** The inline `status`-only check and
the `if (key === 'id') continue` skip are both removed; the tool now calls
`validateItemValues(input.changes, data)` once, before the mutation loop,
exactly per `SPEC_KAN_UPDATE` step 4/AC-12. Because `input.changes` is passed
through unmodified and is the *same* object both validated and applied (the
mutation loop iterates `Object.entries(input.changes)` directly, no
intermediate re-composition), the merge-order class of bug found in
`jarvis_addKanbanItem` (Round 2/Round 3 of `kanban-management-tools`) is
architecturally not possible here — there is only one object, not two built
in different orders. This matches D-L2-1's stated reasoning and I verified it
holds in the actual diff, not just the design rationale.

The board projection cast was correctly widened to include `fields[].type`
(confirmed at the point of use) — the exact failure mode D-L2-3 warns
against (`as any` or an omitted `type` silently disabling `single_select`
checks) is not present; the cast matches `BoardFields` exactly.

The guarding-test fix (`kanban-comment-preservation.test.ts`) is correct and
independently verified: `// Tool: jarvis_addKanbanItem` markers now appear at
line 683 in the current file (immediately after `jarvis_updateKanbanItem`
starting at line 596), so TC-1's slice again isolates a single tool body,
closing the five-tool-wide window this CR's own Design-Time Finding
identified. The rewritten assertion checks for
`validateItemValues(input.changes` instead of the removed `id`-skip regex —
correctly reflects what now enforces immutability.

UAT re-verified line-by-line: T-1..T-4 and amended T-22's cited code evidence
(`extension.ts` L650-656/L164-166/L189-194/L197-202) matches the real file
(confirmed `validateItemValues(input.changes, data)` at L651, one line off
the cited range, immaterial). The staleness review's claim — that no
pre-existing `SPEC_UAT_KANBAN` scenario asserts a non-`status` value being
accepted — was spot-checked and holds.

`compile all` (core + kanban) clean; `vitest run` 406/406 (same count as
before this CR — the guarding-test fix altered an existing assertion, added
none).

**One Low, non-blocking, out-of-scope observation:** `jarvis_updateKanbanItem`'s
`inputSchema` (`package.json`, unmodified by this CR) types every value under
`changes` as `additionalProperties: { type: "string" }` — including `labels`,
which the data model requires to be an array. This means a schema-conformant
caller can never supply a valid array for `labels` through this tool at all
(pre-existing, not introduced or worsened by this CR — before this CR,
`labels` was equally unchecked and equally string-constrained by the same
schema). `validateItemValues` treats `labels` as a permitted builtin without
type-checking it (per `SPEC_KAN_WRITEVALID` rule 2, which does not require
this), so a string value would still be written unchecked if it ever reached
the tool. Not this CR's scope to fix (`package.json` is untouched here), but
worth a follow-up: either loosen `changes.labels`' schema type to allow
arrays, or accept that `labels` cannot be updated via this tool.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | Requirements/Schema | `packages/kanban/package.json` L162 (`jarvis_updateKanbanItem` `inputSchema.changes`) | (Informational — Low, non-blocking, out of scope for this CR) `changes` is schema-typed as string-only for every key, so `labels` (which requires an array) can never be validly supplied through this tool; pre-existing, not introduced here. | Low |

**Verdict: QM CLEAR.** Fix is correct, complete, and independently verified
against the actual diff — not merely the CD's or CM's description of it. The
merge-order defect class from the sibling `kanban-management-tools` CR does
not recur here by construction. One Low, out-of-scope, non-blocking
observation logged for optional future follow-up; does not block merge.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | defer | Pre-existing, out of this CR's scope (`package.json` untouched here). Logged as PM backlog item 17 (loosen `changes.labels` schema to accept an array, or explicitly document that `labels` can't be updated via this tool). Does not block merge. |

---

## Appendix: Link Discovery Results

```
# REQ_KAN_UPDATE --direction in --depth 1
linked_from: SPEC_UAT_KANBAN, REQ_UAT_KANBAN, SPEC_KAN_UPDATE

# REQ_KAN_WRITEVALID --direction in --depth 1
linked_from: SPEC_KAN_WRITEVALID, REQ_KAN_ADD, REQ_UAT_KAN_MGMT
```

The two UAT elements returned by the first query are what surfaced Issue 1 —
`REQ_UAT_KANBAN` and `SPEC_UAT_KANBAN` are downstream of the requirement whose
acceptance criteria this CR changes.

---

*Generated by syspilot Change Agent*
