New Entity Picker and KISS Naming UAT Requirements
====================================================

.. req:: New Entity Picker and KISS Folder Naming — Test Data and Verification Requirements
   :id: REQ_UAT_NEWENTITY_PICKER
   :status: draft
   :priority: required
   :links: US_UAT_NEWENTITY_PICKER; REQ_EXP_NEWPROJECT; REQ_EXP_NEWEVENT

   **Description:**
   Specifies the test data and per-AC verification criteria for manually
   validating the mandatory agent-picker step added to ``jarvis.newProject``,
   ``jarvis.newEvent``, and ``jarvis.newSession``, plus KISS folder naming for
   projects and events.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host.
   * ``jarvis.projectsFolder`` = ``testdata/projects/``.
   * ``jarvis.eventsFolder`` = ``testdata/events/``.
   * At least one ``.agent.md`` file with a non-empty ``name`` frontmatter field
     must be present in the workspace so the agent picker lists at least one
     concrete agent plus the "default agent" option.
   * Before each scenario that creates a folder, verify the expected folder does
     NOT already exist. Clean up created folders after each scenario.
   * For T-14 and T-17 (schema tests): open the relevant YAML files in the editor
     with VS Code Problems panel visible.

   **Acceptance Criteria:**

   * AC-1 (editor schema warning — project missing agent):
     For T-14, the tester SHALL open ``legacy-no-agent/project.yaml`` and verify
     the VS Code Problems panel shows a JSON Schema warning for the missing
     ``agent`` field. The severity SHOULD be warning (not error).

   * AC-2 (editor schema warning — event missing summary):
     For T-17, the tester SHALL open ``Conference/event.yaml`` and verify the
     Problems panel shows a schema warning for missing ``summary``, while the
     entity still loads in the Events Tree.

   * AC-3 (cancel → no folder):
     For T-18, T-19, and T-22, the tester SHALL verify no new folder appears
     under ``testdata/projects/`` or ``testdata/events/`` after pressing Escape.
     The Projects/Events Tree SHALL be unchanged.

   * AC-4 (default agent → ``agent: ""``; no chat):
     For T-20 and T-23, the tester SHALL open the created YAML and verify
     ``agent: ""`` is present. No VS Code Chat panel SHALL have opened.

   * AC-5 (concrete agent written; no chat for project/event):
     For T-21 and T-24, the tester SHALL verify ``agent: "<name>"`` is written
     and confirm no VS Code Chat panel opened.

   * AC-6 (newSession concrete agent → chat opened):
     For T-26, the tester SHALL verify the agent is written to ``session.yaml``
     and a VS Code Chat panel opens in the specified agent mode.

   * AC-7 (KISS folder name — project):
     For T-42, the tester SHALL verify the created folder name is exactly the
     raw string entered (spaces preserved, no lowercase conversion, no hyphenation).

   * AC-8 (KISS folder name — event):
     For T-43, the tester SHALL verify the folder is ``<YYYY-MM-DD>_<rawName>``
     where the separator is an underscore and the name portion is verbatim.
