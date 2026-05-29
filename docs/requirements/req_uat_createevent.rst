Create Event Tool UAT Requirements
=====================================

.. req:: Create Event LM Tool — Test Data and Verification Requirements
   :id: REQ_UAT_CREATEEVENT
   :status: draft
   :priority: optional
   :links: US_UAT_CREATEEVENT; REQ_EXP_CREATEEVENT

   **Description:**
   Specifies the test data and per-AC verification criteria for manually
   validating the ``jarvis_createEvent`` Language Model and MCP tool.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host.
   * ``jarvis.events.enabled`` must be ``true``.
   * ``jarvis.eventsFolder`` must be set to ``testdata/events/``.
   * Pre-existing folder
     ``testdata/events/2026-06-15_DevCon 2026/`` with ``event.yaml``
     (used for duplicate guard test T-11).
   * Between test runs that create folders, delete the created folder.

   **Acceptance Criteria:**

   * AC-1 (folder naming convention):
     For T-10 step 2, the tester SHALL verify the created folder is named
     ``2026-09-01_Kickoff Meeting`` (underscore separator, raw name verbatim,
     no slug conversion). Both ``event.yaml`` and ``context.md`` SHALL be
     present inside the folder.

   * AC-2 (YAML field correctness):
     For T-10 step 3, the tester SHALL open ``event.yaml`` and verify:
     ``name: "Kickoff Meeting"``, ``dates.start: "2026-09-01"``,
     ``dates.end: "2026-09-01"`` (defaulted to start when ``endDate`` omitted),
     ``summary: "Q4 kickoff"``, ``agent: "syspilot.cm"``.

   * AC-3 (tree auto-refresh):
     For T-10 step 4, the tester SHALL verify the Events Tree shows the new
     event within 2 seconds.

   * AC-4 (duplicate guard):
     For T-11, the tester SHALL verify the tool returns ``created: false``
     with a reason. The original ``event.yaml`` SHALL be unmodified.

   * AC-5 (date validation):
     For T-12, the tester SHALL verify that both invalid format (``15-06-2026``)
     and non-calendar date (``2026-02-30``) cause an error response. No folder
     SHALL be created for either.

   * AC-6 (missing required parameter):
     For T-13, the tester SHALL verify that omitting ``startDate`` causes the
     tool to return an error indicating the parameter is required.
