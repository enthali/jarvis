Jarvis Entity Requirements
==========================

Generic, user-facing cross-kind requirements (Project / Event / Actor). See
``docs/namingconventions.rst`` for the theme placement rule (``ENT`` =
generic/user-facing, ``ENG`` = kind-agnostic plumbing, no US level).

.. req:: Open YAML from Tree Item — Retired
   :id: REQ_ENT_OPENYAML
   :status: implemented
   :priority: optional
   :links: US_ENT_OPENYAML; REQ_ENT_ENTITY_CONTEXTMENU

   **Retired (entity-tree-context-menu CR):** ``jarvis.openYamlFile`` is fully
   retired — not just its inline placement (as an earlier revision of this CR
   stated), but the command entirely. The YAML file is reachable via the
   entity's expandable file children (``jarvis.openEntityFile``,
   ``REQ_ENT_ENTITY_FILE_CHILDREN``) and, for discoverability, via the new
   right-click "Open" entry (``REQ_ENT_ENTITY_CONTEXTMENU`` AC-1/AC-2, which
   invokes ``jarvis.openEntityFile``/``jarvis.openAgentSession`` — not this
   command). ``jarvis.openYamlFile`` has zero remaining callers and is
   scheduled for full code removal (``package.json`` command entry +
   ``extension.ts`` handler) by Dev Engineer in this same CR.

   **Historical Acceptance Criteria** (described the retired command; kept
   for traceability, no longer enforced at runtime):

   * AC-1: Project leaf items have ``contextValue = 'project'``;
     event leaf items have ``contextValue = 'event'``
   * AC-2: **Retired.** No ``view/item/context`` menu entry places
     ``jarvis.openYamlFile`` in the ``inline`` group on any entity root node.
   * AC-3: (historical) The command opened the file via
     ``vscode.commands.executeCommand('vscode.open', uri)`` where
     ``uri = vscode.Uri.file(element.id)``
   * AC-4: ``TreeItem.command`` is NOT set on leaf items (this constraint is
     independent of the command's retirement and remains true — referenced
     by ``REQ_ENT_ENTITY_TREECLICK`` AC-2)
   * AC-5: (historical) Folder nodes (``contextValue = 'folder'``) had no
     inline button


.. req:: Open Agent Session from Tree
   :id: REQ_ENT_AGENTSESSION
   :status: draft
   :priority: optional
   :links: US_ENT_AGENTSESSION; US_MSG_STABLESESSION; REQ_MSG_SESSIONLOOKUP; REQ_MSG_PINNED; REQ_MSG_OPENCHAT; REQ_ENT_AGENTPROMPT_TEMPLATE; REQ_MSG_EDITORPLACEMENT

   **Description:**
   Every project and event leaf item SHALL provide an inline action button that
   opens the agent chat session for that item. The session open/create mechanism
   is specified in ``US_MSG_STABLESESSION`` and its requirements. This command
   (``jarvis.openAgentSession``) is user-initiated (tree click or inline
   button) and therefore always targets the Main placement column
   (``REQ_MSG_EDITORPLACEMENT`` AC-1).

   **Acceptance Criteria:**

   * AC-1: All project and event leaf items SHALL display an inline
     ``$(comment-discussion)`` button (entity-tree-context-menu CR: this is
     now the only inline icon on entity root nodes — ``$(go-to-file)`` and
     ``$(notebook)`` were retired, see ``REQ_ENT_OPENYAML``/``REQ_ENT_OPENCONTEXT``)
   * AC-2: Clicking the button SHALL resolve the session UUID by passing the
     entity ``name`` to ``REQ_MSG_SESSIONLOOKUP``; if a session exists it SHALL
     be opened pinned (``{ preview: false }``) per ``REQ_MSG_PINNED``; if no
     session exists a new one SHALL be opened using the mode-primed creation
     pattern per ``REQ_ENT_AGENTPROMPT_TEMPLATE`` AC-6, and SHALL be initialized
     with the init prompt per ``REQ_ENT_AGENTPROMPT_TEMPLATE``
   * AC-3: After creating a new session, a ``/rename <entityName>`` prompt SHALL
     be submitted automatically, followed by the context initialization prompt
     containing the path to ``context.md`` in the entity's folder
   * AC-4: Folder nodes SHALL NOT display the button
   * AC-5: The command SHALL NOT appear in the Command Palette (it requires a
     tree element argument and would fail without one)
   * AC-6: When the session's chat tab already exists (AC-2, existing-session
     branch), it SHALL always be resolved to the Main placement column
     (view column 1) — if currently open in a different column, it SHALL be
     closed and reopened fresh in column 1 (``REQ_MSG_EDITORPLACEMENT`` AC-5).
     This is a user-initiated action, distinct from Auto-Delivery's
     Secondary-column, already-open-anywhere behavior.
   * AC-7: (**project-actor-click-placement-fix CR — corrected**) When a new
     session is created (AC-2, no existing session found), Main-column
     placement is now **guaranteed, not best-effort**: after the new session
     is created, renamed, and initialized (AC-2/AC-3), a follow-up relocate
     step resolves the session's UUID (now guaranteed to exist) and applies
     the identical Main-target close+reopen mechanism used for the
     existing-session branch (AC-6) — see ``REQ_MSG_EDITORPLACEMENT``
     AC-12/AC-13 for the full mechanism. ~~Main-column placement is
     best-effort, not guaranteed: VS Code provides no API to force the view
     column of a freshly created chat editor produced by
     ``workbench.action.openChat``/``openNewChatEditor()``
     (``REQ_MSG_OPENCHAT``). The new session is born in whatever column is
     currently active...~~ — this remains true (no such VS Code API exists),
     but is no longer the deciding factor: the guarantee is now achieved by
     relocating *after* creation instead of trying to influence *where* the
     session is created.


