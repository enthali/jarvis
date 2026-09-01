# Change Document: whoami-all-entity-kinds

**Status**: in-progress
**Branch**: feature/whoami-all-entity-kinds
**Created**: 2026-08-31
**Author**: Project Manager
**Operation Mode**: autonomous

- **autonomous** — every actor decides on its own; when genuinely unsure, it asks the user directly (not routed through CM) and pauses only its own step until answered.

---

## Summary

`jarvis_whoAmI` resolves the calling chat session to the correct entity name,
but then rejects Projects and Events through the hard-coded predicate
`e.kind === 'session'`. Resolve the name against the scanner's complete entity
registry instead; that registry is already the authoritative boundary for all
Jarvis entity kinds, so a replacement hard-coded allowlist is neither needed
nor desired. Preserve the existing unknown-session error and add regression
coverage for Actor, Project, and Event identities. Backlog item 20; no GitHub
Issue.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

Impact analysis run from `US_ACT_WHOAMI` and `REQ_ACT_WHOAMI`
(`--direction in --depth 1`). Raw output in Appendix.

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_ACT_WHOAMI | Actor Identity Recovery Tool | modified | Persona and AC-1 broadened beyond kind-Actor; new AC-6 for the multi-match case |
| US_UAT_WHOAMI | whoAmI acceptance tests | not impacted at US level | Regression coverage lands at Level 1/2 |
| US_KAN_TOOLS | Kanban Board Tools | not impacted | Consumes owner resolution, which is unchanged |

### New User Stories

None — this corrects the reach of an existing story rather than adding
capability.

### Decisions

- D-L0-1: The story's wording is amended, not just the code. `US_ACT_WHOAMI` AC-1 said "a registered **Actor**", meaning any Jarvis entity but read by the implementer as the narrow kind `'session'`. That ambiguity is the defect's origin; fixing only the predicate would leave the sentence that produced it in place, available to produce it again.
- D-L0-2: New AC-6 states the multi-match case in user terms. It is a consequence of the existing AC-5 ("rather than return a guess"), but the whole subject of this CR is an implicit rule that got implemented wrong once — so the consequence is written down rather than left to be re-derived.
- D-L0-3: The persona line now names the three kinds explicitly. "As a Jarvis Actor" is true in the project's broad sense — Projects and Events are actor variants — but that broad sense is exactly what was misread.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories — AC-6 restates AC-5's principle for a specific input; it does not weaken it.
- [x] No redundancies — no other story covers identity recovery.
- [x] Gaps identified and addressed — the cross-kind collision case, absent from the CR brief, is now covered at every level.

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_ACT_WHOAMI | US_ACT_WHOAMI | modified | AC-2 rewritten (kind restriction removed); new AC-10 (registry is sole authority), AC-11 (multi-match → error), AC-12 (zero-match unchanged) |
| REQ_UAT_WHOAMI | US_UAT_WHOAMI | **needs follow-up** | Existing scenarios predate multi-kind support — see Issues Found |
| REQ_ACT_LISTTOOL | US_ACT_ACTORS | not impacted | Separate tool, separate predicate |
| REQ_HOOK_INTAKE | US_HOOK_OBSERVE | not impacted | The session-id path is untouched |
| REQ_KAN_CREATE / VERIFY / OPEN / UPDATE / ADD / DELETE / LIST / FIELDS | US_KAN_TOOLS | not impacted | They reference `REQ_ACT_WHOAMI` for owner auto-resolution; that contract is unchanged, and they gain Project/Event support for free |

### New Requirements

None.

### Conflicts Detected

None. The apparent question — how to break a cross-kind name tie — is already
answered by the existing approved `REQ_ACT_WHOAMI` AC-7, which forbids
returning an identity that cannot be attributed unambiguously. AC-11 makes that
consequence explicit at the registry lookup rather than introducing a new rule.

### Decisions

