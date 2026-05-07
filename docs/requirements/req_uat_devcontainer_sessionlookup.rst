Devcontainer Session Lookup UAT Requirements
=============================================

.. req:: Devcontainer Session Lookup Test Scenarios
   :id: REQ_UAT_REMOTECOMPAT_TESTDATA
   :status: implemented
   :priority: optional
   :links: US_UAT_MSG_REMOTECOMPAT

   **Description:**
   The test protocol SHALL contain manual test scenarios verifying the Devcontainer
   Session Lookup feature: local regression, missing-database fallback, path
   derivation via ``globalStorageUri``, and ``listSessions`` tool correctness.

   **Acceptance Criteria:**

   * AC-1: At least 4 test scenarios cover the full feature surface (see
     US_UAT_MSG_REMOTECOMPAT T-1 through T-4)
   * AC-2: Scenarios specify setup, action, and expected outcome
   * AC-3: At least one scenario verifies local usage is unchanged (T-1 regression)
   * AC-4: At least one scenario verifies the warning log and empty-list return
     when ``state.vscdb`` is absent (T-2)
   * AC-5: At least one scenario verifies the resolved path is derived from
     ``globalStorageUri`` (T-3)

.. req:: Devcontainer Session Lookup Test Data Files
   :id: REQ_UAT_REMOTECOMPAT_FILES
   :status: implemented
   :priority: optional
   :links: US_UAT_MSG_REMOTECOMPAT

   **Description:**
   Test data SHALL reuse the existing ``testdata/projects/alpha/`` project leaf.
   No additional files are required; ``state.vscdb`` is the live VS Code database
   and is managed by the tester during the test run.

   **Acceptance Criteria:**

   * AC-1: ``testdata/projects/alpha/project.yaml`` exists and is a valid project
     leaf node
   * AC-2: For T-2, the tester temporarily removes or renames ``state.vscdb`` at
     the resolved path before running the test
   * AC-3: For T-2, the tester restores ``state.vscdb`` after the test to avoid
     affecting subsequent scenarios
