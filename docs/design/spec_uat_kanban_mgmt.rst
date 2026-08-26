Kanban Management Tools UAT Design Specifications
==================================================

.. spec:: Kanban Management Tools — Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_KAN_MGMT
   :status: approved
   :links: REQ_UAT_KAN_MGMT

   **Description:**
   Step-by-step procedures and expected outcomes for the kanban-management-tools
   acceptance scenarios. Executed in an Extension Development Host with
   ``packages/core`` + ``packages/kanban`` active, workspace
   ``testdata/test.code-workspace``.

   Module integration (compile/package/CI) is out of UAT scope.

   **Test Setup:**

   * EDH launched from ``feature/kanban-management-tools``.
   * Workspace ``testdata/test.code-workspace``; kanban extension active.
   * Before each scenario: copy ``testdata/kanban/sample.kanban.yaml``
     to ``testdata/.jarvis/actors/Change Manager/kanban.yaml`` for a clean
     state (unless stated otherwise).
   * Active actor tab: confirm ``jarvis_whoAmI`` resolves to ``Change Manager``
     before invoking tools without ``ownerName``.

   **Expected Outcomes — ADD (T-1..T-6):**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          ADD happy path: auto id, nextId incremented

          *AC: REQ_KAN_ADD AC-3, AC-7*
        - Note the current ``nextId`` value in ``kanban.yaml`` (say, ``N``).
          Call ``jarvis_addKanbanItem`` with ``name: "New Task"``,
          ``status: "Backlog"``, ``priority: "High"``
          (no ``ownerName``).
        - Response: ``{ path: ..., added: true, itemId: N }``.
          Open board YAML — new item present with ``id: N``.
          ``nextId`` is now ``N + 1``.
          Webview panel (if open) refreshes to show the new card.

      * - T-2

          ADD status default: first declared option used when omitted

          *AC: REQ_KAN_ADD AC-5*
        - Call ``jarvis_addKanbanItem`` with ``name: "Defaulted"``
          and no ``status`` argument.
        - New item has ``status`` equal to the first option of the
          ``status`` field (``"Backlog"`` in the fixture).
          Response: ``{ added: true, itemId: ... }``.

      * - T-3

          ADD nextId absent: derived and written on first add

          *AC: REQ_KAN_ADD AC-3*
        - Remove the ``nextId:`` line from ``kanban.yaml``.
          Note ``max(existing ids)`` (say, ``M``).
          Call ``jarvis_addKanbanItem`` with ``name: "First After Remove"``.
        - New item has ``id: M + 1``.
          YAML now contains ``nextId: M + 2``.
          No error.

      * - T-4

          WRITEVALID: invalid single_select value rejected before write

          *AC: REQ_KAN_WRITEVALID AC-1; REQ_KAN_ADD AC-6*
        - Note the current file size of ``kanban.yaml``.
          Call ``jarvis_addKanbanItem`` with ``name: "Bad"``,
          ``priority: "Critical"`` (not a declared option).
        - Response contains ``{ error: ... }`` naming ``priority`` and the
          valid options. File size is unchanged (no write occurred).
          ``nextId`` is unchanged.

      * - T-5

          WRITEVALID: undeclared field key rejected as error, not warning

          *AC: REQ_KAN_WRITEVALID AC-3*
        - Call ``jarvis_addKanbanItem`` with ``name: "Ghost"``,
          ``silentTrap: "invisible"``
          (``silentTrap`` is not a declared field).
        - Response contains ``{ error: ... }`` naming the undeclared key and
          listing declared field names. No item appended. File unchanged.
          **Confirm this is an error, not a successful write followed by a
          ``jarvis_verifyKanbanSchema`` warning.**

      * - T-6

          ADD: caller-supplied id rejected

          *AC: REQ_KAN_WRITEVALID AC-4; REQ_KAN_ADD AC-4*
        - Call ``jarvis_addKanbanItem`` with ``name: "Grab Id"``,
          ``id: 999``.
        - Response contains ``{ error: ... }`` refusing the caller-supplied
          id. No item appended. File unchanged.

   **Expected Outcomes — DELETE (T-7..T-9):**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-7

          DELETE happy path: item removed, nextId unchanged

          *AC: REQ_KAN_DELETE AC-4, AC-5*
        - Note the current ``nextId`` value.
          Call ``jarvis_deleteKanbanItem`` with ``itemId: 2``
          (assumes item 2 exists in the fixture).
        - Response: ``{ deleted: true, itemId: 2 }``.
          Item with ``id: 2`` absent from YAML.
          ``nextId`` unchanged.
          Webview panel (if open) refreshes; the card for item 2 is gone.

      * - T-8

          DELETE id not found: error, file unchanged

          *AC: REQ_KAN_DELETE AC-3*
        - Call ``jarvis_deleteKanbanItem`` with ``itemId: 9999``
          (does not exist).
        - Response: ``{ error: "item not found", itemId: 9999 }``.
          Board YAML unmodified.

      * - T-9

          DELETE diff confined: surviving items not reformatted

          *AC: REQ_KAN_DELETE AC-6; REQ_KAN_SCHEMA AC-9*
        - Open ``kanban.yaml`` in a text editor; note items 1, 2, 3.
          Call ``jarvis_deleteKanbanItem`` with ``itemId: 2``.
          Open the file again and compare.
        - The only diff is the removal of item 2's block.
          Lines for items 1 and 3 are byte-identical to before the call.
          No reindentation, no quote style changes, no comment loss.

   **Expected Outcomes — LIST (T-10..T-14):**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-10

          LIST no filter: all items, compact projection only

          *AC: REQ_KAN_LIST AC-3, AC-4, AC-8*
        - Call ``jarvis_listKanbanItems`` with no filter arguments.
        - Response: ``{ path, count: <total>, items: [...] }``.
          Every item has exactly ``id``, ``name``, ``status``, ``labels``.
          ``notes``, ``priority``, and any text field values are **absent**
          from each item object. ``count`` equals the number of items.

      * - T-11

          LIST status filter: only matching items returned

          *AC: REQ_KAN_LIST AC-2*
        - Call ``jarvis_listKanbanItems`` with ``status: "Backlog"``.
        - Only items whose ``status`` is ``"Backlog"`` are returned.
          Items with other statuses are absent. Projection still compact.

      * - T-12

          LIST labels AND filter: item must carry all requested labels

          *AC: REQ_KAN_LIST AC-2*
        - Ensure two items: one with labels ``["urgent", "blocked"]`` and
          one with label ``["urgent"]`` only.
          Call ``jarvis_listKanbanItems`` with
          ``labels: ["urgent", "blocked"]``.
        - Only the item with **both** labels is returned. The item with
          only ``"urgent"`` is excluded.

      * - T-13

          LIST unknown status: error, not empty list

          *AC: REQ_KAN_LIST AC-6*
        - Call ``jarvis_listKanbanItems`` with
          ``status: "Nonexistent"``.
        - Response contains ``{ error: ... }`` naming the valid status
          options. **Not an empty list.** Board file is not modified.

      * - T-14

          LIST no-match filter: empty list, not error

          *AC: REQ_KAN_LIST AC-5*
        - Call ``jarvis_listKanbanItems`` with
          ``labels: ["label-that-no-item-has"]``.
        - Response: ``{ count: 0, items: [] }``. No error. File unmodified.

   **Expected Outcomes — FIELDS (T-15..T-20):**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-15

          FIELDS addField: text and single_select fields added

          *AC: REQ_KAN_FIELDS AC-2*
        - Call ``jarvis_updateKanbanFields`` with
          ``operation: "addField"``, ``name: "rationale"``,
          ``type: "text"``.
          Then call again with ``operation: "addField"``,
          ``name: "severity"``, ``type: "single_select"``,
          ``options: ["Low", "Medium", "High"]``.
        - First call: ``{ updated: true, operation: "addField" }``.
          Second call: same shape. YAML now has ``rationale`` (no options)
          and ``severity`` (with the three options) in ``fields[]``.
          Webview refreshes.

      * - T-16

          FIELDS addField "status" rejected

          *AC: REQ_KAN_FIELDS AC-3*
        - Call ``jarvis_updateKanbanFields`` with
          ``operation: "addField"``, ``name: "status"``,
          ``type: "single_select"``,
          ``options: ["A", "B"]``.
        - Response contains ``{ error: ... }`` refusing the name
          ``"status"``. YAML unchanged.

      * - T-17

          FIELDS removeField: field with no item references removed

          *AC: REQ_KAN_FIELDS AC-4*
        - First, add a field ``"temp"`` of type ``text`` (no items use it).
          Call ``jarvis_updateKanbanFields`` with
          ``operation: "removeField"``, ``name: "temp"``.
        - Response: ``{ updated: true, operation: "removeField" }``.
          ``temp`` absent from ``fields[]``. YAML otherwise unchanged.

      * - T-18

          FIELDS removeField referenced: error naming item ids

          *AC: REQ_KAN_FIELDS AC-4*
        - Add a ``single_select`` field ``"region"`` with options
          ``["EU", "US"]``. Add an item with ``region: "EU"`` via
          ``jarvis_addKanbanItem``. Note its id.
          Call ``jarvis_updateKanbanFields`` with
          ``operation: "removeField"``, ``name: "region"``.
        - Response contains ``{ error: ... }`` listing the referencing
          item id(s). Field is NOT removed. YAML unchanged.

      * - T-19

          FIELDS addOption and rejected cases

          *AC: REQ_KAN_FIELDS AC-6*
        - Call ``jarvis_updateKanbanFields`` with
          ``operation: "addOption"``, ``fieldName: "priority"``,
          ``optionName: "Critical"``.
          Then call ``jarvis_updateKanbanFields`` with
          ``operation: "addOption"``, ``fieldName: "priority"``,
          ``optionName: "Critical"`` again (duplicate).
        - First call: ``{ updated: true }``. ``"Critical"`` appears in
          ``priority`` options. Second call: ``{ error: ... }`` — option
          already exists. No duplicate.

          **Bonus check (AC-6 on text field):** call addOption on a
          ``text`` field — must also return an error.

      * - T-20

          FIELDS removeOption: referenced and last-option guards

          *AC: REQ_KAN_FIELDS AC-7, AC-8*
        - Ensure an item has ``priority: "Low"``.
          Call ``jarvis_updateKanbanFields`` with
          ``operation: "removeOption"``, ``fieldName: "priority"``,
          ``optionName: "Low"``.
        - Response: ``{ error: ... }`` listing the referencing item ids.
          Option not removed.

          **Last-option guard:** add a temporary single_select field with
          exactly one option; attempt to remove that option.
          Response: ``{ error: ... }`` refusing to leave the field empty.

   **Expected Outcomes — SKILL CONTENT (T-21):**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-21

          Skill: 8 tools listed; id/reuse and compact projection documented

          *AC: REQ_KAN_SKILLCONTENT AC-8..AC-10*
        - Open ``.github/skills/jarvis-kanban.board/SKILL.md`` in the
          text editor.
        - **Tools table** lists all eight tools:
          ``jarvis_createKanbanBoard``, ``jarvis_openKanbanBoard``,
          ``jarvis_verifyKanbanSchema``, ``jarvis_updateKanbanItem``,
          ``jarvis_addKanbanItem``, ``jarvis_deleteKanbanItem``,
          ``jarvis_listKanbanItems``, ``jarvis_updateKanbanFields``.

          **id/reuse rules** are stated: ``id`` is assigned by
          ``jarvis_addKanbanItem``; a deleted id is never reused.

          **Compact projection caveat**: the skill states that
          ``jarvis_listKanbanItems`` returns ``id``, ``name``,
          ``status``, ``labels`` only — full item content requires
          reading by id.
