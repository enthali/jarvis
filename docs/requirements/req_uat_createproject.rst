Create Project Tool UAT Requirements
======================================

.. req:: Create Project LM Tool — Test Data and Verification Requirements
   :id: REQ_UAT_CREATEPROJECT
   :status: draft
   :priority: optional
   :links: US_UAT_CREATEPROJECT; REQ_PRJ_CREATEPROJECT

   **Description:**
   Specifies the test data and per-AC verification criteria for manually
   validating the ``jarvis_createProject`` Language Model and MCP tool.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host.
   * ``jarvis.projects.enabled`` must be ``true``.
   * ``jarvis.projectsFolder`` must be set to ``testdata/projects/``.
   * Pre-existing folder ``testdata/projects/alpha/`` with ``project.yaml``
     (used for duplicate guard test T-7).
   * At least one valid agent must be discoverable from the workspace (e.g.
     any ``.agent.md`` file in the workspace).
   * Between test runs that create folders, delete the created folder before
     proceeding.

   **Acceptance Criteria:**

   * AC-1 (happy path — creation):
     For T-6, the tester SHALL verify the tool returns ``created: true``,
     the folder ``testdata/projects/New Automated Project/`` exists, and both
     ``project.yaml`` and ``context.md`` are present. ``project.yaml`` SHALL
     contain exactly ``name``, ``summary``, and ``agent`` matching the input.

   * AC-2 (tree auto-refresh):
     For T-6 step 4, the tester SHALL verify the Projects Tree updates to show
     "New Automated Project" within 2 seconds of the tool call completing,
     without any manual rescan action.

   * AC-3 (duplicate guard):
     For T-7, the tester SHALL verify the tool response contains ``created: false``
     and a non-empty reason string. The tester SHALL confirm ``alpha/project.yaml``
     is byte-for-byte identical to its pre-test state.

   * AC-4 (invalid agent validation):
     For T-8, the tester SHALL verify the tool returns an error (not success).
     The error message SHALL reference the invalid agent name. The tester SHALL
     confirm no folder was created under ``testdata/projects/``.

   * AC-5 (invalid name):
     For T-9, the tester SHALL verify both sub-cases (empty name, reserved name
     ``NUL``) return an error. No folder SHALL be created in either case.
