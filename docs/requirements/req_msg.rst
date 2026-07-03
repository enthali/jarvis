Message Queue Requirements
==========================

.. req:: Message Queue Storage
   :id: REQ_MSG_QUEUE
   :status: implemented
   :priority: optional
   :links: US_MSG_CHATQUEUE; REQ_AUT_JOBEXEC; REQ_CFG_MSGPATH

   **Description:**
   The extension SHALL maintain a persistent JSON file as a message queue for
   chat messages to be delivered to named VS Code Chat sessions.

   **Acceptance Criteria:**

   * AC-1: Each message entry SHALL contain ``destination`` (target chat tab label),
     ``sender`` (originating session or component), ``text`` (message content),
     and ``timestamp`` (ISO 8601 string)
   * AC-2: The queue file SHALL be a JSON array of message entries
   * AC-3: Writing a new message SHALL append to the array without losing existing
     entries
   * AC-4: The queue file location SHALL be determined by ``REQ_CFG_MSGPATH``

.. req:: Message Tree Display
   :id: REQ_MSG_EXPLORER
   :status: implemented
   :priority: optional
   :links: US_MSG_CHATQUEUE; REQ_EXP_TREEVIEW; REQ_MSG_EDITORPLACEMENT

   **Description:**
   The Messages tree view SHALL display queued messages grouped by target session
   name.

   **Acceptance Criteria:**

   * AC-1: Messages SHALL be grouped under collapsible parent nodes labeled with
     the session name
   * AC-2: Each parent node SHALL display the count of pending messages as a
     suffix (e.g. ``My Session (3)``)
   * AC-3: Each child node SHALL display a truncated preview of the message text
   * AC-4: When the queue is empty, a single node with label ``nothing to deliver``
     SHALL be shown (per ``REQ_EXP_TREEVIEW`` AC-8)
   * AC-5 (``ui-improvements`` CR): Clicking a session group node's label
     SHALL open that session's chat at the Main placement target when a
     live session already exists for that destination, or SHALL be a
     silent no-op (no session created) otherwise — full behavior specified
     by ``REQ_MSG_EDITORPLACEMENT`` AC-10. The node remains expandable
     (AC-1) independent of this click binding, same pattern as
     ``REQ_ENT_ENTITY_TREECLICK`` AC-4 for entity leaf nodes.

.. req:: Send Messages to Chat Session
   :id: REQ_MSG_SEND
   :status: draft
   :priority: optional
   :links: US_MSG_CHATQUEUE; REQ_MSG_SESSIONLOOKUP; REQ_MSG_QUEUE; REQ_ENT_AGENTPROMPT_TEMPLATE; REQ_MSG_EDITORPLACEMENT

   **Description:**
   The extension SHALL provide a command to notify a VS Code Chat session about
   pending messages in its inbox.

   **Acceptance Criteria:**

   * AC-1: A send action SHALL be available on each session group node in the
     Messages tree view
   * AC-2: The extension SHALL focus the target chat tab before submitting
   * AC-3: The extension SHALL submit a single notification stub via
     ``workbench.action.chat.open({ query })`` informing the session about the
     number of pending messages and instructing it to read them via the
     ``jarvis_receiveMessage`` tool (message-api-rename CR — was
     ``jarvis_readMessage``; the underlying stub text is the same one governed
     by ``REQ_MSG_NOTIFICATION_TEMPLATE`` AC-7)
   * AC-4: Messages SHALL remain in the queue after notification — the session
     is responsible for consuming them via ``REQ_MSG_READ``
   * AC-5: The Messages tree view SHALL refresh after send completes
   * AC-6: The extension SHALL focus the target session via
     ``vscode.commands.executeCommand('vscode.open',
     Uri.parse('vscode-chat-session://local/<b64uuid>'), { viewColumn })``
     where the UUID is obtained from ``REQ_MSG_SESSIONLOOKUP`` and
     ``viewColumn`` is resolved per the Main placement target (AC-9,
     ``REQ_MSG_EDITORPLACEMENT``)
   * AC-7: If ``REQ_MSG_SESSIONLOOKUP`` returns ``undefined`` for the target
     session, the extension SHALL open a new editor chat via
     ``REQ_MSG_OPENCHAT`` instead of raising an error
   * AC-8: In the new-session branch (AC-7): if the matched entity has an
     ``agent`` field, the extension SHALL prime the VS Code Chat mode selector
     to ``entity.agent`` (via ``workbench.action.chat.open { mode }`` + 300 ms
     settle) **before** ``REQ_MSG_OPENCHAT`` creates the chat editor, so the new
     session inherits the bound mode at creation time. After ``REQ_MSG_OPENCHAT``
     creates the chat editor and the session is renamed to ``node.destination``,
     the extension SHALL look up the entity whose display name equals
     ``node.destination`` in the scanner entity store. If an entity is found, the
     extension SHALL send a context initialization prompt using the same template,
     placeholder substitution, and agent-mode binding as
     ``REQ_ENT_AGENTPROMPT_TEMPLATE`` — **before** sending the notification stub
     (AC-3). If no entity matches the destination name, the init prompt is skipped.
   * AC-9: The target chat tab (AC-2/AC-6) SHALL be focused at the Main
     placement target (view column 1, fixed), including the Main-target
     close+reopen rule when the tab is open in a different column
     (``REQ_MSG_EDITORPLACEMENT`` AC-1/AC-5/AC-9) — the same target used for
     an Actor tree click, since this command is likewise a user-initiated
     action.

.. req:: Delete Individual Message
   :id: REQ_MSG_DELETE
   :status: implemented
   :priority: optional
   :links: US_MSG_CHATQUEUE; REQ_MSG_QUEUE

   **Description:**
   The extension SHALL allow the user to delete a single queued message from the
   Messages tree view.

   **Acceptance Criteria:**

   * AC-1: Each message node SHALL have a trash-icon inline button
   * AC-2: Clicking the button SHALL remove the message entry from the queue file
   * AC-3: The Messages tree view SHALL refresh after deletion

.. req:: Session UUID Lookup via state.vscdb
   :id: REQ_MSG_SESSIONLOOKUP
   :status: approved
   :priority: optional
   :links: US_MSG_CHATQUEUE; US_MSG_REMOTECOMPAT

   **Description:**
   The extension SHALL resolve a chat session name to a VS Code Chat session UUID
   by querying the local ``state.vscdb`` SQLite database.

   **Acceptance Criteria:**

   * AC-1: The extension SHALL read
     ``ItemTable[key='chat.ChatSessionStore.index']`` from ``state.vscdb`` to
     obtain a mapping of session titles to UUIDs
   * AC-2: The lookup SHALL be a live database read each time — no caching
   * AC-3: If the session name is not found, the lookup SHALL return ``undefined``
     — callers decide the fallback behavior (e.g. open new chat, show notification)
   * AC-4: If multiple sessions share the same name, the extension SHALL use the
     first match and show a warning notification to the user
   * AC-5: The extension SHALL use ``sql.js`` (pure JS/WASM) to read the database
     file
   * AC-6: The lookup SHALL be workspace-scoped — the extension SHALL read from
     ``workspaceStorage/<hash>/state.vscdb`` (derived from ``context.storageUri``)
     rather than the global ``state.vscdb``, so only sessions belonging to the
     current VS Code window are visible
   * AC-7: The ``state.vscdb`` path SHALL be derived using
     ``context.globalStorageUri`` (always a local path) to remain correct in
     Remote and Devcontainer environments where ``context.storageUri.fsPath`` may
     point to a remote filesystem
   * AC-8: When ``state.vscdb`` is not found at the resolved path, the extension
     SHALL emit a warning via the Jarvis log channel and return an empty list
   * AC-9: When the extension runs in a standard (non-remote) workspace, the
     existing session lookup behavior SHALL be unaffected
   * AC-10: When the extension host runs in a **WSL2** environment, the module
     SHALL detect WSL2 by reading ``/proc/version`` and checking for the string
     ``"microsoft"`` (case-insensitive). It SHALL derive the Windows user data
     path as ``/mnt/c/Users/<USERNAME>/AppData/Roaming/Code/User`` where
     ``<USERNAME>`` is taken from the ``USERNAME`` environment variable. The
     workspace hash extraction is unchanged.
   * AC-11: ``lookupSessionUUID('My Session')`` SHALL return the correct UUID
     when VS Code is running in WSL2 remote mode with the workspace on the
     Linux filesystem


