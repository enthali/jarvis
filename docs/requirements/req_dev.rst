Developer Tooling Requirements
================================

.. req:: VS Code Launch Configuration
   :id: REQ_DEV_LAUNCHCONFIG
   :status: implemented
   :priority: mandatory
   :links: US_DEV_MANUALTEST

   **Description:**
   The project SHALL include a ``.vscode/launch.json`` with a "Run Extension"
   configuration that launches a new VS Code Extension Development Host
   with the extension loaded from the workspace.

   **Acceptance Criteria:**

   * AC-1: ``.vscode/launch.json`` contains a launch configuration of type ``extensionHost``
   * AC-2: Pressing F5 in VS Code compiles and opens a new window with the extension active


.. req:: User-Facing Test Summary
   :id: REQ_DEV_TESTSUMMARY
   :status: implemented
   :priority: mandatory
   :links: US_DEV_MANUALTEST

   **Description:**
   After implementation, the Implement Agent SHALL present the user with a
   test summary that lists what to manually verify in the Extension Development Host.
   The summary SHALL be derived from the Change Document's acceptance criteria.
   The agent SHALL ask the user to confirm the test passed before proceeding to commit.

   **Acceptance Criteria:**

   * AC-1: The Implement Agent's workflow includes a "Manual Test" step after quality gates
   * AC-2: The step compiles the extension and launches the Extension Development Host
   * AC-3: A checklist of items to verify is shown to the user (derived from REQ ACs)
   * AC-4: The user can confirm (proceed to commit) or reject (go back to fix)


.. req:: Test Result Persistence
   :id: REQ_DEV_TESTPROTOCOL
   :status: implemented
   :priority: mandatory
   :links: US_DEV_MANUALTEST

   **Description:**
   After the user confirms or rejects the manual test, the Implement Agent SHALL
   persist the test protocol as ``docs/changes/tst-<change-name>.md``.
   The protocol SHALL include: change name, date, each test item with its
   REQ ID, AC reference, and pass/fail result.

   The Verify Agent SHALL check that a test protocol exists and that all
   items passed before marking specs as implemented.

   **Acceptance Criteria:**

   * AC-1: A test protocol file is created at ``docs/changes/tst-<change-name>.md``
   * AC-2: The protocol lists each tested REQ with AC reference and pass/fail
   * AC-3: The Verify Agent checks the protocol exists and all items passed


.. req:: Developer Conventions Documentation
   :id: REQ_DEV_CONVENTIONS
   :status: implemented
   :priority: mandatory
   :links: US_DEV_CONVENTIONS

   **Description:**
   All project conventions SHALL be documented in `docs/namingconventions.rst`
   as single source of truth.

   **Acceptance Criteria:**

   * AC-1: `docs/namingconventions.rst` contains a "Git Workflow" section
   * AC-2: Section covers branch naming, squash merge, retention, no direct commits
   * AC-3: `copilot-instructions.md` and Release Agent reference `namingconventions.rst`