- D-L1-1: **The tie-break question was not a design decision to take.** It looked like one — name-only match, kind precedence, or error — until `REQ_ACT_WHOAMI` AC-7 turned out to govern it: *"or cannot be determined unambiguously … rather than a best-guess Actor"*. Both "first wins" and "prefer `session`" are best-guesses and would have violated an approved AC. Recorded because the reasoning is not visible from AC-11 alone.
- D-L1-2: AC-10 forbids a *replacement* allowlist, not just the removed predicate. The CR brief already said one was "neither needed nor desired"; stating it as an acceptance criterion makes it checkable, and means a future entity kind needs no change to this tool.
- D-L1-3: AC-12 states the zero-match behaviour explicitly even though it is unchanged. Step 3 grows from one outcome to three; leaving the unchanged one unstated invites an implementer to treat "not found" as newly interesting.
- D-L1-4: Entity-name uniqueness across kinds is asserted nowhere in the requirements — checked by grep. AC-11 therefore describes a reachable case, not a theoretical one, and says so.
- D-L1-5: The error text is unchanged, including the word "actor" for a Project or Event session. Slightly imprecise, but the CR scope is preservation of existing error behaviour, and all failure paths deliberately converge on one string (`SPEC_ACT_WHOAMI`). Noted, not fixed.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements — AC-11 is AC-7 applied to a second ambiguity point; AC-10 is consistent with the engine's kind-registration model.
- [x] No redundancies — no new requirement; the four ACs sit on the one requirement that owns this tool.
- [x] No new REQs, so the link-to-US check is vacuous; `REQ_ACT_WHOAMI` keeps its parents.

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_ACT_WHOAMI | REQ_ACT_WHOAMI | modified | Algorithm step 3 rewritten to a three-outcome registry lookup; two rationale sections added |
| SPEC_UAT_WHOAMI | REQ_UAT_WHOAMI | **needs follow-up** | See Issues Found |
| SPEC_ACT_TOOLS / SPEC_HOOK_ROUTE / SPEC_HOOK_INTAKE | — | not impacted | Registration gating and the session-id path are untouched |

### New Design Elements

None.

### Conflicts Detected

None.

### Decisions

- D-L2-1: Step 3 is specified as **collect-and-count**, not `find`. `find()` returning the first match is precisely the mechanism that would produce a silent wrong identity; naming the shape in the spec removes the tempting one-character fix (deleting the `kind` clause and leaving `find`).
- D-L2-2: The spec states the rejected alternative (kind precedence) and why. Preferring `session` would keep today's answer for a colliding pair and looks like the conservative choice — so it needs a recorded reason, or the next reader will "restore" it.
- D-L2-3: The kind-cannot-be-carried-forward fact is written into the spec. It is the reason name-only matching is correct rather than lazy, and it is not visible from the algorithm — `getEntityNameForSessionId()` returns a bare string.
- D-L2-4: The multi-match rationale explicitly ties back to the buffer's existing "Ambiguity is an error, not a tie-break" rule. Same principle, second location; presenting them as one rule rather than two coincidences makes the tool's contract learnable.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs — the correlation-buffer rules are untouched; step 3 now follows the same ambiguity principle they already state.
- [x] No new SPECs, so the link-to-REQ check is vacuous; `SPEC_ACT_WHOAMI` retains its links.

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

No new elements, so nothing can be orphaned.

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ACT_WHOAMI (AC-1, AC-6) | REQ_ACT_WHOAMI (AC-2, AC-10, AC-11, AC-12) | SPEC_ACT_WHOAMI (step 3) | ✅ |

### Behaviour-Change Register

| Case | Before | After |
|---|---|---|
| Session bound to a **Project** or **Event** | AC-3 error | `{ name, contextPath }` |
| Session bound to an **Actor** | `{ name, contextPath }` | unchanged |
| Name matches **no** entity | AC-3 error | unchanged (AC-12) |
| Name matches **two or more** entities | returned the `session`-kind one | AC-3 error (AC-11) |

The last row is the only case where a previously-successful call now fails. It
is intended: the previous success was a coincidence of the filter, not an
attributable identity, and `REQ_ACT_WHOAMI` AC-7 requires the error.

### Artefakt-Removal-Check

Not applicable — no artefact is removed. The `kind === 'session'` clause is a
predicate inside one expression, not a named artefact; no ID, file, or
configuration key disappears. `REQ_ACT_WHOAMI` AC-2 is amended in place and
keeps its identifier.

