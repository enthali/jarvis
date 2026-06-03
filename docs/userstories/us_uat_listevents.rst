List Events Tool User Acceptance Tests
=======================================

.. story:: List Events LM Tool Acceptance Tests
   :id: US_UAT_LISTEVENTS
   :status: draft
   :priority: optional
   :links: US_EXP_LISTEVENTS; REQ_EXP_LISTEVENTS

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the ``jarvis_listEvents``
   Language Model and MCP tool,
   **so that** I can verify that LLM agents can discover events with all
   required fields, and that edge cases such as an empty events folder are
   handled correctly.

   **Acceptance Criteria:**

   * AC-1: A test verifies that ``jarvis_listEvents`` appears in the Chat tool
     picker and requires no input parameters (maps to ``US_EXP_LISTEVENTS``
     AC-1, AC-3 / T-4).
   * AC-2: A test verifies that invoking the tool returns a list of event
     objects each containing ``name``, ``summary``, ``agent``, ``datesStart``,
     ``datesEnd``, and ``folder`` fields (maps to ``US_EXP_LISTEVENTS`` AC-2
     / T-4).
   * AC-3: A test verifies that the tool returns ``[]`` when the events folder
     contains no valid event sub-folders, without throwing an error (maps to
     ``US_EXP_LISTEVENTS`` AC-2 / T-5).
   * AC-4: A test verifies that ``jarvis_listEvents`` is also accessible via
     the MCP server when ``jarvis.mcp.enabled`` is ``true`` (maps to
     ``US_EXP_LISTEVENTS`` AC-4 / T-4 MCP step).

   **Test Scenarios (summary):**

   * T-4: Tool available in picker; returns event objects with all required
     fields; accessible via MCP (dual registration).
   * T-5: Empty events folder → tool returns ``[]``, no error.
