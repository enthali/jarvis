Message Queue Requirements
==========================

.. req:: Message Queue Storage
   :id: REQ_MSG_QUEUE
   :status: implemented
   :priority: optional
   :links: US_COM_SEND; REQ_AUT_JOBEXEC; REQ_CFG_FIXEDPATHS

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
   * AC-4: The queue file location SHALL be determined by ``REQ_CFG_FIXEDPATHS``
     (``<workspaceRoot>/.jarvis/messages/queue.json``). The previous reference to
     ``REQ_CFG_MSGPATH`` pointed at a requirement describing a setting that had
     already been removed.

.. req:: Message Tree Display
   :id: REQ_MSG_EXPLORER
   :status: implemented
   :priority: optional
   :links: US_COM_SEND; REQ_EXP_TREEVIEW; REQ_MSG_EDITORPLACEMENT

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
     ``REQ_ACTOR_TREE`` AC-10 for Actor nodes.

.. req:: Delete Individual Message
   :id: REQ_MSG_DELETE
   :status: implemented
   :priority: optional
   :links: US_COM_SEND; REQ_MSG_QUEUE

   **Description:**
   The extension SHALL allow the user to delete a single queued message from the
   Messages tree view.

   **Acceptance Criteria:**

   * AC-1: Each message node SHALL have a trash-icon inline button
   * AC-2: Clicking the button SHALL remove the message entry from the queue file
   * AC-3: The Messages tree view SHALL refresh after deletion

.. req:: Session UUID Lookup via state.vscdb
   :id: REQ_MSG_SESSIONLOOKUP
   :status: deprecated
   :priority: optional
   :links: US_COM_SEND

   **Retired by:** ``retire-legacy-session-lookup`` CR. Since the Agent Host
   path no Jarvis feature resolves a chat title to a session UUID by reading
   the ``state.vscdb`` SQLite database (``REQ_COM_OPEN`` finds or creates the
   chat of an Actor through the Agent Host), and no code calls the lookup.
   The criteria are removed so that nobody builds on them.


.. req:: Named Session Filter
   :id: REQ_MSG_SESSIONFILTER
   :status: deprecated
   :priority: optional
   :links: US_COM_NAME; US_COM_FIND; REQ_MSG_SESSIONLOOKUP

   **Retired by:** ``retire-legacy-session-lookup`` CR. The filter applied to
   the chat titles read from ``state.vscdb`` (``REQ_MSG_SESSIONLOOKUP``);
   destinations are Actor names now (``REQ_AUT_HEARTBEAT_RESOLVER_REUSE``
   AC-3), so there are no unnamed sessions to exclude.


.. req:: Embedded MCP Server
   :id: REQ_MSG_MCPSERVER
   :status: approved
   :priority: mandatory
   :links: US_MSG_MCPSERVER

   **Description:**
   The extension SHALL embed an MCP (Model Context Protocol) server that exposes
   all registered LM Tools as MCP Tools via HTTP/SSE on localhost.

   **Acceptance Criteria:**

   * AC-1: The extension SHALL start an HTTP/SSE MCP server on ``127.0.0.1``
     during activation when ``jarvis.mcp.enabled`` is ``true`` (default ``false``,
     ``REQ_CFG_MCPDEFAULTOFF``)
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
   * AC-8: If ``jarvis.mcp.enabled`` is ``false``, the MCP server SHALL not
     start and the status bar item SHALL not be shown
   * AC-9: The message tools of the Jarvis AHP client (``jarvis_sendMessage``,
     ``jarvis_receiveMessage``, ``jarvis_listActors``,
     ``jarvis_createActorSession``; ``SPEC_COM_TOOLS``) SHALL NOT be registered as
     MCP tools; their sender comes from the calling chat, which an MCP client does
     not have (``US_MSG_MCPSERVER`` AC-7)


.. req:: Auto-Delivery Configuration Store
  :id: REQ_MSG_AUTODELIVER_CONFIG
  :status: approved
  :priority: optional
  :links: US_COM_DELIVERY; REQ_MSG_QUEUE; REQ_CFG_FIXEDPATHS

   **Description:**
   The extension SHALL maintain a persistent JSON file at
   ``<workspaceRoot>/.jarvis/messages/autodelivery.json`` that stores the list of
   session names for which auto-delivery is enabled.

   **Acceptance Criteria:**

   * AC-1: The file SHALL be a JSON array of strings (session destination names)
   * AC-2: The path SHALL be obtained from the central path resolver
     (``REQ_CFG_PATHSINGLESOURCE``). It SHALL NOT be derived from the queue
     path. The previous wording required exactly that derivation, which
     ``REQ_CFG_MSGDIR`` would have left accidentally correct — passing tests
     while preserving an invariant that does not hold.
   * AC-3: If the file does not exist, the extension SHALL treat the auto-delivery
     list as empty (no error)
   * AC-4: Adding a session SHALL append its name to the array and persist the
     updated file
   * AC-5: Removing a session SHALL filter it out of the array and persist the
     updated file
   * AC-6: If the file is malformed, the extension SHALL fall back to an empty
     list and log a warning
   * AC-7: Heartbeat jobs and reminders SHALL NOT add or remove destinations
     from this list when sending messages. A destination absent from the list
     remains eligible for manual notification of its queued messages.


