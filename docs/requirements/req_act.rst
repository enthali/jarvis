Sessions Requirements
=====================

.. req:: Sessions Feature Toggle
   :id: REQ_ACT_TOGGLE
   :status: implemented
   :priority: required
   :links: US_ACT_ACTORS

   **Description:**
   The extension SHALL provide a setting to control the Sessions feature:

   * ``jarvis.sessions.enabled`` (boolean, default ``true``) — master toggle.
     When ``false``, no Sessions tree view, ``jarvis.newEntity`` Session option,
     ``jarvis_listSessionEntities`` tool, or scanner path for sessions
     SHALL be active.

   The Sessions feature SHALL discover session entities under the fixed path
   ``<workspaceRoot>/.jarvis/sessions/`` (no user configuration). The directory
   is created on demand when a new Session is created via ``jarvis.newEntity``.

   **Acceptance Criteria:**

   * AC-1: When ``jarvis.sessions.enabled`` is ``false``, the ``jarvisSessions``
     tree view SHALL be hidden (``when``-clause evaluates to false).
   * AC-2: When the ``.jarvis/sessions/`` folder contains no session entities,
     the Sessions tree SHALL show an empty state (no nodes).
   * AC-3a: Changing ``jarvis.sessions.enabled`` triggers immediate view
     show/hide via VS Code's ``when``-clause re-evaluation (no reload
     required).


.. req:: Session Entity Schema
   :id: REQ_ACT_SCHEMA
   :status: implemented
   :priority: required
   :links: US_ACT_ACTORS

   **Description:**
   A ``session.yaml`` file SHALL serve as the leaf marker for a session entity.

   **Acceptance Criteria:**

   * AC-1: The schema SHALL require exactly one field: ``name`` (string).
   * AC-2: The schema SHALL allow optional fields: ``summary`` (string) and ``agent`` (string).
   * AC-3: No additional properties SHALL be permitted (``additionalProperties:
     false``).
   * AC-4: A JSON Schema file at ``schemas/session.schema.json`` (draft-07)
     SHALL describe the schema.
   * AC-5: ``package.json`` ``contributes.yamlValidation`` SHALL include an
     entry that binds ``session.yaml`` to ``./schemas/session.schema.json``,
     analogous to existing ``project.yaml`` and ``event.yaml`` entries.


.. req:: Sessions Tree View
   :id: REQ_ACT_TREE
   :status: implemented
   :priority: required
   :links: US_ACT_ACTORS

   **Description:**
   A new TreeView ``jarvisSessions`` SHALL display all session entities.

   **Acceptance Criteria:**

   * AC-1: The view SHALL appear in the ``jarvis-explorer`` sidebar container
     between the Projects view and the Events view.
   * AC-2: The view SHALL be gated on ``config.jarvis.sessions.enabled == true``
     (same ``when``-clause pattern as Projects and Events).
   * AC-3: Each leaf node SHALL have label equal to the session ``name`` field,
     tooltip equal to ``summary``, and ``contextValue`` of ``jarvisSession``.
   * AC-4: Session nodes SHALL be sorted alphabetically by name (case-insensitive).
   * AC-5: When the scanner refreshes, the Sessions tree SHALL refresh
     automatically.
   * AC-6: Session leaf nodes SHALL be expandable (``collapsibleState = Collapsed``)
     to show file children (see ``REQ_ENT_ENTITY_FILE_CHILDREN``). This does
     not change the leaf-node identity defined in AC-3.


