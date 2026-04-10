New Entity UAT Requirements
============================

.. req:: New Entity Test Data
   :id: REQ_UAT_NEWENTITY_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_NEWENTITY; REQ_EXP_NEWPROJECT; REQ_EXP_NEWEVENT

   **Description:**
   The repo SHALL contain test data and documented expected outcomes for manual
   verification of the ``Jarvis: New Project`` and ``Jarvis: New Event`` commands.

   **Acceptance Criteria:**

   * AC-1: Existing ``testdata/projects/`` and ``testdata/events/`` folders are
     used as the target directories — no new permanent test data files are needed
     (the commands create folders at runtime during testing)
   * AC-2: Existing ``testdata/projects/alpha/`` is reused to test the duplicate
     project folder guard (T-5)
   * AC-3: Existing ``testdata/events/2025/2025-03-15-conference/`` is reused to
     inform the duplicate event folder guard test (T-6) — the tester enters input
     that would produce a matching folder name
   * AC-4: Expected outcomes for each test scenario (T-1 through T-12 from
     ``US_UAT_NEWENTITY``) SHALL be documented in the test protocol
   * AC-5: Folders created during testing (e.g. ``my-test-project/``,
     ``2026-06-15-devcon-2026/``) SHALL be deleted after the test session and
     SHALL NOT be committed to the repository
