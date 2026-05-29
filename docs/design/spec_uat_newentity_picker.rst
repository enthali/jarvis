New Entity Picker and KISS Naming UAT Design Specifications
=============================================================

.. spec:: New Entity Picker and KISS Folder Naming Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_NEWENTITY_PICKER
   :status: draft
   :links: REQ_UAT_NEWENTITY_PICKER

   **Description:**
   Step-by-step procedures and expected outcomes for the mandatory agent-picker
   extension to ``jarvis.newProject``, ``jarvis.newEvent``, and
   ``jarvis.newSession``, plus KISS folder-naming and schema validation tests.

   **Test Setup:**

   * Extension Development Host from ``feature/entity-parity`` via F5.
   * Workspace: ``testdata/test.code-workspace``.
   * ``jarvis.projectsFolder = testdata/projects/``;
     ``jarvis.eventsFolder = testdata/events/``.
   * At least one ``.agent.md`` present so the picker lists ≥ 1 concrete agent
     plus "No agent".
   * VS Code Problems panel open for schema tests.
   * Clean up created folders after each scenario.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-14

          ``project.yaml`` missing ``agent`` — editor schema warning

          *CR AC-3 (Option C)*
        - Open ``legacy-no-agent/project.yaml`` in editor.
        - VS Code Problems panel shows a JSON Schema **warning** for the
          missing ``agent`` field. Severity is warning, not error. File
          remains editable.

      * - T-17

          ``event.yaml`` missing ``summary`` — editor warning; loads at runtime

          *CR AC-3 (event summary)*
        - Open ``Conference/event.yaml``. Check Events Tree.
        - Problems panel shows a schema warning for missing ``summary``.
          Entity still appears in Events Tree (scanner fail-open).

      * - T-18

          ``jarvis.newProject`` — cancel at name InputBox

          *CR AC-8 (cancel)*
        - Click ``+`` in Projects title bar. Press Escape in name InputBox.
        - No folder created. Projects Tree unchanged. No notification.

      * - T-19

          ``jarvis.newProject`` — cancel at agent picker

          *CR AC-8 (cancel at picker)*
        - Click ``+``. Enter ``"Picker Cancel Test"``. Press Escape in picker.
        - No folder created. Projects Tree unchanged.

      * - T-20

          ``jarvis.newProject`` — "No agent" → ``agent: ""``, default chat opens

          *CR AC-8 ("No agent")*
        - Click ``+``. Enter ``"No Agent Project"``. Select "No agent"
          in picker.
        - ``testdata/projects/No Agent Project/project.yaml`` created
          with ``agent: ""``. A default chat editor opens (no mode set), is
          renamed to ``No Agent Project``, and the init-prompt is submitted
          referencing ``${kind}=project``. Delete folder.

      * - T-21

          ``jarvis.newProject`` — concrete agent → written, mode chat opens

          *CR AC-8 (concrete)*
        - Click ``+``. Enter ``"Bound Project"``. Select ``syspilot.uat``.
        - ``project.yaml`` contains ``agent: "syspilot.uat"``. Chat editor
          opens in ``syspilot.uat`` mode, renamed to ``Bound Project``,
          init-prompt submitted. Delete folder.

      * - T-22

          ``jarvis.newEvent`` — cancel at picker

          *CR AC-8 (cancel)*
        - Click ``+`` in Events title bar. Enter name and date. Press Escape
          in picker.
        - No folder created. Events Tree unchanged.

      * - T-23

          ``jarvis.newEvent`` — "No agent" → ``agent: ""``, default chat opens

          *CR AC-8 ("No agent")*
        - Click ``+``. Enter ``"No Agent Event"``, date ``2026-08-02``.
          Select "No agent".
        - ``event.yaml`` contains ``agent: ""``. Default chat editor opens
          (no mode), renamed to ``No Agent Event``, init-prompt submitted
          referencing ``${kind}=event``. Delete folder.

      * - T-24

          ``jarvis.newEvent`` — concrete agent → written, mode chat opens

          *CR AC-8 (concrete)*
        - Enter ``"Bound Event"``, date ``2026-08-03``. Select ``syspilot.cm``.
        - ``event.yaml`` contains ``agent: "syspilot.cm"``. Chat editor opens
          in ``syspilot.cm`` mode, renamed to ``Bound Event``, init-prompt
          submitted. Delete folder.

      * - T-25

          ``jarvis.newSession`` — cancel at picker

          *US_SES_AGENTBIND AC-1 (cancel)*
        - Run ``jarvis.newEntity`` → Session. Enter ``"Cancel Session"``.
          Press Escape in picker.
        - No folder created. Sessions Tree unchanged.

      * - T-26

          ``jarvis.newSession`` — concrete agent → written, chat opened

          *US_SES_AGENTBIND AC-2, AC-3*
        - Run ``jarvis.newEntity`` → Session. Enter ``"Bound Session Test"``.
          Select ``syspilot.uat``.
        - ``session.yaml`` contains ``agent: "syspilot.uat"``. VS Code Chat
          opens for ``Bound Session Test`` in ``syspilot.uat`` mode. Delete
          folder.

      * - T-42

          ``jarvis.newProject`` KISS: verbatim folder name

          *CR AC-2 (KISS)*
        - Click ``+`` in Projects title bar. Enter ``"My Test Project"``
          (spaces). Select any agent.
        - Folder is named exactly ``My Test Project`` (spaces preserved, no
          kebab-case conversion). Delete folder.

      * - T-43

          ``jarvis.newEvent`` KISS: ``<date>_<rawName>`` folder

          *CR AC-2 (KISS)*
        - Enter name ``"Sprint Review Q3"``, date ``2026-07-01``. Select agent.
        - Folder is ``2026-07-01_Sprint Review Q3`` (underscore separator, raw
          name verbatim). Delete folder.