.. req:: newEntity Command — Session Support
   :id: REQ_ACT_NEWENTITY
   :status: draft
   :priority: required
   :links: US_ACT_ACTORS

   **Description:**
   The existing ``jarvis.newEntity`` command SHALL offer "Session" as a third
   QuickPick option alongside "Project" and "Event".

   **Acceptance Criteria:**

   * AC-1: When the user selects "Session", a prompt SHALL ask for the session
     name.
   * AC-2: The extension SHALL create a new folder using the session name
     **verbatim** (no lowercase transformation, no slug, no character
     substitution) under the fixed path ``<workspaceRoot>/.jarvis/sessions/``,
     creating the parent directory on demand if absent.  The folder name is
     storage only; session identity is the ``name:`` field inside
     ``session.yaml``.
   * AC-3: Inside the new folder, the extension SHALL create ``session.yaml``
     with ``name`` and ``summary`` (empty) fields, and an empty ``context.md``.
   * AC-4: If no workspace is open, the command SHALL show a warning and abort.
   * AC-5: After creation the scanner SHALL be triggered to rescan so the new
     session appears in the tree immediately.
   * AC-6: A standalone ``jarvis.newSession`` command SHALL exist (icon ``$(add)``,
     hidden from the Command Palette). ``jarvis.newEntity`` Session branch SHALL
     delegate to ``jarvis.newSession`` — no duplicate creation logic.
   * AC-7: The Sessions view title SHALL show a ``+`` button bound to
     ``jarvis.newSession`` (``navigation@1`` group) and a **Rescan** button bound to
     ``jarvis.rescan`` (``navigation@3`` group).
   * AC-8: On successful creation the new Session SHALL be auto-opened as an agent
     chat session via ``jarvis.openAgentSession`` (no manual action required).
   * AC-9: Invalid session names (per the character set and dot-only and
     Windows reserved-name rules defined in ``SPEC_ACT_NEWENTITY`` step 5)
     SHALL be rejected via real-time inline validation in the name input box
     (``showInputBox`` ``validateInput`` callback).  The user SHALL receive
     immediate feedback and SHALL NOT be able to confirm an invalid name.  The
     name SHALL NOT be silently sanitized.


.. req:: jarvis_listSessions LM+MCP Tool
   :id: REQ_ACT_LISTTOOL
   :status: draft
   :priority: required
   :links: US_ACT_ACTORS

   **Description:**
   A Language Model and MCP tool ``jarvis_listSessions`` SHALL return
   the array of session entities known to the scanner (renamed from
   ``jarvis_listSessionEntities``).

   **Acceptance Criteria:**

   * AC-1: The tool SHALL return a JSON object ``{ "sessions": [...] }`` where
     each element has ``name``, ``summary`` (may be empty string),
     ``agent`` (may be empty string when no binding is set), and
     ``folder`` (absolute filesystem path to the session directory, forward
     slashes).
   * AC-2: The tool SHALL be registered only when ``jarvis.sessions.enabled``
     is ``true`` at activation time.  When the setting is ``false``, the tool
     SHALL be absent from both the LM tool catalog and the MCP tool catalog
     after extension reload.  Gating is static (activation-time only) per
     ADR ``tool-deregistration.md`` — no runtime add/remove.
   * AC-3: The tool SHALL be distinct from ``jarvis_listChatSessions`` (which
     lists VS Code chat tab titles). Both MAY be active simultaneously.
   * AC-4: The tool SHALL appear in the VS Code Chat tool picker with
     ``toolReferenceName`` ``listSessions``.


.. req:: Session Tree-Node Context Menu Parity
   :id: REQ_ACT_CONTEXTMENU
   :status: implemented
   :priority: required
   :links: US_ACT_ACTORS; REQ_ENT_ENTITY_CONTEXTMENU

   **Description:**
   Session tree leaf nodes (``contextValue: jarvisSession``) SHALL expose the same
   context-menu actions as Project and Event leaf nodes.

   **Acceptance Criteria:**

   * AC-1: The context menu for a ``jarvisSession`` node SHALL contain the
     right-click **Open** / **Copy Path** / **Copy Full Path** entries per
     ``REQ_ENT_ENTITY_CONTEXTMENU`` (entity-tree-context-menu CR). The
     earlier **Open Context** entry (``jarvis.openContext``, inline group)
     is **retired** — ``jarvis.openContext`` no longer exists (see
     ``REQ_ACT_OPENCONTEXT``, ``REQ_ENT_OPENCONTEXT``); "Open" on a
     ``jarvisSession`` node now invokes ``jarvis.openAgentSession``
     (``REQ_ENT_ENTITY_CONTEXTMENU`` AC-2), not a dedicated context.md command.
   * AC-2: The context menu SHALL contain **Open Agent Session**
     (``jarvis.openAgentSession``, inline group).
   * AC-3: The context menu SHALL contain **Reveal in Explorer**
     (``jarvis.revealInExplorer``, context-actions group).
   * AC-4: The context menu SHALL contain **Reveal in OS**
     (``jarvis.revealInOS``, context-actions group).
   * AC-5: The context menu SHALL contain **Open in Terminal**
     (``jarvis.openInTerminal``, context-actions group).
   * AC-6: All five command implementations are unchanged; only the
     ``when``-clauses in ``package.json`` are extended to include
     ``viewItem == jarvisSession``. (Historical — AC-1's command has since
     been retired per the note above; AC-2 through AC-5 remain accurate.)


