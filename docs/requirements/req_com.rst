Actor Communication Requirements
================================

.. req:: Jarvis AHP Client
   :id: REQ_COM_CLIENT
   :status: approved
   :priority: mandatory
   :links: US_COM_SEND; US_COM_NAME
   :rationale: Derived from the architecture (the client is embedded in each window); it has no user story of its own.

   **Description:**
   Jarvis SHALL provide the Jarvis AHP Client as the single component through
   which Jarvis talks to the Agent Host of its VS Code instance. The Agent Host
   is an external system. A VS Code instance is one main process, identified by
   VS Code product and user data folder; all its windows share one Agent Host.
   The client runs inside the Jarvis extension of a window and serves the Actors
   of the workspace of that window.

   **Acceptance Criteria:**

   * AC-1: Each window in which Jarvis is active has its own Jarvis AHP Client.
   * AC-2: The Jarvis AHP Client does not depend on the VS Code API.
   * AC-3: The client starts when Jarvis activates in the window and ends when
     Jarvis deactivates.
   * AC-4: Ending the client loses nothing. Data that must outlive it stays in
     the files that hold the Inbox.

.. req:: Jarvis AHP Client Records What the Agent Host Offers
   :id: REQ_COM_AGENTHOST
   :status: approved
   :priority: required
   :links: US_COM_SEND; REQ_COM_CLIENT; REQ_COM_LOG
   :rationale: First step of the AHP change. The recorded information is needed to specify creating chats, injecting messages and the later steps; the step has no user-visible behaviour of its own.

   **Description:**
   When it starts, the Jarvis AHP Client SHALL connect to the Agent Host of its
   VS Code instance and SHALL record the information the Agent Host makes
   available.

   **Acceptance Criteria:**

   * AC-1: On start, the client finds the Agent Host of its VS Code instance and
     connects to it.
   * AC-2: The client records the negotiated protocol version, the identity of
     the Agent Host and, for each agent the Agent Host offers, its name and its
     capabilities.
   * AC-3: The client records the sessions the Agent Host knows, each with its
     title.
   * AC-4: When no Agent Host is available, the client records the reason and
     keeps looking. It connects as soon as an Agent Host is available, also
     when that is later than the start of the client. It does not repeat the
     same entry for every attempt.
   * AC-5: When the Agent Host has restarted, the client finds it again and
     connects to it.

.. req:: Jarvis AHP Client Logging
   :id: REQ_COM_LOG
   :status: approved
   :priority: required
   :links: US_DEV_LOGGING; REQ_COM_CLIENT

   **Description:**
   The Jarvis AHP Client SHALL log its life cycle and its contact with the Agent
   Host in the way the other Jarvis modules log.

   **Acceptance Criteria:**

   * AC-1: The client logs its start and end, each connection to the Agent Host,
     each loss of that connection and each retry, with a timestamp.
   * AC-2: Each entry carries a severity and a module tag, as required by
     ``US_DEV_LOGGING`` AC-2 and AC-3.
   * AC-3: The User can read the entries of the client in a section "Jarvis AHP
     Client" of the Jarvis log of the window.

.. req:: Actor Chats Can Send and Receive Messages
   :id: REQ_COM_CAPABILITY
   :status: approved
   :priority: mandatory
   :links: US_COM_SEND; US_COM_SENDER; US_COM_FIND; US_COM_AUTHORITY

   **Description:**
   Every Actor chat SHALL be able to send messages, receive its waiting messages
   and obtain the list of Actors through Jarvis.

   **Decided:**
   The ability reaches the chat as tools that the Jarvis AHP client publishes to
   the Actor chats (User, 2026-10-28; ``SPEC_COM_TOOLS``).

   **Acceptance Criteria:**

   * AC-1: The ability is available in an Actor chat whichever VS Code window
     shows that chat, the editor window or the Agents window.
   * AC-2: Receiving returns the oldest waiting message with its sender and
     time, and the number of messages still waiting. A message that has been
     returned is no longer waiting.
   * AC-3: The content of a message reaches an Actor only as the result of
     receiving (``US_COM_AUTHORITY`` AC-1 and AC-2).
   * AC-4: Jarvis approves the calls of its own tools itself, because the editor
     offers the User no approval for the tool of another client (User,
     2026-10-28). What reaches an Actor stays under the control of the User
     through the delivery announcement, automatic or manual per Actor
     (``US_COM_DELIVERY``).
   * AC-5: The sender of a message is the Actor whose chat sent it. A tool call
     never takes the sender, or the inbox it reads, from its own input
     (``US_COM_SENDER`` AC-1, ``SPEC_COM_TOOLS`` Caller).

