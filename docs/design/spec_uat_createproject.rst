Create Project Tool UAT Design Specifications
===============================================

.. spec:: Create Project LM Tool Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_CREATEPROJECT
   :status: draft
   :links: REQ_UAT_CREATEPROJECT

   **Description:**
   Step-by-step procedures and expected outcomes for all ``jarvis_createProject``
   acceptance test scenarios.

   **Test Setup:**

   * Extension Development Host from ``feature/entity-parity`` via F5.
   * Workspace: ``testdata/test.code-workspace``.
   * ``jarvis.projectsFolder = testdata/projects/``.
   * Pre-existing ``alpha/`` folder present. No ``New Automated Project/`` folder.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-6

          Happy path — creation

          *AC-1, AC-2, AC-3*
        - Invoke ``jarvis_createProject`` with
          ``{"name": "New Automated Project", "summary": "Created by test",
          "agent": "syspilot.uat"}``. Wait up to 2 s. Check disk. Check tree.
          Delete created folder after test.
        - Tool returns ``{"created": true}``. Folder
          ``testdata/projects/New Automated Project/`` exists with
          ``project.yaml`` (containing name, summary, agent) and
          ``context.md``. Projects Tree shows "New Automated Project" within
          2 s without manual rescan.

      * - T-7

          Duplicate name → ``created: false``

          *AC-4*
        - Invoke ``jarvis_createProject`` with ``{"name": "alpha"}``.
        - Tool returns ``{"created": false, "reason": "..."}`` — reason is
          non-empty. ``alpha/project.yaml`` is byte-for-byte unchanged.

      * - T-8

          Invalid agent → error, no folder

          *AC-6*
        - Invoke ``jarvis_createProject`` with
          ``{"name": "Ghost Project", "agent": "nonexistent.agent"}``.
        - Tool returns an error response (not ``created: true``). Error message
          references ``"nonexistent.agent"`` and lists available agents.
          ``testdata/projects/Ghost Project/`` does NOT exist.

      * - T-9

          Empty / reserved name → error

          *AC-5*
        - Sub-case A: invoke with ``{"name": ""}``.
          Sub-case B: invoke with ``{"name": "NUL"}``.
        - Both return an error: "invalid project name". No folders created.
