Message Queue UAT Requirements
================================

.. req:: Message Queue Test Data
   :id: REQ_UAT_MSG_TESTDATA
   :status: implemented
   :priority: optional
   :links: US_UAT_MSG; REQ_MSG_QUEUE

   **Description:**
   The repo SHALL contain test data and documented expected outcomes for manual
   verification of the message queue feature.

   **Acceptance Criteria:**

   * AC-1: The queue step defined by ``REQ_UAT_HEARTBEAT_TESTDATA`` AC-5 SHALL
     target a known session name with deterministic message text
   * AC-2: Expected outcomes for each test scenario (T-1 through T-5 from
     ``US_UAT_MSG``) SHALL be documented in the test protocol
