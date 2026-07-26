Kanban Design Specifications
=============================

.. spec:: Kanban Board YAML Schema
   :id: SPEC_KAN_SCHEMA
   :status: draft
   :links: REQ_KAN_SCHEMA

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
              "required": ["name", "type", "options"],
              "additionalProperties": false,
              "properties": {
                "name": {
                  "type": "string",
                  "minLength": 1
                },
                "type": {
                  "type": "string",
                  "enum": ["single_select"]
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
              }
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
                "description": "Values for user-defined single_select fields."
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


.. spec:: Kanban Board Renderer
   :id: SPEC_KAN_RENDERER
   :status: draft
   :links: REQ_KAN_RENDERER; SPEC_KAN_SCHEMA

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
     value pairs), ``notes`` (as smaller text below).
   * Empty columns are shown (with a "No items" placeholder).

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
   :links: REQ_KAN_VERIFY; SPEC_ACT_WHOAMI; SPEC_KAN_SCHEMA

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
      * Every item's ``status`` value matches a defined ``status`` option →
        error for each mismatch.
      * Item field values (``additionalProperties``) match a defined field
        name and option → warning for unknown field names, error for values
        not in the field's options.

   5. Return ``{ board: "<path>", errors: [...], warnings: [...] }`` where
      each finding is ``{ field: string, message: string, item?: string }``.

   **Acceptance Criteria:**

   * AC-1: Detects missing ``status`` field.
   * AC-2: Detects item ``status`` values not matching defined options.
   * AC-3: Returns structured findings with field and item context.
   * AC-4: Registers with ``toolReferenceName: "verifyKanbanSchema"``.


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
   2. Read and parse the YAML file. If not found → return
      ``{ error: "board not found" }``.
   3. Find the item with ``id === itemId``. If not found → return
      ``{ error: "item not found", itemId }``.
   4. Merge ``changes`` into the item. The ``id`` field is immutable — if
      present in ``changes``, it is silently ignored.
   5. If ``changes.status`` is provided, validate it against the ``status``
      field's options. If invalid → return
      ``{ error: "invalid status", value, validOptions }``.
   6. Write the updated YAML back to the file (preserving field order where
      practical).
   7. Return ``{ path, updated: true, itemId }``.

   **Acceptance Criteria:**

   * AC-1: Updates a single item by ``id``.
   * AC-2: Returns error for unknown item ID.
   * AC-3: Returns error for invalid ``status`` value.
   * AC-4: ``id`` field is immutable — never changed by this tool.
   * AC-5: Registers with ``toolReferenceName: "updateKanbanItem"``.


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
      ``jarvis_updateKanbanItem``),
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
