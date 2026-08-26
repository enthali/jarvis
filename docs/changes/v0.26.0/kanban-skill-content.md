# Change Document: kanban-skill-content

**Status**: merged
**Branch**: feature/kanban-skill-content
**Created**: 2026-08-24
**Author**: Project Manager
**Operation Mode**: user-guided

- **user-guided** — every actor involves the user in its decision-making before proceeding.

---

## Summary

The `jarvis-kanban` module has no real, complete skill and instructions content
yet for actors that want to work with kanban boards — what exists today
(shipped as the pilot asset for `module-skill-provisioning`, not yet merged)
covers only the four existing tools and the basic board convention, but
leaves several known gaps open: the schema (fields, board ontology) is not
discoverable from the skill itself, there is no documented convention that
`ownerName` must be resolved via `jarvis_whoAmI` before create/update calls
(actors currently guess or omit it and get an error), and the board schema
has no freeform text field for notes/descriptions beyond the fixed
single-select `status`/`priority` columns — all three gaps trace back to
GH #57. This CR closes all three gaps in one pass, because the user found
that `module-skill-provisioning` (the generic provisioning mechanism) has no
user-visible behavior to validate on its own — the two changes are validated
together in one manual test pass before either is merged.

This branch is stacked on the not-yet-merged `feature/module-skill-provisioning`
branch (it depends on that mechanism to self-install the resulting skill and
instructions files) and will be merged to `development` together with it, in
sequence, once the user has validated both.

Acceptance criteria (user-visible):
- The `jarvis-kanban` skill fully documents the board ontology (fields,
  schema, valid values) so an actor doesn't need to read `kanban.schema.json`
  directly to understand what a board looks like.
- The skill documents that `ownerName` must be resolved via `jarvis_whoAmI`
  before calling `jarvis_createKanbanBoard` / `jarvis_updateKanbanItem`.
- A board supports a freeform text field (e.g. `notes`) in addition to the
  existing single-select fields, and the skill documents it.
- No GitHub issue beyond GH #57 (already referenced) — tracked as backlog
  items 1, 2, 5 on the PM's internal kanban backlog.

---

## Level 0: User Stories

**Status**: ✅ completed

### Intake Correction

The intake described three gaps. Verification against GH #57 and the current
tree found two of them misstated. Corrected scope below; evidence in Decisions.

