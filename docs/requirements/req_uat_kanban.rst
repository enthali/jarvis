Kanban Board UAT Requirements
==============================

.. req:: Kanban Board — Test Data and Verification Requirements
   :id: REQ_UAT_KANBAN
   :status: draft
   :priority: required
   :links: US_UAT_KANBAN; REQ_KAN_SCHEMA; REQ_KAN_RENDERER; REQ_KAN_DISCOVER; REQ_KAN_UX; REQ_KAN_CREATE; REQ_KAN_VERIFY; REQ_KAN_OPEN; REQ_KAN_MODULE; REQ_KAN_UPDATE; REQ_KAN_FILEOPEN

   **Description:**
   Specifies the test data, workspace state, and per-AC verification criteria
   required to manually validate the ``jarvis-kanban`` module.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host
     (F5 from VS Code with ``feature/jarvis-kanban`` checked out).
   * ``jarvis.sessions.enabled`` must be ``true`` (default).
   * A ``jarvis-kanban`` extension must be installed/activated in the EDH
     (either installed as a ``.vsix`` or loaded as a dependent extension
     from the workspace).
   * Test board files:

     * ``testdata/.jarvis/actors/Change Manager/kanban.yaml`` — the standard
       test board with multiple items across three status columns. See
       ``testdata/kanban/sample.kanban.yaml`` for the canonical fixture.
     * ``testdata/.jarvis/actors/Change Manager/sprint2.kanban.yaml`` — a
       second board on the same actor (required for T-7 Quick Pick test).
     * A copy of ``sample.kanban.yaml`` for use in validation tests (copy
       to a temporary location as needed and restore after tests).

   * Actor for ``whoAmI``-resolution tests:

     * ``testdata/.jarvis/actors/Change Manager/session.yaml`` — present,
       with ``name: Change Manager``.

   * **Invalid board fixtures** (create inline during T-13, T-14 or keep
     as named files):

     * A board missing the ``status`` field definition — for T-13a.
     * A board with an item whose ``status`` value is not in the options —
       for T-13b.
     * A board with an item field value not matching its field's options —
       for T-14.

   **Acceptance Criteria — per CR AC:**

   * CR AC-1 / Renderer (T-1, T-2):
     The tester SHALL verify column order matches the YAML field options
     order, all items appear in the correct column, and cards show name,
     labels, and field values as defined.

   * CR AC-2 / Filtering (T-3):
     The tester SHALL enter filter tokens in the filter bar and verify that
     only matching cards are visible; removing the filter restores all cards.

   * CR AC-3 / Live update (T-4):
     The tester SHALL save a modified YAML while the board is open and verify
     the webview updates without closing and reopening the panel.

   * CR AC-4 / Discovery (T-5, T-6):
     The tester SHALL verify that the tree button appears when a board file
     is present and disappears (after rescanning) when deleted.

   * CR AC-5 / Quick Pick multi-board (T-7):
     The tester SHALL verify that clicking the tree button when two boards
     exist shows a Quick Pick before opening.

   * CR AC-6 / createKanbanBoard (T-8..T-11):
     The tester SHALL verify skeleton creation, ``whoAmI`` owner resolution,
     duplicate-board error, and unknown-owner error.

   * CR AC-7 / verifyKanbanSchema (T-12..T-14):
     The tester SHALL verify clean verification, missing-status-field error,
     bad-item-status error, and structured findings format.

   * CR AC-8 / openKanbanBoard (T-15, T-16):
     The tester SHALL verify the board opens in the webview renderer and
     that a missing file returns ``{ error: "board not found" }``.

   **Module Integration:**
   Module compile and package integration is verified by the Dev Engineer
   (not UAT). UAT assumes the extension is loaded and activated in the EDH.
