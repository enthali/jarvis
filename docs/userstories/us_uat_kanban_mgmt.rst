Kanban Management Tools Acceptance Tests
=========================================

.. story:: Kanban Management Tools Acceptance Tests
   :id: US_UAT_KAN_MGMT
   :status: approved
   :priority: required
   :links: US_KAN_TOOLS; US_KAN_QUERY

   **As a** Jarvis Test Engineer,
   **I want** acceptance scenarios for the four new kanban management tools
   and the shared write-validation helper,
   **so that** I can verify that items can be added, deleted, and listed via
   tool, that field definitions can be evolved, and that write-validation
   blocks invalid data before any mutation reaches the file.

   The two defects this CR closes are exercised independently: WRITEVALID
   scenarios confirm that the new write tools are stricter than
   ``jarvis_updateKanbanItem``, and LIST scenarios confirm that an unknown
   status filter is an error, not an empty result.

   Module integration (compile/package/CI) is out of UAT scope.

   **Acceptance Criteria:**

   * AC-1: A test verifies that ``jarvis_addKanbanItem`` appends an item with
     an auto-assigned id and increments ``nextId`` (T-1).
   * AC-2: A test verifies that ``status`` defaults to the first declared
     option when omitted (T-2).
   * AC-3: A test verifies that ``nextId`` is written when the board had none
     (T-3).
   * AC-4: A test verifies that an invalid ``single_select`` value is rejected
     before the file is written (T-4).
   * AC-5: A test verifies that an undeclared field key is rejected as an
     error — not silently accepted and warned (T-5).
   * AC-6: A test verifies that a caller-supplied ``id`` is rejected (T-6).
   * AC-7: A test verifies that ``jarvis_deleteKanbanItem`` removes an item by
     id, leaves ``nextId`` unchanged, and preserves surviving items (T-7..T-9).
   * AC-8: A test verifies that ``jarvis_listKanbanItems`` returns a compact
     projection and respects status and labels filters (T-10..T-12).
   * AC-9: A test verifies that an unknown status filter value is an error,
     not an empty list (T-13).
   * AC-10: A test verifies each ``jarvis_updateKanbanFields`` operation and
     its reference guards (T-15..T-20).
   * AC-11: A test verifies the skill's Tools table and the id/projection
     caveats (T-21).
