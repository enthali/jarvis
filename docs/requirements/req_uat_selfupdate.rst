Self-Update UAT Requirements
=============================

.. req:: Self-Update Test Scenarios
   :id: REQ_UAT_SELFUPDATE_TESTDATA
   :status: implemented
   :priority: optional
   :links: US_UAT_SELFUPDATE

   **Description:**
   The test protocol SHALL contain manual test scenarios verifying the self-update
   check feature: automatic activation check, manual command, notification buttons,
   download & install flow, config toggle, and network failure handling.

   **Acceptance Criteria:**

   * AC-1: At least 9 test scenarios cover the full feature surface (see
     US_UAT_SELFUPDATE T-1 through T-9)
   * AC-2: Scenarios specify setup, action, and expected outcome
   * AC-3: At least one scenario verifies that ``jarvis.checkForUpdates = false``
     suppresses the automatic check but not the manual command
   * AC-4: At least one scenario verifies silent failure on network error
