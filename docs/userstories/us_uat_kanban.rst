Kanban Board User Acceptance Tests
=====================================

.. story:: Kanban Board (jarvis-kanban) Acceptance Tests
   :id: US_UAT_KANBAN
   :status: draft
   :priority: required
   :links: US_KAN_BOARD; US_KAN_DISCOVER; US_KAN_TOOLS

   **As a** Jarvis Test Engineer running the Extension Development Host,
   **I want** a set of manual acceptance test scenarios for the
   ``jarvis-kanban`` module,
   **so that** I can verify that kanban boards render correctly from YAML,
   boards are discovered by convention and shown as tree buttons, all three
   tools (``createKanbanBoard``, ``verifyKanbanSchema``, ``openKanbanBoard``)
   work end-to-end, ``whoAmI`` resolution works when no owner is specified,
   and error paths (unknown actor, board-not-found, schema errors) return
   structured, user-visible results.

   **Acceptance Criteria:**

   * AC-1: A test verifies that a valid ``kanban.yaml`` renders as a board
     with correct columns, cards, and column ordering (maps to T-1, T-2).
   * AC-2: A test verifies that the renderer supports client-side filtering
     by label and by field value (maps to T-3).
   * AC-3: A test verifies live-update: editing and saving the YAML while the
     board is open refreshes the rendered board (maps to T-4).
   * AC-4: A test verifies convention-based discovery: ``kanban.yaml``
     and ``*.kanban.yaml`` create tree buttons; deleting removes them
     (maps to T-5, T-6).
   * AC-5: A test verifies the Quick Pick appears when an owner has multiple
     boards (maps to T-7).
   * AC-6: A test verifies ``jarvis_createKanbanBoard`` creates a valid
     skeleton YAML, resolves owner from ``whoAmI`` when omitted, and returns
     error for duplicate or unknown owner (maps to T-8, T-9, T-10, T-11).
   * AC-7: A test verifies ``jarvis_verifyKanbanSchema`` returns structured
     findings for valid boards and detects errors (missing status field,
     bad status value, bad field value) (maps to T-12, T-13, T-14).
   * AC-8: A test verifies ``jarvis_openKanbanBoard`` opens the renderer and
     returns error for missing board (maps to T-15, T-16).
