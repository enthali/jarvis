Messaging User Stories
======================

.. story:: MCP Server for External Tool Access
   :id: US_MSG_MCPSERVER
   :status: approved
   :priority: mandatory
   :links: US_COM_SEND; US_COM_FIND

   **As a** Jarvis User,
   **I want** the Jarvis tools that the extension registers (for example jobs,
   reminders, Kanban, PIM) to be accessible via an embedded MCP server on
   localhost,
   **so that** external clients (heartbeat scripts, other VS Code instances,
   Claude Desktop) can interact with the same tool surface without being inside a
   VS Code Chat session.

   **Acceptance Criteria:**

   * AC-1: When I have enabled it, Jarvis runs an embedded MCP server. It is off
     until I enable it (``REQ_CFG_MCPDEFAULTOFF``)
   * AC-2: Every LM Tool registered via ``vscode.lm.registerTool()`` SHALL
     simultaneously be exposed as an MCP Tool on the MCP server with the same
     name and input schema
   * AC-3: The MCP server port SHALL be configurable via ``jarvis.mcpPort``
     (default ``31415``)
   * AC-4: A status bar item SHALL show ``Jarvis MCP: <port>`` when the MCP
     server is running and SHALL be hidden when MCP is disabled
   * AC-5: When enabled, the MCP server is available as soon as Jarvis is active
     and ends with it; when disabled, nothing starts
   * AC-6: The MCP server SHALL only bind to ``127.0.0.1`` — no external
     network access
   * AC-7: The tools for sending, receiving and finding messages between Actors
     (``US_COM_SEND``, ``US_COM_FIND``) are not offered through MCP, because the
     sender of a message must be the Actor whose chat sends it
     (``US_COM_SENDER``; User, 2026-10-29). An external caller wakes an Actor with
     a heartbeat job or a reminder.


.. story:: Message Audit Log
   :id: US_MSG_LOGGING
   :status: implemented
   :priority: optional
   :links: US_COM_SEND

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


.. story:: Predictable Editor-Group Placement with Focus Restore
   :id: US_MSG_EDITORPLACEMENT
   :status: approved
   :priority: mandatory
   :links: US_COM_NAME; US_COM_DELIVERY; US_ACTOR_TREE; US_ACTOR_FILES_TREE

   **As a** Jarvis User,
   **I want** chat, docs, and delivery tabs to open in predictable, stable
   editor-group columns (Main / Docs / Secondary) with my focus automatically
   restored after a system-initiated delivery,
   **so that** Auto-Delivery no longer disrupts my current work by jumping my
   focus around, and I always know where a given kind of tab will land.

   **Acceptance Criteria:**

   * AC-1: Clicking an Actor node in the ACTORS tree always opens/focuses its
     chat in a fixed Main column (column 1), regardless of where else it may
     currently be open.
   * AC-2: Opening a `context.md`/YAML/agent file from the ACTORS tree always
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


.. story:: Time-Scheduled Reminders
  :id: US_MSG_REMINDERS
  :status: draft
  :priority: optional
  :links: US_COM_SEND; US_COM_DELIVERY

  **As a** Jarvis User or LM agent,
  **I want** to register a time-stamped reminder so that a message is
  queued for a named destination at a specified point in time,
  **so that** I can schedule future notifications without having to monitor the
  clock myself.

  **Acceptance Criteria:**

   * AC-1: An LM agent (or the user via MCP) can register a reminder by providing
     ``text``, ``session`` (target chat tab label), and ``deliverAt`` (ISO 8601
     timestamp); the system returns a unique ``id``
   * AC-2: At ``deliverAt`` (within ±5 s) the message is queued for the target;
     the existing message-delivery preference alone determines whether its
     notification is automatic or awaits manual delivery. The reminder does
     not enable auto-delivery for its target.
   * AC-3: After queueing, the reminder is removed from persistent storage
   * AC-4: An LM agent can query open reminders to see ``id``, ``text``,
     ``session``, ``deliverAt``, and remaining time
   * AC-5: An LM agent can cancel a reminder by ``id`` before it fires
   * AC-6: A dedicated "Reminders" sidebar view shows all pending reminders
     with target session, scheduled time, and countdown
   * AC-7: Reminders survive VS Code restarts — they are read from disk on
     activation and delivered when due
   * AC-8: Clicking a reminder node opens ``reminders.yaml`` in the editor
     and reveals the line of that entry, enabling manual inspection or edit


