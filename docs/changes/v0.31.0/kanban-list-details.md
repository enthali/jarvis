# Change Document: kanban-list-details

**Status**: in-progress
**Branch**: feature/kanban-list-details
**Created**: 2026-10-16
**Author**: PM
**Operation Mode**: user-guided

- **user-guided** — every actor involves the user in its decision-making before proceeding.

---

## Summary

Extend `jarvis_listKanbanItems` so callers can request the full content of each card. An opt-in option `details: true` returns all fields of each matching card, notes included, in the same response shape `{ path, count, items }`. The default stays as today (`id`, `name`, `status`, `labels`), so existing callers are not affected. Motivation: today callers get a reduced projection and must read the board file directly to see a card's content. Acceptance criteria: (1) without the option, each item contains `id`, `name`, `status` and `labels`, as before; (2) with `details: true`, each item contains all fields of the card; (3) `status` and `labels` filters and `count` behave as before; (4) a read-only board overview tool, next to the list tool, returns the declared status values with their card counts (empty columns included) and the labels in use with their counts, for the same owner and board inputs; (5) the board skill (`packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md`) no longer tells callers to omit `ownerName` for their own board in workflow step 1, since `ownerName` is required.

---

## Level 0: User Stories

**Status**: ✅ completed (approved by the user 2026-10-16)

### Impacted User Stories