### Issues Found

1. **whoAmI UAT predates multi-kind support (follow-up, Test Designer).** Impact
   analysis surfaced `REQ_UAT_WHOAMI` and `SPEC_UAT_WHOAMI` downstream of the
   amended requirement. All four rows of the Behaviour-Change Register need
   scenarios — in particular the multi-match row, which cannot be reached by the
   existing single-kind fixtures and needs a Project and an Actor deliberately
   sharing a name. Not written here: UAT authorship belongs to Test Designer.
2. **Entity-name uniqueness is unstated project-wide (observation, PM).** Jarvis
   addresses entities by name — messaging destinations, `lookupSessionUUID`,
   `getValidDestinations` (which unions names into a `Set`) — yet no requirement
   says names are unique across kinds. AC-11 makes `jarvis_whoAmI` safe under
   collision, but every other name-addressed path carries the same exposure and
   was not examined here. Worth a backlog item; out of scope for a one-predicate
   fix.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## UAT

**UAT Spec**: [SPEC_UAT_ACT_WHOAMI_MULTIKINDS](../design/spec_uat_act_whoami_multikinds.rst);
amended [SPEC_UAT_WHOAMI](../design/spec_uat_whoami.rst) T-3  
**Test Protocol**: [tst-whoami-all-entity-kinds.md](tst-whoami-all-entity-kinds.md)  
**Execution date**: 2026-08-31  
**Executed by**: Test Designer (static code analysis, commit `6134617`)

| # | Spec | Scenario | Result |
|---|------|----------|--------|
| T-3 (amended) | SPEC_UAT_WHOAMI | Zero-match → unchanged error (AC-12 regression) | ✅ PASS |
| T-1 | SPEC_UAT_ACT_WHOAMI_MULTIKINDS | Project session resolved | ✅ PASS |
| T-2 | SPEC_UAT_ACT_WHOAMI_MULTIKINDS | Event session resolved | ✅ PASS |
| T-3 | SPEC_UAT_ACT_WHOAMI_MULTIKINDS | Multi-match → error (fixtures verified) | ✅ PASS |
| T-4 | SPEC_UAT_ACT_WHOAMI_MULTIKINDS | Actor regression: Change Manager unchanged | ✅ PASS |
| T-5 | SPEC_UAT_ACT_WHOAMI_MULTIKINDS | Kanban: Project owner resolved via whoAmI | ✅ PASS |

**All 6 scenarios PASS.** Full evidence in `tst-whoami-all-entity-kinds.md`.

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1 — MECE Consistency Check

**Reviewed by:** MECE Engineer
**Review date:** 2026-08-31

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| None | — | — | No MECE issues detected; specification is internally consistent | — |

#### Detailed Verification

**Mutual Exclusivity** ✅

- `US_ACT_WHOAMI` AC-1 (broadened to all kinds) and AC-6 (multi-match error) are complementary, not redundant
- `REQ_ACT_WHOAMI` AC-2 (rewritten to remove kind restriction) and AC-10 (registry is sole authority) compose without overlap
- AC-11 (multi-match error) and AC-7 (ambiguity is error) are the same principle applied at two stages — not contradictory
- Three outcomes in SPEC step 3 (one match, zero match, multi-match) are mutually exclusive and exhaustive
- No overlap between original ACs and new ACs on the same requirement

**Collective Exhaustiveness** ✅

- **L0 (US):** All 6 ACs covered
  - AC-1 (recovery from any kind) → REQ_ACT_WHOAMI AC-2, AC-10
  - AC-2 (unregistered error) → REQ_ACT_WHOAMI AC-3
  - AC-3 (no parameters) → REQ_ACT_WHOAMI AC-1
  - AC-4 (identity stable across focus changes) → REQ_ACT_WHOAMI AC-6
  - AC-5 (error rather than guess on ambiguity) → REQ_ACT_WHOAMI AC-7
  - AC-6 (multi-match → error) → REQ_ACT_WHOAMI AC-11

- **L1 (REQ):** All 12 ACs covered (9 pre-existing + 3 new)
  - AC-2 (rewritten): removed kind restriction, applies to all registry entities ✓
  - AC-10 (new): registry sole authority, no hard-coded allowlist ✓
  - AC-11 (new): multi-match → error, consistent with AC-7 ✓
  - AC-12 (new): zero-match unchanged ✓

