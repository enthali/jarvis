Explorer UAT Design Specifications
=====================================

.. spec:: Test Data File Set
   :id: SPEC_UAT_TESTDATA_FILES
   :status: implemented
   :links: REQ_UAT_VALID_SAMPLES, REQ_UAT_INVALID_SAMPLES

   **Description:**
   The repo SHALL contain the following test data files under ``testdata/``.
   Valid files conform fully to the JSON Schemas. Invalid files contain deliberate
   errors to enable out-of-bounds and error-handling tests.

   **testdata/projects/**

   .. list-table::
      :header-rows: 1
      :widths: 40 40 20

      * - Filename
        - Description
        - Valid?
      * - ``project-alpha.yaml``
        - Full project, externalStatus + internalStatus set
        - valid
      * - ``project-beta.yaml``
        - Minimal project, only required fields (name + summary)
        - valid
      * - ``project-gamma.yaml``
        - Project with stakeholders list
        - valid
      * - ``project-invalid-no-name.yaml``
        - Missing required ``name`` field
        - invalid
      * - ``project-invalid-bad-name.yaml``
        - ``name`` is an integer (wrong type — must be string)
        - invalid

   **testdata/events/**

   .. list-table::
      :header-rows: 1
      :widths: 40 40 20

      * - Filename
        - Description
        - Valid?
      * - ``event-conference.yaml``
        - Full event, status: registered, role: speaker
        - valid
      * - ``event-workshop.yaml``
        - Event, status: attended
        - valid
      * - ``event-meetup.yaml``
        - Event, status: cancelled
        - valid
      * - ``event-invalid-empty.yaml``
        - Empty file (no fields)
        - invalid
      * - ``event-invalid-bad-status.yaml``
        - ``status: does-not-exist`` (not in enum)
        - invalid

   **testdata/projects/active/** (subfolder)

   .. list-table::
      :header-rows: 1
      :widths: 40 40 20

      * - Filename
        - Description
        - Valid?
      * - ``project-delta.yaml``
        - Valid project in a subfolder
        - valid

   **testdata/events/conferences/** (subfolder)

   .. list-table::
      :header-rows: 1
      :widths: 40 40 20

      * - Filename
        - Description
        - Valid?
      * - ``event-iot-summit.yaml``
        - Valid event in a subfolder
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
        - Expand Events → conferences/
        - Folder node visible; "IoT Summit" inside
      * - T-6 (open YAML)
        - Click ``$(go-to-file)`` on "Project Alpha"
        - ``project-alpha.yaml`` opens in editor
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
        - Expand Projects with invalid files present
        - No crash; invalid files handled gracefully