.. req:: Agent-Session Identity Prompt
   :id: REQ_ACT_AGENTPROMPT
   :status: implemented
   :priority: required
   :links: US_ACT_ACTORS

   **Description:**
   When ``jarvis.openAgentSession`` creates a **new** chat session for any entity
   (project, event, or session), it SHALL send an identity prompt that establishes
   the agent's role, names the entity's persistent memory file, and instructs the
   agent to maintain it.

   **Acceptance Criteria:**

   * AC-1: The prompt SHALL begin with ``You are the <kind> "<name>".`` where
     ``<kind>`` is derived from ``entity.kind`` (``project | event | session``),
     defaulting to ``project`` for backwards compatibility.
   * AC-2: The prompt SHALL include the absolute path of the entity's
     ``context.md`` rendered as an inline code span (backtick-quoted), so the
     agent can locate the file unambiguously.
   * AC-3: The prompt SHALL instruct the agent to read ``context.md`` on session
     start to restore prior context and to update it with important decisions,
     plans, and findings as work proceeds.
   * AC-4: The identity-prompt behaviour SHALL apply uniformly to projects, events,
     and sessions — no per-kind divergence in wording structure.


.. req:: openContext on Session Nodes — Retired
   :id: REQ_ACT_OPENCONTEXT
   :status: implemented
   :priority: required
   :links: US_ACT_ACTORS; REQ_ENT_OPENCONTEXT

   **Retired (entity-tree-context-menu CR):** ``jarvis.openContext`` is fully
   retired (see ``REQ_ENT_OPENCONTEXT``) — the command no longer exists for
   any entity kind, including sessions/actors. ``context.md`` on a
   ``jarvisSession`` node is reachable via the entity's expandable file
   children (``jarvis.openEntityFile``, ``REQ_ENT_ENTITY_FILE_CHILDREN``)
   and the right-click "Open"/"Copy Path"/"Copy Full Path" menu
   (``REQ_ENT_ENTITY_CONTEXTMENU``).

   **Historical Description** (kept for traceability): the ``jarvis.openContext``
   command worked on session tree nodes, identically to project and event
   nodes.

   **Historical Acceptance Criteria:**

   * AC-1: (historical) When invoked on a ``jarvisSession`` node, the command
     opened the ``context.md`` file located in the same folder as
     ``session.yaml``.
   * AC-2: (historical) The file opened in the editor (``preview: false``),
     analogous to the behaviour for project and event nodes.
   * AC-3: (historical) The ``jarvis.openContext`` command handled a session
     tree node argument identically to a project node, dispatching on the
     ``folder`` property.