| Intake item | Verified finding |
|---|---|
| "Board ontology/schema not discoverable from skill" | Confirmed. GH #57 gaps 1–3. |
| "Skill must document `ownerName` must be resolved via `jarvis_whoAmI` before create/update" | **Inverted.** Auto-resolution on omission has existed since the first kanban commit (#46) and is already specified by `US_KAN_TOOLS` AC-4/AC-5 and `REQ_KAN_UPDATE` AC-3. Correct guidance: *omit* `ownerName`. Not present in GH #57. |
| "Boards need a freeform text field (e.g. `notes`)" | **Already exists** — schema, validator and renderer all support `notes`. GH #57 gap 4 asks for a `type: text` **field type** so boards can declare *named* freeform fields. |
| *(missing from intake)* | GH #57's costliest trap: an undeclared item key is schema-valid, warned not errored, and never rendered. Added to scope. |

### Impacted User Stories

Impact analysis run from `US_KAN_BOARD`, `US_KAN_TOOLS`, `US_KAN_DISCOVER`,
`US_MOD_SKILL_PROVISION` (`--direction in --depth 1`). Raw output in Appendix.

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_KAN_BOARD | Kanban Board from YAML | not impacted | AC-3 already says "other field values SHALL be shown"; text fields inherit it |
| US_KAN_TOOLS | Kanban Board Tools | not impacted | AC-4/AC-5 already specify owner auto-resolution correctly |
| US_KAN_DISCOVER | Convention-Based Board Discovery | not impacted | Discovery unchanged |
| US_MOD_SKILL_PROVISION | Module Copilot Asset Self-Provisioning | not impacted | This CR consumes the mechanism; it does not change it |
| US_UAT_KANBAN | Kanban Acceptance Tests | not impacted at US level | UAT extension is a Level 2 concern |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_KAN_SKILL | Kanban Skill and Instructions Content | mandatory |
| US_KAN_TEXTFIELD | Named Freeform Text Fields | mandatory |

### Decisions

- D-L0-1 (evidence-based correction): The `ownerName` convention is documented **as implemented** — omit to address your own board, supply to address another entity's. Verified at [packages/kanban/src/extension.ts](packages/kanban/src/extension.ts#L62-L89) and in the tool manifest descriptions; specified already by `US_KAN_TOOLS` AC-4. Documenting the intake's version would have contradicted both code and approved spec.
- D-L0-2 (user decision, 2026-08-24): GH #57 gap 4 (`type: text`) is **in scope** for this CR — schema, validator, renderer and docs — rather than deferred to a follow-up.
- D-L0-3: The answer to GH #57 gap 2 (schema discoverability) is the skill content itself, not new tooling. The issue floated a `jarvis_getKanbanSchema` tool as an alternative; a tool call to learn a static ontology costs a round trip on every session, while skill content is already in context.
- D-L0-4: `notes` is retained unchanged rather than reframed as a text field. Existing boards use it, and `REQ_KAN_SCHEMA` AC-5 already defines it — removing it would be a breaking change for zero gain.
- D-L0-5: The pilot instructions file contains claims that contradict the schema (it requires `nextId`, and names the item title property `title` where the schema says `name`). Corrected under `US_KAN_SKILL` AC-5 rather than reported separately, since this CR owns that file's content.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories — `US_KAN_SKILL` governs asset *content*; `US_MOD_SKILL_PROVISION` governs asset *delivery*. Disjoint.
- [x] No redundancies — `US_KAN_TEXTFIELD` adds a declarable field type; the built-in `notes` property stays as-is and is not restated.
- [x] Gaps identified and addressed — all four GH #57 gaps are now covered: 1–3 by `US_KAN_SKILL`, 4 by `US_KAN_TEXTFIELD`.

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_KAN_SCHEMA | US_KAN_BOARD | modified | AC-2: `type` enum gains `text`; `options` conditional on type |
| REQ_KAN_VERIFY | US_KAN_TOOLS | modified | AC-3: option-matching restricted to `single_select` |
| REQ_KAN_RENDERER | US_KAN_BOARD | modified | New AC-3a: render declared `text` field values, labelled |
| REQ_KAN_CREATE | US_KAN_TOOLS | not impacted | Skeleton board declares only `status`/`priority`; no text field needed |
| REQ_KAN_UPDATE | US_KAN_TOOLS | not impacted | Merges arbitrary string values already; AC-3 owner resolution already correct |
| REQ_KAN_MODULE | US_KAN_BOARD, US_KAN_TOOLS | not impacted | Asset bundling governed by `REQ_MOD_SKILL_PROVISION` |
| REQ_KAN_DISCOVER / UX / FILEOPEN | US_KAN_DISCOVER | not impacted | Discovery and entry points unchanged |
| REQ_MOD_SKILL_PROVISION / ORPHAN / OPTOUT | US_MOD_SKILL_PROVISION | not impacted | Consumed unchanged; asset *content* is this CR's subject |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_KAN_TEXTFIELD | Freeform Text Field Type | US_KAN_TEXTFIELD; REQ_KAN_SCHEMA | mandatory |
| REQ_KAN_SKILLCONTENT | Kanban Skill Asset Content | US_KAN_SKILL; REQ_KAN_SCHEMA; REQ_MOD_SKILL_PROVISION | mandatory |
| REQ_KAN_INSTRUCTIONS | Kanban Instructions Asset Content | US_KAN_SKILL; REQ_KAN_SCHEMA | mandatory |

### Conflicts Detected

- ⚠️ Intake instruction vs. `US_KAN_TOOLS` AC-4 / `REQ_KAN_UPDATE` AC-3 on `ownerName` semantics.
  - Resolution: approved spec and implementation agree with each other and against the intake. Documented as implemented (D-L0-1). Reported to CM.

### Decisions

- D-L1-1: `options` becomes conditional on `type` (required for `single_select`, forbidden for `text`) rather than merely optional. A `text` field carrying an option list is a mistake with no meaning; accepting it silently would reproduce exactly the class of silent-acceptance failure that GH #57 is about.
- D-L1-2: A `text` field named `status` is a validation error (`REQ_KAN_TEXTFIELD` AC-4). `status` options define the board's columns, so a non-enumerable status would render a board with no columns.
- D-L1-3: Backward compatibility is stated as an explicit acceptance criterion (AC-5, AC-6) rather than assumed. Every board in the repo today predates this change, so "unchanged" is the property most likely to be broken and least likely to be tested.
- D-L1-4 (defect found while specifying): the instructions asset's `applyTo` is `**/*.kanban.yaml`, which does not match a file named exactly `kanban.yaml` — the default board name from `REQ_KAN_DISCOVER` AC-1. The instructions therefore never apply to the most common board file. Fixed under `REQ_KAN_INSTRUCTIONS` AC-6.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements — `REQ_KAN_SCHEMA` AC-5 (built-in `notes`) and `REQ_KAN_TEXTFIELD` (declared named fields) are disjoint surfaces; AC-6 states their coexistence explicitly.
- [x] No redundancies — skill content (`REQ_KAN_SKILLCONTENT`) and instructions content (`REQ_KAN_INSTRUCTIONS`) govern different files with different trigger conditions: the skill is loaded on task match, the instructions apply on file edit.
- [x] All new REQs link to User Stories.

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_KAN_SCHEMA | REQ_KAN_SCHEMA, REQ_KAN_TEXTFIELD | modified | `type` enum gains `text`; `allOf`/`if`/`then` binds `options` to `type`; AC-6..AC-8 |
| SPEC_KAN_VERIFY | REQ_KAN_VERIFY, REQ_KAN_TEXTFIELD | modified | Semantic validation branches on field type; `fieldMap` widened; AC-5..AC-7 |
| SPEC_KAN_RENDERER | REQ_KAN_RENDERER | modified | Declared `text` values render as labelled pairs |
| SPEC_KAN_CREATE | REQ_KAN_CREATE | not impacted | Skeleton declares only single-select fields |
| SPEC_KAN_UPDATE | REQ_KAN_UPDATE | not impacted | Merges string values already; status validation untouched |
| SPEC_KAN_MODULE | REQ_KAN_MODULE | not impacted | `assets/` bundling is `SPEC_MOD_SKILL_PROVISION`'s contract |
| SPEC_KAN_DISCOVER / UX / FILEOPEN | — | not impacted | Unchanged |
| SPEC_MOD_SKILL_PROVISION / MANIFEST | REQ_MOD_SKILL_PROVISION | not impacted | Consumed as-is |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_KAN_SKILLCONTENT | Kanban Skill Asset Content | REQ_KAN_SKILLCONTENT, SPEC_KAN_SCHEMA, SPEC_MOD_SKILL_PROVISION |
| SPEC_KAN_INSTRUCTIONS | Kanban Instructions Asset Content | REQ_KAN_INSTRUCTIONS, SPEC_KAN_SCHEMA |

### Conflicts Detected

None.

### Decisions

- D-L2-1: `options` is bound to `type` with draft-07 `allOf` + `if`/`then` rather than left optional. Draft-07 is already the schema's dialect, so this costs no new dependency and no validator change.
- D-L2-2: "`status` must be `single_select`" stays a *semantic* check in `SPEC_KAN_VERIFY`, not a structural one. JSON Schema cannot reach across array elements to constrain the one field named `status`; the existence check for `status` is already semantic for the same reason, so this keeps the split consistent rather than introducing a second rule about where `status` constraints live.
- D-L2-3: `fieldMap` is widened from `name → Set<option>` to `name → { type, options? }`. With `text` fields present, an empty option set would otherwise be ambiguous between "no options declared" and "does not constrain values" — and the ambiguity resolves to silently skipping validation on single-select fields.
- D-L2-4: `text` values render **labelled**; `notes` stays unlabelled. The name is what distinguishes a `rationale` from a `blocker`; dropping it would make two text fields indistinguishable on the card.
- D-L2-5: The skill's pitfall list states the **observable symptom** for each entry, not just the rule. Every pitfall here fails quietly — clean-looking verification, a rendered board, a missing value — so an actor that knows only the rule has nothing to notice.
- D-L2-6: The skill omits any instruction to "call `jarvis_whoAmI` then pass the name", rather than merely not recommending it as one option among several. That pattern is what the intake asked for, and it is strictly worse: it swaps a resolved call for a name-matching call, and name matching is the only branch that can fail with `actor unknown`.
- D-L2-7: Skill and instructions are kept non-overlapping — ontology, workflow and example live only in the skill; the instructions carry only hand-edit invariants. They load under different conditions, and duplicated content would drift apart with no mechanism to notice.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs — `SPEC_KAN_SCHEMA` retains `notes` as a built-in item property while `text` fields are declared in `fields[]`; both are specified and their coexistence is stated.
- [x] All new SPECs link to Requirements.
- [x] Add-on onboarding preflight (`SPEC_MOD_ADDON_ONBOARDING`) checked — not applicable: no new `packages/<name>` add-on is introduced.

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_KAN_SKILL | REQ_KAN_SKILLCONTENT, REQ_KAN_INSTRUCTIONS | SPEC_KAN_SKILLCONTENT, SPEC_KAN_INSTRUCTIONS | ✅ |
| US_KAN_TEXTFIELD | REQ_KAN_TEXTFIELD, REQ_KAN_SCHEMA, REQ_KAN_VERIFY, REQ_KAN_RENDERER | SPEC_KAN_SCHEMA, SPEC_KAN_VERIFY, SPEC_KAN_RENDERER | ✅ |

### GH #57 Coverage

| Gap | Covered by |
|---|---|
| 1 — documentation of item properties, `notes`, field types, undeclared-key trap | REQ_KAN_SKILLCONTENT AC-1..AC-3, AC-5 |
| 2 — schema discoverability | REQ_KAN_SKILLCONTENT AC-1, AC-6 (skill content, not new tooling — D-L0-3) |
| 3 — a skill exists covering conventions, workflow, pitfalls | SPEC_KAN_SKILLCONTENT (all sections) |
| 4 — freeform `text` field type | REQ_KAN_TEXTFIELD, SPEC_KAN_SCHEMA AC-6/AC-7 |

### Artefakt-Removal-Check

Not applicable — this CR removes no artefact. The two corrected claims in the
instructions file are content edits within a file this CR owns, not artefact
removals.

### Issues Found

None open. Two intake misstatements and one latent defect were found and
resolved during design — see D-L0-1, D-L0-2 and D-L1-4. All three are reported
to CM.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## UAT

**UAT Spec**: [SPEC_UAT_KAN_SKILL](../design/spec_uat_kanban_skill.rst)  
**Test Protocol**: [tst-kanban-skill-content.md](tst-kanban-skill-content.md)  
**Execution date**: 2026-08-24  
**Executed by**: Test Designer (static code analysis, commit `7b36f90`)

| # | Scenario | Result |
|---|----------|--------|
| T-1 | Text field: board validates clean | ✅ PASS |
| T-2 | Text field: value renders as labelled pair | ✅ PASS |
| T-3 | Backward compatibility: existing board unchanged | ✅ PASS |
| T-4 | Invalid: text field with options → structural error | ✅ PASS |
| T-5 | Invalid: single_select without options → structural error | ✅ PASS |
| T-6 | Invalid: status as text → semantic error | ✅ PASS |
| T-7 | Undeclared key → warning not error; not rendered | ✅ PASS |
| T-8 | Instructions applyTo matches `kanban.yaml` | ✅ PASS |
| T-9 | Instructions: `name` not `title`; `nextId` optional | ✅ PASS |
| T-10 | Skill: all 8 sections present and non-empty | ✅ PASS |
| T-11 | Skill Owner Resolution: says omit, not pre-resolve | ✅ PASS |
| T-12 | Skill Pitfalls: undeclared-key trap with symptom | ✅ PASS |

**All 12 scenarios PASS.** Full code evidence per scenario in
`tst-kanban-skill-content.md`.

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1 — MECE Consistency Check

**Reviewed by:** MECE Engineer
**Review date:** 2026-08-24

#### Analysis

**Mutual Exclusivity verification:**

- `US_KAN_SKILL` (asset content: what the skill documents) ⊥ `US_KAN_TEXTFIELD` (schema feature: text field type). One addresses *content*, the other addresses a *feature*. ✅
- `REQ_KAN_SKILLCONTENT` (asset content documentation) ⊥ `REQ_KAN_INSTRUCTIONS` (asset content for hand editing). Different trigger conditions (task match vs. file edit), non-overlapping trigger contexts (Copilot vs. hand editor). D-L2-7 enforces non-overlap. ✅
- `REQ_KAN_TEXTFIELD` (declared text fields) ⊥ `REQ_KAN_SCHEMA` AC-5 (built-in `notes` property). Text fields live in `fields[]` (declared, named, bounded by field list), notes is an implicit item property (unnamed, singular, implicit). Different surfaces. ✅

**Collective Exhaustiveness verification:**

All four GH #57 gaps are covered by the new elements:
- Gap 1–3 (schema discoverability, ontology, owner-resolution convention, undeclared-key trap): ✅ `SPEC_KAN_SKILLCONTENT` (all required sections present; AC-1..AC-6 cover all)
- Gap 4 (freeform text field type): ✅ `REQ_KAN_TEXTFIELD` + `SPEC_KAN_SCHEMA` (AC-6/AC-7 add `text` to `type` enum and bind `options` conditionally) + `SPEC_KAN_VERIFY` (AC-5/AC-6 skip option validation for text) + `SPEC_KAN_RENDERER` (AC-3a render text field values labelled)

No observable aspect left unaddressed:
- Schema validation of text fields: ✅ SPEC_KAN_SCHEMA
- Semantic validation of text fields: ✅ SPEC_KAN_VERIFY
- Rendering of text fields: ✅ SPEC_KAN_RENDERER  
- Documentation of text fields: ✅ SPEC_KAN_SKILLCONTENT + SPEC_KAN_INSTRUCTIONS
- Backward compatibility guarantee: ✅ REQ_KAN_TEXTFIELD AC-5

**Traceability verification:**

- `US_KAN_SKILL` → `REQ_KAN_SKILLCONTENT`, `REQ_KAN_INSTRUCTIONS` → `SPEC_KAN_SKILLCONTENT`, `SPEC_KAN_INSTRUCTIONS` ✅
- `US_KAN_TEXTFIELD` → `REQ_KAN_TEXTFIELD`, `REQ_KAN_SCHEMA`, `REQ_KAN_VERIFY`, `REQ_KAN_RENDERER` → `SPEC_KAN_SCHEMA`, `SPEC_KAN_VERIFY`, `SPEC_KAN_RENDERER` ✅
- All new elements link to User Stories at L1 ✅
- All modified elements trace to source requirements correctly (REQ_KAN_SCHEMA AC-2, REQ_KAN_VERIFY AC-3, REQ_KAN_RENDERER AC-3a all mention this CR) ✅

**Contradiction check:**

- `status` field type: D-L2-2 / D-L1-2 correctly specify this as a *semantic* validation in `SPEC_KAN_VERIFY`, not structural — JSON Schema cannot constrain a specific array element across the entire array, so the existing semantic check for `status` presence is the right place, and this new semantic check (status must be single_select) keeps the split consistent. No contradiction. ✅
- Built-in `notes` vs. declared text fields: `REQ_KAN_TEXTFIELD` AC-6 explicitly preserves `notes` unchanged. Both coexist per spec. No contradiction. ✅
- `options` conditional binding: `SPEC_KAN_SCHEMA` uses draft-07 `allOf` + `if`/`then` to enforce `options` required for `single_select`, forbidden for `text`. No schema allows both simultaneously. Mutually exclusive enforcement. ✅

**Orthogonality with existing specs:**

- vs. `SPEC_MOD_SKILL_PROVISION`: This CR consumes the mechanism unchanged (asset delivery to workspace). No collision. ✅
- vs. `US_KAN_BOARD`, `US_KAN_TOOLS`, `US_KAN_DISCOVER`: Not impacted per CD L0. Verified: board rendering (AC-3 already says "other field values SHALL be shown") and discovery unchanged. ✅
- vs. `SPEC_KAN_CREATE`: Skeleton board only declares `status`/`priority` (both single_select). No text field in skeleton. No contradiction. ✅
- vs. `REQ_KAN_SCHEMA` AC-9 (comment preservation): This CR modifies schema, not any write path. Comment preservation still governs update behavior per `SPEC_KAN_UPDATE` AC-6. No impact. ✅

**Implementation coverage verification:**

- Schema modified: ✅ `packages/kanban/schemas/kanban.schema.json` (type enum, allOf/if/then binding)
- Validator modified: ✅ `packages/kanban/src/cmd/kanban/verify.ts` (type-aware validation, text → skip option check)
- Renderer modified: ✅ Text field values render labelled per AC-3a
- Skill content created: ✅ `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md` (8 sections, 5 pitfalls with symptoms, example board)
- Instructions modified: ✅ `packages/kanban/assets/instructions/jarvis-kanban.yaml.instructions.md` (`applyTo` fixed, `name`/`nextId` corrected)
- Test fixture: ✅ `testdata/kanban/sample-with-textfield.kanban.yaml`

**UAT coverage verification:**

All 12 scenarios pass static analysis (commit `7b36f90`):
- T-1/T-2: Text field validates and renders ✅
- T-3: Backward compatibility ✅
- T-4/T-5: Invalid schema (text+options, single_select−options) rejected ✅
- T-6: status must be single_select ✅
- T-7: Undeclared key accepted/warned/not-rendered ✅
- T-8/T-9/T-12: Instructions `applyTo`, `name`, pitfalls trap ✅
- T-10/T-11: Skill 8 sections present, owner resolution ✅

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | No MECE issues detected. All new/modified elements are mutually exclusive, collectively exhaustive, correctly traced, and non-contradictory. 12/12 UAT PASS. | — |

---

### Round 2 — QM Independent Review

**Reviewed by:** Quality Manager
**Review date:** 2026-08-24

#### Analysis

Traceability independently re-verified by direct read: `US_KAN_SKILL`/`US_KAN_TEXTFIELD`
→ `REQ_KAN_TEXTFIELD`/`REQ_KAN_SKILLCONTENT`/`REQ_KAN_INSTRUCTIONS`/`REQ_KAN_SCHEMA`/
`REQ_KAN_VERIFY`/`REQ_KAN_RENDERER` → `SPEC_KAN_SCHEMA`/`SPEC_KAN_VERIFY`/`SPEC_KAN_RENDERER`/
`SPEC_KAN_SKILLCONTENT`/`SPEC_KAN_INSTRUCTIONS`, all read in full in `req_kan.rst`/`spec_kan.rst`
— consistent, no gaps. Diffed `kanban.schema.json`, `extension.ts`'s `semanticValidate`, and
`webview/kanban.ts` against `main` directly (not just reading the final state) — each diff is
minimal and matches the CD's own claimed change exactly, no incidental side effects. `SKILL.md`'s
8 sections and `jarvis-kanban.yaml.instructions.md`'s corrected `applyTo`/`name`/`nextId` content
independently read and cross-checked against `resolveOwner()`/`resolveBoardPath()` in
`extension.ts` — accurate. Full `compile all` clean; 406/406 tests re-run (40 files); kanban
package itself has no unit tests (pre-existing repo convention, not introduced by this CR).

One low-severity documentation-precision note, not a code-vs-spec defect (the governing AC is
satisfied as written):

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | Documentation precision | D-L2-6, `SKILL.md` Owner Resolution | `SPEC_KAN_SKILLCONTENT` AC-3 only requires the owner-resolution section to "contain no instruction to pre-resolve via `jarvis_whoAmI`" — satisfied by omission, and `SKILL.md`'s Owner Resolution section (3 bullets) indeed contains no such instruction. But D-L2-6 in this CD describes the result as the skill "explicitly forbids" the pre-resolve pattern — no forbidding statement is actually present in the shipped file, only its absence. The AC is met either way; this is a mismatch between the Decision's narrative and the artefact's actual content, not a spec-vs-code conflict. | Low |

**Verdict: QM CLEAR** (finding is non-blocking; PM may accept-as-is or ask for a one-line wording fix to D-L2-6).

#### PM Decision

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | **Fix now** | Trivial, no CM round-trip needed — corrected D-L2-6's wording directly in this CD ("omits any instruction to..." instead of "explicitly forbids") to match what `SKILL.md` actually ships (silence, not a forbidding statement). No code change; the governing AC was already satisfied either way. |

---

## Appendix: Link Discovery Results

```
# US_KAN_BOARD --direction in --depth 1
linked_from: REQ_KAN_SCHEMA, REQ_KAN_RENDERER, REQ_KAN_UX, REQ_KAN_MODULE,
             REQ_KAN_FILEOPEN, US_UAT_KANBAN

# US_KAN_TOOLS --direction in --depth 1
linked_from: REQ_KAN_CREATE, REQ_KAN_VERIFY, REQ_KAN_OPEN, REQ_KAN_MODULE,
             REQ_KAN_UPDATE, US_UAT_KANBAN

# US_KAN_DISCOVER --direction in --depth 1
linked_from: REQ_KAN_DISCOVER, REQ_KAN_UX, REQ_KAN_FILEOPEN, US_UAT_KANBAN

# US_MOD_SKILL_PROVISION --direction in --depth 1
linked_from: REQ_MOD_SKILL_PROVISION, REQ_MOD_SKILL_ORPHAN,
             REQ_MOD_SKILL_OPTOUT, US_UAT_SKILL_PROVISION
```

---

*Generated by syspilot Change Agent*
