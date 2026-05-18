Settings Cleanup User Acceptance Tests
=======================================

.. story:: Settings Cleanup Acceptance Tests
   :id: US_UAT_SETTINGS_CLEANUP
   :status: approved
   :priority: required
   :links: US_CFG_FEATURETOGGLES; US_CFG_FIXEDPATHS; US_CFG_GROUPS

   **As a** Jarvis Test Engineer,
   **I want** a set of manual acceptance test scenarios for the settings-cleanup change,
   **so that** I can verify end-to-end that per-feature toggles gate activation correctly,
   ``.jarvis/`` paths are resolved lazily, settings are grouped correctly, old setting
   names are gone, and MCP defaults to off.

   **Acceptance Criteria:**

   * AC-1: A test verifies that after a fresh install (no user overrides) the
     Heartbeat, Messages, and Reminders views are visible while Projects, Events,
     and MCP are not visible/not running.
   * AC-2: A test verifies that setting ``jarvis.projects.enabled = true`` and
     configuring ``jarvis.projects.folder`` causes the Projects view to appear
     with project nodes after a reload.
   * AC-3: A test verifies that setting ``jarvis.heartbeat.enabled = false``
     removes the Heartbeat view and suppresses ``registerJob``/``unregisterJob``/
     ``listJobs`` LM tools after a reload.
   * AC-4: A test verifies that setting ``jarvis.messages.enabled = false`` removes
     both the Messages AND Reminders views and suppresses
     ``sendToSession``/``readMessage``/``listSessions``/``setReminder``/
     ``listReminders``/``cancelReminder`` tools.
   * AC-5: A test verifies that sending a message when ``.jarvis/`` does not yet
     exist causes the directory and ``messages.json`` to be created on first write.
   * AC-6: A test verifies that opening a VS Code window with no workspace folder
     causes features that require ``.jarvis/`` to short-circuit with a warning
     log rather than an error.
   * AC-7: A test verifies that the ``jarvis.mcp.enabled`` default is ``false``
     and the MCP port is not listening after a fresh install.
   * AC-8: A test verifies that the Settings UI shows exactly 11 settings groups
     for Jarvis (Projects, Events, Sessions, Messages, Heartbeat, Reminders, MCP,
     PIM, Outlook, Recording, Updates).
   * AC-9: A test verifies that the old removed/renamed setting keys no longer
     appear in the Settings UI search results.
   * AC-10: A test verifies that ``jarvis.messages.logging`` defaults to ``true``
     and that ``message-log.json`` is created on first message send.

   **Test Scenarios:**

   **T-1 — Default install: only on-by-default features visible**
     Setup: Remove any workspace-scoped ``settings.json`` overrides for
     ``jarvis.*`` settings (so all defaults apply). Reload window.
     Action: Observe the Jarvis sidebar in the Activity Bar.
     Expected: Heartbeat, Messages, and Reminders views are visible.
     Projects and Events views are NOT visible. MCP server is not listening
     on its configured port (default 31415).

   **T-2 — Enable Projects**
     Setup: In Workspace Settings, set ``jarvis.projects.enabled`` to ``true``
     and ``jarvis.projects.folder`` to the absolute path of
     ``testdata/projects``. Run **Developer: Reload Window**.
     Action: Observe the Projects view in the Jarvis sidebar.
     Expected: The Projects view appears and displays project nodes from the
     configured folder (at least ``alpha``, ``beta``, ``delta``).

   **T-3 — Disable Heartbeat**
     Setup: Set ``jarvis.heartbeat.enabled`` to ``false``. Reload window.
     Action: Observe the Jarvis sidebar. Open an agent chat and inspect the
     available LM tools.
     Expected: The Heartbeat view is absent from the sidebar. No heartbeat
     scheduler ticks are logged in the Jarvis output channel.
     ``registerJob``, ``unregisterJob``, and ``listJobs`` tools are NOT
     present in the agent tool picker.

   **T-4 — Disable Messages → cascades to Reminders**
     Setup: Set ``jarvis.messages.enabled`` to ``false``. Reload window.
     Action: Observe the Jarvis sidebar. Open an agent chat and inspect the
     available LM tools.
     Expected: Both the Messages AND Reminders views are absent from the
     sidebar. ``sendToSession``, ``readMessage``, ``listSessions``,
     ``setReminder``, ``listReminders``, and ``cancelReminder`` tools are
     NOT present in the agent tool picker.

   **T-5 — Fixed paths: ``.jarvis/`` created on first write**
     Setup: Delete the ``.jarvis/`` directory from the workspace root if it
     exists (e.g. ``Remove-Item .jarvis -Recurse -Force``). Ensure
     ``jarvis.messages.enabled`` is ``true``. Reload window.
     Action: In an agent chat, call ``jarvis_sendToSession`` with any session
     name and a short message text to queue a message.
     Expected: The ``.jarvis/`` directory is created in the workspace root.
     A ``messages.json`` file appears inside it containing the sent message.
     No error is shown in the Jarvis output channel or VS Code notifications.

   **T-6 — No workspace: graceful fallback**
     Setup: Open a VS Code window with **no folder** (File → New Window or
     open a window without opening a folder).
     Action: Allow the Jarvis extension to activate. Open the Jarvis output
     channel (``Jarvis`` in Output panel).
     Expected: The extension activates without throwing any error. The output
     channel contains at least one ``[WARN]`` entry mentioning "No workspace
     folder" and the name of the affected feature (Messages, Heartbeat, or
     Reminders). No notification with "Error" or red badge appears.

   **T-7 — MCP off by default**
     Setup: Remove any workspace-scoped overrides for ``jarvis.mcp.enabled``
     so the default applies. Reload window.
     Action: Open VS Code Settings UI and search for ``jarvis.mcp.enabled``.
     Also run ``Test-NetConnection -ComputerName localhost -Port 31415`` in a
     terminal (or ``netstat -ano | findstr :31415``).
     Expected: The Settings UI shows the ``jarvis.mcp.enabled`` checkbox
     unchecked (default ``false``). The port connectivity test shows the port
     is closed / not listening.

   **T-8 — Settings groups visible**
     Setup: Open VS Code Settings UI. Search for ``jarvis`` in the search bar.
     Action: Observe the section headings displayed under the Jarvis extension
     node in the Settings UI.
     Expected: Exactly 11 group headings appear in this order: Projects,
     Events, Sessions, Messages, Heartbeat, Reminders, MCP, PIM, Outlook,
     Recording, Updates. Each group contains only its own feature's settings.

   **T-9 — Renamed settings not present**
     Setup: Open VS Code Settings UI. Search for each old setting key in turn.
     Action: Search for ``jarvis.heartbeatConfigFile``, ``jarvis.messagesFile``,
     ``jarvis.mcpEnabled``, ``jarvis.outlookEnabled``, ``jarvis.projectsFolder``,
     ``jarvis.eventsFolder`` individually.
     Expected: None of the old setting keys produce a matching result in the
     Settings UI. Searching for the new equivalents
     (``jarvis.projects.folder``, ``jarvis.events.folder``,
     ``jarvis.mcp.enabled``, ``jarvis.outlook.enabled``) does produce results.

   **T-10 — Message logging default on**
     Setup: Ensure ``.jarvis/`` does not contain ``message-log.json``
     (delete it if present). Ensure ``jarvis.messages.enabled`` is ``true``
     and ``jarvis.messages.logging`` has no explicit workspace override
     (defaults to ``true``). Reload window.
     Action: Send a message via ``jarvis_sendToSession`` in an agent chat.
     Action: Open or check ``.jarvis/message-log.json`` in the workspace root.
     Expected: ``message-log.json`` exists and contains a JSON entry for the
     sent message (with ``text`` matching the message content).
