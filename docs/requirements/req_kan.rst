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
     a hand-authored, git-tracked artifact. Comments carry meaning to the author
     but have no schema representation, so they are first-class file content.
     **Every** write path that modifies an *existing* board file SHALL preserve its
     comments and the parsed values of untouched items: both change only where the
     operation semantically changed them. Formatting is not promised: line folding
     and line endings may change on a rewrite. This binds all current and future
     writers (``REQ_KAN_UPDATE`` today; Phase 2 write-back and any later editing
     surface), not only the write path where the defect was first observed.

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
   :links: US_KAN_DISCOVER; REQ_ENG_ACTORLIST

   **Description:**
   Kanban boards SHALL be discovered by convention: a board file in an Actor's
   folder makes that Actor own the board. No explicit path setting is
   required.

   **Acceptance Criteria:**

   * AC-1: ``kanban.yaml`` in an Actor's folder SHALL be recognized as the
     default board for that Actor.
   * AC-2: ``<name>.kanban.yaml`` in an Actor's folder SHALL be recognized as
     a named board.
   * AC-3: Discovery SHALL scan the folders of all Actors
     (``REQ_ENG_ACTORLIST``) for matching filenames.
   * AC-4: Discovery SHALL update when the Actors are rescanned (e.g. after
     Actor creation) and when board files are created or deleted.


.. req:: Kanban Board UX Entry Points
   :id: REQ_KAN_UX
   :status: draft
   :priority: required
   :links: US_KAN_DISCOVER; US_KAN_BOARD

   **Description:**
   The extension SHALL provide two entry points for opening a kanban board:
   the board file in the Actor's "Files" category (``REQ_KAN_FILEOPEN``) and a
   command palette entry. There is no inline board button on Actor nodes.

   **Acceptance Criteria:**

   * AC-4: A ``Jarvis: Open Kanban Board`` command SHALL be available in the
     Command Palette.
   * AC-5: The command SHALL present a Quick Pick of known board owners, then
     (if the selected owner has multiple boards) a second Quick Pick of
     boards.
   * AC-6: A context menu entry "Add Kanban Board" SHALL appear on Actor
     nodes (``contextValue`` ``jarvisActor``). Selecting it SHALL create a
     board in the right-clicked Actor's folder directly, skipping the owner
     Quick Pick.


