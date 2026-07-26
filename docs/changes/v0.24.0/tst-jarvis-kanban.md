# Test Protocol: jarvis-kanban

**Change Request**: jarvis-kanban (#46)  
**Branch**: feature/jarvis-kanban  
**UAT Spec**: [SPEC_UAT_KANBAN](../design/spec_uat_kanban.rst)  
**Date**: 2026-07-25

---

## Test Scope

This protocol covers User Acceptance Testing for the `jarvis-kanban` module.
The tests verify:

1. **Renderer** — columns match YAML field options (order + color), cards placed
   correctly, all card fields visible (T-1, T-2)
2. **Filtering** — client-side `label:<value>` and `<field>:<value>` filters (T-3)
3. **Live update** — board refreshes on YAML file save without closing panel (T-4)
4. **Convention discovery** — tree button appears/disappears based on board file
   presence; `kanban.yaml` and `*.kanban.yaml` both recognized (T-5, T-6)
5. **Multi-board Quick Pick** — Quick Pick shown when owner has >1 boards (T-7)
6. **`createKanbanBoard`** — skeleton creation, `whoAmI` owner resolution,
   duplicate-board guard, unknown-owner error (T-8, T-9, T-10, T-11)
7. **`verifyKanbanSchema`** — clean verification, missing-status-field,
   bad-item-status, bad-field-value (T-12, T-13a, T-13b, T-14)
8. **`openKanbanBoard`** — opens renderer, board-not-found error (T-15, T-16)
9. **Item IDs** — `#id` prefix in renderer (T-17), skeleton `nextId` in new boards (T-18)
10. **`updateKanbanItem`** — status change success (T-19), item-not-found error (T-20),
    unknown-owner error (T-21), ID immutability guard (T-22)
11. **Multi-board fixture with IDs** — `sprint2.kanban.yaml` ID rendering (T-23)
12. **`id` required** — `verifyKanbanSchema` detects missing item `id` across three fixtures (T-24)
13. **Context menu create** — "Add Kanban Board" on entity root node (Session/Project/Event), no owner prompt (T-25)
14. **Custom editor** — clicking kanban file opens webview, not text editor (T-26)
15. **Escape hatch (title bar)** — "Open as Text" title bar button opens YAML in standard editor (T-27)
16. **Notes truncation** — long notes clipped at 30 chars on card; full text on hover (T-28)

**Module integration** (compile, package, CI) is verified by the Dev Engineer,
not covered by UAT.

---

## Test Environment Setup

### Prerequisites

- **VS Code Extension Development Host (EDH)** with Jarvis from
  `feature/jarvis-kanban` branch (F5)
- **Workspace**: `testdata/test.code-workspace`
- **`jarvis-kanban` extension loaded**: verify with Command Palette →
  search "Open Kanban Board" — command must be present
- **Jarvis Output Channel** open (View → Output → Jarvis)
- **Settings**: `jarvis.sessions.enabled: true` (default)

### Required Test Data

| Path | Purpose |
|------|---------|
| `testdata/kanban/sample.kanban.yaml` | Canonical fixture (see below) |
| `testdata/.jarvis/actors/Change Manager/session.yaml` | Actor for `whoAmI` tests |
| `testdata/.jarvis/actors/Change Manager/kanban.yaml` | Copy of `sample.kanban.yaml` |
| `testdata/.jarvis/actors/Change Manager/missing-id.kanban.yaml` | Negative fixture: item missing `id` (T-24) |
| `testdata/.jarvis/actors/Change Manager/missing-id.kanban.yaml` | Negative fixture: item missing `id` (T-24) |
| `testdata/.jarvis/actors/Test Designer/session.yaml` | Actor for `createKanbanBoard` |

**`testdata/kanban/sample.kanban.yaml`** must contain:
```yaml
title: Test Board
nextId: 5
fields:
  - name: status
    type: single_select
    options:
      - name: Backlog
        color: "#6c757d"
      - name: In Progress
        color: "#0d6efd"
      - name: Done
        color: "#198754"
  - name: priority
    type: single_select
    options:
      - name: Low
      - name: Medium
      - name: High
items:
  - id: 1
    name: First Task
    status: Backlog
    priority: High
    labels:
      - urgent
    notes: "Important work"
  - id: 2
    name: Second Task
    status: In Progress
    priority: Medium
  - id: 3
    name: Third Task
    status: Done
    priority: Low
  - id: 4
    name: Another Urgent
    status: Backlog
    priority: High
    labels:
      - urgent
```

### Cleanup Between Tests

- Restore `kanban.yaml` to its original sample content after T-4 (live update)
- Delete test-created boards after each tool test (T-8: `Test Designer/kanban.yaml`,
  T-9: `Change Manager/sprint3.kanban.yaml`, T-13a/T-13b/T-14: bad fixtures)
- Restore `Test Designer` folder to no-board state after T-5/T-6 (or re-delete
  if T-5 left a file)
- Restart EDH after `jarvis.sessions.enabled` is changed (T-7 does not require
  settings change)

---

## Test Scenarios

### T-1: Valid board renders with correct columns

**Acceptance Criteria**: REQ_KAN_RENDERER AC-1; SPEC_KAN_RENDERER

**Precondition**: `Change Manager/kanban.yaml` present; tree button visible.

**Procedure**:
1. Click the kanban board tree button on the `Change Manager` node in the
   Jarvis sidebar (or use Command Palette → "Jarvis: Open Kanban Board" →
   "Change Manager")
2. Observe the webview panel

**Expected Result**:
- ✅ Webview panel opens with title related to the board name
- ✅ Three columns appear: **Backlog**, **In Progress**, **Done** (in that order)
- ✅ Column headers show colors: Backlog = `#6c757d`, In Progress = `#0d6efd`,
  Done = `#198754`
- ✅ Each column header shows the item count badge

**Pass Criteria**: Columns in YAML order, colors applied

---

### T-2: Cards placed in correct columns with all fields visible

**Acceptance Criteria**: REQ_KAN_RENDERER AC-2, AC-3; SPEC_KAN_RENDERER

**Precondition**: Board open from T-1.

**Procedure**:
1. Inspect each column and verify card placement against the YAML
2. Inspect individual cards for name, labels, field values, notes

**Expected Result**:
- ✅ "First Task" in **Backlog** column
- ✅ "Second Task" in **In Progress** column
- ✅ "Third Task" in **Done** column
- ✅ "Another Urgent" in **Backlog** column
- ✅ "First Task" card shows: name (bold), label badge `urgent`, `priority: High`,
  notes `"Important work"`
- ✅ Empty columns (if any) show "No items" placeholder rather than being hidden

**Pass Criteria**: All items in correct columns; card content complete

---

### T-3: Client-side filtering

**Acceptance Criteria**: REQ_KAN_RENDERER AC-4; SPEC_KAN_RENDERER (filtering)

**Precondition**: Board open.

**Procedure**:
1. Type `label:urgent` in the filter bar; observe
2. Clear filter; observe
3. Type `priority:High` in the filter bar; observe
4. Clear filter; observe

**Expected Result**:
- ✅ Step 1: Only "First Task" and "Another Urgent" visible (both labelled
  `urgent`); "Second Task" and "Third Task" hidden
- ✅ Step 2: All 4 cards restored
- ✅ Step 3: Only "First Task" and "Another Urgent" visible (`priority: High`)
- ✅ Step 4: All 4 cards restored

**Pass Criteria**: Filter hides/shows cards correctly; clear restores full board

---

### T-4: Live update on file save

**Acceptance Criteria**: REQ_KAN_RENDERER AC-4; SPEC_KAN_RENDERER (file watching)

**Precondition**: Board open; `kanban.yaml` also open in a text editor.

**Procedure**:
1. Count items in Backlog (should be 2: "First Task", "Another Urgent")
2. In the text editor, add to `items`:
   ```yaml
   - name: New Test Card
     status: Backlog
     priority: Low
   ```
3. Save file (Ctrl+S)
4. Watch the board panel without closing it

**Expected Result**:
- ✅ Within ~2 seconds, the board refreshes without closing
- ✅ "New Test Card" appears in the Backlog column
- ✅ Backlog count badge increments from 2 to 3
- ✅ Panel stays open (not closed and reopened)

**Teardown**: Remove the added item, save

**Pass Criteria**: Live refresh confirmed without panel close

---

### T-5: Discovery — tree button appears for kanban.yaml

**Acceptance Criteria**: REQ_KAN_DISCOVER AC-1; SPEC_KAN_DISCOVER

**Precondition**: `Test Designer` actor folder has NO board file. Confirm
no kanban button on `Test Designer` node.

**Procedure**:
1. Copy `testdata/kanban/sample.kanban.yaml` to
   `testdata/.jarvis/actors/Test Designer/kanban.yaml`
2. Trigger rescan (Command Palette → "Jarvis: Rescan" or wait for auto-scan)
3. Observe `Test Designer` node in sidebar

**Expected Result**:
- ✅ Kanban board inline button appears on the `Test Designer` node
- ✅ Clicking the button opens the board (no errors)

**Pass Criteria**: Tree button appears after file creation + rescan

---

### T-6: Discovery — tree button disappears when board deleted

**Acceptance Criteria**: REQ_KAN_DISCOVER AC-4; SPEC_KAN_DISCOVER

**Precondition**: Follows T-5; `Test Designer` shows tree button.

**Procedure**:
1. Delete `testdata/.jarvis/actors/Test Designer/kanban.yaml`
2. Trigger rescan
3. Observe `Test Designer` node

**Expected Result**:
- ✅ Kanban board button is no longer visible on `Test Designer`
- ✅ No stale button, no error in Output Channel

**Pass Criteria**: Button cleanly removed after file deletion + rescan

---

### T-7: Quick Pick for multiple boards

**Acceptance Criteria**: REQ_KAN_UX AC-2, AC-3; SPEC_KAN_UX

**Precondition**: `Change Manager` folder has both `kanban.yaml` and
`sprint2.kanban.yaml`.

**Procedure**:
1. Click the kanban tree button on `Change Manager`
2. Observe Quick Pick

**Expected Result**:
- ✅ Quick Pick appears with two options (e.g., "kanban" and "sprint2")
- ✅ Selecting one opens the corresponding board
- ✅ Pressing Escape closes the Quick Pick without opening any board

**Pass Criteria**: Multi-board picker appears; selection opens correct board

---

### T-8: createKanbanBoard — whoAmI owner resolution

**Acceptance Criteria**: REQ_KAN_CREATE AC-3, AC-6; SPEC_KAN_CREATE

**Precondition**: `Test Designer` session is open and **active tab**. No
`kanban.yaml` exists in `Test Designer` actor folder.

**Procedure**:
1. In the `Test Designer` chat session, invoke `#createKanbanBoard` (no params)
2. Check the file system

**Expected Result**:
- ✅ `testdata/.jarvis/actors/Test Designer/kanban.yaml` created on disk
- ✅ File contains `title`, `fields` (with `status` field), `items: []`
- ✅ Tool result: `{ "path": "<absolute>/kanban.yaml" }`
- ✅ Owner resolved as `Test Designer` (not another actor)

**Teardown**: Delete `Test Designer/kanban.yaml`

**Pass Criteria**: Skeleton created; `whoAmI` resolved correct owner

---

### T-9: createKanbanBoard — named board with explicit owner

**Acceptance Criteria**: REQ_KAN_CREATE AC-1, AC-2, AC-4, AC-6

**Precondition**: No `sprint3.kanban.yaml` in `Change Manager` folder.

**Procedure**:
1. Invoke: `#createKanbanBoard boardName="sprint3" ownerName="Change Manager"`
2. Check file system

**Expected Result**:
- ✅ `testdata/.jarvis/actors/Change Manager/sprint3.kanban.yaml` created
- ✅ YAML `title` is `"sprint3"` (or the boardName)
- ✅ Tool result: `{ "path": "<absolute>/sprint3.kanban.yaml" }`

**Teardown**: Delete `sprint3.kanban.yaml`

**Pass Criteria**: Named file created at correct path

---

### T-10: createKanbanBoard — duplicate board error

**Acceptance Criteria**: REQ_KAN_CREATE AC-7; SPEC_KAN_CREATE

**Precondition**: `Change Manager/kanban.yaml` already exists.

**Procedure**:
1. Invoke: `#createKanbanBoard ownerName="Change Manager"` (default boardName)

**Expected Result**:
- ✅ Tool returns: `{ "error": "board already exists", "path": "<abs>/kanban.yaml" }`
- ✅ Existing `kanban.yaml` is NOT overwritten (check content unchanged)
- ✅ No crash

**Pass Criteria**: Duplicate guard prevents overwrite; structured error returned

---

### T-11: createKanbanBoard — unknown owner error

**Acceptance Criteria**: REQ_KAN_CREATE AC-5; SPEC_KAN_CREATE

**Precondition**: No entity named `NonExistent` registered.

**Procedure**:
1. Invoke: `#createKanbanBoard ownerName="NonExistent"`

**Expected Result**:
- ✅ Tool returns: `{ "error": "actor unknown" }`
- ✅ No file created
- ✅ No crash

**Pass Criteria**: Error returned; no side effects

---

### T-12: verifyKanbanSchema — clean board

**Acceptance Criteria**: REQ_KAN_VERIFY AC-1..AC-4; SPEC_KAN_VERIFY

**Precondition**: `Change Manager/kanban.yaml` is the sample fixture (valid).

**Procedure**:
1. Invoke: `#verifyKanbanSchema ownerName="Change Manager"`

**Expected Result**:
- ✅ Result: `{ "board": "<path>", "errors": [], "warnings": [] }`
- ✅ No false positives

**Pass Criteria**: Clean board verified without spurious findings

---

### T-13a: verifyKanbanSchema — missing status field

**Acceptance Criteria**: REQ_KAN_VERIFY AC-1, AC-3; SPEC_KAN_VERIFY

**Procedure**:
1. Create `testdata/.jarvis/actors/Change Manager/bad.kanban.yaml`:
   ```yaml
   title: Bad Board
   fields:
     - name: priority
       type: single_select
       options:
         - name: High
   items: []
   ```
2. Invoke: `#verifyKanbanSchema boardName="bad" ownerName="Change Manager"`

**Expected Result**:
- ✅ `errors` contains entry with `field: "status"` and a message about missing
  status field
- ✅ Each finding has at least `field` and `message` keys

**Teardown**: Delete `bad.kanban.yaml`

**Pass Criteria**: Missing-status-field semantic error detected

---

### T-13b: verifyKanbanSchema — item with invalid status value

**Acceptance Criteria**: REQ_KAN_VERIFY AC-2, AC-3; SPEC_KAN_VERIFY

**Procedure**:
1. Create `testdata/.jarvis/actors/Change Manager/bad2.kanban.yaml`:
   ```yaml
   title: Bad Board 2
   fields:
     - name: status
       type: single_select
       options:
         - name: Backlog
         - name: Done
   items:
     - name: Lost Card
       status: "NotAColumn"
   ```
2. Invoke: `#verifyKanbanSchema boardName="bad2" ownerName="Change Manager"`

**Expected Result**:
- ✅ `errors` contains entry with `field: "status"`, message indicating
  `"NotAColumn"` is not a valid option, and `item: "Lost Card"`
- ✅ Structured finding with item context

**Teardown**: Delete `bad2.kanban.yaml`

**Pass Criteria**: Bad item status value detected with item context

---

### T-14: verifyKanbanSchema — item field value not in options

**Acceptance Criteria**: REQ_KAN_VERIFY AC-3; SPEC_KAN_VERIFY

**Procedure**:
1. Create `testdata/.jarvis/actors/Change Manager/bad3.kanban.yaml`:
   ```yaml
   title: Bad Board 3
   fields:
     - name: status
       type: single_select
       options:
         - name: Backlog
     - name: priority
       type: single_select
       options:
         - name: Low
         - name: High
   items:
     - name: Overdue Task
       status: Backlog
       priority: Critical
   ```
2. Invoke: `#verifyKanbanSchema boardName="bad3" ownerName="Change Manager"`

**Expected Result**:
- ✅ `errors` or `warnings` contains an entry for `field: "priority"` with a
  message about `"Critical"` not being a defined option, and `item: "Overdue Task"`

**Teardown**: Delete `bad3.kanban.yaml`

**Pass Criteria**: Custom field value violation detected with item context

---

### T-15: openKanbanBoard — board opens in renderer

**Acceptance Criteria**: REQ_KAN_OPEN AC-1, AC-2; SPEC_KAN_OPEN

**Precondition**: `Change Manager/kanban.yaml` exists.

**Procedure**:
1. Invoke: `#openKanbanBoard ownerName="Change Manager"`

**Expected Result**:
- ✅ Kanban renderer webview opens showing the `Change Manager` board
- ✅ Tool result: `{ "opened": true, "path": "<absolute>/kanban.yaml" }`

**Pass Criteria**: Board opens via tool; result contains path

---

### T-16: openKanbanBoard — board not found error

**Acceptance Criteria**: REQ_KAN_OPEN AC-3; SPEC_KAN_OPEN

**Precondition**: `Test Designer` actor folder has no board file.

**Procedure**:
1. Invoke: `#openKanbanBoard ownerName="Test Designer"`

**Expected Result**:
- ✅ Tool returns: `{ "error": "board not found" }`
- ✅ No broken webview panel opened
- ✅ No crash

**Pass Criteria**: Graceful error for missing board

---

### T-17: Cards display `#id` prefix

**Acceptance Criteria**: SPEC_KAN_RENDERER AC-6

**Precondition**: `Change Manager/kanban.yaml` is the updated sample fixture
(`nextId: 5`, items have `id: 1..4`). Open the board.

**Procedure**:
1. Open the board (tree button or `#openKanbanBoard`)
2. Inspect each card in all columns

**Expected Result**:
- ✅ Every card shows a `#<id>` prefix (e.g., `#1 First Task`, `#4 Another Urgent`)
- ✅ IDs are unique per card — no two cards share the same `#id`
- ✅ The `#id` is visually distinct from the item name

**Pass Criteria**: All four cards show correct `#id` prefixes

---

### T-18: createKanbanBoard skeleton includes `nextId`

**Acceptance Criteria**: REQ_KAN_CREATE AC-6; SPEC_KAN_CREATE

**Precondition**: `Test Designer` actor has no board file. `Test Designer`
session is the active tab.

**Procedure**:
1. Invoke `#createKanbanBoard` (no params)
2. Open the created `kanban.yaml` in a text editor

**Expected Result**:
- ✅ `nextId: 1` present at the top level of the YAML
- ✅ `items: []` (empty — no IDs to assign yet)
- ✅ `#verifyKanbanSchema` on the new file returns `errors: [], warnings: []`

**Teardown**: Delete `Test Designer/kanban.yaml`

**Pass Criteria**: Skeleton has `nextId`; passes schema verification

---

### T-19: updateKanbanItem — status change success

**Acceptance Criteria**: REQ_KAN_UPDATE AC-2, AC-4; SPEC_KAN_UPDATE

**Precondition**: `Change Manager/kanban.yaml` has item `id: 2`
(`Second Task`, status `In Progress`).

**Procedure**:
1. Invoke:
   ```
   #updateKanbanItem itemId=2 changes={"status":"Done"} ownerName="Change Manager"
   ```
2. Open the YAML in a text editor and verify `id: 2` entry
3. If board is open in renderer, observe the panel

**Expected Result**:
- ✅ Tool returns: `{ "path": "...", "updated": true, "itemId": 2 }`
- ✅ `id: 2` in YAML now has `status: Done`
- ✅ If board was open, `Second Task` moves to the `Done` column without
  closing the panel
- ✅ `nextId: 5` is unchanged (update does not affect the counter)

**Teardown**: Restore `id: 2` to `status: In Progress`

**Pass Criteria**: Status changed in YAML; tool result correct; counter unaffected

---

### T-20: updateKanbanItem — item not found

**Acceptance Criteria**: REQ_KAN_UPDATE AC-4; SPEC_KAN_UPDATE AC-2

**Precondition**: `Change Manager/kanban.yaml` has no item with `id: 99`.

**Procedure**:
1. Invoke:
   ```
   #updateKanbanItem itemId=99 changes={"status":"Done"} ownerName="Change Manager"
   ```

**Expected Result**:
- ✅ Tool returns: `{ "error": "item not found", "itemId": 99 }`
- ✅ YAML file is not modified
- ✅ No crash

**Pass Criteria**: Structured error for unknown ID; no side effects

---

### T-21: updateKanbanItem — unknown owner

**Acceptance Criteria**: REQ_KAN_UPDATE AC-4; SPEC_KAN_UPDATE

**Precondition**: No entity named `Ghost` is registered.

**Procedure**:
1. Invoke:
   ```
   #updateKanbanItem itemId=1 changes={"status":"Done"} ownerName="Ghost"
   ```

**Expected Result**:
- ✅ Tool returns: `{ "error": "actor unknown" }`
- ✅ No file read or modified
- ✅ No crash

**Pass Criteria**: Actor-unknown error before any file access

---

### T-22: ID immutability — `id` in changes is ignored

**Acceptance Criteria**: REQ_KAN_UPDATE AC-5; SPEC_KAN_UPDATE AC-4

**Precondition**: `Change Manager/kanban.yaml` has item `id: 1` (`First Task`,
status `Backlog`).

**Procedure**:
1. Invoke (include `id` in changes payload):
   ```
   #updateKanbanItem itemId=1 changes={"id":99,"status":"Done"} ownerName="Change Manager"
   ```
2. Open the YAML and inspect item `id: 1`

**Expected Result**:
- ✅ Tool returns: `{ "path": "...", "updated": true, "itemId": 1 }`
- ✅ Item `id: 1` now has `status: Done` (the valid change applied)
- ✅ Item `id` is still `1` in the YAML — NOT changed to `99`
- ✅ No item with `id: 99` was created

**Teardown**: Restore `id: 1` to `status: Backlog`

**Pass Criteria**: `id` in `changes` silently ignored; other changes applied

---

### T-23: Multi-board Quick Pick — `sprint2.kanban.yaml` renders with IDs

**Acceptance Criteria**: REQ_KAN_UX AC-2, AC-3; SPEC_KAN_RENDERER AC-6

**Precondition**: `Change Manager` actor folder has both `kanban.yaml`
(`nextId: 5`, items `id: 1..4`) and `sprint2.kanban.yaml` (`nextId: 4`,
items `id: 1..3`, columns `Todo`/`Active`/`Done`).

**Procedure**:
1. Click the kanban tree button on `Change Manager`
2. In the Quick Pick, select "sprint2"
3. Inspect the opened board

**Expected Result**:
- ✅ Quick Pick shows both boards (same as T-7)
- ✅ `sprint2` board opens with columns: `Todo`, `Active`, `Done`
- ✅ Cards show `#1`, `#2`, `#3` prefixes (from `sprint2.kanban.yaml` IDs)
- ✅ No items from `kanban.yaml` appear in the `sprint2` board

**Pass Criteria**: Named board with IDs renders correctly; no cross-board contamination

---

### T-24: verifyKanbanSchema — missing `id` across three negative fixtures

**Acceptance Criteria**: REQ_KAN_SCHEMA AC-7; REQ_KAN_VERIFY AC-2; SPEC_KAN_VERIFY

**Precondition**:
- `testdata/.jarvis/actors/Change Manager/missing-id.kanban.yaml` — one item with `id: 1`, one without `id`
- `testdata/.jarvis/actors/Actor 1/kanban.yaml` — all items without `id`
- `testdata/.jarvis/actors/Actor 1/bug.kanban.yaml` — all items without `id`

**Procedure**:
1. Invoke: `#verifyKanbanSchema boardName="missing-id" ownerName="Change Manager"`
2. Invoke: `#verifyKanbanSchema ownerName="Actor 1"` (default board)
3. Invoke: `#verifyKanbanSchema boardName="bug" ownerName="Actor 1"`

**Expected Result**:
- ✅ All three calls return `errors` containing entries for each item missing `id`
- ✅ Each error entry has `field` (`"id"` or similar) and `message` keys
- ✅ For `missing-id`: only the item without `id` is flagged; `id: 1` item has no error
- ✅ No crash for any invocation

**Pass Criteria**: All three negative fixtures detected; partial fixture correctly distinguishes valid vs invalid items

---

### T-25: Context menu "Add Kanban Board" on entity root node

**Acceptance Criteria**: REQ_KAN_UX AC-6; SPEC_KAN_UX AC-7; SPEC_KAN_CREATE

**Precondition**: Jarvis sidebar visible. Entity root node (Session, Project, or
Event) — e.g., `Change Manager` — does NOT have a `sprint4.kanban.yaml`.

**Procedure**:
1. Right-click the **entity root node** (e.g., `Change Manager` in the Sessions
   tree — not the Files sub-node)
2. Select **"Add Kanban Board"** from the context menu
3. In the InputBox, enter `sprint4` and press Enter
4. Check the actor folder on disk

**Expected Result**:
- ✅ No owner selection prompt appears (owner inferred from clicked node)
- ✅ `testdata/.jarvis/actors/Change Manager/sprint4.kanban.yaml` is created
- ✅ Skeleton contains `title`, `fields` (with `status`), `nextId: 1`, `items: []`
- ✅ Tree button appears on `Change Manager` node after rescan (if not already present)

**Teardown**: Delete `sprint4.kanban.yaml`

**Pass Criteria**: Board created in correct folder without owner prompt

---

### T-26: Click `kanban.yaml` in Files tree → webview opens

**Acceptance Criteria**: REQ_KAN_FILEOPEN AC-1; SPEC_KAN_FILEOPEN AC-1, AC-4

**Precondition**: `Change Manager` Files tree expanded; `kanban.yaml` visible
as a child file node.

**Procedure**:
1. Single-click `kanban.yaml` in the Jarvis Files tree
2. Observe which editor/panel opens

**Expected Result**:
- ✅ Kanban webview renderer opens (not the VS Code text editor)
- ✅ Board shows columns `Backlog`, `In Progress`, `Done` with correct cards
- ✅ The rendered board is identical to opening via the tree button
- ✅ No raw YAML text is shown in the opened panel

**Pass Criteria**: File click routes to webview renderer, not text editor

---

### T-27: "Open as Text" button opens YAML in text editor

**Acceptance Criteria**: REQ_KAN_FILEOPEN AC-3; SPEC_KAN_FILEOPEN AC-3

**Precondition**: A kanban webview is open (from T-26 or tree button).
Inspect the editor title bar of the webview panel.

**Procedure**:
1. Locate the **"Open as Text"** button (or "Open in Editor") in the webview
   title bar
2. Click it
3. Observe the result

**Expected Result**:
- ✅ The `kanban.yaml` file opens in the standard VS Code text editor
- ✅ Raw YAML content is visible (`title:`, `fields:`, `items:`, etc.)
- ✅ No error notification
- ✅ Webview stays open or closes cleanly (no crash)

**Pass Criteria**: Text editor escape hatch works from open webview

---

### T-28: Notes truncation — long notes clipped with hover tooltip

**Acceptance Criteria**: REQ_KAN_RENDERER AC-7; SPEC_KAN_RENDERER AC-7

**Precondition**: `Change Manager/kanban.yaml` contains item `id: 1`
(`First Task`) with notes:
`"This is a very long note that exceeds the 30 character truncation limit for display"`.
Open the board via tree button or tool.

**Procedure**:
1. Open the board
2. Inspect the `First Task` card in the `Backlog` column — look at the notes area
3. Hover the mouse pointer over the notes text on the card

**Expected Result**:
- ✅ The card shows approximately the first 30 characters of the notes followed
  by `…` (e.g., `"This is a very long note tha…"`)
- ✅ Hovering over the notes area reveals the **full** notes text in a tooltip
- ✅ Other cards with no notes or short notes (< 30 chars) are unaffected

**Pass Criteria**: Long notes truncated with ellipsis; full text visible on hover

---

**Fail**: Any ✅ item is not met.

**Out of Scope**: Module compilation, VSIX packaging, and CI pipeline
integration — verified by Dev Engineer.

---

## Notes for Tester

- Always confirm the **active chat tab** matches the intended actor before
  invoking tools without `ownerName` — the tools use `whoAmI`'s active-tab
  heuristic
- Keep the Jarvis Output Channel visible for error diagnostics
- T-4 (live update) requires the YAML to be open in a text editor alongside
  the webview — use the VS Code split editor feature
- T-7 requires two board files in the same actor folder before the test —
  verify both are present in the sidebar before clicking the tree button
- T-13a/b and T-14 create invalid YAML fixtures inline — delete them promptly
  to avoid polluting subsequent tests