- **L2 (SPEC):** Algorithm step 3 has three outcomes
  - Step 3a: exactly one match → continue to step 4 ✓
  - Step 3b: no match → error (unchanged per AC-12) ✓
  - Step 3c: more than one match → error per AC-11 ✓

- **UAT:** 6/6 scenarios cover all paths and regressions
  - Amended T-3 (SPEC_UAT_WHOAMI): zero-match regression ✓
  - T-1 (SPEC_UAT_ACT_WHOAMI_MULTIKINDS): Project resolution ✓
  - T-2 (SPEC_UAT_ACT_WHOAMI_MULTIKINDS): Event resolution ✓
  - T-3 (SPEC_UAT_ACT_WHOAMI_MULTIKINDS): multi-match error (AC-11 new path) ✓
  - T-4 (SPEC_UAT_ACT_WHOAMI_MULTIKINDS): Actor regression (single-kind unchanged) ✓
  - T-5 (SPEC_UAT_ACT_WHOAMI_MULTIKINDS): kanban owner resolution via whoAmI ✓

**Traceability** ✅

- **No new elements** — amendment-only CR, so no orphaned elements
- **US → REQ:** `US_ACT_WHOAMI` → `REQ_ACT_WHOAMI` (keeps parent link); links to `US_ACT_ACTORS` unchanged ✓
- **REQ → SPEC:** `REQ_ACT_WHOAMI` → `SPEC_ACT_WHOAMI` (keeps link); algorithm step 3 implements AC-2, AC-10, AC-11, AC-12 ✓
- **REQ → REQ (consumers):** Eight `REQ_KAN_*` (CREATE/VERIFY/OPEN/UPDATE/ADD/DELETE/LIST/FIELDS) remain linked to `REQ_ACT_WHOAMI` for owner resolution; contract unchanged, they "gain Project/Event support for free" ✓
- **SPEC → UAT:** All ACs traced to test scenarios ✓

**Contradiction Resolution** ✅

1. **AC-11 vs AC-7 apparent tension**: Not contradictory; AC-11 is AC-7 applied at a second location
   - AC-7 (pre-existing): "cannot be determined unambiguously... return error, rather than best-guess"
   - AC-11 (new): "When name matches more than one entity, return error... not picking a candidate"
   - Both state the same principle: ambiguity → error, no tie-break
   - D-L1-1 documents this reasoning: "tie-break question was not a design decision to take"

2. **Behaviour-Change Register row 4 consistent with spec**
   - Before: Multi-match returned the `session`-kind entity (pre-filter coincidence)
   - After: Multi-match returns error (AC-3, per AC-11)
   - This is intentional (D-L0-2: "implicit rule that got implemented wrong once")
   - The coincidence was not a valid identity attribution; AC-7 already forbade it

3. **AC-10 (registry sole authority) doesn't contradict removal of kind predicate**
   - Old predicate: `kind === 'session'` (hard-coded allowlist)
   - New AC-10: "registry is sole authority; no replacement allowlist"
   - Not contradictory; AC-10 explicitly forbids the temptation to carry a replacement list
   - D-L1-2 records this: "a new kind requires no change to this tool"

4. **Name-only filter (SPEC step 3) doesn't contradict no-hard-coded-kinds (AC-10)**
   - Name-only filter doesn't check kind → no hard-coded test exists
   - Filter collects all entities matching name, regardless of kind → registry is sole authority
   - Consistent (D-L2-1: filter is "collect-and-count", not `find()`)

**Implementation Coverage** ✅

- All new ACs have code implementation (commit `6134617`)
  - AC-2 rewritten: removed `e.kind === 'session'` predicate → name-only filter L1280 ✓
  - AC-10 (registry authority): filter uses `kindDrivenScanner.entities` (all kinds) L1280, no hard-coded list ✓
  - AC-11 (multi-match error): guard at L1289-1293 returns error when `matches.length > 1` ✓
  - AC-12 (zero-match unchanged): guard at L1283-1288 returns same error when `matches.length === 0` ✓

