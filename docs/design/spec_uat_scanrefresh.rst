Scanner Refresh UAT Design Specifications
===========================================

.. spec:: Scanner Refresh Test Data
   :id: SPEC_UAT_SCANREFRESH_FILES
   :status: implemented
   :links: REQ_UAT_SCANREFRESH_TESTDATA; SPEC_EXP_SCANNER; SPEC_EXP_RESCAN_CMD

   **Description:**
   All test scenarios use existing ``testdata/`` files. Temporary modifications
   (name edits, date edits) are reverted after each test. No new permanent test
   data files are required.

   **Test data:**

   * Uses existing ``testdata/projects/alpha/project.yaml`` (name change test)
   * Uses existing ``testdata/projects/beta/project.yaml`` (background scan test)
   * Uses existing ``testdata/events/2027/2027-01-10-meetup/event.yaml`` (date change test)
   * Temporary folders created and removed during rescan tests

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (Refresh icon Projects)
        - Open Jarvis sidebar, inspect Projects title bar
        - ``$(refresh)`` icon visible
      * - T-2 (Refresh icon Events)
        - Open Jarvis sidebar, inspect Events title bar
        - ``$(refresh)`` icon visible
      * - T-3 (Rescan Projects)
        - Add folder externally, click refresh
        - New project appears in tree
      * - T-4 (Rescan Events)
        - Add folder externally, click refresh
        - New event appears in tree
      * - T-5 (Name change detected)
        - Edit project name in YAML, click refresh
        - Tree shows updated name
      * - T-6 (Date change detected)
        - Edit event end date to past, click refresh with filter
        - Event disappears from filtered tree
      * - T-7 (Background scan detection)
        - Edit project name, wait for scan interval
        - Tree updates automatically
      * - T-8 (Sort by YAML name)
        - Load Projects tree with testdata
        - Items sorted alphabetically by entity name
      * - T-9 (Sort within year folder)
        - Expand Events 2025/ folder
        - Events sorted by YAML name, not folder date prefix
      * - T-10 (Case-insensitive sort)
        - Projects with mixed-case names
        - Sorted case-insensitively
