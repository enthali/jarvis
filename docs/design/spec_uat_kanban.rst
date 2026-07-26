Kanban Board UAT Design Specifications
========================================

.. spec:: Kanban Board — Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_KANBAN
   :status: draft
   :links: REQ_UAT_KANBAN; US_UAT_KANBAN; SPEC_KAN_SCHEMA; SPEC_KAN_RENDERER; SPEC_KAN_DISCOVER; SPEC_KAN_UX; SPEC_KAN_CREATE; SPEC_KAN_VERIFY; SPEC_KAN_OPEN; SPEC_KAN_MODULE; SPEC_KAN_UPDATE; SPEC_KAN_FILEOPEN; REQ_KAN_SCHEMA; REQ_KAN_RENDERER; REQ_KAN_DISCOVER; REQ_KAN_UX; REQ_KAN_CREATE; REQ_KAN_VERIFY; REQ_KAN_OPEN; REQ_KAN_UPDATE; REQ_KAN_FILEOPEN

   **Description:**
   Step-by-step procedures and expected outcomes for twenty-eight test scenarios
   covering the kanban board renderer, convention-based discovery, tree UX
   entry points, and the four LM+MCP tools (including the new
   ``jarvis_updateKanbanItem`` tool, item ID features, custom editor file
   open, and entity context menu board creation). Test data is provided by
   the fixture at ``testdata/kanban/sample.kanban.yaml``.

   **Test Setup:**

   * Extension Development Host (EDH) with the ``feature/jarvis-kanban``
     branch, launched via **F5** in VS Code.
   * Open workspace: ``testdata/test.code-workspace``.
   * ``jarvis-kanban`` extension loaded and activated (verify: Command Palette
     shows ``Jarvis: Open Kanban Board``).
   * Board file pre-placed:
     ``testdata/.jarvis/actors/Change Manager/kanban.yaml``
     (copy from ``testdata/kanban/sample.kanban.yaml``).
   * Actor ``Change Manager`` registered (``session.yaml`` present).
   * Jarvis sidebar visible with Sessions tree expanded.

   **Test fixture reference:** ``testdata/kanban/sample.kanban.yaml`` —
   see file for column definitions (Backlog, In Progress, Done), sample items
   with labels and priority field, and color definitions.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 35 40 17

      * - Scenario
        - Action
        - Expected Result
        - Req Link

      * - T-1

          Valid board renders with correct columns

          *(Renderer: column order)*
        - Precondition: ``kanban.yaml`` is present in the
          ``Change Manager`` actor folder.

          Open the board by clicking the tree button on the
          ``Change Manager`` node.
        - **Webview opens:** A kanban board panel opens in VS Code.

          **Columns present:** Three columns appear: ``Backlog``,
          ``In Progress``, ``Done`` — in the order defined in the YAML
          ``status`` field options.

          **Column colors:** Column headers show the colors specified in the
          YAML (or theme defaults where color is absent).

          **Item count badges:** Each column header shows the item count.
        - REQ_KAN_RENDERER AC-1; SPEC_KAN_RENDERER

      * - T-2

          Cards appear in correct columns with all fields

          *(Renderer: card placement and content)*
        - Precondition: Board is open from T-1 (or re-open).

          Inspect each column and compare to the ``items`` array in the YAML.
        - **Card placement:** Each card appears in the column matching its
          ``status`` value. No card is in the wrong column.

          **Card content:** Each card shows its ``name`` (bold). Labels
          appear as colored badges. The ``priority`` field value is shown
          (e.g., as a key-value pair). ``notes`` appear below the card
          name when present.

          **Empty column:** If any column has no items, it shows a
          "No items" placeholder (not omitted entirely).
        - REQ_KAN_RENDERER AC-2, AC-3; SPEC_KAN_RENDERER

      * - T-3

          Client-side filtering by label and field value

          *(Renderer: filter bar)*
        - Precondition: Board is open. At least one card has the label
          ``urgent`` and at least one card has ``priority: High`` (per
          the sample fixture).

          Step 1: Type ``label:urgent`` in the filter bar and observe.
          Step 2: Clear the filter. Observe.
          Step 3: Type ``priority:High`` in the filter bar and observe.
          Step 4: Clear the filter. Observe.
        - **Step 1:** Only cards labelled ``urgent`` are visible; other
          cards are hidden.

          **Step 2:** All cards are restored.

          **Step 3:** Only cards with ``priority: High`` are visible.

          **Step 4:** All cards are restored.

          **Invalid filter:** Typing an unknown field token (e.g.,
          ``foo:bar``) shows zero cards (or a "no results" indicator).
        - REQ_KAN_RENDERER AC-4; SPEC_KAN_RENDERER (filtering)

      * - T-4

          Live update on file save

          *(Renderer: file watching)*
        - Precondition: Board is open. A VS Code editor has
          ``kanban.yaml`` open alongside the webview.

          Add a new item to the YAML in the ``Backlog`` column:

          .. code-block:: yaml

             - name: New Test Card
               status: Backlog

          Save the file (Ctrl+S).

          Observe the webview panel.
        - **Board updates:** Within a few seconds, the webview refreshes
          and the new card ``"New Test Card"`` appears in the
          ``Backlog`` column.

          **Panel not closed:** The webview remains open (no close/reopen).

          **Backlog count badge** increments by 1.

          **Teardown:** Remove the added item and save to restore state.
        - REQ_KAN_RENDERER AC-4; SPEC_KAN_RENDERER (file watching)

      * - T-5

          Convention discovery: kanban.yaml → tree button appears

          *(Discovery: default board)*
        - Precondition: ``testdata/.jarvis/actors/Test Designer/`` has NO
          board file. Confirm no tree button on ``Test Designer`` node.

          Copy ``sample.kanban.yaml`` to
          ``testdata/.jarvis/actors/Test Designer/kanban.yaml``.

          Trigger rescan (e.g., via ``Jarvis: Rescan`` command or wait for
          auto-scan).
        - **Tree button appears:** After rescan, the ``Test Designer``
          node in the Sessions tree shows the kanban board inline button.

          **Sidebar updated:** The button is visible without restarting
          the EDH.
        - REQ_KAN_DISCOVER AC-1; SPEC_KAN_DISCOVER

      * - T-6

          Convention discovery: deleting board removes tree button

          *(Discovery: stale UI removal)*
        - Precondition: Follows T-5; ``Test Designer`` has a ``kanban.yaml``
          and shows the tree button.

          Delete ``testdata/.jarvis/actors/Test Designer/kanban.yaml``.

          Trigger rescan.
        - **Tree button disappears:** After rescan, the ``Test Designer``
          node no longer shows the kanban board button.

          **No stale UI:** The button is cleanly removed.

          **Teardown:** No cleanup needed (file already deleted).
        - REQ_KAN_DISCOVER AC-4; SPEC_KAN_DISCOVER

      * - T-7

          Quick Pick for multiple boards on same actor

          *(UX: multi-board owner)*
        - Precondition: ``Change Manager`` actor folder contains two board
          files: ``kanban.yaml`` and ``sprint2.kanban.yaml``.
          Confirm tree button is present on ``Change Manager`` node.

          Click the tree button on the ``Change Manager`` node.
        - **Quick Pick appears:** A VS Code Quick Pick shows two options:
          ``kanban`` and ``sprint2`` (or the board file names / titles).

          **Selection opens board:** Selecting one option opens the
          corresponding board in the renderer webview.

          **Cancel exits cleanly:** Pressing Escape closes the Quick Pick
          without opening any board.
        - REQ_KAN_UX AC-2, AC-3; SPEC_KAN_UX

      * - T-8

          createKanbanBoard: skeleton created, whoAmI resolution

          *(Tool: create, auto-owner)*
        - Precondition: ``Change Manager`` session is open and is the
          **active tab**. No ``kanban.yaml`` exists in
          ``testdata/.jarvis/actors/Test Designer/`` (clean state).

          From the ``Test Designer`` session (active tab), invoke the tool
          with no parameters:

          .. code-block:: text

             #createKanbanBoard

          Observe tool result and file system.
        - **File created:** ``testdata/.jarvis/actors/Test Designer/kanban.yaml``
          is created on disk.

          **Valid skeleton:** The file contains ``title``, ``fields`` (with a
          ``status`` field), and ``items: []``.

          **whoAmI resolved:** The owner is the calling actor
          (``Test Designer``), not another actor.

          **Tool result:** ``{ "path": "<absolutePath>/kanban.yaml" }``.
        - REQ_KAN_CREATE AC-3, AC-6; SPEC_KAN_CREATE

      * - T-9

          createKanbanBoard: named board creation

          *(Tool: create, explicit boardName)*
        - Precondition: No ``sprint3.kanban.yaml`` in
          ``Change Manager`` folder.

          Invoke the tool with explicit parameters:

          .. code-block:: text

             #createKanbanBoard boardName="sprint3" ownerName="Change Manager"

        - **Named file created:**
          ``testdata/.jarvis/actors/Change Manager/sprint3.kanban.yaml``
          is created.

          **Title in YAML:** The skeleton ``title`` field is ``"sprint3"``
          (or the boardName value).

          **Tool result:** ``{ "path": "<absolutePath>/sprint3.kanban.yaml" }``.
        - REQ_KAN_CREATE AC-1, AC-2, AC-4, AC-6; SPEC_KAN_CREATE

      * - T-10

          createKanbanBoard: error when board already exists

          *(Tool: create, duplicate guard)*
        - Precondition: ``testdata/.jarvis/actors/Change Manager/kanban.yaml``
          already exists.

          Invoke:

          .. code-block:: text

             #createKanbanBoard ownerName="Change Manager"

        - **Error returned:**
          ``{ "error": "board already exists", "path": "<absolutePath>/kanban.yaml" }``.

          **File NOT overwritten:** The existing ``kanban.yaml`` is unchanged.

          **No crash:** Tool returns a structured result (not throws).
        - REQ_KAN_CREATE AC-7; SPEC_KAN_CREATE

      * - T-11

          createKanbanBoard: error for unknown owner

          *(Tool: create, unknown actor)*
        - Precondition: No entity named ``NonExistent`` is registered.

          Invoke:

          .. code-block:: text

             #createKanbanBoard ownerName="NonExistent"

        - **Error returned:** ``{ "error": "actor unknown" }``.

          **No file created** anywhere on disk.

          **No crash:** Tool returns structured result.
        - REQ_KAN_CREATE AC-5; SPEC_KAN_CREATE

      * - T-12

          verifyKanbanSchema: clean board returns no errors

          *(Tool: verify, valid board)*
        - Precondition: ``testdata/kanban/sample.kanban.yaml`` is a
          structurally and semantically valid board.

          Invoke:

          .. code-block:: text

             #verifyKanbanSchema ownerName="Change Manager"

          (Assumes ``kanban.yaml`` exists for ``Change Manager``.)
        - **Clean result:**
          ``{ "board": "<path>", "errors": [], "warnings": [] }``.

          **No false positives:** No spurious errors or warnings for a
          valid board.
        - REQ_KAN_VERIFY AC-1..AC-4; SPEC_KAN_VERIFY

      * - T-13a

          verifyKanbanSchema: missing status field

          *(Tool: verify, structural error)*
        - Precondition: Create a temporary board file at
          ``testdata/.jarvis/actors/Change Manager/bad.kanban.yaml``
          with a ``fields`` array that contains only a ``priority``
          field (no ``status`` field).

          Invoke:

          .. code-block:: text

             #verifyKanbanSchema boardName="bad" ownerName="Change Manager"

          Observe tool result.
        - **Error in findings:**
          ``errors`` array contains an entry with ``field: "status"``
          and a message such as ``"Exactly one field named 'status' is required"``
          or similar.

          **Structured findings:** Each error has at least ``field`` and
          ``message`` keys.

          **Teardown:** Delete ``bad.kanban.yaml``.
        - REQ_KAN_VERIFY AC-1, AC-3; SPEC_KAN_VERIFY

      * - T-13b

          verifyKanbanSchema: item with bad status value

          *(Tool: verify, semantic error)*
        - Precondition: Create a temporary board file where an item has
          ``status: InvalidStatus`` (a value not listed in the status
          field options).

          Invoke ``#verifyKanbanSchema`` on this file.
        - **Error in findings:** ``errors`` array contains an entry
          referencing the item name and indicating the invalid status
          value (e.g., ``field: "status"``,
          ``message: "Value 'InvalidStatus' is not a defined status option"``,
          ``item: "<itemName>"``).

          **Teardown:** Delete the bad fixture.
        - REQ_KAN_VERIFY AC-2, AC-3; SPEC_KAN_VERIFY

      * - T-14

          verifyKanbanSchema: item field value not in field options

          *(Tool: verify, semantic error for custom field)*
        - Precondition: Create a temporary board with a ``priority`` field
          defining options ``Low``, ``Medium``, ``High``, and an item with
          ``priority: Critical`` (not a defined option).

          Invoke ``#verifyKanbanSchema`` on this file.
        - **Finding in result:** ``errors`` (or ``warnings``) contains
          an entry for the invalid ``priority`` value, with item context.

          **Structured finding:** Entry has ``field: "priority"``,
          a descriptive message, and ``item: "<itemName>"``.

          **Teardown:** Delete the bad fixture.
        - REQ_KAN_VERIFY AC-3; SPEC_KAN_VERIFY

      * - T-15

          openKanbanBoard: board opens in renderer

          *(Tool: open)*
        - Precondition: ``kanban.yaml`` exists for ``Change Manager``.

          Invoke:

          .. code-block:: text

             #openKanbanBoard ownerName="Change Manager"

        - **Webview opens:** The kanban board renderer panel opens showing
          the ``Change Manager`` board.

          **Tool result:**
          ``{ "opened": true, "path": "<absolutePath>/kanban.yaml" }``.
        - REQ_KAN_OPEN AC-1, AC-2; SPEC_KAN_OPEN

      * - T-16

          openKanbanBoard: error for missing board

          *(Tool: open, not found)*
        - Precondition: No board file exists for ``Test Designer``
          (or temporarily delete it).

          Invoke:

          .. code-block:: text

             #openKanbanBoard ownerName="Test Designer"

        - **Error returned:** ``{ "error": "board not found" }``.

          **No crash:** Tool returns structured result.

          **No webview opened:** No empty or broken renderer panel appears.
        - REQ_KAN_OPEN AC-3; SPEC_KAN_OPEN

      * - T-17

          Cards display ``#id`` prefix prominently

          *(Renderer: item ID display)*
        - Precondition: ``Change Manager/kanban.yaml`` is the updated
          sample fixture (items have ``id: 1..4``). Open the board.

          Inspect each card in the renderer.
        - **ID prefix shown:** Every card displays its ``id`` as a
          ``#<id>`` prefix — e.g., ``#1 First Task``, ``#2 Second Task``.

          **Distinct from name:** The ``#id`` is visually distinct from
          the item name (e.g., smaller text, muted color, or badge).

          **All four items** show a unique, non-repeating ID prefix.
        - REQ_KAN_SCHEMA AC-7 (or AC per new schema ACs);
          SPEC_KAN_RENDERER AC-6

      * - T-18

          createKanbanBoard skeleton includes ``nextId`` and item IDs

          *(Tool: create, ID initialization)*
        - Precondition: ``Test Designer`` has no board file. ``Test
          Designer`` session is the active tab.

          Invoke ``#createKanbanBoard`` (no params).

          Open the created ``kanban.yaml`` in a text editor.
        - **``nextId`` present:** The skeleton YAML contains
          ``nextId: 1`` at the top level.

          **``items: []``:** No items yet, so no ``id`` field to assign.

          **Schema-valid:** The skeleton passes
          ``#verifyKanbanSchema`` with no errors.

          **Teardown:** Delete ``Test Designer/kanban.yaml``.
        - REQ_KAN_CREATE AC-6; SPEC_KAN_CREATE (ID assignment)

      * - T-19

          updateKanbanItem: success path — status change

          *(Tool: update, happy path)*
        - Precondition: ``Change Manager/kanban.yaml`` contains item
          ``id: 2`` (``Second Task``, status ``In Progress``).

          Invoke:

          .. code-block:: text

             #updateKanbanItem itemId=2 changes={"status":"Done"} ownerName="Change Manager"

          Check the file and (if board is open) the renderer.
        - **YAML updated:** The ``kanban.yaml`` file now has item ``id: 2``
          with ``status: Done``.

          **Tool result:**
          ``{ "path": "<abs>/kanban.yaml", "updated": true, "itemId": 2 }``.

          **Renderer refreshes:** If the board was open, ``Second Task``
          moves to the ``Done`` column without re-opening the panel.

          **``nextId`` unchanged:** The ``nextId`` counter is not affected
          by item updates.

          **Teardown:** Restore ``id: 2`` to ``status: In Progress``.
        - REQ_KAN_UPDATE AC-2, AC-4; SPEC_KAN_UPDATE

      * - T-20

          updateKanbanItem: item not found

          *(Tool: update, unknown ID)*
        - Precondition: ``Change Manager/kanban.yaml`` has no item with
          ``id: 99``.

          Invoke:

          .. code-block:: text

             #updateKanbanItem itemId=99 changes={"status":"Done"} ownerName="Change Manager"

        - **Error returned:**
          ``{ "error": "item not found", "itemId": 99 }``.

          **File unchanged:** The YAML is not modified.

          **No crash:** Structured result, not a throw.
        - REQ_KAN_UPDATE AC-4; SPEC_KAN_UPDATE AC-2

      * - T-21

          updateKanbanItem: unknown owner

          *(Tool: update, actor unknown)*
        - Precondition: No entity named ``Ghost`` is registered.

          Invoke:

          .. code-block:: text

             #updateKanbanItem itemId=1 changes={"status":"Done"} ownerName="Ghost"

        - **Error returned:** ``{ "error": "actor unknown" }``.

          **No file read or modified.**

          **No crash:** Structured result.
        - REQ_KAN_UPDATE AC-4; SPEC_KAN_UPDATE; REQ_KAN_CREATE AC-5

      * - T-22

          ID immutability — ``id`` in ``changes`` is ignored

          *(Tool: update, immutability guard)*
        - Precondition: ``Change Manager/kanban.yaml`` has item ``id: 1``
          (``First Task``).

          Invoke with ``id`` in the changes payload:

          .. code-block:: text

             #updateKanbanItem itemId=1 changes={"id":99,"status":"Done"} ownerName="Change Manager"

          Observe the result and the file.
        - **Update succeeds:** Tool returns
          ``{ "path": ..., "updated": true, "itemId": 1 }``.

          **``status`` changed:** Item ``id: 1`` now has ``status: Done``
          (the valid change was applied).

          **``id`` NOT changed:** Item ``id`` remains ``1`` in the YAML
          (the ``id`` key in ``changes`` was silently ignored — NOT
          changed to ``99``).

          **Teardown:** Restore ``id: 1`` to original status.
        - REQ_KAN_UPDATE AC-5; SPEC_KAN_UPDATE AC-4

      * - T-23

          Multi-board Quick Pick uses ``sprint2.kanban.yaml`` fixture

          *(Fixture verification for T-7 variant with IDs)*
        - Precondition: ``testdata/.jarvis/actors/Change Manager/``
          contains both ``kanban.yaml`` (4 items, ``nextId: 5``) and
          ``sprint2.kanban.yaml`` (3 items with ``id: 1..3``,
          ``nextId: 4``). Both fixtures have item IDs.

          Open the ``sprint2`` board via the Quick Pick (tree button on
          ``Change Manager`` → select "sprint2").

          Observe card rendering.
        - **Quick Pick offers both boards** (same as T-7).

          **sprint2 board opens:** Columns ``Todo``, ``Active``, ``Done``
          (as defined in ``sprint2.kanban.yaml``).

          **ID prefixes visible:** Cards show ``#1``, ``#2``, ``#3``
          prefixes matching the ``id`` fields in ``sprint2.kanban.yaml``.

          **Distinct from sample fixture:** No cross-contamination between
          ``kanban.yaml`` and ``sprint2.kanban.yaml`` items.
        - REQ_KAN_UX AC-2, AC-3; SPEC_KAN_RENDERER AC-6; SPEC_KAN_UX

      * - T-24

          verifyKanbanSchema: missing ``id`` returns schema errors across
          multiple fixtures

          *(Schema: id required)*
        - Precondition: Three negative fixtures exist, each with items
          missing the required ``id`` field:

          1. ``testdata/.jarvis/actors/Change Manager/missing-id.kanban.yaml``
             — one item with ``id: 1``, one without ``id``.
          2. ``testdata/.jarvis/actors/Actor 1/kanban.yaml`` — all items
             missing ``id``.
          3. ``testdata/.jarvis/actors/Actor 1/bug.kanban.yaml`` — all items
             missing ``id``.

          Invoke ``#verifyKanbanSchema`` on each in turn:

          .. code-block:: text

             #verifyKanbanSchema boardName="missing-id" ownerName="Change Manager"
             #verifyKanbanSchema ownerName="Actor 1"
             #verifyKanbanSchema boardName="bug" ownerName="Actor 1"

          Observe each result.
        - **Structural error returned for all three:** In each case the
          ``errors`` array contains at least one entry for every item
          missing ``id`` — either a JSON Schema ``required`` violation
          or a message such as
          ``"Item 'X' is missing required field 'id'"``.

          **Structured finding:** Each error entry has ``field``
          (``"id"`` or similar) and ``message`` keys.

          **``missing-id`` partial:** Only the item without ``id`` is
          flagged; the valid ``id: 1`` item produces no error.
        - REQ_KAN_SCHEMA AC-7 (id required); REQ_KAN_VERIFY AC-2;
          SPEC_KAN_VERIFY; SPEC_KAN_SCHEMA

      * - T-25

          Context menu "Add Kanban Board" on entity root node

          *(UX: entity context menu create)*
        - Precondition: The Jarvis sidebar is visible. An entity node
          (e.g., ``Change Manager``) is present in the tree. The entity
          does NOT already have a ``kanban.yaml`` (or use a different
          entity without a default board).

          Right-click the entity root node (Session/Project/Event).

          Select **"Add Kanban Board"** from the context menu.

          In the InputBox that appears, enter a board name (e.g.,
          ``"sprint4"``) and press Enter.
        - **No owner prompt:** The command does NOT ask which entity to use
          — it uses the right-clicked entity directly.

          **File created in correct folder:** ``sprint4.kanban.yaml`` is
          created in the clicked entity's actor folder (e.g.,
          ``testdata/.jarvis/actors/Change Manager/sprint4.kanban.yaml``).

          **Valid skeleton:** The new YAML contains ``title``, ``fields``
          (with ``status``), ``nextId: 1``, and ``items: []``.

          **Teardown:** Delete ``sprint4.kanban.yaml``.
        - REQ_KAN_UX AC-6 (context menu); SPEC_KAN_UX AC-7; SPEC_KAN_CREATE

      * - T-26

          Click ``kanban.yaml`` in Files tree → webview opens

          *(Custom editor: file click → renderer)*
        - Precondition: ``Change Manager`` actor folder has ``kanban.yaml``.
          The entity's Files tree is expanded so ``kanban.yaml`` is visible
          as a child node.

          Click on ``kanban.yaml`` in the Jarvis Files tree (single click /
          default open action).

          Observe which editor opens.
        - **Webview opens:** The kanban board renderer opens (not the
          VS Code text editor). The rendered board shows the expected
          columns and cards from ``kanban.yaml``.

          **Not a text editor:** The opened panel does NOT show raw YAML
          text; it shows the visual kanban board.

          **Consistent with tree button:** The rendered board is identical
          to what opens via the tree button entry point.
        - REQ_KAN_FILEOPEN AC-1; SPEC_KAN_FILEOPEN AC-1, AC-4

      * - T-27

          "Open as Text" button opens YAML in text editor

          *(Custom editor: escape hatch)*
        - Precondition: A kanban webview is open (from T-26 or via tree
          button). Observe the editor title bar of the webview panel.

          Click the **"Open as Text"** button (or "Open in Editor" —
          whichever label appears in the editor title bar).

          Observe the result.
        - **Text editor opens:** The ``kanban.yaml`` file opens in the
          standard VS Code text editor showing the raw YAML content.

          **Webview remains or closes cleanly:** Either the webview stays
          open (showing both views side by side) or closes cleanly; no
          error notification.

          **Raw YAML visible:** The text editor shows ``title:``,
          ``fields:``, ``items:`` etc. confirming the correct file opened.
        - REQ_KAN_FILEOPEN AC-3; SPEC_KAN_FILEOPEN AC-3

      * - T-28

          Notes truncation — long notes clipped at 30 chars with hover

          *(Renderer: notes display)*
        - Precondition: ``Change Manager/kanban.yaml`` contains item
          ``id: 1`` (``First Task``) with notes:
          ``"This is a very long note that exceeds the 30 character
          truncation limit for display"``. Open the board.

          Inspect the ``First Task`` card in the ``Backlog`` column.
        - **Truncated text shown:** The card displays the first ~30
          characters of the notes followed by ``…``
          (e.g., ``"This is a very long note tha…"`` or similar).

          **Full text on hover:** Moving the mouse pointer over the
          notes text (or the card) reveals the complete notes string
          in a tooltip.

          **Short notes unaffected:** Other cards with notes shorter
          than 30 characters (if any) show the full text without
          truncation or ellipsis.
        - REQ_KAN_RENDERER AC-7; SPEC_KAN_RENDERER AC-7
