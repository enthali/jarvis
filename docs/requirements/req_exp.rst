Explorer Requirements
=====================

.. req:: Activity Bar Registration
   :id: REQ_EXP_ACTIVITYBAR
   :status: implemented
   :priority: mandatory
   :links: US_EXP_SIDEBAR

   **Description:**
   The extension SHALL register a view container in the VS Code Activity Bar
   with a unique icon and the label "Jarvis".

   **Acceptance Criteria:**

   * AC-1: A dedicated icon is visible in the Activity Bar when the extension is installed
   * AC-2: The tooltip shows "Jarvis"


.. req:: Project and Event Tree Views
   :id: REQ_EXP_TREEVIEW
   :status: implemented
   :priority: mandatory
   :links: US_EXP_SIDEBAR

   **Description:**
   The extension SHALL provide two tree views inside the Jarvis sidebar:
   one labeled "Projects" and one labeled "Events". Each tree view SHALL
   display a flat list of items showing their name as label.

   **Acceptance Criteria:**

   * AC-1: The sidebar contains a "Projects" tree view
   * AC-2: The sidebar contains an "Events" tree view
   * AC-3: Both tree views are collapsible sections
   * AC-4: Each item displays a text label


.. req:: Static Dummy Data
   :id: REQ_EXP_DUMMYDATA
   :status: implemented
   :priority: mandatory
   :links: US_EXP_SIDEBAR

   **Description:**
   For the initial version, the tree views SHALL be populated with
   hardcoded dummy data. The Projects view SHALL show at least 3 items,
   the Events view SHALL show at least 2 items. Item names SHALL follow
   the existing naming patterns ("Project: ..." and "Event: ...").

   **Acceptance Criteria:**

   * AC-1: Projects view shows at least 3 hardcoded project entries
   * AC-2: Events view shows at least 2 hardcoded event entries
   * AC-3: Project names follow "Project: <name>" pattern
   * AC-4: Event names follow "Event: <name>" pattern


.. req:: VS Code Launch Configuration
   :id: REQ_EXP_LAUNCHCONFIG
   :status: approved
   :priority: mandatory
   :links: US_EXP_MANUALTEST

   **Description:**
   The project SHALL include a ``.vscode/launch.json`` with a "Run Extension"
   configuration that launches a new VS Code Extension Development Host
   with the extension loaded from the workspace.

   **Acceptance Criteria:**

   * AC-1: ``.vscode/launch.json`` contains a launch configuration of type ``extensionHost``
   * AC-2: Pressing F5 in VS Code compiles and opens a new window with the extension active


.. req:: User-Facing Test Summary
   :id: REQ_EXP_TESTSUMMARY
   :status: approved
   :priority: mandatory
   :links: US_EXP_MANUALTEST

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
   :id: REQ_EXP_TESTPROTOCOL
   :status: approved
   :priority: mandatory
   :links: US_EXP_MANUALTEST

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