.. req:: Named Session Filter
   :id: REQ_MSG_SESSIONFILTER
   :status: implemented
   :priority: optional
   :links: US_MSG_OPENSESSION; US_MSG_LISTSESSIONS; REQ_MSG_SESSIONLOOKUP

   **Description:**
   The extension SHALL provide a shared filtering rule that excludes unnamed
   sessions from user-facing session lists.

   **Acceptance Criteria:**

   * AC-1: A session is considered "named" if its title is a non-empty string
   * AC-2: Sessions with an empty or missing title SHALL be excluded from the
     results of any session enumeration feature
   * AC-3: The filter SHALL be applied consistently by both the Open Session
     command (``REQ_MSG_OPENSESSION``) and the List Sessions LM Tool
     (``REQ_MSG_LISTSESSIONS``)


.. req:: Open Chat Session Command
   :id: REQ_MSG_OPENSESSION
   :status: implemented
   :priority: optional
   :links: US_MSG_OPENSESSION; REQ_MSG_SESSIONLOOKUP; REQ_MSG_SESSIONFILTER

   **Description:**
   The extension SHALL provide a command that lets the user browse and open a
   named chat session via a QuickPick dialog.

   **Acceptance Criteria:**

   * AC-1: A VS Code command ``jarvis.openSession`` SHALL open a QuickPick
     listing all named sessions in the current workspace
   * AC-2: The session list SHALL be filtered by ``REQ_MSG_SESSIONFILTER``
   * AC-3: Selecting a session SHALL open it in the editor via
     ``vscode.open(Uri.parse('vscode-chat-session://local/<b64uuid>'))``
     where the UUID is obtained from ``REQ_MSG_SESSIONLOOKUP``
   * AC-4: If no named sessions exist, the extension SHALL show an informational
     notification and not open the QuickPick
   * AC-5: If the selected session can no longer be resolved at open time, the
     extension SHALL show an informational notification


.. req:: List Chat Sessions LM Tool
   :id: REQ_MSG_LISTSESSIONS
   :status: draft
   :priority: optional
   :links: US_MSG_LISTSESSIONS; REQ_MSG_SESSIONLOOKUP; REQ_MSG_SESSIONFILTER

   **Description:**
   The extension SHALL register a Language Model Tool that returns the list of
   named VS Code chat sessions (tab titles) in the current workspace.

   **Acceptance Criteria:**

   * AC-1: A Language Model Tool named ``jarvis_listChatSessions`` SHALL be
     registered via ``vscode.lm.registerTool`` with
     ``canBeReferencedInPrompt: true`` (renamed from ``jarvis_listSessions``
     which now refers to YAML session entities)
   * AC-2: The tool SHALL return the list of session titles (strings) from the
     current workspace's ``state.vscdb``
   * AC-3: The returned list SHALL be filtered by ``REQ_MSG_SESSIONFILTER``
   * AC-4: If no named sessions exist, the tool SHALL return an empty list


.. req:: List Jarvis Sessions LM Tool
   :id: REQ_MSG_JARVISSESSIONS
   :status: draft
   :priority: optional
   :links: US_MSG_JARVISSESSIONS; REQ_ENG_SESSIONLIST

   **Description:**
   The extension SHALL register a Language Model / MCP Tool that returns all
   Jarvis sessions across every registered kind, wrapping the platform API method
   ``JarvisCoreApi.listJarvisSessions()`` (REQ_ENG_SESSIONLIST).

   **Acceptance Criteria:**

   * AC-1: A tool named ``jarvis_listJarvisSessions`` SHALL be registered via the
     engine's ``registerTool`` so it is available both as an LM Tool
     (``canBeReferencedInPrompt: true``) and as an MCP Tool (dual registration).
   * AC-2: The tool SHALL return the result of
     ``JarvisCoreApi.listJarvisSessions()`` — one entry per scanned entity across
     all registered kinds, each with ``{name, summary, agent, kind, folder}``.
   * AC-3: The tool SHALL require no input parameters.
   * AC-4: If the scanner holds no entities, the tool SHALL return an empty list.


.. req:: Read Message LM Tool
   :id: REQ_MSG_READ
   :status: deprecated
   :priority: mandatory
   :links: US_MSG_CHATQUEUE; REQ_MSG_QUEUE

   **Deprecated by:** ``REQ_MSG_RECEIVEMESSAGE`` (message-api-rename CR).
   **Hard deprecation (PM design pivot, 2026-07-03):** soft deprecation (tool
   stays functional, returns a warning) was tried first and observed to fail
   in practice — agents kept calling the deprecated tool and ignored the
   warning. The tool now SHALL remain **registered** (so callers still get a
   discoverable, named error) but SHALL be **functionally inert**: every
   invocation ends in an error and no message is ever popped from the queue.
   Full removal of the registration itself remains GH Issue #13 (separate
   future change, earliest 2026-09-30).

   **Description:**
   The extension SHALL keep ``jarvis_readMessage`` registered as a Language
   Model Tool for discoverability, but every invocation SHALL immediately
   fail with a deprecation error — no queue pop, no tree refresh, no other
   side effect of any kind.

   **Acceptance Criteria:**

   * AC-1: A Language Model Tool named ``jarvis_readMessage`` SHALL remain
     registered via ``vscode.lm.registerTool`` with
     ``canBeReferencedInPrompt: true``
   * AC-2: The tool SHALL continue to accept its existing ``destination``
     parameter unchanged at the schema level, so existing callers do not fail
     schema validation before reaching the handler
   * AC-3: Every invocation, regardless of input, SHALL throw an error
     (not return the previous ``{ message, remaining }`` payload) with the
     exact text::

        This tool is deprecated and no longer functional. Use jarvis_receiveMessage instead.

   * AC-4: No message SHALL ever be popped from the queue by this tool —
     there is no valid input that produces a side effect
   * AC-5: The queue-pop behaviour, ``{ message, remaining }`` response shape,
     and Messages-tree refresh (former AC-3 through AC-6) are SUPERSEDED and
     no longer apply — the handler short-circuits to the error in AC-3 before
     any of that logic would run
   * AC-6: The tool's ``modelDescription`` SHALL be prefixed with
     ``"[DEPRECATED AND DISABLED — use jarvis_receiveMessage instead.]"`` so
     the deprecation is visible at tool-discovery time, before any invocation
     attempt


