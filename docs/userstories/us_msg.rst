Messaging User Stories
======================

.. story:: Chat Message Queue
   :id: US_MSG_CHATQUEUE
   :status: approved
   :priority: mandatory
   :links: US_EXP_SIDEBAR; US_AUT_HEARTBEAT; US_CFG_FIXEDPATHS; US_INJ_INJECT

   **As a** Jarvis User,
   **I want** messages from Heartbeat jobs to be queued and displayed in the Jarvis
   Explorer, grouped by target chat session, so that I can review and send them to
   the right VS Code chat session with a single click.

   **Acceptance Criteria:**

   * AC-1: A Heartbeat step of type ``queue`` appends a message to the persistent
     queue file with a ``session`` (target chat tab label) and ``text`` field.
     The queue location is fixed and not configurable (``US_CFG_FIXEDPATHS``
     AC-4); this story does not constrain it further.
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
     Chat tool picker (renamed from ``jarvis_listActors`` which now refers to
     YAML session entities)
   * AC-2: The tool returns a list of chat session names (titles) from the current
     workspace's ``state.vscdb``
   * AC-3: Empty or untitled sessions are excluded from the list


.. story:: Platform-Wide Session Enumeration
   :id: US_MSG_JARVISSESSIONS
   :status: draft
   :priority: optional
   :links: US_MSG_LISTSESSIONS; US_ENT_AGENTSESSION

   *Context: Generalises the kind-specific enumeration tools
   (``jarvis_listActors`` for the ``session`` kind, ``jarvis_listProjects`` for
   the ``project`` kind) into a single cross-kind tool. The central scanner
   already holds every entity of every registered kind; this story publishes that
   already-existing list via the platform API — no new scanner, provider, or
   registry. Unblocks Issue #3 (``/freshmind`` + ``/housekeeping``).*

   **As an** LLM agent or automation working in a Jarvis workspace,
   **I want** a single tool that lists **all** Jarvis sessions across every
   registered kind (sessions, projects, events, and any future kind),
   **so that** I can build cross-cutting features without coupling to any specific
   add-on's internals.

   **Acceptance Criteria:**

   * AC-1: A platform API method ``JarvisCoreApi.listJarvisSessions()`` returns
     all scanned entities across all registered kinds as ``JarvisSession[]``
     (``{name, summary, agent, kind, folder}``).
   * AC-2: An LM/MCP tool ``jarvis_listJarvisSessions`` wraps the API and is
     available in the Chat tool picker (and via the MCP server, dual registration).
   * AC-3: The result reflects the central scanner's current state — no separate
     scan and no per-add-on coupling.
   * AC-4: No new scanner, provider, or registry is introduced — the existing
     ``scanner.entities`` list is published.


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
   * AC-3: The audit log is stored with the other message state, so it can be
     found, backed up, or cleared together with it
     (``US_CFG_RUNTIMELAYOUT``). Its exact location is owned by
     ``US_CFG_FIXEDPATHS``, not by this story
   * AC-4: Message logging is disabled by default (opt-in)


.. story:: Stable Agent Session Open
   :id: US_MSG_STABLESESSION
   :status: approved
   :priority: optional
   :links: US_MSG_CHATQUEUE; US_ENT_AGENTSESSION

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


