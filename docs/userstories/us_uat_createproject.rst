Create Project Tool User Acceptance Tests
==========================================

.. story:: Create Project LM Tool Acceptance Tests
   :id: US_UAT_CREATEPROJECT
   :status: draft
   :priority: optional
   :links: US_PRJ_CREATEPROJECT; REQ_PRJ_CREATEPROJECT

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the ``jarvis_createProject``
   Language Model and MCP tool,
   **so that** I can verify that programmatic project creation works end-to-end,
   including happy path, duplicate guard, agent validation, and name validation.

   **Acceptance Criteria:**

   * AC-1: A test verifies that ``jarvis_createProject`` creates the expected
     folder, ``project.yaml``, and ``context.md`` and returns ``created: true``
     (maps to ``US_PRJ_CREATEPROJECT`` AC-1, AC-2 / T-6).
   * AC-2: A test verifies that the Projects Tree reflects the new project within
     2 seconds without a manual rescan (maps to ``US_PRJ_CREATEPROJECT`` AC-3
     / T-6).
   * AC-3: A test verifies that calling the tool for a project whose folder already
     exists returns ``created: false`` without overwriting any files (maps to
     ``US_PRJ_CREATEPROJECT`` AC-4 / T-7).
   * AC-4: A test verifies that providing an invalid ``agent`` value causes the
     tool to return an error and NOT create any folder (maps to
     ``US_PRJ_CREATEPROJECT`` AC-6 / T-8).
   * AC-5: A test verifies that an empty name or a Windows reserved name causes
     the tool to return an error (maps to ``US_PRJ_CREATEPROJECT`` AC-5 / T-9).

   **Test Scenarios (summary):**

   * T-6: Happy path — folder + YAML + context.md created; tree auto-refreshes.
   * T-7: Duplicate name → ``created: false``; original YAML unchanged.
   * T-8: Invalid ``agent`` value → error; no folder created.
   * T-9: Empty or reserved name → error.
