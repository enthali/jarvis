Tree Search UAT Design Specifications
======================================

.. spec:: Tree Quick Search Test Data
   :id: SPEC_UAT_EXP_TREESEARCH_FILES
   :status: approved
   :links: REQ_UAT_EXP_TREESEARCH_TESTDATA; SPEC_EXP_SEARCH_MANIFEST; SPEC_EXP_SEARCH_CMD

   **Description:**
   Test data for the tree-search acceptance tests reuses existing testdata files.
   No new test data files are required.

   **Test data:**

   * ``testdata/projects/`` — existing project tree; alpha, beta, gamma,
     active/delta used for T-1, T-3, T-5, T-6
   * ``testdata/events/2025/`` — existing events (conference, workshop, IoT Summit)
     used for T-2, T-4, T-7
   * ``testdata/test.code-workspace`` — workspace settings must bind
     ``jarvis.projectsFolder`` and ``jarvis.eventsFolder`` to the above paths

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 20 40 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (Projects icon)
        - Observe Projects title bar with extension active
        - ``$(search)`` icon is visible in the title bar; no error
      * - T-2 (Events icon)
        - Observe Events title bar with extension active
        - ``$(search)`` icon is visible in the title bar; no error
      * - T-3 (Projects QuickPick content)
        - Click search icon in Projects title bar
        - QuickPick opens; one item per project leaf; label = project
          ``name``; description = relative folder path; no error
      * - T-4 (Events QuickPick content)
        - Click search icon in Events title bar
        - QuickPick opens; event labels follow ``<datesStart> — <name>``
          format; no error
      * - T-5 (Live filter)
        - Type a partial project name substring in the open QuickPick
        - List narrows in real time; only matching items remain visible
      * - T-6 (Project reveal)
        - Select a project item from the QuickPick
        - QuickPick closes; corresponding tree node scrolled into view,
          selected, and focused; no error
      * - T-7 (Event reveal)
        - Select an event item from the QuickPick
        - QuickPick closes; corresponding tree node scrolled into view,
          selected, and focused; no error
      * - T-8 (Escape cancel)
        - Press Escape while QuickPick is open
        - QuickPick closes; tree state unchanged; no error
