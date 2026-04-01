Developer Tooling User Stories
================================

.. story:: Manual Extension Testing
   :id: US_DEV_MANUALTEST
   :status: implemented
   :priority: mandatory

   **As a** developer,
   **I want** to quickly launch and test my extension changes in a real VS Code window,
   **so that** I can verify the extension works as expected before committing.

   **Acceptance Criteria:**

   * AC-1: A VS Code launch configuration exists for "Run Extension" (F5)
   * AC-2: The Implement Agent compiles and launches the Extension Development Host after implementation
   * AC-3: The agent presents a user-facing test summary listing what to verify
   * AC-4: The user can confirm or reject the test before the agent proceeds to commit
   * AC-5: Test questions and results are persisted as a document for traceability
