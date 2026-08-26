Kanban Update Validation Acceptance Tests
==========================================

.. story:: jarvis_updateKanbanItem Full Validation Acceptance Tests
   :id: US_UAT_KAN_UPDATE_VALID
   :status: approved
   :priority: required
   :links: US_KAN_TOOLS

   **As a** Jarvis Test Engineer,
   **I want** acceptance scenarios for the three behaviour changes introduced
   by the ``kanban-update-validation`` CR,
   **so that** I can verify that ``jarvis_updateKanbanItem`` now applies the
   shared write-validation contract to all fields, not only ``status``.

   These scenarios are additive to ``US_UAT_KANBAN`` (which covers the
   pre-existing happy path and error paths). Existing scenario T-22 in
   ``SPEC_UAT_KANBAN`` has been amended by this CR to reflect the new
   behaviour (``id`` in ``changes`` now returns an error).

   Module integration (compile/package/CI) is out of UAT scope.

   **Behaviour changes requiring UAT coverage:**

   * BC-1: A non-``status`` ``single_select`` field value that does not
     match any declared option now returns an error (previously accepted).
   * BC-2: A key in ``changes`` that matches no declared field and is not
     a built-in property now returns an error (previously written and never
     rendered — the GH #57 trap).
   * BC-3: ``id`` in ``changes`` now returns an error instead of silently
     dropping the key and returning ``updated: true`` (covered by
     amended T-22 in ``SPEC_UAT_KANBAN``).

   **Acceptance Criteria:**

   * AC-1: A test verifies BC-1: invalid value on a non-``status``
     ``single_select`` field is rejected; file is unchanged (T-1).
   * AC-2: A test verifies BC-2: an undeclared/typo'd key in ``changes``
     is rejected; file is unchanged (T-2).
   * AC-3: A test verifies that a valid change to a non-``status``
     declared field is still accepted — the new validation path passes
     correctly structured values (T-3).
   * AC-4: A test verifies backward compat: a ``status``-only change
     continues to succeed exactly as before (T-4 cross-refs T-19).