.. story:: Predictable Editor-Group Placement with Focus Restore
   :id: US_MSG_EDITORPLACEMENT
   :status: approved
   :priority: mandatory
   :links: US_MSG_STABLESESSION; US_MSG_AUTODELIVERY; US_ENT_AGENTSESSION; US_ENT_ENTITY_FILES_TREE

   **As a** Jarvis User,
   **I want** chat, docs, and delivery tabs to open in predictable, stable
   editor-group columns (Main / Docs / Secondary) with my focus automatically
   restored after a system-initiated delivery,
   **so that** Auto-Delivery no longer disrupts my current work by jumping my
   focus around, and I always know where a given kind of tab will land.

   **Acceptance Criteria:**

   * AC-1: Clicking an Actor node in the entity tree always opens/focuses its
     chat in a fixed Main column (column 1), regardless of where else it may
     currently be open.
   * AC-2: Opening a `context.md`/YAML/agent file from the entity tree always
     opens/focuses it in a fixed Content column (column 2) — shared, since
     the ``message-flow-diagram`` CR, with the message-flow diagram Webview
     Panel (both are non-Main "read/reference" content and coexist as
     separate tabs within the same column; see ``US_FLOW_CHORDVIEW``).
   * AC-3: A system-initiated delivery to a session with no open tab opens it
     in the current last-existing column (Secondary) — no runaway column
     creation, no manual configuration required.
   * AC-4: If a tab is already open anywhere — including a column the user
     manually moved it to — the system finds and focuses it there instead of
     moving or duplicating it (except for the Main-column click rule, which
     always relocates to column 1).
   * AC-5: Before a system-initiated delivery (Auto-Delivery), my current
     focus (an editor tab or a terminal) is remembered and automatically
     restored immediately after the delivery completes.
   * AC-6: No new configuration or persisted state is introduced — the
     placement and restore behavior is derived entirely from the current
     editor layout at the moment of the action.