.. req:: Delivery Announcement
   :id: REQ_COM_NOTIFY
   :status: approved
   :priority: required
   :links: US_COM_DELIVERY; US_COM_AUTHORITY; REQ_COM_CAPABILITY

   **Description:**
   When a message is stored for an Actor whose setting asks to be told, or when
   the User asks for the delivery of the waiting messages, Jarvis SHALL tell the
   chat of that Actor that messages are waiting, with a fixed text.

   **Acceptance Criteria:**

   * AC-1: The announcement names the number of waiting messages and asks the
     Actor to receive them with the ability of ``REQ_COM_CAPABILITY``.
   * AC-2: The text is defined by Jarvis. It contains no message content and
     nothing that the sending Actor wrote.
   * AC-3: When the setting of the Actor asks for no announcement, nothing is
     sent to its chat (``US_COM_DELIVERY`` AC-1).
   * AC-4: An announcement never interrupts or replaces what the Actor is
     doing. When the chat is busy, the announcement waits until the chat is
     idle.
   * AC-5: When the Actor has no chat, Jarvis creates it first (``REQ_COM_CHATNAME``
     AC-1) and announces the messages only after the chat has received its
     start-up instruction and its name.

.. req:: Only Jarvis Writes Into an Actor Chat
   :id: REQ_COM_INJECT
   :status: approved
   :priority: mandatory
   :links: US_COM_AUTHORITY; US_COM_NAME; REQ_COM_NOTIFY

   **Description:**
   Text that Jarvis writes into an Actor chat in the voice of the User SHALL be
   one of a fixed set of texts defined by Jarvis.

   **Acceptance Criteria:**

   * AC-1: The fixed texts are the start-up instruction of the Actor
     (``US_COM_NAME`` AC-3) and the announcement of ``REQ_COM_NOTIFY``. The name
     of the chat (``US_COM_NAME`` AC-1) is set directly and is no text written
     into the chat.
   * AC-2: The function that writes into a chat is internal to Jarvis. It is
     not offered as a tool, command or setting, and its text is chosen from the
     fixed texts of AC-1.
   * AC-3: Each text that Jarvis writes into an Actor chat runs with the agent
     of the Actor.

.. req:: Jarvis Records Every Message
   :id: REQ_COM_RECORD
   :status: approved
   :priority: optional
   :links: US_COM_HISTORY; US_COM_SEND; REQ_COM_CAPABILITY

   **Description:**
   Every message between Actors passes through Jarvis, so that Jarvis SHALL be
   able to record it and its delivery.

   **Acceptance Criteria:**

   * AC-1: When history is switched on, each stored message is recorded with
     its sender reference, its receiver, its time and its text.
   * AC-2: Each delivery is recorded with whether the Actor was told that
     messages were waiting (``US_COM_HISTORY`` AC-1 and AC-5).
   * AC-3: The record is kept with the other message data and is not shortened
     when a message is read or deleted (``US_COM_HISTORY`` AC-2 and AC-3).
   * AC-4: Without the User's choice, nothing is recorded
     (``US_COM_HISTORY`` AC-4).

.. req:: Actor Chat Name
   :id: REQ_COM_CHATNAME
   :status: approved
   :priority: required
   :links: US_COM_NAME; REQ_COM_INJECT

   **Description:**
   The chat of an Actor SHALL carry the name of the Actor, and Jarvis SHALL find
   the chat of an Actor by that name.

   **Acceptance Criteria:**

   * AC-1: When Jarvis creates a chat for an Actor, the chat uses the agent of
     the Actor, receives the start-up instruction first (who the Actor is and
     where its memory is) and is given the name of the Actor after that.
   * AC-2: Jarvis finds the chat of an Actor by its name among the sessions of
     the workspace. It keeps no record of its own (User, 2026-10-28).
   * AC-3: When an Actor is opened or a message is delivered to it, Jarvis uses
     the chat that carries the name of the Actor. When there is none, it creates
     one (``US_COM_NAME`` AC-2).
   * AC-4: The User recognises the chat of an Actor by its name.
   * AC-5: The agent file of each Actor has a description, because the Agent Host
     lists, and the model applies, only agent files that have one. Jarvis writes
     the description when it creates the file and adds it to an existing agent
     file that has none (User, 2026-10-28). The description is the summary of
     the Actor.
   * AC-6: When the only chats that carry the name of an Actor are archived,
     Jarvis restores the one modified last before it opens it or delivers to it,
     because an archived chat is read-only in the editor (User, 2026-10-28). A
     chat that is not archived goes first.

