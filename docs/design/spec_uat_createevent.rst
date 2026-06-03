Create Event Tool UAT Design Specifications
=============================================

.. spec:: Create Event LM Tool Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_CREATEEVENT
   :status: draft
   :links: REQ_UAT_CREATEEVENT

   **Description:**
   Step-by-step procedures and expected outcomes for all ``jarvis_createEvent``
   acceptance test scenarios.

   **Test Setup:**

   * Extension Development Host from ``feature/entity-parity`` via F5.
   * Workspace: ``testdata/test.code-workspace``.
   * ``jarvis.eventsFolder = testdata/events/``.
   * Pre-existing ``2026-06-15_DevCon 2026/`` folder present.
   * No ``2026-09-01_Kickoff Meeting/`` folder present.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-10

          Happy path — ``<date>_<name>`` folder

          *AC-1, AC-2, AC-3, AC-4*
        - Invoke ``jarvis_createEvent`` with
          ``{"name": "Kickoff Meeting", "startDate": "2026-09-01",
          "summary": "Q4 kickoff", "agent": "syspilot.cm"}``. Wait up to 2 s.
          Check disk. Check YAML. Check tree. Delete folder after test.
        - Returns ``{"created": true}``. Folder
          ``testdata/events/2026-09-01_Kickoff Meeting/`` exists with
          ``event.yaml`` and ``context.md``. YAML contains:
          ``name: "Kickoff Meeting"``,
          ``dates.start: "2026-09-01"``, ``dates.end: "2026-09-01"``
          (defaulted), ``summary: "Q4 kickoff"``, ``agent: "syspilot.cm"``.
          Events Tree shows entry within 2 s.

      * - T-11

          Duplicate → ``created: false``

          *AC-5*
        - Invoke ``jarvis_createEvent`` with
          ``{"name": "DevCon 2026", "startDate": "2026-06-15"}``.
        - Returns ``{"created": false, "reason": "..."}`` — non-empty reason.
          Original ``event.yaml`` unchanged.

      * - T-12

          Invalid date → error, no folder

          *AC-6*
        - Sub-case A: ``{"name": "Bad Date Event", "startDate": "15-06-2026"}``.
          Sub-case B: ``{"name": "Bad Calendar", "startDate": "2026-02-30"}``.
        - Both return an error referencing the invalid date. No folder created.

      * - T-13

          Missing ``startDate`` → error

          *AC-4*
        - Invoke ``jarvis_createEvent`` with ``{"name": "No Date Event"}``
          (no ``startDate``).
        - Tool returns an error indicating ``startDate`` is required. No folder
          created.
