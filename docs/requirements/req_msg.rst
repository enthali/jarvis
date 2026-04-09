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
   The extension SHALL provide a command to send all queued messages for a given
   session to the corresponding VS Code Chat tab.

   **Acceptance Criteria:**

   * AC-1: A send action SHALL be available on each session group node in the
     Messages tree view
   * AC-2: The extension SHALL focus the target chat tab before submitting
   * AC-3: Each message SHALL be submitted via
     ``workbench.action.chat.open({ query })``
   * AC-4: After successful submission, delivered messages SHALL be removed from
     the queue file
   * AC-5: The Messages tree view SHALL refresh after send completes
   * AC-6: The extension SHALL focus the target session via
     ``vscode.commands.executeCommand('vscode.open',
     Uri.parse('vscode-chat-session://local/<b64uuid>'))`` where the UUID is
     obtained from ``REQ_MSG_SESSIONLOOKUP``
   * AC-7: If ``REQ_MSG_SESSIONLOOKUP`` returns ``undefined`` for the target
     session, the extension SHALL open a new editor chat via
     ``vscode-chat-session://local/new`` instead of raising an error

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
   :status: implemented
   :priority: optional
   :links: US_MSG_CHATQUEUE

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
