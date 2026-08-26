Kanban Design Specifications
=============================

.. spec:: Kanban Board YAML Schema
   :id: SPEC_KAN_SCHEMA
   :status: draft
   :links: REQ_KAN_SCHEMA; REQ_KAN_TEXTFIELD

   **Description:**
   JSON Schema ``schemas/kanban.schema.json`` defining the structure of a
   kanban board YAML file.

   **Schema** (JSON Schema draft-07):

   .. code-block:: json

      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "https://github.com/jarvis/schemas/kanban.schema.json",
        "title": "Jarvis Kanban Board",
        "description": "Schema for kanban.yaml — a Jarvis kanban board definition.",
        "type": "object",
        "required": ["title", "fields", "items"],
        "additionalProperties": false,
        "properties": {
          "title": {
            "type": "string",
            "description": "Display title for the kanban board.",
            "minLength": 1
          },
          "nextId": {
            "type": "integer",
            "description": "Next auto-increment ID for new items.",
            "minimum": 1
          },
          "fields": {
            "type": "array",
            "description": "Field definitions. Exactly one must be named 'status'.",
            "minItems": 1,
            "items": {
              "type": "object",
              "required": ["name", "type"],
              "additionalProperties": false,
              "properties": {
                "name": {
                  "type": "string",
                  "minLength": 1
                },
                "type": {
                  "type": "string",
                  "enum": ["single_select", "text"]
                },
                "options": {
                  "type": "array",
                  "minItems": 1,
                  "items": {
                    "type": "object",
                    "required": ["name"],
                    "additionalProperties": false,
                    "properties": {
                      "name": {
                        "type": "string",
                        "minLength": 1
                      },
                      "color": {
                        "type": "string",
                        "description": "CSS color value for column header or badge."
                      }
                    }
                  }
                }
              },
              "allOf": [
                {
                  "if": {
                    "properties": { "type": { "const": "single_select" } },
                    "required": ["type"]
                  },
                  "then": { "required": ["options"] }
                },
                {
                  "if": {
                    "properties": { "type": { "const": "text" } },
                    "required": ["type"]
                  },
                  "then": { "not": { "required": ["options"] } }
                }
              ]
            }
          },
          "items": {
            "type": "array",
            "description": "Board items (cards).",
            "items": {
              "type": "object",
              "required": ["id", "name", "status"],
              "properties": {
                "id": {
                  "type": "integer",
                  "description": "Unique item identifier. Auto-assigned, never reused.",
                  "minimum": 1
                },
                "name": {
                  "type": "string",
                  "minLength": 1
                },
                "status": {
                  "type": "string",
                  "description": "Must match an option of the 'status' field."
                },
                "labels": {
                  "type": "array",
                  "items": { "type": "string" }
                },
                "notes": {
                  "type": "string"
                }
              },
              "additionalProperties": {
                "type": "string",
                "description": "Values for user-defined single_select or text fields."
              }
            }
          }
        }
      }

   **Item IDs:**

   * Each item has an ``id`` field (integer, >= 1, unique within the board).
   * ``id`` IS in the JSON Schema ``required`` array (alongside ``name`` and
     ``status``). Items without ``id`` are structurally invalid per JSON
     Schema and will fail ``jarvis_verifyKanbanSchema``.
   * The board tracks a top-level ``nextId`` counter (integer). When a new
     item is created, it is assigned ``id = nextId`` and ``nextId`` is
     incremented. IDs are never reassigned or reused after deletion.
   * ``nextId`` is NOT in the JSON Schema ``required`` list — boards without
     it derive the next ID as ``max(existing ids) + 1`` (or ``1`` if empty).

   **Design decisions:**

   * ``additionalProperties`` on items is ``{ "type": "string" }`` — allows
     arbitrary field values without enumerating them in the schema. Semantic
     validation (field name exists, value matches an option) is handled by
     ``SPEC_KAN_VERIFY``.
   * ``status`` is NOT structurally enforced as a required field name in
     ``fields`` — this is a semantic constraint checked by the verify tool.
     This keeps the JSON Schema simple and the YAML easy to author.
   * ``color`` is optional on field options; when absent the renderer picks
     a default from the VS Code theme palette.
   * (``kanban-skill-content`` CR, GH #57) ``options`` is bound to ``type`` by
     an ``if``/``then`` pair rather than left merely optional: required for
     ``single_select``, forbidden for ``text``. Leaving it optional would let a
     ``text`` field carry an option list that nothing reads — accepted, ignored,
     and invisible, which is the same silent-acceptance failure mode GH #57 was
     filed about.
   * (``kanban-skill-content`` CR) The structural schema still cannot express
     "the ``status`` field must be ``single_select``", because it cannot reach
     across array elements to the one named ``status``. That stays a semantic
     check in ``SPEC_KAN_VERIFY``, consistent with how ``status``'s existence is
     already handled.

   **Schema bundling:**

   The authoritative source is ``schemas/kanban.schema.json`` (monorepo root,
   used by docs and tooling). The kanban package MUST also bundle a local copy
   at ``packages/kanban/schemas/kanban.schema.json`` so that:

   * ``package.json`` ``yamlValidation.url`` can use a package-relative path
     (``./schemas/kanban.schema.json``) — required for VSIX packaging.
   * ``loadSchema()`` in the verify tool resolves relative to the extension's
     install path (``context.extensionUri``), not the workspace root.

   A ``prebuild`` step in ``build.js`` copies the root schema into
   ``packages/kanban/schemas/`` to keep the two in sync.

   **Acceptance Criteria:**

   * AC-1: ``schemas/kanban.schema.json`` validates all example boards from
     ``testdata/kanban/``.
   * AC-2: The schema rejects YAML with missing ``title``, ``fields``, or
     ``items``.
   * AC-3: The schema rejects items missing ``id``, ``name``, or ``status``.
   * AC-4: ``packages/kanban/schemas/kanban.schema.json`` exists as a
     package-local copy, kept in sync by ``build.js``.
   * AC-5: ``id`` is validated as integer >= 1.
   * AC-6: (``kanban-skill-content`` CR) ``fields[].type`` accepts ``text``.
   * AC-7: (``kanban-skill-content`` CR) A ``single_select`` field without
     ``options`` is rejected; a ``text`` field with ``options`` is rejected.
   * AC-8: (``kanban-skill-content`` CR) Every board under ``testdata/kanban/``
     that validated before this change still validates — the schema change is
     additive.


.. spec:: Kanban Board Renderer
   :id: SPEC_KAN_RENDERER
   :status: draft
   :links: REQ_KAN_RENDERER; REQ_KAN_TEXTFIELD; SPEC_KAN_SCHEMA

   **Description:**
   A VS Code Webview Panel that renders a kanban board from a parsed YAML
   file. The renderer is a single HTML page with embedded CSS and JS,
   built by ``webview-build.js`` (same pattern as ``packages/flow``).

   **Architecture:**

   * **Extension side** (``src/kanbanPanel.ts``): reads and parses the YAML
     file, posts the board data to the webview via ``webview.postMessage``.
     Watches the file for changes and re-posts on save.
   * **Webview side** (``webview/kanban.ts`` + ``webview/kanban.css``):
     receives board data, renders columns and cards, handles filter UI.

   **Rendering rules:**

   * One column per ``status`` field option, ordered as defined in YAML.
   * Column header shows the option name and item count. Uses ``color`` from
     the option definition (or a VS Code theme default) as header accent.
   * Cards show: ``#id`` prefix (e.g. ``#4 \u00b7 Item title``), ``name``
     (bold), ``labels`` (as colored badges), other field values (as key:
     value pairs), ``notes`` (as smaller text below).   * (``kanban-skill-content`` CR) Values of declared ``text`` fields render as
     labelled ``name: value`` pairs, in the same place as other declared field
     values. They are labelled because, unlike ``notes``, they have a name that
     carries the meaning — an unlabelled ``rationale`` is indistinguishable from
     an unlabelled ``blocker``. Only keys matching a declared field are rendered;
     an undeclared key is still skipped, which is the behaviour GH #57 found
     surprising and which the skill must therefore document
     (``REQ_KAN_SKILLCONTENT`` AC-3).   * Empty columns are shown (with a "No items" placeholder).

   **Filtering:**

   * A filter bar at the top of the webview with placeholder text
     "Filter items...".
   * Filter input is plain text substring matching (no special syntax).
   * Case-insensitive. Empty input shows all items.
   * Match is tested across: ``id`` (matched as ``#N`` or plain ``N``),
     ``name``, all field values (``status``, ``priority``, any user-defined
     field), ``labels`` entries, and ``notes``.
   * Cards not matching are hidden; columns with no visible cards show the
     "No items" placeholder.
   * Filter state is local to the webview instance (not persisted).

   **File watching:**

   * The extension registers a ``vscode.workspace.onDidSaveTextDocument``
     listener scoped to the board file path.
   * On save, re-read and re-parse the YAML, post updated data to webview.

   **Acceptance Criteria:**

   * AC-1: Columns match ``status`` field options in order.
   * AC-2: Cards are placed in the correct column.
   * AC-3: Plain-text substring filter matches across id, name, field values,
     labels, and notes (case-insensitive).
   * AC-4: Any write to the board file triggers a live update of the rendered
     board. Three trigger sources are supported: (1) VS Code editor save
     (``onDidSaveTextDocument``), (2) filesystem watcher
     (``createFileSystemWatcher`` — catches ``fs.writeFile`` from LM tools),
     (3) direct ``refreshKanbanPanel()`` call from ``jarvis_updateKanbanItem``
     after writing.
   * AC-5: Uses VS Code theme colors (dark/light/high-contrast).
   * AC-6: Cards display ``#id`` prefix before the item name.
   * AC-7: ``notes`` text longer than 30 characters SHALL be truncated with
     an ellipsis (``…``) on the card; the full text SHALL be visible in a
     tooltip on hover.
   * AC-7: Notes field is truncated to max 30 characters in card display,
     with "…" appended if longer. Full text shown as native browser tooltip
     (HTML ``title`` attribute). Underlying data is not modified.


.. spec:: Convention-Based Board Discovery
   :id: SPEC_KAN_DISCOVER
   :status: draft
   :links: REQ_KAN_DISCOVER; REQ_KAN_UX

   **Description:**
   Board discovery scans entity folders for ``kanban.yaml`` and
   ``*.kanban.yaml`` files. The results drive a tree-item decorator
   (board button) and the command palette board picker.

   **Discovery mechanism:**

   The kanban module registers a tree-item decorator via
   ``api.registerDecorator`` (``SPEC_ENG_API``) for each entity kind
   (``session``, ``project``, ``event``). The decorator:

   1. For each entity node, checks if the entity's ``folder`` contains
      ``kanban.yaml`` or any ``*.kanban.yaml`` file (synchronous
      ``fs.readdirSync`` with filename filter — entity folders are small).
   2. If at least one board file exists, adds an inline action button
      (``$(kanban)`` or ``$(list-unordered)`` icon) to the tree item's
      ``contextValue``.

   **Board index:**

   The module maintains an in-memory index
   ``Map<string, { owner: string; folder: string; files: string[] }>``
   populated on activation and refreshed when ``api.rescan()`` completes
   (via the ``onDidChangeTreeData`` event on registered kinds).

   **Acceptance Criteria:**

   * AC-1: Decorator button appears on nodes with board files.
   * AC-2: Button disappears when all board files are deleted (after rescan).
   * AC-3: The board index is queryable by the tools and command handler.


.. spec:: Kanban Board UX Entry Points
   :id: SPEC_KAN_UX
   :status: draft
   :links: REQ_KAN_UX; SPEC_KAN_DISCOVER; SPEC_KAN_RENDERER

   **Description:**
   Two entry points for opening kanban boards: a tree inline button and a
   command palette command.

   **Tree inline button:**

   Contributed via the kanban package's ``package.json``
   ``contributes.menus`` keyed to the relevant tree view IDs
   (``jarvisActors``, ``jarvisProjects``, ``jarvisEvents``).
   ``when`` clause: ``viewItem =~ /kanban/`` (set by the decorator in
   ``SPEC_KAN_DISCOVER``).

   Handler (``jarvis.openKanbanBoard`` command):

   * If the clicked node's folder contains exactly one board file → open it
     in the renderer.
   * If multiple board files → present a Quick Pick to select one → open.

   **Command palette — Open:**

   ``Jarvis: Open Kanban Board`` (``jarvis.openKanbanBoard`` without
   arguments):

   * Query the board index for all owners with boards.
   * Present a Quick Pick of owners (with board count).
   * If the selected owner has one board → open. Multiple → second Quick Pick.

   **Command palette — Create:**

   ``Jarvis: Create Kanban Board`` (``jarvis.createKanbanBoard``):

   1. Present a Quick Pick of all known entities (name + kind).
   2. Show an InputBox prompting for a board name (empty → default
      ``kanban.yaml``; ``"sprint"`` → ``sprint.kanban.yaml``). Invalid
      characters (path separators, ``* ? " < > |``) are rejected inline.
   3. Resolve filename via the same normalization as ``SPEC_KAN_CREATE``
      step 2.
   4. If the resolved file already exists → show a warning and abort.
   5. Write skeleton YAML and refresh the board index.

   **Acceptance Criteria:**

   * AC-1: Tree button opens single board directly.
   * AC-2: Tree button shows Quick Pick for multiple boards.
   * AC-3: Command palette lists all board owners.
   * AC-4: Command is contributed from the kanban package's ``package.json``.
   * AC-5: Create command prompts for board name; empty input yields ``kanban.yaml``.
   * AC-6: Create command rejects board names containing path separators or
     OS-reserved characters.
   * AC-7: Right-click context menu on entity root node
     (``viewItem =~ /^jarvis(Session|Project|Event)/``) shows
     "Add Kanban Board" entry (``REQ_KAN_UX AC-6``). Handler: same flow as
     Command Palette create (InputBox for board name → write skeleton), but
     skips the owner Quick Pick — uses the right-clicked entity directly.


.. spec:: jarvis_createKanbanBoard Tool
   :id: SPEC_KAN_CREATE
   :status: draft
   :links: REQ_KAN_CREATE; SPEC_ACT_WHOAMI; SPEC_KAN_SCHEMA

   **Description:**
   Register ``jarvis_createKanbanBoard`` via ``engine.registerTool()`` in the
   kanban package's ``extension.ts``.

   **Input schema:**

   .. code-block:: typescript

      {
        boardName?: string;   // omit or empty → "kanban.yaml"
        ownerName?: string;   // omit → resolve via jarvis_whoAmI
      }

   **Algorithm:**

   1. **Resolve owner:** if ``ownerName`` provided, look up in
      ``api.listJarvisSessions()`` by name. If not found → return
      ``{ error: "actor unknown" }``. If omitted, invoke
      ``jarvis_whoAmI`` via ``api.invokeTool('jarvis_whoAmI', ...)`` to
      get the calling actor's name and folder.
   2. **Resolve filename:** Normalize ``boardName`` before constructing the
      path:

      a. Strip a trailing ``.kanban.yaml`` or ``.yaml`` suffix if present
         (so both ``"sprint"`` and ``"sprint.kanban.yaml"`` resolve
         identically).
      b. If the resulting stem is empty or equals ``"kanban"`` → filename is
         ``kanban.yaml`` (the default board).
      c. Otherwise → filename is ``<stem>.kanban.yaml``.
      d. Omitted or empty ``boardName`` → ``kanban.yaml``.
   3. **Check existence:** if the file already exists → return
      ``{ error: "board already exists", path }``.
   4. **Write skeleton:**

      .. code-block:: yaml

         title: <boardName or "Board">
         nextId: 1
         fields:
           - name: status
             type: single_select
             options:
               - name: Backlog
               - name: In Progress
               - name: Done
           - name: priority
             type: single_select
             options:
               - name: Low
               - name: Medium
               - name: High
         items: []

   5. Return ``{ path: "<absolutePath>" }``.

   **Auto-ID assignment:**
   When items are added (by tools or manually), each item receives
   ``id = nextId`` and ``nextId`` is incremented. If ``nextId`` is absent,
   derive as ``max(existing ids) + 1`` (or ``1`` if empty).

   **Acceptance Criteria:**

   * AC-1: Creates a valid skeleton board YAML.
   * AC-2: Returns error for unknown owner.
   * AC-3: Returns error if file exists (no overwrite).
   * AC-4: Registers with ``toolReferenceName: "createKanbanBoard"``.


.. spec:: jarvis_verifyKanbanSchema Tool
   :id: SPEC_KAN_VERIFY
   :status: draft
   :links: REQ_KAN_VERIFY; REQ_KAN_TEXTFIELD; SPEC_ACT_WHOAMI; SPEC_KAN_SCHEMA

   **Description:**
   Register ``jarvis_verifyKanbanSchema`` via ``engine.registerTool()`` in the
   kanban package's ``extension.ts``.

   **Input schema:**

   .. code-block:: typescript

      {
        boardName?: string;   // same resolution as SPEC_KAN_CREATE
        ownerName?: string;
      }

   **Algorithm:**

   1. Resolve owner and filename (same as ``SPEC_KAN_CREATE`` steps 1–2).
   2. Read and parse the YAML file. If not found → return
      ``{ error: "board not found" }``. If YAML parse fails → return
      structural error.
   3. **Structural validation:** validate against
      ``schemas/kanban.schema.json`` using a JSON Schema validator (e.g.
      ``ajv``). Collect errors.
   4. **Semantic validation** (only if structural validation passes):

      * Exactly one field named ``status`` exists → error if missing or
        duplicated.
      * The ``status`` field is of type ``single_select`` → error if it is
        ``text`` (``REQ_KAN_TEXTFIELD`` AC-4). Its options define the board's
        columns; a non-enumerable status would render a board with none.
      * Every item's ``status`` value matches a defined ``status`` option →
        error for each mismatch.
      * Item keys that are not built-in (``id``, ``name``, ``status``,
        ``labels``, ``notes``) are resolved against the declared field names:

        - no matching field → **warning** "Unknown field ... not defined in
          fields[]". This stays a warning for backward compatibility, but is
          the trap GH #57 reports, so ``REQ_KAN_SKILLCONTENT`` AC-3 requires
          the skill to name it as one.
        - matching field of type ``single_select`` → value must be one of that
          field's options, else error.
        - matching field of type ``text`` → any string accepted, no check.

   5. Return ``{ board: "<path>", errors: [...], warnings: [...] }`` where
      each finding is ``{ field: string, message: string, item?: string }``.

   **Field lookup:**

   The existing ``fieldMap`` (field name → option-name set) is widened to
   field name → ``{ type, options? }``, because an empty option set can no
   longer be distinguished from "this field does not constrain values".

   **Acceptance Criteria:**

   * AC-1: Detects missing ``status`` field.
   * AC-2: Detects item ``status`` values not matching defined options.
   * AC-3: Returns structured findings with field and item context.
   * AC-4: Registers with ``toolReferenceName: "verifyKanbanSchema"``.
   * AC-5: (``kanban-skill-content`` CR) A value under a declared ``text``
     field produces neither error nor warning, whatever the string.
   * AC-6: (``kanban-skill-content`` CR) A ``status`` field declared as
     ``text`` produces an error.
   * AC-7: (``kanban-skill-content`` CR) Existing single-select validation and
     the unknown-field warning are unchanged in wording and severity.


.. spec:: jarvis_openKanbanBoard Tool
   :id: SPEC_KAN_OPEN
   :status: draft
   :links: REQ_KAN_OPEN; SPEC_ACT_WHOAMI; SPEC_KAN_RENDERER

   **Description:**
   Register ``jarvis_openKanbanBoard`` via ``engine.registerTool()`` in the
   kanban package's ``extension.ts``.

   **Input schema:**

   .. code-block:: typescript

      {
        boardName?: string;   // same resolution as SPEC_KAN_CREATE
        ownerName?: string;
      }

   **Algorithm:**

   1. Resolve owner and filename (same as ``SPEC_KAN_CREATE`` steps 1–2).
   2. Check file exists. If not → return ``{ error: "board not found" }``.
   3. Execute the ``jarvis.openKanbanBoard`` command with the resolved file
      path as argument, which opens the renderer webview
      (``SPEC_KAN_RENDERER``).
   4. Return ``{ opened: true, path: "<absolutePath>" }``.

   **Acceptance Criteria:**

   * AC-1: Opens the board in the renderer webview.
   * AC-2: Returns error for missing board file.
   * AC-3: Registers with ``toolReferenceName: "openKanbanBoard"``.


.. spec:: jarvis_updateKanbanItem Tool
   :id: SPEC_KAN_UPDATE
   :status: draft
   :links: REQ_KAN_UPDATE; SPEC_ACT_WHOAMI; SPEC_KAN_SCHEMA

   **Description:**
   Register ``jarvis_updateKanbanItem`` via ``engine.registerTool()`` in the
   kanban package's ``extension.ts``. This is the only write-back tool in
   Phase 1 — it updates a single item identified by its ``id``.

   **Input schema:**

   .. code-block:: typescript

      {
        itemId: number;       // required — item to update
        changes: {            // partial item — any field except id
          name?: string;
          status?: string;
          labels?: string[];
          notes?: string;
          [fieldName: string]: string | string[] | undefined;
        };
        boardName?: string;   // same resolution as SPEC_KAN_CREATE
        ownerName?: string;
      }

   **Algorithm:**

   1. Resolve owner and filename (same as ``SPEC_KAN_CREATE`` steps 1–2).
   2. Read the file and parse it into a **round-trip representation** — one
      that retains comments, key order, and per-node formatting style
      alongside the data (see "Round-trip fidelity" below). If not found →
      return ``{ error: "board not found" }``.
   3. Find the item with ``id === itemId``. If not found → return
      ``{ error: "item not found", itemId }``.
   4. Apply ``changes`` **to the round-trip representation itself**, field by
      field. The ``id`` field is immutable — if present in ``changes``, it is
      silently ignored.
   5. If ``changes.status`` is provided, validate it against the ``status``
      field's options. The options are read from the same round-trip
      representation — the file SHALL NOT be parsed a second time, so
      validation and mutation cannot disagree about the file's content.
      If invalid → return
      ``{ error: "invalid status", value, validOptions }``.
   6. Serialize the round-trip representation back to the file. Untouched
      regions SHALL be byte-identical to what was read.
   7. Return ``{ path, updated: true, itemId }``.

   **Round-trip fidelity (kanban-yaml-comment-preservation CR, GH #53):**

   The board file is a hand-authored, git-tracked artifact
   (``REQ_KAN_SCHEMA`` AC-9). This tool SHALL therefore satisfy:

   * Comments — header, standalone, and inline — survive verbatim.
   * Key order and per-node style (flow vs. block sequences, string wrapping
     and quoting) are preserved for every node the update did not change.
   * The resulting diff is confined to the field(s) actually changed.

   **The load-bearing constraint is *where* mutation happens, not which parse
   function is called.** Comments and style exist only in the round-trip
   representation; a plain JavaScript object has nowhere to store them. So
   deriving a plain object from the parsed file, mutating that, and
   re-serializing it loses everything — *regardless* of which parse function
   produced the document. Any implementation that reads with a round-trip
   parser but writes from a plain-object projection satisfies the letter of
   "use the round-trip API" while still failing every acceptance criterion
   above.

   Reading the representation into a plain object for **read-only** purposes
   (e.g. locating the item, reading the ``status`` options in step 5) is
   unaffected by this constraint.

   The ``yaml`` package's ``Document`` API (``parseDocument`` /
   ``toString()``) provides these properties and is the established means; the
   choice of accessor methods is left to implementation.

   **Scope — read-only paths are deliberately unchanged.**
   ``SPEC_KAN_RENDERER``, ``SPEC_KAN_FILEOPEN``, and ``SPEC_KAN_VERIFY`` only
   read the board and never write it back, so the data-only parse is correct
   there and SHALL NOT be migrated. Round-trip parsing is required only where
   a load → modify → save cycle exists. ``SPEC_KAN_CREATE`` writes a fresh
   file from a template and has no prior content to preserve.

   .. note::
      This constraint is stated at ``REQ_KAN_SCHEMA`` AC-9 as a property of
      the board file, binding **every** writer — not only this tool. Phase 2
      write-back (GH #47) introduces a second write path from drag-and-drop,
      where the same defect would be far more visible: a rewrite on every
      interaction rather than only on explicit tool calls. Recording the rule
      against the file rather than against the tool that first exhibited the
      defect is deliberate.

   **Acceptance Criteria:**

   * AC-1: Updates a single item by ``id``.
   * AC-2: Returns error for unknown item ID.
   * AC-3: Returns error for invalid ``status`` value.
   * AC-4: ``id`` field is immutable — never changed by this tool.
   * AC-5: Registers with ``toolReferenceName: "updateKanbanItem"``.
   * AC-6: A board file containing comments retains all of them, verbatim,
     after an update to an unrelated field (``REQ_KAN_UPDATE`` AC-6).
   * AC-7: An update to one field produces a diff touching only that field —
     no reformatting of untouched lines.


.. spec:: Kanban File Open via Custom Editor
   :id: SPEC_KAN_FILEOPEN
   :status: draft
   :links: REQ_KAN_FILEOPEN; SPEC_KAN_RENDERER; SPEC_KAN_UX

   **Description:**
   Register a VS Code ``CustomReadonlyEditorProvider`` for globs
   ``**/*.kanban.yaml`` and ``**/kanban.yaml``. When the user clicks a kanban
   file in the Files tree (or any file explorer), VS Code routes the open
   through this provider, which renders the kanban webview instead of the
   text editor.

   **Mechanism:**

   1. The kanban package's ``package.json`` contributes
      ``customEditors`` with ``viewType: "jarvis.kanbanEditor"`` and
      ``selector: [{ filenamePattern: "*.kanban.yaml" }, { filenamePattern: "kanban.yaml" }]``,
      ``priority: "default"``.
   2. ``openCustomDocument(uri)`` returns a lightweight document wrapping the
      URI (read-only — no ``saveCustomDocument``).
   3. ``resolveCustomEditor(document, webviewPanel)`` delegates to the same
      renderer logic as ``SPEC_KAN_RENDERER``: parse YAML, post data to
      webview, register file watcher for live updates.
   4. One access point for opening a kanban file as plain text:

      * **Editor title bar:** An "Open as Text" button appears in the
        editor title bar when the kanban webview is active. Invokes
        ``vscode.commands.executeCommand('vscode.openWith', uri, 'default')``.

      .. note::
         Files tree context menu "Open as Text" is deferred to a separate CR;
         it requires a core engine extension to set per-file contextValues
         on entityFile tree nodes (``treeFactory``).

   **Acceptance Criteria:**

   * AC-1: Clicking a ``kanban.yaml`` or ``*.kanban.yaml`` file opens the
     kanban webview, not the text editor.
   * AC-2: "Open as Text" is accessible via the editor title bar button
     when the kanban webview is active. Files tree context menu access
     is out of scope for CR #46 (pending core engine extension).
   * AC-3: "Open as Text" opens the file in the standard text editor.
   * AC-4: Uniform with other kanban entry points (tree button, command
     palette, tools).


.. spec:: Kanban Module Integration
   :id: SPEC_KAN_MODULE
   :status: draft
   :links: REQ_KAN_MODULE; SPEC_MOD_FLOW_PKG; SPEC_REL_PKGCONTRACT

   **Description:**
   ``packages/kanban/`` builds ``enthali.jarvis-kanban`` following the exact
   same integration pattern as ``packages/flow/``.

   **Package structure:**

   ::

      packages/kanban/
      ├── package.json
      ├── tsconfig.json
      ├── build.js
      ├── webview-build.js
      ├── .vscodeignore
      ├── README.md
      ├── resources/
      │   └── jarvis-128.png
      ├── schemas/
      │   └── kanban.schema.json   ← package-local copy
      ├── src/
      │   ├── extension.ts
      │   └── kanbanPanel.ts
      └── webview/
          ├── kanban.ts
          └── kanban.css

   **Integration touchpoints (mirroring ``packages/flow/``):**

   1. **``tsconfig.json``:** ``module: commonjs``, ``target: ES2022``,
      ``outDir: out``, ``rootDir: src``, ``strict: true``. Excludes
      ``node_modules``, ``out``, ``webview``.

   2. **``package.json``:** ``name: jarvis-kanban``,
      ``extensionDependencies: ["enthali.jarvis-core"]``,
      ``main: ./out/extension.js``. Scripts: ``compile``, ``bundle``
      (``node build.js && node webview-build.js``), ``package``,
      ``vscode:prepublish``. Contributes: ``commands``
      (``jarvis.openKanbanBoard``, ``jarvis.createKanbanBoard``),
      ``menus`` (tree inline buttons, ``view/item/context`` for Files node),
      ``yamlValidation``
      (``kanban.yaml`` and ``*.kanban.yaml`` →
      ``./schemas/kanban.schema.json`` — package-relative path, same
      pattern as core's ``session.schema.json``),
      ``languageModelTools`` (four tools: ``jarvis_createKanbanBoard``,
      ``jarvis_verifyKanbanSchema``, ``jarvis_openKanbanBoard``,
      ``jarvis_updateKanbanItem``; extended by the ``kanban-management-tools``
      CR with ``jarvis_addKanbanItem``, ``jarvis_deleteKanbanItem``,
      ``jarvis_listKanbanItems`` and ``jarvis_updateKanbanFields`` —
      ``REQ_KAN_MODULE`` AC-8),
      ``customEditors`` (``jarvis.kanbanEditor`` for
      ``*.kanban.yaml`` / ``kanban.yaml``).

   3. **``build.js``:** esbuild bundler for extension code (same pattern as
      flow's ``build.js``). Additionally, as a prebuild step, copies
      ``schemas/kanban.schema.json`` from the monorepo root into
      ``packages/kanban/schemas/`` to keep the package-local copy in sync.

   4. **``webview-build.js``:** esbuild bundler for webview code (same pattern
      as flow's ``webview-build.js``).

   5. **``.vscode/tasks.json`` — ``compile all``:** add
      ``npx tsc -p packages/kanban`` to the task chain, and
      ``cd packages/kanban && node build.js && node webview-build.js`` for the
      webview build step.

   6. **CI — ``.github/workflows/release.yml``:** add a ``Package
      enthali.jarvis-kanban`` step (``cd packages/kanban && npx vsce package
      --no-dependencies``) and include ``packages/kanban/*.vsix`` in the
      upload artifacts list.

   7. **Root ``package.json``:** no change needed — the monorepo root does not
      enumerate packages.

   8. **Core import:** none — kanban obtains the engine API via
      ``vscode.extensions.getExtension('enthali.jarvis-core').exports``
      (same as PIM, flow).

   **Acceptance Criteria:**

   * AC-1: ``packages/kanban/`` compiles independently via
      ``npx tsc -p packages/kanban``.
   * AC-2: ``compile all`` task includes kanban.
   * AC-3: CI release workflow packages and uploads kanban VSIX.
   * AC-4: Manifest declares ``extensionDependencies: ["enthali.jarvis-core"]``.
   * AC-5: Zero-trace: when kanban is not installed, no kanban UI, tools,
      or schema validation exists.
   * AC-6: ``README.md`` describes the package.
   * AC-7: ``packages/kanban/schemas/kanban.schema.json`` is included in the
      VSIX (``.vscodeignore`` does not exclude ``schemas/``).
   * AC-8: ``yamlValidation.url`` uses the package-relative path
      ``./schemas/kanban.schema.json``.
   * AC-9: ``loadSchema()`` in the verify tool resolves the schema path via
      ``context.extensionUri`` (extension install path), not the workspace
      root.


.. spec:: Board Write Validation Helper
   :id: SPEC_KAN_WRITEVALID
   :status: approved
   :links: REQ_KAN_WRITEVALID; SPEC_KAN_VERIFY; SPEC_KAN_SCHEMA

   **Description:**
   A shared private helper in ``packages/kanban/src/extension.ts`` that every
   item-writing tool calls before mutating the YAML document. It reuses the
   field-map shape ``semanticValidate`` already builds
   (``SPEC_KAN_VERIFY`` — name → ``{ type, options? }``), so the read-side and
   write-side rules cannot diverge.

   **Signature:**

   .. code-block:: typescript

      interface BoardFields {
          fields: Array<{ name: string; type: string; options?: Array<{ name: string }> }>;
      }

      /** Returns an error string, or undefined when every value is acceptable. */
      function validateItemValues(
          values: Record<string, unknown>,
          board: BoardFields
      ): string | undefined;

   **Rules** (``REQ_KAN_WRITEVALID``):

   1. ``id`` present in ``values`` → error; ids are assigned, never supplied.
   2. Built-in keys ``name``, ``status``, ``labels``, ``notes`` are always
      permitted. ``status`` is additionally checked against the ``status``
      field's options.
   3. Any other key must name a declared field, else error listing the declared
      field names.
   4. A value under a ``single_select`` field must be one of that field's
      options, else error listing them.
   5. A value under a ``text`` field is accepted unchecked.

   **Why writes are stricter than the current ``jarvis_updateKanbanItem``:**
   ``updateKanbanItem`` validates only ``status`` today, so it can already write
   a value that ``jarvis_verifyKanbanSchema`` reports as an error, and an
   undeclared key that the renderer silently drops. Repeating that in three new
   tools would triple a known defect. The new tools therefore validate the full
   value set; bringing ``updateKanbanItem`` up to the same contract is a
   separate change (see ``USER REVIEW REQUIRED`` F-1 in the
   ``kanban-management-tools`` CD) because it tightens an approved, shipped
   behaviour.

   **Acceptance Criteria:**

   * AC-1: The helper is called by ``SPEC_KAN_ADD`` before any document
     mutation.
   * AC-2: A ``single_select`` value outside its options yields an error naming
     the field and its valid options.
   * AC-3: An undeclared key yields an error naming the declared fields.
   * AC-4: A ``text`` field value is accepted whatever the string.
   * AC-5: A supplied ``id`` yields an error.
   * AC-6: The helper performs no I/O and mutates nothing — it inspects and
     reports only.


.. spec:: jarvis_addKanbanItem Tool
   :id: SPEC_KAN_ADD
   :status: approved
   :links: REQ_KAN_ADD; SPEC_KAN_WRITEVALID; SPEC_KAN_UPDATE; SPEC_ACT_WHOAMI

   **Description:**
   Register ``jarvis_addKanbanItem`` via ``api.registerTool()`` in the kanban
   package's ``extension.ts``, following the round-trip editing pattern of
   ``SPEC_KAN_UPDATE`` (``yaml.parseDocument`` → mutate nodes →
   ``doc.toString()``), which preserves comments and formatting
   (``REQ_KAN_SCHEMA`` AC-9).

   **Input schema:**

   .. code-block:: typescript

      {
        name: string;              // required
        status?: string;
        labels?: string[];
        notes?: string;
        fields?: Record<string, string>;  // values for declared fields
        boardName?: string;
        ownerName?: string;
      }

   **Algorithm:**

   1. Resolve owner and board path (same as ``SPEC_KAN_UPDATE`` steps 1–2);
      board missing → ``{ error: "board not found" }``.
   2. Read and ``yaml.parseDocument`` the file; parse failure → error.
   3. ``doc.toJSON()`` for inspection.
   4. Validate via ``validateItemValues`` (``SPEC_KAN_WRITEVALID``); on error
      return it and write nothing.
   5. Determine the id: ``nextId`` when present, else
      ``max(existing ids) + 1``, else ``1`` (``REQ_KAN_SCHEMA`` AC-7).
   6. Default ``status`` to the first option of the ``status`` field when the
      caller omitted it.
   7. Build the item map and append it to the ``items`` sequence node.
   8. Set ``nextId`` to ``id + 1`` on the document — written even when the board
      previously had no ``nextId``, so the derivation in step 5 happens once
      rather than on every subsequent add.
   9. Write ``doc.toString()``; call ``refreshKanbanPanel(boardPath)``.
   10. Return ``{ path, added: true, itemId }``.

   **Acceptance Criteria:**

   * AC-1: A new item receives ``id === nextId`` and ``nextId`` is incremented
     in the same write.
   * AC-2: On a board with no ``nextId``, the id is ``max(ids) + 1`` and
     ``nextId`` is written for subsequent calls.
   * AC-3: Omitted ``status`` defaults to the first declared status option.
   * AC-4: Invalid values are rejected before any write — the file is unchanged
     on the error path.
   * AC-5: Comments and formatting elsewhere in the file are preserved.
   * AC-6: The open panel refreshes after the write.
   * AC-7: Registers with ``toolReferenceName: "addKanbanItem"``.


.. spec:: jarvis_deleteKanbanItem Tool
   :id: SPEC_KAN_DELETE
   :status: approved
   :links: REQ_KAN_DELETE; SPEC_KAN_UPDATE; SPEC_ACT_WHOAMI

   **Description:**
   Register ``jarvis_deleteKanbanItem`` via ``api.registerTool()``, using the
   same round-trip pattern as ``SPEC_KAN_UPDATE``.

   **Input schema:**

   .. code-block:: typescript

      { itemId: number; boardName?: string; ownerName?: string }

   **Algorithm:**

   1. Resolve owner and board path; board missing → ``{ error: "board not found" }``.
   2. Read and ``yaml.parseDocument``.
   3. Find the index of the item whose ``id`` matches ``itemId`` in
      ``doc.toJSON()``. Not found → ``{ error: "item not found", itemId }``,
      write nothing.
   4. Delete that index from the ``items`` sequence node
      (``YAMLSeq.delete(index)``), leaving every other node untouched.
   5. Leave ``nextId`` unchanged (``REQ_KAN_DELETE`` AC-4).
   6. Write ``doc.toString()``; call ``refreshKanbanPanel(boardPath)``.
   7. Return ``{ path, deleted: true, itemId }``.

   **Why ``nextId`` is not decremented:**
   ``REQ_KAN_SCHEMA`` AC-8 makes ids permanently unique. Decrementing would
   hand the freed id to the next item, so a stale reference to the deleted item
   — in a message, a commit, another board — would silently resolve to a
   different one.

   **Acceptance Criteria:**

   * AC-1: The identified item is removed and no other item changes.
   * AC-2: ``nextId`` is unchanged after a delete.
   * AC-3: A subsequent add uses the untouched ``nextId``, so the deleted id is
     never reissued.
   * AC-4: Deleting an absent id writes nothing and returns the error shape.
   * AC-5: Comments and formatting elsewhere in the file are preserved.
   * AC-6: The open panel refreshes after the write.
   * AC-7: Registers with ``toolReferenceName: "deleteKanbanItem"``.


.. spec:: jarvis_listKanbanItems Tool
   :id: SPEC_KAN_LIST
   :status: approved
   :links: REQ_KAN_LIST; SPEC_ACT_WHOAMI

   **Description:**
   Register ``jarvis_listKanbanItems`` via ``api.registerTool()``. Read-only:
   it parses the board with ``yaml.parse`` (plain data — no round-trip
   representation is needed since nothing is written) and returns a projection.

   **Input schema:**

   .. code-block:: typescript

      {
        status?: string;
        labels?: string[];
        boardName?: string;
        ownerName?: string;
      }

   **Algorithm:**

   1. Resolve owner and board path; board missing → ``{ error: "board not found" }``.
   2. Read and ``yaml.parse``.
   3. If ``status`` was given and matches no declared status option → error
      naming the valid options (``REQ_KAN_LIST`` AC-6).
   4. Filter items: ``status`` equality when given; every requested label
      present in the item's ``labels`` when given; both AND-combined.
   5. Project each surviving item to ``{ id, name, status, labels }``.
   6. Return ``{ path, count, items }``.

   **Why an unknown status is an error, not an empty list:**
   Both would return nothing. An empty list tells the caller "no items are in
   that state", which is a legitimate and actionable answer — so a typo would be
   read as a fact about the board and acted on. Naming the valid options makes
   the two outcomes distinguishable.

   **Why the projection omits notes and declared-field values:**
   ``US_KAN_QUERY`` AC-3 requires the result to scale with matches, not with
   board size. ``notes`` is unbounded free text and is the field most likely to
   dominate a response; declared-field values grow with the board's field count.
   ``id`` is sufficient to fetch anything omitted.

   **Acceptance Criteria:**

   * AC-1: No filter returns every item, projected.
   * AC-2: ``status`` alone, ``labels`` alone, and both together each filter as
     specified; ``labels`` requires all requested labels to be present.
   * AC-3: Each returned object carries exactly ``id``, ``name``, ``status``,
     ``labels`` — no ``notes``, no declared-field values.
   * AC-4: A filter matching nothing returns ``count: 0`` and an empty array.
   * AC-5: An unknown ``status`` value returns an error listing valid options.
   * AC-6: The board file is not modified and no panel refresh is triggered.
   * AC-7: Registers with ``toolReferenceName: "listKanbanItems"``.


.. spec:: jarvis_updateKanbanFields Tool
   :id: SPEC_KAN_FIELDS
   :status: approved
   :links: REQ_KAN_FIELDS; SPEC_KAN_SCHEMA; SPEC_KAN_UPDATE; SPEC_ACT_WHOAMI

   **Description:**
   Register ``jarvis_updateKanbanFields`` via ``api.registerTool()``, using the
   round-trip pattern of ``SPEC_KAN_UPDATE``. It mutates the ``fields``
   sequence, never ``items``.

   **Input schema:**

   .. code-block:: typescript

      {
        operation: 'addField' | 'removeField' | 'addOption' | 'removeOption';
        fieldName: string;              // target field, all operations
        fieldType?: 'single_select' | 'text';  // addField
        options?: Array<{ name: string; color?: string }>;  // addField (single_select)
        optionName?: string;            // addOption / removeOption
        optionColor?: string;           // addOption
        boardName?: string;
        ownerName?: string;
      }

   **Reference guard (shared by ``removeField`` and ``removeOption``):**

   Before removing anything, scan ``items`` for values that would be stranded
   and collect the referencing ids:

   * ``removeField`` → any item carrying a key equal to ``fieldName``.
   * ``removeOption`` → any item whose value under ``fieldName`` equals
     ``optionName``.

   A non-empty set aborts the operation with an error naming the ids, so the
   caller can retarget those items first. The ids are named rather than counted
   because the caller's next action is to fix exactly those items.

   **Per-operation rules:**

   * ``addField`` — reject a duplicate name; reject the literal ``status``
     (``REQ_KAN_FIELDS`` AC-3). ``single_select`` requires a non-empty
     ``options``; ``text`` rejects ``options`` (``SPEC_KAN_SCHEMA`` AC-7).
     Append the field map to the ``fields`` sequence.
   * ``removeField`` — reject ``status`` outright (AC-5); apply the reference
     guard; remove the field node.
   * ``addOption`` — reject when the field is absent, is ``text``, or already
     has that option; append the option map.
   * ``removeOption`` — reject when the field is absent or is ``text``; apply
     the reference guard; reject when it would empty the options list (AC-8);
     remove the option node.

   All four end with ``doc.toString()``, ``refreshKanbanPanel(boardPath)`` and
   ``{ path, updated: true, operation }``.

   **Rename is not offered** (``REQ_KAN_FIELDS`` AC-11): with the reference
   guard in force, renaming an in-use field or option cannot be composed from
   remove + add. Providing rename means either rewriting every referencing item
   value in the same transaction, or relaxing the guard — both larger decisions
   than this CR carries. Recorded as ``USER REVIEW REQUIRED`` F-2 rather than
   resolved here.

   **Acceptance Criteria:**

   * AC-1: Each of the four operations performs its documented mutation and
     leaves the rest of the file untouched.
   * AC-2: ``removeField`` and ``removeOption`` on a value still referenced by
     items are refused, name the referencing item ids, and write nothing.
   * AC-3: ``removeField`` on ``status`` is refused.
   * AC-4: ``addField`` with a duplicate name is refused; ``addField`` named
     ``status`` is refused.
   * AC-5: ``addField`` of type ``text`` carrying ``options`` is refused;
     of type ``single_select`` without options is refused.
   * AC-6: ``addOption``/``removeOption`` against a ``text`` field are refused.
   * AC-7: ``removeOption`` that would leave zero options is refused.
   * AC-8: After any successful operation the board still validates against
     ``schemas/kanban.schema.json``.
   * AC-9: Comments and formatting elsewhere in the file are preserved.
   * AC-10: The open panel refreshes after a successful write.
   * AC-11: Registers with ``toolReferenceName: "updateKanbanFields"``.


.. spec:: Kanban Skill Asset Content
   :id: SPEC_KAN_SKILLCONTENT
   :status: approved
   :links: REQ_KAN_SKILLCONTENT; SPEC_KAN_SCHEMA; SPEC_MOD_SKILL_PROVISION

   **Description:**
   Content specification for
   ``packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md``. Delivery into
   the workspace is ``SPEC_MOD_SKILL_PROVISION``'s concern and unchanged here;
   this spec governs what the file says.

   **Required sections:**

   ::

      ---
      description: <task-match trigger, USE FOR / DO NOT USE FOR>
      ---
      # Jarvis Kanban Board
      ## Tools                  -> every registered tool, one line each
      ## Owner Resolution       -> REQ_KAN_SKILLCONTENT AC-4
      ## Board Anatomy          -> top-level keys; status drives columns
      ## Field Types            -> single_select vs text; options rule
      ## Item Properties        -> required / built-in / declared-field values
      ## Pitfalls               -> the silent-failure list
      ## Example                -> one complete, schema-valid board
      ## Workflow               -> create -> add/list/update/delete -> verify -> open

   **Tools section — required content** (``kanban-management-tools`` CR):

   The table lists all eight registered tools:

   .. list-table::
      :header-rows: 1

      * - Tool
        - Purpose
      * - ``jarvis_createKanbanBoard``
        - Create a new board for an entity
      * - ``jarvis_openKanbanBoard``
        - Open a board in the webview renderer
      * - ``jarvis_verifyKanbanSchema``
        - Validate a board against schema and semantic rules
      * - ``jarvis_listKanbanItems``
        - Query items by status/labels; compact projection
      * - ``jarvis_addKanbanItem``
        - Append an item; ``id`` assigned automatically
      * - ``jarvis_updateKanbanItem``
        - Update fields on an existing item by ``id``
      * - ``jarvis_deleteKanbanItem``
        - Remove an item by ``id``
      * - ``jarvis_updateKanbanFields``
        - Add/remove a field, or add/remove a single-select option

   The Workflow section shows ``jarvis_listKanbanItems`` as the way to inspect a
   board, ahead of reading the file, and states that its result is a projection
   — ``id``, ``name``, ``status``, ``labels`` only — so an actor does not mistake
   it for the whole item (``REQ_KAN_SKILLCONTENT`` AC-10).

   Two ownership rules belong here because both are invisible from the tool
   signatures (``REQ_KAN_SKILLCONTENT`` AC-9): ``id`` is assigned by
   ``jarvis_addKanbanItem`` and rejected if supplied, and a deleted ``id`` is
   never reissued.

   **Owner Resolution — required content:**

   Stated as the tool behaves (``SPEC_KAN_CREATE`` step 1), not as a
   precondition on the caller:

   * Omit ``ownerName`` to address the calling actor's own board. The tool
     resolves the caller via ``jarvis_whoAmI`` itself.
   * Supply ``ownerName`` only to address a *different* entity's board.
   * A supplied name that matches no scanned entity returns
     ``{ error: "actor unknown" }``.

   The skill SHALL NOT instruct the actor to call ``jarvis_whoAmI`` first and
   pass the result: that is a redundant round trip which converts a resolved
   call into a name-matching call, and name matching is the only path that can
   fail with ``actor unknown``.

   **Pitfalls — required content:**

   Each entry names the observable symptom, because every one of these fails
   *quietly* — an actor that does not know the symptom has no signal to act on:

   1. An item key matching no declared field is schema-valid, is reported by
      ``jarvis_verifyKanbanSchema`` as a **warning** (not an error), and is
      **never rendered**. Symptom: the board renders, verification looks clean,
      and the value is simply absent.
   2. A field type other than ``single_select`` or ``text`` fails structural
      validation with an ajv message that does not name the permitted values.
   3. ``options`` on a ``text`` field, or missing ``options`` on a
      ``single_select`` field, is a structural error
      (``SPEC_KAN_SCHEMA`` AC-7).
   4. ``id`` is immutable and never reused; ``nextId`` must not be decremented.
   5. ``status`` must be ``single_select`` — its options are the columns.

   **Acceptance Criteria:**

   * AC-1: All sections listed above are present and non-empty.
   * AC-2: The example board validates against
     ``schemas/kanban.schema.json`` and exercises both field types.
   * AC-3: The owner-resolution section describes omission as the default path
     and contains no instruction to pre-resolve via ``jarvis_whoAmI``.
   * AC-4: The pitfalls section contains all five entries above, each naming
     its observable symptom.
   * AC-5: The item-property list matches the schema's required and optional
     properties exactly.
   * AC-6: The frontmatter ``description`` follows the USE FOR / DO NOT USE FOR
     shape already used by the file, so task matching is unchanged.
   * AC-7 (``kanban-management-tools`` CR): The Tools table lists all eight
     registered tools, and every listed name matches a tool actually registered
     in ``extension.ts``.
   * AC-8 (``kanban-management-tools`` CR): The Workflow section covers add,
     list, update and delete, and states that ``jarvis_listKanbanItems`` returns
     a projection rather than whole items.
   * AC-9 (``kanban-management-tools`` CR): The skill states that ``id`` is
     assigned on add and never reused after delete.


.. spec:: Kanban Instructions Asset Content
   :id: SPEC_KAN_INSTRUCTIONS
   :status: approved
   :links: REQ_KAN_INSTRUCTIONS; SPEC_KAN_SCHEMA

   **Description:**
   Content specification for
   ``packages/kanban/assets/instructions/jarvis-kanban.yaml.instructions.md``.
   Unlike the skill, which is loaded on task match, this file is applied by
   VS Code whenever a matching file is edited — so it addresses hand editing,
   and stays short.

   **Frontmatter:**

   .. code-block:: yaml

      ---
      applyTo: "**/{kanban.yaml,*.kanban.yaml}"
      ---

   The previous glob ``**/*.kanban.yaml`` does not match a file named exactly
   ``kanban.yaml`` — which is the *default* board name (``SPEC_KAN_DISCOVER``).
   The instructions therefore never applied to the most common board file.

   **Required content:**

   * Board-level required keys are ``title``, ``fields``, ``items``.
     ``nextId`` is optional; when present it must only ever increase.
   * An item requires ``id``, ``name``, ``status``. The title-like property is
     ``name`` — there is no ``title`` property on an item.
   * ``id`` is immutable and never reused.
   * A value under a ``single_select`` field must match one of that field's
     declared options. A value under a ``text`` field is unconstrained.
   * A key matching no declared field will be accepted and then ignored by the
     renderer — declare the field first.
   * Run ``jarvis_verifyKanbanSchema`` after manual edits, and read the
     ``warnings`` array, not only ``errors``.

   **Acceptance Criteria:**

   * AC-1: ``applyTo`` matches both ``kanban.yaml`` and ``*.kanban.yaml``.
   * AC-2: The file states ``name`` (not ``title``) as the item property, and
     lists ``nextId`` as optional — correcting both claims in the pilot file.
   * AC-3: Every required-content bullet above is present.
   * AC-4: No claim in the file contradicts ``schemas/kanban.schema.json``.
   * AC-5: The file remains a short invariant list — it does not duplicate the
     skill's ontology reference, tool workflow, or example board.
