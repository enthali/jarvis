MCP Server Test Data Specifications
=====================================

.. spec:: MCP Server Test Data
   :id: SPEC_UAT_MCPSERVER_FILES
   :status: approved
   :links: REQ_UAT_MCPSERVER_TESTDATA; SPEC_MSG_MCPSERVER; SPEC_MSG_DUALREGISTRATION; SPEC_UAT_MSG_FILES

   **Description:**
   No new test data files are needed. The MCP server exposes the existing
   tools (``jarvis_listActors``, ``jarvis_sendMessage``,
   ``jarvis_receiveMessage``), which operate on the same message queue and
   Actor scan. Verification uses ``curl`` or an MCP client against
   ``http://127.0.0.1:<port>/mcp``.

   **Test data:**

   * Uses existing ``testdata/msg/`` message queue files
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
      * - T-1 (Server starts)
        - Launch Extension Host with defaults
        - Status bar: ``Jarvis MCP: 31415``; log: ``[MCP] server started``
      * - T-2 (List Actors)
        - MCP call ``jarvis_listActors`` via curl
        - ``{ actors: [...] }`` including ``TestTarget`` and ``TestSender``
      * - T-3 (Send message)
        - MCP call ``jarvis_sendMessage`` with ``session: "TestTarget"``, ``senderSession: "TestSender"``
        - Message appears in Messages tree under ``TestTarget``; response confirms it was queued
      * - T-4 (Receive message)
        - MCP call ``jarvis_receiveMessage`` with ``destination: "TestTarget"``
        - Message returned with fields; ``remaining: 0``; tree updated
      * - T-5 (Server disabled)
        - Launch with ``mcpEnabled = false``
        - No status bar item; port not listening
      * - T-6 (Custom port)
        - Launch with ``mcpPort = 9999``
        - Status bar: ``Jarvis MCP: 9999``; MCP calls on port 9999
      * - T-7 (Dual registration)
        - Same tool via LM and MCP
        - Both return identical Actor list
