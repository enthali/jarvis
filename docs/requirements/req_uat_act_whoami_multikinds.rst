whoAmI Multi-Kind Entity Resolution UAT Requirements
======================================================

.. req:: whoAmI Multi-Kind Entity Resolution Test Harness and Data
   :id: REQ_UAT_ACT_WHOAMI_MULTIKINDS
   :status: approved
   :priority: required
   :links: US_UAT_ACT_WHOAMI_MULTIKINDS; REQ_ACT_WHOAMI

   **Description:**
   The repository SHALL provide the test data needed to exercise the four
   behaviour-change rows of the ``whoami-all-entity-kinds`` CR.

   **Acceptance Criteria:**

   * AC-1: The existing ``testdata/`` tree provides a Project entity named
     ``"Project: Alpha Initiative"``
     (``testdata/projects/alpha/project.yaml``) for T-1, and a registered
     Event entity named ``"DevCon 2026"``
     (``testdata/events/2026-06-15_DevCon 2026/event.yaml``) for T-2.
   * AC-2: Both the Project and Event entities have a ``context.md`` (or
     equivalent referenced file) that ``jarvis_whoAmI`` can return as
     ``contextPath``. If the fixture entities do not have a ``context.md``,
     note this as a testability gap — the tool returns the context path but
     cannot verify its content in this scenario.
   * AC-3: T-3 (multi-match) requires a new fixture where an Actor and a
     Project share the same name (e.g. ``"Shared Name"``). Create:

     * ``testdata/.jarvis/actors/Shared Name/actor.yaml`` (or
       ``session.yaml``) with ``name: "Shared Name"`` and
       ``context.md``
     * ``testdata/projects/shared-name/project.yaml`` with
       ``name: "Shared Name"``

     **NOTE:** This fixture must be removed or renamed after testing
     to avoid polluting other tests that rely on unique entity names.
   * AC-4: T-4 (kanban regression) requires a Project entity with a kanban
     board file. The tester creates
     ``testdata/projects/alpha/kanban.yaml`` from the standard
     ``sample.kanban.yaml`` fixture, or uses any existing Project board.
   * AC-5: All scenarios require the EDH to use
     ``testdata/test.code-workspace`` so both actor and non-actor entity
     kinds are scanned.
   * AC-6: For T-1/T-2, the tester must open a VS Code chat session whose
     title exactly matches the entity name and make it the active tab before
     invoking the tool.
   * AC-7: Step-by-step outcomes for T-1..T-4 are documented in the test
     protocol for this CR.
