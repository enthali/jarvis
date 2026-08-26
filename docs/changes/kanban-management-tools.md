# Change Document: kanban-management-tools

**Status**: merged
**Branch**: feature/kanban-management-tools
**Created**: 2026-08-24
**Author**: Project Manager
**Operation Mode**: unattended

- **unattended** — the user is not reachable. When unsure, the actor flags the point as `USER REVIEW REQUIRED` in this document, takes the simplest KISS path that is cheapest to revert or amend, and keeps the change moving. PM reviews flagged points once reachable again; ownership of the decision stays with the actor that made it.

---

## Summary

Today only two item-shaped LM tools exist for kanban boards: `jarvis_createKanbanBoard`
(new board) and `jarvis_updateKanbanItem` (existing item by id). Managing a board
beyond that — adding an item, removing one, narrowing down to relevant items on a
large board, or evolving the board's own field/option set — requires hand-editing
the YAML directly, bypassing every guard `jarvis_updateKanbanItem` and
`jarvis_verifyKanbanSchema` already enforce (unique/incrementing `id`, valid
`status`/`options` values, declared-field membership). Found 2026-08-20 while
dogfooding this backlog board itself; the query gap surfaced 2026-08-24 from a
user observation that boards have already been seen at 1000+ lines, at which
point reading the whole file back into context on every turn doesn't scale.

Fix direction — four new tools, all following the existing round-trip YAML
editing pattern (`yaml.parseDocument`, mutate, `doc.toString()`) already used by
`jarvis_updateKanbanItem`:

1. **`jarvis_addKanbanItem`** — appends a new item; auto-assigns `id` from the
   board's `nextId` (incrementing it), defaults `status` to the first declared
   status option when omitted, validates provided field values the same way
   `jarvis_updateKanbanItem` does.
2. **`jarvis_deleteKanbanItem`** — removes an item by `id`; errors if the id is
   not found. Does not renumber or reuse `nextId`.
3. **`jarvis_listKanbanItems`** — returns items filtered by `status` and/or
   `labels` (both optional, AND-combined when both given); returns a compact
   projection (`id`, `name`, `status`, `labels`) rather than full items, to keep
   the result small on a large board.
