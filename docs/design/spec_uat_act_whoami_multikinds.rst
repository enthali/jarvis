whoAmI Multi-Kind Entity Resolution UAT Design Specifications
==============================================================

.. spec:: whoAmI Multi-Kind — Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_ACT_WHOAMI_MULTIKINDS
   :status: approved
   :links: REQ_UAT_ACT_WHOAMI_MULTIKINDS

   **Description:**
   Scenarios for the ``whoami-all-entity-kinds`` CR. Executed in an
   Extension Development Host with ``packages/core`` active, workspace
   ``testdata/test.code-workspace``.

   These extend ``SPEC_UAT_WHOAMI`` (T-1..T-8). The amended T-3 in that spec
   now also serves as the zero-match regression check.

   Module integration (compile/package/CI) is out of UAT scope.

   **Test Setup:**

   * EDH from ``feature/whoami-all-entity-kinds``.
   * Workspace ``testdata/test.code-workspace`` — all entity kinds scanned.
   * Jarvis Output Channel open (View → Output → Jarvis).
   * For each scenario that requires a specific session title to be active,
     confirm that the session tab is focused and matches the entity name
     before invoking the tool.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          BC-1: Project session resolved

          *AC: REQ_ACT_WHOAMI AC-2, AC-10*
        - Precondition: ``testdata/projects/alpha/project.yaml`` is
          present with ``name: "Project: Alpha Initiative"``.
          Open a VS Code chat session titled
          ``Project: Alpha Initiative`` and make it the active tab.

          Invoke ``#whoAmI`` from within that session.
        - Response: ``{ "name": "Project: Alpha Initiative", "contextPath": "..." }``.

          ``contextPath`` points to a path within
          ``testdata/projects/alpha/`` (e.g. ``context.md`` if present;
          the tool returns whatever path ``SPEC_ACT_WHOAMI`` specifies for
          the entity's root file).

          **Previous behaviour:** Would have returned
          ``{ "error": "You are not a registered actor..." }`` because
          the old predicate filtered to ``kind === 'session'`` only.

      * - T-2

          BC-2: Event session resolved

          *AC: REQ_ACT_WHOAMI AC-2, AC-10*
        - Precondition: ``testdata/events/2026-06-15_DevCon 2026/event.yaml``
          is present with ``name: "DevCon 2026"``.
          Open a VS Code chat session titled ``DevCon 2026`` and make
          it the active tab.

          Invoke ``#whoAmI`` from within that session.
        - Response: ``{ "name": "DevCon 2026", "contextPath": "..." }``.

          ``contextPath`` points to a path within the event's folder.

          **Previous behaviour:** Would have returned the error as in T-1.

      * - T-3

          BC-4: Multi-match across kinds → error

          *AC: REQ_ACT_WHOAMI AC-7, AC-11*

          *Requires temporary fixture — see REQ_UAT_ACT_WHOAMI_MULTIKINDS AC-3.*
        - Precondition: Both an Actor
          (``testdata/.jarvis/actors/Shared Name/``) and a Project
          (``testdata/projects/shared-name/project.yaml``) are registered
          with ``name: "Shared Name"``. Open a VS Code chat session titled
          ``Shared Name`` and make it the active tab.

          Invoke ``#whoAmI``.
        - Response: ``{ "error": "You are not a registered actor.
          Please ask the user which actor you are." }``
          (or equivalent error text — the exact string is unchanged from
          the zero-match case).

          **Not the Actor identity:** The tool does NOT return the Actor's
          ``contextPath`` — returning either match would be a best-guess
          identity, which ``REQ_ACT_WHOAMI`` AC-7 forbids.

          **Teardown:** Remove or rename the ``Shared Name`` fixtures after
          this scenario to avoid polluting other tests.

      * - T-4

          BC-3 regression: Actor session still resolved (Actor guard)

          *AC: REQ_ACT_WHOAMI AC-2; regression against existing T-1/T-2*
        - Precondition: ``Change Manager`` actor is registered (existing
          fixture). Open a chat session titled ``Change Manager``; make
          it active.

          Invoke ``#whoAmI``.
        - Response: ``{ "name": "Change Manager", "contextPath": "..." }``
          — identical to ``SPEC_UAT_WHOAMI`` T-1. No regression in the
          Actor case.

      * - T-5

          Kanban regression: Project owner resolved via whoAmI

          *AC: US_UAT_ACT_WHOAMI_MULTIKINDS AC-4; REQ_KAN_CREATE AC-3*
        - Precondition: A Project entity with a kanban board exists under
          ``testdata/projects/`` (e.g. create
          ``testdata/projects/alpha/kanban.yaml`` from the standard
          fixture, or use any existing project board).
          Open a VS Code chat session titled ``Project: Alpha Initiative``
          and make it the active tab.

          Call ``jarvis_listKanbanItems`` **without** supplying
          ``ownerName``.
        - Owner is auto-resolved to ``"Project: Alpha Initiative"`` via
          ``jarvis_whoAmI`` internally. The tool returns the board's items
          (or ``{ error: "board not found" }`` if no board file exists —
          the key assertion is that it does **not** return
          ``{ error: "actor unknown" }``, which would indicate the Project
          was not recognised).
