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
   * AC-7 (``kanban-management-tools`` CR): ``jarvis_addKanbanItem`` appends a
     new item, assigning its ``id`` automatically so the caller never picks one.
   * AC-8 (``kanban-management-tools`` CR): ``jarvis_deleteKanbanItem`` removes
     an item by ``id``.
   * AC-9 (``kanban-management-tools`` CR): ``jarvis_updateKanbanFields``
     evolves the board's own field and option definitions, refusing changes
     that would strand existing item values.
   * AC-10 (``kanban-management-tools`` CR): Every board mutation an actor can
     reasonably need is reachable through a tool, so hand-editing the YAML is
     never the only route. Where that is not yet true, the gap is recorded
     rather than left to be discovered — see ``REQ_KAN_FIELDS``.


.. story:: Query a Board Without Reading All of It
   :id: US_KAN_QUERY
   :status: approved
   :priority: required
   :links: US_KAN_TOOLS

   **As an** LLM operating within a Jarvis actor session,
   **I want** to ask a board for just the items I care about, and get back only
   the fields I need to identify them,
   **so that** working with a large board does not consume my context window on
   items I am not acting on.

   **Context:**
   Boards have been observed at 1000+ lines (user observation, 2026-08-24). The
   only way to see a board's contents today is to read the whole YAML file,
   which grows without bound as the board fills. This is a different problem
   from the other tools in ``US_KAN_TOOLS``: those exist so edits go through
   guards, this one exists so reading stays affordable. Acceptance is therefore
   about result *size*, not correctness.

   **Acceptance Criteria:**

   * AC-1: Items can be narrowed by ``status``, by ``labels``, or by both
     together.
   * AC-2: The result carries only enough per item to identify and triage it —
     not the item's full contents.
   * AC-3: The result size scales with the number of *matching* items, not with
     the size of the board.
   * AC-4: Asking for a narrow slice of a large board does not require reading
     the board file into context first.
   * AC-5: A query matching nothing is an ordinary empty result, not an error.


.. story:: Kanban Skill and Instructions Content
   :id: US_KAN_SKILL
   :status: approved
   :priority: required
   :links: US_KAN_TOOLS; US_MOD_SKILL_PROVISION

   **As an** LLM operating within a Jarvis actor session,
   **I want** the kanban skill and instructions to describe the board ontology,
   the tool workflow, and the traps I can fall into,
   **so that** I can author and edit a board correctly on the first attempt
   without opening ``kanban.schema.json``.

   **Context:**
   GH #57 reports four gaps hit in a single session. The reporter had to locate
   the schema file inside the installed extension folder to discover field-type
   constraints, and lost the most time to a trap that produces no error at all:
   an item key that is not declared in ``fields[]`` is accepted by the schema,
   downgraded to a warning by the validator, and then never rendered. Three
   authoring attempts failed before the cause was found.

   The asset files exist (delivered by ``US_MOD_SKILL_PROVISION``) but document
   only the four tools and the board convention. This story is about their
   content, not their delivery.

   **Acceptance Criteria:**

   * AC-1: The skill documents the full item property set — which are required,
     which are built in, and what each accepts — so the schema file does not
     have to be opened to author a board.
   * AC-2: The skill documents which field types may be declared in ``fields[]``
     and what each one accepts.
   * AC-3: The skill documents that an undeclared item key is accepted, warned
     about rather than rejected, and never rendered — the trap named in GH #57.
   * AC-4: The skill documents that ``ownerName`` is omitted to address the
     calling actor's own board, and supplied only to address a different
     entity's board.
   * AC-5: The instructions file agrees with the schema on every claim it makes
     about required keys and property names.


.. story:: Named Freeform Text Fields
   :id: US_KAN_TEXTFIELD
   :status: approved
   :priority: required
   :links: US_KAN_BOARD

   **As a** board author,
   **I want** to declare named freeform text fields on a board,
   **so that** I can record per-item prose such as a rationale or a blocker
   under a name that says what it is.

   **Context:**
   Today an item has exactly one freeform string slot: the built-in ``notes``.
   It is generic and unnamed, so a board that wants two kinds of prose, or one
   kind with a meaningful name, has nowhere to put it. Declaring the field as
   ``single_select`` is not a workaround — that type requires an enumerated
   option list, which is the opposite of freeform. GH #57 gap 4.

   **Acceptance Criteria:**

   * AC-1: A board can declare a field of a freeform text type in ``fields[]``,
     alongside existing single-select fields.
   * AC-2: An item may carry any string value under such a field's name; no
     option list is required or consulted.
   * AC-3: Values of declared text fields are visible on the card in the
     rendered board.
   * AC-4: Declaring a text field does not change how existing single-select
     fields validate or render — existing boards behave exactly as before.
   * AC-5: The built-in ``notes`` property continues to work unchanged, so no
     existing board needs editing.
