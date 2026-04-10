Explorer UAT Design Specifications
=====================================

.. spec:: Test Data File Set
   :id: SPEC_UAT_TESTDATA_FILES
   :status: implemented
   :links: REQ_UAT_VALID_SAMPLES, REQ_UAT_INVALID_SAMPLES

   **Description:**
   The repo SHALL contain the following test data files under ``testdata/``.
   Each project and event uses the **convention-file model**: the entity is a
   folder containing ``project.yaml`` or ``event.yaml``. Valid files conform
   fully to the JSON Schemas. Invalid files contain deliberate errors to enable
   out-of-bounds and error-handling tests.

   **testdata/projects/**

   .. list-table::
      :header-rows: 1
      :widths: 45 35 20

      * - Path
        - Description
        - Valid?
      * - ``alpha/project.yaml``
        - Full project, externalStatus + internalStatus set
        - valid
      * - ``beta/project.yaml``
        - Minimal project, only required fields (name + summary)
        - valid
      * - ``gamma/project.yaml``
        - Project with stakeholders list
        - valid
      * - ``invalid-no-name/project.yaml``
        - Missing required ``name`` field — leaf with folder name fallback
        - invalid
      * - ``invalid-bad-name/project.yaml``
        - ``name`` is an integer (wrong type) — leaf with folder name fallback
        - invalid
      * - ``active/delta/project.yaml``
        - Valid project nested inside a grouping folder
        - valid

   **testdata/events/**

   Events use a year/date-slug convention: ``<YYYY>/<YYYY-MM-DD-slug>/event.yaml``.
   At least one past and one future event are required for filter testing.

   .. list-table::
      :header-rows: 1
      :widths: 50 30 20

      * - Path
        - Description
        - Valid?
      * - ``2025/2025-03-15-conference/event.yaml``
        - Past event, status: registered, role: speaker
        - valid
      * - ``2025/2025-06-20-workshop/event.yaml``
        - Past event, status: attended
        - valid
      * - ``2027/2027-01-10-meetup/event.yaml``
        - Future event, status: planned
        - valid
      * - ``invalid-empty/event.yaml``
        - Empty file (no fields) — leaf with folder name fallback
        - invalid
      * - ``invalid-bad-status/event.yaml``
        - ``status: does-not-exist`` (not in enum)
        - invalid
      * - ``2025/2025-09-18-iot-summit/event.yaml``
        - Past event nested in year grouping folder
        - valid

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (sidebar)
        - Click Jarvis icon in Activity Bar
        - Sidebar opens with Projects, Events, Messages sections
      * - T-2 (project tree)
        - Expand Projects section
        - 3+ valid projects shown as leaf nodes by name
      * - T-3 (subfolder)
        - Expand Projects → active/
        - Folder node visible; "Project Delta" inside
      * - T-4 (event tree)
        - Expand Events section
        - 3+ valid events shown as leaf nodes by name
      * - T-5 (event subfolder)
        - Expand Events → 2025/
        - Year grouping node visible; past events inside
      * - T-6 (open YAML)
        - Click ``$(go-to-file)`` on "Project Alpha"
        - ``alpha/project.yaml`` opens in editor
      * - T-7 (folder no button)
        - Hover over ``active/`` folder node
        - No ``$(go-to-file)`` button visible
      * - T-8 (project filter)
        - Filter icon → deselect ``active/``
        - ``active/`` disappears from tree
      * - T-9 (filter persists)
        - Reload window after T-8
        - ``active/`` still hidden
      * - T-10 (future filter)
        - Click Events filter icon
        - Only future events shown; undated events remain
      * - T-11 (config change)
        - Change ``jarvis.projectsFolder`` to empty dir
        - Projects tree clears immediately
      * - T-12 (invalid YAML)
        - Expand Projects with invalid convention files present
        - No crash; invalid entries show folder name as fallback label
