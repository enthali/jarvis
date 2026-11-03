MCP Server Test Data Specifications
=====================================

.. spec:: MCP Server Test Data
   :id: SPEC_UAT_MCPSERVER_FILES
   :status: approved
   :links: REQ_UAT_MCPSERVER_TESTDATA; SPEC_MSG_MCPSERVER; SPEC_MSG_DUALREGISTRATION; SPEC_UAT_MSG_FILES

   **Description:**
   No new test data files are needed. The MCP server is off by default
   (``jarvis.mcp.enabled = false``, ``REQ_CFG_MCPDEFAULTOFF``) and, when enabled,
   exposes the registered engine tools (such as ``jarvis_listJobs`` and
   ``jarvis_listReminders``), not the four Agent Host message tools
   (``US_MSG_MCPSERVER`` AC-7). Verification uses ``curl`` or an MCP client
   against ``http://127.0.0.1:<port>/mcp``.

   **Test data:**

   * Uses existing ``testdata/heartbeat/heartbeat.yaml`` jobs and reminder data
   * Uses the ``TestTarget`` and ``TestSender`` Actor fixtures
     (``SPEC_UAT_MSG_FILES``)
   * No new files needed — MCP is a transport layer over existing functionality

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (Default off)
        - Launch Extension Host with ``jarvis.mcp.enabled`` unset (and optional legacy ``jarvis.mcpEnabled = true``)
        - No status bar item; no ``[MCP] server started`` log; port 31415 not listening
      * - T-2 (Opt-in & engine tool)
        - Set ``jarvis.mcp.enabled = true``; call ``jarvis_listJobs`` via curl
        - Status bar: ``Jarvis MCP: 31415``; log: ``[MCP] server started``; registered heartbeat jobs returned
      * - T-3 (Message tools absent)
        - MCP ``tools/list``, then a call to ``jarvis_sendMessage``
        - None of the four Agent Host message tools is listed; the call fails and queues nothing (the error text is recorded)
      * - T-4 (Reminder tool)
        - MCP call ``jarvis_listReminders``
        - The pending reminders (possibly none) are returned without an error
      * - T-5 (Server disabled)
        - Set ``jarvis.mcp.enabled = false``
        - No status bar item; port 31415 not listening
      * - T-6 (Custom port)
        - Launch with ``jarvis.mcpPort = 9999``, ``jarvis.mcp.enabled = true``
        - Status bar: ``Jarvis MCP: 9999``; MCP calls on port 9999
      * - T-7 (Dual registration)
        - Same engine tool (``jarvis_listJobs``) via LM and MCP
        - Both return identical job lists