.. req:: Embedded MCP Server
   :id: REQ_MSG_MCPSERVER
   :status: implemented
   :priority: mandatory
   :links: US_MSG_MCPSERVER

   **Description:**
   The extension SHALL embed an MCP (Model Context Protocol) server that exposes
   all registered LM Tools as MCP Tools via HTTP/SSE on localhost.

   **Acceptance Criteria:**

   * AC-1: The extension SHALL start an HTTP/SSE MCP server on ``127.0.0.1``
     during activation when ``jarvis.mcpEnabled`` is ``true``
   * AC-2: The MCP server SHALL use the ``@modelcontextprotocol/sdk`` package
     with ``StreamableHTTPServerTransport``
   * AC-3: Each LM Tool SHALL be simultaneously registered as an MCP Tool with
     the same name, input schema, and equivalent handler logic
   * AC-4: MCP tool handlers SHALL return JSON objects (not
     ``LanguageModelToolResult``)
   * AC-5: The MCP server SHALL stop cleanly during extension deactivation
   * AC-6: The MCP server SHALL only bind to ``127.0.0.1`` — not ``0.0.0.0``
     or any external interface
   * AC-7: A status bar item SHALL display ``Jarvis MCP: <port>`` when the
     server is running; the item SHALL be hidden when MCP is disabled
   * AC-8: If ``jarvis.mcpEnabled`` is ``false``, the MCP server SHALL not
     start and the status bar item SHALL not be shown


.. req:: Auto-Delivery Configuration Store
   :id: REQ_MSG_AUTODELIVER_CONFIG
   :status: implemented
   :priority: optional
   :links: US_MSG_AUTODELIVERY; REQ_MSG_QUEUE

   **Description:**
   The extension SHALL maintain a persistent JSON file ``autodelivery.json``
   co-located with ``messages.json`` that stores the list of session names
   for which auto-delivery is enabled.

   **Acceptance Criteria:**

   * AC-1: The file SHALL be a JSON array of strings (session destination names)
   * AC-2: The file SHALL be located in the same directory as ``messages.json``
     (derived from ``resolveMessagesPath()`` by replacing the filename)
   * AC-3: If the file does not exist, the extension SHALL treat the auto-delivery
     list as empty (no error)
   * AC-4: Adding a session SHALL append its name to the array and persist the
     updated file
   * AC-5: Removing a session SHALL filter it out of the array and persist the
     updated file
   * AC-6: If the file is malformed, the extension SHALL fall back to an empty
     list and log a warning


.. req:: Auto-Delivery Poll Loop
   :id: REQ_MSG_AUTODELIVER_POLL
   :status: draft
   :priority: optional
   :links: US_MSG_AUTODELIVERY; REQ_MSG_AUTODELIVER_CONFIG; REQ_MSG_AUTODELIVER_TAG; REQ_MSG_SEND; REQ_ENT_AGENTPROMPT_TEMPLATE; REQ_MSG_EDITORPLACEMENT; REQ_MSG_FOCUSRESTORE; REQ_MSG_AUTODELIVERY_OPTOUT

   **Description:**
   The extension SHALL run a background poll loop that automatically sends
   notifications for sessions listed in ``autodelivery.json``. Each
   notification is a system-initiated delivery: it SHALL apply the
   Editor-Group Placement Model (``REQ_MSG_EDITORPLACEMENT``), be wrapped
   in Focus-Snapshot/Restore (``REQ_MSG_FOCUSRESTORE``), and SHALL honor
   the active-use opt-out (``REQ_MSG_AUTODELIVERY_OPTOUT``).

   **Acceptance Criteria:**

   * AC-1: A ``setInterval`` timer with a 5 000 ms period SHALL be started during
     extension activation
   * AC-2: On each tick the loop SHALL read the current ``messages.json`` and
     ``autodelivery.json``
   * AC-3: For each session in the auto-delivery list, if at least one message
     exists with ``notified !== true`` **and** the session is not currently
     the active tab (``REQ_MSG_AUTODELIVERY_OPTOUT`` AC-1/AC-2), the loop
     SHALL deliver the notification directly via its own inlined logic —
     it does **not** invoke ``jarvis.sendMessages`` (``REQ_MSG_SEND``), which
     remains a separate, manually-triggered command — opening the session's
     chat tab using the Secondary placement target
     (``REQ_MSG_EDITORPLACEMENT`` AC-3/AC-4), wrapped in a
     Focus-Snapshot/Restore cycle (``REQ_MSG_FOCUSRESTORE``). If the session
     is currently the active tab, it is skipped for this tick (message
     remains queued, retried next tick).
   * AC-4: After notification the loop SHALL set ``notified: true`` on all
     messages that were just notified for that session and persist the queue
   * AC-5: The loop SHALL process at most one session per tick (first-found order)
   * AC-6: The timer SHALL be stopped (``clearInterval``) when the extension is
     deactivated
   * AC-7: Errors in a single tick SHALL be caught, logged as warnings, and SHALL
     NOT stop the poll loop
   * AC-8: In the new-session branch (no UUID found): if the matched entity has
     an ``agent`` field, the poll loop SHALL prime the VS Code Chat mode selector
     to ``entity.agent`` (via ``workbench.action.chat.open { mode }`` + 300 ms
     settle) **before** ``REQ_MSG_OPENCHAT`` creates the chat editor, so the new
     session inherits the bound mode at creation time. After ``REQ_MSG_OPENCHAT``
     creates the chat editor and the session is renamed to the session name, the
     poll loop SHALL look up the entity whose display name equals the session name
     in the scanner entity store. If an entity is found, the poll loop SHALL send
     a context initialization prompt per ``REQ_ENT_AGENTPROMPT_TEMPLATE`` —
     **before** sending the notification stub. If no entity matches the session
     name, the init prompt is skipped.
   * AC-9: The Focus-Snapshot (``REQ_MSG_FOCUSRESTORE`` AC-1/AC-2) SHALL be
     taken once per tick, immediately before AC-3's delivery action; the
     Focus-Restore (``REQ_MSG_FOCUSRESTORE`` AC-3) SHALL run immediately
     after that delivery action's promise resolves, before the tick ends.


.. req:: Notified Flag on Queued Message
   :id: REQ_MSG_AUTODELIVER_TAG
   :status: implemented
   :priority: optional
   :links: US_MSG_AUTODELIVERY; REQ_MSG_QUEUE

   **Description:**
   The ``QueuedMessage`` data type SHALL support an optional ``notified`` boolean
   field to track whether the message has already been auto-delivered.

   **Acceptance Criteria:**

   * AC-1: ``QueuedMessage`` SHALL include an optional ``notified?: boolean`` field
   * AC-2: Messages appended via ``appendMessage`` SHALL have ``notified``
     absent (``undefined``) by default
   * AC-3: The ``notified`` flag is not interpreted by ``appendMessage``,
     ``popMessage``, or ``readMessage`` — only the poll loop reads and writes it
   * AC-4: The manual ``jarvis.sendMessages`` command SHALL ignore the
     ``notified`` field — it always delivers regardless of flag state
   * AC-5: ``popMessage`` and ``readMessage`` behaviour SHALL be unchanged
     — the flag is irrelevant to message consumption


.. req:: Auto-Delivery Message Tree Layout
   :id: REQ_MSG_AUTODELIVER_TREE
   :status: implemented
   :priority: optional
   :links: US_MSG_AUTODELIVERY; REQ_MSG_AUTODELIVER_CONFIG; REQ_MSG_EXPLORER

   **Description:**
   The Messages tree view SHALL be restructured to show manual and auto-delivery
   sessions in separate groups.

   **Acceptance Criteria:**

   * AC-1: Sessions NOT in ``autodelivery.json`` SHALL be displayed at root
     level as today (manual delivery)
   * AC-2: A collapsible "Auto Delivery" group node SHALL always be present as
     a root-level node, even when the list is empty
   * AC-3: The "Auto Delivery" group SHALL contain one child node per session
     in ``autodelivery.json``; each child shows the pending message count
     (e.g. ``My Session (2)``) or ``(0)`` when no messages are pending
   * AC-4: The "Auto Delivery" group node SHALL use a lightning-bolt icon
     (``$(zap)`` ThemeIcon)
   * AC-5: Session nodes inside the "Auto Delivery" group SHALL have
     contextValue ``jarvisSessionAutoDeliver``
   * AC-6: Session nodes at root level (manual) SHALL have contextValue
     ``jarvisSessionManual``
   * AC-7: The manual send button (``$(debug-start)``) SHALL remain on both
     manual AND auto-delivery session nodes