.. req:: Rescan Button in Title Bar
   :id: REQ_ENT_SCANREFRESH
   :status: implemented
   :priority: mandatory
   :links: US_ENT_SCANREFRESH; REQ_EXP_REACTIVECACHE

   **Description:**
   Both the Projects and Events tree views SHALL provide a refresh icon in the
   title bar that triggers an immediate rescan of the YAML scanner.

   **Acceptance Criteria:**

   * AC-1: A ``$(refresh)`` icon is displayed in the Projects view title bar
   * AC-2: A ``$(refresh)`` icon is displayed in the Events view title bar
   * AC-3: Clicking either icon triggers the scanner's ``rescan()`` method
   * AC-4: A single command ``jarvis.rescan`` is shared by both views
   * AC-5: The command SHALL NOT appear in the Command Palette


.. req:: Sort Tree by Entity Name
   :id: REQ_ENT_NAMESORT
   :status: implemented
   :priority: optional
   :links: US_ENT_NAMESORT

   **Description:**
   The scanner SHALL sort tree nodes alphabetically by entity name (for leaf
   nodes) or folder name (for grouping nodes), so that the explorer displays
   items in a predictable, user-friendly order.

   **Acceptance Criteria:**

   * AC-1: Leaf nodes at each level are sorted by their YAML ``name`` field
     (case-insensitive)
   * AC-2: Folder nodes at each level are sorted by folder name (case-insensitive)
   * AC-3: Folders and leaves are interleaved in a single alphabetical list at
     each level (not grouped separately)


.. req:: Context Actions on Leaf Nodes
   :id: REQ_ENT_CONTEXTACTIONS
   :status: implemented
   :priority: optional
   :links: US_ENT_CONTEXTACTIONS

   **Description:**
   Project and event leaf nodes SHALL provide three context-menu actions that
   delegate to built-in VS Code commands for revealing the entity folder in
   the file explorer, the OS file manager, or an integrated terminal.

   **Acceptance Criteria:**

   * AC-1: Right-clicking a leaf node with ``contextValue`` = ``jarvisProject`` or
     ``jarvisEvent`` SHALL show "Reveal in Explorer", "Reveal in File Explorer",
     and "Open in Terminal" in the context menu
   * AC-2: "Reveal in Explorer" SHALL reveal the entity folder in the VS Code
     file explorer (built-in ``revealInExplorer``)
   * AC-3: "Reveal in File Explorer" SHALL open the entity folder in the OS-native
     file manager (built-in ``revealFileInOS``)
   * AC-4: "Open in Terminal" SHALL open an integrated terminal with the working
     directory set to the entity folder (built-in ``openInTerminal``)
   * AC-5: Folder nodes (``contextValue`` = ``jarvisFolder``) SHALL NOT show
     these actions
   * AC-6: The three commands SHALL NOT appear in the Command Palette (they require
     a tree node argument)


