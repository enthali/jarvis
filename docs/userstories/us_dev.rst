Developer Tooling User Stories
================================

.. story:: Manual Extension Testing
   :id: US_DEV_MANUALTEST
   :status: implemented
   :priority: mandatory

   **As a** Jarvis Developer,
   **I want** to quickly launch and test my extension changes in a real VS Code window,
   **so that** I can verify the extension works as expected before committing.

   **Acceptance Criteria:**

   * AC-1: A VS Code launch configuration exists for "Run Extension" (F5)
   * AC-2: The Implement Agent compiles and launches the Extension Development Host after implementation
   * AC-3: The agent presents a user-facing test summary listing what to verify
   * AC-4: The user can confirm or reject the test before the agent proceeds to commit
   * AC-5: Test questions and results are persisted as a document for traceability


.. story:: Developer Conventions Documentation
   :id: US_DEV_CONVENTIONS
   :status: implemented
   :priority: mandatory

   **As a** Jarvis Developer,
   **I want** all project conventions (naming, Git workflow) documented in one place,
   **so that** I can quickly look up the rules without searching across multiple files.

   **Acceptance Criteria:**

   * AC-1: ``docs/namingconventions.rst`` contains a Git Workflow section
   * AC-2: The Git Workflow section covers branch naming, merge strategy, retention, and no-hotfix rule
   * AC-3: The Release Agent and copilot-instructions reference ``namingconventions.rst`` as the single source of truth


.. story:: Structured Logging
   :id: US_DEV_LOGGING
   :status: implemented
   :priority: mandatory
   :links: US_EXP_SIDEBAR; US_AUT_HEARTBEAT; US_REL_SELFUPDATE; US_MSG_CHATQUEUE

   **As a** Jarvis user and developer,
   **I want** structured log output from all Jarvis functional groups in a single
   Output Channel with severity levels and module tags,
   **so that** I can diagnose issues, understand system behaviour, and filter log
   verbosity using the VS Code Output panel's built-in level dropdown.

   **Acceptance Criteria:**

   * AC-1: All Jarvis modules (heartbeat, messages, scanner, update check) log to a
     single VS Code Output Channel named "Jarvis"
   * AC-2: Each log entry carries a module tag (e.g. ``[Heartbeat]``, ``[MSG]``,
     ``[Scanner]``, ``[Update]``) so the source is identifiable
   * AC-3: Log entries use severity levels (trace, debug, info, warn, error) that map
     to the VS Code log-level dropdown
   * AC-4: The user can filter displayed log entries by severity via the VS Code
     Output panel dropdown — no custom settings needed
   * AC-5: Timestamps are included automatically in every log line
