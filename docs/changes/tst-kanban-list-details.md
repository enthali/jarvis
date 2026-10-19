# Test Protocol: kanban-list-details

**Change Request**: kanban-list-details  
**Branch**: `feature/kanban-list-details`  
**UAT Spec**: [SPEC_UAT_KAN_MGMT](../design/spec_uat_kanban_mgmt.rst)  
**Date**: 2026-10-16

---

## Execution Note

This protocol has two kinds of case, and T-28 has one part of each. The manual
cases (T-1 end-to-end, T-21, and T-28 part (b)) are run by a tester in an
Extension Development Host and stay NOT RUN until a tester executes them. Every
other case, and T-28 part (a), is automated: its Evidence line names the
test file and title that assert the case condition, and its result is recorded in
the verification report. Automated tests call the handlers through a fake host
(mocked vscode and core API), so they show what the handlers do with the inputs
they receive; they do not show that VS Code delivers those inputs unchanged. No
case is marked PASS or FAIL in this protocol.

Launch the EDH with `packages/core` and `packages/kanban` active, using
`testdata/test.code-workspace`. Module integration (compile/package/CI) is out
of UAT scope and is verified separately.

## Test Setup

- Automated cases (each has an **Evidence** line) run in handler test files
  against a fresh copy of `testdata/kanban/sample.kanban.yaml` in a temporary
  Change Manager folder. Their fixture variants are set up in the test code.
  T-28 part (a) and T-29 are static checks of shipped files and use no fixture.
- Manual cases are T-1, T-21, and T-28 part (b) only. For T-1, the empty test actor is
  `UAT Kanban Actor`: the folder `testdata/.jarvis/actors/UAT Kanban Actor/` with
  an `actor.yaml`, an empty `context.md`, and no `kanban.yaml`. Pass
  `ownerName: "UAT Kanban Actor"` in T-1.
- Pass `ownerName: "Change Manager"` to every automated call. T-27 step 1 uses an
  unknown owner.
- Webview checks are manual and appear in T-1 and T-21 only. No automated test
  proves a webview re-render; the handler tests assert the refresh call with the
  board path instead.
- For checks that must not write, the automated tests compare the SHA-256 of the
  board file before and after the call. Manual steps record the file size.
- Before T-21, confirm `jarvis.kanban.autoProvision` is `true` (the default) and
  activate the Kanban extension in the EDH. Activation copies the bundled skill to
  `testdata/.github/skills/jarvis-kanban.board/SKILL.md`, because the EDH workspace
  root is `testdata` (`testdata/test.code-workspace`, folder `.`).

## Test Scope

Manual: T-1, T-21, and T-28 part (b). Automated: all other cases and T-28 part (a), each with an **Evidence** line that names the test file and title.

- T-1..T-6b: ADD and write validation
- T-7..T-9b: DELETE removes only the deleted item and does not reuse a deleted id
- T-10..T-14: LIST compact projection and filters
- T-15..T-20: FIELDS operations and guards
- T-21: Kanban skill content
- T-22..T-24: LIST details
- T-25..T-27: FILTER VALUES
- T-28: the kanban entry is absent on Files nodes (part a automated, part b manual)
- T-29: the bundled skill's Workflow step 1 has no "omit `ownerName`" text (automated)
- Not covered: the kanban entry on Actor nodes (`packages/kanban/package.json`,
  `when` fixed in `0b87b74`). No case in this protocol checks it; the automated tests
  use a fake host and cannot show how VS Code evaluates the menu. The user confirmed
  the Actor-node entry in the EDH (I-9 in `docs/changes/kanban-list-details.md`).

## Scenarios - ADD (T-1..T-6)

### T-1 - Create, open, ADD and move to Done end to end on an empty board

**AC**: `REQ_KAN_ADD` AC-3, AC-7; `REQ_KAN_UPDATE` AC-2, AC-4  
**Procedure**: Use `UAT Kanban Actor` (see Test Setup) as `ownerName`. Run
the four steps in order.

1. Call `jarvis_createKanbanBoard` with `ownerName: "UAT Kanban Actor"` only
   (default `kanban.yaml`).
2. Call `jarvis_openKanbanBoard`.
3. Call `jarvis_addKanbanItem` with `name: "New Task"`, `status: "Backlog"`,
   `fields: { priority: "High" }`, and `ownerName: "UAT Kanban Actor"`.
4. Call `jarvis_updateKanbanItem` with `itemId: 1` and `changes: { status: "Done" }`.

**Expected**:

1. The response includes the path of the new `kanban.yaml`. The file has
   `nextId: 1`, status and priority fields with their options, and `items: []`.
2. The webview shows the empty board.
3. Response is `{ path, added: true, itemId: 1 }`. The YAML item has `id: 1`,
   `name: New Task`, `status: Backlog`, and `priority: High`; `nextId` is 2.
   The card appears in the Backlog column.
4. Response is `{ path, updated: true, itemId: 1 }`. The YAML item has
   `status: Done`, and the card appears in the Done column.

The webview checks are manual; no automated test proves them. Step 3's add
contract and step 4's update response are covered by the automated tests named
below.

