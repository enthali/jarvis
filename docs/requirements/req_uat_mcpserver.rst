MCP Server Test Data Requirements
==================================

.. req:: MCP Server Test Data
   :id: REQ_UAT_MCPSERVER_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_MCPSERVER; REQ_MSG_MCPSERVER; REQ_CFG_MCPPORT

   **Description:**
   The repo SHALL contain documented expected outcomes for manual verification
   of the embedded MCP server feature.

   **Acceptance Criteria:**

   * AC-1: No new test data files are required — the MCP server operates on the
     same message queue and session data used by existing LM Tools. Existing
     ``testdata/msg/`` files and chat sessions suffice for verification.
   * AC-2: Expected outcomes for each test scenario (T-1 through T-7 from
     ``US_UAT_MCPSERVER``) SHALL be documented in the test protocol
   * AC-3: Test verification requires ``curl`` or an MCP-compatible client to
     send HTTP requests to the localhost MCP endpoint