.. req:: Auto-Delivery Context Menu Commands
   :id: REQ_MSG_AUTODELIVER_CMDS
   :status: implemented
   :priority: optional
   :links: US_MSG_AUTODELIVERY; REQ_MSG_AUTODELIVER_CONFIG; REQ_MSG_AUTODELIVER_TREE

   **Description:**
   The extension SHALL provide commands to move sessions between the manual
   and auto-delivery groups via context menus.

   **Acceptance Criteria:**

   * AC-1: A command ``jarvis.enableAutoDelivery`` SHALL be available in the
     context menu of manual session nodes (``jarvisSessionManual``)
   * AC-2: Invoking ``jarvis.enableAutoDelivery`` SHALL add the session to
     ``autodelivery.json`` and refresh the Messages tree
   * AC-3: A command ``jarvis.disableAutoDelivery`` SHALL be available in the
     context menu of auto-delivery session nodes (``jarvisSessionAutoDeliver``)
   * AC-4: Invoking ``jarvis.disableAutoDelivery`` SHALL remove the session from
     ``autodelivery.json`` and refresh the Messages tree
   * AC-5: Both commands SHALL be registered in ``package.json``
     ``contributes.commands`` and in ``contributes.menus.view/item/context``
     with appropriate ``when``-clauses


.. req:: Message Logging Setting
   :id: REQ_MSG_LOGSETTING
   :status: implemented
   :priority: optional
   :links: US_MSG_LOGGING; REQ_CFG_MSGPATH

   **Description:**
   The extension SHALL provide a boolean configuration setting to enable or
   disable message audit logging.

   **Acceptance Criteria:**

   * AC-1: A setting ``jarvis.messages.logging`` (boolean, default ``false``)
     SHALL be added to the ``Messages`` settings group in ``package.json``
   * AC-2: When the setting is ``false`` (default), no audit log file is created
     or written to
   * AC-3: When the setting is ``true``, every call to ``appendMessage()`` SHALL
     also append the message entry to the audit log file


.. req:: Message Audit Log File
   :id: REQ_MSG_AUDITLOG
   :status: implemented
   :priority: optional
   :links: US_MSG_LOGGING; REQ_MSG_QUEUE; REQ_MSG_LOGSETTING

   **Description:**
   The extension SHALL maintain an append-only JSON audit log file for all
   messages when logging is enabled.

   **Acceptance Criteria:**

   * AC-1: The audit log file SHALL be named ``message-log.json`` and SHALL
     reside in the same directory as ``messages.json``
   * AC-2: The audit log file format SHALL be a JSON array of ``QueuedMessage``
     entries — identical to ``messages.json``
   * AC-3: Only ``appendMessage()`` writes to the audit log; ``popMessage()``,
     ``deleteMessage()``, and ``deleteByDestination()`` SHALL NOT modify it
   * AC-4: If the audit log file does not exist when the first message is
     written, it SHALL be created automatically