.. req:: Open Context File Command
   :id: REQ_ENT_OPENCONTEXT
   :status: draft
   :priority: optional
   :links: US_ENT_OPENCONTEXT; REQ_ENT_OPENYAML; REQ_ENT_AGENTSESSION; REQ_ACT_OPENCONTEXT; REQ_ENT_ENTITY_CONTEXTMENU

   **Retired (entity-tree-context-menu CR):** ``jarvis.openContext`` is fully
   retired \u2014 not just its inline placement (as an earlier revision of this
   CR stated), but the command entirely. ``context.md`` is reachable via the
   entity's expandable file children (``jarvis.openEntityFile``,
   ``REQ_ENT_ENTITY_FILE_CHILDREN``) and, for discoverability, via the new
   right-click \"Open\" entry (``REQ_ENT_ENTITY_CONTEXTMENU`` AC-1/AC-2, which
   invokes ``jarvis.openEntityFile``/``jarvis.openAgentSession`` \u2014 not this
   command). ``jarvis.openContext`` has zero remaining callers and is
   scheduled for full code removal (``package.json`` command entry +
   ``extension.ts`` handler) by Dev Engineer in this same CR.

   **Historical Description** (the retired command's behavior; kept for
   traceability, no longer enforced at runtime): ``jarvis.openContext``
   resolved and opened a ``context.md`` file using a 3-step discovery
   process. It was the single, shared command for all 3 entity kinds \u2014
   there was no per-kind variant and no auto-create behavior for any kind
   (see entity-open-context-cleanup CR decision below).

   **Historical Acceptance Criteria:**

   * AC-1: **Retired.** No ``view/item/context`` menu entry places
     ``jarvis.openContext`` in the ``inline`` group on any entity root node.
   * AC-2: (historical) The resolution order was:

     1. Direct: ``<entityFolder>/context.md`` exists → open it
     2. Subfolder search: scan immediate subfolders (1 level deep) for
        ``context.md``; hidden folders (names starting with ``.``) SHALL be
        excluded
     3. Picker: if multiple matches are found in step 2, show
        ``vscode.window.showQuickPick`` with labels as relative paths
        (e.g. ``pm/context.md``); open the user's selection
     4. None found: show a non-blocking information message

   * AC-3: (historical) If exactly one subfolder match is found it was opened
     without showing a picker
   * AC-4: (historical) Hidden subfolders (names starting with ``.``) were
     excluded from the subfolder search
   * AC-5: (historical) The picker label was the relative path from the
     entity folder (e.g. ``pm/context.md``)
   * AC-6: (historical) If the file existed (step 1 or selected), it was
     opened using ``vscode.window.showTextDocument()`` with
     ``{ preview: false }`` — no kind showed a preview-mode tab, and no kind
     auto-created a missing ``context.md`` on open (creation happened only
     at entity-creation time, via
     ``jarvis_createProject``/``jarvis_createEvent``/``jarvis_createActor``
     (was ``jarvis_createSession`` before the actor-tool-rename CR, Phase 5)
     and their UI equivalents — never as a side effect of opening).
   * AC-7: (historical) Folder nodes did not display the button
   * AC-8: (historical) The command did not appear in the Command Palette