.. story:: Agent Mode Changes Only the Session They Target
   :id: US_MSG_MODETARGET
   :status: approved
   :priority: mandatory
   :links: US_MSG_STABLESESSION; US_MSG_EDITORPLACEMENT

   **As a** Jarvis user,
   **I want** an agent-mode assignment to affect only the session it was meant
   for,
   **so that** a background delivery never silently changes the mode of the
   session I am working in.

   **Context:**
   Reproduced 2026-08-21. Creating a new actor session correctly assigns its
   mode, but a follow-up mode-set lands on the *previously focused* session —
   observed as the Project Manager session having its mode changed to the new
   session's mode. The damage is to the bystander session, not the new one.

   The mode-set mechanism (``workbench.action.chat.open<ModeName>``, our
   workaround for ``microsoft/vscode#317276``) carries no session identity: it
   applies to whichever chat editor is focused when it runs. Whether the right
   editor is focused at that instant is currently left to fixed delays. That
   makes a wrong target possible in normal operation, not only under load.

   **Acceptance Criteria:**

   * AC-1: An agent-mode assignment intended for one session never changes the
     mode of any other session.
   * AC-2: When the intended session cannot be confirmed as the target at the
     moment the mode would change, the mode is left unchanged rather than
     applied to whatever happens to be focused.
   * AC-3: A skipped assignment is visible in the log, naming both the intended
     session and what was actually focused instead.
   * AC-4: A log line stating that a mode was applied to a session means it was
     applied to *that* session — success is never reported for an unverified
     target.
   * AC-5: Creating several actor sessions in close succession does not cause
     one delivery's focus handling to interfere with another's.
   * AC-6: Sessions whose mode assignment is skipped are left usable — the
     session opens and receives its message as before; only the mode change is
     withheld.


.. story:: Auto-Delivery Skips Actively-Used Sessions
   :id: US_MSG_AUTODELIVERY_OPTOUT
   :status: deprecated
   :priority: mandatory
   :links: US_MSG_AUTODELIVERY; US_MSG_EDITORPLACEMENT

   **Retired (``remove-autodelivery-focus-gate`` CR):** The focus gate
   conflicts with parallel-pipeline dispatch — when Change Manager dispatches
   multiple actors simultaneously, the switchback mechanism can leave one
   actor's tab focused, silently suppressing its next delivery indefinitely.
   Explicit user control (per-session enable/disable auto-delivery toggle)
   already exists and replaces implicit focus inference. The entire story is
   retired; ``REQ_MSG_AUTODELIVERY_OPTOUT`` and ``SPEC_MSG_AUTODELIVERY_OPTOUT``
   are retired correspondingly.

   **Historical description** (kept for traceability):

   **As a** Jarvis User,
   **I want** Auto-Delivery to skip a session I am actively chatting in,
   **so that** queued messages don't interrupt or disrupt an in-progress
   conversation.

   **Acceptance Criteria (historical, no longer enforced):**

   * ~~AC-1: If the target session's chat tab is the currently active
     (focused) editor tab at poll time, Auto-Delivery SHALL skip delivering
     to it on that tick.~~
   * ~~AC-2: A skipped message remains queued and is retried on a subsequent
     poll tick once the session is no longer the active tab.~~
   * ~~AC-3: The manual "Play button" (``jarvis.sendMessages``) delivery path
     is unaffected by this opt-out — it always delivers immediately when
     invoked, regardless of active-use state.~~
   * ~~AC-4: No new configuration or persisted state is introduced — active-use
     is derived from the current editor layout at poll time.~~


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
   * AC-2: The ``jarvis_listActors`` MCP/LM Tool returns the correct sessions
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
   :status: draft
   :priority: optional
   :links: US_MSG_CHATQUEUE; US_MSG_AUTODELIVERY; US_INJ_INJECT

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
   * AC-3: The template supports three placeholders — ``${count}`` (number of
     pending messages), ``${destination}`` (target session name), and
     ``${sender}`` (comma-separated distinct sender names from the pending
     batch) — which are substituted at delivery time; unknown placeholders
     are left as-is
   * AC-4: The customised (or default) notification text is applied consistently
     by both the manual deliver-now path (``jarvis.sendMessages`` command) and
     the 5-second auto-delivery poll loop
   * AC-5: Leaving the setting empty restores the built-in English default
     without requiring an extension restart
   * AC-6: (**notification-template-empty-fallback CR, GH #56**) The built-in
     default applies regardless of *how* the setting became empty. Clearing the
     text field in the Settings UI persists an explicit empty string at User
     scope, which is not the same state as "setting never touched" — but the
     user cannot see that difference and must not have to. Both states, plus a
     whitespace-only value, produce the same delivered notification
   * AC-7: (**GH #56**) A notification that is never submitted to chat is never
     silent. The Jarvis log always shows whether a delivery attempt actually
     submitted text, so a configuration mistake shows up as a diagnosable log
     entry instead of messages that appear delivered but were never announced


.. story:: Safe Send-to-Session (Destination Validation)
   :id: US_MSG_SAFE_SEND
   :status: draft
   :priority: mandatory
   :links: US_MSG_CHATQUEUE; US_MSG_LISTSESSIONS

   **As a** LLM agent or Jarvis User,
   **I want** the send-message tool (``jarvis_sendToSession`` and its canonical
   replacement ``jarvis_sendMessage``) to fail immediately with a descriptive
   error when the destination session name is unknown,
   **so that** I am never silently misled into believing a message was delivered
   when it was in fact lost in an unmonitored queue slot.

   **Acceptance Criteria:**

   * AC-1: Invoking the send-message tool with a destination that does not
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


.. story:: Trustworthy Sender Attribution (Sender Validation)
   :id: US_MSG_SENDER_REQUIRED
   :status: draft
   :priority: mandatory
   :links: US_MSG_CHATQUEUE; US_MSG_SAFE_SEND

   **As a** LLM agent, Jarvis User, or downstream consumer of the message log
   (e.g. the Message Flow diagram),
   **I want** the canonical send-message tool to require and validate an
   explicit ``senderSession`` rather than falling back to whatever editor tab
   happens to be active,
   **so that** every queued message's recorded sender is trustworthy, and I am
   never left debugging a misattributed message (e.g. ``sender:
   "message-log.json"`` or ``sender: "Keyboard Shortcuts"``) caused by a
   fallback that has nothing to do with the actual calling agent.

   **Acceptance Criteria:**

   * AC-1: Invoking the canonical send-message tool without a ``senderSession``
     causes the tool call to end in an error, not a success response — there is
     no active-tab fallback
   * AC-2: Invoking the canonical send-message tool with a ``senderSession``
     that does not match any valid destination/session name causes the tool
     call to end in an error, not a success response
   * AC-3: When ``senderSession`` is missing or invalid, no message is appended
     to the queue (no side effect)
   * AC-4: When ``senderSession`` is valid, all existing send behaviour is
     unchanged — the message is queued with the correct sender, auto-delivery
     continues to work, and the tool returns a success response as before
   * AC-5: This requirement applies **only** to the new canonical tool. The
     deprecated predecessor tool keeps its current (unfixed) active-tab
     fallback behaviour unchanged until it is removed in a separate future
     change (GH Issue #13)
