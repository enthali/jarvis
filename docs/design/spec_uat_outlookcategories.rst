Outlook Categories UAT Design Specifications
==============================================

.. spec:: Category Sync Test Procedures
   :id: SPEC_UAT_CATEGORIES_FILES
   :status: approved
   :links: REQ_UAT_CATEGORIES_TESTDATA; SPEC_PIM_SERVICE; SPEC_PIM_CACHE

   **Description:**
   Manual test procedures for verifying the category sync architecture. Uses a
   live Outlook instance — no additional test data files required.

   **Test data:**

   * Uses live Outlook Classic categories (no new testdata/ files)
   * Precondition: at least two categories exist in Outlook before testing

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (provider registered)
        - Set ``outlookEnabled=true``, reload window
        - Output Channel logs provider registration; ``hasProviders()`` is true
      * - T-2 (no providers)
        - Set ``outlookEnabled=false``, reload window
        - No provider registered; zero providers
      * - T-3 (cache populated)
        - ``jarvis_category get``
        - Categories returned with name, color, source: "outlook"
      * - T-4 (heartbeat refresh)
        - Add category in Outlook, wait for tick
        - New category appears in next ``get``
      * - T-5 (manual refresh)
        - Add category in Outlook, click refresh in view
        - New category appears immediately


.. spec:: Category Tool Test Procedures
   :id: SPEC_UAT_CATTOOL_FILES
   :status: approved
   :links: REQ_UAT_CATTOOL_TESTDATA; SPEC_PIM_CATTOOL

   **Description:**
   Manual test procedures for the ``jarvis_category`` LM/MCP tool. Tests form
   a self-contained CRUD cycle — categories are created and cleaned up during
   the test run.

   **Test data:**

   * No new testdata/ files — tool creates/deletes categories directly
   * Test categories use "UAT-Test-" prefix for identification

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-6 (get all)
        - ``jarvis_category action:get``
        - All Outlook categories returned with name, color, source
      * - T-7 (get filtered)
        - ``jarvis_category action:get filter:"Project:"``
        - Only categories starting with "Project:" returned
      * - T-8 (set)
        - ``jarvis_category action:set name:"UAT-Test-Set"``
        - Category created; visible in Outlook and subsequent ``get``
      * - T-9 (delete)
        - ``jarvis_category action:delete name:"UAT-Test-Set"``
        - Category removed; no longer in ``get`` or Outlook
      * - T-10 (rename)
        - ``jarvis_category action:rename oldName/newName``
        - Renamed in Outlook; color preserved; old name gone
      * - T-11 (no providers)
        - ``outlookEnabled=false``, ``jarvis_category action:get``
        - Error: no PIM providers available
      * - T-12 (MCP)
        - Call ``jarvis_category`` via MCP client
        - Same results as LM tool invocation


.. spec:: Categories View Test Procedures
   :id: SPEC_UAT_CATVIEW_FILES
   :status: approved
   :links: REQ_UAT_CATVIEW_TESTDATA; SPEC_PIM_CATVIEW

   **Description:**
   Manual test procedures for the Categories sidebar tree view, feature toggle,
   and context menu actions.

   **Test data:**

   * No new testdata/ files — tests use live Extension Development Host UI
   * Precondition: Outlook running with at least two categories

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-13 (view visible)
        - ``showCategories=true``, open sidebar
        - "Categories" appears as 5th view; nodes listed alphabetically
      * - T-14 (view hidden)
        - ``showCategories=false``
        - "Categories" section not visible in sidebar
      * - T-15 (node details)
        - Expand Categories view
        - Nodes show name; tooltip/description includes source: outlook
      * - T-16 (refresh)
        - Add category in Outlook, click refresh icon
        - New category appears in tree
      * - T-17 (rename via context menu)
        - Right-click → Rename Category → enter new name
        - Input box pre-filled; tree updates; Outlook reflects rename
      * - T-18 (delete via context menu)
        - Right-click → Delete Category → confirm
        - Category removed from tree and Outlook
      * - T-19 (no providers)
        - ``outlookEnabled=false``, ``showCategories=true``
        - "no categories" placeholder shown


.. spec:: Outlook COM Bridge Test Procedures
   :id: SPEC_UAT_COMBRIDGE_FILES
   :status: approved
   :links: REQ_UAT_COMBRIDGE_TESTDATA; SPEC_OLK_COMBRIDGE

   **Description:**
   Manual test procedures for the Outlook COM bridge provider. Requires
   Windows OS with Outlook Classic installed and running.

   **Test data:**

   * No new testdata/ files — tests use live Outlook instance
   * Precondition: Outlook Classic running; categories "Project: Alpha",
     "Event: Beta", and "General" exist (or equivalent)
   * Test categories use "UAT-" prefix for easy cleanup

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-20 (read via COM)
        - ``jarvis_category action:get`` with Outlook running
        - All three categories returned with source: "outlook"
      * - T-21 (colour heuristic)
        - ``jarvis_category action:get``
        - "Project: Alpha" → blue; "Event: Beta" → pink; "General" → no colour
      * - T-22 (set with colour)
        - ``jarvis_category action:set name:"Project: UAT-Color"``
        - Category created in Outlook with blue colour
      * - T-23 (delete via COM)
        - ``jarvis_category action:delete name:"Project: UAT-Color"``
        - Category removed from Outlook; confirmed via Outlook UI
      * - T-24 (rename preserves colour)
        - Rename "UAT-Test-Rename" → "UAT-Test-Renamed2"
        - New name in Outlook; same colour; old name gone
      * - T-25 (Category.id)
        - ``get``; check debug log
        - Each category has non-empty ``id`` from COM CategoryID
      * - T-26 (disabled guard)
        - ``outlookEnabled=false``; check Output Channel
        - No COM/PowerShell log entries; no child processes