**Integration Coverage** ✅

- 8 kanban REQ consumers (REQ_KAN_CREATE/VERIFY/OPEN/UPDATE/ADD/DELETE/LIST/FIELDS) inherit Project/Event support via unchanged whoAmI contract
- Kanban `resolveOwner()` chain verified (T-5): accepts Project title from whoAmI, resolves to board path
- No cross-kind name-collision resolution logic added; collisions treated as error (correct per AC-11)

**UAT Coverage** ✅

- All 6 test scenarios verified by static code analysis against commit `6134617`
- New paths covered: Project resolution (T-1), Event resolution (T-2), multi-match error (T-3)
- Regressions verified: zero-match unchanged (amended T-3), single-kind unchanged (T-4), kanban integration (T-5)
- 100% of SPEC step 3 outcomes covered

**Summary**

No MECE issues detected. The CR properly extends an existing tool to all registered entity kinds without contradicting the principle already embedded in the pre-existing AC-7 (ambiguity is error). The three new ACs (AC-10, AC-11, AC-12) partition the expanded design space (three step 3 outcomes) exhaustively, with AC-11 explicitly applying the pre-existing AC-7 principle to the name-lookup ambiguity introduced by multi-kind support. All amended elements remain properly traced, and the Behaviour-Change Register row 4 (multi-match now errors) is documented and UAT-covered.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | — | No blocking issues identified; CR ready for merge ✅ |

### Round 2 — QM Independent Review

**Reviewed by:** Quality Manager
**Review date:** 2026-08-31

#### Analysis

Read `US_ACT_WHOAMI`, `REQ_ACT_WHOAMI` (full AC-1..AC-12), `SPEC_ACT_WHOAMI`
(full algorithm and AC-1..AC-9), `SPEC_UAT_ACT_WHOAMI_MULTIKINDS`, and the
implementation. Diffed `main..feature/whoami-all-entity-kinds` directly:
the only production-code change is the step-3 rewrite in
`packages/core/src/extension.ts` (`kind === 'session'` single-match `find()`
→ name-only `filter()` with explicit zero/one/many outcomes) — confirmed to
match the CD's own diff claim exactly, nothing more, nothing less. Then ran
the full automated suite (`npx tsc -p packages/core` — clean;
`npx vitest run`) on this branch directly.