.. req:: Notified Flag on Queued Message
   :id: REQ_MSG_AUTODELIVER_TAG
   :status: implemented
   :priority: optional
   :links: US_COM_DELIVERY; REQ_MSG_QUEUE

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
   :links: US_COM_DELIVERY; REQ_MSG_AUTODELIVER_CONFIG; REQ_MSG_EXPLORER

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
   :links: US_COM_DELIVERY; REQ_MSG_AUTODELIVER_CONFIG; REQ_MSG_AUTODELIVER_TREE

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

   * AC-1: The audit log file SHALL be
     ``<workspaceRoot>/.jarvis/messages/log.json``, obtained from the central
     path resolver and not derived from the queue path
     (``REQ_CFG_PATHSINGLESOURCE``)
   * AC-2: The audit log file format SHALL be a JSON array of ``QueuedMessage``
     entries — identical to the queue file
   * AC-3: Only ``appendMessage()`` writes to the audit log; ``popMessage()``,
     ``deleteMessage()``, and ``deleteByDestination()`` SHALL NOT modify it
   * AC-4: If the audit log file does not exist when the first message is
     written, it SHALL be created automatically


.. req:: Editor-Group Placement Model
   :id: REQ_MSG_EDITORPLACEMENT
   :status: implemented
   :priority: mandatory
   :links: US_MSG_EDITORPLACEMENT; US_COM_NAME; REQ_FLOW_WEBVIEWPANEL

   **Description:**
   The extension SHALL place chat and Actor-file editor tabs into one of
   three semantic targets — **Main**, **Docs**, **Secondary** — derived
   entirely at runtime from the current VS Code editor-group layout
   (``vscode.window.tabGroups``). No new persisted state, YAML flag, or
   runtime map is introduced; every placement decision is computed fresh
   from "does a tab already exist, and where."

   **Note (ahp-mvp):**
   Since the Agent Host path, the chat parts of this model are replaced by
   ``REQ_COM_OPEN``: a click opens or shows the chat in the first editor group
   (AC-1, AC-5, AC-9, AC-12 and AC-13 no longer apply to chats), the Play button
   and the automatic announcement open nothing (``REQ_COM_OPEN`` AC-4), and
   there is no focus snapshot. The code of the Main and Secondary helpers is
   removed. What other features still use is the rule for documents and the
   diagram panel (the Content column, AC-2, AC-3 and AC-11). Whether this model
   is rewritten for documents only or retired is open and not part of the MVP.
   The session UUID lookup that AC-8, AC-11 and AC-12 once relied on is retired
   (``retire-legacy-session-lookup`` CR); the chat-related parts of those
   criteria describe removed behaviour.

   **Acceptance Criteria:**

   * AC-1: **Main** target: view column 1 (fixed). A click on an Actor node
     in the ACTORS tree (``jarvis.openActorSession``) SHALL always result in
     that Actor's chat tab being open and focused in column 1 —
     **regardless of whether the chat session already existed or had to be
     newly created** (``project-actor-click-placement-fix`` CR; supersedes
     the prior "best-effort for new sessions" carve-out — see AC-12 for the
     mechanism that makes the new-session case deterministic too).
   * AC-2: **Docs** target: view column 2 (fixed) — renamed **Content** by
     the ``message-flow-diagram`` CR to reflect that it now hosts more than
     Actor files (see AC-11). Opening a `context.md`, YAML config, or agent
     file from the ACTORS tree (``jarvis.openActorFile``, per
     ``REQ_ACTOR_FILES_TREE``) SHALL open that file in column 2.
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
     known Actor session name or a known Actor file path — arbitrary files the
     user opens manually are
     entirely outside this system's contract and are never moved, closed,
     or reused as a placement target.
   * AC-9: (Superseded by ``REQ_COM_OPEN`` AC-4.) The manual Play-button command
     (``jarvis.sendMessages``) opens no chat.
   * AC-10 (``ui-improvements`` CR): (Superseded by ``REQ_COM_OPEN`` AC-3.)
     Clicking the label of an Actor group in the Messages tree shows the chat of
     that Actor when it exists and does nothing when it does not.
   * AC-11 (``message-flow-diagram`` CR): The message-flow diagram Webview
     Panel (``REQ_FLOW_WEBVIEWPANEL``) SHALL also target the Content column
     (AC-2) as a fixed target, coexisting with any already-open Actor-file
     tab as a separate tab within the same column rather than replacing it.
     Because a Webview Panel tab exposes no ``.uri`` (it is not a plain file
     tab) and is not a chat tab, the
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
   * AC-12 (``project-actor-click-placement-fix`` CR): For the **fresh
     session creation** path (``jarvis.openActorSession``'s no-existing-tab
     branch, and equally the Actor-creation commands that create-and-open
     a chat — both funnel through the shared ``injectPrompt()``
     helper), the extension SHALL perform a **follow-up relocate step**
     after the new session is created, renamed, and initialized: resolve
     the now-existing session's UUID and apply the identical Main-target close+reopen mechanism
     already used for the existing-session branch (AC-5). This makes
     Main-column placement deterministic for freshly created sessions too,
     regardless of which column VS Code happened to create the new chat
     editor in — closing the previously-accepted "best-effort" gap (AC-1)
     without depending on any undocumented VS Code chat-open command option
     (``workbench.action.openChat`` has no public, stable API surface for
     forcing a target column at creation time — confirmed unchanged; this
     AC works around that limitation entirely with already-proven
     mechanisms instead of waiting for one).
   * AC-13 (``project-actor-click-placement-fix`` CR): The relocate step in
     AC-12 SHALL run after the initialization prompt (removed with the
     injection primitive) has been submitted, not before — reordering the sequence
     (relocating first) risks disrupting the "currently focused chat"
     target that the rename and init-prompt commands depend on. If the
     session's UUID unexpectedly still fails to resolve at this point (rename
     propagation edge case), the relocate step SHALL be a silent no-op
     rather than an error — the session remains usable, just not
     guaranteed-repositioned in that rare case.