**Evidence**: step 3, `src/tests/kanban-write-handlers.test.ts`,
"T-1: happy path assigns the next id, increments nextId and refreshes the panel";
step 4, `src/tests/kanban-comment-preservation.test.ts`,
"an update keeps the header and inline comments and leaves the long notes line
unfolded", which asserts `path`, `updated` and `itemId` (`toMatchObject`,
added in `3cc2ca8`).  
**User record**: [User Validation](kanban-list-details.md#user-validation), row T-1 (user-observed values, not a protocol result).  
**Status**: NOT RUN

### T-2 - ADD status defaults to the first declared option

**AC**: `REQ_KAN_ADD` AC-5  
**Procedure**: On a fresh sample copy, call `jarvis_addKanbanItem` with
`name: "Defaulted"` and no `status`.  
**Expected**: Response is `{ path, added: true, itemId: 5 }`. The new item has
`status: "Backlog"`, the first declared option; the panel refresh is called
with the board path.  
**Evidence**: `src/tests/kanban-write-handlers.test.ts`, "T-2: status defaults to the first declared option".  
**Status**: NOT RUN

### T-3 - ADD derives nextId when absent

**AC**: `REQ_KAN_ADD` AC-3  
**Procedure**: Remove the top-level `nextId` from a fresh board and note the
maximum existing item id as M (4 on the sample). Call `jarvis_addKanbanItem`
with `name: "First After Remove"`.  
**Expected**: The new item has `id: M + 1` (5 on the sample), YAML now has
`nextId: M + 2` (6), and the call succeeds with a panel refresh.  
**Evidence**: `src/tests/kanban-write-handlers.test.ts`, "T-3: nextId is derived from the maximum item id when absent, then written back".  
**Status**: NOT RUN

### T-4 - WRITEVALID rejects an invalid single_select value before writing

**AC**: `REQ_KAN_WRITEVALID` AC-1; `REQ_KAN_ADD` AC-6  
**Procedure**: Record the board file SHA-256. Call `jarvis_addKanbanItem` with
`name: "Bad"` and `fields: { priority: "Critical" }`. Record it again.  
**Expected**: Response is
`{ error: 'Invalid value "Critical" for field "priority". Valid: Low, Medium, High' }`.
No item is appended, the SHA-256 is unchanged, and there is no panel refresh.  
**Evidence**: `src/tests/kanban-write-handlers.test.ts`, "T-4: an invalid single_select value is rejected before writing and names the valid options".  
**Status**: NOT RUN

### T-5 - WRITEVALID rejects an undeclared field key

**AC**: `REQ_KAN_WRITEVALID` AC-3  
**Procedure**: Record the board file SHA-256. Call `jarvis_addKanbanItem` with
`name: "Ghost"` and `fields: { silentTrap: "invisible" }`. Record it again.  
**Expected**: Response is
`{ error: 'Unknown field "silentTrap". Declared fields: status, priority' }`. No
item is appended and the SHA-256 is unchanged. This is an error, not a successful
write with a warning. The top-level forms are T-5b (`silentTrap`) and T-5c
(`priority`).  
**Evidence**: `src/tests/kanban-write-handlers.test.ts`, "T-5: an undeclared field key is an error, not a successful write".  
**Status**: NOT RUN

### T-5b - ADD rejects a top-level key that is not an input parameter

**AC**: `SPEC_KAN_WRITEVALID` rule 6 (`docs/design/spec_kan.rst`, commit `50526b2`)  
**Procedure**: Record the board file SHA-256. Call `jarvis_addKanbanItem` with
`name: "Ghost"` and a top-level `silentTrap: "invisible"`. Record it again.  
**Expected**: Response is
`{ error: 'Unknown parameter "silentTrap". Declared fields: status, priority. Field values go under "fields".' }`.
No item is appended and the SHA-256 is unchanged. A top-level `id` is not covered
here; T-6b covers it.  
**Evidence**: `src/tests/kanban-write-handlers.test.ts`, "T-5b (rule 6): an undeclared top-level key is rejected and the message points to fields".  
**Status**: NOT RUN

### T-5c - ADD rejects a declared field name given at the top level

**AC**: `SPEC_KAN_WRITEVALID` rule 6 (`docs/design/spec_kan.rst`, commit `50526b2`)  
**Procedure**: Record the board file SHA-256. Call `jarvis_addKanbanItem` with
`name: "Top Level"` and a top-level `priority: "High"`. Record it again.  
**Expected**: Response is
`{ error: 'Unknown parameter "priority". Declared fields: status, priority. Field values go under "fields".' }`.
No item is appended and the SHA-256 is unchanged.  
**Evidence**: `src/tests/kanban-write-handlers.test.ts`, "T-5c (rule 6): a top-level declared field name is rejected with the same message".  
**Status**: NOT RUN

### T-6a - ADD rejects an id passed inside fields

**AC**: `REQ_KAN_WRITEVALID` AC-4; `REQ_KAN_ADD` AC-4  
**Procedure**: Record the board file SHA-256. Call `jarvis_addKanbanItem` with
`name: "Grab Id"` and `fields: { id: "999" }`. Record it again.  
**Expected**: Response is
`{ error: '"id" must be set as a top-level parameter, not via fields.' }`. No item
is appended and the SHA-256 is unchanged.  
**Evidence**: `src/tests/kanban-write-handlers.test.ts`, "T-6a: a builtin key given inside fields is rejected and the board is unchanged".  
**Status**: NOT RUN

### T-6b - ADD rejects a top-level id instead of dropping it

**AC**: `REQ_KAN_WRITEVALID` AC-4; `REQ_KAN_ADD` AC-4  
**Procedure**: Record the board file SHA-256. Call `jarvis_addKanbanItem` with
`name: "Grab Id"` and a top-level `id: 999`. The tool schema does not declare
`id`, so this case calls the handler directly. Record it again.  
**Expected**: Response is `{ error: 'Cannot supply "id" — ids are auto-assigned.' }`.
No item is appended and the SHA-256 is unchanged.  
**Evidence**: `src/tests/kanban-write-handlers.test.ts`, "T-6b: a top-level id is rejected, not silently dropped".  
**Status**: NOT RUN

## Scenarios - DELETE (T-7..T-9b)

### T-7 - DELETE removes an item and leaves nextId unchanged

**AC**: `REQ_KAN_DELETE` AC-4, AC-5  
**Procedure**: On a fresh sample copy, call `jarvis_deleteKanbanItem` with
`itemId: 2`.  
**Expected**: Response is `{ path, deleted: true, itemId: 2 }`. Item 2 is
absent, `nextId` is still 5, and the panel refresh is called with the board path.  
**Evidence**: `src/tests/kanban-write-handlers.test.ts`, "T-7: removes the item, leaves nextId unchanged and refreshes the panel".  
**Status**: NOT RUN

### T-8 - DELETE reports a missing id without writing

**AC**: `REQ_KAN_DELETE` AC-3  
**Procedure**: Record the board file SHA-256, call
`jarvis_deleteKanbanItem` with `itemId: 9999`, and record it again.  
**Expected**: Response is `{ error: "item not found", itemId: 9999 }`. The SHA-256 is
unchanged, and there is no panel refresh.  
**Evidence**: `src/tests/kanban-write-handlers.test.ts`, "T-8: a missing id returns an error and does not write".  
**Status**: NOT RUN

### T-9 - DELETE changes only the deleted item's block

**AC**: `REQ_KAN_DELETE` AC-6, AC-7; `REQ_KAN_SCHEMA` AC-9  
**Procedure**: Record the parsed items and `nextId` of the board. Call
`jarvis_deleteKanbanItem` with `itemId: 2`. Parse the file again and compare:
item 2 is absent, every other item equals its recorded parsed value, and
`nextId` is unchanged.  
**Expected**: Item 2 is absent from the parsed items. Every other item equals its
recorded parsed value. `nextId` is unchanged.  
**Evidence**: `src/tests/kanban-write-handlers.test.ts`, "T-9: delete removes item 2 and leaves the other items and nextId unchanged".  
**Status**: NOT RUN

### T-9b - DELETE of the highest id on a board without nextId does not free the id

**AC**: `REQ_KAN_DELETE` AC-4; `REQ_KAN_SCHEMA` AC-8  
**Procedure**: On a fresh sample copy, remove the `nextId` key (a fixture variant set up in the test code). Call `jarvis_deleteKanbanItem` with `itemId: 4`, the highest id. Then call `jarvis_addKanbanItem` with `name: "After Delete"` and no id.  
**Expected**: The delete response is `{ path, deleted: true, itemId: 4 }`. The add response is `{ path, added: true, itemId: 5 }`, so the deleted id 4 is not returned again.  
**Evidence**: `src/tests/kanban-write-handlers.test.ts`, "T-9b: after deleting the highest id on a board without nextId, add never reuses it".  
**Status**: NOT RUN

## Scenarios - LIST (T-10..T-14)

### T-10 - LIST returns all items as the compact projection

**AC**: `REQ_KAN_LIST` AC-3, AC-4, AC-8  
**Procedure**: Call `jarvis_listKanbanItems` with no filters.  
**Expected**: Response has `path`, `count`, and `items`; count equals the
fixture's four items. Every item has exactly `id`, `name`, `status`, and
`labels`. `notes`, `priority`, and other field values are absent.  
**Evidence**: handler `src/tests/kanban-tool-handlers.test.ts`, "default list: { path, count, items }, each item exactly id, name, status, labels; no notes"; module `src/tests/kanban-board-query.test.ts`, "AC-3: without details each item carries exactly id, name, status, labels; labels is [] when the card has none".  
**Status**: NOT RUN

### T-11 - LIST status filter returns only matching items

**AC**: `REQ_KAN_LIST` AC-2  
**Procedure**: Call `jarvis_listKanbanItems` with `status: "Backlog"`.  
**Expected**: Only items 1 and 4 are returned, in the compact projection;
items with other statuses are absent.  
**Evidence**: module `src/tests/kanban-board-query.test.ts`, "AC-2: status alone, labels alone, and both AND-combined; all requested labels must be present".  
**Status**: NOT RUN

### T-12 - LIST labels filter uses AND semantics

**AC**: `REQ_KAN_LIST` AC-2  
**Procedure**: In a fresh fixture variant, give item 1 labels
`["urgent", "blocked"]` and item 2 only `["urgent"]`. Call
`jarvis_listKanbanItems` with `labels: ["urgent", "blocked"]`.  
**Expected**: Only item 1 is returned; the item carrying only `urgent` is
excluded.  
**Evidence**: module `src/tests/kanban-board-query.test.ts`, "AC-2: status alone, labels alone, and both AND-combined; all requested labels must be present".  
**Status**: NOT RUN

### T-13 - LIST rejects an unknown status filter

**AC**: `REQ_KAN_LIST` AC-6  
**Procedure**: Capture the board contents and call
`jarvis_listKanbanItems` with `status: "Nonexistent"`.  
**Expected**: The response is an error naming the valid status options, not an
empty list; the board is unchanged.  
**Evidence**: module `src/tests/kanban-board-query.test.ts`, "AC-5: an unknown status is an error naming the valid options, not an empty list"; handler `src/tests/kanban-tool-handlers.test.ts`, "owner, board and status errors are the unchanged ones".  
**Status**: NOT RUN

### T-14 - LIST returns an empty result for a valid no-match filter

**AC**: `REQ_KAN_LIST` AC-5  
**Procedure**: Capture the board contents and call
`jarvis_listKanbanItems` with `labels: ["label-that-no-item-has"]`.  
**Expected**: Response has `count: 0` and `items: []`, with no error; the board
is unchanged.  
**Evidence**: module `src/tests/kanban-board-query.test.ts`, "AC-4: a filter matching nothing returns an empty array".  
**Status**: NOT RUN

## Scenarios - FIELDS (T-15..T-20)

### T-15 - FIELDS adds text and single_select fields

**AC**: `REQ_KAN_FIELDS` AC-2  
**Procedure**: Call `jarvis_updateKanbanFields` with `operation: "addField"`,
`fieldName: "rationale"`, and `fieldType: "text"`. Then call it again with
`operation: "addField"`, `fieldName: "severity"`, `fieldType: "single_select"`,
and `options: [{ name: "Low" }, { name: "Medium" }, { name: "High" }]`; each
option is an object `{ name, color }`, and `color` is optional.  
**Expected**: Both calls return `{ path, updated: true, operation: "addField" }`;
YAML has `rationale` with no options and `severity` with the three options in
`fields[]`; the panel refresh is called after each write.  
**Evidence**: `src/tests/kanban-write-handlers.test.ts`, "T-15: adds a text field and a single_select field with options".  
**Status**: NOT RUN

### T-16 - FIELDS rejects adding a field named status

**AC**: `REQ_KAN_FIELDS` AC-3  
**Procedure**: Call `jarvis_updateKanbanFields` with `operation: "addField"`,
`fieldName: "status"`, `fieldType: "single_select"`, and
`options: [{ name: "A" }, { name: "B" }]`.  
**Expected**: Response is
`{ error: 'Cannot add a field named "status" — it already exists as the column driver.' }`;
the YAML is unchanged.  
**Evidence**: `src/tests/kanban-write-handlers.test.ts`, "T-16: adding a field named status is rejected".  
**Status**: NOT RUN

### T-17 - FIELDS removes an unused field

**AC**: `REQ_KAN_FIELDS` AC-4  
**Procedure**: Add a field with `operation: "addField"`, `fieldName: "temp"`, and
`fieldType: "text"`; no items use it. Then call `jarvis_updateKanbanFields` with
`operation: "removeField"` and `fieldName: "temp"`.  
**Expected**: The remove call returns `{ path, updated: true, operation: "removeField" }`;
`temp` is absent from `fields[]`, and the rest of the YAML is unchanged.  
**Evidence**: `src/tests/kanban-write-handlers.test.ts`, "T-17: removes an unused field and leaves the rest of the board unchanged".  
**Status**: NOT RUN

### T-18 - FIELDS refuses to remove a referenced field

**AC**: `REQ_KAN_FIELDS` AC-4  
**Procedure**: Call `jarvis_updateKanbanFields` with `operation: "addField"`,
`fieldName: "region"`, `fieldType: "single_select"`, and
`options: [{ name: "EU" }, { name: "US" }]`. Add an item with
`jarvis_addKanbanItem`, `name: "Region item"`, and
`fields: { region: "EU" }`; note its id.
Then call `jarvis_updateKanbanFields` with `operation: "removeField"` and
`fieldName: "region"`.  
**Expected**: Response is
`{ error: 'Cannot remove field "region" — referenced by items: 5' }`. The new
item has id 5 on the sample. The field remains, and the YAML is unchanged by the
rejected removal.  
**Evidence**: `src/tests/kanban-write-handlers.test.ts`, "T-18: refuses to remove a field that an item references, and lists the item ids".  
**Status**: NOT RUN

### T-19 - FIELDS adds an option and rejects invalid additions

**AC**: `REQ_KAN_FIELDS` AC-6  
**Procedure**: In a fresh fixture variant, add a `text` field named
`rationale` directly to the YAML. Use `jarvis_updateKanbanFields` to add
`Critical` with `operation: "addOption"`, `fieldName: "priority"`, and
`optionName: "Critical"`; repeat the identical call. Then call the same tool
with `operation: "addOption"`, `fieldName: "rationale"`, and
`optionName: "Critical"`.  
**Expected**: The first call returns
`{ path, updated: true, operation: "addOption" }`, and `Critical` appears in
`priority` options. The duplicate call returns
`{ error: 'Option "Critical" already exists on field "priority".' }` and adds no
duplicate. The text-field call returns
`{ error: 'Cannot add options to a text field.' }`.
`Critical` appears only once.  
**Evidence**: `src/tests/kanban-write-handlers.test.ts`, "T-19: adds an option once, and rejects a duplicate option and an option on a text field".  
**Status**: NOT RUN

### T-20 - FIELDS removeOption enforces reference and last-option guards

**AC**: `REQ_KAN_FIELDS` AC-7, AC-8  
**Procedure**: Call `jarvis_updateKanbanFields` with
`operation: "removeOption"`, `fieldName: "priority"`, and
`optionName: "Low"` while item 3 still references it. Then add a temporary
`single_select` field using `operation: "addField"`, `fieldName: "temp"`,
`fieldType: "single_select"`, and `options: [{ name: "Only" }]`. Call
`jarvis_updateKanbanFields` with `operation: "removeOption"`,
`fieldName: "temp"`, and `optionName: "Only"`.  
**Expected**: The first call returns
`{ error: 'Cannot remove option "Low" — referenced by items: 3' }`, and `Low` stays in
place. The second call returns
`{ error: 'Cannot remove the last option from field "temp".' }`; `Only` remains.  
**Evidence**: `src/tests/kanban-write-handlers.test.ts`, "T-20: removeOption refuses a referenced option and refuses to leave a field without options".  
**Status**: NOT RUN

## Scenario - SKILL CONTENT (T-21)

### T-21 - Skill documents all nine tools and the current list behavior

**AC**: `REQ_KAN_SKILLCONTENT` AC-8..AC-10  
**Procedure**: Open the provisioned
`testdata/.github/skills/jarvis-kanban.board/SKILL.md`.  
**Expected**: The Tools table lists `jarvis_createKanbanBoard`,
`jarvis_openKanbanBoard`, `jarvis_verifyKanbanSchema`,
`jarvis_updateKanbanItem`, `jarvis_addKanbanItem`,
`jarvis_deleteKanbanItem`, `jarvis_listKanbanItems`,
`jarvis_listKanbanFilterValues`, and `jarvis_updateKanbanFields`. It states
that add assigns ids and deleted ids are not reused; the list tool returns
`id`, `name`, `status`, `labels` by default and `details: true` returns full
matching items; it identifies the filter-values tool. It does not say an item
can be fetched by id.  
**User record**: [User Validation](kanban-list-details.md#user-validation), row T-21 (user-observed values, not a protocol result).  
**Evidence**: User observation 2026-10-19, see kanban-list-details.md#user-validation.  
**Status**: PASS

## Scenarios - LIST DETAILS AND FILTER VALUES (T-22..T-27)

Use a fresh copy of the sample fixture for T-22..T-24. For T-25..T-27, make
each stated variant in a fresh copy.

### T-22 - LIST details returns full items, including notes when present

**AC**: `REQ_KAN_LIST` AC-8, AC-9  
**Procedure**: Call `jarvis_listKanbanItems` with `details: true` and no
filters.  
**Expected**: Response has `path`, `count: 4`, and `items`. Item 1 includes
`id`, `name`, `status`, `priority`, `labels: ["urgent"]`, and `notes`. Item 2
has `labels: []` and no `notes` key. Each item includes every field stored on
its card.  
**Evidence**: handler `src/tests/kanban-tool-handlers.test.ts`, "details true: full items with notes and declared-field values, same keys and count; false equals the default"; module `src/tests/kanban-board-query.test.ts`, "AC-8: details true returns every field of the card as stored, notes and declared-field values included".  
**Status**: NOT RUN

### T-23 - LIST details does not change matches or count

**AC**: `REQ_KAN_LIST` AC-10  
**Procedure**: Call `jarvis_listKanbanItems` with `status: "Backlog"` once
without `details` and once with `details: true`.  
**Expected**: Both responses contain items 1 and 4 and `count: 2`. The first
uses the compact projection; the second returns each full item.  
**Evidence**: handler `src/tests/kanban-tool-handlers.test.ts`, "filters give the same matches with and without details (REQ_KAN_LIST AC-10)"; module `src/tests/kanban-board-query.test.ts`, "AC-10: details changes only what each item carries: same matches, same order, same errors".  
**Status**: NOT RUN

### T-24 - LIST rejects a details value other than true or false

**AC**: `REQ_KAN_LIST` AC-9  
**Procedure**: Record the board file SHA-256, call
`jarvis_listKanbanItems` with `details: "true"` (a string), and record it again.  
**Expected**: Response is `{ error: "details must be true or false" }` with
no items; the SHA-256 is unchanged.  
**Evidence**: handler `src/tests/kanban-tool-handlers.test.ts`, "an invalid details value is the error with no items, and is refused before the owner is resolved"; module `src/tests/kanban-board-query.test.ts`, `any other value, null included, is the error "details must be true or false"`; hash `src/tests/kanban-write-handlers.test.ts`, "T-24: details other than true or false is an error and the board file hash is unchanged".  
**Status**: NOT RUN

### T-25 - FILTER VALUES lists statuses in declared order, including empty ones

**AC**: `REQ_KAN_FILTERVALUES` AC-2, AC-3; `SPEC_KAN_FILTERVALUES` AC-3  
**Procedure**: Add `Review` as a status option in the fixture copy without
adding a card with that status. Call `jarvis_listKanbanFilterValues`.  
**Expected**: `statuses` is Backlog 2, In Progress 1, Done 1, Review 0, in
that declared order. The counts sum to 4.  
**Evidence**: module `src/tests/kanban-board-query.test.ts`, "AC-3: every declared status option in declared order with its card count; empty columns carry 0"; handler `src/tests/kanban-tool-handlers.test.ts`, "AC-8 (statuses): a card whose status is not a declared option is not counted; an empty declared column is listed with 0".  
**Status**: NOT RUN

### T-26 - FILTER VALUES counts exact labels and sorts by code point

**AC**: `REQ_KAN_FILTERVALUES` AC-4, AC-5; `SPEC_KAN_FILTERVALUES` AC-5, AC-6  
**Procedure**: (1) Call `jarvis_listKanbanFilterValues` on the sample.
(2) Add `Urgent` to item 3 and call again. (3) Add labels written in YAML as
`"\uFF21"` and `"\U0001F600"` to item 3, then call again.  
**Expected**: (1) `labels` is `[{ name: "urgent", count: 2 }]`. (2) It is
`[{ name: "Urgent", count: 1 }, { name: "urgent", count: 2 }]`. (3) The
labels are ordered `Urgent`, `urgent`, U+FF21, U+1F600, each with count 1
except `urgent` with count 2. U+FF21 must precede U+1F600; a UTF-16 code-unit
sort would put U+1F600 first. Names and counts are exact and per card.  
**Evidence**: module `src/tests/kanban-board-query.test.ts`, "AC-5: sorted in code-point order, independent of the locale"; handler `src/tests/kanban-tool-handlers.test.ts`, "AC-5/AC-6/AC-8: exact names, once per card, code-point order, non-string entries ignored; only declared-status cards count". The handler test uses U+FF5E in place of U+FF21; it separates the same orders.  
**Status**: NOT RUN

### T-27 - FILTER VALUES omits card content and handles invalid inputs

**AC**: `REQ_KAN_FILTERVALUES` AC-1, AC-3, AC-6, AC-7, AC-8;
`SPEC_KAN_FILTERVALUES` AC-1, AC-4, AC-5, AC-7, AC-8, AC-9 and algorithm step 1; `SPEC_KAN_SKILLCONTENT` owner bullet and `SPEC_KAN_CREATE` step 1  
**Procedure**:

1. Call `jarvis_listKanbanFilterValues` with `boardName: "kanban"` and an unknown `ownerName`.
2. On a fresh sample, record the board file SHA-256, call `jarvis_listKanbanFilterValues` with `boardName: "kanban"`, read the full response, and record the SHA-256 again.
3. On a fresh copy, remove the `status` field and call `jarvis_listKanbanFilterValues` with `boardName: "kanban"` again.
4. On a fresh copy, set item 4's status to undeclared `Archived` and add the label `ghostlabel` to item 4 (item 4 keeps `urgent`); call `jarvis_listKanbanFilterValues` with
   `boardName: "kanban"`, then `jarvis_verifyKanbanSchema` with `boardName: "kanban"`.
5. On a fresh copy, set item 2 labels to `["urgent", 42]`; call `jarvis_listKanbanFilterValues` with
   `boardName: "kanban"`, then `jarvis_verifyKanbanSchema` with
   `boardName: "kanban"`.
6. On a fresh copy, call `jarvis_openKanbanBoard` with `boardName: "kanban"`. Clear the refresh and channel records. Record the board file SHA-256, call `jarvis_listKanbanFilterValues` with `boardName: "kanban"`, and check that no refresh was triggered, the "Jarvis Kanban" channel received no call, and the SHA-256 is unchanged.
7. Call `jarvis_listKanbanFilterValues` with `boardName: "no-such-board"`; no board file in the Change Manager folder matches that name.

**Expected**:

1. Response is `{ error: "actor unknown" }` (`SPEC_KAN_SKILLCONTENT` owner bullet for the list/filter tool; tool-level source `SPEC_KAN_CREATE` step 1; both quoted in Spec Alignment).
2. The response contains only `path`, `statuses`, and `labels`; it contains no
   `id`, `name`, `notes`, or field values. The SHA-256 is unchanged.
3. Response is `{ error: "board has no status field" }`.
4. `Archived` is not listed; declared status counts are Backlog 1,
   In Progress 1, Done 1. `labels` is `[{ name: "urgent", count: 1 }]`: item 4's
   `urgent` is not counted, and `ghostlabel`, carried only by item 4, does not
   appear. Verification reports the undeclared status as an error.
5. `urgent` has count 3; the non-string entry `42` is neither listed
   nor counted. Verification returns a finding with `field` `/items/1/labels/1` and `message` `must be string`.
   The overview calls do not change the board file; its SHA-256 is the same
   after each call.
6. No refresh is triggered, the "Jarvis Kanban" channel receives no call, and the board file is unchanged (`SPEC_KAN_FILTERVALUES` AC-9, quoted in Spec Alignment).
7. Response is `{ error: "board not found" }`, with no `path`, `statuses`, or `labels` (`SPEC_KAN_FILTERVALUES` algorithm step 1, quoted in Spec Alignment).

**Evidence** (by step): 1, `src/tests/kanban-filtervalues-handler.test.ts`, "AC-7: an unknown owner returns the same error as jarvis_listKanbanItems"; 2, `src/tests/kanban-filtervalues-handler.test.ts`, "AC-2: the result has exactly path, statuses and labels; path is the default board file" and "AC-6: the result carries no card content and only name and count per entry"; 3, `src/tests/kanban-filtervalues-handler.test.ts`, "AC-3: a board without a status field returns an error, not an empty result"; 4, `src/tests/kanban-tool-handlers.test.ts`, "AC-8 (labels), T-27 step 4 as written by the Test Designer: item 4 undeclared Archived plus label ghostlabel" and `src/tests/kanban-filtervalues-handler.test.ts`, "AC-8: a card whose status is no declared option is reported as a semantic error"; 5, `src/tests/kanban-tool-handlers.test.ts`, "T-27 step 5 as written by the Test Designer: labels [urgent, 42] on item 2; the non-string entry is reported by verify and not counted" and `src/tests/kanban-filtervalues-handler.test.ts`, "AC-8: a label entry that is not text is reported by jarvis_verifyKanbanSchema" and `src/tests/kanban-write-handlers.test.ts`, "T-27 step 5: a non-string label is left unchanged by the read tools and reported by verify"; 6, `src/tests/kanban-write-handlers.test.ts`, "T-27 step 6: the overview call does not refresh the open panel and does not log to the Jarvis Kanban channel"; 7, `src/tests/kanban-filtervalues-handler.test.ts`, "AC-7: a missing board returns the same error as jarvis_listKanbanItems".

**Status**: NOT RUN

## Scenario - MENU (T-28)

### T-28 - The kanban entry is absent on Files nodes

**AC**: `REQ_KAN_UX` AC-6 places the entry on Actor nodes (`contextValue` `jarvisActor`). The Files-node negative is the PM decision in I-9 of `docs/changes/kanban-list-details.md` (user-approved); see Spec Alignment.  
**Procedure**: Part (a) reads the `when` text. Part (b) shows what VS Code does with it.

Part (a), automated static check: read the `when` clause of the `jarvis.createKanbanBoard` entry in the `view/item/context` menu of `packages/kanban/package.json`. Evaluate it as VS Code does: `=~` is a regex test on `viewItem`, `==` is equality, and `||` is OR. Test it against each contextValue that `packages/core/src/engine/actors/actorTreeProvider.ts` assigns to a Files node:

- `jarvisActorFileCategory:agent`, `jarvisActorFileCategory:files`, `jarvisActorFileCategory:touched`
- `jarvisActorFile`, `jarvisActorFileFolder`, `jarvisTouchedFileFolder`, `jarvisTouchedFile`

As a control, the same clause must match `jarvisActor`.

Part (b), manual in the EDH (see Execution Note and Test Setup), with the Actor `UAT Kanban Actor`:

1. Right-click the `UAT Kanban Actor` node. Control: "Add Kanban Board" is listed.
2. Right-click the "Files" category, and the "Agent" and "Recently Touched Files" categories if the EDH shows them. "Add Kanban Board" must not be listed on any of them.
3. Right-click a file under "Files" (for example `context.md`). It must not be listed.
4. Right-click a folder under "Files", and a touched file or folder, if the EDH shows any. If it shows none, record "none shown" for that kind; part (a) still covers its contextValue.

**Expected**:

- Part (a): no listed contextValue matches the clause, and the control `jarvisActor` matches.
- Part (b): step 1 lists the entry. Steps 2 to 4 list it on no node that was right-clicked. Record each node tested and what its menu listed.

**Evidence**: part (a): `src/tests/kanban-actor-menu-when.test.ts`, describe "REQ_KAN_UX AC-6: Add Kanban Board menu entry on actor nodes only"; tests "negative: Files-node contextValue %s does not match" (one case per value in Procedure), "positive: jarvisActor matches", "positive: jarvisProject and jarvisSession still match", "control: the menu entry exists and its when-clause parses", "control: the seven Files-node contextValues are still produced by actorTreeProvider.ts", and "negative control: a prefix match on jarvisActor would be caught by the Files-node check". The values match `actorTreeProvider.ts` at `0c2b0ea`: category type (line 20), template (line 148), four literals. The part (a) test uses its own parser for the `=~`, `==` and `||` subset; it does not show VS Code evaluating the clause. Part (b), manual, not yet executed in the EDH.  
**User record**: [User Validation](kanban-list-details.md#user-validation), row T-28 (b) (user-observed values, not a protocol result).  
**Status**: NOT RUN

### T-29 - The bundled skill does not say to omit ownerName

**AC**: `REQ_KAN_SKILLCONTENT` AC-4 (the owner rule the skill must match); `SPEC_KAN_SKILLCONTENT` Owner Resolution and Workflow; I-8 in `docs/changes/kanban-list-details.md`  
**Procedure**: Search the bundled asset `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md` for `omit` followed by `ownerName`, with backticks optional. The provisioned copy is not checked by this case.  
**Expected**: No match. The check asserts that the wrong sentence is absent. It does not assert that Workflow step 1 says `ownerName` is always passed.  
**Evidence**: `src/tests/kanban-skill-ownername-guard.test.ts`, describe "I-8: bundled kanban skill always passes ownerName", test "the skill contains no "omit ownerName" instruction"; control "control: the Workflow section contains the step 1 line", which asserts `1. **Create**` in the Workflow section. The control shows the line exists, not what it says about `ownerName`.  
**Status**: NOT RUN

## Proposed Automated Cases - T-21 Items (for review, not in Test Scope)

Proposed by the Test Designer on PM request (2026-10-19), revised on PM rulings of 2026-10-19: each case checks behavior or registration, not prose. Not run. Not in Test Scope until PM approves.

### T-21a - The Tools table names the nine registered tools (covered by existing test)

**AC**: `REQ_KAN_SKILLCONTENT` AC-8..AC-10, as T-21  
**Evidence**: `src/tests/kanban-board-query.test.ts`, describe "skill asset and README (SPEC_KAN_SKILLCONTENT AC-7, AC-8; REQ_KAN_SKILLCONTENT AC-10)", test "AC-7: the Tools table lists exactly the nine registered tools, each once". Not proposed (PM ruling 2026-10-19).  
**Expected**: The two sets are equal and each has nine names, including `jarvis_listKanbanFilterValues` and `jarvis_updateKanbanFields`.  
**Status**: NOT RUN

### T-21b - Add assigns the id, and a deleted id is not reused

**AC**: `REQ_KAN_SKILLCONTENT` AC-8..AC-10, as T-21  
**Procedure**: On a fixture board that has `nextId`, using the handler capture of `src/tests/kanban-write-handlers.test.ts`: call `jarvis_addKanbanItem` without an id and note the returned id N; call `jarvis_deleteKanbanItem` with `itemId` N; call `jarvis_addKanbanItem` again without an id.  
**Expected**: The second add returns an id greater than N, and `nextId` in the file equals that id plus one.  
**Status**: NOT RUN

### T-21c - The list handler passes details to the query as a boolean (handler mapping only)

**AC**: `REQ_KAN_SKILLCONTENT` AC-8..AC-10, as T-21  
**Evidence**: The schema part (`details` is boolean, not required) is covered by `SPEC_KAN_LIST AC-11` in `src/tests/kanban-board-query.test.ts` and is not repeated here. No test names the handler mapping.  
**Expected**: In `packages/kanban/src/extension.ts`, the `jarvis_listKanbanItems` handler's `selectItems` call takes `details: input.details === true`.  
**Status**: NOT RUN

### T-21d - The filter-values tool is registered and named in the skill (covered by existing test)

**AC**: `REQ_KAN_SKILLCONTENT` AC-8..AC-10, as T-21  
**Evidence**: `src/tests/kanban-board-query.test.ts`, describe "skill asset and README (SPEC_KAN_SKILLCONTENT AC-7, AC-8; REQ_KAN_SKILLCONTENT AC-10)", test "AC-7: the Tools table lists exactly the nine registered tools, each once" (set equality of the `registerTool` names and the Tools table rows, so the filter tool is in both). Not proposed (PM ruling 2026-10-19).  
**Expected**: Both hold. The order of the two tools in the skill is not checked.  
**Status**: NOT RUN

### T-21e - No fetch-by-id tool is registered

**AC**: `REQ_KAN_SKILLCONTENT` AC-8..AC-10, as T-21  
**Procedure**: Collect the names of all `api.registerTool('jarvis_...'` calls in `packages/kanban/src/extension.ts`. Test each name against `/get|fetch|read|retrieve/i`.  
**Expected**: No registered name matches.  
**Status**: NOT RUN

Points for review:

- PM rulings of 2026-10-19 applied: no provisioned-copy equality test; T-21b and T-21c check code and registration, not the skill's wording; T-21e is the registration check only, and the negative text check is dropped.
- Overlap (PM ruling 2026-10-19): T-21a and T-21d are covered by AC-7 and marked above. T-21c is narrowed to the handler mapping; its schema is covered by AC-11 and not repeated. The proposed file holds T-21b, T-21c and T-21e.
- Decided (user decision, 2026-10-19; fixed in `3741adb`): on a board without `nextId`, delete writes `nextId` as max(existing ids) + 1 when it is absent, so a deleted id is not reused. This resolves the conflict between SKILL.md line 66 (ids never reused) and line 35 (`nextId` derived when absent). Covered by T-9b (automated); T-21b covers add-after-delete only on a board that has `nextId`. Disclosed limit: a board that lost its highest id before `3741adb` has no record of it, and the fix does not restore it.

## Spec Alignment

- T-28: `REQ_KAN_UX` AC-6 places the entry on Actor nodes and states no Files-node negative. The negative is the PM decision in I-9 (user-approved), so T-28 is a protocol check and not approved requirement wording. Actor-node placement is listed under Not covered in Test Scope.
- T-29: `REQ_KAN_SKILLCONTENT` AC-4 states the owner rule. The PM agreed (I-8) that the case checks only that the wrong sentence is absent. It does not check the positive wording of Workflow step 1.

- T-15..T-18 follow `SPEC_UAT_KAN_MGMT` as fixed in commit `14f36ab` (System Designer):
  `fieldName`/`fieldType`, option objects, and `path` in the success result,
  matching the registered tool. They remain NOT RUN; live runs are the user's.
- T-19 follows `SPEC_UAT_KAN_MGMT` as fixed in commit `a4ae8ee` (System Designer):
  the first call reads "{ path, updated: true, operation: "addOption" }", matching
  the shipped response of `jarvis_updateKanbanFields` in
  `packages/kanban/src/extension.ts`. The duplicate and text-field calls return
  errors per the same UAT text.
- T-26's UAT phrase "sorted by name" is consistent with the explicit
  code-point ordering in `SPEC_KAN_FILTERVALUES` AC-5. The Unicode pair makes
  that ordering distinguishable from UTF-16 code-unit order.
- T-27 step 5 is supplemental coverage. The `42` entry is traced to
  `SPEC_KAN_FILTERVALUES` AC-8 (neither listed nor counted) and
  `REQ_KAN_FILTERVALUES` AC-8 (verification reports it). The `urgent` count of 3 is
  traced to `SPEC_KAN_FILTERVALUES` AC-5. The approved expected outcomes and both
  specs are unchanged.
- T-27 step 5 expects a verify finding with `field` `/items/1/labels/1` and `message` `must be string`. `REQ_KAN_VERIFY` AC-4 requires `field` and `message` per finding and makes `item` optional, so the finding does not have to name item 2 or the value `42`. PM decided (CM, 10:11:43Z): keep as is. The finding names no item and no value.
- T-27 step 4 covers the label half of `SPEC_KAN_FILTERVALUES` AC-8 (QM F-1,
  fixed in `24602ba`): labels of an undeclared-status card are not counted, and a
  label shared with a declared card counts that card only. On the sample, `urgent`
  is on items 1 and 4, so with item 4 undeclared it counts 1. The automated tests
  in `src/tests/kanban-board-query.test.ts` (commit `24602ba`) state the same rule:
  "AC-8 (labels): a card whose status is not a declared option contributes none of
  its labels (QM F-1)" (Mystery `[ghostlabel, keep]` and Todo `[keep]` give
  `keep: 1`, no `ghostlabel`), and "AC-8 (labels): a label carried only by
  undeclared-status cards does not appear; shared labels count the declared cards
  only". They are not evidence for T-27; T-27 stays NOT RUN.
- Not in approved spec: the scalar `labels` value `"malformed"`. Only the
  `SPEC_KAN_FILTERVALUES` algorithm step 5 states it; no AC does. Not tested by T-27.
- Owner (step 1): `SPEC_KAN_SKILLCONTENT` owner bullet (cited for the list/filter
  tool) reads "A supplied name that matches no discovered Actor, or more than
  one, returns { error: "actor unknown" }". It is "Stated as the tool behaves
  (SPEC_KAN_CREATE step 1)", and `SPEC_KAN_CREATE` step 1 reads "Unless exactly
  one Actor matches → return { error: "actor unknown" }" (tool-level source).
  The approved UAT T-27 step 1 in `SPEC_UAT_KAN_MGMT` reads "Step 1:
  { error: "actor unknown" }".
- Owner delegation: `SPEC_KAN_LIST` says the handler "keeps owner resolution and
  file access", and `SPEC_KAN_FILTERVALUES` says it "resolves the owner and board
  and parses the file as SPEC_KAN_LIST does". Both algorithms read "Resolve owner
  and board path; board missing → { error: "board not found" }". So
  `SPEC_KAN_LIST` and `SPEC_KAN_FILTERVALUES` delegate owner resolution without
  the text; neither states "actor unknown". `REQ_KAN_FILTERVALUES` AC-7 (quoted
  below) requires the same errors as `jarvis_listKanbanItems` for an unknown owner.
- Board-not-found (step 7): `SPEC_KAN_FILTERVALUES` algorithm step 1 reads
  "Resolve owner and board path; board missing → { error: "board not found" }".
  `REQ_KAN_FILTERVALUES` AC-7 reads "A missing board or an unknown owner SHALL
  return the same errors as `jarvis_listKanbanItems`." Step 7 names a board that
  matches no file in the Change Manager folder, so the board is missing.
- Refresh (step 6): `SPEC_KAN_FILTERVALUES` AC-9 reads "The board file is not modified and no panel refresh is triggered" and cites `REQ_KAN_FILTERVALUES` AC-7, which has no refresh wording. Step 6 checks the refresh mock and the "Jarvis Kanban" channel mock in the automated test `src/tests/kanban-write-handlers.test.ts`, so an explicit refresh call is detected. The unmodified-file part is checked by the SHA-256 comparisons in steps 5 and 6.
- T-1 is the four-step end-to-end manual scenario (create, open, add, move to Done), as approved by the PM and relayed by Change Manager. Its steps match T-1 in `SPEC_UAT_KAN_MGMT` (committed at `6549338`; System Designer owns it under F4). This protocol does not change that spec.
- T-6a and T-6b: `REQ_KAN_ADD` AC-4 and `REQ_KAN_WRITEVALID` AC-4 require a caller-supplied id to be rejected, not dropped. At HEAD the add handler rejects a top-level `id` with an error (`packages/kanban/src/extension.ts`, line 150), so T-6b runs against committed code.
- T-5, T-5b and T-5c: an undeclared top-level key (for example `silentTrap` beside
`name`) is rejected with an error at HEAD, so these cases test committed code.
`REQ_KAN_WRITEVALID` AC-3 reads "A key that matches no declared field and is not a
built-in item property ... SHALL be rejected with an error naming the declared field
names", which covers that key. The rule is `SPEC_KAN_WRITEVALID` rule 6, committed
in `docs/design/spec_kan.rst` at commit `50526b2` (decision F3 by System Designer).
T-5 tests only the `fields` form. T-5b and T-5c are separate cases (PM decision, CM
10:11:43Z).
- T-9: PM decision (CM 10:19:01Z): untouched items are checked by parsed equality
only, as `REQ_KAN_DELETE` AC-7 requires. The whole-file LF check is removed. The
test at `src/tests/kanban-write-handlers.test.ts` line 218 checks the same parsed
values and is the Evidence for T-9.