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
   :links: US_DEV_MANUALTEST; REQ_DEV_TESTPROTOCOL

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


.. req:: Unified LogOutputChannel
   :id: REQ_DEV_LOGGING
   :status: implemented
   :priority: mandatory
   :links: US_DEV_LOGGING

   **Description:**
   The extension SHALL provide a single ``LogOutputChannel`` named ``"Jarvis"`` that
   all modules use for structured, levelled logging with module category tags.

   **Acceptance Criteria:**

   * AC-1: A single ``LogOutputChannel`` named ``"Jarvis"`` SHALL be created at
     extension activation via
     ``vscode.window.createOutputChannel('Jarvis', { log: true })``
   * AC-2: The heartbeat module SHALL tag all log entries with ``[Heartbeat]``
   * AC-3: The message/session module SHALL tag log entries with ``[MSG]``
   * AC-4: The scanner module SHALL tag log entries with ``[Scanner]``
   * AC-5: The update-check module SHALL tag log entries with ``[Update]``
   * AC-6: Modules SHALL use ``channel.error()`` for failures,
     ``channel.warn()`` for non-critical issues, ``channel.info()`` for normal
     operations, ``channel.debug()`` for detailed diagnostics, and
     ``channel.trace()`` for very verbose output
   * AC-7: The previous ``"Jarvis Heartbeat"`` output channel SHALL be removed


.. req:: Activation Events & Boot Sequence
   :id: REQ_DEV_ACTIVATION
   :status: implemented
   :priority: mandatory
   :links: US_DEV_MANUALTEST

   **Description:**
   The extension SHALL declare activation events in ``package.json`` and initialize
   all subsystems in dependency order during ``activate()``. The boot sequence SHALL
   ensure that each subsystem's dependencies are available before it starts.

   **Acceptance Criteria:**

   * AC-1: ``package.json`` SHALL declare ``onStartupFinished`` plus ``onView:``
     events for all four Jarvis views (``jarvisProjects``, ``jarvisEvents``,
     ``jarvisMessages``, ``jarvisHeartbeat``) in the ``activationEvents`` array
   * AC-2: The ``activate()`` function SHALL initialize subsystems in dependency
     order: LogOutputChannel → HeartbeatScheduler → YamlScanner →
     TreeDataProviders → MCP Server
   * AC-3: No subsystem SHALL depend on a component that is initialized later in
     the boot sequence


.. req:: Graceful Deactivation
   :id: REQ_DEV_DISPOSAL
   :status: implemented
   :priority: mandatory
   :links: US_DEV_MANUALTEST

   **Description:**
   All background timers, file watchers, output channels, and the MCP server SHALL
   be registered in ``context.subscriptions`` for clean disposal. The ``deactivate()``
   function SHALL stop the MCP server explicitly.

   **Acceptance Criteria:**

   * AC-1: All VS Code commands, tree views, LM tools, status bar items, and event
     listeners SHALL be pushed to ``context.subscriptions``
   * AC-2: The HeartbeatScheduler timer SHALL be disposed via a wrapper in
     ``context.subscriptions``
   * AC-3: The YamlScanner SHALL be stopped via a dispose wrapper in
     ``context.subscriptions``
   * AC-4: The LogOutputChannel SHALL be pushed to ``context.subscriptions``
   * AC-5: ``deactivate()`` SHALL call ``stopMcpServer()`` to shut down the
     embedded MCP server
