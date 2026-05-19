Sessions Requirements
=====================

.. req:: Sessions Feature Toggle
   :id: REQ_SES_TOGGLE
   :status: implemented
   :priority: required
   :links: US_SES_SESSIONS

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
   :id: REQ_SES_SCHEMA
   :status: implemented
   :priority: required
   :links: US_SES_SESSIONS

   **Description:**
   A ``session.yaml`` file SHALL serve as the leaf marker for a session entity.

   **Acceptance Criteria:**

   * AC-1: The schema SHALL require exactly one field: ``name`` (string).
   * AC-2: The schema SHALL allow one optional field: ``summary`` (string).
   * AC-3: No additional properties SHALL be permitted (``additionalProperties:
     false``).
   * AC-4: A JSON Schema file at ``schemas/session.schema.json`` (draft-07)
     SHALL describe the schema.
   * AC-5: ``package.json`` ``contributes.yamlValidation`` SHALL include an
     entry that binds ``session.yaml`` to ``./schemas/session.schema.json``,
     analogous to existing ``project.yaml`` and ``event.yaml`` entries.


.. req:: Sessions Tree View
   :id: REQ_SES_TREE
   :status: implemented
   :priority: required
   :links: US_SES_SESSIONS

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


.. req:: newEntity Command — Session Support
   :id: REQ_SES_NEWENTITY
   :status: implemented
   :priority: required
   :links: US_SES_SESSIONS

   **Description:**
   The existing ``jarvis.newEntity`` command SHALL offer "Session" as a third
   QuickPick option alongside "Project" and "Event".

   **Acceptance Criteria:**

   * AC-1: When the user selects "Session", a prompt SHALL ask for the session
     name.
   * AC-2: The extension SHALL create a new folder named after the session under
     the fixed path ``<workspaceRoot>/.jarvis/sessions/``, creating it on demand
     if absent.
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


.. req:: jarvis_listSessionEntities LM+MCP Tool
   :id: REQ_SES_LISTTOOL
   :status: implemented
   :priority: required
   :links: US_SES_SESSIONS

   **Description:**
   A new Language Model and MCP tool ``jarvis_listSessionEntities`` SHALL return
   the array of session entities known to the scanner.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL return a JSON object ``{ "sessions": [...] }`` where
     each element has ``name``, ``summary`` (may be empty string), and
     ``folder`` (absolute filesystem path to the session directory, forward
     slashes).
   * AC-2: The tool SHALL be registered only when ``jarvis.sessions.enabled``
     is ``true``.
   * AC-3: The tool SHALL be distinct from ``jarvis_listSessions`` (which lists
     VS Code chat sessions). Both MAY be active simultaneously.
   * AC-4: The tool SHALL appear in the VS Code Chat tool picker with
     ``toolReferenceName`` ``listSessionEntities``.


.. req:: Session Tree-Node Context Menu Parity
   :id: REQ_SES_CONTEXTMENU
   :status: implemented
   :priority: required
   :links: US_SES_SESSIONS

   **Description:**
   Session tree leaf nodes (``contextValue: jarvisSession``) SHALL expose the same
   context-menu actions as Project and Event leaf nodes.

   **Acceptance Criteria:**

   * AC-1: The context menu for a ``jarvisSession`` node SHALL contain **Open Context**
     (``jarvis.openContext``, inline group).
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
     ``viewItem == jarvisSession``.


.. req:: Agent-Session Identity Prompt
   :id: REQ_SES_AGENTPROMPT
   :status: implemented
   :priority: required
   :links: US_SES_SESSIONS

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


.. req:: openContext on Session Nodes
   :id: REQ_SES_OPENCONTEXT
   :status: implemented
   :priority: required
   :links: US_SES_SESSIONS

   **Description:**
   The existing ``jarvis.openContext`` command SHALL work on session tree nodes.

   **Acceptance Criteria:**

   * AC-1: When invoked on a ``jarvisSession`` node, the command SHALL open the
     ``context.md`` file located in the same folder as ``session.yaml``.
   * AC-2: The file SHALL open in the editor (preview:false), analogous to the
     behaviour for project and event nodes.
   * AC-3: The ``jarvis.openContext`` command SHALL handle a session tree node
     argument identically to a project node, dispatching on the ``folder``
     property (verifiable by inspecting the tree item's
     ``command.arguments[0]`` shape).


.. req:: jarvis_createSession LM+MCP Tool
   :id: REQ_SES_CREATETOOL
   :status: implemented
   :priority: required
   :links: US_SES_CREATETOOL

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
