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
   :links: US_MSG_CHATQUEUE; REQ_EXP_TREEVIEW

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

.. req:: Send Messages to Chat Session
   :id: REQ_MSG_SEND
   :status: implemented
   :priority: optional
   :links: US_MSG_CHATQUEUE; REQ_MSG_SESSIONLOOKUP; REQ_MSG_QUEUE

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
     ``jarvis_readMessage`` tool
   * AC-4: Messages SHALL remain in the queue after notification — the session
     is responsible for consuming them via ``REQ_MSG_READ``
   * AC-5: The Messages tree view SHALL refresh after send completes
   * AC-6: The extension SHALL focus the target session via
     ``vscode.commands.executeCommand('vscode.open',
     Uri.parse('vscode-chat-session://local/<b64uuid>'))`` where the UUID is
     obtained from ``REQ_MSG_SESSIONLOOKUP``
   * AC-7: If ``REQ_MSG_SESSIONLOOKUP`` returns ``undefined`` for the target
     session, the extension SHALL open a new editor chat via
     ``REQ_MSG_OPENCHAT`` instead of raising an error

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
   :status: draft
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


.. req:: List Sessions LM Tool
   :id: REQ_MSG_LISTSESSIONS
   :status: implemented
   :priority: optional
   :links: US_MSG_LISTSESSIONS; REQ_MSG_SESSIONLOOKUP; REQ_MSG_SESSIONFILTER

   **Description:**
   The extension SHALL register a Language Model Tool that returns the list of
   named chat sessions in the current workspace.

   **Acceptance Criteria:**

   * AC-1: A Language Model Tool named ``jarvis_listSessions`` SHALL be registered
     via ``vscode.lm.registerTool`` with ``canBeReferencedInPrompt: true``
   * AC-2: The tool SHALL return the list of session titles (strings) from the
     current workspace's ``state.vscdb``
   * AC-3: The returned list SHALL be filtered by ``REQ_MSG_SESSIONFILTER``
   * AC-4: If no named sessions exist, the tool SHALL return an empty list


.. req:: Read Message LM Tool
   :id: REQ_MSG_READ
   :status: implemented
   :priority: mandatory
   :links: US_MSG_CHATQUEUE; REQ_MSG_QUEUE

   **Description:**
   The extension SHALL register a Language Model Tool that pops the oldest queued
   message for a given destination session, enabling pull-based inbox consumption.

   **Acceptance Criteria:**

   * AC-1: A Language Model Tool named ``jarvis_readMessage`` SHALL be registered
     via ``vscode.lm.registerTool`` with ``canBeReferencedInPrompt: true``
   * AC-2: The tool SHALL accept a ``destination`` parameter (string) identifying
     the target session name
   * AC-3: The tool SHALL return a JSON object with ``message`` (containing
     ``sender``, ``text``, ``timestamp``, or ``null`` if no messages) and
     ``remaining`` (number of messages still queued for that destination)
   * AC-4: The tool SHALL remove the returned message from the queue file
     (pop-oldest semantics)
   * AC-5: If no messages exist for the destination, the tool SHALL return
     ``{ message: null, remaining: 0 }``
   * AC-6: The Messages tree view SHALL refresh after each read


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
   :status: implemented
   :priority: optional
   :links: US_MSG_AUTODELIVERY; REQ_MSG_AUTODELIVER_CONFIG; REQ_MSG_AUTODELIVER_TAG; REQ_MSG_SEND

   **Description:**
   The extension SHALL run a background poll loop that automatically sends
   notifications for sessions listed in ``autodelivery.json``.

   **Acceptance Criteria:**

   * AC-1: A ``setInterval`` timer with a 5 000 ms period SHALL be started during
     extension activation
   * AC-2: On each tick the loop SHALL read the current ``messages.json`` and
     ``autodelivery.json``
   * AC-3: For each session in the auto-delivery list, if at least one message
     exists with ``notified !== true``, the loop SHALL execute
     ``jarvis.sendMessages`` for that session node
   * AC-4: After notification the loop SHALL set ``notified: true`` on all
     messages that were just notified for that session and persist the queue
   * AC-5: The loop SHALL process at most one session per tick (first-found order)
   * AC-6: The timer SHALL be stopped (``clearInterval``) when the extension is
     deactivated
   * AC-7: Errors in a single tick SHALL be caught, logged as warnings, and SHALL
     NOT stop the poll loop


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


.. req:: Pinned Resource Open Helper
   :id: REQ_MSG_PINNED
   :status: implemented
   :priority: optional
   :links: US_MSG_STABLESESSION; US_MSG_CHATQUEUE; REQ_MSG_SESSIONLOOKUP

   **Description:**
   The extension SHALL open any ``vscode-chat-session://`` URI in a pinned
   (non-preview) editor tab so that VS Code does not silently reuse a transient
   editor slot.

   **Acceptance Criteria:**

   * AC-1: ``vscode.commands.executeCommand('vscode.open', uri, { preview: false })``
     SHALL be used for all chat session URI opens — both when focusing an
     existing session and when falling back to a new session URI
   * AC-2: The ``{ preview: false }`` option SHALL be passed as the third argument
     to every ``vscode.open`` call for chat URIs
   * AC-3: The helper SHALL be used consistently by all commands that open chat
     sessions: ``jarvis.sendMessages``, ``jarvis.openSession``, and
     ``jarvis.openAgentSession``


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
   :links: US_MSG_STABLESESSION; REQ_EXP_AGENTSESSION; REQ_MSG_OPENCHAT; REQ_MSG_SENDPROMPT

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
      Read them with the jarvis_readMessage tool (destination: "${destination}") until remaining = 0.

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
