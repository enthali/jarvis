Kanban Update Validation Acceptance Criteria
============================================

``jarvis_updateKanbanItem`` of the Kanban module, executed by the User in an
Extension Development Host with ``packages/core`` and ``packages/kanban`` active
and the workspace ``testdata/test.code-workspace`` open. The journey starts from
a fresh copy of ``testdata/kanban/sample.kanban.yaml`` (a ``priority``
single_select field with the options Low, Medium, High) placed at
``testdata/.jarvis/actors/Change Manager/kanban.yaml`` and opened in its kanban
view; every call passes ``ownerName: "Change Manager"``.

.. ac:: An Actor's updates are refused when invalid and applied when valid, and the open board shows the result
   :id: AC_KAN_UPDATE_VALID_JOURNEY
   :status: approved
   :validates: US_KAN_TOOLS

   **Given** the sample board open in its kanban view, with item 1 showing its
   current priority, and an open chat of the Actor ``Change Manager``

   1. **When** the tester asks the Actor to set the ``priority`` of item 1 to
      Critical, which is not a declared option
      **Then** the Actor reports an error that names ``priority`` and its valid
      options (Low, Medium, High), and the card of item 1 still shows its previous
      priority.

   2. **When** the tester asks the Actor to set the ``priority`` of item 1 to High
      and to move item 2 to Done
      **Then** the card of item 1 shows priority High, the card of item 2 appears in
      the Done column, and no other card changes.
