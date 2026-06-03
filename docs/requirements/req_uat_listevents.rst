List Events Tool UAT Requirements
===================================

.. req:: List Events LM Tool — Test Data and Verification Requirements
   :id: REQ_UAT_LISTEVENTS
   :status: draft
   :priority: optional
   :links: US_UAT_LISTEVENTS; REQ_EXP_LISTEVENTS

   **Description:**
   Specifies the test data and per-AC verification criteria for manually
   validating the ``jarvis_listEvents`` Language Model and MCP tool.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host.
   * ``jarvis.events.enabled`` must be ``true``.
   * At least one event with a complete ``event.yaml`` must exist under the
     configured events folder:

     - ``testdata/events/2026-06-15_DevCon 2026/event.yaml`` with ``name``,
       ``summary``, ``agent``, ``dates.start``, ``dates.end`` populated.

   * For the empty-folder scenario (T-5): a second workspace or temporary
     test run where ``jarvis.eventsFolder`` points to an empty directory.

   **Acceptance Criteria:**

   * AC-1 (tool visible in picker, no params):
     For T-4 step 1, the tester SHALL open the Chat tool picker and verify
     ``jarvis_listEvents`` is listed. The tool description SHALL indicate no
     input parameters are required.

   * AC-2 (returns correct fields):
     For T-4 step 3, the tester SHALL inspect the tool response JSON and verify
     the "DevCon 2026" entry contains: ``name`` (string), ``summary`` (string,
     may be empty), ``agent`` (string, may be empty), ``datesStart`` (date
     string), ``datesEnd`` (date string), ``folder`` (relative path string).
     No extra undocumented fields are required, but all six SHALL be present.

   * AC-3 (empty folder → ``[]``):
     For T-5, the tester SHALL verify the tool returns a JSON array with zero
     elements (``[]``) and that no error or exception is visible in the Output
     Channel or chat response.

   * AC-4 (MCP dual registration):
     For T-4 MCP step, the tester SHALL verify (with ``jarvis.mcp.enabled=true``)
     that calling ``jarvis_listEvents`` via an MCP client returns the same
     content as the LM tool invocation.
