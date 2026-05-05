Stable Session Open UAT Requirements
======================================

.. req:: Stable Session Open Test Scenarios
   :id: REQ_UAT_MSG_STABLESESSION_TESTDATA
   :status: implemented
   :priority: optional
   :links: US_UAT_MSG_STABLESESSION

   **Description:**
   The test protocol SHALL contain manual test scenarios verifying the Stable
   Session Open feature: new session creation, existing session reuse, pinned
   open behavior, initialization prompt delivery, and automatic session rename.

   **Acceptance Criteria:**

   * AC-1: At least 5 test scenarios cover the full feature surface (see
     US_UAT_MSG_STABLESESSION T-1 through T-5)
   * AC-2: Scenarios specify setup, action, and expected outcome
   * AC-3: At least one scenario verifies that a second invocation for the same
     project focuses the existing session rather than creating a new one
   * AC-4: At least one scenario verifies that the opened session tab is not in
     preview mode
   * AC-5: At least one scenario verifies the initialization prompt contains the
     correct ``context.md`` absolute path

.. req:: Stable Session Open Test Data Files
   :id: REQ_UAT_MSG_STABLESESSION_FILES
   :status: implemented
   :priority: optional
   :links: US_UAT_MSG_STABLESESSION

   **Description:**
   Test data SHALL include a project leaf with a ``context.md`` file so that
   initialization prompt and session naming can be verified.

   **Acceptance Criteria:**

   * AC-1: ``testdata/projects/alpha/project.yaml`` exists and is a valid
     project leaf node
   * AC-2: ``testdata/projects/alpha/context.md`` exists with non-empty content
     so the initialization prompt path can be verified
   * AC-3: No pre-existing chat session named "alpha" must exist at test start
     (tester closes or renames it before T-1, T-4, T-5)