**`npx vitest run` FAILS: 2 of 406 tests fail** (`src/tests/whoami-session-id-resolution.test.ts`,
untouched by this CR — `git log` on that file shows no commit past `4eb0c10`,
the prior GH #51 CR):

1. `TC-2 > resolves entity name and checks kind === session` —
   asserts `whoAmISection` contains the literal string `"e.kind === 'session'"`.
   This CR's own step-3 rewrite (`SPEC_ACT_WHOAMI`, `REQ_ACT_WHOAMI` AC-2/AC-10)
   deliberately removes that exact predicate — the assertion now fails by
   design, not by accident.
2. `TC-4 > uses one consistent error message for all failure paths` —
   asserts the section contains exactly 3 occurrences of `error: ERROR_MSG`.
   The old code had 3 error returns (no `sessionId`, no `entityName`, no
   `actor`); the new three-outcome step 3 splits the third into "zero match"
   and "more than one match", so there are now correctly 4 — again a designed
   consequence of `REQ_ACT_WHOAMI` AC-11/AC-12, not a bug in the new code.

Both assertions are literal source-text guards on the exact block this CR
rewrote (same class of guarding-test fragility previously found and fixed in
the `kanban-update-validation` CR's `kanban-comment-preservation.test.ts`).
Here it was not caught: this test file appears in none of the CD's Level 0/1/2
impact tables, the Issues Found list, or the Behaviour-Change Register, so it
was never identified as impacted and never updated alongside the source it
depends on. `val-whoami-all-entity-kinds.md` records `npx tsc -p packages/core
--noEmit` (clean) but no `npx vitest run`, so the automated suite was not
exercised before verification signed off.

Separately, read `SPEC_ACT_WHOAMI`'s own Acceptance Criteria list (distinct
from `REQ_ACT_WHOAMI`'s, in the same design-spec block) end to end: **AC-2
still reads** *"A calling session resolvable to a registered Actor (kind
`session`) returns `{ name, contextPath }`"* — unchanged by this CR, and now
false: it contradicts the algorithm text immediately above it in the same
block (correctly rewritten to remove the kind restriction) and contradicts
amended `REQ_ACT_WHOAMI` AC-2/AC-10. No `SPEC_ACT_WHOAMI`-level AC was added
to state the zero/one/many outcomes that AC-10/AC-11/AC-12 require at the
requirement level — the three-outcome behaviour exists only in algorithm
prose, not in the spec's own checkable AC list.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | Code / Test | `src/tests/whoami-session-id-resolution.test.ts` | `npx vitest run` fails (2/406): TC-2 asserts the literal `e.kind === 'session'` predicate this CR removes; TC-4 asserts exactly 3 `error: ERROR_MSG` occurrences where the new three-outcome step 3 correctly produces 4. Guarding test not identified as impacted, not updated. | **High — blocking** |
| 2 | Process | `val-whoami-all-entity-kinds.md` | Verification report ran `npx tsc --noEmit` but not `npx vitest run`; the only mechanism that would have caught Finding 1 before QM was not exercised. | Medium (process) |
| 3 | Design | `SPEC_ACT_WHOAMI` AC-2 | Design spec's own AC-2 (distinct from `REQ_ACT_WHOAMI` AC-2) still states the kind-`session` restriction, contradicting the algorithm text in the same block and the amended requirement. No spec-level AC states the zero/one/many outcome set that `REQ_ACT_WHOAMI` AC-10/AC-11/AC-12 require. | Low (non-blocking, doc consistency) |

**Verdict: NOT CLEAR.** Finding 1 is fix-now: the CR breaks the existing
automated regression suite. Findings 2 and 3 are process/documentation gaps
surfaced by the same review, included for PM disposition alongside Finding 1
since all three trace to the same root cause — the guarding test's coupling
to the exact source text was not checked as part of this CR's impact
analysis.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | Fix-now | Blocking: CR must not ship with 2/406 tests failing. Update TC-2 to assert the name-only filter (not the removed kind predicate) and TC-4's expected `error: ERROR_MSG` count to 4, reflecting the designed zero/one/many split (AC-11/AC-12). Sent back to CM on the same branch. |
| 2 | 2 | Fix-now (bundled) | Cheap to fix alongside Finding 1, same root cause. Reword `SPEC_ACT_WHOAMI` AC-2 to drop the stale kind-`session` restriction and add an explicit AC stating the zero/one/many outcome set, matching `REQ_ACT_WHOAMI` AC-10/AC-11/AC-12 and the algorithm text already in the same block. |
| 3 | 3 (renumbered from QM's #2) | Accept-as-is (process note) | Not a defect in this CR's deliverable; a gap in Verify Engineer's own protocol (ran `tsc --noEmit` only, not the full suite). Logged as backlog item 22 (VE protocol: always run `npx vitest run` before signing verification) rather than reworked into this CD. |

---

### Round 2 — MECE Re-check

**Reviewed by:** MECE Engineer
**Review date:** 2026-08-31

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| None | — | — | The QM Round 2 fixes introduce no contradiction; `SPEC_ACT_WHOAMI` now aligns with `REQ_ACT_WHOAMI`. | — |

#### Targeted Verification

- `SPEC_ACT_WHOAMI` AC-2 now matches `REQ_ACT_WHOAMI` AC-2 and AC-10: exactly one registry match of any registered kind returns `{ name, contextPath }`; it carries no kind restriction or replacement allowlist.
- New `SPEC_ACT_WHOAMI` AC-2a makes the complete step-3 partition checkable: one match returns an identity, while zero and more-than-one matches return the existing AC-3 error. These outcomes are mutually exclusive and collectively exhaustive.
- AC-2a remains consistent with `REQ_ACT_WHOAMI` AC-11 and AC-12, and AC-11 remains an application of the pre-existing AC-7 rule that ambiguity returns an error rather than a best guess.
- TC-2 now asserts the required name-only `.filter(...)` lookup and absence of the retired `kind === 'session'` predicate. TC-4 now expects all four intended error returns: missing session id, unresolved name, zero matches, and multiple matches.

**Result:** PASS — the prior stale design AC and stale source-level test expectations are resolved; no new MECE issue found.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | — | No new finding or decision required. |

---

### Round 3 — QM Independent Review

**Reviewed by:** Quality Manager
**Review date:** 2026-08-31

#### Analysis

Re-verified independently rather than relying on relayed VE/MECE clearance.
Confirmed branch `feature/whoami-all-entity-kinds` at HEAD (`8a779ee`)
contains fix commit `274625f` and inspected its diff directly: it touches
only `docs/design/spec_act.rst` and `src/tests/whoami-session-id-resolution.test.ts`
(9 insertions, 6 deletions) — no production code changed since Round 2, as
expected, since Finding 1 was a test/spec-only fix.

Read the current `packages/core/src/extension.ts` handler block
(lines 1218-1308) directly: the step-3 implementation is unchanged from
Round 2 (`kindDrivenScanner.entities.filter(e => e.name === entityName)`,
with explicit `matches.length === 0` and `matches.length > 1` branches) and
contains exactly 4 `error: ERROR_MSG` occurrences (no `sessionId`, no
`entityName`, zero-match, multi-match) — matching what TC-4 now expects.

Ran all checks independently rather than trusting the relayed reports:

- `npx tsc -p packages/core` — clean, no output.
- `npx vitest run` — **`Test Files 40 passed (40)`, `Tests 406 passed (406)`**.
  Confirms Round 2 Finding 1 (blocking) is resolved.
- `python -m sphinx -b html docs docs/_build/html -W --keep-going` — build
  succeeded, 0 schema warnings.

Read `docs/design/spec_act.rst` lines 2024-2032 directly: AC-2 now reads
"exactly one entity in the scanner registry (any kind)" (kind restriction
removed) and new AC-2a states the three-outcome partition (one/zero/many),
consistent with `REQ_ACT_WHOAMI` AC-10/AC-11/AC-12 and the algorithm prose
in the same block. Confirms Round 2 Finding 3 (design doc) is resolved.

Read `val-whoami-all-entity-kinds.md`'s addendum (lines 296-406): it now
records `npx vitest run` output (406/406) as part of verification evidence
going forward — the process gap identified in Round 2 Finding 2 (bundled as
"accept-as-is, logged as backlog item 22" per PM's decision) is not
reworked into this CD's own protocol, consistent with PM's disposition;
confirmed no independent evidence contradicts that decision.

Read the MECE Engineer's Round 2 re-check (above): its targeted verification
claims match what was independently re-derived here — no discrepancy found.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| None | — | — | All 3 Round 2 findings independently confirmed resolved: TC-2/TC-4 fixed and passing, `SPEC_ACT_WHOAMI` AC-2/AC-2a aligned with `REQ_ACT_WHOAMI`, full suite (406/406), compile, and Sphinx build all clean. | — |

**Verdict: CLEAR.** No new issues found. Round 2's fix-now items are verified
resolved by direct, independent re-execution of the build/test/doc checks —
not solely by relayed VE/MECE clearance.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|

---

## Appendix: Link Discovery Results

```
# US_ACT_WHOAMI --direction in --depth 1
linked_from: REQ_ACT_WHOAMI, US_UAT_WHOAMI, US_KAN_TOOLS

# REQ_ACT_WHOAMI --direction in --depth 1
linked_from: SPEC_ACT_WHOAMI, SPEC_UAT_WHOAMI, REQ_UAT_WHOAMI,
             REQ_KAN_CREATE, REQ_KAN_VERIFY, REQ_KAN_OPEN, REQ_KAN_UPDATE,
             REQ_KAN_ADD, REQ_KAN_DELETE, REQ_KAN_LIST, REQ_KAN_FIELDS
```

The eight `REQ_KAN_*` consumers reference `REQ_ACT_WHOAMI` only for owner
auto-resolution, which this CR does not alter — they inherit Project/Event
support without change. `REQ_UAT_WHOAMI` and `SPEC_UAT_WHOAMI` are what
surfaced Issue 1.

---

*Generated by syspilot Change Agent*