.. req:: jarvis_createSession LM+MCP Tool
   :id: REQ_ACT_CREATETOOL
   :status: implemented
   :priority: required
   :links: US_ACT_CREATETOOL

   **Description:**
   A new Language Model and MCP tool ``jarvis_createSession`` SHALL
   programmatically create a session entity under the fixed path
   ``<workspaceRoot>/.jarvis/sessions/<name>/``.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL be registered via ``registerDualTool()`` inside the
     ``if (sessions.enabled)`` activation block, and SHALL be absent when
     ``jarvis.sessions.enabled`` is ``false``.
   * AC-2: On a successful create, the tool SHALL:

     a. Create the directory ``<workspaceRoot>/.jarvis/sessions/<name>/`` where
        the folder name is the verbatim ``name`` parameter — no slug transformation.
     b. Write ``session.yaml`` containing the ``name`` field (always) and the
        ``summary`` field (only when the supplied summary is non-blank).
     c. Write an empty ``context.md`` containing only ``# <name>\n\n``.

   * AC-3: After creation, the tool SHALL call ``scanner.rescan()`` so the
     Sessions Tree refreshes within 2 seconds without a manual action.
   * AC-4: When ``initialMessage`` is provided, the tool SHALL enqueue it via
     ``appendMessage()`` using the session ``name`` as the destination and
     ``"jarvis_createSession"`` as the sender, after the folder is created and
     before the response is returned.  The message SHALL NOT be enqueued when
     the session already existed (idempotency guard).
   * AC-5: When a folder ``<workspaceRoot>/.jarvis/sessions/<name>/`` already
     exists, the tool SHALL return
     ``{ created: false, reason: "session \"<name>\" already exists; no action taken",
     path: ".jarvis/sessions/<name>" }`` without modifying any file or enqueuing
     any message.
   * AC-6: The tool SHALL validate ``name`` before attempting any filesystem
     operation.  An empty string or a string containing any of the characters
     ``/ \ : * ? " < > |`` or a null/control character SHALL result in a thrown
     error with message ``"invalid session name: <reason>"``; this error SHALL
     surface as an LM tool error for the LM path and as an MCP error for the
     MCP path.
   * AC-7: The tool SHALL appear in the VS Code Chat tool picker with
     ``toolReferenceName`` ``createSession``.
   * AC-8: The ``name`` MUST NOT be ``.`` or ``..``; on Windows it MUST NOT be
     a reserved device name (``CON``, ``PRN``, ``AUX``, ``NUL``,
     ``COM1``–``COM9``, ``LPT1``–``LPT9``, case-insensitive).
   * AC-9: If no workspace folder is open when the tool is invoked, the tool
     MUST raise an error whose message begins with
     ``"jarvis_createSession: no workspace open"``.
     This prefix MUST be distinct from ``"invalid session name:"`` so that
     LLM callers can unambiguously distinguish precondition failures
     (no workspace) from input-validation failures (bad name).
   * AC-10: Auto-open — After successful creation (``created: true``) the tool
     MUST trigger opening of the new session's agent chat via the
     ``jarvis.openAgentSession`` command, passing a ``LeafNode`` constructed as
     ``{ kind: 'leaf', id: path.join(targetPath, 'session.yaml') }``.
     The auto-delivery heartbeat loop (existing 5 s poll) is responsible for
     subsequently delivering any queued ``initialMessage`` into that chat.
     On idempotent skip (``created: false``), the tool MUST also trigger the
     same auto-open command so that the caller always receives an opened-session
     end-state regardless of which path was taken.
     Errors from the ``openAgentSession`` call MUST be logged at ``warn`` level
     and MUST NOT cause the tool to return an error (best-effort).


