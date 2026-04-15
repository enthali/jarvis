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


.. req:: Auto-Category Test Data
   :id: REQ_UAT_AUTOCAT_TESTDATA
   :status: implemented
   :priority: optional
   :links: US_UAT_AUTOCAT; REQ_OLK_AUTOCAT_NEWENTITY; REQ_EXP_NEWPROJECT; REQ_EXP_NEWEVENT

   **Description:**
   The repo SHALL contain documented expected outcomes for manual verification of
   the automatic Outlook category creation triggered by the new-entity commands.

   **Acceptance Criteria:**

   * AC-1: No new testdata/ files required — tests use the Extension Development
     Host with live Outlook Classic; test entity folders are created and cleaned up
     during the test run
   * AC-2: Expected outcomes for each test scenario (T-27 through T-29 from
     ``US_UAT_AUTOCAT``) SHALL be documented in the test protocol
   * AC-3: Test preconditions specify ``jarvis.outlookEnabled = true``, Outlook
     Classic running on Windows, and the Extension Development Host launched
   * AC-4: Test categories use the ``"UAT-AutoCat"`` prefix for easy identification
     and cleanup


.. req:: Outlook Tasks Test Data
   :id: REQ_UAT_TASKS_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_TASKS; REQ_PIM_TASKPROVIDER; REQ_PIM_TASKSERVICE; REQ_EXP_TASKTREE; REQ_OLK_TASKPROVIDER; REQ_OLK_TASKENABLE

   **Description:**
   The repo SHALL contain documented expected outcomes for manual verification
   of the Outlook Tasks integration, covering feature toggle, task CRUD,
   tree rendering, editor behaviour, and COM bridge correctness.

   **Acceptance Criteria:**

   * AC-1: No new testdata/ files required — tests use a live Outlook Classic
     instance with manually created tasks
   * AC-2: Expected outcomes for each test scenario (T-30 through T-51 from
     ``US_UAT_TASKS``) SHALL be documented in the test protocol
   * AC-3: Test preconditions specify Windows OS + Outlook Classic installed and
     running; ``jarvis.outlookEnabled=true`` and
     ``jarvis.outlook.tasks.enabled=true`` required for most tests
   * AC-4: Tasks used in CRUD tests (T-36 through T-39) SHALL use the
     ``"UAT-Task-"`` prefix for easy identification and cleanup
   * AC-5: Tree view tests (T-40 through T-44) require at least one Outlook task
     linked to a project name that exists in the configured projects folder
