Logging UAT Requirements
=========================

.. req:: Logging Test Data
   :id: REQ_UAT_LOGGING_TESTDATA
   :status: implemented
   :priority: mandatory
   :links: US_UAT_LOGGING; REQ_DEV_LOGGING

   **Description:**
   The repo SHALL contain sufficient test data and documented expected outcomes
   for manual verification of the unified logging feature.

   **Acceptance Criteria:**

   * AC-1: Existing ``testdata/`` folders (projects, events, heartbeat) are
     sufficient for all test scenarios — no new test data files required
   * AC-2: Expected outcomes for each test scenario (T-1 through T-7) SHALL be
     documented in the test protocol
   * AC-3: A manual heartbeat job is available for testing ``[Heartbeat]`` output
