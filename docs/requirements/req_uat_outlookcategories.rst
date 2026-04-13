Outlook Categories UAT Requirements
=====================================

.. req:: Category Sync Test Data
   :id: REQ_UAT_CATEGORIES_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_CATEGORIES; REQ_PIM_PROVIDER; REQ_PIM_CACHE; REQ_PIM_SERVICE

   **Description:**
   The repo SHALL contain documented expected outcomes for manual verification of
   the category sync architecture (provider registration, caching, refresh).

   **Acceptance Criteria:**

   * AC-1: No new test data files required — tests use a live Outlook instance
     with manually created categories
   * AC-2: Expected outcomes for each test scenario (T-1 through T-5 from
     ``US_UAT_CATEGORIES``) SHALL be documented in the test protocol
   * AC-3: Test preconditions specify that ``jarvis.outlookEnabled`` and a
     running Outlook Classic instance are required for provider tests


.. req:: Category Tool Test Data
   :id: REQ_UAT_CATTOOL_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_CATTOOL; REQ_PIM_CATTOOL; REQ_PIM_SERVICE

   **Description:**
   The repo SHALL contain documented expected outcomes for manual verification of
   the ``jarvis_category`` LM/MCP tool across all four CRUD actions.

   **Acceptance Criteria:**

   * AC-1: No new test data files required — tests create and delete categories
     via the tool itself (self-contained CRUD cycle)
   * AC-2: Expected outcomes for each test scenario (T-6 through T-12 from
     ``US_UAT_CATTOOL``) SHALL be documented in the test protocol
   * AC-3: Test preconditions specify Outlook is required for write operations
     (set, delete, rename); the no-provider error test (T-11) requires
     ``outlookEnabled=false``


.. req:: Categories View Test Data
   :id: REQ_UAT_CATVIEW_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_CATVIEW; REQ_PIM_CATVIEW

   **Description:**
   The repo SHALL contain documented expected outcomes for manual verification of
   the Categories sidebar tree view, feature toggle, and context menu actions.

   **Acceptance Criteria:**

   * AC-1: No new test data files required — tests use the live Categories view
     in the Extension Development Host
   * AC-2: Expected outcomes for each test scenario (T-13 through T-19 from
     ``US_UAT_CATVIEW``) SHALL be documented in the test protocol
   * AC-3: Test preconditions specify that ``jarvis.pim.showCategories`` must be
     toggled for visibility tests and that Outlook must be running for context
     menu action verification


.. req:: Outlook COM Bridge Test Data
   :id: REQ_UAT_COMBRIDGE_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_COMBRIDGE; REQ_OLK_COMBRIDGE; REQ_OLK_ENABLE

   **Description:**
   The repo SHALL contain documented expected outcomes for manual verification of
   the Outlook COM bridge provider, including colour heuristic and rename behaviour.

   **Acceptance Criteria:**

   * AC-1: No new test data files required — tests use a live Outlook Classic
     instance on Windows
   * AC-2: Expected outcomes for each test scenario (T-20 through T-26 from
     ``US_UAT_COMBRIDGE``) SHALL be documented in the test protocol
   * AC-3: Test preconditions specify Windows OS + Outlook Classic installed and
     running; tests involving ``Category.id`` require debug-level logging enabled
   * AC-4: Tests that create categories (T-22) SHALL use a "UAT-" prefix for
     easy cleanup
