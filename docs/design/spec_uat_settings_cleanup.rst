Settings Cleanup UAT Design Specifications
==========================================

.. spec:: Settings Cleanup Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_SETTINGS_CLEANUP_SCENARIOS
   :status: approved
   :links: REQ_UAT_SETTINGS_CLEANUP_TOGGLES; REQ_UAT_SETTINGS_CLEANUP_FIXEDPATHS; REQ_UAT_SETTINGS_CLEANUP_MCPDEFAULTOFF; REQ_UAT_SETTINGS_CLEANUP_GROUPS; REQ_UAT_SETTINGS_CLEANUP_RENAMES

   **Description:**
   Step-by-step procedures and expected outcomes for all ten settings-cleanup
   acceptance test scenarios, covering feature-toggle defaults, enabling/disabling
   individual features, fixed-path lazy creation, no-workspace graceful fallback,
   MCP default-off, settings group count, renamed/removed settings, and
   message-logging default.

   **Test Setup:**

   * Extension Development Host running with the Jarvis extension loaded from
     the ``feature/settings-cleanup`` branch.
   * A workspace folder is open (use the ``testdata/`` folder or the full Jarvis
     workspace) — except T-6, which explicitly tests the no-folder case.
   * A terminal is available for filesystem verification (``Test-NetConnection``
     or ``netstat`` for T-7; ``Get-ChildItem`` or ``ls`` for T-5/T-10).
   * An agent chat session is open for tool-call tests (T-3, T-4, T-5, T-10).
   * Before starting the full test run, delete ``.jarvis/`` from the workspace
     root to ensure a clean state. Re-create it only when prompted by a test.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 6 40 54

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (default install)
        - Remove workspace-scoped ``jarvis.*`` overrides from
          ``.vscode/settings.json``. Run **Developer: Reload Window**.
          Observe the Jarvis Activity Bar sidebar.
        - Heartbeat, Messages, and Reminders views are visible. Projects and
          Events views are NOT present in the sidebar. Running
          ``Test-NetConnection localhost 31415`` (or ``netstat``) shows port
          31415 is not listening.
      * - T-2 (enable Projects)
        - In Workspace Settings set ``jarvis.projects.enabled`` to ``true``
          and ``jarvis.projects.folder`` to the absolute path of
          ``<workspace>/testdata/projects``. Run **Developer: Reload Window**.
          Observe the Projects view.
        - The Projects view appears in the Jarvis sidebar and displays at
          least the ``alpha``, ``beta``, and ``delta`` project nodes loaded
          from ``testdata/projects``.
      * - T-3 (disable Heartbeat)
        - Set ``jarvis.heartbeat.enabled`` to ``false``. Reload window.
          Observe the sidebar and open an agent chat to check tool list.
        - The Heartbeat view is absent from the sidebar. No heartbeat tick
          entries appear in the Jarvis output channel.
          ``registerJob``, ``unregisterJob``, and ``listJobs`` are NOT
          present in the agent tool picker (@ tool list).
      * - T-4 (disable Messages cascades)
        - Set ``jarvis.messages.enabled`` to ``false``. Reload window.
          Observe the sidebar and check the agent tool list.
        - Both the Messages and Reminders views are absent. The following
          tools are NOT in the agent tool picker:
          ``sendToSession``, ``readMessage``, ``listSessions``,
          ``setReminder``, ``listReminders``, ``cancelReminder``.
      * - T-5 (``.jarvis/`` lazy creation)
        - Delete ``.jarvis/`` if it exists
          (``Remove-Item .jarvis -Recurse -Force``). Restore
          ``jarvis.messages.enabled = true``. Reload window. In an agent
          chat call ``jarvis_sendToSession`` with any message text.
        - ``.jarvis/`` directory is created in the workspace root.
          ``messages.json`` exists inside it and contains a JSON entry for
          the sent message. No error notification or red badge appears in
          VS Code. The Jarvis output channel shows no ``[ERROR]`` entries.
      * - T-6 (no workspace graceful fallback)
        - Open a VS Code window with NO folder open (File → New Window,
          do NOT open a folder). Allow Jarvis to activate. Open the
          Jarvis output channel.
        - Extension activates without error dialogs or uncaught exceptions.
          The Jarvis output channel contains at least one ``[WARN]`` line
          containing the text "No workspace folder" and at least one
          affected feature name (e.g. "Messages", "Heartbeat", or
          "Reminders").
      * - T-7 (MCP off by default)
        - Remove any workspace override for ``jarvis.mcp.enabled``. Reload
          window. Open VS Code Settings UI and search for
          ``jarvis.mcp.enabled``. In a terminal run:
          ``Test-NetConnection -ComputerName localhost -Port 31415``.
        - The Settings UI shows the ``jarvis.mcp.enabled`` checkbox
          **unchecked** (default ``false``). The terminal reports
          ``TcpTestSucceeded : False`` (port closed / not listening).
      * - T-8 (settings groups)
        - Open VS Code Settings UI. Search for ``jarvis`` in the search
          field. Scroll through and count the group headings displayed
          under the Jarvis extension.
        - Exactly 11 group headings appear in this order: **Projects,
          Events, Sessions, Messages, Heartbeat, Reminders, MCP, PIM,
          Outlook, Recording, Updates**. Each setting appears under
          exactly one heading.
      * - T-9 (old setting keys absent)
        - In VS Code Settings UI search for each of the following keys
          one at a time: ``jarvis.heartbeatConfigFile``,
          ``jarvis.messagesFile``, ``jarvis.mcpEnabled``,
          ``jarvis.outlookEnabled``, ``jarvis.projectsFolder``,
          ``jarvis.eventsFolder``.
        - None of the searches return a matching setting entry. Searching
          for the replacement keys ``jarvis.projects.folder``,
          ``jarvis.events.folder``, ``jarvis.mcp.enabled``,
          ``jarvis.outlook.enabled`` DOES return results.
      * - T-10 (message logging default on)
        - Delete ``.jarvis/message-log.json`` if present. Ensure no
          explicit ``jarvis.messages.logging`` workspace override exists
          (setting defaults to ``true``). Reload window. In an agent chat
          call ``jarvis_sendToSession`` to send a message.
          Inspect ``.jarvis/message-log.json``.
        - ``message-log.json`` exists under ``.jarvis/`` and contains a
          JSON entry whose ``text`` field matches the message that was
          sent.