.. req:: Agent-Session Init Prompt Template Setting
   :id: REQ_ENT_AGENTPROMPT_TEMPLATE
   :status: draft
   :priority: optional
   :links: US_ENT_AGENTSESSION_PROMPT

   **Description:**
   The extension SHALL read the agent-session initialization prompt from the VS
   Code setting ``jarvis.agentSession.initPromptTemplate`` and perform placeholder
   substitution before sending it to the chat.

   **Acceptance Criteria:**

   * AC-1: Setting ``jarvis.agentSession.initPromptTemplate``:

     - Type: ``string``
     - Default: the tuned disciplined-memory prompt (verbatim in
       ``SPEC_ENT_AGENTSESSION_INITPROMPT``)
     - Scope: ``window``
     - Group: Sessions (inside the Sessions configuration group)

   * AC-2: Three placeholders SHALL be substituted at send-time:

     - ``${kind}`` → entity kind (``'project' | 'event' | 'session'``)
     - ``${name}`` → entity display name (from YAML ``name`` field)
     - ``${contextPath}`` → absolute filesystem path to ``context.md``

   * AC-3: If the setting value is empty or absent, the built-in default prompt
     SHALL be used (fall back to default, not to empty string).
   * AC-4: Unknown placeholders (not in the list above) SHALL be left as-is in
     the output (no error, no substitution).
   * AC-5: The substituted prompt SHALL be sent on ``jarvis.openAgentSession``
     (new-session branch only), ``jarvis.newSession``, and — when the destination
     name matches a known entity in the scanner store — the new-session branch of
     ``jarvis.sendMessages`` and the auto-delivery poll loop. All four paths use
     the same template, placeholder substitution, and agent-mode binding.
   * AC-6: When ``entity.agent`` is set, the bound mode SHALL be applied at
     session creation time using the mode-primed creation pattern: the extension
     SHALL call ``workbench.action.chat.open { mode: entity.agent }`` + 300 ms
     settle **before** ``openNewChatEditor()``, so the new session inherits the
     mode from the VS Code Chat mode selector. The extension SHALL NOT attempt to
     set or change the mode of an already-active session via a post-creation
     ``workbench.action.chat.open`` call.
   * AC-7: The built-in default prompt SHALL include, as the last item of the
     "Keep it minimal and action-oriented" discipline list, the following bullet
     (verbatim):
     ``- When a topic grows past ~5 bullets, move it to a dedicated file beside
     `context.md` and leave a one-line summary with a relative link in
     `context.md`.``
     The rule applies generically to all entity kinds with no per-kind branching.


.. req:: Entity Agent Field (Projects & Events)
   :id: REQ_ENT_ENTITY_AGENT
   :status: draft
   :priority: required
   :links: US_ENT_ENTITYPARITY; REQ_ACT_AGENT_FIELD; REQ_ACT_AGENT_OPEN

   **Description:**
   The project and event entity schemas SHALL declare ``agent`` as a
   **required** field. The YAML scanner SHALL be fail-open: entities missing
   ``agent`` still load, but are flagged internally as **unbound**.

   **Acceptance Criteria:**

   * AC-1: ``schemas/project.schema.json`` and ``schemas/event.schema.json``
     SHALL declare ``agent`` in the ``"required"`` array.
   * AC-2: ``src/yamlScanner.ts`` SHALL read the ``agent`` field from
     ``project.yaml`` and ``event.yaml`` and store it in ``EntityEntry.agent``:
     empty string ``""`` is preserved as-is (meaning "No agent chosen"),
     non-empty string is stored verbatim (concrete-bound). Only a missing field
     or non-string value SHALL result in ``EntityEntry.agent === undefined``
     (unbound).
   * AC-3: When the scanner encounters a YAML without an ``agent`` field
     (field absent), it SHALL emit a warning-level log entry:
     ``"<entity-kind> <name> at <path> is missing required 'agent' field — marked unbound"``.
     The warn-log SHALL NOT fire when ``agent: ""`` is present.
   * AC-4: ``jarvis_listProjects`` and ``jarvis_listEvents`` tool outputs SHALL
     include ``agent`` (as ``""`` when absent).
   * AC-5: ``jarvis.openAgentSession`` SHALL respect ``entity.agent`` on
     project/event entities — same behavior as session entities per
     ``REQ_ACT_AGENT_OPEN``.
   * AC-6: Downstream consumers SHALL check ``EntityEntry.agent`` to determine
     bound vs. unbound state: ``undefined`` means unbound (runtime behavior
     identical to ``""`` — opens default chat, no picker, no YAML writeback),
     ``""`` means default-agent-bound (no picker, no mode-prime),
     non-empty string means concrete-bound (mode-prime applies).