.. req:: Editor-Group Placement Model
   :id: REQ_MSG_EDITORPLACEMENT
   :status: approved
   :priority: mandatory
   :links: US_MSG_EDITORPLACEMENT; US_MSG_STABLESESSION; REQ_MSG_PINNED; REQ_MSG_SEND; REQ_FLOW_WEBVIEWPANEL

   **Description:**
   The extension SHALL place chat and entity-file editor tabs into one of
   three semantic targets — **Main**, **Docs**, **Secondary** — derived
   entirely at runtime from the current VS Code editor-group layout
   (``vscode.window.tabGroups``). No new persisted state, YAML flag, or
   runtime map is introduced; every placement decision is computed fresh
   from "does a tab already exist, and where."

   **Acceptance Criteria:**

   * AC-1: **Main** target: view column 1 (fixed). A click on an Actor node
     in the entity tree (``jarvis.openAgentSession``) targeting an
     **existing** session's chat tab SHALL always result in that tab being
     open and focused in column 1 (``REQ_ENT_AGENTSESSION`` AC-6). This
     guarantee applies to the existing-session branch only; placement for a
     newly created session is best-effort (``REQ_ENT_AGENTSESSION`` AC-7) —
     VS Code exposes no API to force the view column of a chat editor at
     creation time.
   * AC-2: **Docs** target: view column 2 (fixed) — renamed **Content** by
     the ``message-flow-diagram`` CR to reflect that it now hosts more than
     entity docs (see AC-11). Opening a `context.md`, YAML config, or agent
     file from the entity tree (``jarvis.openEntityFile``, per
     ``REQ_ENT_ENTITY_FILE_CHILDREN``) SHALL open that file in column 2.
   * AC-3: **Secondary** target: the **last existing** view column at the
     time of the action (dynamic, not fixed) — used for delivering a
     message to a session with no currently-open tab. The column number
     SHALL be computed as ``Math.max(2, tabGroups.all.length)`` — **never**
     ``tabGroups.all.length`` alone (which would collapse Secondary into
     Main when only 1 column is open — Secondary and Main SHALL never be
     the same column) and **not** ``tabGroups.all.length + 1`` (which
     creates a new column on every single delivery — runaway column
     creation). The ``Math.max(2, ...)`` floor guarantees Secondary always
     splits at least column 2 the first time, then reuses the existing
     last column for subsequent deliveries once 2+ columns exist, allowing
     multiple Secondary sessions to stack as tabs within the same group.
   * AC-4: **Already-open-anywhere rule**: if a tab for the target resource
     (chat session or file) is already open in ANY column — including a
     column the user manually moved it to — the extension SHALL focus that
     existing tab in place. It SHALL NOT move, close, or reopen it, except
     as required by AC-5 (Main-target close+reopen).
   * AC-5: **Main-target close+reopen rule**: when a Main-target click
     (AC-1) finds the session's tab open in a column other than 1, the
     extension SHALL close that tab and reopen it fresh in column 1. This
     is the one exception to AC-4 — Main is the only target that actively
     relocates an existing tab.
   * AC-6: VS Code's automatic column materialization (auto-split) SHALL be
     relied upon rather than manually created — requesting
     ``viewColumn: <N>`` when fewer than ``N`` columns currently exist
     SHALL reliably create the missing column(s), including across
     Auxiliary (detached) windows, which remain part of
     ``tabGroups.all`` and require no special-case handling.
   * AC-7: The three targets SHALL correctly degenerate with no
     special-case code: with only 1 column open, Secondary SHALL split a
     new column 2 (never collapse into Main/column 1 — Secondary and Main
     are never the same column); with 2 columns open, Secondary resolves
     to the existing column 2 (shared with Docs); with 3+ columns open,
     Secondary has its own stable last-existing column, reused for all
     subsequent Secondary placements.
   * AC-8: The placement logic SHALL only act on tabs whose label matches a
     known Actor/entity session name (via ``REQ_MSG_SESSIONLOOKUP``) or a
     known entity file path — arbitrary files the user opens manually are
     entirely outside this system's contract and are never moved, closed,
     or reused as a placement target.
   * AC-9: The manual Play-button send command (``jarvis.sendMessages``,
     ``REQ_MSG_SEND``) SHALL target Main (column 1, fixed) — the same
     target as an Actor tree click (AC-1) — including the Main-target
     close+reopen rule (AC-5) when the tab is open elsewhere. Rationale:
     the Play button is an active, user-initiated action, so the result
     SHALL land where the user is looking; only background automation
     (Auto-Delivery's poll loop) uses Secondary (AC-3).
   * AC-10 (``ui-improvements`` CR): Clicking a session/actor group node's
     label in the Messages tree (``SessionGroupNode``, the row itself —
     not the inline Play button) SHALL open that session's chat at Main
     (column 1, fixed) — the same target and close+reopen rule as AC-1/AC-9
     — **only when a live chat session already exists** for that
     destination (resolvable via ``REQ_MSG_SESSIONLOOKUP``). If no session
     exists yet (the destination has only queued messages and no session
     has ever been opened for it), the click SHALL be a silent no-op — it
     SHALL NOT create a new session, unlike AC-1/AC-9's existing-or-create
     behavior. Rationale: a label click is a lower-intent, exploratory
     action, unlike explicitly clicking "Play" to send, so silently
     creating a new chat session would be a surprising side effect.
     Previously ``SessionGroupNode`` had no click command at all (label
     click only expanded/collapsed the node's message children); this AC
     adds one without changing the expand/collapse behavior itself.
   * AC-11 (``message-flow-diagram`` CR): The message-flow diagram Webview
     Panel (``REQ_FLOW_WEBVIEWPANEL``) SHALL also target the Content column
     (AC-2) as a fixed target, coexisting with any already-open entity-doc
     tab as a separate tab within the same column rather than replacing it.
     Because a Webview Panel tab exposes neither ``lookupSessionUUID``
     resolution (not a chat tab) nor a ``.uri`` (not a plain file tab), the
     Secondary-column resolution helper (``resolveSecondaryColumn``) SHALL
     recognize and exclude it (via its VS Code ``viewType``) from any group-
     count logic used to compute the dynamic Secondary target, so that
     opening the diagram panel never perturbs Secondary placement for
     unrelated Actor sessions. Content-tab coexistence (docs + diagram
     sharing column 2, and Secondary sharing column 2 when only 2 columns
     are open) is documented for the user in the README's Explorer Sidebar
     section rather than surfaced via a first-run in-app hint dialog — v1
     scope decision, consistent with no other feature in this codebase
     using first-run dialogs.


.. req:: Focus-Snapshot and Restore
   :id: REQ_MSG_FOCUSRESTORE
   :status: approved
   :priority: mandatory
   :links: US_MSG_EDITORPLACEMENT; REQ_MSG_EDITORPLACEMENT; REQ_MSG_SESSIONLOOKUP

   **Description:**
   Before any system-initiated delivery (Auto-Delivery poll tick), the
   extension SHALL snapshot the user's current focus (an editor tab or an
   integrated terminal) and automatically restore it immediately after the
   delivery completes — eliminating the "where did I land?" disorientation
   that a focus-jumping delivery would otherwise cause.

   **Acceptance Criteria:**

   * AC-1: Immediately before a system-initiated delivery action, the
     extension SHALL capture a snapshot of the currently active focus:
     either the active editor tab (with its view column) or the active
     integrated terminal, whichever currently holds focus.
   * AC-2: For a chat-editor tab, since ``tab.input`` does not expose a
     ``.uri`` (unlike normal file tabs), the snapshot SHALL resolve the
     tab's identity via ``lookupSessionUUID(tab.label)`` — the same
     mechanism already used for Main/Secondary placement (``REQ_MSG_EDITORPLACEMENT``).
   * AC-3: Immediately after the delivery action's promise resolves (no
     artificial delay — see Design rationale below), the extension SHALL
     restore the snapshotted focus: re-open/focus the captured chat tab via
     ``vscode.open(uri, { viewColumn, preserveFocus: false })``, or
     re-focus the captured terminal via ``terminal.show()``.
   * AC-4: If no focus can be captured (e.g. no active editor or terminal),
     the extension SHALL skip both snapshot and restore without error.
   * AC-5: Restore timing SHALL NOT include any artificial delay (e.g.
     ``setTimeout``) beyond awaiting the delivery action's own promise —
     an earlier spike revision with an artificial 800 ms pause measured
     839 ms snapshot-to-restore and up to 23 leaked keystrokes during
     active typing; removing the artificial pause reduced this to ~520 ms
     and 0-1 leaked keystrokes.
   * AC-6: **Accepted limitation**: within the ~520 ms disrupt+restore
     window, a keystroke typed at the exact moment of the focus shift MAY
     be misrouted to the wrong window (an OS-level input-routing property,
     not fixable by restore speed alone). This is accepted as a v1
     limitation because the delivery mechanism injects into a VS Code Chat
     query — consumed by an LLM, which tolerates a stray/misplaced
     character trivially, unlike a rigid format (file path, command, code).
     A fully focus-free injection mechanism (e.g. AHP) would eliminate this
     but currently only covers CLI sessions, not this Editor-tab substrate.


.. req:: Auto-Delivery Active-Use Opt-Out
   :id: REQ_MSG_AUTODELIVERY_OPTOUT
   :status: approved
   :priority: required
   :links: US_MSG_AUTODELIVERY_OPTOUT; REQ_MSG_AUTODELIVER_POLL

   **Description:**
   The Auto-Delivery poll loop SHALL skip delivering to a session that the
   user is currently actively using, to avoid interrupting an in-progress
   conversation (e.g. PM/Research mid-chat).

   **Acceptance Criteria:**

   * AC-1: On each poll tick, before delivering to a given session (per
     ``REQ_MSG_AUTODELIVER_POLL`` AC-3), the poll loop SHALL check whether
     that session's chat tab is the currently active (focused) editor tab.
   * AC-2: If the target session's tab is the currently active tab, the
     poll loop SHALL skip delivery for that session on this tick — the
     message remains queued (``notified`` stays unset) and SHALL be
     retried on a subsequent tick once the session is no longer active.
   * AC-3: This check SHALL use no new persisted state — it is derived at
     runtime from ``vscode.window.tabGroups`` (the active tab) compared
     against the session's resolved UUID/label, the same mechanism used by
     ``REQ_MSG_EDITORPLACEMENT``.
   * AC-4: The opt-out check SHALL NOT affect the manual ``jarvis.sendMessages``
     command — manual delivery always proceeds regardless of active-use
     state (per ``REQ_MSG_AUTODELIVER_TAG`` AC-4, unaffected by this REQ).
   * AC-5: If the skip causes a session to never be delivered while
     continuously active, this is accepted — the user is, by definition,
     already engaged with that session and can read queued messages
     manually via `jarvis_readMessage` at any time.


