MCP Server User Acceptance Tests
=================================

.. story:: MCP Server Acceptance Tests
   :id: US_UAT_MCPSERVER
   :status: approved
   :priority: optional
   :links: US_MSG_MCPSERVER; US_CFG_FEATURETOGGLES; REQ_MSG_MCPSERVER; REQ_CFG_MCPPORT; REQ_CFG_MCPDEFAULTOFF

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the embedded MCP server,
   **so that** I can verify that the MCP server is off by default and that LM
   Tools are accessible via MCP on localhost when explicitly enabled before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios document expected outcomes for: MCP server disabled by
     default (including on an upgraded installation with no explicit setting),
     explicit opt-in startup (``jarvis.mcp.enabled = true``), tool invocation via
     MCP, ignoring the removed legacy key ``jarvis.mcpEnabled``, and status bar display
   * AC-2: At least one test covers the happy path when enabled (MCP tool call
     returns correct result)
   * AC-3: At least one test covers the default disabled case (``jarvis.mcp.enabled``
     unset or ``false``, even if legacy ``jarvis.mcpEnabled = true`` is stored)

   **Test Scenarios:**

   **T-1 — MCP server is off by default (unset or upgrade without explicit value)**
     Setup: ``jarvis.mcp.enabled`` is unset (default ``false``); optionally store
     legacy ``jarvis.mcpEnabled = true`` in settings to verify it is ignored.
     Action: Launch Extension Development Host (F5). Wait for activation.
     Expected: No status bar item ``Jarvis MCP: ...`` is visible and no
     ``[MCP] server started`` line is logged. Port 31415 is not listening
     (``curl http://127.0.0.1:31415/mcp`` fails with connection refused).

   **T-2 — MCP server starts when enabled and serves engine tool**
     Setup: Set ``jarvis.mcp.enabled = true`` (``jarvis.mcpPort = 31415`` default).
     Action: Launch Extension Development Host (or enable the setting at runtime).
     Verify the status bar and log, then use ``curl`` or an MCP client to call
     ``jarvis_listJobs`` on ``http://127.0.0.1:31415/mcp``.
     Expected: Status bar shows ``Jarvis MCP: 31415``; Output Channel logs
     ``[MCP] server started on 127.0.0.1:31415``; the call returns the registered
     heartbeat jobs without an error.

   **T-3 — Message tools are not offered via MCP**
     Setup: MCP server running (T-2).
     Action: List the tools through the MCP client (``tools/list``).
     Expected: ``jarvis_sendMessage``, ``jarvis_receiveMessage``, ``jarvis_listActors``
     and ``jarvis_createActorSession`` are not in the list (``US_MSG_MCPSERVER`` AC-7);
     a call to ``jarvis_sendMessage`` fails and queues nothing (record the error text).

   **T-4 — Reminder tool via MCP**
     Setup: MCP server running (T-2).
     Action: Call ``jarvis_listReminders`` via MCP.
     Expected: The response lists the pending reminders (possibly none) without an
     error.

   **T-5 — Disabling jarvis.mcp.enabled stops the server**
     Setup: Set ``jarvis.mcp.enabled = false`` in settings (from the running T-2
     state or before launch).
     Action: Wait for the configuration change (or launch Extension Development
     Host and wait for activation).
     Expected: No status bar item ``Jarvis MCP: ...`` visible. Port 31415 is
     not listening (``curl http://127.0.0.1:31415/mcp`` fails with connection
     refused).

   **T-6 — Custom port**
     Setup: Set ``jarvis.mcpPort = 9999``, ``jarvis.mcp.enabled = true``.
     Action: Launch Extension Development Host (F5). Wait for activation.
     Expected: Status bar shows ``Jarvis MCP: 9999``. MCP calls succeed on
     port 9999.

   **T-7 — Dual registration (LM + MCP return same data)**
     Setup: MCP server running (``jarvis.mcp.enabled = true``). At least one heartbeat job exists.
     Action: Call ``jarvis_listJobs`` via both the Chat tool picker (LM)
     and via MCP client on localhost.
     Expected: Both return the same list of jobs.
