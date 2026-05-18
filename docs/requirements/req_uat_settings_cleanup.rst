Settings Cleanup UAT Requirements
===================================

.. req:: Feature Toggle UAT Requirements
   :id: REQ_UAT_SETTINGS_CLEANUP_TOGGLES
   :status: approved
   :priority: required
   :links: US_UAT_SETTINGS_CLEANUP; REQ_CFG_TOGGLES

   **Description:**
   The per-feature enable-toggle behaviour SHALL be verifiable through manual
   test scenarios covering default-on features (T-1), enabling an off-by-default
   feature (T-2), disabling an on-by-default feature (T-3), and the cascade
   effect when the parent Messages feature is disabled (T-4).

   **Acceptance Criteria:**

   * AC-1: After a fresh install with no user overrides, Heartbeat, Messages,
     and Reminders views SHALL be visible; Projects and Events views SHALL NOT
     be visible (T-1).
   * AC-2: Setting ``jarvis.projects.enabled = true`` and providing a folder
     path, then reloading, SHALL make the Projects view appear with project
     nodes (T-2).
   * AC-3: Setting ``jarvis.heartbeat.enabled = false`` and reloading SHALL
     remove the Heartbeat view and the ``registerJob``/``unregisterJob``/
     ``listJobs`` LM tools (T-3).
   * AC-4: Setting ``jarvis.messages.enabled = false`` and reloading SHALL
     remove both the Messages and Reminders views and suppress all six
     message/reminder LM tools (T-4).


.. req:: Fixed Paths UAT Requirements
   :id: REQ_UAT_SETTINGS_CLEANUP_FIXEDPATHS
   :status: approved
   :priority: required
   :links: US_UAT_SETTINGS_CLEANUP; REQ_CFG_FIXEDPATHS

   **Description:**
   The ``.jarvis/`` directory lazy-creation behaviour and the no-workspace
   graceful fallback SHALL be verifiable through manual test scenarios T-5
   and T-6.

   **Acceptance Criteria:**

   * AC-1: After deleting ``.jarvis/`` and sending a message, the ``.jarvis/``
     directory and ``messages.json`` SHALL be created automatically (T-5).
   * AC-2: No error notification or uncaught exception SHALL appear after the
     first write (T-5).
   * AC-3: When no workspace folder is open, the extension SHALL activate
     without errors and emit at least one ``[WARN]`` log entry per affected
     feature (T-6).


.. req:: MCP Default-Off UAT Requirements
   :id: REQ_UAT_SETTINGS_CLEANUP_MCPDEFAULTOFF
   :status: approved
   :priority: required
   :links: US_UAT_SETTINGS_CLEANUP; REQ_CFG_MCPDEFAULTOFF

   **Description:**
   The default-off state of ``jarvis.mcp.enabled`` and the absence of an MCP
   listener SHALL be verifiable through manual test scenario T-7.

   **Acceptance Criteria:**

   * AC-1: The Settings UI SHALL display ``jarvis.mcp.enabled`` as unchecked
     (default ``false``) when no explicit user override is present (T-7).
   * AC-2: Port 31415 (or the configured MCP port) SHALL be closed / not
     listening when ``jarvis.mcp.enabled`` is at its default (T-7).


.. req:: Settings Groups UAT Requirements
   :id: REQ_UAT_SETTINGS_CLEANUP_GROUPS
   :status: approved
   :priority: required
   :links: US_UAT_SETTINGS_CLEANUP; REQ_CFG_GROUPS

   **Description:**
   The correct number and order of settings groups SHALL be verifiable through
   manual test scenario T-8.

   **Acceptance Criteria:**

   * AC-1: Searching for "jarvis" in the VS Code Settings UI SHALL reveal
     exactly 11 group headings: Projects, Events, Sessions, Messages, Heartbeat,
     Reminders, MCP, PIM, Outlook, Recording, Updates — in that order (T-8).
   * AC-2: Each setting SHALL appear in exactly one group; no setting SHALL
     appear under more than one heading (T-8).


.. req:: Setting Key Renames UAT Requirements
   :id: REQ_UAT_SETTINGS_CLEANUP_RENAMES
   :status: approved
   :priority: required
   :links: US_UAT_SETTINGS_CLEANUP; REQ_CFG_RENAMES

   **Description:**
   The removal of legacy setting keys and the default-on flip for
   ``jarvis.messages.logging`` SHALL be verifiable through manual test
   scenarios T-9 and T-10.

   **Acceptance Criteria:**

   * AC-1: The old setting keys (``jarvis.heartbeatConfigFile``,
     ``jarvis.messagesFile``, ``jarvis.mcpEnabled``, ``jarvis.outlookEnabled``,
     ``jarvis.projectsFolder``, ``jarvis.eventsFolder``) SHALL NOT appear in
     the Settings UI search results after this CR (T-9).
   * AC-2: The corresponding new keys (``jarvis.projects.folder``,
     ``jarvis.events.folder``, ``jarvis.mcp.enabled``, ``jarvis.outlook.enabled``)
     SHALL be discoverable in the Settings UI (T-9).
   * AC-3: With no explicit ``jarvis.messages.logging`` workspace override,
     sending a message SHALL create ``.jarvis/message-log.json`` with the
     message entry (T-10).
