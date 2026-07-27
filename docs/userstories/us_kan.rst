Kanban User Stories
===================

.. story:: Kanban Board from YAML
   :id: US_KAN_BOARD
   :status: draft
   :priority: required

   **As a** Jarvis user or agent,
   **I want** to define a kanban board in a YAML file and see it rendered as a
   visual board in VS Code,
   **so that** I can track work items, their status, and priority at a glance
   without leaving my development environment.

   **Acceptance Criteria:**

   * AC-1: A valid ``kanban.yaml`` file renders as a kanban webview with columns
     derived from the ``status`` field options.
   * AC-2: Each item appears as a card in the column matching its ``status``
     value.
   * AC-3: Cards display the item name, and optionally labels and field values.
   * AC-4: The renderer supports client-side filtering (e.g. by label, by field
     value).
   * AC-5: The board is read-only in Phase 1 — no drag-and-drop or inline
     editing.
   * AC-6: The YAML file is a hand-authored, git-tracked source of truth.
     Comments and formatting I write by hand survive programmatic updates, and
     a tool-driven change produces a diff limited to what actually changed —
     so I can mix hand editing and tool use without losing context or reading
     noisy diffs.


.. story:: Convention-Based Board Discovery
   :id: US_KAN_DISCOVER
   :status: draft
   :priority: required

   **As a** Jarvis user,
   **I want** kanban boards to be discovered automatically by placing a YAML
   file in an actor's or entity's folder,
   **so that** I do not need to configure paths — the file's location determines
   ownership.

   **Acceptance Criteria:**

   * AC-1: A file named ``kanban.yaml`` in an actor's or entity's folder makes
     that node own a default board.
   * AC-2: A file named ``<name>.kanban.yaml`` in the same folder creates a
     named board.
   * AC-3: A tree button appears on the owning actor/entity node when at least
     one board file exists in its folder.
   * AC-4: Deleting the board file removes the tree button (no stale UI).
   * AC-5: Clicking a kanban YAML file in the Files tree opens the board
     webview, not the text editor.


.. story:: Kanban Board Tools
   :id: US_KAN_TOOLS
   :status: draft
   :priority: required
   :links: US_ACT_WHOAMI

   **As an** LLM operating within a Jarvis actor session,
   **I want** tools to create, validate, and open kanban boards,
   **so that** I can manage boards programmatically without requiring the user
   to edit YAML manually or navigate the UI.

   **Acceptance Criteria:**

   * AC-1: ``jarvis_createKanbanBoard`` creates a new board YAML file with a
     valid skeleton schema and returns the file path.
   * AC-2: ``jarvis_verifyKanbanSchema`` validates a board YAML against the
     schema and returns structured findings (errors and warnings with
     field/line context) so the actor can fix issues iteratively.
   * AC-3: ``jarvis_openKanbanBoard`` opens the board in the webview renderer.
   * AC-4: All three tools resolve the calling actor via ``jarvis_whoAmI``
     (``US_ACT_WHOAMI``) when no owner is specified.
   * AC-5: An unresolvable owner returns ``{ error: "actor unknown" }``.
   * AC-6: ``jarvis_updateKanbanItem`` updates an existing item by its stable
     integer ID so that changes can be applied without touching the full
     board YAML manually.