.. req:: Reminder Persistence Store
   :id: REQ_MSG_REMINDERS_PERSIST
   :status: draft
   :priority: optional
   :links: US_MSG_REMINDERS; REQ_MSG_QUEUE; REQ_CFG_FIXEDPATHS

   **Description:**
   The extension SHALL maintain a persistent YAML file at
   ``<workspaceRoot>/.jarvis/reminders.yaml`` that stores all pending reminders.

   **Acceptance Criteria:**

   * AC-1: The file SHALL follow the schema
     ``{ reminders: [{ id, text, session, deliverAt, createdAt }] }``
     where ``id`` is a UUID string, ``text`` is the message body,
     ``session`` is the target chat tab label, ``deliverAt`` is an ISO 8601
     timestamp, and ``createdAt`` is an ISO 8601 timestamp
   * AC-2: The path SHALL be obtained from the central path resolver
     (``REQ_CFG_PATHSINGLESOURCE``). It SHALL NOT be derived from the queue
     path: reminders are not message state and do not move into
     ``.jarvis/messages/`` (``REQ_CFG_MSGDIR`` AC-4), so the previous derivation
     would have relocated the file to a directory nothing reads.
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
  :links: US_MSG_REMINDERS; REQ_MSG_REMINDERS_PERSIST; REQ_COM_NOTIFY; REQ_MSG_QUEUE; REQ_MSG_AUTODELIVER_CONFIG

  **Description:**
  The existing 5-second poll loop SHALL be extended to check for due reminders
  and queue their messages. The existing auto/manual message-delivery policy
  SHALL then govern notification.

  **Acceptance Criteria:**

   * AC-1: On each tick, after the existing auto-delivery handling, the loop
     SHALL call ``popDueReminders(remindersPath, now)`` to retrieve all reminders
     with ``deliverAt <= now``
   * AC-2: For each due reminder, the loop SHALL call
     ``appendMessage(messagesPath, session, 'Reminder', text)`` to enqueue the
     message for delivery
   * AC-3: Enqueueing a due reminder SHALL NOT change the target's
     auto-delivery preference. For a target already on the auto-delivery list,
     the existing poll loop SHALL notify on a subsequent tick; otherwise the
     message SHALL remain available for manual notification.
   * AC-4: ``popDueReminders`` SHALL remove each due reminder from
     ``reminders.yaml`` before the loop attempts to enqueue it. A failed queue
     append SHALL NOT restore or retry that reminder (at-most-once processing).
   * AC-5: The Messages tree SHALL refresh after reminder enqueueing
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


