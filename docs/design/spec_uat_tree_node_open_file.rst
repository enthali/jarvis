Tree Node Open File UAT Design Specifications
===============================================

.. spec:: Tree Node Open File Test Data
   :id: SPEC_UAT_EXP_OPENFILE_FILES
   :status: approved
   :links: REQ_UAT_EXP_OPENFILE_TESTDATA; SPEC_EXP_HEARTBEAT_OPENFILE; SPEC_EXP_MESSAGE_OPENFILE

   **Description:**
   Test data for the tree-node-open-file acceptance tests uses existing files in
   the repository. No new test data files are needed.

   **Test data:**

   * ``testdata/heartbeat/heartbeat.yaml`` — existing file; used for T-1, T-2, T-3
   * ``testdata/msg/messages.json`` — existing file; used for T-4, T-5, T-6; must
     contain at least two message entries

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (Job → correct line)
        - Click ``t1-cron-sentinel`` job node in Heartbeat tree
        - ``heartbeat.yaml`` opens; cursor at line containing
          ``name: t1-cron-sentinel``; no error
      * - T-2 (Job → fallback line 0)
        - Click stale job node whose name no longer appears in the YAML
        - ``heartbeat.yaml`` opens; cursor at line 1 (top of file); no error
      * - T-3 (Job → missing file)
        - Click job node when ``heartbeat.yaml`` path does not exist
        - Error shown in notification or Output Channel; extension does not crash
      * - T-4 (Message → correct position)
        - Click message node at index 1 in Messages tree
        - ``messages.json`` opens; cursor at second message object; no error
      * - T-5 (Message → index 0 and index 1)
        - Click index-0 node, then index-1 node
        - Both open ``messages.json``; cursor positions differ between the two
          clicks
      * - T-6 (Message → missing file)
        - Click message node when ``messages.json`` does not exist
        - Error shown in notification or Output Channel; extension does not crash