.. req:: Entity Tree-Click-to-Chat (Projects & Events)
   :id: REQ_ENT_ENTITY_TREECLICK
   :status: draft
   :priority: required
   :links: US_ENT_ENTITYPARITY; REQ_ACT_TREECLICK; REQ_ENT_AGENTSESSION

   **Description:**
   Single-clicking a project or event leaf node SHALL open the agent-chat editor
   (same behavior as ``REQ_ACT_TREECLICK`` for sessions).

   **Acceptance Criteria:**

   * AC-1: The ``command`` property of every project (``contextValue = 'project'``)
     and event (``contextValue = 'event'``) ``TreeItem`` SHALL be bound to
     ``jarvis.openAgentSession``.
   * AC-2: ``REQ_ENT_OPENYAML`` AC-4 (``TreeItem.command`` not set on leaf
     items) is superseded: ``TreeItem.command`` is now set (to open agent
     session). This is independent of the inline YAML icon's later full
     retirement (``entity-tree-context-menu`` CR) — no inline button claim
     is made here.
   * AC-3: Double-click behaves identically (VS Code default).
   * AC-4: Making the node expandable (``collapsibleState = Collapsed``, per
     ``REQ_ENT_ENTITY_FILE_CHILDREN``) does not interfere with this binding —
     clicking the label still invokes ``jarvis.openAgentSession``; clicking
     the expand arrow only expands/collapses.


.. req:: Uniform Inline Icons (All Entities) — Superseded
   :id: REQ_ENT_ENTITY_ICONS
   :status: draft
   :priority: optional
   :links: US_ENT_ENTITYPARITY; REQ_ENT_OPENYAML; US_ENT_OPENCONTEXT; REQ_ENT_ENTITY_CONTEXTMENU

   **Description:**
   **Superseded by ``entity-tree-context-menu`` CR.** This requirement
   previously mandated uniform ``$(go-to-file)``/``$(notebook)`` inline icons
   on all three entity types. Both inline icons are now removed from all
   entity root nodes (``REQ_ENT_OPENYAML`` AC-2, ``REQ_ENT_OPENCONTEXT``
   AC-1) — context.md/YAML/agent-file are reachable via the entity's
   expandable file children (``REQ_ENT_ENTITY_FILE_CHILDREN``) and the new
   right-click context menu (``REQ_ENT_ENTITY_CONTEXTMENU``). Kept (not
   deleted) for historical traceability since no active element currently
   references it as a functional dependency (zero incoming links).

   **Acceptance Criteria:**

   * AC-1: **Retired.** No entity root node (Project/Event/Actor) SHALL show
     any inline icon.
   * AC-2: **Retired.** (was: uniform ``$(notebook)`` inline icon)
   * AC-3: **Retired.** (was: inline icon left-to-right ordering)
   * AC-4: **Retired.** (was: "Actor nodes already have these")
   * AC-5: No ``$(record)`` inline icon SHALL appear on any entity tree item,
     regardless of whether a ``recording/`` subfolder exists in the entity
     folder — this constraint is independent of the other 4 ACs and remains
     in force.