.. req:: Session Tree Inverted Click Semantics
   :id: REQ_ACT_TREECLICK
   :status: implemented
   :priority: required
   :links: US_ENT_ENTITYPARITY; REQ_ACT_OPENCONTEXT; REQ_ENT_ENTITY_CONTEXTMENU

   **Description:**
   The `jarvisSession` tree leaf node's primary action (single click) SHALL
   open the agent-chat editor. Opening `context.md` is reachable via the
   entity's expandable file children and the right-click context menu (see
   AC-2) — no dedicated command is introduced for Actor nodes.

   **Acceptance Criteria:**

   * AC-1: The `command` property of every `jarvisSession` `TreeItem` SHALL
     be bound to `jarvis.openAgentSession` (replacing the previous binding to
     `jarvis.openContext`).
   * AC-2: **Historical, superseded (entity-tree-context-menu CR):** an
     earlier revision of this AC stated `jarvis.openContext` "remains the
     inline `context.md` icon for `jarvisSession` nodes." `jarvis.openContext`
     is now fully retired (`REQ_ACT_OPENCONTEXT`, `REQ_ENT_OPENCONTEXT`) —
     `context.md` is reached via file children (`jarvis.openEntityFile`) and
     the right-click Open/Copy Path/Copy Full Path menu
     (`REQ_ENT_ENTITY_CONTEXTMENU`) instead. No separate Actor-specific
     command exists or is introduced.
   * AC-3: Double-click on a session node SHALL exhibit the same behaviour as
     single click. This is satisfied by VS Code's default TreeView mapping and
     requires no explicit implementation; it SHALL be verified in UAT only.
   * AC-4: **Historical, superseded (entity-tree-context-menu CR):** an
     earlier revision of this AC asserted all existing `view/item/context`
     menu entries for `viewItem == jarvisSession` "SHALL remain unchanged,"
     listing `jarvis.openContext` among them. `jarvis.openContext`'s entry is
     retired along with the command; the current menu entries are specified
     by `REQ_ACT_CONTEXTMENU` and `REQ_ENT_ENTITY_CONTEXTMENU`.
   * AC-5: **Historical, superseded (entity-tree-context-menu CR):**
     `jarvis.openContext`'s missing-file discovery behaviour (described here
     for Actor nodes, citing `entity-open-context-cleanup`'s
     `REQ_ENT_OPENCONTEXT` AC-2/AC-6) is moot — the command itself no longer
     exists. Kept for historical traceability only.
   * AC-6: Making the session node expandable (``collapsibleState = Collapsed``,
     per ``REQ_ENT_ENTITY_FILE_CHILDREN``) does not interfere with this
     binding — clicking the label still invokes ``jarvis.openAgentSession``;
     clicking the expand arrow only expands/collapses.

   **Retired (entity-open-context-cleanup CR):** the command
   `jarvis.openSessionContext` — introduced by an earlier revision of this
   REQ as a dedicated Actor inline-icon command with auto-create semantics —
   was never activated (its `package.json` menu binding shipped with
   `"when": "false"` and no code path ever invoked it programmatically). It
   is removed from the codebase entirely (not merged/kept as an alias) — see
   `entity-open-context-cleanup.md` for the Artefakt-Removal-Check.

.. req:: Session Agent Field
   :id: REQ_ACT_AGENT_FIELD
   :status: implemented
   :priority: required
   :links: US_ENT_ENTITYPARITY

   **Description:**
   The session entity schema, YAML scanner, and tool output SHALL support an
   optional ``agent`` field that records the VS Code chat-mode name bound to a
   session.

   **Acceptance Criteria:**

   * AC-1: ``schemas/session.schema.json`` SHALL declare an optional
     ``agent`` property (type ``string``) so YAML editors provide
     completion and inline documentation.
   * AC-2: ``src/yamlScanner.ts`` ``EntityEntry`` interface SHALL gain an
     optional ``agent?: string`` field.  The scanner SHALL read the ``agent``
     field from ``session.yaml`` and store it in the entity when the value is
     a non-empty string.  A missing or non-string value SHALL result in
     ``undefined`` (no error).
   * AC-3: The ``jarvis_listSessionEntities`` tool output SHALL include
     ``agent`` (as ``""`` when absent) alongside the existing ``name``,
     ``summary``, and ``folder`` fields, so that LLM callers can inspect
     existing bindings.


.. req:: Agent Picker at Session Creation
   :id: REQ_ACT_AGENT_PICKER
   :status: draft
   :priority: required
   :links: US_ENT_ENTITYPARITY; REQ_ACT_NEWENTITY

   **Description:**
   The ``jarvis.newSession`` command SHALL present an optional agent picker after
   the summary prompt.

   **Acceptance Criteria:**

   * AC-1: After prompting for ``name`` and ``summary``, the command SHALL
     display a QuickPick populated with: a "No agent" entry (yields
     ``agent: ""`` in ``session.yaml``) and one entry per user-invocable
     agent discovered under ``.github/agents/`` (see ``REQ_ACT_AGENT_DISCOVERY``).
   * AC-2: If the user dismisses the picker (Escape / window close), the
     command SHALL abort; no folder, ``session.yaml``, or ``context.md`` SHALL
     be created.
   * AC-3: If the user selects "No agent", ``agent: ""`` SHALL be
     written to ``session.yaml``.  A chat editor SHALL be opened via
     ``openNewChatEditor()`` without mode-prime (VS Code default mode).
   * AC-4: If the user selects a named agent, that agent's identity (per
     ``REQ_ACT_AGENT_DISCOVERY`` AC-7) SHALL be written to ``session.yaml``
     as ``agent: "<identity>"``.  The identity is used verbatim; it may
     contain spaces (e.g., ``"Change Manager"``).  The chat editor SHALL be
     opened via mode-prime + ``openNewChatEditor()``.
   * AC-5: The picker SHALL show agent names alphabetically, with "No agent"
     always first.


