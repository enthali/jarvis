Tree Node Open File UAT Requirements
======================================

.. req:: Tree Node Open File Test Data
   :id: REQ_UAT_EXP_OPENFILE_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_EXP_OPENFILE; REQ_EXP_HEARTBEAT_OPENFILE; REQ_EXP_MESSAGE_OPENFILE

   **Description:**
   The repo SHALL contain test data and documented expected outcomes for manual
   verification of click-to-navigate on Heartbeat Job nodes and Message nodes.

   **Acceptance Criteria:**

   * AC-1: Existing ``testdata/heartbeat/heartbeat.yaml`` is reused for T-1..T-3;
     no new heartbeat test data files are required
   * AC-2: Existing ``testdata/msg/messages.json`` is reused for T-4..T-6; it SHALL
     contain at least two message entries to enable index-0 and index-1 navigation
     tests (T-5)
   * AC-3: Expected outcomes for each test scenario (T-1 through T-6 from
     ``US_UAT_EXP_OPENFILE``) SHALL be documented in the test protocol
   * AC-4: The fallback scenario (T-2) requires no additional file — the tester
     temporarily edits ``heartbeat.yaml`` in place during the test
   * AC-5: The missing-file scenarios (T-3, T-6) require no additional files —
     the tester temporarily moves or renames the target file during the test
