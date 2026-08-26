Kanban Update Validation UAT Requirements
==========================================

.. req:: jarvis_updateKanbanItem Validation Test Harness and Data
   :id: REQ_UAT_KAN_UPDATE_VALID
   :status: approved
   :priority: required
   :links: US_UAT_KAN_UPDATE_VALID; REQ_KAN_UPDATE; REQ_KAN_WRITEVALID

   **Description:**
   The repository SHALL provide the test data needed to exercise the three
   behaviour changes from the ``kanban-update-validation`` CR against
   ``jarvis_updateKanbanItem``.

   **Acceptance Criteria:**

   * AC-1: The base fixture ``testdata/kanban/sample.kanban.yaml`` (which
     includes a ``priority`` field of type ``single_select`` with options
     ``Low``, ``Medium``, ``High``) is used for T-1..T-4. The tester copies
     it to ``testdata/.jarvis/actors/Change Manager/kanban.yaml`` before
     each scenario.
   * AC-2: For each rejected scenario (T-1, T-2), the tester confirms the
     board file is byte-identical before and after the rejected call
     (file size or ``git diff``).
   * AC-3: For T-3 (valid non-``status`` field value accepted), the tester
     opens ``kanban.yaml`` in a text editor after the call and confirms the
     field value was written correctly.
   * AC-4: Amended scenario T-22 in ``SPEC_UAT_KANBAN`` (``id`` in
     ``changes`` now returns an error) is re-run as part of this CR's
     validation sweep, using the same fixture.
   * AC-5: Step-by-step outcomes for T-1..T-4 are documented in the test
     protocol for this CR.