.. req:: Entity Tree Context Menu — Open / Copy Path / Copy Full Path
   :id: REQ_ENT_ENTITY_CONTEXTMENU
   :status: draft
   :priority: optional
   :links: US_ENT_ENTITYPARITY; US_ENT_ENTITY_FILES_TREE; US_ENT_OPENCONTEXT; REQ_ENT_ENTITY_FILE_CHILDREN; REQ_ENT_ENTITY_TREECLICK; REQ_ENT_AGENTSESSION; REQ_ENT_OPENYAML; REQ_ENT_OPENCONTEXT; REQ_EXP_TREEVIEW; REQ_MSG_EDITORPLACEMENT

   **Description:**
   Right-clicking (a) a file-child tree node (``context.md``/YAML/agent
   file, per ``REQ_ENT_ENTITY_FILE_CHILDREN``) or (b) a Project/Event/Actor
   entity root node SHALL show a context menu with 3 entries: **Open**,
   **Copy Path**, **Copy Full Path**. This replaces the two inline icons
   retired by ``REQ_ENT_OPENYAML``/``REQ_ENT_OPENCONTEXT`` with a single,
   consistent right-click surface across both node kinds.

   **Acceptance Criteria:**

   * AC-1: **Open** (file-child nodes): invokes the existing
     ``jarvis.openEntityFile`` command (``REQ_ENT_ENTITY_FILE_CHILDREN``) —
     identical behavior to left-clicking the node, now also reachable via
     right-click.
   * AC-2: **Open** (entity root nodes): invokes the existing
     ``jarvis.openAgentSession`` command (``REQ_ENT_AGENTSESSION``) —
     identical behavior to left-clicking the node (``REQ_ENT_ENTITY_TREECLICK``),
     now also reachable via right-click.
   * AC-3: **Copy Path**: copies the absolute OS filesystem path of the
     *containing folder* to the clipboard — no filename. For a file-child
     node this is the directory containing the file; for an entity root
     node this is the entity's own folder.
   * AC-4: **Copy Full Path**: copies the absolute OS filesystem path
     *including filename* to the clipboard. For a file-child node this is
     the file's own path. For an entity root node, which has no filename,
     this SHALL resolve to the same value as Copy Path (AC-3) — both
     entries remain visible for menu consistency across node kinds rather
     than conditionally hiding one on root nodes.
   * AC-5: Both Copy Path and Copy Full Path SHALL use the full absolute OS
     path (not workspace-relative), per explicit user preference.
   * AC-6: The context menu SHALL appear for ``contextValue`` values
     ``jarvisProject``, ``jarvisEvent``, ``jarvisSession`` (root nodes) and
     ``jarvisEntityFile`` (file children).
   * AC-7: Folder/category nodes (``contextValue = 'jarvisFolder'``) SHALL
     NOT show the 3-entry Open/Copy Path/Copy Full Path menu — they show a
     separate, single-entry menu instead (AC-9, ``ui-improvements`` CR).
   * AC-8: The Copy Path / Copy Full Path commands SHALL NOT appear in the
     Command Palette (they require a tree node argument).
   * AC-9 (``ui-improvements`` CR): Folder/category nodes SHALL show a
     single-entry right-click context menu: **Copy**, which copies the
     node's display name (the category/grouping label shown in the tree,
     e.g. a subfolder name under Projects/Events/Actors) to the clipboard —
     not a filesystem path. This is a distinct, smaller menu from AC-1–AC-8;
     it does not gain Open/Copy Path/Copy Full Path.
   * AC-10 (``ui-improvements`` CR): File-child nodes (``jarvisEntityFile``)
     gain a 4th right-click entry, **Copy File Name**, which copies the
     bare filename (e.g. ``context.md``, ``project.yaml``) to the clipboard
     — no path, full or partial. Entity root nodes do **not** gain this
     entry (they have no filename — see AC-4).
   * AC-11 (``ui-improvements`` CR): When **Open** (AC-1) is invoked on the
     ``context.md`` file-child node specifically, the file SHALL open via
     VS Code's rendered Markdown preview rather than the raw text editor,
     still honoring the Docs (column 2) placement guarantee on first open
     (``REQ_MSG_EDITORPLACEMENT`` AC-2) — the preview is opened with an
     explicit target column rather than silently bypassing placement.
     ``session.yaml``/convention-YAML and the agent-file file-child nodes
     SHALL continue to open as raw text (structured/code-like content, not
     meant to be rendered) — the distinction is by exact basename match
     (``context.md``), not by file extension, since the agent-file child is
     also a ``.md`` file (``*.agent.md``) and must NOT be rendered.

   **Decisions:**

   * (``ui-improvements`` CR) AC-9's "Copy" copies the folder node's
     *display name*, not its filesystem path — unlike file-child/root-node
     Copy Path/Copy Full Path (AC-3/AC-4), a category/grouping node's most
     useful clipboard payload is the label itself (e.g. for pasting into a
     chat prompt or search), not its path; a path-copy variant was not
     requested and would duplicate AC-3's mechanism for a node kind that
     wasn't in this CR's scope.
   * (``ui-improvements`` CR) AC-11's file check is an exact basename match
     (``context.md``), not an extension check — the agent-file file-child
     is also markdown (``*.agent.md``) but must stay as raw text, so
     extension alone cannot distinguish the two; deliberately narrow and
     explicit rather than inferring "render all markdown."

   * ``jarvis.openContext`` and ``jarvis.openYamlFile`` are **not** reused as
     the "Open" handler for entity root nodes — the root node's established
     primary interaction is click-to-chat (``jarvis.openAgentSession``,
     ``REQ_ENT_ENTITY_TREECLICK``), and "Open" on right-click mirrors that
     existing behavior for discoverability, rather than introducing a
     second, different meaning of "open" for the same node.
   * Consequence, resolved (PM decision, 2026-07-02): with their inline
     placement removed and no new caller assigned, ``jarvis.openContext``
     and ``jarvis.openYamlFile`` had zero remaining callers. Per the
     project's established no-permanent-stub practice (e.g.
     ``entity-open-context-cleanup`` retiring ``jarvis.openSessionContext``),
     PM decided to retire both **in this CR** rather than defer to a
     follow-up — see ``REQ_ENT_OPENYAML``/``REQ_ENT_OPENCONTEXT`` (now fully
     "Retired") and ``SPEC_ENT_OPENYAML_CMD``/``SPEC_ENT_OPENCONTEXT_CMD``
     for the transparent retirement record. Full code removal
     (``package.json`` + ``extension.ts``) is Dev Engineer's task in this
     same CR.


