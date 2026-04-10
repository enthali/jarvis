Logging UAT Design Specifications
===================================

.. spec:: Logging Test Data
   :id: SPEC_UAT_LOGGING_FILES
   :status: implemented
   :links: REQ_UAT_LOGGING_TESTDATA; SPEC_DEV_LOGCHANNEL

   **Description:**
   All test scenarios use existing ``testdata/`` files and extension commands.
   No new permanent test data files are required.

   **Test data:**

   * Uses existing ``testdata/projects/`` for scanner logging tests
   * Uses existing ``testdata/heartbeat/heartbeat.yaml`` for heartbeat logging tests
   * Update check uses the live GitHub API (same as production)

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (Channel exists)
        - Open Output panel, check dropdown
        - "Jarvis" channel listed, no "Jarvis Heartbeat"
      * - T-2 ([Heartbeat] tag)
        - Run manual heartbeat job
        - ``[Heartbeat]`` tagged entries with timestamps
      * - T-3 ([Scanner] tag)
        - Click refresh icon in Projects title bar
        - ``[Scanner]`` tagged entries
      * - T-4 ([MSG] tag)
        - Send message via LM tool
        - ``[MSG]`` tagged entries
      * - T-5 ([Update] tag)
        - Run "Check for Updates" command
        - ``[Update]`` tagged entries
      * - T-6 (Log-level filtering)
        - Set dropdown to "Info"
        - Debug/trace entries hidden
      * - T-7 (Timestamps)
        - Trigger any operation
        - Automatic timestamp prefix on every line
