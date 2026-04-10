MCP Server Test Data Specifications
=====================================

.. spec:: MCP Server Test Data
   :id: SPEC_UAT_MCPSERVER_FILES
   :status: approved
   :links: REQ_UAT_MCPSERVER_TESTDATA; SPEC_MSG_MCPSERVER; SPEC_MSG_DUALREGISTRATION

   **Description:**
   No new test data files are needed. The MCP server exposes existing tools
   (sendToSession, listSessions, readMessage) which operate on the same message
   queue and session store. Verification uses ``curl`` or an MCP client against
   ``http://127.0.0.1:<port>/mcp``.

   **Test data:**

   * Uses existing ``testdata/msg/`` message queue files
   * Uses existing chat sessions in the Extension Development Host
   * No new files needed — MCP is a transport layer over existing functionality

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (Server starts)
        - Launch Extension Host with defaults
        - Status bar: ``Jarvis MCP: 31415``; log: ``[MCP] server started``
      * - T-2 (List sessions)
        - MCP call ``jarvis_listSessions`` via curl
        - JSON array of session title strings
      * - T-3 (Send message)
        - MCP call ``jarvis_sendToSession``
        - Message appears in Messages tree; response: ``status: "queued"``
      * - T-4 (Read message)
        - MCP call ``jarvis_readMessage``
        - Message returned with fields; ``remaining: 0``; tree updated
      * - T-5 (Server disabled)
        - Launch with ``mcpEnabled = false``
        - No status bar item; port not listening
      * - T-6 (Custom port)
        - Launch with ``mcpPort = 9999``
        - Status bar: ``Jarvis MCP: 9999``; MCP calls on port 9999
      * - T-7 (Dual registration)
        - Same tool via LM and MCP
        - Both return identical session list