.. req:: Agent Discovery Mechanism
   :id: REQ_ACT_AGENT_DISCOVERY
   :status: draft
   :priority: required
   :links: US_ENT_ENTITYPARITY; REQ_ACT_AGENT_PICKER; REQ_ACT_AGENT_CREATETOOL

   **Description:**
   The set of available agents SHALL be determined at runtime by scanning
   ``.github/agents/`` in the current workspace for agent definition files.

   **Acceptance Criteria:**

   * AC-1: The discovery function SHALL scan all ``*.agent.md`` files in
     ``<workspaceRoot>/.github/agents/``.
   * AC-2: A file is INCLUDED in the valid set UNLESS its YAML frontmatter
     explicitly contains ``user-invocable: false``.
     Files without a ``user-invocable`` key, files without frontmatter at all,
     and files with ``user-invocable: true`` SHALL all be INCLUDED.
     Only an explicit ``user-invocable: false`` SHALL exclude the file.
   * AC-3: When no frontmatter ``name`` key is set (or the value is blank),
     the agent identifier SHALL be the file basename without the ``.agent.md``
     suffix (e.g., ``syspilot.cm.agent.md`` → ``syspilot.cm``).  See AC-7 for
     the complete identity rule.
   * AC-4: If the ``.github/agents/`` directory does not exist or is unreadable,
     the function SHALL return an empty list without error.
   * AC-5: The returned list SHALL be sorted alphabetically by agent identifier.
   * AC-6: Discovery is performed on-demand (at picker-open time and at
     validation time); no persistent cache is maintained.
   * AC-7: The agent identifier SHALL be determined as follows: if the agent
     file's YAML frontmatter contains a ``name`` key whose value is a non-empty
     string, the identifier is that value trimmed of leading and trailing
     whitespace; otherwise, the identifier is the filename basename without the
     ``.agent.md`` suffix.  This identifier is used for picker labels,
     ``session.yaml agent:`` field values, and the ``mode:`` parameter of
     ``workbench.action.chat.open``.


.. req:: jarvis_createSession Agent Parameter
   :id: REQ_ACT_AGENT_CREATETOOL
   :status: draft
   :priority: required
   :links: US_ENT_ENTITYPARITY; REQ_ACT_CREATETOOL

   **Description:**
   The ``jarvis_createSession`` tool SHALL accept an optional ``agent``
   parameter and write it to ``session.yaml`` when provided and valid.

   **Acceptance Criteria:**

   * AC-1: The tool input schema SHALL include an optional ``agent`` parameter
     (type ``string``).
   * AC-2: When ``agent`` is blank or absent, the tool SHALL behave exactly as
     before (no ``agent`` field in ``session.yaml``); no validation runs.
   * AC-3: When ``agent`` is non-blank, the tool SHALL validate it against the
     set of available agent identities (per ``REQ_ACT_AGENT_DISCOVERY`` AC-7)
     **before** any filesystem operation.  The supplied value must exactly match
     an identity string from the discovery result (frontmatter name or filename
     stem, as applicable).  If the value is unknown, the tool SHALL throw an
     error (see ``REQ_ACT_AGENT_VALIDATION``); the session folder SHALL NOT be
     created.
   * AC-4: When ``agent`` is non-blank and valid, the tool SHALL write
     ``agent: "<name>"`` to ``session.yaml`` after ``summary`` (if present).
   * AC-5: Both the LM and MCP handler paths SHALL enforce AC-3 identically.
   * AC-6: The ``package.json`` ``contributes.languageModelTools`` input schema
     for ``jarvis_createSession`` SHALL be updated to include the ``agent``
     field with a clear description.


