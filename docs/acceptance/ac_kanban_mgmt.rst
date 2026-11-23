Kanban Management Tools Acceptance Criteria
===========================================

The kanban tools of the Kanban module (``packages/core`` + ``packages/kanban``),
executed by the User in an Extension Development Host with the workspace
``testdata/test.code-workspace``. The two journeys cover what only the real host
shows: the Actor's chat turn that drives the tools, and the open kanban view. The
tool results themselves (written board file, error texts, counts, projections) are
asserted by the handler tests in ``src/tests/kanban-write-handlers.test.ts``,
``src/tests/kanban-tool-handlers.test.ts`` and ``src/tests/kanban-board-query.test.ts``.
The journey of the second part starts from a fresh copy of
``testdata/kanban/sample.kanban.yaml`` (statuses Backlog, In Progress, Done; a
``priority`` single_select field with Low, Medium, High; four cards: items 1 and 4
in Backlog with the label ``urgent``, item 2 in In Progress, item 3 in Done)
placed at ``testdata/.jarvis/actors/Change Manager/kanban.yaml``. Every tool call
passes the ``ownerName`` of the Actor that makes it.

.. ac:: An Actor writes a board through chat and the open kanban view follows each change
   :id: AC_KAN_MGMT_WRITE_JOURNEY
   :status: approved
   :validates: US_KAN_TOOLS

   **Given** the empty test actor ``UAT Kanban Actor`` with an open chat, and the
   sample board at ``testdata/.jarvis/actors/Change Manager/kanban.yaml`` open in its
   kanban view with an open chat of the Actor ``Change Manager``

   1. **When** the tester asks ``UAT Kanban Actor`` to create a kanban board, open it,
      add the item "New Task" in Backlog with ``priority`` High, and then move that
      item to Done
      **Then** the board opens empty, the card "New Task" with priority High appears
      in the Backlog column and, after the move, in the Done column, each time
      without a manual reload of the board.

   2. **When** the tester asks the Actor ``Change Manager`` to delete item 2 of the
      sample board
      **Then** the card of item 2 disappears from the open board without a manual
      reload, and the cards of items 1, 3 and 4 are unchanged; in the text editor
      the only difference in ``kanban.yaml`` is the removed block of item 2.

   3. **When** the tester asks the Actor to add an item "Bad" with ``priority``
      Critical, which is not a declared option
      **Then** the Actor tells the tester about an error that names ``priority`` and
      its valid options (Low, Medium, High), and the open board shows no new card.

   4. **When** the tester asks the Actor to add a single_select field ``region``
      (options EU, US), to add an item "Region item" with ``region`` EU, to add a
      text field ``rationale``, and then to remove the field ``region``
      **Then** the open board accepts the new fields and the new card and refreshes
      without a manual reload, and the Actor tells the tester that the removal of
      ``region`` is refused because the card "Region item" uses it; the open board
      still shows the card with its ``region`` value EU.

.. ac:: An Actor answers questions about the board's cards, statuses and labels from the board
   :id: AC_KAN_MGMT_READ_JOURNEY
   :status: approved
   :validates: US_KAN_QUERY

   **Given** the sample board at ``testdata/.jarvis/actors/Change Manager/kanban.yaml``
   and an open chat of the Actor ``Change Manager``

   1. **When** the tester asks the Actor to list the items in Backlog, and then to
      list the same items with their full details
      **Then** the first answer holds items 1 and 4 only, each with just its id,
      name, status and labels, and the second answer holds the same two items with
      all their fields (for example ``priority`` and ``notes``); neither answer
      lists items 2 or 3.

   2. **When** the tester asks the Actor which statuses and labels the board has
      **Then** the Actor reports the statuses in their declared order with their
      card counts (Backlog 2, In Progress 1, Done 1) and the label ``urgent`` with
      2 cards, and shows no card content.

   3. **When** the tester asks the Actor which items have the priority High, and which
      priority values the board offers
      **Then** the first answer holds items 1 and 4 only, and the second lists the
      options Low, Medium and High with the card counts 1, 1 and 2.
