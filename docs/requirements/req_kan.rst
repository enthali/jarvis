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
     ``type`` (required), plus ``options``. Permitted ``type`` values are
     ``single_select`` and ``text`` (``kanban-skill-content`` CR, GH #57).
     ``options`` is required for ``single_select`` and SHALL be absent for
     ``text`` — see ``REQ_KAN_TEXTFIELD``.
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
   * AC-3a: (``kanban-skill-content`` CR) Values of declared ``text`` fields
     SHALL be rendered on the card, labelled with the field name so they are
     distinguishable from the unnamed built-in ``notes``.
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
     matches a defined status option; item values for ``single_select`` fields
     match that field's defined options. Values for ``text`` fields SHALL NOT
     be option-checked — any string is valid (``kanban-skill-content`` CR).
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
   * AC-8 (``kanban-management-tools`` CR): ``contributes.languageModelTools``
     SHALL declare an entry for every tool registered at runtime, including
     ``jarvis_addKanbanItem``, ``jarvis_deleteKanbanItem``,
     ``jarvis_listKanbanItems`` and ``jarvis_updateKanbanFields``, so VS Code
     surfaces them in the "Configure Tools" picker alongside the existing four.
   * AC-9 (``kanban-management-tools`` CR): A tool's ``registerTool``
     description SHALL stay a single line stating what the tool does. Parameter
     semantics and edge cases SHALL live in the skill asset
     (``REQ_KAN_SKILLCONTENT`` AC-8) and SHALL NOT be duplicated into the tool
     description, so the two cannot drift apart.


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
   * AC-7: (**superseded by the** ``kanban-update-validation`` **CR**) This
     criterion previously froze the tool's validation at "``status`` only,
     exactly as before", which is what kept ``jarvis_updateKanbanItem`` outside
     the shared write contract when that contract was introduced
     (``kanban-management-tools`` finding F-1). It is replaced by AC-8 and AC-9.
     Everything AC-7 froze other than validation — lookup by ``id``, the
     immutable ``id`` (AC-5), and the ``board not found`` / ``item not found`` /
     read / write error paths — remains unchanged.
   * AC-8: (``kanban-update-validation`` CR) The tool SHALL validate the
     complete ``changes`` object against ``REQ_KAN_WRITEVALID`` before applying
     any change, not only its ``status`` key. Values under declared
     ``single_select`` fields SHALL be option-checked, values under ``text``
     fields SHALL be accepted unchecked, and a key naming no declared field
     SHALL be rejected.
   * AC-9: (``kanban-update-validation`` CR) A ``changes`` object containing
     ``id`` SHALL be rejected with an error, superseding the previous behaviour
     of silently ignoring it. Silently dropping a caller's stated intent returns
     success for an operation that did not happen; ``REQ_KAN_WRITEVALID`` AC-4
     already required this on every write path, and this tool was the exception.
   * AC-10: (``kanban-update-validation`` CR) Validation SHALL complete before
     the document is mutated, so a rejected update leaves the board file
     byte-identical (``REQ_KAN_WRITEVALID``, ``SPEC_KAN_WRITEVALID`` AC-6).


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


.. req:: Freeform Text Field Type
   :id: REQ_KAN_TEXTFIELD
   :status: approved
   :priority: required
   :links: US_KAN_TEXTFIELD; REQ_KAN_SCHEMA

   **Description:**
   A board SHALL be able to declare a field of type ``text`` in ``fields[]``,
   holding an arbitrary string per item. This complements the built-in ``notes``
   property, which remains the single unnamed freeform slot; ``text`` fields are
   named and unbounded in number.

   **Acceptance Criteria:**

   * AC-1: ``fields[].type`` SHALL accept ``text`` in addition to
     ``single_select``.
   * AC-2: A ``text`` field definition SHALL NOT carry ``options``; the schema
     SHALL reject a ``text`` field that declares them, and SHALL reject a
     ``single_select`` field that omits them.
   * AC-3: An item value under a declared ``text`` field name SHALL accept any
     string without option validation.
   * AC-4: A field named ``status`` SHALL be of type ``single_select``; a
     ``text`` status field SHALL be a validation error, since ``status`` drives
     the board's columns and columns are enumerable by definition.
   * AC-5: Boards containing no ``text`` field SHALL validate and render exactly
     as before this change — the addition is backward compatible.
   * AC-6: The built-in ``notes`` item property SHALL remain available and
     unchanged (``REQ_KAN_SCHEMA`` AC-5).


.. req:: Board Write Validation Contract
   :id: REQ_KAN_WRITEVALID
   :status: approved
   :priority: required
   :links: US_KAN_TOOLS; REQ_KAN_SCHEMA; REQ_KAN_VERIFY

   **Description:**
   Every tool that writes item values to a board SHALL apply the same value
   rules that ``jarvis_verifyKanbanSchema`` applies when reading one
   (``REQ_KAN_VERIFY`` AC-3). A write tool that can produce a board its own
   verify tool rejects is not a guard; stating the rule once here keeps the
   write tools from drifting apart.

   **Applicable tools** (``kanban-update-validation`` CR): ``jarvis_addKanbanItem``
   (``REQ_KAN_ADD``), ``jarvis_updateKanbanItem`` (``REQ_KAN_UPDATE`` AC-8),
   and the item-value paths of ``jarvis_updateKanbanFields`` (``REQ_KAN_FIELDS``).
   ``jarvis_deleteKanbanItem`` writes no values and is out of scope.

   When this contract was introduced, ``jarvis_updateKanbanItem`` was excluded
   because ``REQ_KAN_UPDATE`` AC-7 froze its behaviour — recorded as finding F-1
   of ``kanban-management-tools``. That exclusion left the description's "every
   tool that writes" contradicting an approved AC. The ``kanban-update-validation``
   CR removes the exclusion, so the enumeration above and the description now
   agree.

   **Acceptance Criteria:**

   * AC-1: A value written under a declared ``single_select`` field SHALL match
     one of that field's declared options, else the tool SHALL return an error
     naming the offending field and the valid options.
   * AC-2: A value written under a declared ``text`` field SHALL be accepted
     without option checking (``REQ_KAN_TEXTFIELD`` AC-3).
   * AC-3: A key that matches no declared field and is not a built-in item
     property (``id``, ``name``, ``status``, ``labels``, ``notes``) SHALL be
     rejected with an error naming the declared field names. Accepting it would
     write a value that the renderer never displays and the verifier reports
     only as a warning — the silent-failure trap of GH #57, which a write tool
     is positioned to prevent at the source.
   * AC-4: ``id`` SHALL NOT be settable by a caller on any write path. On the
     update path this means rejection, not silent omission
     (``REQ_KAN_UPDATE`` AC-9).
   * AC-5: Error results SHALL use the established shape ``{ error: <string> }``
     (``REQ_KAN_UPDATE`` AC-4).
   * AC-6: (``kanban-update-validation`` CR) Every tool named in "Applicable
     tools" SHALL reach these rules through the one shared helper
     (``SPEC_KAN_WRITEVALID``), not through its own copy. A second
     implementation would be free to diverge without failing any AC of its own.


.. req:: jarvis_addKanbanItem Tool
   :id: REQ_KAN_ADD
   :status: approved
   :priority: required
   :links: US_KAN_TOOLS; REQ_KAN_SCHEMA; REQ_KAN_WRITEVALID; REQ_ACT_WHOAMI

   **Description:**
   An LM+MCP tool ``jarvis_addKanbanItem`` SHALL append a new item to a kanban
   board, assigning its ``id`` automatically.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept ``name`` (required string) and optional
     ``status``, ``labels``, ``notes``, further declared-field values, plus
     optional ``boardName`` and ``ownerName``.
   * AC-2: Owner and board resolution SHALL follow the uniform pattern
     (``REQ_KAN_CREATE`` AC-3/AC-4; board not found → ``{ error: "board not
     found" }``).
   * AC-3: The new item's ``id`` SHALL be taken from the board's ``nextId``,
     and ``nextId`` SHALL be incremented by one in the same write. When
     ``nextId`` is absent, it SHALL be derived as ``max(existing ids) + 1``
     (or ``1`` on an empty board) per ``REQ_KAN_SCHEMA`` AC-7, and written.
   * AC-4: A caller-supplied ``id`` SHALL be rejected
     (``REQ_KAN_WRITEVALID`` AC-4) — ids are assigned, never chosen.
   * AC-5: When ``status`` is omitted, it SHALL default to the first declared
     option of the ``status`` field.
   * AC-6: All provided values SHALL be validated per ``REQ_KAN_WRITEVALID``.
   * AC-7: On success the tool SHALL return ``{ path, added: true, itemId }``.
   * AC-8: The write SHALL preserve unrelated file content per
     ``REQ_KAN_SCHEMA`` AC-9.


.. req:: jarvis_deleteKanbanItem Tool
   :id: REQ_KAN_DELETE
   :status: approved
   :priority: required
   :links: US_KAN_TOOLS; REQ_KAN_SCHEMA; REQ_ACT_WHOAMI

   **Description:**
   An LM+MCP tool ``jarvis_deleteKanbanItem`` SHALL remove a single item from a
   board, identified by its integer ``id``.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept ``itemId`` (required integer) plus optional
     ``boardName`` and ``ownerName``.
   * AC-2: Owner and board resolution SHALL follow the uniform pattern.
   * AC-3: When no item carries that ``id``, the tool SHALL return
     ``{ error: "item not found", itemId }`` and write nothing.
   * AC-4: ``nextId`` SHALL NOT be decremented, and the freed ``id`` SHALL NOT
     be reused (``REQ_KAN_SCHEMA`` AC-8). Remaining items SHALL NOT be
     renumbered.
   * AC-5: On success the tool SHALL return ``{ path, deleted: true, itemId }``.
   * AC-6: The write SHALL preserve unrelated file content per
     ``REQ_KAN_SCHEMA`` AC-9.


.. req:: jarvis_listKanbanItems Tool
   :id: REQ_KAN_LIST
   :status: approved
   :priority: required
   :links: US_KAN_QUERY; REQ_ACT_WHOAMI

   **Description:**
   An LM+MCP tool ``jarvis_listKanbanItems`` SHALL return a filtered, compact
   projection of a board's items. It is a read-only tool.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept optional ``status`` and ``labels`` filters,
     plus optional ``boardName`` and ``ownerName``.
   * AC-2: When both filters are given they SHALL be AND-combined. An item
     matches the ``labels`` filter when it carries **every** requested label.
   * AC-3: When no filter is given, all items SHALL be returned — still as the
     compact projection.
   * AC-4: Each returned item SHALL carry exactly ``id``, ``name``, ``status``
     and ``labels`` (``US_KAN_QUERY`` AC-2). Notes and declared-field values
     SHALL be omitted; a caller needing them reads the item by ``id``.
   * AC-5: A filter matching no item SHALL return an empty list, not an error
     (``US_KAN_QUERY`` AC-5).
   * AC-6: A ``status`` filter value matching no declared option SHALL return
     an error naming the valid options, rather than an empty list — an empty
     list is indistinguishable from "no items in that state" and would hide
     the typo.
   * AC-7: The tool SHALL NOT modify the board file.
   * AC-8: On success the tool SHALL return
     ``{ path, count, items: [...] }``.


.. req:: jarvis_updateKanbanFields Tool
   :id: REQ_KAN_FIELDS
   :status: approved
   :priority: required
   :links: US_KAN_TOOLS; REQ_KAN_SCHEMA; REQ_KAN_TEXTFIELD; REQ_ACT_WHOAMI

   **Description:**
   An LM+MCP tool ``jarvis_updateKanbanFields`` SHALL evolve a board's field
   definitions: adding or removing a field, and adding or removing an option on
   an existing ``single_select`` field.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept an operation selector covering exactly four
     actions — ``addField``, ``removeField``, ``addOption``, ``removeOption`` —
     plus the operands each needs, and optional ``boardName``/``ownerName``.
   * AC-2: ``addField`` SHALL accept a field ``name`` and ``type``; for
     ``single_select`` an initial ``options`` list SHALL be required, and for
     ``text`` options SHALL be rejected (``REQ_KAN_SCHEMA`` AC-2).
   * AC-3: ``addField`` SHALL reject a name that already exists, and SHALL
     reject the name ``status`` (exactly one status field exists and it is
     created with the board).
   * AC-4: ``removeField`` SHALL be refused when any item still carries a value
     under that field, returning an error naming the referencing item ids.
   * AC-5: ``removeField`` SHALL refuse to remove the ``status`` field outright
     — a board without it has no columns (``REQ_KAN_SCHEMA`` AC-3).
   * AC-6: ``addOption`` SHALL be refused when the option name already exists on
     that field, and when the target field is of type ``text``
     (``REQ_KAN_TEXTFIELD`` AC-2).
   * AC-7: ``removeOption`` SHALL be refused when any item still holds that
     value, returning an error naming the referencing item ids.
   * AC-8: ``removeOption`` SHALL be refused when it would leave a
     ``single_select`` field with no options (schema ``minItems: 1``).
   * AC-9: On success the tool SHALL return
     ``{ path, updated: true, operation }``.
   * AC-10: The write SHALL preserve unrelated file content per
     ``REQ_KAN_SCHEMA`` AC-9.
   * AC-11: Renaming a field or an option is **not** provided. With AC-4/AC-7 in
     force, a rename of an in-use field or option cannot be expressed as
     remove-then-add, so it remains reachable only by hand-editing the YAML.
     This is a known limitation of this requirement, not an oversight —
     see the ``USER REVIEW REQUIRED`` entry in the
     ``kanban-management-tools`` Change Document.


.. req:: Kanban Skill Asset Content
   :id: REQ_KAN_SKILLCONTENT
   :status: approved
   :priority: required
   :links: US_KAN_SKILL; REQ_KAN_SCHEMA; REQ_MOD_SKILL_PROVISION

   **Description:**
   The skill asset ``packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md``
   SHALL document the board ontology, the tool workflow, and the known authoring
   traps, to the depth required for an actor to author a valid board without
   opening ``kanban.schema.json``.

   **Acceptance Criteria:**

   * AC-1: The skill SHALL document every item property: ``id``, ``name`` and
     ``status`` as required; ``labels`` and ``notes`` as built-in optional; and
     values keyed by declared field names.
   * AC-2: The skill SHALL document both field types (``single_select``,
     ``text``), including that ``options`` is required for the former and
     forbidden for the latter.
   * AC-3: The skill SHALL document that an item key matching no declared field
     is accepted by the schema, reported as a **warning** rather than an error by
     ``jarvis_verifyKanbanSchema``, and never rendered — naming this explicitly
     as a silent-failure trap (GH #57).
   * AC-4: The skill SHALL document the owner-resolution convention as
     implemented: ``ownerName`` omitted addresses the calling actor's own board;
     ``ownerName`` supplied addresses another entity's board and returns
     ``{ error: "actor unknown" }`` if the name matches no scanned entity.
   * AC-5: The skill SHALL state that ``status`` is a mandatory single-select
     field whose options define the board's columns.
   * AC-6: The skill SHALL include a complete, schema-valid example board
     exercising both field types.
   * AC-7: Every factual claim in the skill SHALL agree with
     ``schemas/kanban.schema.json`` as amended by ``REQ_KAN_TEXTFIELD``.
   * AC-8 (``kanban-management-tools`` CR): The Tools table SHALL list every
     kanban tool the module registers, and the Workflow section SHALL show
     where each fits. When a tool is added to the module, this asset is the
     place its usage detail is written — the ``registerTool`` description stays
     one line (``REQ_KAN_MODULE`` AC-9).
   * AC-9 (``kanban-management-tools`` CR): The skill SHALL document that item
     ``id`` is assigned by ``jarvis_addKanbanItem`` and never supplied by the
     caller, and that a deleted id is never reused
     (``REQ_KAN_ADD`` AC-4, ``REQ_KAN_DELETE`` AC-4).
   * AC-10 (``kanban-management-tools`` CR): The skill SHALL state that
     ``jarvis_listKanbanItems`` returns a compact projection and that full item
     contents require reading the item by ``id`` — so an actor does not read the
     projection as the whole item (``REQ_KAN_LIST`` AC-4).


.. req:: Kanban Instructions Asset Content
   :id: REQ_KAN_INSTRUCTIONS
   :status: approved
   :priority: required
   :links: US_KAN_SKILL; REQ_KAN_SCHEMA

   **Description:**
   The instructions asset
   ``packages/kanban/assets/instructions/jarvis-kanban.yaml.instructions.md``
   applies whenever a board YAML file is edited directly. It SHALL state the
   invariants that hand editing can violate, and nothing that contradicts the
   schema.

   **Acceptance Criteria:**

   * AC-1: Every claim about required keys SHALL match the schema: ``title``,
     ``fields`` and ``items`` are required at board level; ``nextId`` is
     optional (``REQ_KAN_SCHEMA`` AC-7).
   * AC-2: Item properties SHALL be named as the schema names them — the
     required title-like property is ``name``, not ``title``.
   * AC-3: The instructions SHALL state that ``id`` is immutable and never
     reused (``REQ_KAN_SCHEMA`` AC-8).
   * AC-4: The instructions SHALL state that ``single_select`` values must match
     that field's declared options, while ``text`` field values are unconstrained.
   * AC-5: The instructions SHALL direct the author to
     ``jarvis_verifyKanbanSchema`` after manual edits, and SHALL note that a run
     reporting no errors can still emit warnings that matter
     (``REQ_KAN_SKILLCONTENT`` AC-3).
   * AC-6: The ``applyTo`` glob SHALL match both board filename conventions —
     ``kanban.yaml`` and ``*.kanban.yaml`` (``REQ_KAN_DISCOVER`` AC-1, AC-2).
