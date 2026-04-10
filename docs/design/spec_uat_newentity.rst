New Entity UAT Design Specifications
======================================

.. spec:: New Entity Test Data
   :id: SPEC_UAT_NEWENTITY_FILES
   :status: approved
   :links: REQ_UAT_NEWENTITY_TESTDATA; SPEC_EXP_NEWPROJECT_CMD; SPEC_EXP_NEWEVENT_CMD; SPEC_EXP_SCANNER

   **Description:**
   Test data for new-entity testing reuses the existing ``testdata/`` directory.
   No additional permanent test data files are needed — the commands under test
   create folders at runtime. Folders created during testing are ephemeral and
   SHALL be deleted afterwards.

   **Test data:**

   * Uses existing ``testdata/projects/`` as ``jarvis.projectsFolder`` target
   * Uses existing ``testdata/events/`` as ``jarvis.eventsFolder`` target
   * Uses existing ``testdata/projects/alpha/`` for duplicate project guard (T-5)
   * Uses existing ``testdata/events/2025/2025-03-15-conference/`` for duplicate
     event guard reference (T-6)
   * Runtime-created (ephemeral): ``testdata/projects/my-test-project/project.yaml``,
     ``testdata/events/2026-06-15-devcon-2026/event.yaml``

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (new project)
        - Click ``+`` in Projects bar; enter "My Test Project"
        - ``my-test-project/project.yaml`` created; tree shows new leaf; agent
          session opens
      * - T-2 (new event)
        - Click ``+`` in Events bar; enter "DevCon 2026" + "2026-06-15"
        - ``2026-06-15-devcon-2026/event.yaml`` created with dates; tree shows
          new leaf; agent session opens
      * - T-3 (cancel project)
        - Click ``+`` in Projects bar; press Escape
        - No folder created; tree unchanged; no errors
      * - T-4 (cancel event date)
        - Enter event name; press Escape on date InputBox
        - No folder created; tree unchanged; no errors
      * - T-5 (duplicate project)
        - Enter "Alpha" (``alpha/`` exists)
        - Error notification; no files created or modified
      * - T-6 (duplicate event)
        - Enter "Conference" + "2025-03-15"
        - Error notification; no files created or modified
      * - T-7 (bad date format)
        - Enter "15-06-2026" as date
        - Inline validation error; InputBox stays open
      * - T-8 (invalid calendar date)
        - Enter "2026-02-30" as date
        - Inline validation error; InputBox stays open
      * - T-9 (kebab-case)
        - Enter "My   Special--Project!"
        - Folder ``my-special-project/`` created
      * - T-10 (no palette)
        - Search Command Palette for new entity commands
        - Commands not found
      * - T-11 (immediate refresh)
        - Create project via T-1
        - New leaf appears immediately without window reload
      * - T-12 (cleanup)
        - Delete ephemeral test folders
        - Folders removed; tree refreshes on next rescan