Found via `US_KAN_QUERY` (`--direction in`: `REQ_KAN_LIST`, `US_UAT_KAN_MGMT`).

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_KAN_QUERY | Query a Board Without Reading All of It | modified | AC-2 now says "by default"; new AC-6: full contents of the matching items on request, never by default; new AC-7: ask a board for its status values and labels with card counts, to build a filter |
| US_UAT_KAN_MGMT | Kanban Management Tools Acceptance Tests | modified (L2, user D-13) | AC-11 nine tools and statements; new AC-12 (details, T-22..T-24) and AC-13 (filter values, T-25..T-27) |
| US_KAN_SKILL | Kanban Skill | unchanged | Owner rule (own name for own board) is met only when Workflow step 1 agrees with the Owner Resolution section (backlog #67, Summary criterion 5). Rows added 2026-10-17, see Scope additions |
| US_KAN_DISCOVER | Board Discovery and Entry Points | unchanged | AC-6 "Add Kanban Board" on Actor nodes; the shipped menu condition did not match (menu defect I-9). Rows added 2026-10-17, see Scope additions |

### New User Stories

_(none: the need is one more acceptance criterion of the existing query story)_

### Decisions

- D-1 (user, 2026-10-16): The default list stays as it is today: `id`, `name`, `status`, `labels` per item. This replaces acceptance criterion (1) of the Summary ("exactly `id` and `name`"). Reason: `status` and `labels` are what lets the caller spot the relevant items in an unfiltered list and build a filter (labels are free text on the items; there is no declared label list, so the items are the only place to read them from). Nothing breaks for existing callers.
- D-2 (user): The goal is not having to read all done items, or the items of an irrelevant column, but to get a short list first and the details only of the items found relevant. `details: true` is the second step; it returns everything, notes included, but only for the matching items. Whoever wants the whole board can read the file.
- D-3 (SD): No new story: `US_KAN_QUERY` already carries the intent (result size scales with the matches); `US_KAN_QUERY` AC-2 stays true for the short list and AC-6 adds the explicit full-content request.
- D-7 (user and PM, 2026-10-16): The overview tool is in this change (Summary criterion 4). It serves the same story, so it is `US_KAN_QUERY` AC-7, not a new story: the purpose is the same, narrowing a board without reading all of it, and a filter can only be built from known status values and labels. Labels are free text on the cards (no declared list), the status values are declared on the board's `status` field, empty columns included.

### Horizontal Check (MECE)

- [ ] No contradictions with existing User Stories
- [ ] No redundancies
- [ ] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ completed (approved by the user 2026-10-16)

### Impacted Requirements

Found via links from `US_KAN_QUERY` (`REQ_KAN_LIST`) and from `REQ_KAN_SKILLCONTENT` (it states the projection).

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_KAN_LIST | US_KAN_QUERY | modified | Description; AC-1 (optional `details`); AC-3 and AC-4 (compact unless `details`; the notes hint no longer says "read the item by id"); new AC-9 (`details: true` = full contents of the matching items) and AC-10 (`details` changes only what each item carries) |
| REQ_KAN_SKILLCONTENT | US_KAN_SKILL | modified | AC-10: the skill states the compact default and `details: true` |
| REQ_UAT_KAN_MGMT | US_UAT_KAN_MGMT | modified (L2) | AC-7 range T-1..T-27; link `REQ_KAN_FILTERVALUES` added |
| REQ_KAN_MODULE | US_KAN_TOOLS | unchanged | AC-8 declares an entry for every registered tool (covers the new one), AC-9 asks for a one-line `registerTool` description; neither names the output |
| REQ_KAN_SKILLCONTENT | US_KAN_SKILL | unchanged | AC-4 states the owner rule the skill must match (`ownerName` always supplied; own name for own board; REQ_KAN_CREATE AC-3 requires it); asset Workflow step 1 contradicts it (I-8) |
| REQ_KAN_UX | US_KAN_DISCOVER | unchanged | AC-6 "Add Kanban Board" on Actor nodes (`contextValue` `jarvisActor`); the `when` clause in `packages/kanban/package.json` did not match it (I-9) |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_KAN_FILTERVALUES | jarvis_listKanbanFilterValues Tool | US_KAN_QUERY; REQ_ACTOR_WHOAMI | required |

### Conflicts Detected

- `REQ_KAN_LIST` AC-4 said a caller needing notes and declared-field values "reads the item by `id`", but no tool reads an item by id (the tools list, add, update, delete); the caller read the board file. Resolved: the caller now requests `details`.

### Decisions

- D-4 (SD): `details` is a boolean; only `true` turns it on. Absent or `false` is the compact projection. Reason: a non-boolean value (a string `"true"`) must not silently widen the result to whole items, because the point of the story is the result size.
- D-5 (user, 2026-10-16): With `details: true` the item carries the short-list fields (`labels` as a list, empty when the card has none) and everything else the card has. So the short list is always a subset of the long one, and a card does not change shape between the modes. Filters, `count` and `{ path, count, items }` are the same in both modes (`REQ_KAN_LIST` AC-10).
- D-6 (SD, replaced by D-7 and the new requirement): there was no tool that returned the declared status values (the columns) or all labels of a board; labels could only be derived from the short list, status values only from the error for an unknown status filter (`REQ_KAN_LIST` AC-6) or from the file. `REQ_KAN_FILTERVALUES` closes this.
- D-8 (SD): The tool is named `jarvis_listKanbanFilterValues`: the name says what comes back, the values the filters of `jarvis_listKanbanItems` take (proposed, to be confirmed by the user). It returns only status values and labels with counts, no card content (`REQ_KAN_FILTERVALUES` AC-6); other declared fields are not filters of the list tool and are not included.

### Horizontal Check (MECE)

- [ ] No contradictions with existing Requirements
- [ ] No redundancies
- [ ] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed (approved by the user 2026-10-16; new elements approved, `implemented` is VE's status)

### Impacted Design Elements

Found via `REQ_KAN_LIST`, `REQ_KAN_SKILLCONTENT`, `REQ_KAN_MODULE` and `REQ_UAT_KAN_MGMT` (`--direction in` from the requirements; the skill and module specs are the consumers of the tool list).

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_KAN_LIST | REQ_KAN_LIST; REQ_KAN_FILTERVALUES | modified | `details` option; per-item shape; pure module `boardQuery.ts` (D-12); AC-3 and new AC-8..AC-11; status stays `implemented` (D-15) |
| SPEC_KAN_SKILLCONTENT | REQ_KAN_SKILLCONTENT (AC-8, AC-10) | modified | nine tools; Workflow shows the values tool and `details`; the wrong "fetch by id" advice is removed (I-1); status stays |
| SPEC_KAN_MODULE | REQ_KAN_MODULE (AC-8) | modified | `languageModelTools` gains the values tool; status stays `draft` |
| spec_uat_kanban_mgmt.rst (T-21) | REQ_UAT_KAN_MGMT (AC-7); US_UAT_KAN_MGMT (AC-11) | modified | nine tools; projection and details wording |
| SPEC_KAN_SKILLCONTENT (Owner Resolution, Workflow) | REQ_KAN_SKILLCONTENT (AC-4) | unchanged | Owner Resolution states the rule; the spec Workflow has no "omit `ownerName`" sentence (checked 2026-10-17). The asset is the defect (I-8) |
| SPEC_KAN_UX (AC-7) | REQ_KAN_UX (AC-6) | unchanged | Context menu on Actor nodes is `viewItem == jarvisActor`, group `kanban@1`; the shipped `when` clause did not match (I-9) |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_KAN_FILTERVALUES | jarvis_listKanbanFilterValues Tool | REQ_KAN_FILTERVALUES; SPEC_KAN_LIST |

### Conflicts Detected

- C-1: The skill asset and `SPEC_KAN_SKILLCONTENT` advised reading an item by id ("use item id to fetch full details"); no tool does that. Resolved: the advice goes and `details` is the way (I-1).
- C-2: The test `kanban-ownername-required.test.ts` asserts exactly eight kanban tools; the ninth tool changes that count. Resolved in the design: the test changes with the tool (I-2).
- C-3: `REQ_KAN_LIST` AC-9 and `REQ_KAN_FILTERVALUES` AC-3 and AC-8 were extended after the L1 approval to carry the user's decisions D-9 and D-10. Resolved for `REQ_KAN_LIST` AC-9 and the "neither listed nor counted" clause (REQ_KAN_FILTERVALUES AC-8, SPEC_KAN_FILTERVALUES AC-8): the user confirmed them via PM on 2026-10-16. Closed for `REQ_KAN_FILTERVALUES` AC-3: the user confirmed via PM on 2026-10-16 that AC-3 stays as at HEAD (a board without a status field returns an error).

### Decisions

- D-9 (user, 2026-10-16): `details` with any value other than `true` or `false`, `null` included, returns `{ error: "details must be true or false" }` and no items, as an unknown status filter does. A typo must not silently change the result. Extends `REQ_KAN_LIST` AC-9.
- D-10 (user, 2026-10-16): The overview lists only what the board declares. A card whose status has no declared option, and a label entry that is not text, are neither listed nor counted; `jarvis_verifyKanbanSchema` reports them. A board without a `status` field returns an error, since there are no columns to list. Extends `REQ_KAN_FILTERVALUES` AC-3 and adds AC-8.
- D-11 (user, 2026-10-16): Status values in declared order; labels sorted by name by Unicode code point (not by UTF-16 code unit, not locale-dependent); names exact, case and spaces significant (`Urgent` and `urgent` are two labels). `SPEC_KAN_FILTERVALUES` AC-5, AC-6.
- D-12 (user, 2026-10-16; narrowed per QM F-7 and the PM disposition): The filter, shape and count logic is a pure module `packages/kanban/src/boardQuery.ts` without a `vscode` import. The handlers keep owner resolution, file access and parsing. Tests in `src/tests/kanban-board-query.test.ts` call the module and do not compare a copy of the logic (as `kanban-ownername-required.test.ts` does). Exception: the static checks in that file, the `describe` blocks "module boundary (D-12) and wiring of the two tools" and "skill asset and README", read and match source, manifest, skill and README text against the spec wording. The existing listing logic moves into the module. Two behaviour points are stated in `SPEC_KAN_LIST` step 6 and kept as the current code has them: a `labels` value that is not a list projects as `[]`, and the labels filter matches whole labels only, never a substring.
- D-13 (user, 2026-10-16): Acceptance tests extended: `US_UAT_KAN_MGMT` AC-12 (details, T-22..T-24) and AC-13 (filter values, T-25..T-27); `REQ_UAT_KAN_MGMT` AC-7 covers T-1..T-27. The sample fixture has no empty column and no undeclared status, so T-25 and T-27 use variants made in the copy.
- D-14 (SD): The default of `jarvis_listKanbanItems` stays. `details` never changes which items match (`REQ_KAN_LIST` AC-10). Both the option and the values tool are read-only and do not refresh panels.
- D-15 (SD): Statuses of existing elements are not changed: `SPEC_KAN_LIST`, `REQ_KAN_LIST`, `SPEC_KAN_SKILLCONTENT` and `REQ_KAN_SKILLCONTENT` stay `implemented`, `SPEC_KAN_MODULE` stays `draft`. VE re-verifies the changed parts. The new `REQ_KAN_FILTERVALUES` and `SPEC_KAN_FILTERVALUES` are set to `approved` when the user approves L2; `implemented` is VE's status after verification.
- D-16 (SD): Test IDs T-22..T-27 are numbers of `spec_uat_kanban_mgmt.rst`. `spec_uat_kanban_update_valid.rst` refers to a removed T-22 of a former UAT (PM backlog #40). That is another file, but PM should know that the number is used here too.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs (C-1, C-2, C-3 resolved; C-3 closed 2026-10-16 by the user via PM)
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_KAN_QUERY AC-2, AC-6 | REQ_KAN_LIST AC-1, AC-3, AC-4, AC-8..AC-10 | SPEC_KAN_LIST AC-3, AC-7..AC-11 | ✅ |
| US_KAN_QUERY AC-7 | REQ_KAN_FILTERVALUES AC-1..AC-8 | SPEC_KAN_FILTERVALUES AC-1..AC-10 | ✅ |
| US_KAN_QUERY AC-2 (skill statement) | REQ_KAN_SKILLCONTENT AC-8, AC-10 | SPEC_KAN_SKILLCONTENT (Tools, Workflow, AC-7, AC-8) | ✅ |
| US_KAN_QUERY (tool registration) | REQ_KAN_MODULE AC-8, AC-9 | SPEC_KAN_MODULE; SPEC_KAN_FILTERVALUES AC-10; SPEC_KAN_LIST AC-11 | ✅ |
| US_UAT_KAN_MGMT AC-11..AC-13 | REQ_UAT_KAN_MGMT AC-5, AC-7 | spec_uat_kanban_mgmt T-21..T-27 | ✅ |
| US_KAN_SKILL; Summary criterion (5) | REQ_KAN_SKILLCONTENT AC-4 | SPEC_KAN_SKILLCONTENT (Owner Resolution, Workflow) | asset fixed in `a99f443` (verified on disk); T-29 reads Workflow step 1 statically, `4556d06` (I-8) |
| US_KAN_DISCOVER AC-6 | REQ_KAN_UX AC-6 | SPEC_KAN_UX AC-7 | menu `when` clause committed in `0b87b74` (verified on disk); Files-node check in the EDH is a merge gate (I-9) |

### Artefakt-Removal-Check

*Fill in only when this CR removes an artefact (file, field, configuration key, REQ-ID).*

No artefact is removed. The default projection and its fields stay. The statement "use item id to fetch full details" is corrected, not retired: it was wrong (I-1). Searched `docs/**/*kan*.rst` and `packages/kanban/**`: the statement occurs only in the skill asset, Workflow step 5.

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| none | none | none | docs/changes/v0.26.0/tst-kanban-management-tools.md:387 ("use item id to fetch full details"; acceptable historic stranding) |

- [x] All class (a) active code/workflow references: asset fixed; provisioned copy pending (I-3, T-21)
- [x] All class (b) active documentation references fixed in this CR (none removed)
- [x] Class (c) historical Change Documents accepted as "acceptable historic stranding" and disclosed above (see the Round 2 record)

### Issues Found

- [ ] I-1: The skill asset (`packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md`, Workflow step 5) says the projection needs "use item id to fetch full details". No tool reads one item by id. Corrected in the spec (`SPEC_KAN_SKILLCONTENT`); Dev changes the asset.
- [ ] I-2: `src/tests/kanban-ownername-required.test.ts` lists eight kanban tools and asserts exactly eight. With `jarvis_listKanbanFilterValues` there are nine: Dev adds the name to the list and changes the count (`SPEC_KAN_FILTERVALUES` AC-10).
- [ ] I-3: `.github/skills/jarvis-kanban.board/SKILL.md` in the workspace is provisioned from the asset at activation and is not tracked by git. T-21 reads the provisioned copy, so the skill must be provisioned again (activation) after the asset change and before T-21 runs.
- [ ] I-4: Test IDs T-22..T-27 in `spec_uat_kanban_mgmt.rst` (D-16).
- [ ] I-5: Release note for the Release Engineer: the default stays; `details` and the values tool are new. `docs/releasenotes.md` has uncommitted changes from another actor; not touched here.
- [ ] I-6 (pre-existing, for PM backlog, not changed here): `kanban-ownername-required.test.ts` copies `resolveOwner` into the test instead of testing the code. The new tests use the module (D-12).
- [ ] I-8 (PM 2026-10-17, backlog #67, Summary criterion 5): the asset's Workflow step 1 (`packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md`, line 103) says "(omit `ownerName` for your own board)". It contradicts the asset's own Owner Resolution (line 23) and REQ_KAN_SKILLCONTENT AC-4. Fixed in `a99f443` (Dev, one line, verified on disk). No SPEC change needed. T-11 covers Owner Resolution; T-29 is the static check of Workflow step 1 (no "omit `ownerName`" text in the bundled SKILL.md), agreed by PM and the user 2026-10-18. Guards `c88adc6`, `0c2b0ea`; Evidence `4556d06`, `1cd6557`. I-3 applies to the provisioned copy.
- [ ] I-9 (2026-10-17, menu defect found by the user in the EDH): the `when` clause of the `jarvis.createKanbanBoard` context entry in `packages/kanban/package.json` (line 77) did not match `jarvisActor`. Fix (PM option b): `viewItem =~ /^jarvis(Session|Project|Event)/ || viewItem == jarvisActor`. Committed as `0b87b74` (Dev, one line, verified on disk by CM). Actor-node check: confirmed by the user. Files-node check (entry must not appear on Files nodes): T-28 part (a) automated and passing (`0c2b0ea`); part (b) manual in the EDH, NOT RUN; merge gate.
- [ ] I-7 (corrected 2026-10-16: not a committed defect): the committed `packages/kanban/package.json` (HEAD) is correct; `ownerName` is required on every kanban tool and there is no `jarvis_whoAmI` text. The working tree holds an older, uncommitted version of that file (version 0.29.0 instead of 0.30.0, the old owner text, no `required: ["ownerName"]`). The same applies to `packages/core`, `pim`, `recorder`, `suite` and `syspilot` `package.json`, the agent files and `docs/releasenotes.md`. These changes are not ours; their owner decides. They must not be committed as they stand: they would re-introduce the removed tool text and fail `src/tests/kanban-ownername-required.test.ts`.

### Sign-off

- [ ] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [ ] All conflicts resolved
- [ ] Traceability verified
- [ ] Ready for implementation

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** Quality Manager. **Addressee:** Project Manager.
**Review date:** 2026-10-16
**Reviewed revision:** `dd21550`. Code, specs, tests and change documents are identical to `e0f3068`; the three later commits touch only actor memory. Branch `feature/kanban-list-details`; shared tree clean before this entry.
**Verdict:** Verification: FINDINGS. Overall: not eligible for user validation while F-1 is open. The sign-off boxes stay open; the Artefakt-Removal ticks and C-3 are not complete (F-4, F-6).

#### Per-Level Results

| Level | Result | Basis |
|-------|--------|-------|
| L0 | PASS | US_KAN_QUERY AC-2, AC-6 and AC-7 state the intent: default kept, full items only on request, overview for building filters. D-1..D-3 and D-7 agree with them. |
| L1 | FINDINGS | REQ_KAN_FILTERVALUES AC-8 is not met by the code (F-1). The texts of REQ_KAN_LIST AC-9 and of the "neither listed nor counted" clause entered after the L1 approval (F-4). Both FILTERVALUES elements are marked `implemented` (F-3). |
| L2 | FINDINGS | SPEC_KAN_FILTERVALUES step 5 ("for each item") contradicts its own AC-8 and D-10; the code follows step 5 (F-1). |
| Code vs spec | FINDINGS | Reproduced on the compiled pure module (F-1, F-5). Handler order, owner resolution, no write and no panel refresh match the spec by static check. |
| Schema / Trace | PASS | Strict Sphinx build: 0 warnings. |

#### Findings

**F-1 (Medium, verification).** `filterValues` in `packages/kanban/src/boardQuery.ts` counts the labels of every card, including cards whose status has no declared option. Reproduced on the compiled module with an in-memory board: card `undeclared` (status `Mystery`, labels `ghostlabel`, `keep`) and card `declared` (status `Todo`, labels `keep`) give `ghostlabel: 1` and `keep: 2`. `SPEC_KAN_FILTERVALUES` AC-8, `REQ_KAN_FILTERVALUES` AC-8 and D-10 require `keep: 1` and no `ghostlabel`.
Root cause is partly in the spec: step 5 says "for each item" without the declared-status condition, so the code follows the step, while AC-8 and D-10 say otherwise. Route to SD first (step wording), then Dev (exclude such items before counting).
Coverage gap: the automated test "AC-8: an item whose status has no declared option is not counted" checks status counts only; its undeclared card has no labels. The VE's Round 2 statement that AC-8 is proven does not cover the label half. T-27 step 4 checks the status outcome only and does not say whether that card's labels count.

**F-2 (Medium, scope; PM decision).** Commits outside this change are on the branch (`git log development..HEAD`, `git diff development...HEAD`), and the change document names none of them:
- `feeb1b5` (before the change's first commit, not on `development`) touches `README.md`, `docs/design/spec_eng.rst`, `docs/requirements/req_eng.rst`, `docs/requirements/req_aut.rst`, `.github/agents/syspilot.docu.agent.md` and `.github/agents/syspilot.pm.agent.md`. It downgrades `REQ_ENG_ACTORLIST` and `SPEC_ENG_ACTORLIST` from `implemented` to `approved` (`development` has `implemented`) and changes their text, including the documented meaning of `agent` in `listActors()`. It adds the removed `jarvis.heartbeatConfigFile` row to the root README (absent on `development`), so CD I-6's "pre-existing" label does not hold for the README.
- `e58100c` (PM decision, UAT overview wording): `docs/userstories/us_uat.rst`, `docs/requirements/req_uat.rst`.
- `a4ae8ee` (T-19 wording for `jarvis_updateKanbanFields`, not list details): `docs/design/spec_uat_kanban_mgmt.rst`. The CM lists it in scope; the change document does not.
Recommendation: move the unrelated commits into their own change, or disclose each with its own status decision. Remove the README row before merge.

**F-3 (Medium, status metadata).** `REQ_KAN_FILTERVALUES` and `SPEC_KAN_FILTERVALUES` carry `:status: implemented`. D-15 sets `approved` on user approval and `implemented` only after verification. C-3 and the sign-off are open, and F-1 is open. Recommendation: `approved` until F-1 is fixed and the user has confirmed the final texts. QM does not change statuses.

**F-4 (Medium, process; C-3 not complete).** The texts of REQ_KAN_LIST AC-9 and of the "neither listed nor counted" clause (REQ_KAN_FILTERVALUES AC-8, SPEC_KAN_FILTERVALUES AC-8) entered with `bf06c1b`, after the L1 approval (`62b0f83`) and before the L2 approval (`2496a78`). The change document records no confirmation of those final texts, and its own Horizontal Check says "C-3 open". The Level 2 tick "No contradictions" is therefore premature. The confirmation should follow the F-1 fix, or the text should change by user decision.

**F-5 (Low, behaviour claim).** D-12 says the listing logic moves "without a change in behaviour". For a non-list `labels` value the projection now returns `[]` (the old handler returned the raw value), and the `labels` filter no longer matches a substring (the old `(i.labels as string[]) ?? []` matched `'ok'.includes('o')`). Reproduced: projection `[]`; filter `['o']` matches nothing. Malformed data only, and `jarvis_verifyKanbanSchema` flags it. Either state the change in `SPEC_KAN_LIST` step 6 or restore the old behaviour.

**F-6 (Low, Artefakt-Removal ticks).**
- Class (c) is "none" here and in the VE report. That is not correct: `docs/changes/v0.26.0/tst-kanban-management-tools.md:387` still says "use item id to fetch full details". It is acceptable historic stranding under the change document's own rule, but it must be disclosed. The search `docs/**/*kan*.rst` misses it.
- Class (a) "fixed": the asset and the specs are fixed. The provisioned workspace copy `.github/skills/jarvis-kanban.board/SKILL.md` (untracked) still has the removed advice at line 105 and lacks `jarvis_listKanbanFilterValues`. Provisioning must run before T-21 (I-3). The tick should read "asset fixed; provisioned copy pending".
- Class (b): `docs/releasenotes.md` has no hit (checked).

**F-7 (Low, CD accuracy).**
- The Level 2 Horizontal Check ticks "No contradictions" while C-3 is open.
- I-1 and I-2 are unchecked although the asset and test changes are on the branch.
- D-12 says the new tests "do not compare source text". `src/tests/kanban-board-query.test.ts` (lines 234 to 310: module boundary, handler order, descriptions, skill asset) does. Narrow D-12, or name these as a static-check exception.

**Observations (no finding).**
- Known limit (step 6 cannot see an explicit `refreshKanbanPanel`): the static test "SPEC_KAN_FILTERVALUES AC-9 / SPEC_KAN_LIST AC-6" searches the shared query block for `writeFileSync`, `refreshKanbanPanel` and `openKanbanPanel`, so explicit calls are caught there. Calls through a helper are caught by neither check. Accepted as disclosed.
- Pre-existing skill step 1 "omit `ownerName` for your own board" (F-4 in the CM's list) is untouched by this change: the asset diff has only the Tools table and step 5. PM backlog, as the CM states.

**Checks run by QM on this revision.**
- Full suite: 538/538 pass, 54 files.
- Compile-all equivalent (seven packages, Flow and Kanban bundles): no errors.
- Strict Sphinx build (`-E -a -W --keep-going`): 0 warnings.
- Reproduction on the compiled `boardQuery.js` with in-memory boards (F-1, F-5). No repository file changed.
- Not run: protocol cases T-1..T-27 (EDH, user's). Validation not requested, because verification is open.

#### PM Decisions

Recorded by Change Manager from the Project Manager disposition (2026-10-16, 18:26).

- **F-1 fix now, in order:** System Designer fixes SPEC_KAN_FILTERVALUES step 5 (undeclared-status items count neither status nor labels, per AC-8); then Dev Engineer fixes `filterValues`; then Test Designer adds the label half of the AC-8 test and T-27 step 4.
- **F-3 fix now:** REQ_KAN_FILTERVALUES and SPEC_KAN_FILTERVALUES return to `approved` until F-1 is closed.
- **F-2 (PM decision, option B):** keep `feeb1b5`, `e58100c` and `a4ae8ee` on this branch and disclose each with its own status decision. `feeb1b5` (README, spec_eng, req_eng, req_aut, syspilot.docu and syspilot.pm agents; downgrades REQ_ENG_ACTORLIST and SPEC_ENG_ACTORLIST to approved): status decision open, PM to state. `e58100c` (us_uat, req_uat; UAT overview wording): status decision open, PM to state. `a4ae8ee` (spec_uat_kanban_mgmt; T-19 wording for jarvis_updateKanbanFields): wording only, no status change. README: the `jarvis.heartbeatConfigFile` row is removed in `97b36c2`; the seven other settings rows were checked against code (Documentation Engineer, no mismatch).
- **F-4 (user, via PM):** the REQ_KAN_LIST AC-9 text and the "neither listed nor counted" clause are confirmed (approved). C-3 for REQ_KAN_FILTERVALUES AC-3 stays open.
- **F-6 fix now:** the class (c) hit in `docs/changes/v0.26.0/tst-kanban-management-tools.md` is disclosed as historic stranding. The provisioned skill copy is handled with T-21.
- **F-7 fix now:** System Designer narrows D-12 and names the static checks as an exception.
- **F-5 (PM, from the user):** keep the current behaviour: non-list tools project labels as an empty list, and the labels filter matches a whole label. SPEC_KAN_LIST step 6 states the change and D-12 is corrected (SD, pending).
- **Level 2 Horizontal Check (PM):** "No contradictions" is unticked until C-3 closes.
- **Status rule (user, via PM, clarified 2026-10-16):** a passing test counts for an AC only if it asserts that AC's condition. implemented needs passing unit tests of that kind; approved stays until validation. A status commit after such unit tests does not need VE verification. feeb1b5 items (REQ_ENG_ACTORLIST, SPEC_ENG_ACTORLIST): VE test evidence at 0299f84 (clean worktree): coreApi.test.ts 16/16, actorRuntime.test.ts 8/8, actorScanner.test.ts 3/3, all pass. Spec-code mismatches (agent, missing summary, shared projection claim, untested empty-cache and no-rescan cases) decided by the user via PM: spec change and claim removal by SD, test-only change by Dev. Landed: spec text and claim removal in 18a8bf0 (SD); test-only change in a685b19 (Dev, 9/9 pass); both set to implemented in 40a5f93 (SD), after the tests passed. e58100c items (UAT overview wording): approved.
- **F-1 closed (Change Manager record):** Dev fix `24602ba` (boardQuery.ts and kanban-board-query.test.ts); TD protocol `c61b4be` (AC-8 label half, T-27 step 4; T-27 stays NOT RUN). VE re-check at `5ed617a` closes F-1 (unit and fake-host evidence, not an EDH run). QM re-verified `24602ba` and `c61b4be`, no change to code, specs or tests since. VE's Round 3 withdrawal is lifted for AC-8 only. VE's Round 4 is uncommitted and awaits PM. I-1 and I-2 stay unticked until verified. No status change beyond the above.
- No sign-off tick and no status change beyond the above.

---

### Round 2 follow-up (Change Manager record, 2026-10-16)

- **G1–G4 (PM option 1):** handler tests added by Dev in `f6ac58a` (`src/tests/kanban-filtervalues-handler.test.ts`, 14 tests: G1 AC-1, AC-3, AC-7; G2 AC-2; G3 AC-8; G4 AC-6). Dev reports 566/566 passing at `f6ac58a`.
- **E-1 (ajv; the AC-8 verify-label test depended on the environment):** no commit. `packages/kanban/package.json` already declares `"ajv": "^8.17.0"` at HEAD `f6ac58a`, and a clean `npm ci` resolves ajv 8.20.0 for the handler. QM closed E-1 on that basis (PM, 2026-10-16). The lockfile version drift (0.29.0 against 0.30.0) is outside this CR and is in the PM backlog.
- **Status:** no move. `REQ_KAN_FILTERVALUES` and `SPEC_KAN_FILTERVALUES` stay `approved` until the user's EDH validation (PM decision).
- **Artefakt-Removal-Check, class (c):** the hit in `docs/changes/v0.26.0/tst-kanban-management-tools.md:387` is disclosed as acceptable historic stranding (F-6).
- **Open:** VE's report and its two new files are not committed. PM's gate is QM's cold-run re-check and PM's OK. The T-1..T-27 classification record is pending. Sign-off, I-1 and I-2 stay unticked.

### PM decision: cold-run item (2026-10-16)

- **DEFER (PM).** One cold run of `src/tests/kanban-tool-handlers.test.ts` on the old code (fresh worktree, ajv 8 linked) gave 5 of 15 failing and took 5.7 s (other runs 0.2 to 0.4 s); the failure message was not captured. 22 further runs gave 0 deviations. Cause not established; the timeout idea is an unverified guess. The test stays in the suite.
- **Follow-up:** backlog #68 (verbose capture and per-test durations on any recurrence). Re-open this decision if it recurs.
- **Related PM backlog entries from this review:** #66 lockfile version drift (outside this change); #67 skill step 1 'omit ownerName for your own board' (CM list F-4; pre-existing, untouched here).

### PM decision: VE commit da29892 (2026-10-16)

- **Commit `da29892`** on `feature/kanban-list-details`, parent `f6d0d25`: `docs/changes/val-kanban-list-details.md`, `scripts/mutate-kanban-boardquery.mjs`, `src/tests/kanban-tool-handlers.test.ts` (445 insertions, 8 deletions). Tree clean.
- **Coverage:** QM CLEARED the aligned line 385 (22:07:36Z) and gave an explicit verdict on the committed wording at `da29892` (22:09:50Z). The coverage is by file list, wording and clean status, not by byte hash.
- **PM OK** to commit (queued 22:06Z) was based on QM CLEARED of 22:05:38Z. VE changed the wording of line 385 after that CLEARED; PM's OK did not compare the final text with the cleared text (PM's gap, recorded here).
- **Follow-up landed:** `3ae72fe` (VE): `docs/changes/val-kanban-list-details.md` line 436 only, the harness-section wording; QM cleared the exact text before PM's OK, as PM decided. QM checked the committed line at `3ae72fe` (2026-10-16 22:17:54Z). No number, file list or result changes. Verified from HEAD by Change Manager; the report is unchanged since `3ae72fe`.
- **Merge:** no decision recorded. Waits for the user's EDH validation (27 scenarios NOT RUN) and the user's "OK to merge"; the merge scope is an open question for the user. Status stays `approved` until EDH.

### D-17: test split, known limits and test-expectation changes (Change Manager, 2026-10-17)

Recorded by Change Manager from the Project Manager decisions of 2026-10-17 (10:19:01Z, 10:22:25Z, 10:28:34Z, 10:38:07Z).

- **Test split:** the automated suite covers the scenarios except two manual cases: T-1 (end-to-end in an Extension Development Host with an empty test actor) and T-21 (provisioned skill copy). Both stay NOT RUN until a tester runs them. This amends the coverage described by D-13 and the REQ_UAT_KAN_MGMT row.
- **Rule 6 (SPEC_KAN_WRITEVALID):** an unknown top-level key is rejected on write; the message names the declared fields and says field values go under `fields`. A top-level `id` on add is rejected (F2).
- **Write path:** all four write paths serialise with `lineWidth: 0` (`serializeBoard` in `packages/kanban/src/extension.ts`). Known limits: line endings are written as LF; a long scalar folded in the file is unfolded once, on its first write.
- **Promise:** comments and the parsed values of untouched items are preserved (REQ_KAN_DELETE AC-7, REQ_KAN_SCHEMA AC-9, REQ_KAN_UPDATE AC-6). Byte identity, line endings, formatting and key order are not promised.
- **Test-expectation changes:**
  - TC-1 (`src/tests/kanban-comment-preservation.test.ts`): the HEAD source-text check of `serializeBoard(doc)` is replaced by a behavioural test: an update keeps the comments and a 170-character double-quoted scalar on one line.
  - TC-3 (same file): the line-diff check is replaced by a parsed-value check. The HEAD test had no comment assertion; none is added (PM decision).
  - T-9 (`src/tests/kanban-write-handlers.test.ts`): the whole-file check is replaced by a parsed-value check: item 2 absent, other items equal, nextId unchanged. Long-scalar re-folding is covered by TC-1 only.
- **Spec changes in this record:** SPEC_KAN_UPDATE round-trip section, AC-6 and AC-7 at option (a) (SD 10:24:24Z, 10:27:27Z); spec_uat_kanban_mgmt setup paragraph (SD 10:27:27Z). F4 (spec_uat line 39, T-1 wording) is committed in `8ef2551` (SD). T-1 step 4 cites `REQ_KAN_UPDATE` AC-2 and AC-4 in the spec (`6549338`, SD) and, once TD restores it, in the protocol (PM 11:19:58Z, option a; no history rewrite). The citation rests on draft requirements: REQ_KAN_UPDATE and SPEC_KAN_UPDATE are draft, and their approval is part of the merge gate, which PM raises with the user before merge.
- **Reported results (Dev 10:21:26Z, TD 10:21:34Z; not re-run by CM):** handler file 21/21; both test files 29/29; full suite 602/602 across 58 files; ESLint 0 errors on touched files, one pre-existing warning (`_token` in `packages/kanban/src/extension.ts`). Sphinx `-W` clean (SD 10:27:27Z).
- **Statuses:** unchanged (SPEC_KAN_UPDATE draft; REQ_KAN_UPDATE draft; REQ_KAN_SCHEMA draft; SPEC_KAN_DELETE and REQ_KAN_DELETE implemented; SPEC_UAT_KAN_MGMT approved). Sign-off boxes stay unticked.

### Scope additions (Change Manager record, 2026-10-17)

Recorded from the Project Manager instruction of 2026-10-17 (15:46:42Z).

- **Backlog #67 in scope:** the skill step 1 correction is Summary criterion (5) and issue I-8. Traced in Level 0 to Level 2 and in the Traceability Verification table. The Dev edit to the asset waits until these sections exist.
- **Menu defect (I-9), PM option (b):** Dev commits the `when` change in `packages/kanban/package.json` by explicit path. The actor-node check is confirmed by the user. The Files-node check (entry must not appear on Files nodes) is open and a merge gate. The commit hash is recorded here once verified on disk.
- **Approval of the added rows:** the Level 0, 1 and 2 headers above still read approved (2026-10-16). The rows added for I-8 and I-9 are not yet approved by the user; PM raises them with the user before merge. No status changed.
- **Owner commits (2026-10-17):** `a99f443` (Dev, I-8, SKILL.md step 1; Dev reports 55/55 in two test files); `93e4065` (TD, protocol step 4 citation restored per PM option a; menu check placement recorded as manual in the EDH, reason: `when` is evaluated by VS Code, the automated tests use a fake host). T-1 stays NOT RUN.
- **PM decisions (user-approved, 2026-10-18):** (1) Files-node negative check agreed: protocol case (TD) with an automated static when-clause check (Dev) and a manual EDH confirmation. (2) I-8 static check agreed: automated test that the bundled SKILL.md has no "omit `ownerName`" text (Dev), Evidence added by TD. Both pending hashes.
- **Owner commits for the two checks (verified on disk by CM, 2026-10-18):** `c88adc6` (Dev, static guards `src/tests/kanban-skill-ownername-guard.test.ts` and `src/tests/kanban-actor-menu-when.test.ts`); `4556d06` (TD, T-28 (a) and T-29 Evidence); `0c2b0ea` (Dev, correction to the guards); `1cd6557` (TD, Evidence updated to `0c2b0ea`). Index empty before and after each commit.
- **Defect and fix (found by TD, verified by CM against `actorTreeProvider.ts` line 20):** the Files-node sample in `c88adc6` used `jarvisActorFileCategory:memory`, a value the code never produces. Category type is `'agent' | 'files' | 'touched'`. Fixed in `0c2b0ea`: all seven Files-node contextValues are negatives; the control fails if any literal disappears from the source.
- **Still open before merge:** T-28 part (b) and T-1, T-21 (EDH, NOT RUN); T-29 retention and the Actor-node case (PM); user approval of the I-8 and I-9 rows; draft status of REQ_KAN_UPDATE and SPEC_KAN_UPDATE; the non-CM working-tree items (`.vscode/settings.json` deleted, untracked fixture `kanban.yaml`).

---

### Round 2

**Reviewed by:** Quality Manager. **Addressee:** Project Manager.
**Review date:** 2026-10-19 (PM request of 2026-10-19T08:25:35Z).
**Reviewed revision:** `68e2639`, branch `feature/kanban-list-details`. The PM's reference `dd21550` is the t-19 test-designer commit; the Round 1 record is `9be120f` (reviewed revision `dd21550`). Closure was checked against `68e2639`, not against the Round 1 text.
**Verdict:** Verification: FINDINGS (F-8, F-9; F-6 tick text open). Round 1 findings F-1 to F-5 are closed on `68e2639`. F-6 and F-7 are closed in substance; their tick texts are open. The I-8 and I-9 code fixes are verified on HEAD; their CD text is stale (F-9). F-8 is a recurrence of the cold-run timeout that PM deferred in Round 1 (backlog #68), so the Round 1 deferral is open again. EDH cases T-1, T-21, T-27 and T-28 part (b) remain NOT RUN; no run is claimed.

#### Round 1 Closure Status

| Finding | Status on `68e2639` | Evidence |
|---------|---------------------|----------|
| F-1 (undeclared-status labels counted) | Closed | `packages/kanban/src/boardQuery.ts` counts only items whose status is a declared option (`counted`, D-10). SPEC_KAN_FILTERVALUES step 5 states it (`docs/design/spec_kan.rst` lines 1190 to 1197). Label half of AC-8 is in `src/tests/kanban-tool-handlers.test.ts` and `src/tests/kanban-filtervalues-handler.test.ts`; both pass. |
| F-2 (scope; README row) | Closed | README row for `jarvis.heartbeatConfigFile` removed (`97b36c2`). Unrelated commits disclosed per PM option B in PM Decisions. |
| F-3 (FILTERVALUES status) | Closed | REQ_KAN_FILTERVALUES and SPEC_KAN_FILTERVALUES are `approved` (`docs/requirements/req_kan.rst` line 514, `docs/design/spec_kan.rst` line 1163). |
| F-4 (Level 2 tick before C-3) | Closed | Level 2 Horizontal Check ticked after the user confirmed the F-4 texts; C-3 closed per the Round 1 follow-up. |
| F-5 (non-list labels; substring match) | Closed | SPEC_KAN_LIST step 6 states `[]` for non-list `labels` and a whole-label match (`docs/design/spec_kan.rst` lines 1099 to 1103). Behaviour as decided by PM. |
| F-6 (Artefakt-Removal ticks) | Open (tick text) | Class (c) disclosed. The provisioned copy `.github/skills/jarvis-kanban.board/SKILL.md` (gitignored, `.gitignore` line 31) still has "(omit `ownerName` for your own board)" at line 101 and "(use item id to fetch full details)" at line 105. PM accepted handling via T-21 (I-3). The tick at line 166 still reads "All class (a) active code/workflow references fixed in this CR"; the requested wording "asset fixed; provisioned copy pending" is not in the record. |
| F-7 (CD accuracy) | Closed in substance; ticks open | D-12 narrowed. Level 2 tick present. I-1 and I-2 are unticked but verified on HEAD: the bundled asset has no "fetch full details" text, and `src/tests/kanban-ownername-required.test.ts` covers nine tools. CM may tick them. |

#### I-8 and I-9

- **I-8 (skill step 1), code:** closed on HEAD. Bundled asset Workflow step 1 has no "omit `ownerName`" text (`a99f443`). `src/tests/kanban-skill-ownername-guard.test.ts` passes, and its control "1. **Create**" passes. The provisioned copy is I-3 (see F-6).
- **I-9 (menu `when`), code:** closed on HEAD. Clause in `packages/kanban/package.json` line 77 (`0b87b74`). `src/tests/kanban-actor-menu-when.test.ts` passes: all seven Files-node contextValues are negatives, `jarvisActor` is a positive. Limit: the test evaluates the clause with its own subset parser; VS Code is not run. Part (b) in the EDH is NOT RUN.

#### Protocol Review: T-28 and T-29

- **T-28 part (a):** the test's contextValue literals and category type match `packages/core/src/engine/actors/actorTreeProvider.ts` (lines 20, 135, 148, 154, 161, 166, 172). Automated, passing. Part (b): NOT RUN (user). The Files-node merge gate stays open until part (b) runs.
- **T-29:** the guard checks absence of "omit `ownerName`" in the bundled asset only. It asserts no positive wording for step 1, as the protocol states and PM agreed (I-8). Passing.
- Status "NOT RUN" on the automated cases (T-29 among them) follows the protocol's convention; T-2 and T-22 carry the same status. No finding.

#### Findings

**F-8 (Medium, test reliability; Round 1 DEFER re-opened).** The Round 1 PM decision of 2026-10-16 reads "Re-open this decision if it recurs." It recurred.
- First run of the seven kanban test files at `68e2639` (cold transform 7.0 s, import 32.6 s): 2 of 119 tests failed with "Test timed out in 5000ms". Both are in `src/tests/kanban-tool-handlers.test.ts`: the first is "AC-8 (labels), T-27 step 4 as written by the Test Designer"; the second, a `jarvis_verifyKanbanSchema` test around line 150, is not fully captured in the output kept.
- Re-runs passed: the same seven files 119/119 (4.1 s); full suite 616/616 (60 files); `kanban-tool-handlers.test.ts` alone with verbose output 15/15 (1.75 s).
- The failed run was not verbose, so per-test durations were not captured. Backlog #68 asks for that on recurrence. Cause not established. QM does not know whether the timeout is test-side or environment-side.
- QM assessment: not closed. The next cold run that fails should be captured verbose, with per-test durations, before merge. Options for PM: keep the deferral with #68 as written; or decide a per-file timeout or other change. PM decides.

**F-9 (Low, CD accuracy).** Stale text in the Issues Found list, no status change needed:
- I-8 (line 178) says "TD proposes one static check ... decision open with PM". PM decided this on 2026-10-18 (Scope additions); the check exists (`c88adc6`, `4556d06`).
- I-9 (line 179) says "the protocol has no case for it yet". T-28 exists (`4556d06`); the Files-node check is part (b) of T-28.
Fix: CM updates the text. QM does not edit the CD outside this section.

#### Observations (no finding)

- Scope: `packages/kanban/src/extension.ts` (+29, write path, `serializeBoard` with `lineWidth: 0`, D-17) and other write-path commits since `dd21550` are outside the PM's Round 2 scope. Not reviewed in this round.
- The strict Sphinx build wrote its output to `%TEMP%`, so `docs/_build` was not touched.

#### Checks Run by QM on `68e2639`

- Vitest, seven kanban test files: run 1 two failures (F-8); run 2 119/119.
- Vitest, full suite: 616/616 pass, 60 files.
- Vitest, `kanban-tool-handlers.test.ts`, verbose: 15/15 pass.
- Strict Sphinx build (`-E -a -b html -W --keep-going`), output to `%TEMP%`: exit 0, build succeeded.
- Not run: T-1, T-21, T-27, T-28 part (b) (EDH, user's). Not claimed as run.

#### PM Decisions

- **F-8 (PM, user-approved 2026-10-19):** DEFER stays; backlog #68 stays as written. Observe whether it recurs; if it does, re-open with a verbose run that captures per-test durations. No investigation now.
- **F-6 (PM, 2026-10-19):** tick text fixed; asset fixed, provisioned copy pending (I-3, T-21).
- **F-9 (PM, 2026-10-19):** I-8 and I-9 text corrected to the decisions and the protocol cases that now exist.
- **QM-open finding (B), id reuse without nextId (PM, user decision 2026-10-19): Fix now, scope kept in this change.** On a board without `nextId`, add takes max(existing ids)+1 and delete does not write `nextId`, so deleting the highest id and adding again returns the deleted id. This conflicts with SKILL.md line 66 (id immutable, never reused) and line 35 (`nextId` derived when absent). Fix: a deleted id is never reused, including when `nextId` is absent; regression test added; QM re-review requested. Fix commit `3741adb` (Dev; `packages/kanban/src/extension.ts`, `src/tests/kanban-write-handlers.test.ts`), verified on disk by CM. The test label said T-10 (the LIST case); corrected to T-9b in `1fa2d5e` (Dev), with protocol case T-9b in `7aa4254` (TD); QM Round 3 B-1. Approach: option B, delete persists `nextId = max(existing ids) + 1` when it is absent; when present, delete leaves it unchanged. Disclosed limit: a board that lost its highest id before `3741adb` has no record of it; the fix does not restore it. CM verification: write-handlers, tool-handlers, board-query, skill-ownername-guard and actor-menu-when tests 93/93 (5 files); `tsc -p packages/kanban` exit 0; eslint 0 errors (pre-existing `_token` warning).

### Round 3 (Quality Manager, CM-triggered review of finding B, 2026-10-19)

**Verdict:** FINDINGS (2 Low). Finding B is closed in substance on `3741adb`. Revision reviewed: `1ce63d8` (HEAD at review time; the fix is `3741adb`, the CD record is `1ce63d8`). The two findings are record and traceability items; neither reopens the fix.

#### Finding B: closure check

- **Code:** `packages/kanban/src/extension.ts` lines 809 to 813. Delete writes `nextId = max(all item ids, including the deleted one) + 1` only when `nextId` is absent; when present it is left unchanged. The maximum includes the deleted item, so the deleted id cannot be re-derived. The only item-removal path in `packages/*/src` is this one (line 815); no webview or other delete path bypasses it.
- **Empty board:** cannot reach `Math.max()` with an empty list, because `findIndex` must find the item first.
- **Regression test:** `src/tests/kanban-write-handlers.test.ts`, "T-10: after deleting the highest id on a board without nextId, add never reuses it". Run by QM: `kanban-write-handlers.test.ts` 22/22 pass (verbose, 2.15 s). Reasoned, not run: without the `nextId` write, add returns 4 and `expect(added.itemId).not.toBe(4)` fails, so the test discriminates.
- **Disclosed limit** (boards that lost their highest id before `3741adb`): accepted as recorded; not a finding.
- **CM verification** (tests 93/93, `tsc` exit 0, eslint 0 errors) was taken from the CM record; QM did not re-run `tsc` or eslint.

#### Findings

**B-1 (Low, traceability).** The regression test is labelled "T-10", but in `docs/changes/tst-kanban-list-details.md` T-10 is the LIST compact projection (line 232). The DELETE scenarios (T-7 to T-9, lines 196 to 227) have no case for id reuse. T-21b (line 542) covers add-after-delete only on a board that has `nextId`, so the no-`nextId` path is tested with no protocol case. The "T-10" label in the CD record repeats the clash.
Fix: add a DELETE protocol case (for example T-9b) that cites the test, and use that ID in the test label and the CD record. Owner: CM (protocol and CD text); Dev only if the test label changes.

**B-2 (Low, CD accuracy).** `docs/changes/tst-kanban-list-details.md` line 574 still reads "Open, not decided" and "No Dev task is written yet" for the no-`nextId` case. That was decided on 2026-10-19 and fixed in `3741adb`. Same class as F-9.
Fix: CM updates the text to the decision and the fix hash.

#### Checks run by QM (Round 3)

- Vitest `src/tests/kanban-write-handlers.test.ts`, verbose: 22/22 pass.
- Read of `3741adb` diff and `packages/kanban/src/extension.ts` lines 725 to 830.
- Not run by QM: T-1, T-21, T-27, T-28 part (b) (EDH, user). Not claimed as run.

#### PM Decisions

- **Round 3 (pending PM):** B-1 and B-2 are text and traceability fixes for CM. PM decides whether they must land before merge or can follow.
- **Round 3 routing (Change Manager, 2026-10-19):** B-1 and B-2 change `docs/changes/tst-kanban-list-details.md` (TD-owned) and the test label in `src/tests/kanban-write-handlers.test.ts` (Dev-owned); CM does not edit either. Routed: TD adds a DELETE case T-9b for the no-`nextId` id reuse and updates the stale "Open, not decided" text to the decision and fix hash `3741adb`; Dev changes the test label to T-9b once that case is on disk. Ownership: QM listed CM as owner of the protocol text; the protocol is TD's, so PM is asked to confirm. The merge gate is PM's and is not decided here.
- **Round 3 decision (PM, 2026-10-19): Fix now, both before merge.** Rationale: the regression test and the CD record cite protocol T-10, which is the LIST case, so the delete-then-add path without `nextId` has no protocol case; B-2 leaves a stale "Open, not decided" that the fix has closed. CM updates the CD text of B-1 to the T-9b case once Test Designer commits it; the protocol parts go to Test Designer; the test label goes to Dev after that. Merge waits for both.
- **Round 3 fix record (Change Manager, 2026-10-19):** B-1: protocol case T-9b in `7aa4254` (TD, `docs/changes/tst-kanban-list-details.md`); test label changed to T-9b in `1fa2d5e` (Dev, `src/tests/kanban-write-handlers.test.ts`, one line). B-2: protocol open-decision text now states the decision and fix `3741adb`, in the same commit `7aa4254`. CM verified on disk: the label matches the protocol title; index empty. QM re-review of B-1 and B-2 is requested; merge is still PM's.
- **Round 3 closure check (Quality Manager, 2026-10-19):** B-1 CLEARED and B-2 CLEARED, on `a3facb1`. Checked on disk: the test label is "T-9b: after deleting the highest id on a board without nextId, add never reuses it" and matches the protocol title (`tst-kanban-list-details.md`, T-9b); the T-9b procedure and expected values match the test (delete `itemId: 4`, add returns 5); T-9b cites `REQ_KAN_DELETE` AC-4 and `REQ_KAN_SCHEMA` AC-8, and both state the no-reuse rule; the text "Open, not decided" is gone from the protocol. `kanban-write-handlers.test.ts` 22/22 pass after the rename (QM run). Non-blocking: the historical Round 3 lines above (regression-test label and B-1 wording) still say "T-10"; they record the state at review and are left as written.

---

## User Validation

Manual cases executed by the user in the Extension Development Host. PM records the user's observed values; the user may review the record. No case in this section is PASS until the user has observed it.

| Case | Procedure (see tst-kanban-list-details.md) | User observation | Status |
|------|-------------------------------------------|------------------|--------|
| T-1 | End-to-end: create, open, add, move to Done on an empty board | Steps 1-4 reported working by user 2026-10-19; priority "High" of "New Task" not yet confirmed | NOT RUN (values pending) |
| T-21 | Provisioned SKILL.md content check after reload with autoProvision true | User confirms expected values present (2026-10-19): 9 tools, add assigns IDs, details true, filter tool jarvis_listKanbanFilterValues, no get-by-id tool. Checks are verifiable; to be automated. | PASS (user observation) |
| T-28 (b) | Kanban entry absent on Files nodes | Pending | NOT RUN |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
