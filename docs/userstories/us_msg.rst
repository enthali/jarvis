Messaging User Stories
======================

.. story:: Chat Message Queue
   :id: US_MSG_CHATQUEUE
   :status: approved
   :priority: mandatory
   :links: US_EXP_SIDEBAR; US_AUT_HEARTBEAT; US_CFG_MSG

   **As a** Jarvis User,
   **I want** messages from Heartbeat jobs to be queued and displayed in the Jarvis
   Explorer, grouped by target chat session, so that I can review and send them to
   the right VS Code chat session with a single click.

   **Acceptance Criteria:**

   * AC-1: A Heartbeat step of type ``queue`` appends a message to the persistent
     queue file (default ``context.storageUri/messages.json``, configurable via
     ``jarvis.messagesFile``) with a ``session`` (target chat tab label) and ``text``
     field
   * AC-2: The Jarvis Explorer shows a "Messages" group with entries grouped by session
     name; the group label shows the message count (e.g. ``Atlas (2)``)
   * AC-3: Hovering a message entry shows a ``$(trash)`` button that deletes the
     individual message
   * AC-4: Clicking a session group node sends a single notification stub to the
     named chat tab informing the session about pending messages; messages stay in
     the queue and are consumed by the session via the ``jarvis_readMessage`` tool
   * AC-4a: The ``jarvis_readMessage`` Language Model Tool returns the oldest
     message for a given destination and removes it from the queue; the session
     calls it repeatedly until ``remaining === 0``
   * AC-5: Session targeting uses ``state.vscdb``
     (``chat.ChatSessionStore.index``) for UUID lookup, then
     ``vscode.open(vscode-chat-session://local/<b64uuid>)`` to focus the session —
     works for open and closed sessions
   * AC-6: If the session is not found in ``state.vscdb``, open a new chat. If
     multiple sessions match the name, use the first match and warn the user
   * AC-7: The Messages group is always shown; when the queue is empty it displays
     a single node with label ``nothing to deliver``


.. story:: Open Chat Session by Name
   :id: US_MSG_OPENSESSION
   :status: approved
   :priority: optional
   :links: US_MSG_CHATQUEUE

   **As a** Jarvis User,
   **I want** a command to browse and open any named chat session in the current
   workspace,
   **so that** I can quickly navigate to a specific agent or conversation without
   scrolling through the Chat history.

   **Acceptance Criteria:**

   * AC-1: A command ``Jarvis: Open Chat Session`` opens a QuickPick listing all
     named sessions in the current workspace (excluding untitled/empty sessions)
   * AC-2: Selecting a session opens it as an editor tab via the
     ``vscode-chat-session://`` URI scheme
   * AC-3: If no named sessions exist, an informational message is shown


.. story:: List Available Chat Sessions (LM Tool)
   :id: US_MSG_LISTSESSIONS
   :status: draft
   :priority: optional
   :links: US_MSG_CHATQUEUE; US_MSG_OPENSESSION

   **As a** LLM agent working in a Jarvis workspace,
   **I want** a tool that lists all available VS Code chat sessions by name,
   **so that** I can discover active chat tab titles before sending messages via
   ``sendToSession``.

   **Acceptance Criteria:**

   * AC-1: A Language Model Tool ``jarvis_listChatSessions`` is available in the
     Chat tool picker (renamed from ``jarvis_listSessions`` which now refers to
     YAML session entities)
   * AC-2: The tool returns a list of chat session names (titles) from the current
     workspace's ``state.vscdb``
   * AC-3: Empty or untitled sessions are excluded from the list


.. story:: Auto-Delivery for Message Sessions
   :id: US_MSG_AUTODELIVERY
   :status: approved
   :priority: optional
   :links: US_MSG_CHATQUEUE

   **As a** Jarvis User,
   **I want** selected chat sessions to receive their queued messages automatically,
   **so that** I do not need to manually click the Play button for sessions whose
   delivery should happen in the background without my intervention.

   **Acceptance Criteria:**

   * AC-1: The user can mark any session as "auto-delivery" via a context menu
     action on the session node in the Messages tree; the session is then
     delivered to automatically on each poll tick without any manual click
   * AC-2: Sessions marked for auto-delivery are shown in a dedicated
     "Auto Delivery" group in the Messages tree (separated from manual sessions),
     so that the user can see at a glance which sessions are on automatic and
     how many messages are pending
   * AC-3: The auto-delivery list persists across extension restarts (stored in
     a config file co-located with the message queue)
   * AC-4: The user can remove a session from auto-delivery via a context menu
     action on the session node inside the "Auto Delivery" group, restoring
     manual delivery behaviour
   * AC-5: Auto-delivery does not re-deliver already-notified messages — each
     message is notified at most once per delivery cycle


.. story:: MCP Server for External Tool Access
   :id: US_MSG_MCPSERVER
   :status: approved
   :priority: mandatory
   :links: US_MSG_CHATQUEUE; US_MSG_LISTSESSIONS

   **As a** Jarvis User,
   **I want** all Jarvis LM Tools (sendToSession, listSessions, readMessage) to be
   accessible via an embedded MCP server on localhost,
   **so that** external clients (heartbeat scripts, other VS Code instances,
   Claude Desktop) can interact with the same tool surface without being inside a
   VS Code Chat session.

   **Acceptance Criteria:**

   * AC-1: The extension SHALL run an embedded MCP server on ``127.0.0.1`` using
     HTTP/SSE transport when ``jarvis.mcpEnabled`` is ``true``
   * AC-2: Every LM Tool registered via ``vscode.lm.registerTool()`` SHALL
     simultaneously be exposed as an MCP Tool on the MCP server with the same
     name and input schema
   * AC-3: The MCP server port SHALL be configurable via ``jarvis.mcpPort``
     (default ``31415``)
   * AC-4: A status bar item SHALL show ``Jarvis MCP: <port>`` when the MCP
     server is running and SHALL be hidden when MCP is disabled
   * AC-5: The MCP server SHALL start during extension activation and stop
     during deactivation
   * AC-6: The MCP server SHALL only bind to ``127.0.0.1`` — no external
     network access


.. story:: Message Audit Log
   :id: US_MSG_LOGGING
   :status: implemented
   :priority: optional
   :links: US_MSG_CHATQUEUE

   **As a** Jarvis administrator,
   **I want** an optional append-only audit log of all queued messages,
   **so that** I can review the full history of messages sent through Jarvis
   even after they have been consumed or deleted from the active queue.

   **Acceptance Criteria:**

   * AC-1: When message logging is enabled via a setting, every message appended
     to the queue is also written to a persistent audit log file
   * AC-2: The audit log is never modified or truncated by read or delete
     operations — it grows monotonically
   * AC-3: The audit log file is co-located with ``messages.json``
   * AC-4: Message logging is disabled by default (opt-in)


.. story:: Stable Agent Session Open
   :id: US_MSG_STABLESESSION
   :status: approved
   :priority: optional
   :links: US_MSG_CHATQUEUE; US_EXP_AGENTSESSION

   **As a** Jarvis User,
   **I want** project and event agent sessions to open without editor-reuse
   artifacts and to receive a stable, recognizable name immediately after
   creation,
   **so that** I always land in the right chat tab and can locate the session by
   name in the session list or via the ``jarvis.openSession`` command.

   **Acceptance Criteria:**

   * AC-1: Opening an existing session SHALL use ``vscode.open`` with
     ``{ preview: false }`` so VS Code does not reuse a transient editor slot
   * AC-2: Creating a new session SHALL use ``workbench.action.openChat``
     (stable VS Code internal command) rather than a raw
     ``vscode-chat-session://local/new`` URI, to prevent editor-reuse bugs
   * AC-3: Immediately after a new session is created, a ``/rename <entity name>``
     command SHALL be submitted to give the session a stable, recognizable name
     that matches the entity name in the Projects or Events tree
   * AC-4: After the rename, a context initialization prompt SHALL be submitted
     containing the path to the entity's ``context.md`` file, derived from the
     entity name (lower-case, spaces replaced with hyphens) under ``projects/``
   * AC-5: Submitting a prompt to the active chat SHALL use
     ``workbench.action.chat.openAgent`` (agent mode) as the primary mechanism,
     with ``workbench.action.chat.open`` (mode: ``'agent'``) as a silent fallback
     for older VS Code builds


.. story:: Remote / Devcontainer Session Lookup Compatibility
   :id: US_MSG_REMOTECOMPAT
   :status: approved
   :priority: optional
   :links: US_MSG_CHATQUEUE; US_MSG_OPENSESSION; US_MSG_LISTSESSIONS

   **As a** Jarvis User running VS Code with a Remote or Devcontainer workspace,
   **I want** session lookup and session listing to work correctly,
   **so that** ``openAgentSession`` finds existing sessions and ``listSessions``
   returns accurate results regardless of whether I am working locally or in a
   remote environment.

   **Acceptance Criteria:**

   * AC-1: ``openAgentSession`` finds an existing named session in a devcontainer
     workspace — no duplicate sessions are created
   * AC-2: The ``jarvis_listSessions`` MCP/LM Tool returns the correct sessions
     when the extension runs inside a devcontainer or Remote SSH window
   * AC-3: Local usage (non-remote workspace) is unaffected — session lookup
     continues to work as before
   * AC-4: When ``state.vscdb`` cannot be found, the extension logs a warning
     and returns an empty list instead of failing silently
   * AC-5: ``lookupSessionUUID('My Session')`` returns the correct UUID when
     VS Code is running in WSL2 remote mode with the workspace on the Linux
     filesystem


.. story:: Time-Scheduled Reminders
   :id: US_MSG_REMINDERS
   :status: draft
   :priority: optional
   :links: US_MSG_CHATQUEUE; US_MSG_AUTODELIVERY

   **As a** Jarvis User or LM agent,
   **I want** to register a time-stamped reminder so that a message is
   automatically delivered to a named chat session at a specified point in time,
   **so that** I can schedule future notifications without having to monitor the
   clock myself.

   **Acceptance Criteria:**

   * AC-1: An LM agent (or the user via MCP) can register a reminder by providing
     ``text``, ``session`` (target chat tab label), and ``deliverAt`` (ISO 8601
     timestamp); the system returns a unique ``id``
   * AC-2: At ``deliverAt`` (within ±5 s) the message is delivered to the target
     session via the auto-delivery pipeline — no manual action required
   * AC-3: After delivery, the reminder is removed from persistent storage
   * AC-4: An LM agent can query open reminders to see ``id``, ``text``,
     ``session``, ``deliverAt``, and remaining time
   * AC-5: An LM agent can cancel a reminder by ``id`` before it fires
   * AC-6: A dedicated "Reminders" sidebar view shows all pending reminders
     with target session, scheduled time, and countdown
   * AC-7: Reminders survive VS Code restarts — they are read from disk on
     activation and delivered when due
   * AC-8: Clicking a reminder node opens ``reminders.yaml`` in the editor
     and reveals the line of that entry, enabling manual inspection or edit


.. story:: Configurable Auto-Delivery Notification Template
   :id: US_MSG_NOTIFICATION_TEMPLATE
   :status: implemented
   :priority: optional
   :links: US_MSG_CHATQUEUE; US_MSG_AUTODELIVERY

   **As a** Jarvis User,
   **I want** the auto-delivery notification message to be in English by default
   and to be customisable via a VS Code setting,
   **so that** agents in English-language sessions receive an actionable inbox
   notification and I can tailor the wording to my project's conventions.

   **Acceptance Criteria:**

   * AC-1: The built-in default notification text is in English (not German) so
     that English-language agent sessions understand the message out of the box
   * AC-2: A setting ``jarvis.messages.notificationTemplate`` (string, scope:
     window, group: Messages) allows the user to override the default text;
     when the setting is empty or contains only whitespace, the built-in default
     is used
   * AC-3: The template supports two placeholders — ``${count}`` (number of
     pending messages) and ``${destination}`` (target session name) — which are
     substituted at delivery time; unknown placeholders are left as-is
   * AC-4: The customised (or default) notification text is applied consistently
     by both the manual deliver-now path (``jarvis.sendMessages`` command) and
     the 5-second auto-delivery poll loop
   * AC-5: Leaving the setting empty restores the built-in English default
     without requiring an extension restart


.. story:: Safe Send-to-Session (Destination Validation)
   :id: US_MSG_SAFE_SEND
   :status: draft
   :priority: mandatory
   :links: US_MSG_CHATQUEUE; US_MSG_LISTSESSIONS

   **As a** LLM agent or Jarvis User,
   **I want** the ``jarvis_sendToSession`` tool to fail immediately with a
   descriptive error when the destination session name is unknown,
   **so that** I am never silently misled into believing a message was delivered
   when it was in fact lost in an unmonitored queue slot.

   **Acceptance Criteria:**

   * AC-1: Invoking ``jarvis_sendToSession`` with a destination that does not
     exist causes the tool call to end in an error, not a success response
   * AC-2: The error message names the supplied destination and lists the
     currently valid destination names so the caller can immediately correct
     the invocation without a separate discovery step
   * AC-3: When the destination is invalid, no message is appended to the queue
     (no side effect)
   * AC-4: When the destination is valid, all existing behaviour is unchanged —
     the message is queued, auto-delivery continues to work, and the tool
     returns a success response as before
   * AC-5: No regression in adjacent workflows (auto-delivery poll loop,
     heartbeat queue steps, MCP access)
   * AC-6: The **valid destination set** is the union of {named VS Code chat
     session titles from ``state.vscdb``} ∪ {YAML entity names from the scanner
     (sessions, projects, events)}. A destination is valid if it appears in
     either subset.
