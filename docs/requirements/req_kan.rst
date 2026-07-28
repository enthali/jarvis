Kanban Requirements
====================

.. req:: Kanban Board YAML Schema
   :id: REQ_KAN_SCHEMA
   :status: draft
   :priority: required
   :links: US_KAN_BOARD

   **Description:**
   The kanban board SHALL be defined by a YAML file conforming to a published
   JSON Schema (``schemas/kanban.schema.json``). The schema follows the GitHub
   Projects ontology: ``status`` is an enum-valued single-select field on
   items, not a structural concept.

   **Acceptance Criteria:**

   * AC-1: The schema SHALL define top-level keys ``title`` (required string),
     ``fields`` (required array of field definitions), and ``items`` (required
     array of item objects).
   * AC-2: Each field definition SHALL have ``name`` (required string) and
     ``type`` (required, value ``single_select``), plus ``options`` (required
     array of ``{ name: string, color?: string }``).
   * AC-3: Exactly one field SHALL have ``name: "status"`` — this is the
     column-driving field. The schema SHALL NOT enforce this structurally
     (it is a semantic constraint validated by ``REQ_KAN_VERIFY``).
   * AC-4: Each item SHALL have ``name`` (required string), ``status``
     (required string matching one of the ``status`` field's option names),
     and ``id`` (integer >= 1, unique within the board, auto-assigned).
   * AC-5: Items MAY have additional keys matching other defined field names,
     plus optional ``labels`` (array of strings) and ``notes`` (string).
   * AC-6: The schema SHALL be published as ``schemas/kanban.schema.json``
     and registered via ``contributes.yamlValidation`` in the kanban package's
     ``package.json`` for files matching ``kanban.yaml`` and
     ``*.kanban.yaml``.
   * AC-7: The board MAY have a top-level ``nextId`` counter (integer). Tools
     SHALL use it for auto-incrementing IDs; if absent, derive from
     ``max(existing ids) + 1``.
   * AC-8: Item IDs SHALL never be reassigned or reused after deletion.
   * AC-9: (**kanban-yaml-comment-preservation CR, GH #53**) The board file is
     a hand-authored, git-tracked artifact. Content that carries meaning to the
     author but has no schema representation — comments, key order, and
     per-node formatting style (flow vs. block sequences, string wrapping and
     quoting) — is first-class file content. **Every** write path that modifies
     an *existing* board file SHALL preserve it: the file SHALL change only
     where the operation semantically changed it. This binds all current and
     future writers (``REQ_KAN_UPDATE`` today; Phase 2 write-back and any later
     editing surface), not only the write path where the defect was first
     observed.

     Creating a *new* board file (``REQ_KAN_CREATE``) is out of scope — there
     is no prior authored content to preserve.


.. req:: Kanban Board Renderer
   :id: REQ_KAN_RENDERER
   :status: draft
   :priority: required
   :links: US_KAN_BOARD

   **Description:**
   The extension SHALL render a kanban board as a read-only webview panel,
   visually consistent with the existing Message Flow and Message Log
   webviews.

   **Acceptance Criteria:**

   * AC-1: The renderer SHALL display one column per ``status`` field option,
     in the order defined in the YAML.
   * AC-2: Each item SHALL appear as a card in the column matching its
     ``status`` value.
   * AC-3: Cards SHALL display the item ``name``. Labels, notes, and other
     field values SHALL be shown when present.
   * AC-4: The renderer SHALL support client-side filtering by label and by
     single-select field values (e.g. ``priority:High``).
   * AC-5: The renderer SHALL be read-only — no drag-and-drop, no inline
     editing (Phase 1).
   * AC-6: Column header colors SHALL use the ``color`` property from the
     status field options when specified.
   * AC-7: The renderer SHALL use VS Code theme colors and be visually
     consistent with the existing webviews.


.. req:: Convention-Based Board Discovery
   :id: REQ_KAN_DISCOVER
   :status: draft
   :priority: required
   :links: US_KAN_DISCOVER

   **Description:**
   Kanban boards SHALL be discovered by convention: a board file in an actor's
   or entity's folder makes that node own the board. No explicit path setting
   is required.

   **Acceptance Criteria:**

   * AC-1: ``kanban.yaml`` in an entity's folder SHALL be recognized as the
     default board for that entity.
   * AC-2: ``<name>.kanban.yaml`` in an entity's folder SHALL be recognized as
     a named board.
   * AC-3: Discovery SHALL scan all entity folders known to the scanner
     (sessions, projects, events) for matching filenames.
   * AC-4: Discovery SHALL update when the scanner rescans (e.g. after entity
     creation) and when board files are created or deleted.


.. req:: Kanban Board UX Entry Points
   :id: REQ_KAN_UX
   :status: draft
   :priority: required
   :links: US_KAN_DISCOVER; US_KAN_BOARD

   **Description:**
   The extension SHALL provide two entry points for opening a kanban board:
   a tree button on the owning node and a command palette entry.

   **Acceptance Criteria:**

   * AC-1: A tree inline button SHALL appear on actor/entity nodes that own
     at least one board file.
   * AC-2: Clicking the button when the owner has exactly one board SHALL
     open it directly in the renderer.
   * AC-3: Clicking the button when the owner has multiple boards SHALL
     present a Quick Pick to select which board to open.
   * AC-4: A ``Jarvis: Open Kanban Board`` command SHALL be available in the
     Command Palette.
   * AC-5: The command SHALL present a Quick Pick of known board owners, then
     (if the selected owner has multiple boards) a second Quick Pick of
     boards.
   * AC-6: A context menu entry "Add Kanban Board" SHALL appear on entity root
     nodes (Session/Project/Event). Selecting it SHALL create a board for the
     right-clicked entity directly, skipping the owner Quick Pick.


.. req:: jarvis_createKanbanBoard Tool
   :id: REQ_KAN_CREATE
   :status: draft
   :priority: required
   :links: US_KAN_TOOLS; REQ_ACT_WHOAMI

   **Description:**
   An LM+MCP tool ``jarvis_createKanbanBoard`` SHALL create a new kanban
   board YAML file with a valid skeleton.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept optional ``boardName`` and ``ownerName``
     parameters.
   * AC-2: When ``boardName`` is omitted or empty, the file SHALL be named
     ``kanban.yaml``. When provided, ``<boardName>.kanban.yaml``.
   * AC-3: When ``ownerName`` is omitted, the tool SHALL resolve the calling
     actor via ``jarvis_whoAmI`` (``REQ_ACT_WHOAMI``).
   * AC-4: When ``ownerName`` is provided, the tool SHALL resolve it against
     known actors/entities in the scanner.
   * AC-5: If the owner cannot be resolved, the tool SHALL return
     ``{ error: "actor unknown" }``.
   * AC-6: The tool SHALL write a valid skeleton YAML file conforming to
     ``REQ_KAN_SCHEMA`` and return ``{ path: "<absolutePath>" }``.
   * AC-7: If the file already exists, the tool SHALL return
     ``{ error: "board already exists", path: "<absolutePath>" }`` without
     overwriting.


.. req:: jarvis_verifyKanbanSchema Tool
   :id: REQ_KAN_VERIFY
   :status: draft
   :priority: required
   :links: US_KAN_TOOLS; REQ_KAN_SCHEMA; REQ_ACT_WHOAMI

   **Description:**
   An LM+MCP tool ``jarvis_verifyKanbanSchema`` SHALL read a board YAML file,
   validate it against the schema, and return structured findings.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept optional ``boardName`` and ``ownerName``
     parameters (same resolution as ``REQ_KAN_CREATE``).
   * AC-2: The tool SHALL validate the YAML against
     ``schemas/kanban.schema.json`` (structural validation).
   * AC-3: The tool SHALL additionally validate semantic constraints:
     exactly one field named ``status`` exists; every item's ``status`` value
     matches a defined status option; item field values match defined field
     options.
   * AC-4: The tool SHALL return
     ``{ board: "<path>", errors: [...], warnings: [...] }`` where each
     finding has ``field``, ``message``, and optionally ``item`` context.
   * AC-5: When the board file does not exist, the tool SHALL return
     ``{ error: "board not found" }``.


.. req:: jarvis_openKanbanBoard Tool
   :id: REQ_KAN_OPEN
   :status: draft
   :priority: required
   :links: US_KAN_TOOLS; REQ_KAN_RENDERER; REQ_ACT_WHOAMI

   **Description:**
   An LM+MCP tool ``jarvis_openKanbanBoard`` SHALL open a kanban board in
   the webview renderer.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept optional ``boardName`` and ``ownerName``
     parameters (same resolution as ``REQ_KAN_CREATE``).
   * AC-2: The tool SHALL open the resolved board file in the kanban
     renderer webview.
   * AC-3: When the board file does not exist, the tool SHALL return
     ``{ error: "board not found" }``.


.. req:: Kanban Module Integration
   :id: REQ_KAN_MODULE
   :status: draft
   :priority: required
   :links: US_KAN_BOARD; US_KAN_TOOLS

   **Description:**
   The kanban module SHALL be a standalone package (``packages/kanban/``)
   integrated into the monorepo build, CI, and release pipeline exactly
   like existing add-on modules.

   **Acceptance Criteria:**

   * AC-1: ``packages/kanban/`` SHALL have its own ``tsconfig.json``,
     ``package.json``, ``build.js``, and ``webview-build.js``.
   * AC-2: The ``compile all`` VS Code task SHALL include the kanban package.
   * AC-3: The CI release workflow SHALL package and upload the kanban VSIX.
   * AC-4: The kanban package SHALL declare
     ``extensionDependencies: ["enthali.jarvis-core"]``.
   * AC-5: The kanban package SHALL contribute its tools, commands, and
     ``yamlValidation`` entries in its own ``package.json`` — not in core's.
   * AC-6: When the kanban package is not installed, no kanban-related UI
     or tools SHALL exist (zero-trace, per ``REQ_MOD_ZEROTRACE``).
   * AC-7: A module-level ``README.md`` SHALL describe the package purpose and
     usage.


.. req:: jarvis_updateKanbanItem Tool
   :id: REQ_KAN_UPDATE
   :status: draft
   :priority: required
   :links: US_KAN_TOOLS; REQ_KAN_SCHEMA; REQ_ACT_WHOAMI

   **Description:**
   An LM+MCP tool ``jarvis_updateKanbanItem`` SHALL update a single item on
   a kanban board, identified by its integer ``id``.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept ``itemId`` (required integer) and ``changes``
     (partial item object — any field except ``id``), plus optional
     ``boardName`` and ``ownerName``.
   * AC-2: The tool SHALL find the item by ``id`` and merge ``changes`` into
     it.
   * AC-3: Owner resolution SHALL follow the uniform pattern (``ownerName``
     given → scanner lookup; omitted → ``jarvis_whoAmI``).
   * AC-4: On success, the tool SHALL return ``{ path, updated: true, itemId }``.
     On item-not-found → ``{ error: "item not found", itemId }``.
     On unknown owner → ``{ error: "actor unknown" }``.
   * AC-5: Item IDs SHALL never be reassigned or reused — the ``id`` field
     is immutable.
   * AC-6: (**kanban-yaml-comment-preservation CR, GH #53**) The tool SHALL
     preserve everything in the board file that it did not semantically change,
     per ``REQ_KAN_SCHEMA`` AC-9. Specifically: comments (header, standalone,
     and inline) SHALL survive verbatim, and lines the update did not touch
     SHALL NOT be reformatted. An update that changes one field SHALL produce a
     diff confined to that field.
   * AC-7: Apart from serialization fidelity, behaviour SHALL be unchanged:
     lookup by ``id``, the immutable ``id`` (AC-5), ``status`` validation
     against the ``status`` field's options, and every error path
     (board not found, item not found, invalid status, read/write failure)
     SHALL behave exactly as before.


.. req:: Kanban File Open
   :id: REQ_KAN_FILEOPEN
   :status: draft
   :priority: required
   :links: US_KAN_DISCOVER; US_KAN_BOARD

   **Description:**
   Clicking a kanban YAML file in the Files tree (or any file explorer) SHALL
   open the kanban webview, not the text editor.

   **Acceptance Criteria:**

   * AC-1: Clicking a ``kanban.yaml`` or ``*.kanban.yaml`` file opens the
     kanban webview, not the text editor.
   * AC-2: "Open as Text" SHALL be accessible via the editor title bar
     button when the kanban webview is active. Files tree context menu
     access is deferred to a separate CR.
   * AC-3: Behavior SHALL be uniform with other kanban entry points (tree
     button, command palette, tools).
