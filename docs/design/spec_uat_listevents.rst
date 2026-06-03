List Events Tool UAT Design Specifications
============================================

.. spec:: List Events LM Tool Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_LISTEVENTS
   :status: draft
   :links: REQ_UAT_LISTEVENTS

   **Description:**
   Step-by-step procedures and expected outcomes for all ``jarvis_listEvents``
   acceptance test scenarios.

   **Test Setup:**

   * Extension Development Host from ``feature/entity-parity`` via F5.
   * Workspace: ``testdata/test.code-workspace``.
   * ``jarvis.events.enabled = true``.
   * Events folder contains ``2026-06-15_DevCon 2026/event.yaml`` with all fields.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-4

          Tool available, returns all fields, MCP dual-reg

          *AC-1, AC-2, AC-3, AC-4*
        - Open Chat tool picker (``#``). Verify ``jarvis_listEvents`` appears.
          Invoke tool. Inspect response. With ``jarvis.mcp.enabled=true``,
          invoke via MCP client.
        - Tool listed with no required input parameters. Response is a JSON
          array. The "DevCon 2026" entry contains: ``name`` (string),
          ``summary`` (string), ``agent`` (string), ``datesStart`` (string),
          ``datesEnd`` (string), ``folder`` (string). MCP response is
          identical to LM response.

      * - T-5

          Empty events folder → ``[]``

          *AC-2 (edge)*
        - Point ``jarvis.eventsFolder`` to an empty directory (or remove all
          event sub-folders from ``testdata/events/``). Invoke
          ``jarvis_listEvents``.
        - Response is ``[]`` (empty JSON array). No error in chat response.
          No ``[ERROR]`` entries in Output Channel.
