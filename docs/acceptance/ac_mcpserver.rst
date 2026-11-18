MCP Server Acceptance Criteria
==============================

Manual procedure for the embedded MCP server of the Messaging module, executed by the
User in an Extension Development Host (F5) on the ``testdata`` workspace, as one journey
in one sitting. A tester needs ``curl`` or an MCP-compatible client to reach
``http://127.0.0.1:<port>/mcp``; the jobs of ``testdata/heartbeat/heartbeat.yaml`` give
``jarvis_listJobs`` something to return. The settings are ``jarvis.mcp.enabled`` (default
``false``) and ``jarvis.mcpPort`` (default ``31415``). If a window does not react to a
changed setting, the tester runs ``Developer: Reload Window``.

.. ac:: The MCP server is off by default, serves the Jarvis tools on localhost when enabled and listens on the configured port
   :id: AC_MCPSERVER_JOURNEY
   :status: approved
   :validates: US_MSG_MCPSERVER; US_CFG_FEATURETOGGLES

   **Given** ``jarvis.mcp.enabled`` not set, ``jarvis.mcpPort`` at its default
   ``31415``, and optionally the removed legacy key ``jarvis.mcpEnabled = true`` stored in
   the settings

   1. **When** the tester launches the Extension Development Host, waits for activation,
      and calls ``curl http://127.0.0.1:31415/mcp``
      **Then** the call fails with connection refused.

   2. **When** the tester sets ``jarvis.mcp.enabled`` to ``true`` (or launches the host
      with it set), and calls ``jarvis_listJobs`` on ``http://127.0.0.1:31415/mcp``
      **Then** the call returns the registered heartbeat jobs without an error.

   3. **When** the tester sets ``jarvis.mcp.enabled`` back to ``false``
      **Then** ``curl http://127.0.0.1:31415/mcp`` fails with connection refused.

   4. **When** the tester sets ``jarvis.mcpPort`` to ``9999``, sets ``jarvis.mcp.enabled``
      to ``true`` (reloading the window if needed), looks at the status bar and calls
      ``jarvis_listJobs`` on ``http://127.0.0.1:9999/mcp``
      **Then** the status bar shows ``Jarvis MCP: 9999`` and the call succeeds on port
      9999.
