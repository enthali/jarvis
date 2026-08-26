Kanban Update Validation UAT Design Specifications
===================================================

.. spec:: jarvis_updateKanbanItem Validation — Test Scenarios
   :id: SPEC_UAT_KAN_UPDATE_VALID
   :status: approved
   :links: REQ_UAT_KAN_UPDATE_VALID

   **Description:**
   Scenarios for the ``kanban-update-validation`` CR, covering the three
   behaviour changes to ``jarvis_updateKanbanItem`` (BC-1..BC-3). Executed
   in an Extension Development Host with ``packages/core`` + ``packages/kanban``
   active, workspace ``testdata/test.code-workspace``.

   **Also amended by this CR:** ``SPEC_UAT_KANBAN`` T-22 — ``id`` in
   ``changes`` now returns an error instead of a silent-skip result.
   Re-run T-22 from ``SPEC_UAT_KANBAN`` alongside these scenarios.

   Module integration (compile/package/CI) is out of UAT scope.

   **Test Setup:**

   * EDH from ``feature/kanban-update-validation`` (stacked on
     ``feature/kanban-management-tools``).
   * Before each scenario: copy ``testdata/kanban/sample.kanban.yaml``
     to ``testdata/.jarvis/actors/Change Manager/kanban.yaml``.
   * The fixture has a ``priority`` field (``single_select``, options:
     ``Low``, ``Medium``, ``High``).

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          BC-1: invalid non-``status`` single_select value rejected

          *AC: REQ_KAN_UPDATE AC-8; REQ_KAN_WRITEVALID AC-1*
        - Note the current file size of ``kanban.yaml``.
          Call ``jarvis_updateKanbanItem`` with ``itemId: 1``,
          ``changes: { "priority": "Critical" }``
          (``"Critical"`` is not a declared option; valid: Low/Medium/High).
        - Response contains ``{ "error": ... }`` naming ``priority`` and its
          valid options. File is **unchanged** — no partial write.
          **Previous behaviour (now rejected):** This call previously returned
          ``{ "updated": true }`` and wrote ``priority: Critical``
          to the YAML.

      * - T-2

          BC-2: undeclared key in ``changes`` rejected

          *AC: REQ_KAN_UPDATE AC-8; REQ_KAN_WRITEVALID AC-3*
        - Note the current file size of ``kanban.yaml``.
          Call ``jarvis_updateKanbanItem`` with ``itemId: 1``,
          ``changes: { "silentTrap": "invisible" }``
          (``"silentTrap"`` is not a declared field).
        - Response contains ``{ "error": ... }`` naming the undeclared key
          and the declared field names. File is **unchanged**.
          **Previous behaviour (now rejected):** This call previously returned
          ``{ "updated": true }`` and wrote ``silentTrap: invisible``
          to the YAML, where it was silently never rendered (GH #57 trap).

      * - T-3

          Valid non-``status`` field value accepted through new path

          *AC: REQ_KAN_UPDATE AC-8 (positive case)*
        - Call ``jarvis_updateKanbanItem`` with ``itemId: 1``,
          ``changes: { "priority": "High" }``
          (``"High"`` is a declared option on the ``priority`` field).
        - Response: ``{ "path": ..., "updated": true, "itemId": 1 }``.
          Open ``kanban.yaml`` — item ``id: 1`` now has ``priority: High``.
          File otherwise unchanged. **The new validation path passes
          correctly structured values through to the write.**

      * - T-4

          Backward compat: status-only change unaffected

          *AC: REQ_KAN_UPDATE AC-8 (backward compat)*
        - See ``SPEC_UAT_KANBAN`` T-19 — ``status``-only change still
          succeeds. Re-run that scenario on this branch to confirm the
          existing happy path is unaffected.
        - Expected result: identical to T-19 in ``SPEC_UAT_KANBAN``
          (``{ "updated": true, "itemId": 2 }``; ``status`` field updated;
          file content otherwise preserved). No regression.

   **Cross-reference — BC-3:**

   ``id`` in ``changes`` is now an error (BC-3). This is covered by the
   amended ``SPEC_UAT_KANBAN`` T-22. Re-run T-22 alongside these scenarios
   to complete the three-behaviour-change sweep.
