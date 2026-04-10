Scanner Refresh UAT Requirements
==================================

.. req:: Scanner Refresh Test Data
   :id: REQ_UAT_SCANREFRESH_TESTDATA
   :status: implemented
   :priority: optional
   :links: US_UAT_SCANREFRESH; US_UAT_CONTENTDETECT; US_UAT_NAMESORT; REQ_EXP_REACTIVECACHE; REQ_EXP_RESCAN_BTN; REQ_EXP_NAMESORT

   **Description:**
   The repo SHALL contain sufficient test data and documented expected outcomes
   for manual verification of the rescan button, content change detection, and
   entity-name sorting features.

   **Acceptance Criteria:**

   * AC-1: Existing ``testdata/projects/`` and ``testdata/events/`` files are
     sufficient for all test scenarios — no new test data files required
   * AC-2: Expected outcomes for each test scenario (T-1 through T-10 across
     the three US_UAT stories) SHALL be documented in the test protocol
   * AC-3: Test scenarios for content detection require only temporary edits
     to existing YAML files (reverted after test)
