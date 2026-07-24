Actor Identity Recovery (jarvis_whoAmI) User Acceptance Tests
===============================================================

.. story:: Actor Identity Recovery (jarvis_whoAmI) Acceptance Tests
   :id: US_UAT_WHOAMI
   :status: draft
   :priority: required
   :links: US_ACT_WHOAMI

   **As a** Jarvis Test Engineer running the Extension Development Host,
   **I want** a set of manual acceptance test scenarios for the
   ``jarvis_whoAmI`` LM+MCP tool,
   **so that** I can verify that a registered actor session receives its
   correct name and ``context.md`` path, that non-actor sessions receive a
   user-actionable error, that the tool requires no input parameters, that
   availability gating by ``jarvis.sessions.enabled`` is enforced, and that
   identity recovery works correctly after ``/compact``.

   **Acceptance Criteria:**

   * AC-1: A test verifies that invoking ``#whoAmI`` from a registered actor
     session returns a JSON result with the actor's exact name and the
     absolute path to its ``context.md`` (maps to T-1, T-2).
   * AC-2: A test verifies that invoking ``#whoAmI`` from a non-actor session
     returns a user-visible error message and does not crash (maps to T-3).
   * AC-3: A test verifies that ``whoAmI`` requires zero input parameters —
     the tool can be submitted from the tool picker without entering anything
     (maps to T-5).
   * AC-4: A test verifies that ``whoAmI`` appears in the tool picker when
     ``jarvis.sessions.enabled`` is ``true`` and is absent when ``false``
     (maps to T-6, T-7).
   * AC-5: A test verifies end-to-end identity recovery after ``/compact`` —
     the tool returns the correct actor name and a readable ``contextPath``
     even after compaction (maps to T-8).