.. req:: Pinned Resource Open Helper
   :id: REQ_MSG_PINNED
   :status: implemented
   :priority: optional
   :links: US_MSG_STABLESESSION; US_MSG_CHATQUEUE; REQ_MSG_SESSIONLOOKUP; REQ_MSG_EDITORPLACEMENT

   **Description:**
   The extension SHALL open any ``vscode-chat-session://`` URI in a pinned
   (non-preview) editor tab so that VS Code does not silently reuse a transient
   editor slot. The helper SHALL accept an optional target view column,
   supplied by callers per the placement model (``REQ_MSG_EDITORPLACEMENT``).

   **Acceptance Criteria:**

   * AC-1: ``vscode.commands.executeCommand('vscode.open', uri, { preview: false })``
     SHALL be used for all chat session URI opens — both when focusing an
     existing session and when falling back to a new session URI
   * AC-2: The ``{ preview: false }`` option SHALL be passed as the third argument
     to every ``vscode.open`` call for chat URIs
   * AC-3: The helper SHALL be used consistently by all commands that open chat
     sessions: ``jarvis.sendMessages``, ``jarvis.openSession``, and
     ``jarvis.openAgentSession``
   * AC-4: The helper SHALL accept an optional ``viewColumn`` parameter,
     included in the options object passed to ``vscode.open`` alongside
     ``preview: false`` (e.g. ``{ preview: false, viewColumn }``), so
     callers can direct the open to a specific placement target per
     ``REQ_MSG_EDITORPLACEMENT``. When omitted, the existing behavior
     (VS Code's default column resolution) is unchanged — this AC is
     additive, not a breaking change to existing callers.


.. req:: New Chat Editor Helper
   :id: REQ_MSG_OPENCHAT
   :status: implemented
   :priority: optional
   :links: US_MSG_STABLESESSION; REQ_MSG_PINNED

   **Description:**
   The extension SHALL open a new VS Code Chat editor using the stable
   ``workbench.action.openChat`` internal command, with a URI-based fallback for
   older VS Code builds.

   **Acceptance Criteria:**

   * AC-1: The primary mechanism SHALL be
     ``vscode.commands.executeCommand('workbench.action.openChat')``
   * AC-2: If ``workbench.action.openChat`` throws, the extension SHALL fall back
     to ``vscode.open(Uri.parse('vscode-chat-session://local/new'), { preview: false })``
     via the pinned-open helper (``REQ_MSG_PINNED``)
   * AC-3: Fallback attempts SHALL be logged at ``warn`` level on the Jarvis
     output channel with the caught error message and a ``[MSG]`` tag
   * AC-4: ``workbench.action.openChat`` is a VS Code internal command with no
     public stability guarantee — the try/catch fallback is mandatory


.. req:: Agent Chat Prompt Helper
   :id: REQ_MSG_SENDPROMPT
   :status: implemented
   :priority: optional
   :links: US_MSG_STABLESESSION; REQ_MSG_OPENCHAT

   **Description:**
   The extension SHALL submit a query to the currently focused VS Code Chat input
   in agent mode, using a two-level fallback strategy to tolerate VS Code API
   differences across builds.

   **Acceptance Criteria:**

   * AC-1: The extension SHALL first attempt to focus the chat input via
     ``workbench.action.chat.focusInput`` (best-effort; failures are silently
     swallowed)
   * AC-2: The primary submission mechanism SHALL be
     ``workbench.action.chat.openAgent`` with ``{ query, isPartialQuery: false }``
   * AC-3: If ``workbench.action.chat.openAgent`` throws, the extension SHALL
     fall back to ``workbench.action.chat.open`` with
     ``{ query, isPartialQuery: false, mode: 'agent' }``
   * AC-4: Fallback attempts SHALL be logged at ``warn`` level on the Jarvis
     output channel with the caught error message and a ``[MSG]`` tag
   * AC-5: Both ``workbench.action.chat.openAgent`` and
     ``workbench.action.chat.open`` are VS Code internal commands with no public
     stability guarantee — the try/catch fallback is mandatory


.. req:: Agent Session Init Sequence
   :id: REQ_MSG_AGENTSESSION
   :status: implemented
   :priority: optional
   :links: US_MSG_STABLESESSION; REQ_ENT_AGENTSESSION; REQ_MSG_OPENCHAT; REQ_MSG_SENDPROMPT

   **Description:**
   When creating a new agent session for a project or event, the extension SHALL
   execute a fixed init sequence: open a new chat editor, rename the session,
   then submit a context initialization prompt.

   **Acceptance Criteria:**

   * AC-1: After ``REQ_MSG_OPENCHAT`` creates the new chat editor, the extension
     SHALL submit a ``/rename <entityName>`` prompt via ``REQ_MSG_SENDPROMPT``
     to give the session a stable, recognizable name
   * AC-2: After a short delay following the rename, the extension SHALL submit a
     context initialization prompt containing the absolute path to ``context.md``
     in the entity's folder (derived from the YAML leaf node path, not from the
     display name)
   * AC-3: The path to ``context.md`` SHALL be constructed as
     ``projects/<kebab-name>/context.md`` where ``<kebab-name>`` is the entity
     name lowercased with spaces replaced by hyphens
   * AC-4: All prompt submissions SHALL use ``REQ_MSG_SENDPROMPT``


.. req:: Reminder Persistence Store
   :id: REQ_MSG_REMINDERS_PERSIST
   :status: draft
   :priority: optional
   :links: US_MSG_REMINDERS; REQ_MSG_QUEUE; REQ_CFG_MSGPATH

   **Description:**
   The extension SHALL maintain a persistent YAML file ``reminders.yaml``
   co-located with ``messages.json`` that stores all pending reminders.

   **Acceptance Criteria:**

   * AC-1: The file SHALL follow the schema
     ``{ reminders: [{ id, text, session, deliverAt, createdAt }] }``
     where ``id`` is a UUID string, ``text`` is the message body,
     ``session`` is the target chat tab label, ``deliverAt`` is an ISO 8601
     timestamp, and ``createdAt`` is an ISO 8601 timestamp
   * AC-2: The file SHALL be located in the same directory as ``messages.json``
     (path derived from ``resolveMessagesPath()`` by replacing the filename)
   * AC-3: If the file does not exist, the extension SHALL treat the reminder
     list as empty (no error)
   * AC-4: If the file is malformed, the extension SHALL fall back to an empty
     list and log a warning
   * AC-5: A new module ``src/reminders.ts`` SHALL provide the public API:
     ``readReminders(path)``, ``writeReminders(path, list)``,
     ``addReminder(path, text, session, deliverAt)``,
     ``removeReminder(path, id)``, ``popDueReminders(path, now)``
   * AC-6: ``popDueReminders`` SHALL return all reminders where
     ``deliverAt <= now`` and atomically remove them from the file


.. req:: Reminder Delivery via Poll Loop
   :id: REQ_MSG_REMINDERS_DELIVER
   :status: draft
   :priority: optional
   :links: US_MSG_REMINDERS; REQ_MSG_REMINDERS_PERSIST; REQ_MSG_AUTODELIVER_POLL; REQ_MSG_QUEUE; REQ_MSG_AUTODELIVER_CONFIG

   **Description:**
   The existing 5-second poll loop SHALL be extended to check for due reminders
   and deliver them automatically via the auto-delivery pipeline.

   **Acceptance Criteria:**

   * AC-1: On each tick, after the existing auto-delivery handling, the loop
     SHALL call ``popDueReminders(remindersPath, now)`` to retrieve all reminders
     with ``deliverAt <= now``
   * AC-2: For each due reminder, the loop SHALL call
     ``appendMessage(messagesPath, session, 'Reminder', text)`` to enqueue the
     message for delivery
   * AC-3: For each due reminder, the loop SHALL call
     ``addAutoDelivery(messagesPath, session)`` (idempotent) to ensure the target
     session is on the auto-delivery list so the message is picked up on the
     next tick
   * AC-4: After enqueuing, the reminder SHALL be removed from ``reminders.yaml``
     (handled by ``popDueReminders``) — it MUST NOT be re-delivered
   * AC-5: The Messages tree SHALL refresh after reminder delivery
   * AC-6: Errors in reminder processing SHALL be caught, logged as warnings,
     and SHALL NOT stop the poll loop


