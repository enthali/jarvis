MCP Server User Acceptance Tests
=================================

.. story:: MCP Server Acceptance Tests
   :id: US_UAT_MCPSERVER
   :status: approved
   :priority: optional
   :links: US_MSG_MCPSERVER; REQ_MSG_MCPSERVER; REQ_CFG_MCPPORT

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the embedded MCP server,
   **so that** I can verify that LM Tools are accessible via MCP on localhost
   end-to-end before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios document expected outcomes for: MCP server startup,
     tool invocation via MCP, server disabled behavior, and status bar display
   * AC-2: At least one test covers the happy path (MCP tool call returns
     correct result)
   * AC-3: At least one test covers the disabled case (``jarvis.mcpEnabled =
     false``)

   **Test Scenarios:**

   **T-1 — MCP server starts on activation**
     Setup: ``jarvis.mcpEnabled = true``, ``jarvis.mcpPort = 31415`` (defaults).
     Action: Launch Extension Development Host (F5). Wait for activation.
     Expected: Status bar shows ``Jarvis MCP: 31415``. Output Channel logs
     ``[MCP] server started on 127.0.0.1:31415``.

   **T-2 — List sessions via MCP**
     Setup: MCP server running (T-1). At least one named chat session exists.
     Action: Use ``curl`` or an MCP client to call ``jarvis_listSessions`` on
     ``http://127.0.0.1:31415/mcp``.
     Expected: Response contains a JSON array of session title strings.

   **T-3 — Send message via MCP**
     Setup: MCP server running (T-1).
     Action: Call ``jarvis_sendToSession`` via MCP with
     ``{ "session": "TestSession", "text": "Hello from MCP" }``.
     Expected: Message appears in the Jarvis Messages tree view under
     ``TestSession (1)``. Response confirms ``status: "queued"``.

   **T-4 — Read message via MCP**
     Setup: T-3 completed (message in queue).
     Action: Call ``jarvis_readMessage`` via MCP with
     ``{ "destination": "TestSession" }``.
     Expected: Response contains the message with ``sender``, ``text``,
     ``timestamp`` fields and ``remaining: 0``. Message disappears from tree.

   **T-5 — MCP server disabled**
     Setup: Set ``jarvis.mcpEnabled = false`` in settings.
     Action: Launch Extension Development Host (F5). Wait for activation.
     Expected: No status bar item ``Jarvis MCP: ...`` visible. Port 31415 is
     not listening (``curl http://127.0.0.1:31415/mcp`` fails with connection
     refused).

   **T-6 — Custom port**
     Setup: Set ``jarvis.mcpPort = 9999``, ``jarvis.mcpEnabled = true``.
     Action: Launch Extension Development Host (F5). Wait for activation.
     Expected: Status bar shows ``Jarvis MCP: 9999``. MCP calls succeed on
     port 9999.

   **T-7 — Dual registration (LM + MCP return same data)**
     Setup: MCP server running. At least one named chat session exists.
     Action: Call ``jarvis_listSessions`` via both the Chat tool picker (LM)
     and via MCP client on localhost.
     Expected: Both return the same list of session names.