4. **`jarvis_updateKanbanFields`** — adds or removes a field definition, or adds
   or removes a `single_select` option on an existing field; refuses to remove
   a field/option still referenced by an existing item (same validation path as
   `jarvis_verifyKanbanSchema`'s semantic checks).

Also in scope: update `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md`
— add the four new tools to its Tools table and Workflow section, matching the
existing terse-`registerTool`-description-plus-detailed-skill pattern (tool
descriptions stay one-line; parameter/edge-case detail lives in the skill, not
duplicated in both places).

Acceptance criteria: an LM can add, remove, narrow-query, and evolve the field
set of an existing board without ever hand-editing YAML; all four tools reject
invalid input with the same error shape `jarvis_updateKanbanItem` already uses;
the kanban panel refreshes after any write (add/delete/field change), same as
it does today after an update; the skill's Tools table and Workflow section
list all four new tools with the same level of detail as the existing ones.

Backlog items 3, 11, 12, 13.

---

## USER REVIEW REQUIRED

Two points were decided by the System Designer under `unattended` mode. Both
took the reversible path; ownership stays with me until PM reviews.

### F-1 — New write tools validate more strictly than `jarvis_updateKanbanItem`

**The situation.** The intake says the new tools should "validate field values
the same way `jarvis_updateKanbanItem` does". Verified against
[packages/kanban/src/extension.ts](packages/kanban/src/extension.ts#L600-L612):
that tool validates **only `status`**. It does not check values written under
other declared `single_select` fields, and it accepts a key matching no declared
field at all. `semanticValidate` — the same package's verifier — flags the first
as an **error** and the second as a **warning that never renders** (the GH #57
trap). So `jarvis_updateKanbanItem` can already write a board that
`jarvis_verifyKanbanSchema` rejects.

**Decision taken.** The four new tools validate the full value set
(`REQ_KAN_WRITEVALID`). `jarvis_updateKanbanItem` is left as-is.

**Why this way.** Copying the existing behaviour would have tripled a known
defect into three more tools. Tightening `jarvis_updateKanbanItem` in the same
CR was rejected as out of scope: it changes approved, shipped behaviour
(`REQ_KAN_UPDATE` AC-7 explicitly freezes it — "SHALL behave exactly as
before"), and doing it here would bury a behavioural change inside an
additive CR.

**Reversibility.** Strict-now is the recoverable direction: relaxing later
accepts data already written, whereas starting loose lets invalid values into
boards that a later tightening would reject.

**For PM:** the real question is whether `jarvis_updateKanbanItem` should be
brought up to `REQ_KAN_WRITEVALID` in a follow-up. Until then the module has two
different write contracts, which is itself a defect — just a smaller one than
either alternative available here.

### F-2 — Renaming a field or option remains impossible without hand-editing

**The situation.** `US_KAN_TOOLS` AC-10 aims at "no hand-editing required".
`REQ_KAN_FIELDS` provides add/remove for fields and options, guarded by a
reference check that refuses to strand existing item values
(`REQ_KAN_FIELDS` AC-4/AC-7). Those two combine badly for the rename case: an
in-use field or option cannot be renamed as remove-then-add, because the remove
is refused while items still reference it.

**Decision taken.** Rename is not offered (`REQ_KAN_FIELDS` AC-11). The
limitation is written into the requirement rather than left to be discovered.

**Why this way.** Rename needs either a transactional rewrite of every
referencing item value, or a relaxation of the reference guard. Both are design
decisions larger than this CR's scope, and picking one unattended would commit
the project to a data-migration shape nobody reviewed.

**For PM:** decide whether rename is a follow-up CR, or whether it is acceptable
that `US_KAN_TOOLS` AC-10 has a named exception.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

Impact analysis run from `US_KAN_TOOLS`, `US_KAN_BOARD` and `US_KAN_SKILL`
(`--direction in --depth 1`). Raw output in Appendix.

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_KAN_TOOLS | Kanban Board Tools | modified | AC-7..AC-10: add, delete, field evolution, and the "no hand-editing" goal with its named exception |
| US_KAN_SKILL | Kanban Skill and Instructions Content | not impacted | Existing ACs already require the skill to document tools; the *content* additions land at Level 1 |
| US_KAN_BOARD | Kanban Board from YAML | not impacted | Rendering and schema shape unchanged |
| US_KAN_TEXTFIELD | Named Freeform Text Fields | not impacted | Consumed as-is; `text` fields are handled by the new tools, not redefined |
| US_UAT_KANBAN / US_UAT_KAN_SKILL | Acceptance test stories | not impacted at US level | UAT extension is a Level 2 concern |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_KAN_QUERY | Query a Board Without Reading All of It | mandatory |

### Decisions

- D-L0-1: The list tool gets its **own** user story rather than another AC on `US_KAN_TOOLS`. The other three tools exist so edits pass through guards; this one exists so *reading* stays affordable at 1000+ lines. Different rationale and different acceptance — size, not correctness. Folding it in would leave the compact-projection requirement with no traceable reason, and the first person to find the projection inconvenient would widen it.
- D-L0-2: `US_KAN_TOOLS` AC-10 states the "every mutation reachable by tool" goal explicitly, and points at its own exception. A goal with a silent hole reads as met; a goal with a named hole is a work item.
- D-L0-3: Field *evolution* stays inside `US_KAN_TOOLS` rather than becoming its own story. It is the same user need as add/delete — change the board without hand-editing YAML — applied to the board's schema instead of its items.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories — `US_KAN_QUERY` adds a read path; `US_KAN_TOOLS` covers write paths. No AC of either constrains the other.
- [x] No redundancies — the compact projection (`US_KAN_QUERY` AC-2) does not restate `US_KAN_BOARD`'s rendering rules; one governs a tool result, the other a webview.
- [x] Gaps identified and addressed — the rename gap is named in AC-10 and F-2 rather than left implicit.

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_KAN_SKILLCONTENT | US_KAN_SKILL | modified | AC-8..AC-10: Tools table covers all tools; id/reuse rules; projection caveat |
| REQ_KAN_MODULE | US_KAN_TOOLS | modified | AC-8: manifest entries for the four new tools; AC-9: one-line tool descriptions, detail in the skill |
| REQ_KAN_UPDATE | US_KAN_TOOLS | not impacted | Deliberately unchanged — see F-1 |
| REQ_KAN_CREATE | US_KAN_TOOLS | not impacted | Skeleton board unchanged; new tools reuse its owner-resolution pattern by reference |
| REQ_KAN_VERIFY | US_KAN_TOOLS | not impacted | Read-side rules unchanged; `REQ_KAN_WRITEVALID` adopts them rather than altering them |
| REQ_KAN_SCHEMA | US_KAN_BOARD | not impacted | No schema change — all four tools operate within the current schema |
| REQ_KAN_TEXTFIELD | US_KAN_TEXTFIELD | not impacted | Consumed by the new tools' type-aware rules |
| REQ_KAN_OPEN / RENDERER / UX / DISCOVER / FILEOPEN / INSTRUCTIONS | — | not impacted | No UI, discovery or hand-edit surface changes |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_KAN_WRITEVALID | Board Write Validation Contract | US_KAN_TOOLS; REQ_KAN_SCHEMA; REQ_KAN_VERIFY | mandatory |
| REQ_KAN_ADD | jarvis_addKanbanItem Tool | US_KAN_TOOLS; REQ_KAN_SCHEMA; REQ_KAN_WRITEVALID; REQ_ACT_WHOAMI | mandatory |
| REQ_KAN_DELETE | jarvis_deleteKanbanItem Tool | US_KAN_TOOLS; REQ_KAN_SCHEMA; REQ_ACT_WHOAMI | mandatory |
| REQ_KAN_LIST | jarvis_listKanbanItems Tool | US_KAN_QUERY; REQ_ACT_WHOAMI | mandatory |
| REQ_KAN_FIELDS | jarvis_updateKanbanFields Tool | US_KAN_TOOLS; REQ_KAN_SCHEMA; REQ_KAN_TEXTFIELD; REQ_ACT_WHOAMI | mandatory |

### Conflicts Detected

- ⚠️ Intake ("validate the same way `jarvis_updateKanbanItem` does") vs. `REQ_KAN_VERIFY` AC-3 (full single-select validation).
  - Resolution: new tools follow `REQ_KAN_VERIFY`'s rules via `REQ_KAN_WRITEVALID`; `REQ_KAN_UPDATE` left frozen. Recorded as `USER REVIEW REQUIRED` F-1.

### Decisions

- D-L1-1: The validation rules are extracted into their own requirement (`REQ_KAN_WRITEVALID`) rather than repeated in each tool's ACs. Four copies of a rule is four places for it to drift, and the drift would be silent — each tool would still pass its own ACs.
- D-L1-2: An unknown `status` filter on `jarvis_listKanbanItems` is an **error**, not an empty result (`REQ_KAN_LIST` AC-6). Both return nothing, but an empty list is a legitimate, actionable answer — "no items are in that state" — so a typo would be read as a fact about the board and acted on.
- D-L1-3: `labels` filtering requires **all** requested labels (AND), matching how the two filters combine. Any-of semantics would make a two-label query broader than a one-label query, which is not what "narrowing" means.
- D-L1-4: `jarvis_addKanbanItem` writes `nextId` even when the board had none (`REQ_KAN_ADD` AC-3). Deriving `max(ids)+1` on every call would keep re-deriving from data that deletion makes unreliable — a board whose highest item was deleted would reissue that id.
- D-L1-5: Deletion never touches `nextId` (`REQ_KAN_DELETE` AC-4). `REQ_KAN_SCHEMA` AC-8 makes ids permanently unique; reusing a freed id means a stale reference in a message or commit silently resolves to a different item.
- D-L1-6: `removeField`/`removeOption` name the **referencing item ids** in the error, not a count. The caller's next action is to retarget exactly those items, so the ids are the actionable part.
- D-L1-7: `addField` refuses the name `status` (`REQ_KAN_FIELDS` AC-3) and `removeField` refuses to remove it (AC-5). Exactly one status field exists by `REQ_KAN_SCHEMA` AC-3, and it defines the board's columns — a board that loses it renders nothing.
- D-L1-8: Tool descriptions stay one line, with detail in the skill (`REQ_KAN_MODULE` AC-9). This is the intake's stated pattern, promoted to an AC so the two surfaces cannot drift.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements — `REQ_KAN_WRITEVALID` adopts `REQ_KAN_VERIFY` AC-3's rules rather than restating or altering them; `REQ_KAN_UPDATE` AC-7's freeze is respected (F-1).
- [x] No redundancies — each tool requirement covers one tool; shared value rules live once in `REQ_KAN_WRITEVALID`; owner/board resolution is referenced to `REQ_KAN_CREATE` rather than copied.
- [x] All new REQs link to User Stories.

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_KAN_SKILLCONTENT | REQ_KAN_SKILLCONTENT | modified | Tools table extended to all eight tools; Workflow covers add/list/update/delete; AC-7..AC-9 |
| SPEC_KAN_MODULE | REQ_KAN_MODULE | modified | `languageModelTools` list extended with the four new tools |
| SPEC_KAN_UPDATE | REQ_KAN_UPDATE | not impacted | Referenced as the round-trip pattern by the new specs; itself unchanged (F-1) |
| SPEC_KAN_VERIFY | REQ_KAN_VERIFY | not impacted | `SPEC_KAN_WRITEVALID` reuses its field-map shape without changing it |
| SPEC_KAN_SCHEMA | REQ_KAN_SCHEMA | not impacted | No schema change |
| SPEC_KAN_CREATE / OPEN / RENDERER / UX / DISCOVER / FILEOPEN / INSTRUCTIONS | — | not impacted | Unchanged |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_KAN_WRITEVALID | Board Write Validation Helper | REQ_KAN_WRITEVALID, SPEC_KAN_VERIFY, SPEC_KAN_SCHEMA |
| SPEC_KAN_ADD | jarvis_addKanbanItem Tool | REQ_KAN_ADD, SPEC_KAN_WRITEVALID, SPEC_KAN_UPDATE, SPEC_ACT_WHOAMI |
| SPEC_KAN_DELETE | jarvis_deleteKanbanItem Tool | REQ_KAN_DELETE, SPEC_KAN_UPDATE, SPEC_ACT_WHOAMI |
| SPEC_KAN_LIST | jarvis_listKanbanItems Tool | REQ_KAN_LIST, SPEC_ACT_WHOAMI |
| SPEC_KAN_FIELDS | jarvis_updateKanbanFields Tool | REQ_KAN_FIELDS, SPEC_KAN_SCHEMA, SPEC_KAN_UPDATE, SPEC_ACT_WHOAMI |

### Conflicts Detected

None.

### Decisions

- D-L2-1: `validateItemValues` is a pure inspect-and-report helper — no I/O, no mutation (`SPEC_KAN_WRITEVALID` AC-6). That is what lets every write tool call it *before* touching the document, so the error path leaves the file byte-identical.
- D-L2-2: The helper reuses the `name → { type, options? }` field-map shape `semanticValidate` already builds. Introducing a second representation of "what this board's fields permit" would give the read and write sides independent notions of validity — the exact divergence F-1 documents.
- D-L2-3: `jarvis_listKanbanItems` uses `yaml.parse`, not `yaml.parseDocument`. The round-trip representation exists to preserve comments across a write; a read tool that never writes has no use for it and the plain parse is cheaper.
- D-L2-4: The list tool triggers **no** panel refresh (`SPEC_KAN_LIST` AC-6). Refreshing on a read would redraw the webview for an operation that changed nothing.
- D-L2-5: `SPEC_KAN_FIELDS` factors the reference guard once and both remove operations call it. The two removals differ only in what they scan for; sharing the guard keeps "refuse to strand a value" from being implemented twice with two different notions of "referenced".
- D-L2-6: Deletion uses `YAMLSeq.delete(index)` on the round-trip document rather than rebuilding the `items` sequence. Rebuilding would reformat every surviving item and violate `REQ_KAN_SCHEMA` AC-9 — the diff must be confined to what actually changed.
- D-L2-7: All four tools reuse the existing `resolveOwner` / `resolveBoardPath` helpers by reference rather than restating their behaviour. Owner resolution is already specified once (`SPEC_KAN_CREATE`) and re-specifying it per tool is how the `ownerName` confusion in the previous CR arose.
- D-L2-8: No new spec element for the skill content — `SPEC_KAN_SKILLCONTENT` already governs that file and is amended in place. A second element would split one file's contract across two documents.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs — the new specs consume `SPEC_KAN_UPDATE`'s round-trip pattern and `SPEC_KAN_VERIFY`'s field map without redefining either.
- [x] All new SPECs link to Requirements.
- [x] Add-on onboarding preflight (`SPEC_MOD_ADDON_ONBOARDING`) checked — not applicable: no new `packages/<name>` add-on is introduced.

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_KAN_TOOLS (AC-7..AC-10) | REQ_KAN_ADD, REQ_KAN_DELETE, REQ_KAN_FIELDS, REQ_KAN_WRITEVALID | SPEC_KAN_ADD, SPEC_KAN_DELETE, SPEC_KAN_FIELDS, SPEC_KAN_WRITEVALID | ✅ |
| US_KAN_QUERY | REQ_KAN_LIST | SPEC_KAN_LIST | ✅ |
| US_KAN_SKILL | REQ_KAN_SKILLCONTENT (AC-8..AC-10) | SPEC_KAN_SKILLCONTENT (AC-7..AC-9) | ✅ |

Verified by impact query, not by inspection: every new element was queried
`--direction in` and returned a child. `REQ_KAN_WRITEVALID` returns both
`SPEC_KAN_WRITEVALID` and `REQ_KAN_ADD`, confirming it is reachable as a shared
contract rather than orphaned.

### Tool-to-Element Coverage

| Tool | Requirement | Design | Manifest | Skill |
|---|---|---|---|---|
| `jarvis_addKanbanItem` | REQ_KAN_ADD | SPEC_KAN_ADD | REQ_KAN_MODULE AC-8 | REQ_KAN_SKILLCONTENT AC-8 |
| `jarvis_deleteKanbanItem` | REQ_KAN_DELETE | SPEC_KAN_DELETE | REQ_KAN_MODULE AC-8 | REQ_KAN_SKILLCONTENT AC-8 |
| `jarvis_listKanbanItems` | REQ_KAN_LIST | SPEC_KAN_LIST | REQ_KAN_MODULE AC-8 | REQ_KAN_SKILLCONTENT AC-8, AC-10 |
| `jarvis_updateKanbanFields` | REQ_KAN_FIELDS | SPEC_KAN_FIELDS | REQ_KAN_MODULE AC-8 | REQ_KAN_SKILLCONTENT AC-8 |

### Artefakt-Removal-Check

Not applicable — this CR removes no artefact. It is purely additive: four new
tools, one new shared contract, and additive ACs on three existing elements.

### Issues Found

Two interim decisions taken under `unattended` and flagged for PM above —
`USER REVIEW REQUIRED` F-1 (write-validation asymmetry with
`jarvis_updateKanbanItem`) and F-2 (rename not reachable by tool). Neither
blocks implementation; both are scope questions PM owns once reachable.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## UAT

**UAT Spec**: [SPEC_UAT_KAN_MGMT](../design/spec_uat_kanban_mgmt.rst)  
**Test Protocol**: [tst-kanban-management-tools.md](tst-kanban-management-tools.md)  
**Execution date**: 2026-08-25  
**Executed by**: Test Designer (static code analysis, commit `057632f`)

| # | Tool | Scenario | Result |
|---|------|----------|--------|
| T-1 | ADD | Auto id, nextId incremented, webview refreshes | ✅ PASS |
| T-2 | ADD | Status defaults to first declared option | ✅ PASS |
| T-3 | ADD | nextId absent → derived and written | ✅ PASS |
| T-4 | ADD/WV | Invalid single_select value → error before write | ✅ PASS |
| T-5 | ADD/WV | Undeclared field key → error (not silent write) | ✅ PASS |
| T-6 | ADD/WV | Caller-supplied id rejected | ✅ PASS |
| T-7 | DELETE | Item removed, nextId unchanged, webview refreshes | ✅ PASS |
| T-8 | DELETE | id not found → error, file unchanged | ✅ PASS |
| T-9 | DELETE | Diff confined via `YAMLSeq.delete` | ✅ PASS |
| T-10 | LIST | No filter → all items, compact projection only | ✅ PASS |
| T-11 | LIST | Status filter → matching items | ✅ PASS |
| T-12 | LIST | Labels AND filter | ✅ PASS |
| T-13 | LIST | Unknown status → error naming valid options | ✅ PASS |
| T-14 | LIST | No-match → empty list, not error | ✅ PASS |
| T-15 | FIELDS | addField text + single_select | ✅ PASS |
| T-16 | FIELDS | addField "status" rejected | ✅ PASS |
| T-17 | FIELDS | removeField no references → removed | ✅ PASS |
| T-18 | FIELDS | removeField referenced → error naming ids | ✅ PASS |
| T-19 | FIELDS | addOption; duplicate + text field rejected | ✅ PASS |
| T-20 | FIELDS | removeOption: reference + last-option guards | ✅ PASS |
| T-21 | Skill | 8 tools on separate rows; id/reuse; compact projection documented | ✅ PASS |
| T-22 | ADD/WV | Builtin key in `input.fields` rejected before validation | ✅ PASS |

**All 22 scenarios PASS.** T-21 re-derived from actual file content (fix `d1f12ed`);
T-22 added to cover builtin-key collision fix. Full evidence in
`tst-kanban-management-tools.md`.

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1 — MECE Consistency Check

**Reviewed by:** MECE Engineer
**Review date:** 2026-08-25

#### Analysis

**Mutual Exclusivity verification:**

- `REQ_KAN_WRITEVALID` (shared validation contract) ⊥ `REQ_KAN_ADD` (add items), `REQ_KAN_DELETE` (delete items), `REQ_KAN_LIST` (query items), `REQ_KAN_FIELDS` (modify fields) — validation is orthogonal to each operation; the tool requirements govern *what* the operation does, validation governs *what* values are accepted. ✅
- Each tool requirement covers exactly one operation with no overlap:
  - ADD: appends a new item; auto-assigns id
  - DELETE: removes by id
  - LIST: returns filtered compact projection (read-only)
  - FIELDS: adds/removes fields and options
  - No tool performs multiple distinct operations; no two tools perform the same operation. ✅
- Modified requirements (`US_KAN_TOOLS` AC-7..AC-10, `REQ_KAN_SKILLCONTENT` AC-8..AC-10, `REQ_KAN_MODULE` AC-8..AC-9) are additive — they add constraints/documentation without altering existing ACs. ✅

**Collective Exhaustiveness verification:**

All user needs from the intake are covered:
- "Adding an item": ✅ `REQ_KAN_ADD` + `SPEC_KAN_ADD`
- "Removing one": ✅ `REQ_KAN_DELETE` + `SPEC_KAN_DELETE`
- "Narrowing down to relevant items on a large board": ✅ `REQ_KAN_LIST` (compact projection) + `SPEC_KAN_LIST`
- "Evolving the board's own field/option set": ✅ `REQ_KAN_FIELDS` (addField, removeField, addOption, removeOption) + `SPEC_KAN_FIELDS`
- All writes validate like reads do: ✅ `REQ_KAN_WRITEVALID` (single validation contract reused by all write tools)
- "No hand-editing YAML required": ✅ `US_KAN_TOOLS` AC-10 with named exception (rename not offered)

Every observable need is addressed. ✅

**Traceability verification:**

- `US_KAN_TOOLS` (modified AC-7..AC-10) → `REQ_KAN_ADD`, `REQ_KAN_DELETE`, `REQ_KAN_FIELDS`, `REQ_KAN_WRITEVALID` → `SPEC_KAN_ADD`, `SPEC_KAN_DELETE`, `SPEC_KAN_FIELDS`, `SPEC_KAN_WRITEVALID` ✅
- `US_KAN_QUERY` → `REQ_KAN_LIST` → `SPEC_KAN_LIST` ✅
- `US_KAN_SKILL` (unchanged at US level) → `REQ_KAN_SKILLCONTENT` (modified AC-8..AC-10) → `SPEC_KAN_SKILLCONTENT` (amended) ✅
- Backward links present: All new/modified specs carry forward-links to this CR via `:links:` ✅
- Tool-to-element coverage verified: Each tool mentioned in manifest, requirements, specs, and skill (Appendix table in CD) ✅
- `REQ_KAN_WRITEVALID` bridging verified: Called by all write tools (AC references) and reuses `REQ_KAN_VERIFY` rules ✅

**Contradiction check:**

- F-1 (write-validation asymmetry): New tools use `REQ_KAN_VERIFY`'s rules; `jarvis_updateKanbanItem` frozen per `REQ_KAN_UPDATE` AC-7. This is intentional asymmetry, not a contradiction — the CD explicitly documents it as a deliberate choice (D-L1-1) and flags it for PM review. No spec contradiction. ✅
- F-2 (rename not offered): `REQ_KAN_FIELDS` AC-11 explicitly states rename is not provided. No contradiction — the requirement *names* its own limitation. ✅
- `REQ_KAN_LIST` (compact projection) vs. `US_KAN_BOARD` (full board rendering): One returns `{id, name, status, labels}` for LM context; the other renders full board in webview. Different surfaces, no contradiction. ✅
- `REQ_KAN_FIELDS` (add/remove/evolve) vs. `REQ_KAN_SCHEMA` (immutable schema): Schema shape never changes; field *definitions* (not the schema) are mutable. No contradiction. ✅
- No contradiction with existing specifications. ✅

**Orthogonality with existing specs:**

- vs. `REQ_KAN_UPDATE`: Unchanged (F-1 is a scope note, not an orthogonality issue). New tools are independent write paths with their own contracts. ✅
- vs. `REQ_KAN_VERIFY`: New tools adopt its validation rules (not override them) and trigger a schema refresh after write, same as today. ✅
- vs. `REQ_KAN_CREATE`: New tools reuse its owner-resolution pattern by reference; no change to that contract. ✅
- vs. `REQ_KAN_SCHEMA`: No schema shape change; all four tools operate within the current schema. Field *definitions* (stored in items) are mutable, but the schema's structural rules are not. ✅
- vs. `REQ_KAN_TEXTFIELD`: New tools consume it (type-aware validation, projection omits text-field values on the list tool) without redefining it. ✅

**Implementation coverage verification:**

- Shared validator: `validateItemValues` helper exists; checks single_select options + undeclared fields + callers verify before write ✅
- ADD tool: Item appending with auto-id assignment, status defaulting, nextId increment/derive ✅
- DELETE tool: Item removal by id, no renumbering, nextId untouched ✅
- LIST tool: Filtering (status AND labels), compact projection, read-only ✅
- FIELDS tool: Four operations (addField, removeField, addOption, removeOption) with reference guards ✅
- Skill updated: Tools table extended, workflow section covers add/list/update/delete, id/reuse rules documented ✅

**UAT coverage verification:**

All 21 scenarios pass (static analysis per CD):
- T-1..T-3 (ADD basic, status default, nextId derive): ✅
- T-4..T-6 (ADD/WRITEVALID validation): ✅
- T-7..T-9 (DELETE removal, id not found, diff preservation): ✅
- T-10..T-14 (LIST filtering, error vs empty): ✅
- T-15..T-20 (FIELDS add/remove field/option, guards): ✅
- T-21 (Skill documentation): ✅

No test scenario left uncovered; both defects (F-1 and F-2) are observable in UAT and documented as behavior, not deviations. ✅

#### Assessment of USER REVIEW REQUIRED Flags

**F-1 (write-validation asymmetry):**
- MECE implication: None. The asymmetry is captured in the spec via two separate contracts (`REQ_KAN_UPDATE` AC-7 vs `REQ_KAN_WRITEVALID` AC-1), both documented. The specs are internally consistent; the question is a PM scope decision on whether to unify them in a follow-up.
- No MECE issue detected. ✅

**F-2 (rename limitation):**
- MECE implication: None. The limitation is explicit in `REQ_KAN_FIELDS` AC-11 and the root cause (transactional rewrite / reference guard trade-off) is explained in the CD. The spec is consistent with the decision made.
- No MECE issue detected. ✅

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | No MECE issues detected. All 5 new requirements are mutually exclusive, collectively cover intake needs, properly traced, and consistent with existing specs. F-1 and F-2 are PM scope decisions, not spec inconsistencies. 21/21 UAT PASS. | — |

---

### Round 2 — QM Independent Review

**Reviewed by:** Quality Manager
**Review date:** 2026-08-26

#### Analysis

Traceability re-verified independently: `US_KAN_TOOLS`/`US_KAN_QUERY`/`US_KAN_SKILL`
→ `REQ_KAN_WRITEVALID`/`ADD`/`DELETE`/`LIST`/`FIELDS`/`SKILLCONTENT` →
matching `SPEC_KAN_*`, all read in full — traceability and MECE are sound, no
issue with Round 1's conclusion there. Read `packages/kanban/src/extension.ts`
directly (not just the CD's algorithm prose) for all four new tools, and
diffed the whole file against `main`. Found two defects UAT's 21 scenarios do
not exercise, both undermining this CR's own stated purpose (a write tool
that can produce a board its own verify tool rejects is not a guard).

**Finding 1** — `jarvis_addKanbanItem` (`extension.ts` L162-230, `validateItemValues`;
L690-770, the tool body): `validateItemValues` is called on a `values` object
built as `{ ...input.fields }` then overwritten by `input.status`/`labels`/
`notes`/`name` **when those top-level properties are given**. But the actual
item written to the file is built in the opposite precedence: `newItem` is
set from `input.status`/`labels`/`notes`/`name` first, then
`Object.assign(newItem, input.fields)` runs **last and unconditionally**
(L758). Any key in `input.fields` that collides with a builtin item property
— `name`, `status`, `labels`, `notes` (`id` is separately guarded and safe) —
is therefore validated as one value (or not validated at all, since builtins
other than `status` are never option/type-checked) but *written* as whatever
`input.fields` supplied, silently. Two concrete, reachable exploits, both
permitted by the tool's own `inputSchema` (`fields` is
`additionalProperties: { type: "string" }` — nothing excludes builtin names):
- `{ name: "Task", fields: { labels: "not-an-array" } }` → passes validation
  (labels is a permitted builtin, never type-checked) → writes
  `labels: "not-an-array"`, a **string** where `schemas/kanban.schema.json`
  requires an array — a schema-invalid board, written successfully, no error
  returned.
- `{ name: "Task", status: "ValidOption", fields: { status: "InvalidOption" } }`
  → `values.status` is overwritten to `"ValidOption"` before validation (passes)
  → but `newItem.status` is later overwritten *again* by `Object.assign` to
  `"InvalidOption"` — a value `validateItemValues` never actually checked,
  written to the file, tool reports success. This is a direct violation of
  `REQ_KAN_WRITEVALID` AC-1 ("SHALL match one of that field's declared
  options, else the tool SHALL return an error") and reproduces, inside this
  CR's own new code, exactly the F-1/GH #57 class of defect the CR was
  written to close for the *existing* `jarvis_updateKanbanItem` gap. None of
  T-1..T-6 exercise a `fields` map containing a builtin-named key. **High.**

**Finding 2** — `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md`
Tools table (introduced in the same commit as the implementation, `057632f`):
line 13 merges the `jarvis_updateKanbanItem` and `jarvis_addKanbanItem` rows
onto a single line with a stray `||` between them (missing newline), breaking
the two-column Markdown table for those two tools:
```
| `jarvis_updateKanbanItem` | Update fields on an existing item by ID || `jarvis_addKanbanItem` | Add a new item (auto-assigns id) |
```
This directly affects `REQ_KAN_SKILLCONTENT` AC-8 (a well-formed Tools table
listing every tool). More significantly: `tst-kanban-management-tools.md`'s
T-21 quotes this exact region as "file evidence" showing five **cleanly
separated** rows, one per line — text that does not match the real,
currently-shipped file (confirmed via `git show 057632f` — the merged row was
already present at the implementation commit, so this is not a later
regression). The Test Designer's PASS verdict for T-21 rests on evidence that
does not correspond to the actual artefact. **High** — not just a formatting
defect, but a discrepancy between cited verification evidence and reality,
the same failure class (a checkable claim that wasn't actually checked
against the real file) this whole review discipline exists to catch.

Both defects are independent of F-1/F-2 (which remain PM scope questions, not
spec contradictions — Round 1's assessment there stands). `compile all`
(core + kanban) clean; `vitest run` 406/406 (kanban has no unit tests, a
pre-existing repo convention, not a gap introduced here).

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | Implementation | `packages/kanban/src/extension.ts` L162-230 (`validateItemValues`), L690-770 (`jarvis_addKanbanItem`) | `input.fields` keys colliding with builtin item properties (`name`, `status`, `labels`, `notes`) are validated under one precedence (top-level input wins) but written under the opposite precedence (`fields` wins, via an unconditional `Object.assign` last) — allowing an unvalidated or wrongly-typed value to silently overwrite the real one. Reachable via the tool's own `inputSchema` (no exclusion of builtin names in `fields`). Can write a non-array `labels` or an undeclared `status` option with no error returned, violating `REQ_KAN_WRITEVALID` AC-1/AC-3. Not covered by T-1..T-6. **Fix:** reject `fields` keys that match a builtin property name (`name`/`status`/`labels`/`notes`), the same way `id` is already rejected, and/or validate the exact object that will be written rather than a differently-ordered merge. | High |
| 2 | Documentation + Verification evidence | `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md` L13; `docs/changes/tst-kanban-management-tools.md` T-21 | The Tools table merges two rows onto one line with a stray `||` (missing newline), introduced in the implementation commit `057632f`. `REQ_KAN_SKILLCONTENT` AC-8 requires a well-formed table listing every tool. The test protocol's T-21 "file evidence" quotes clean, correctly-separated rows that do not match the real file — the cited evidence and the shipped artefact disagree. **Fix:** correct the missing newline in `SKILL.md`; re-derive T-21's evidence from the actual file content, not from a retyped/idealized version. | High |

**Verdict: NOT CLEAR.** Two High-severity findings, both independent of F-1/F-2.
Recommend fix-now on both before merge: Finding 1 is a data-integrity/validation-bypass
defect central to this CR's own purpose; Finding 2 both breaks the skill's Tools
table and reveals that a UAT scenario's cited evidence does not match reality.

#### PM Decision

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Fix now | Real validation-bypass defect, and the specific failure class (`GH #57`/F-1) this CR exists to close — merging it unfixed would ship the exact bug the CR is meant to prevent, inside the CR's own new code. Fix: reject `fields` keys colliding with a builtin property name (same as `id` already is), or validate the object that actually gets written. |
| 2 | Fix now | Two issues bundled: a broken skill table (user-visible, breaks REQ_KAN_SKILLCONTENT AC-8) and a verification-integrity gap (T-21's cited evidence doesn't match the real file). Both are cheap to fix and the second one needs to not recur — re-derive T-21 from the actual file, not a retyped version. |

Both routed back to CM for fix + re-verify before merge.

---

### Round 3 — QM Re-verify

**Reviewed by:** Quality Manager
**Review date:** 2026-08-26

#### Analysis

Re-verified both Round 2 findings independently against the actual fix commit
`d1f12ed` (not just CM's description of it).

**Finding 1 (validation bypass) — RESOLVED.** `extension.ts` L727-739 now
rejects any `input.fields` key matching `builtinProps = {id, name, status,
labels, notes}` **before** the `values` object is built and before
`validateItemValues` runs — returning `{ error: "\"<key>\" must be set as a
top-level parameter, not via fields." }` with no document mutation. Because
`input.fields` can no longer contain a builtin key by construction, the
`values`/`newItem` merge-order asymmetry that caused the original bypass is
now moot — both objects only ever receive builtin values from the top-level
input and non-builtin values from `fields`, consistently. Re-ran both Round 2
exploit scenarios by hand against the new code: `fields: { labels:
"not-an-array" }` → rejected upfront; `status: "Valid", fields: { status:
"Invalid" }` → rejected upfront. Both closed. `Object.assign` was also
replaced with an explicit loop, which is equivalent now that builtins are
pre-filtered — no behavioural difference for non-builtin keys.

**Finding 2 (SKILL.md table + evidence integrity) — RESOLVED.** Read the
current `SKILL.md` directly (not the commit message): the Tools table now has
all 8 tools on 8 separate, correctly-formatted rows. T-21's evidence in
`tst-kanban-management-tools.md` was re-derived and now quotes this exact,
verified-current content — evidence and artefact agree.

**Two Low, non-blocking observations** (not part of Round 2, found during
this re-verify, do not affect the verdict):
- The new error message — `"${key}" must be set as a top-level parameter,
  not via fields.` — is accurate for `name`/`status`/`labels`/`notes`, but
  slightly misleading for `id`: there is no top-level `id` parameter on this
  tool at all (confirmed via `package.json`'s `inputSchema` — `id` is never
  settable). A caller who hits this for `id` may retry with a nonexistent
  top-level `id` field. Cosmetic; consider a dedicated message for `id`.
- T-6's cited evidence (`validateItemValues` L164-166, the `'id' in values`
  guard) is now dead code on the only call path (`jarvis_addKanbanItem`),
  since the new builtinProps rejection at L727-739 intercepts `fields.id`
  first and `validateItemValues` has no other caller. The guard itself is
  harmless to keep (defense in depth), but T-6's evidence should eventually
  be updated to cite the actual enforcing code path rather than a superseded
  one — same spirit as the Round 2 Finding 2 concern, at negligible severity
  since the observable behaviour (rejection) is still correct either way.

`compile all` (core + kanban) clean; `vitest run` 406/406.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | Implementation | `packages/kanban/src/extension.ts` L727-739 | (Informational — Low, non-blocking) Error message for a rejected `fields.id` key implies a top-level `id` parameter exists; it does not. | Low |
| 2 | Test evidence | `docs/changes/tst-kanban-management-tools.md` T-6 | (Informational — Low, non-blocking) T-6 cites `validateItemValues`'s `'id' in values` guard, which is now unreachable dead code on the `addKanbanItem` path since the new builtinProps check intercepts first; evidence should eventually point at the actual enforcing code. | Low |

**Verdict: QM CLEAR.** Both Round 2 High findings resolved at the root; fix
independently re-verified against the actual diff, not the fix commit's
description. Two Low, non-blocking observations noted for optional cleanup;
neither blocks merge. F-1/F-2 USER REVIEW REQUIRED flags remain open PM/user
scope decisions, unrelated to this round.

#### PM Decision

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Defer | Cosmetic error-message wording, no functional impact — a caller hitting it for `id` still gets rejected correctly, just with a slightly imprecise reason. Logged to backlog rather than another CM round-trip for a wording tweak. |
| 2 | Defer | Test evidence pointing at now-superseded (but still harmless, defense-in-depth) code. No observable behaviour is wrong. Logged to backlog alongside finding 1 — both are small enough to batch into a future doc-polish pass rather than justify a dedicated re-verify cycle now. |

Both logged as backlog item 14.

---

## Appendix: Link Discovery Results

```
# US_KAN_TOOLS --direction in --depth 1
linked_from: US_UAT_KANBAN, REQ_KAN_CREATE, REQ_KAN_VERIFY, REQ_KAN_OPEN,
             REQ_KAN_MODULE, REQ_KAN_UPDATE, US_KAN_SKILL

# US_KAN_BOARD --direction in --depth 1
linked_from: US_UAT_KANBAN, REQ_KAN_SCHEMA, REQ_KAN_RENDERER, REQ_KAN_UX,
             REQ_KAN_MODULE, REQ_KAN_FILEOPEN, US_KAN_TEXTFIELD

# US_KAN_SKILL --direction in --depth 1
linked_from: REQ_KAN_SKILLCONTENT, REQ_KAN_INSTRUCTIONS, US_UAT_KAN_SKILL

# Post-write verification of new elements (--direction in --depth 1)
US_KAN_QUERY       -> REQ_KAN_LIST
REQ_KAN_WRITEVALID -> REQ_KAN_ADD, SPEC_KAN_WRITEVALID
REQ_KAN_ADD        -> SPEC_KAN_ADD
REQ_KAN_DELETE     -> SPEC_KAN_DELETE
REQ_KAN_LIST       -> SPEC_KAN_LIST
REQ_KAN_FIELDS     -> SPEC_KAN_FIELDS
```

---

*Generated by syspilot Change Agent*