.. req:: Actor State From the Agent Host
   :id: REQ_COM_STATE
   :status: approved
   :priority: optional
   :links: US_ACTOR_ACTIVITY; REQ_COM_CLIENT; REQ_COM_CHATNAME

   **Description:**
   The Jarvis AHP Client SHALL take the state of each Actor chat directly from
   the information of the Agent Host, and the ACTORS tree SHALL show it
   (User, 2026-10-28).

   **Acceptance Criteria:**

   * AC-1: The state of a chat is the status that the Agent Host reports for
     its session. No mapping through session ids is used.
   * AC-2: The client learns the state of all sessions when it connects, and each
     change afterwards without asking again. A change shows in the tree within
     two seconds.
   * AC-3: **Working** while the Agent Host reports the chat in progress.
     **Waiting** while it reports that input of the User is needed. **Error**
     while it reports the last request of the chat as failed, until the next
     request runs. **Idle** otherwise.
   * AC-4: A session belongs to an Actor when its title equals the name of the
     Actor and its working folder is the workspace of the window
     (``REQ_COM_CHATNAME`` AC-2). A session that matches no Actor, or several, is
     ignored.
   * AC-5: The node of an Actor shows Error as a red circle with a cross, Waiting
     as a blue question mark and Working as an animated spinner. An Idle Actor
     shows no activity icon. The order against the recording mark and the
     unread-mail icon is that of ``US_ACTOR_MAIL`` AC-4.
   * AC-6: After a connection, also after a new one, the client restores the
     state from the current information of the Agent Host. A request that started
     while the client was away shows as Working.
   * AC-7: While the client has no connection, no Actor shows an activity icon.
   * AC-8: Every failed request shows as Error, whatever the cause (rate limit,
     quota, sign-in, model not available). The kind of error is not
     distinguished (User, 2026-10-28).

   **Note:**
   The Agent Host leaves messages that are queued behind a failed or cancelled
   request waiting until a new message is queued (``FI-2026-10-28``). The Error
   state is the visible sign of it.

.. req:: Opening an Actor Chat
   :id: REQ_COM_OPEN
   :status: approved
   :priority: required
   :links: US_COM_NAME; US_ACTOR_TREE; REQ_COM_CHATNAME; REQ_COM_NOTIFY; REQ_ACTOR_CREATE; REQ_FLOW_ACTORCLICK

   **Description:**
   Clicking an Actor in the ACTORS tree, or choosing Open on it, SHALL show the
   chat of that Actor. Nothing else shows a chat: a delivery of messages opens no
   chat and moves no focus (User, 2026-10-28). The only other caller is the
   creation of an Actor with the setting ``jarvis.actors.openSessionOnCreate``
   (AC-6).

   **Acceptance Criteria:**

   * AC-1: When the chat of the Actor exists and is already open in an editor
     group, that tab is shown. When it exists but is not open, it opens in the
     first editor group.
   * AC-2: When the Actor has no chat, Jarvis creates it (``REQ_COM_CHATNAME``
     AC-1) and shows it.
   * AC-3: Clicking the label of an Actor group in the Messages view shows the
     chat of that Actor when it exists and does nothing when it does not.
   * AC-4: A manual or an automatic delivery opens no chat and does not change
     which editor has the focus (``REQ_COM_NOTIFY``).
   * AC-5: While the client has no connection to the Agent Host, opening shows a
     message that says so and opens nothing. There is no other way to open a chat
     (the old chat UI path is removed, User, 2026-10-28).
   * AC-6: When ``jarvis.actors.openSessionOnCreate`` is ``true``, the creation of
     an Actor shows its chat as a click on it does (AC-1, AC-2). When it is
     ``false``, the creation shows no chat (``REQ_ACTOR_CREATE`` AC-9 and AC-10).
   * AC-7: A click on an Actor in the message-flow diagram behaves as the label
     click of AC-3: it shows the chat when it exists and does nothing when it does
     not (``REQ_FLOW_ACTORCLICK``).