.. req:: Agent Validation Error Contract
   :id: REQ_ACT_AGENT_VALIDATION
   :status: implemented
   :priority: required
   :links: US_ENT_ENTITYPARITY; REQ_ACT_AGENT_CREATETOOL

   **Description:**
   The error thrown by ``jarvis_createSession`` when an unknown agent name is
   supplied SHALL be self-contained enough for the calling agent to correct
   the invocation immediately.  The contract mirrors ``REQ_MSG_DEST_ERROR``.

   **Acceptance Criteria:**

   * AC-1: The error message SHALL state that the supplied agent is not
     available, quoting the supplied name verbatim.
   * AC-2: The error message SHALL list all currently available agent names
     in alphabetically sorted order.
   * AC-3: If the available set is empty (no user-invocable agents discovered),
     the error SHALL indicate this explicitly rather than showing an empty list.
   * AC-4: The error message template SHALL be::

        Agent "${agent}" is not available.
        Available agents: ${names}

     where ``${agent}`` is the supplied (invalid) value and ``${names}`` is the
     alphabetically sorted list of available agent names joined with ``", "``; if
     the set is empty ``${names}`` is the literal ``"(none)"``.
   * AC-5: The error SHALL be raised as a JavaScript ``Error`` object so that
     both the VS Code LM tool invocation path and the MCP handler surface the
     message text to the caller unchanged.


.. req:: Open Session with Bound Agent
   :id: REQ_ACT_AGENT_OPEN
   :status: implemented
   :priority: required
   :links: US_ENT_ENTITYPARITY; REQ_ENT_AGENTSESSION

   **Description:**
   When ``jarvis.openAgentSession`` creates a new chat session for a session
   entity that has an ``agent`` binding, the chat editor SHALL open in that
   agent mode.

   **Acceptance Criteria:**

   * AC-1: On the new-session path (no existing UUID found), when
     ``entity.agent`` is set and non-empty, the ``workbench.action.chat.open``
     command SHALL be invoked with ``{ query: <initPrompt>, mode: entity.agent }``
     instead of ``{ query: <initPrompt> }``.
   * AC-2: When ``entity.agent`` is absent or empty, the existing behavior SHALL
     be preserved (no ``mode`` parameter).
   * AC-3: On the existing-session path (UUID found), the command opens the
     existing pinned tab unchanged; the ``agent`` binding is NOT re-applied
     (the chat mode was already set when the session was first created).
   * AC-4: If the ``mode`` value is unrecognised by VS Code (e.g. the agent was
     removed after binding), VS Code falls back to its default chat mode; no
     error is surfaced to the user by Jarvis.


.. req:: Session Agent Backward Compatibility
   :id: REQ_ACT_AGENT_COMPAT
   :status: implemented
   :priority: required
   :links: US_ENT_ENTITYPARITY; REQ_ACT_AGENT_FIELD; REQ_ACT_AGENT_OPEN

   **Description:**
   All existing ``session.yaml`` files that do not contain an ``agent`` field
   SHALL continue to work without any change in behaviour.

   **Acceptance Criteria:**

   * AC-1: When the scanner reads a ``session.yaml`` without an ``agent``
     field, ``EntityEntry.agent`` SHALL be ``undefined`` — no error, no default
     value inserted.
   * AC-2: When ``jarvis.openAgentSession`` is invoked for an entity with
     ``agent === undefined``, the command SHALL follow the existing path
     unchanged (no ``mode`` passed to ``workbench.action.chat.open``).
   * AC-3: The ``jarvis_listSessionEntities`` tool SHALL return ``agent: ""``
     for entities without an ``agent`` field (empty-string sentinel for
     forward compatibility) — callers MUST treat ``""`` as "no binding".
   * AC-4: No migration step is required; the ``additionalProperties: false``
     constraint in the schema is relaxed by adding ``agent`` as an explicitly
     permitted property — existing files without the field remain valid.

   .. note::

      **Backward-compat note (v0.6.0 filename-stem values):** Existing
      ``session.yaml`` files written by v0.6.0 that store a filename-stem
      value in the ``agent`` field (e.g. ``agent: syspilot.cm``) continue to
      resolve correctly when the corresponding agent file has no ``name:``
      frontmatter key, because per ``SPEC_ACT_AGENT_DISCOVERY`` the effective
      identity is ``name?.trim() || filename-stem``.  See
      ``SPEC_ACT_AGENT_DISCOVERY`` for the identity-drift edge case (out of
      scope for this CR).