.. req:: Reminder LM and MCP Tools
   :id: REQ_MSG_REMINDERS_TOOLS
   :status: draft
   :priority: optional
   :links: US_MSG_REMINDERS; REQ_MSG_REMINDERS_PERSIST; REQ_MSG_MCPSERVER

   **Description:**
   The extension SHALL register three Language Model Tools (also exposed via MCP)
   for managing reminders.

   **Acceptance Criteria:**

   * AC-1: A tool ``jarvis_setReminder`` SHALL accept ``text`` (string),
     ``session`` (string), and ``deliverAt`` (ISO 8601 string) and return
     ``{ id, deliverAt }``; ``deliverAt`` MUST be in the future, otherwise
     the tool SHALL return an error
   * AC-2: A tool ``jarvis_listReminders`` SHALL accept no input and return
     ``{ reminders: [{ id, text, session, deliverAt, remainingMs }] }``
     where ``remainingMs`` is the milliseconds until delivery (negative if
     overdue but not yet fired)
   * AC-3: A tool ``jarvis_cancelReminder`` SHALL accept ``id`` (string) and
     return ``{ status: 'cancelled' }`` if the reminder was found and removed,
     or ``{ status: 'not_found' }`` if no matching reminder exists
   * AC-4: All three tools SHALL be registered via the ``registerDualTool``
     pattern so they are simultaneously available as VS Code LM Tools and as
     MCP Tools
   * AC-5: All three tools SHALL be declared in ``package.json``
     ``contributes.languageModelTools`` with appropriate ``inputSchema``


.. req:: Notification Template Setting
   :id: REQ_MSG_NOTIFICATION_TEMPLATE
   :status: implemented
   :priority: optional
   :links: US_MSG_NOTIFICATION_TEMPLATE; REQ_MSG_SEND; REQ_MSG_AUTODELIVER_POLL

   **Description:**
   The extension SHALL expose a configurable string setting for the auto-delivery
   notification stub text, with a built-in English default and support for
   placeholder substitution.

   **Setting:**

   * Name: ``jarvis.messages.notificationTemplate``
   * Type: ``string``
   * Default: the built-in English notification text (verbatim below); ``package.json`` ships the full text so users see it in the Settings UI; an empty or whitespace-only value falls back to the built-in default
   * Scope: ``window``
   * Group: Messages

   **Built-in default text (verbatim):**

   .. code-block:: text

      [Jarvis Message Service] You have ${count} new message(s) in your inbox.
      Read them with the enthali.jarvis-core/receiveMessage tool (destination: "${destination}") until remaining = 0.

   **Acceptance Criteria:**

   * AC-1: When ``jarvis.messages.notificationTemplate`` is empty or whitespace,
     the built-in default text above SHALL be used as the notification stub
   * AC-2: When the setting contains a non-empty string, that string SHALL be
     used as the template instead of the built-in default
   * AC-3: Before submission, the template SHALL have ``${count}`` replaced with
     the number of pending messages and ``${destination}`` replaced with the
     target session name
   * AC-4: Unknown placeholder tokens (i.e. ``${...}`` patterns not listed above)
     SHALL be left as-is in the final text — no error is raised
   * AC-5: The substitution SHALL be applied by a shared private helper
     ``applyTemplate(template, vars)`` in ``src/extension.ts`` so that both the
     deliver-now command and the auto-delivery poll loop use identical logic
   * AC-6: The setting SHALL be read from VS Code configuration on each delivery
     call — no caching — so changes take effect without an extension restart
   * AC-7: (message-api-rename CR) The built-in default text SHALL reference
     ``jarvis_receiveMessage`` (the canonical tool) rather than the deprecated
     ``jarvis_readMessage`` — this is a one-time default-text update; the
     setting's substitution logic (AC-1 through AC-6) is otherwise unaffected.
     Users with a customized (non-default) template are unaffected — the
     built-in default only changes for users who have never overridden it.


.. req:: Reminders Tree View
   :id: REQ_MSG_REMINDERS_VIEW
   :status: draft
   :priority: optional
   :links: US_MSG_REMINDERS; REQ_MSG_REMINDERS_PERSIST; REQ_EXP_TREEVIEW

   **Description:**
   A dedicated "Reminders" sidebar view in the Jarvis Activity Bar container
   SHALL show all pending reminders.

   **Acceptance Criteria:**

   * AC-1: A top-level view ``jarvisReminders`` labelled "Reminders" SHALL be
     present in the Jarvis Activity Bar container next to the Messages view
   * AC-2: The view SHALL be visible when ``config.jarvis.messagesFile != ''``
   * AC-3: Each pending reminder SHALL appear as a non-collapsible node
     showing the text (truncated to 60 chars), the target session, and a
     description of either "in X min" (if more than 60 s remaining), "in Xs"
     (if less than 60 s), or "overdue" (if ``deliverAt`` has passed but not
     yet popped)
   * AC-4: Each reminder node SHALL use icon ``$(bell)``
   * AC-5: Each reminder node SHALL have contextValue ``jarvisReminder`` and
     display an inline ``$(trash)`` cancel button
   * AC-6: The view SHALL refresh after any reminder mutation (add, cancel,
     deliver)


.. req:: Send-to-Session LM / MCP Tool
   :id: REQ_MSG_SENDTOSESSION
   :status: deprecated
   :priority: mandatory
   :links: US_MSG_SAFE_SEND; REQ_MSG_QUEUE; REQ_MSG_SESSIONLOOKUP; REQ_MSG_SESSIONFILTER

   **Deprecated by:** ``REQ_MSG_SENDMESSAGE`` (message-api-rename CR). **Hard
   deprecation (PM design pivot, 2026-07-03):** soft deprecation (tool stays
   functional, returns a warning) was tried first and observed to fail in
   practice — agents kept calling the deprecated tool and ignored the
   warning. The tool now SHALL remain **registered** (so callers still get a
   discoverable, named error) but SHALL be **functionally inert**: every
   invocation ends in an error and no message is ever queued. Full removal of
   the registration itself remains GH Issue #13 (separate future change,
   earliest 2026-09-30).

   **Description:**
   The extension SHALL keep ``jarvis_sendToSession`` registered as a
   Language Model Tool (and corresponding MCP Tool) for discoverability, but
   every invocation SHALL immediately fail with a deprecation error — no
   destination validation, no queueing, no other side effect of any kind.

   **Acceptance Criteria:**

   * AC-1: A Language Model Tool named ``jarvis_sendToSession`` SHALL remain
     registered via ``vscode.lm.registerTool`` (dual-registered as an MCP tool
     via ``registerDualTool``) with ``canBeReferencedInPrompt: true``
   * AC-2: The tool SHALL continue to accept its existing three input
     parameters (``session``, ``text``, ``senderSession``) unchanged at the
     schema level, so existing callers do not fail schema validation before
     reaching the handler
   * AC-3: Every invocation, regardless of input, SHALL throw an error
     (not return a success response) with the exact text::

        This tool is deprecated and no longer functional. Use jarvis_sendMessage instead.

   * AC-4: No message SHALL ever be appended to the queue by this tool —
     there is no valid input that produces a side effect
   * AC-5: Destination validation, sender resolution (active-tab fallback),
     and all other previously-specified behaviour (former AC-3 through AC-7b)
     are SUPERSEDED and no longer apply — the handler short-circuits to the
     error in AC-3 before any of that logic would run
   * AC-6: The tool's ``modelDescription`` SHALL be prefixed with
     ``"[DEPRECATED AND DISABLED — use jarvis_sendMessage instead.]"`` so the
     deprecation is visible at tool-discovery time, before any invocation
     attempt