.. req:: jarvis_createKanbanBoard Tool
   :id: REQ_KAN_CREATE
   :status: draft
   :priority: required
   :links: US_KAN_TOOLS; REQ_ACTOR_WHOAMI

   **Description:**
   An LM+MCP tool ``jarvis_createKanbanBoard`` SHALL create a new kanban
   board YAML file with a valid skeleton.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept optional ``boardName`` and required
     ``ownerName`` parameters.
   * AC-2: When ``boardName`` is omitted or empty, the file SHALL be named
     ``kanban.yaml``. When provided, ``<boardName>.kanban.yaml``.
   * AC-3: ``ownerName`` SHALL be marked required in the tool's input
     schema. The calling Actor passes its own name, which it knows from its
     agent (``REQ_ACTOR_WHOAMI`` AC-3); another Actor's name addresses that
     Actor's board. A call without ``ownerName``, or with an empty one, SHALL
     return ``{ error: "ownerName required" }``.
   * AC-4: The tool SHALL resolve ``ownerName`` against the discovered
     Actors; it resolves only when exactly one Actor carries that name
     (``REQ_ACTOR_SCHEMA`` AC-7).
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
   :links: US_KAN_TOOLS; REQ_KAN_SCHEMA; REQ_ACTOR_WHOAMI

   **Description:**
   An LM+MCP tool ``jarvis_verifyKanbanSchema`` SHALL read a board YAML file,
   validate it against the schema, and return structured findings.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept optional ``boardName`` and required
     ``ownerName`` parameters (same resolution as ``REQ_KAN_CREATE``).
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
   :links: US_KAN_TOOLS; REQ_KAN_RENDERER; REQ_ACTOR_WHOAMI

   **Description:**
   An LM+MCP tool ``jarvis_openKanbanBoard`` SHALL open a kanban board in
   the webview renderer.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept optional ``boardName`` and required
     ``ownerName`` parameters (same resolution as ``REQ_KAN_CREATE``).
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
   :links: US_KAN_TOOLS; REQ_KAN_SCHEMA; REQ_ACTOR_WHOAMI

   **Description:**
   An LM+MCP tool ``jarvis_updateKanbanItem`` SHALL update a single item on
   a kanban board, identified by its integer ``id``.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept ``itemId`` (required integer) and ``changes``
     (partial item object — any field except ``id``), plus optional
     ``boardName`` and required ``ownerName``.
   * AC-2: The tool SHALL find the item by ``id`` and merge ``changes`` into
     it.
   * AC-3: Owner resolution SHALL follow the uniform pattern
     (``REQ_KAN_CREATE`` AC-3/AC-4).
   * AC-4: On success, the tool SHALL return ``{ path, updated: true, itemId }``.
     On item-not-found → ``{ error: "item not found", itemId }``.
     On unknown owner → ``{ error: "actor unknown" }``.
   * AC-5: Item IDs SHALL never be reassigned or reused — the ``id`` field
     is immutable.
   * AC-6: (**kanban-yaml-comment-preservation CR, GH #53**) The tool SHALL
     preserve the comments of the board file (header, standalone, and inline) and
     the parsed values of untouched items, per ``REQ_KAN_SCHEMA`` AC-9. Byte
     identity and line endings are not promised. An update that changes one field
     SHALL change only that field's parsed value.
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
   * AC-11: (``kanban-tool-validation`` CR) The tool's published input schema
     SHALL let a caller supply ``labels`` in ``changes`` as an array of strings
     and every other key as a string. A schema that types every value as a string
     makes the valid ``labels`` value impossible to send through the tool.


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
   * AC-3: Behavior SHALL be uniform with other kanban entry points (command
     palette, tools).


.. req:: Kanban Board Refresh Action
   :id: REQ_KAN_REFRESH
   :status: implemented
   :priority: required
   :links: US_KAN_BOARD; REQ_KAN_FILEOPEN; REQ_KAN_RENDERER

   **Description:**
   The kanban custom editor (``REQ_KAN_FILEOPEN``) SHALL offer a Refresh action
   that re-reads the board file and re-renders the board at once. The board
   follows its file through change events (``SPEC_KAN_RENDERER`` AC-4); a tab
   that has missed an update could until now only be closed and opened again
   (GH #55).

   **Acceptance Criteria:**

   * AC-1: While a kanban custom editor is the active editor, its editor title bar
     SHALL show a Refresh action next to "Open as Text"
     (``REQ_KAN_FILEOPEN`` AC-2). No other editor SHALL show it, so that the
     action is never offered where it has no board to act on.
   * AC-2: Invoking Refresh SHALL re-read the board file from disk and render its
     current contents, whether or not a change event for the file was seen.
   * AC-3: Refresh SHALL NOT write to the board file.
   * AC-4: Refresh SHALL keep the view state of the tab: the text filter, the lane
     selection and the collapsed lanes (``REQ_KAN_LANES`` AC-8). It is a new
     reading of the file, not a new tab.
   * AC-5: Refresh SHALL act on the board file of the editor it is invoked from
     and on no other open board.
   * AC-6: When the file cannot be parsed, Refresh SHALL show the same parse error
     as any other update of the board does.


.. req:: Kanban Swimlanes
   :id: REQ_KAN_LANES
   :status: implemented
   :priority: required
   :links: US_KAN_LANES; REQ_KAN_RENDERER

   **Description:**
   The board renderer SHALL offer a selector that groups the cards into
   horizontal lanes crossing the status columns, by a declared single-select field
   or by label. Lanes are a read-only view of the board: choosing one changes
   what the tab shows and nothing else (``REQ_KAN_RENDERER`` AC-5). The
   requirement applies to every webview that renders a board, whether opened as a
   custom editor or from a command or tool.

   **Acceptance Criteria:**

   * AC-1: The board header SHALL carry a lane selector offering ``None``, every
     declared ``single_select`` field other than ``status`` in declared order, and
     ``Labels``. ``status`` is left out because its options already are the
     columns. A board without another ``single_select`` field offers ``None``
     and ``Labels``.
   * AC-2: The initial selection SHALL be ``None``, and with ``None`` the board
     SHALL render as ``REQ_KAN_RENDERER`` AC-1 and AC-2 specify.
   * AC-3: With a field selected, there SHALL be one lane for each declared option
     of that field, in declared order, and a card SHALL be placed in the lane of
     its value. A card with no value, or with a value that is not a declared
     option, SHALL be placed in a lane named ``Uncategorized`` after the option
     lanes, so that no card disappears: the board file is edited by hand and
     such values occur (``jarvis_verifyKanbanSchema`` reports them).
   * AC-4: With ``Labels`` selected, there SHALL be one lane for each label that a
     shown card carries, ordered by name by Unicode code point
     (``REQ_KAN_FILTERVALUES`` AC-4), and a card SHALL appear in the lane of every
     label it carries. A card without a label (entries that are not text do not
     count as labels) SHALL be placed in a lane named ``Unlabelled`` after the
     label lanes.
   * AC-5: Every lane SHALL show its name and the number of cards it shows, and
     SHALL show the cards of each status column in a cell under that column, drawn
     as the cards of ``REQ_KAN_RENDERER`` AC-3 and AC-3a. A lane SHALL be
     collapsible; a collapsed lane shows its header only.
   * AC-6: The status column headers SHALL be shown once above all lanes, each with
     the number of distinct cards the column holds. A card that appears in several
     lanes SHALL count once, because the sum over the lanes would report three
     cards for a column that holds one.
   * AC-7: The lanes of the options of a selected field SHALL always be shown, also
     when empty, because the declared options are the structure of that field. A
     label lane, ``Uncategorized`` and ``Unlabelled`` SHALL be shown only while at
     least one card the text filter lets through belongs to it. The text filter
     (``REQ_KAN_RENDERER`` AC-4) applies first, then the cards are placed in lanes.
   * AC-8: The selection and the collapsed lanes SHALL be kept in the open tab only:
     they SHALL survive a refresh and every update of the board from its file, and
     SHALL be gone when the board is opened again. They SHALL NOT be written to the
     board file or to any other storage. When a re-read board no longer declares the
     selected field, the selection SHALL fall back to ``None``.
   * AC-9: Choosing, collapsing or expanding a lane SHALL NOT write to the board
     file.


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
   * AC-7: (``kanban-tool-validation`` CR) A ``labels`` value written by an
     applicable tool SHALL be an array of strings, else the tool SHALL return an
     error naming ``labels`` and the expected shape and write nothing. The board
     schema already requires this shape (``kanban.schema.json``); checking it at
     the write stops a board that verify rejects from being produced.


.. req:: jarvis_addKanbanItem Tool
   :id: REQ_KAN_ADD
   :status: approved
   :priority: required
   :links: US_KAN_TOOLS; REQ_KAN_SCHEMA; REQ_KAN_WRITEVALID; REQ_ACTOR_WHOAMI

   **Description:**
   An LM+MCP tool ``jarvis_addKanbanItem`` SHALL append a new item to a kanban
   board, assigning its ``id`` automatically.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept ``name`` (required string) and optional
     ``status``, ``labels``, ``notes``, plus optional ``boardName`` and required
     ``ownerName``. Declared-field values SHALL be passed under ``fields``, an
     object that maps each declared field name to a string. They are not accepted
     as top-level keys.
   * AC-2: Owner and board resolution SHALL follow the uniform pattern
     (``REQ_KAN_CREATE`` AC-3/AC-4; board not found → ``{ error: "board not
     found" }``).
   * AC-3: The new item's ``id`` SHALL be taken from the board's ``nextId``,
     and ``nextId`` SHALL be incremented by one in the same write. When
     ``nextId`` is absent, it SHALL be derived as ``max(existing ids) + 1``
     (or ``1`` on an empty board) per ``REQ_KAN_SCHEMA`` AC-7, and written.
   * AC-4: A caller-supplied ``id`` SHALL be rejected
     (``REQ_KAN_WRITEVALID`` AC-4) — ids are assigned, never chosen. The error
     SHALL say that ids are auto-assigned, whether ``id`` arrives as a top-level
     parameter or inside ``fields``; it SHALL NOT direct the caller to supply
     ``id`` as a top-level parameter (``kanban-tool-validation`` CR).
   * AC-5: When ``status`` is omitted, it SHALL default to the first declared
     option of the ``status`` field.
   * AC-6: All provided values SHALL be validated per ``REQ_KAN_WRITEVALID``.
   * AC-7: On success the tool SHALL return ``{ path, added: true, itemId }``.
   * AC-8: The write SHALL preserve unrelated file content per
     ``REQ_KAN_SCHEMA`` AC-9.


.. req:: jarvis_deleteKanbanItem Tool
   :id: REQ_KAN_DELETE
   :status: implemented
   :priority: required
   :links: US_KAN_TOOLS; REQ_KAN_SCHEMA; REQ_ACTOR_WHOAMI

   **Description:**
   An LM+MCP tool ``jarvis_deleteKanbanItem`` SHALL remove a single item from a
   board, identified by its integer ``id``.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept ``itemId`` (required integer) plus optional
     ``boardName`` and required ``ownerName``.
   * AC-2: Owner and board resolution SHALL follow the uniform pattern.
   * AC-3: When no item carries that ``id``, the tool SHALL return
     ``{ error: "item not found", itemId }`` and write nothing.
   * AC-4: ``nextId`` SHALL NOT be decremented, and the freed ``id`` SHALL NOT
     be reused (``REQ_KAN_SCHEMA`` AC-8). Remaining items SHALL NOT be
     renumbered.
   * AC-5: On success the tool SHALL return ``{ path, deleted: true, itemId }``.
   * AC-6: The write SHALL preserve unrelated file content per
     ``REQ_KAN_SCHEMA`` AC-9.
   * AC-7: The write SHALL keep the parsed values of every untouched item
     unchanged. Byte identity of the file is not promised for arbitrary YAML.


.. req:: jarvis_listKanbanItems Tool
   :id: REQ_KAN_LIST
   :status: implemented
   :priority: required
   :links: US_KAN_QUERY; REQ_ACTOR_WHOAMI

   **Description:**
   An LM+MCP tool ``jarvis_listKanbanItems`` SHALL return a filtered, compact
   projection of a board's items and, when asked, the full contents of the
   matching items. It is a read-only tool.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept optional ``status`` and ``labels`` filters, an
     optional ``fields`` filter (AC-12), plus optional ``boardName``, optional
     ``details`` (AC-9) and required ``ownerName``.
   * AC-2: When several filters are given they SHALL be AND-combined. An item
     matches the ``labels`` filter when it carries **every** requested label.
   * AC-3: When no filter is given, all items SHALL be returned — still as the
     compact projection, unless ``details`` is requested (AC-9).
   * AC-4: Unless ``details`` is requested (AC-9), each returned item SHALL carry
     exactly ``id``, ``name``, ``status`` and ``labels`` (``US_KAN_QUERY`` AC-2).
     Notes and declared-field values SHALL be omitted; a caller needing them
     requests ``details`` (AC-9).
   * AC-5: A filter matching no item SHALL return an empty list, not an error
     (``US_KAN_QUERY`` AC-5).
   * AC-6: A ``status`` filter value matching no declared option SHALL return
     an error naming the valid options, rather than an empty list — an empty
     list is indistinguishable from "no items in that state" and would hide
     the typo.
   * AC-7: The tool SHALL NOT modify the board file.
   * AC-8: On success the tool SHALL return
     ``{ path, count, items: [...] }``.
   * AC-9: The tool SHALL accept an optional boolean ``details``. Only ``true``
     requests the full contents; absent or ``false`` leaves the compact
     projection of AC-4. Any other value, ``null`` included, SHALL return the error
     ``{ error: "details must be true or false" }`` and no items, as AC-6 does for
     ``status``. With ``details: true`` each returned item SHALL carry
     ``id``, ``name``, ``status`` and ``labels`` (an empty list when the card has
     none) and every other field the card has, notes and declared-field values
     included (``US_KAN_QUERY`` AC-6).
   * AC-10: ``details`` SHALL change only what each item carries: which items
     match, ``count`` and the response shape of AC-8 are the same with and
     without it, and the filters of AC-2 and AC-6 behave the same.
   * AC-11: (``kanban-tool-validation`` CR) ``labels`` of a returned item, in both
     shapes, SHALL hold only the string entries of the card's ``labels`` list;
     entries that are not strings SHALL be omitted without an error. The labels
     returned for a card are the labels ``jarvis_listKanbanFilterValues`` counts
     for it, so every label a result shows can be used as a filter.
   * AC-12: (``kanban-swimlanes-and-filters`` CR) ``fields`` SHALL be an object
     whose keys are declared field names and whose values are strings, and an
     item SHALL match only when it matches every entry. The key ``status`` is not
     accepted here because ``status`` has its own filter. A ``fields`` value that
     is not such an object, a key that is not the name of a declared
     ``single_select`` or ``text`` field other than ``status``, and a value that is
     not a string SHALL return an error that names the offending key and lists the
     fields the filter accepts, rather than an empty list, for the reason of AC-6.
   * AC-13: (``kanban-swimlanes-and-filters`` CR) For a ``single_select`` field, an
     item SHALL match when its value equals the requested string exactly, case and
     spaces significant. A requested string that is not a declared option SHALL
     return an error naming the valid options, as AC-6 does for ``status``.
   * AC-14: (``kanban-swimlanes-and-filters`` CR) For a ``text`` field, an item
     SHALL match when its value contains the requested string, ignoring case. An
     item without a value for the field does not match. An empty requested string
     SHALL return an error, because it would match every card that has the field and
     tell the caller nothing. A text value is free text that
     ``jarvis_listKanbanFilterValues`` cannot enumerate, so a caller can only match
     part of it.


.. req:: jarvis_listKanbanFilterValues Tool
   :id: REQ_KAN_FILTERVALUES
   :status: implemented
   :priority: required
   :links: US_KAN_QUERY; REQ_ACTOR_WHOAMI

   **Description:**
   An LM+MCP tool ``jarvis_listKanbanFilterValues`` SHALL return the values a
   caller can use as filters of ``jarvis_listKanbanItems``, with the number of
   cards for each, and no card content. It is a read-only tool.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept an optional ``boardName`` and a required
     ``ownerName``, resolved as for ``jarvis_listKanbanItems`` (``REQ_KAN_LIST``
     AC-1).
   * AC-2: On success the tool SHALL return
     ``{ path, statuses: [{ name, count }], fields: [{ name, options: [{ name, count }] }], labels: [{ name, count }] }``.
   * AC-3: ``statuses`` SHALL hold every option declared for the board's
     ``status`` field, in the declared order, including options no card has
     (``count: 0``); ``count`` is the number of cards with that status. A board
     without a ``status`` field SHALL return an error, since it has no status values
     to list.
   * AC-4: ``labels`` SHALL hold every label carried by at least one card, once,
     with the number of cards that carry it. A label no card carries does not
     appear, because labels are not declared on the board.
   * AC-5: Each name SHALL be written as the filters of ``jarvis_listKanbanItems``
     accept it (``REQ_KAN_LIST`` AC-2, AC-6, AC-12, AC-13), so a value copied from the
     result matches.
   * AC-6: The result SHALL carry no card content (no ``id``, ``name``, notes or
     field values); its size scales with the number of distinct status values, field
     options and labels, not with the number of cards (``US_KAN_QUERY`` AC-3, AC-4).
   * AC-7: The tool SHALL NOT modify the board file. A missing board or an
     unknown owner SHALL return the same errors as ``jarvis_listKanbanItems``.
   * AC-8: A card whose ``status`` matches no declared option, and a label entry that
     is not text, SHALL NOT appear in the result and SHALL NOT be counted;
     ``jarvis_verifyKanbanSchema`` reports such values.
   * AC-9: (``kanban-swimlanes-and-filters`` CR) ``fields`` SHALL hold one entry for
     every declared ``single_select`` field other than ``status``, in declared field
     order, and each entry SHALL hold every declared option of that field in declared
     order, including options no card has (``count: 0``); ``count`` is the number of
     cards with that value. A board without such a field SHALL return ``fields: []``.
     ``text`` fields SHALL NOT appear: they have no set of values to list.
   * AC-10: (``kanban-swimlanes-and-filters`` CR) The counts of AC-9 follow AC-8: a
     card whose ``status`` matches no declared option counts for no field option, and a
     value that is not a declared option is neither listed nor counted. Every count of
     the result is then taken over the same set of cards.


.. req:: jarvis_updateKanbanFields Tool
   :id: REQ_KAN_FIELDS
   :status: implemented
   :priority: required
   :links: US_KAN_TOOLS; REQ_KAN_SCHEMA; REQ_KAN_TEXTFIELD; REQ_ACTOR_WHOAMI

   **Description:**
   An LM+MCP tool ``jarvis_updateKanbanFields`` SHALL evolve a board's field
   definitions: adding or removing a field, and adding or removing an option on
   an existing ``single_select`` field.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept an operation selector covering exactly four
     actions — ``addField``, ``removeField``, ``addOption``, ``removeOption`` —
     plus the operands each needs, and optional ``boardName`` and required
     ``ownerName``.
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
   :status: implemented
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
     implemented: ``ownerName`` is always supplied; the calling Actor passes
     its own name to address its own board, and another Actor's name to
     address that Actor's board. A name matching no discovered Actor returns
     ``{ error: "actor unknown" }``.
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
     ``jarvis_listKanbanItems`` returns a compact projection by default and that
     ``details: true`` returns the full contents of the matching items — so an
     actor does not read the projection as the whole item (``REQ_KAN_LIST``
     AC-4, AC-9).
   * AC-11 (``kanban-swimlanes-and-filters`` CR): The skill SHALL state that
     ``jarvis_listKanbanItems`` narrows by declared fields through ``fields`` (a
     ``single_select`` value must be a declared option and matches exactly, a ``text``
     value matches as a case-insensitive part of the text), and that
     ``jarvis_listKanbanFilterValues`` lists the options of the declared
     ``single_select`` fields with their card counts (``REQ_KAN_LIST`` AC-12 to AC-14,
     ``REQ_KAN_FILTERVALUES`` AC-9).


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
