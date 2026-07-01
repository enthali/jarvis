Jarvis Entity Requirements
==========================

Generic, user-facing cross-kind requirements (Project / Event / Actor). See
``docs/namingconventions.rst`` for the theme placement rule (``ENT`` =
generic/user-facing, ``ENG`` = kind-agnostic plumbing, no US level).

.. req:: Open YAML from Tree Item
   :id: REQ_ENT_OPENYAML
   :status: implemented
   :priority: optional
   :links: US_ENT_OPENYAML

   **Description:**
   Project and event leaf items SHALL provide an inline action button that
   opens the associated YAML file in the VS Code editor.

   **Acceptance Criteria:**

   * AC-1: Project leaf items have ``contextValue = 'project'``;
     event leaf items have ``contextValue = 'event'`` (already the case)
   * AC-2: A ``view/item/context`` menu entry with ``when: viewItem == project``
     and a second entry with ``when: viewItem == event`` provide an inline
     ``$(go-to-file)`` button in group ``inline``
   * AC-3: The command opens the file via ``vscode.commands.executeCommand('vscode.open', uri)``
     where ``uri = vscode.Uri.file(element.id)``
   * AC-4: ``TreeItem.command`` is NOT set on leaf items (reserved for future detail view)
   * AC-5: Folder nodes (``contextValue = 'folder'``) have no inline button


.. req:: Open Agent Session from Tree
   :id: REQ_ENT_AGENTSESSION
   :status: draft
   :priority: optional
   :links: US_ENT_AGENTSESSION; US_MSG_STABLESESSION; REQ_MSG_SESSIONLOOKUP; REQ_ENT_OPENYAML; REQ_MSG_PINNED; REQ_MSG_OPENCHAT; REQ_ENT_AGENTPROMPT_TEMPLATE

   **Description:**
   Every project and event leaf item SHALL provide an inline action button that
   opens the agent chat session for that item. The session open/create mechanism
   is specified in ``US_MSG_STABLESESSION`` and its requirements.

   **Acceptance Criteria:**

   * AC-1: All project and event leaf items SHALL display an inline
     ``$(comment-discussion)`` button in addition to the existing
     ``$(go-to-file)`` button
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
   :links: US_ENT_OPENCONTEXT; REQ_ENT_OPENYAML; REQ_ENT_AGENTSESSION

   **Description:**
   Every project and event leaf item SHALL provide an inline action button that
   resolves and opens a ``context.md`` file using a 3-step discovery process.
   If no file is found, an information message SHALL be shown.

   **Acceptance Criteria:**

   * AC-1: All project and event leaf items SHALL display an inline
     ``$(notebook)`` button in addition to the existing ``$(go-to-file)`` and
     ``$(comment-discussion)`` buttons
   * AC-2: The resolution order SHALL be:

     1. Direct: ``<entityFolder>/context.md`` exists → open it
     2. Subfolder search: scan immediate subfolders (1 level deep) for
        ``context.md``; hidden folders (names starting with ``.``) SHALL be
        excluded
     3. Picker: if multiple matches are found in step 2, show
        ``vscode.window.showQuickPick`` with labels as relative paths
        (e.g. ``pm/context.md``); open the user's selection
     4. None found: show a non-blocking information message

   * AC-3: If exactly one subfolder match is found it SHALL be opened without
     showing a picker
   * AC-4: Hidden subfolders (names starting with ``.``) SHALL be excluded from
     the subfolder search
   * AC-5: The picker label SHALL be the relative path from the entity folder
     (e.g. ``pm/context.md``)
   * AC-6: If the file exists (step 1 or selected), it SHALL be opened using
     ``vscode.window.showTextDocument()``
   * AC-7: Folder nodes SHALL NOT display the button
   * AC-8: The command SHALL NOT appear in the Command Palette (it requires a
     tree element argument and would fail without one)


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
   (same behavior as ``REQ_ACT_TREECLICK`` for sessions). The existing
   ``$(go-to-file)`` inline button remains for opening the YAML.

   **Acceptance Criteria:**

   * AC-1: The ``command`` property of every project (``contextValue = 'project'``)
     and event (``contextValue = 'event'``) ``TreeItem`` SHALL be bound to
     ``jarvis.openAgentSession``.
   * AC-2: ``REQ_ENT_OPENYAML`` AC-4 is superseded: ``TreeItem.command`` is now
     set (to open agent session), and the YAML button remains as an inline icon.
   * AC-3: Double-click behaves identically (VS Code default).
   * AC-4: Making the node expandable (``collapsibleState = Collapsed``, per
     ``REQ_ENT_ENTITY_FILE_CHILDREN``) does not interfere with this binding —
     clicking the label still invokes ``jarvis.openAgentSession``; clicking
     the expand arrow only expands/collapses.


.. req:: Uniform Inline Icons (All Entities)
   :id: REQ_ENT_ENTITY_ICONS
   :status: draft
   :priority: optional
   :links: US_ENT_ENTITYPARITY; REQ_ENT_OPENYAML; US_ENT_OPENCONTEXT

   **Description:**
   All three entity types (Project, Event, Actor) SHALL show uniform inline
   icons: YAML and context.md.

   **Acceptance Criteria:**

   * AC-1: Every leaf node SHALL show a ``$(go-to-file)`` inline icon for opening
     the entity YAML file.
   * AC-2: Every leaf node SHALL show a ``$(notebook)`` inline icon for opening
     ``context.md``.
   * AC-3: Icon order (left to right): ``$(notebook)``, ``$(go-to-file)``.
   * AC-4: Actor nodes already have these; this requirement extends the same
     pattern to project and event nodes.
   * AC-5: No ``$(record)`` inline icon SHALL appear on any entity tree item,
     regardless of whether a ``recording/`` subfolder exists in the entity
     folder.


.. req:: Entity File Children in Tree
   :id: REQ_ENT_ENTITY_FILE_CHILDREN
   :status: approved
   :priority: mandatory
   :links: US_ENT_ENTITY_FILES_TREE; US_ACT_ACTORS; US_ENT_ENTITYPARITY; REQ_EXP_TREEVIEW

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
     VS Code editor (``preview: false``).
   * AC-6: File child nodes SHALL have ``collapsibleState = None`` (no further
     descent) and a distinct ``contextValue`` (e.g. ``jarvisEntityFile``) so
     they are excluded from entity-node context-menu actions.
   * AC-7: File children SHALL be shown regardless of whether the target file
     currently exists on disk; missing-file click behavior is specified at
     Level 2 design.



