Kanban Swimlanes and Refresh Acceptance Criteria
================================================

The kanban view of a board file, executed by the User in an Extension Development
Host with the workspace ``testdata/test.code-workspace``. The journey starts from a
fresh copy of ``testdata/kanban/sample.kanban.yaml`` (statuses Backlog, In Progress,
Done; a ``priority`` single_select field with Low, Medium, High; four cards: items 1
and 4 in Backlog with priority High and the label ``urgent``, item 2 in In Progress
with priority Medium, item 3 in Done with priority Low) placed at
``testdata/.jarvis/actors/Change Manager/kanban.yaml``. It covers what only the
open view shows: the layout of the lanes, the title bar and the life of the choice
within one tab. Which cards a lane holds and how the columns are counted are rules
of the board renderer (``REQ_KAN_LANES``).

.. ac:: A user groups a board into lanes, refreshes it, and finds the board file untouched
   :id: AC_KAN_LANES_JOURNEY
   :status: verified
   :validates: US_KAN_BOARD; US_KAN_LANES

   **Given** the sample board at ``testdata/.jarvis/actors/Change Manager/kanban.yaml``
   opened by clicking the file, so that it shows in the kanban view

   1. **When** the tester opens the lane selector in the board header
      **Then** it offers ``None``, ``priority`` and ``Labels`` and not ``status``, with
      ``None`` selected, and the board shows the three status columns without lanes.

   2. **When** the tester selects ``priority``
      **Then** three lanes appear one below the other, ``Low``, ``Medium`` and ``High``,
      each showing its name and its number of cards (1, 1, 2); the cards of items 1 and
      4 are in the Backlog cell of ``High``, the card of item 2 is in the In Progress
      cell of ``Medium`` and the card of item 3 is in the Done cell of ``Low``; the
      status column headers appear once above the lanes with the totals 2, 1 and 1.

   3. **When** the tester selects ``Labels``
      **Then** the lanes are ``urgent`` (items 1 and 4) and ``Unlabelled`` (items 2 and
      3), and the column totals are still 2, 1 and 1.

   4. **When** the tester collapses the lane ``urgent``
      **Then** only the header of that lane remains, and the lane ``Unlabelled`` is
      unchanged.

   5. **When** the tester adds the label ``ops`` to item 1 in another program
      (for example Notepad), saves the file there, and clicks the Refresh button in the
      editor title bar, next to "Open as Text"
      **Then** the board shows the new label at once: item 1 is now in the lane ``ops``
      and, as before, in the lane ``urgent``, the Backlog total is still 2, the lane
      ``ops`` comes before ``urgent``, the lane ``urgent`` is still collapsed, and
      ``Labels`` is still selected.

   6. **When** the tester closes the tab, opens the file again by clicking it, and then
      opens it as text with "Open as Text"
      **Then** the board starts with ``None`` selected and no lanes, and the only
      difference from the sample file is the label ``ops`` that the tester added in
      step 5.
