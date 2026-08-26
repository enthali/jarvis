Kanban Management Tools UAT Requirements
=========================================

.. req:: Kanban Management Tools Test Harness and Data
   :id: REQ_UAT_KAN_MGMT
   :status: approved
   :priority: required
   :links: US_UAT_KAN_MGMT; REQ_KAN_ADD; REQ_KAN_DELETE; REQ_KAN_LIST; REQ_KAN_FIELDS; REQ_KAN_WRITEVALID

   **Description:**
   The repository SHALL provide the test data and infrastructure needed to
   execute the kanban-management-tools acceptance scenarios in an Extension
   Development Host with ``packages/core`` + ``packages/kanban`` active.

   **Acceptance Criteria:**

   * AC-1: The base fixture ``testdata/kanban/sample.kanban.yaml`` (three
     status options: Backlog/In Progress/Done; a ``priority`` single_select
     field; items with labels and a ``notes`` field) is used for most
     scenarios. The tester copies it to
     ``testdata/.jarvis/actors/Change Manager/kanban.yaml`` before each
     scenario that requires a fresh board.
   * AC-2: T-3 (nextId absent) requires a variant board with no ``nextId``
     top-level key. The tester creates this inline by copying
     ``sample.kanban.yaml`` and removing the ``nextId`` line.
   * AC-3: T-9 (diff confinement) requires opening the board YAML in a text
     editor before and after the delete, and comparing the diff. A board with
     at least three items (items 1, 2, 3) is required; item 2 is deleted and
     items 1 and 3 must survive unchanged.
   * AC-4: Scenarios T-4..T-6 (WRITEVALID) verify error paths. The tester
     confirms the board file is byte-identical before and after each rejected
     call (by checking file size or ``git diff``).
   * AC-5: T-21 (skill content) reads the provisioned
     ``.github/skills/jarvis-kanban.board/SKILL.md`` directly and checks
     its content. The skill must be provisioned by activation before this
     scenario.
   * AC-6: All write tool scenarios (T-1..T-9, T-15..T-20) verify the
     kanban webview panel refreshes after a successful write — the tester
     leaves ``jarvis_openKanbanBoard`` open before the tool call and
     confirms the panel updates without a manual reload.
   * AC-7: Step-by-step outcomes for T-1..T-21 are documented in the test
     protocol for this CR.