.. req:: Entity File Children in Tree
   :id: REQ_ENT_ENTITY_FILE_CHILDREN
   :status: approved
   :priority: mandatory
   :links: US_ENT_ENTITY_FILES_TREE; US_ACT_ACTORS; US_ENT_ENTITYPARITY; REQ_EXP_TREEVIEW; REQ_MSG_EDITORPLACEMENT

   **Description:**
   Actor, Project, and Event tree leaf nodes SHALL be expandable and show
   up to 3 file children: ``context.md``, the entity's YAML config file, and
   the agent file (when configured). This is purely additive to existing
   leaf-node behavior — inline icons and click-to-chat semantics are
   unchanged (see ``REQ_ENT_ENTITY_TREECLICK`` AC-4, ``REQ_ACT_TREECLICK``
   AC-7, ``REQ_EXP_TREEVIEW`` AC-11).

   **Acceptance Criteria:**

   * AC-1: Every project, event, and actor leaf node SHALL have
     ``collapsibleState = Collapsed``.
   * AC-2: Each entity leaf node's children SHALL be, in order: ``context.md``,
     the YAML config file (``project.yaml`` / ``event.yaml`` / ``session.yaml``),
     and the agent file.
   * AC-3: The agent file child SHALL be omitted when the entity has no
     configured agent file (fail-open, no error).
   * AC-4: Each file child ``TreeItem`` SHALL have ``tooltip`` set to the full
     absolute filesystem path of that file.
   * AC-5: Each file child ``TreeItem.command`` SHALL open that file in the
     VS Code editor (``preview: false``), targeting the Docs placement
     column (view column 2, fixed — ``REQ_MSG_EDITORPLACEMENT`` AC-2). If
     the file is already open in a different column (including one the
     user moved it to manually), the existing tab SHALL be focused in
     place rather than moved (``REQ_MSG_EDITORPLACEMENT`` AC-4).
   * AC-6: File child nodes SHALL have ``collapsibleState = None`` (no further
     descent) and a distinct ``contextValue`` (e.g. ``jarvisEntityFile``) so
     they are excluded from entity-node context-menu actions.
   * AC-7: File children SHALL be shown regardless of whether the target file
     currently exists on disk; missing-file click behavior is specified at
     Level 2 design.



