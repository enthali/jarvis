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
   * AC-4: Clicking a session group node sends all messages for that session to the
     named chat tab and removes them from the queue
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
   :status: approved
   :priority: optional
   :links: US_MSG_CHATQUEUE; US_MSG_OPENSESSION

   **As a** LLM agent working in a Jarvis workspace,
   **I want** a tool that lists all available chat sessions by name,
   **so that** I can discover valid session names before sending messages via
   ``sendToSession``.

   **Acceptance Criteria:**

   * AC-1: A Language Model Tool ``jarvis_listSessions`` is available in the
     Chat tool picker
   * AC-2: The tool returns a list of session names (titles) from the current
     workspace's ``state.vscdb``
   * AC-3: Empty or untitled sessions are excluded from the list


.. story:: Open Agent Session from Explorer
   :id: US_EXP_AGENTSESSION
   :status: approved
   :priority: optional
   :links: US_EXP_SIDEBAR; US_MSG_OPENSESSION; US_EXP_OPENYAML

   **As a** Jarvis User,
   **I want** to open the dedicated agent chat session for a project or event
   directly from its tree node in the Jarvis Explorer,
   **so that** I can jump straight into the agent conversation for that item
   without searching through chat sessions manually.

   **Acceptance Criteria:**

   * AC-1: Every project and event leaf node shows an inline action button
     (comment-discussion icon) to open the agent session for that item
   * AC-2: Clicking the button looks up a chat session whose title matches the
     project/event ``name`` and opens it in the editor
   * AC-3: If no matching session exists, a new editor chat is opened and an
     initialization prompt is sent that tells the agent which project/event it
     is working on and asks the user to rename the session
   * AC-4: Folder nodes do not show the button