.. req:: Destination Validation Error Contract
   :id: REQ_MSG_DEST_ERROR
   :status: implemented
   :priority: mandatory
   :links: US_MSG_SAFE_SEND; REQ_MSG_SENDTOSESSION; REQ_MSG_SESSIONFILTER

   **Description:**
   The error thrown by ``jarvis_sendToSession`` when the destination session
   does not exist SHALL be self-contained enough for the calling agent to
   correct the invocation immediately.

   **Acceptance Criteria:**

   * AC-1: The error message SHALL state that the supplied destination does
     not exist, quoting the supplied name verbatim
   * AC-2: The error message SHALL list all currently valid destination names
     in a deterministic, human-readable order (alphabetically sorted)
   * AC-3: If the valid destination set is empty (no named sessions in the
     workspace), the error message SHALL indicate this explicitly rather than
     showing an empty list
   * AC-4: The error message template SHALL be::

        Destination session "${session}" does not exist.
        Valid destinations: ${names}

     where ``${session}`` is replaced by the supplied (invalid) name,
     and ``${names}`` is replaced by the alphabetically sorted list of valid
     session titles joined with ``", "``; if the set is empty
     ``${names}`` is replaced by the literal string ``"(none)"``
   * AC-5: The error SHALL be raised as a JavaScript ``Error`` object so that
     both the VS Code LM tool invocation and the MCP handler surface the
     message text to the caller unchanged


.. req:: Send Message LM / MCP Tool (Canonical)
   :id: REQ_MSG_SENDMESSAGE
   :status: draft
   :priority: mandatory
   :links: US_MSG_SAFE_SEND; US_MSG_SENDER_REQUIRED; REQ_MSG_QUEUE; REQ_MSG_SESSIONLOOKUP; REQ_MSG_SESSIONFILTER

   **Description:**
   The extension SHALL register a Language Model Tool (and corresponding MCP
   Tool) named ``jarvis_sendMessage`` that queues a text message for delivery
   to a named VS Code chat session. This is the canonical replacement for the
   now hard-deprecated ``jarvis_sendToSession`` (``REQ_MSG_SENDTOSESSION``):
   it performs the destination validation ``jarvis_sendToSession`` used to
   perform (before its handler was short-circuited to an unconditional
   error), but additionally **requires** and validates ``senderSession`` —
   there is no active-tab fallback.

   **Acceptance Criteria:**

   * AC-1: A Language Model Tool named ``jarvis_sendMessage`` SHALL be
     registered via ``vscode.lm.registerTool`` (dual-registered as an MCP tool
     via ``registerDualTool``) with ``canBeReferencedInPrompt: true``
   * AC-2: The tool SHALL accept three input parameters: ``session`` (string,
     required — the exact title of the target VS Code chat session or the name
     of a YAML entity), ``text`` (string, required — the message body), and
     ``senderSession`` (string, **required** — name of the originating session)
   * AC-3: Before appending to the queue, the tool SHALL verify that
     ``session`` is a member of the **valid destination set** — identical
     semantics to ``REQ_MSG_SENDTOSESSION`` AC-5
   * AC-4: If ``session`` is not in the valid destination set, the tool SHALL
     throw an error (not return a success response); no message SHALL be
     appended to the queue; the error message SHALL satisfy
     ``REQ_MSG_DEST_ERROR``
   * AC-5: If ``senderSession`` is missing or an empty string, the tool SHALL
     throw an error (not return a success response); no message SHALL be
     appended to the queue; the error message SHALL satisfy
     ``REQ_MSG_SENDER_ERROR`` (missing case)
   * AC-6: If ``senderSession`` is present but is not a member of the valid
     destination set (``getValidDestinations()`` — same set used for
     ``session``), the tool SHALL throw an error (not return a success
     response); no message SHALL be appended to the queue; the error message
     SHALL satisfy ``REQ_MSG_SENDER_ERROR`` (invalid case)
   * AC-7: If both ``session`` and ``senderSession`` are valid, the tool SHALL
     append the message to the queue via ``appendMessage`` using the supplied
     ``senderSession`` verbatim as the ``sender`` field, and return a success
     response; all existing queuing behaviour (auto-delivery, audit log, tree
     refresh) SHALL be unaffected
   * AC-8: The validation order SHALL be: destination first (AC-3/AC-4), then
     sender (AC-5/AC-6) — a request with both an invalid destination and a
     missing/invalid sender SHALL fail with the destination error


.. req:: Receive Message LM / MCP Tool (Canonical)
   :id: REQ_MSG_RECEIVEMESSAGE
   :status: draft
   :priority: mandatory
   :links: US_MSG_CHATQUEUE; REQ_MSG_QUEUE

   **Description:**
   The extension SHALL register a Language Model Tool (and corresponding MCP
   Tool) named ``jarvis_receiveMessage`` that pops the oldest queued message
   for a given destination session. This is the canonical replacement for the
   deprecated ``jarvis_readMessage`` (``REQ_MSG_READ``) — a rename only, with
   no functional change.

   **Acceptance Criteria:**

   * AC-1: A Language Model Tool named ``jarvis_receiveMessage`` SHALL be
     registered via ``vscode.lm.registerTool`` (dual-registered as an MCP tool
     via ``registerDualTool``) with ``canBeReferencedInPrompt: true``
   * AC-2: The tool SHALL accept a ``destination`` parameter (string)
     identifying the target session name
   * AC-3: The tool SHALL return a JSON object with ``message`` (containing
     ``sender``, ``text``, ``timestamp``, or ``null`` if no messages) and
     ``remaining`` (number of messages still queued for that destination)
   * AC-4: The tool SHALL remove the returned message from the queue file
     (pop-oldest semantics)
   * AC-5: If no messages exist for the destination, the tool SHALL return
     ``{ message: null, remaining: 0 }``
   * AC-6: The Messages tree view SHALL refresh after each read
   * AC-7: Behaviour SHALL be identical to ``REQ_MSG_READ`` in every respect
     other than the tool name — no new parameters, no new response fields, no
     deprecation warning (this is the canonical, non-deprecated tool)


.. req:: Sender Validation Error Contract
   :id: REQ_MSG_SENDER_ERROR
   :status: draft
   :priority: mandatory
   :links: US_MSG_SENDER_REQUIRED; REQ_MSG_SENDMESSAGE; REQ_MSG_SESSIONFILTER

   **Description:**
   The error thrown by ``jarvis_sendMessage`` when ``senderSession`` is missing
   or invalid SHALL be self-contained enough for the calling agent to correct
   the invocation immediately, mirroring ``REQ_MSG_DEST_ERROR``'s contract for
   the destination side.

   **Acceptance Criteria:**

   * AC-1: If ``senderSession`` is missing or an empty string, the error
     message SHALL be exactly::

        senderSession is required. Callers must explicitly provide their
        session name — do not rely on the active editor tab.

   * AC-2: If ``senderSession`` is present but not a member of the valid
     destination set, the error message SHALL be::

        Sender session "${senderSession}" does not exist.
        Valid senders: ${names}

     where ``${senderSession}`` is replaced by the supplied (invalid) name,
     and ``${names}`` is replaced by the alphabetically sorted list of valid
     session/entity names joined with ``", "``; if the set is empty
     ``${names}`` is replaced by the literal string ``"(none)"``
   * AC-3: The valid destination set used for sender validation SHALL be the
     same ``getValidDestinations()`` union already defined by
     ``REQ_MSG_SENDTOSESSION`` AC-5 — no separate sender-specific set is
     introduced
   * AC-4: The error SHALL be raised as a JavaScript ``Error`` object so that
     both the VS Code LM tool invocation and the MCP handler surface the
     message text to the caller unchanged
