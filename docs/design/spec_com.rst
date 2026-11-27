Actor Communication Design Specifications
=========================================

Specifications for the AHP change. The first part (client module, discovery,
logging) describes step 1: the Jarvis AHP Client, embedded in the Jarvis
extension, connects to the Agent Host and records what it offers. The second
part (tools, inbox, writing into a chat, session binding) describes the message
path that follows. The first implementation (``35cbb4f``) ran against the real
Agent Host; its findings are part of this text. Statements marked **To
confirm** are assumptions that no run has checked yet.

.. spec:: Jarvis AHP Client Module
   :id: SPEC_COM_CLIENTMODULE
   :status: verified
   :links: REQ_COM_CLIENT; SPEC_COM_AHPDISCOVERY; SPEC_COM_LOGGING

   **Description:**
   The Jarvis AHP Client is a module in ``packages/core/src/engine/ahp/``. It
   runs in the extension host of each window. It is a module of its own so that
   it can later move into a process of its own without a rewrite.

   **No dependency on VS Code (``REQ_COM_CLIENT`` AC-2):** No file of the module
   imports ``vscode``. An ESLint rule ``no-restricted-imports`` for the folder
   enforces this. What the module needs from the extension reaches it as
   arguments:

   * ``userDataDir``: the user data folder of the VS Code instance. The
     extension derives it from the storage folder of the extension
     (``context.globalStorageUri``): it takes the last path segment
     ``globalStorage``, requires the segment ``User`` before it, and drops a
     trailing ``profiles/<id>`` of a non-default profile. The Agent Host
     registry lives in that folder (``SPEC_COM_AHPDISCOVERY``). Verified for the
     default profile on Windows. **To confirm:** non-default profiles, and
     remote windows other than the Codespace (WSL, SSH), whose folder holds no
     registry entry; there the fallback folders apply, else the client keeps
     looking (``SPEC_COM_AHPDISCOVERY`` Retry).
   * ``fallbackUserDataDirs``: further user data folders to search when
     ``userDataDir`` holds no live entry (``SPEC_COM_AHPDISCOVERY`` step 1). The
     extension passes the user data folder of the desktop product, which a VS
     Code Server uses for its registry. It is derived like the server does:
     ``VSCODE_PORTABLE`` (``user-data``), else ``VSCODE_APPDATA``, else the
     application data folder of the platform (Linux ``$XDG_CONFIG_HOME`` or
     ``~/.config``), each with the ``nameShort`` of the product (``Code``,
     ``Code - Insiders``) from ``product.json`` of the application.
   * ``log``: a function taking severity and text (``SPEC_COM_LOGGING``).

   **Interface in step 1:** ``start()`` and ``dispose()``.

   **Interface in the message path step:** ``listActorChatSessions()``,
   ``createActorChatSession(actor)`` (``SPEC_COM_BINDING``), the announcement of
   waiting messages (``SPEC_COM_INBOX``) and the registration of tools with a
   handler each (``SPEC_COM_TOOLS``). The function that queues text into a chat
   is private to the module (``SPEC_COM_INJECT``). The handlers and the
   announcer sit in ``packages/core/src/engine/sessions/`` and also hold no
   ``vscode`` import; the extension passes the inbox, the Actor scanner and the
   log to them. The client names itself ``jarvis-core`` towards the Agent Host;
   a later change of the name makes the filter entry of the Agents window new
   (``FI-2026-10-27``). A window serves the first folder of its workspace; a
   multi-root window is not covered.

   **Life cycle (``REQ_COM_CLIENT`` AC-1, AC-3 and AC-4):**

   * ``activate`` of the extension creates the client and calls ``start()``.
     ``start()`` returns at once; discovery and connection run in the
     background. The activation of Jarvis does not wait for the Agent Host
     and does not fail when the host is missing.
   * ``deactivate`` calls ``dispose()``: pending waits are cancelled, the
     connection to the Agent Host is closed, and the end is logged once.
   * The client keeps nothing that must survive its end. Messages stay in the
     files of the Inbox.

   **Tools:** In step 1 the client provides no tools. In the message path step
   it publishes the tools of ``SPEC_COM_TOOLS``.

.. spec:: Agent Host Discovery and Recording
   :id: SPEC_COM_AHPDISCOVERY
   :status: verified
   :links: REQ_COM_AGENTHOST; SPEC_COM_CLIENTMODULE

   **Description:**
   How the client finds the Agent Host and what it records in the first step.

   **Finding the host:**

   1. Read the endpoint registry of the VS Code instance:
      ``<userDataDir>/agent-host/local-endpoint/entries/*.json`` (default
      folder on Windows ``%APPDATA%\Code``). Source: ``FI-2026-10-27``, from the
      VS Code sources; the Windows default folder was verified in
      ``FI-2026-09-13``. **To confirm:** the path by a run on macOS.
      When the folder holds no live entry, the client reads the registries of
      the fallback folders in order (``REQ_COM_AGENTHOST`` AC-6): a VS Code
      Server keeps its registry in the user data folder of the desktop product,
      not below its own server data folder, and the storage folder of the
      extension points to the latter (``FI-2026-11-18``). The extension passes
      ``fallbackUserDataDirs`` as an argument (``SPEC_COM_CLIENTMODULE``).
   2. Keep the entries that can be read, have ``schemaVersion`` 2, ``type``
      ``editor`` or ``standalone``, an endpoint of type ``socket`` (path) or
      ``tcp`` (host and port) and a pid that answers ``process.kill(pid, 0)``.
      A pid that answers is no proof of a live Agent
      Host: the registry keeps the entries of ended hosts, and a pid can be
      reused (on 2026-10-27 pid 6544 of an old entry belonged to
      ``conhost.exe``). A VS Code Server starts a ``standalone`` host with a
      ``tcp`` endpoint on ``127.0.0.1`` (``FI-2026-11-18``). An ``editor`` entry
      is preferred to a ``standalone`` one.
   3. Several entries can remain. Try them from the most recently written to the
      oldest until one connects, ``editor`` entries first.
   4. Connect to the endpoint of the entry with its connection token (a
      WebSocket over the pipe or socket, or over ``ws://host:port/?tkn=<token>``
      for ``tcp``) and send ``initialize``. The client
      offers the protocol version of the entry, ``1.0.0`` and ``0.9.0``, and
      logs a warning when the negotiated version differs from the one in the
      entry. It subscribes to the root state ``ahp-root://`` with the request,
      because that is the only way to obtain the list of agents. The connection
      token in the registry is the authentication; the client does not leave
      the process of the extension host.

   **Retry:** The Agent Host starts lazily, when a window of the VS Code
   instance first asks for it, and publishes its entry only after it listens
   (``FI-2026-10-27``). When no entry connects, the client waits and repeats
   steps 1 to 4 with a growing interval from one to eight seconds. It does not
   give up: it goes on at the longest interval until the host is there or the
   client is disposed. A chat that the User opens later therefore finds a
   connected client (``REQ_COM_AGENTHOST`` AC-4). The values are those of the
   first implementation, not measured. Only the first failure and each change
   of the reason are logged, not every attempt. **To confirm:** that the host
   starts without the User opening a chat; in the first run it was already
   running.

   **Restart:** The Agent Host ends only when VS Code ends, but VS Code restarts
   it after a failure, up to five times. Each restart is a new process with a
   new entry. When the connection to the host is lost, the client repeats
   steps 1 to 4 (``REQ_COM_AGENTHOST`` AC-5). **To confirm:** a restart against
   the real host.

   **Recording (``REQ_COM_AGENTHOST`` AC-2 and AC-3):** After ``initialize``
   the client logs, at level info:

   * the negotiated protocol version;
   * the identity of the host from the root state, ``_meta.hostBuild`` (version
     and quality). This host sends no ``serverInfo``;
   * the announcements of the host that ``initialize`` carries beside the agent
     list: the flags in ``_meta``, ``telemetry``, ``automations``,
     ``completionTriggerCharacters``, ``terminalCommandPrefix`` and
     ``defaultDirectory``. The result has no single ``capabilities`` field;
   * one line per agent of the root state: provider, name, number of models,
     protected resources and the ``capabilities`` of that agent. These are what
     the requirement calls the capabilities of the Agent Host:
     ``multipleChats`` (with ``fork`` and ``sideChat``) and
     ``multipleWorkingDirectories``;
   * the sessions, from all pages of ``listSessions`` (the list is paginated):
     URI, provider (the ``provider`` field of the summary, not derived from the
     URI scheme: sessions with the scheme ``ahp-session`` and the provider
     ``copilotcli`` exist beside ``copilotcli:`` sessions) and title. The
     summary offers more fields,
     such as status, modification time, working directories and changes; the
     specification does not require them.

   The token is never logged. The client only reads and creates nothing.

   **Authentication:** Each agent announces protected resources. The client
   logs ``auth/required`` at warn level and does not answer it. **Open:**
   whether sessions need authentication for later steps; the Architect decides
   with the User when creating chats is specified.

   **Open:** The chats of a session are not recorded in this step. The agents
   announce ``multipleChats``; whether a session shows several chats is a probe
   for Research (``FI-2026-10-26``). The result decides whether a requirement
   for chats is added.

.. spec:: Jarvis AHP Client Logging
   :id: SPEC_COM_LOGGING
   :status: approved
   :links: REQ_COM_LOG; SPEC_COM_CLIENTMODULE

   **Description:**
   The module writes every entry through the ``log`` function it receives
   (``SPEC_COM_CLIENTMODULE``). The extension passes a function that writes to
   the Jarvis output channel with the module tag ``AHP``, as the other modules
   do (``US_DEV_LOGGING``). The entries with this tag are the section "Jarvis
   AHP Client" of the log (``REQ_COM_LOG`` AC-3).

   **Entries:** Start and end of the client, each connection to the Agent Host,
   each loss of that connection, each change of the reason why no connection is
   possible and the information of ``SPEC_COM_AHPDISCOVERY`` Recording.
   Severity and timestamp come from the output channel (``REQ_COM_LOG`` AC-1
   and AC-2).

.. spec:: Message Tools of the Jarvis AHP Client
   :id: SPEC_COM_TOOLS
   :status: approved
   :links: REQ_COM_CAPABILITY; US_COM_SENDER; US_COM_FIND; SPEC_COM_CLIENTMODULE; SPEC_COM_INBOX; SPEC_COM_BINDING

   **Description:**
   The client publishes four tools to the sessions of the Actors of its
   workspace. The Agent Host offers them to the model as tools of a client
   (``session/activeClientSet``, ``FI-2026-10-27-ahp-message-path-spike``).

   **Names:** ``jarvis_sendMessage``, ``jarvis_receiveMessage``,
   ``jarvis_listActors`` and ``jarvis_createActorSession``. The first three keep
   the names of the old API, with the new function described below (User,
   2026-10-28: the prefix ``jarvis_`` keeps them apart from the native
   ``send_message``, and existing instructions and skills keep working with
   fewer changes). The old family is replaced in the same step: the extension no
   longer registers tools of these names itself (``jarvis_sendMessage``,
   ``jarvis_receiveMessage``, ``jarvis_listActors``), and the deprecated stubs
   (``jarvis_readMessage``, ``jarvis_sendToSession``) and
   ``jarvis_listChatSessions`` and ``jarvis_injectPrompt`` are removed. Only one
   publisher per name remains in a window. A name that two clients publish has
   already broken turns of the Copilot harness (the ``task`` tool of PIM). The
   installed Jarvis version 0.31.1 declares the same three names as extension
   tools. The User holds that this does not collide, because that version
   passes them only as tools of its own window and does not use the Agent Host;
   the Developer saw no problem in the exchange between sessions in the
   development host, and no run with a second window that still has the old
   version has been made (User, 2026-10-28).

   **Publication:** The client publishes the tools in two cases: when it creates
   a session (``createSession`` with ``activeClient``), and with a later
   ``activeClientSet`` for each existing session that ``SPEC_COM_BINDING``
   finds for an Actor of the workspace. It repeats the publication after each
   connection to the Agent Host, because the Agent Host removes the tools about
   33 seconds after the client has disconnected. The model of a session that is
   open in the Agents window saw the tool and called it (User run in the session
   "Research spike W-B", 2026-10-28).

   **Tools:**

   * ``jarvis_sendMessage`` with ``session`` (the recipient Actor) and ``text``.
     The sender is the Actor whose session made the call
     (``SPEC_COM_BINDING``); the model does not name it, and the old parameter
     ``senderSession`` no longer exists. A call from a chat that is no Actor chat
     fails with that message. An unknown ``session`` fails with an error that
     names the value and lists the valid Actor names (``US_COM_SENDER`` AC-2).
     Otherwise the message is stored (``SPEC_COM_INBOX``) and the result says so.
   * ``jarvis_receiveMessage`` without parameters. It returns the oldest
     waiting message of the calling Actor with sender and time, and the number
     of messages still waiting, and removes that message from the inbox
     (``REQ_COM_CAPABILITY`` AC-2). An Actor can only read its own inbox.
   * ``jarvis_listActors`` without parameters. It returns the Actors with name
     and short description (``US_COM_FIND`` AC-1). The source is the evaluation
     of the ``actor.yaml`` files, as the Actor scanner does today; the client
     and the Agent Host are not asked.
   * ``jarvis_createActorSession`` with ``actor``. It finds or creates the chat
     of that Actor (``SPEC_COM_BINDING``) and returns its session address.

   **Caller:** The client reads the calling chat from the envelope channel of
   the actions ``chat/toolCallStart`` and ``chat/toolCallReady``, or from
   ``inputNeededSet`` of kind ``toolClientExecution``, and maps it to the session
   through the session state it has subscribed to (``FI-2026-10-28``). The host
   writes these fields; a model that was told to claim another sender could
   change only the input of the tool. The Actor is the one whose name equals the
   title of that session (``SPEC_COM_BINDING``). A tool never takes a sender or
   an inbox name from its input, and ``jarvis_receiveMessage`` has no
   ``destination`` parameter any more. In the run of the User in the Agents window the client
   named the calling session correctly, while the model had been told to claim
   to be the Architect.

   **Approval:** The client confirms a call of its own tools itself
   (``chat/toolCallConfirmed`` with ``approved`` true and ``confirmed``
   ``setting``), because the editor offers no approval for a tool of another
   client: without the setting that allows all tools, the call would wait for
   ever (User, 2026-10-28, run in the development host). What reaches an Actor
   stays under control of the User through the delivery announcement, automatic
   or manual per Actor (``US_COM_DELIVERY``, ``REQ_COM_CAPABILITY`` AC-4). The
   client confirms only calls that the host addresses to this client.

   **Running a call:** A call runs when ``toolCallReady`` carries ``confirmed``,
   or after the client has confirmed it itself, or when the host raises
   ``inputNeededSet`` of kind ``toolClientExecution`` for this client. Each call
   is answered exactly once, also when the host raises ``inputNeededSet``
   after the confirmation. Subscriptions to one channel are made one after the
   other, because a second ``subscribe`` to a channel that is still waiting
   makes the host cancel the first. Known limit: the Agent Host keeps the tools of
   a client listed for about 33 seconds after it has disconnected, and a call in
   that time waits for a client that is gone (not tested).

   **Log:** Each tool call is logged at info level, and a call that is addressed
   to another client is logged as a warning with the client id of that client.
   Only metadata is logged (``SPEC_COM_LOGGING``).

   **When tools are published:** At each connection and after each scan of the
   Actors (every two minutes by default). A chat that the User renames to an
   Actor name later gets the tools at the next scan.

.. spec:: Inbox and Announcement
   :id: SPEC_COM_INBOX
   :status: approved
   :links: REQ_COM_NOTIFY; REQ_COM_CAPABILITY; US_COM_DELIVERY; SPEC_COM_TOOLS; SPEC_COM_INJECT; SPEC_COM_CLIENTMODULE

   **Description:**
   The inbox is the file of today, ``<workspace>/.jarvis/messages/queue.json``,
   with its entries unchanged: ``destination``, ``sender``, ``text``,
   ``timestamp`` and ``notified``. The list of Actors with automatic delivery
   of today stays the setting of ``US_COM_DELIVERY``. Both live next to the
   workspace of the window. A message for an Actor of another workspace is not
   part of this step.

   **Announcement:**

   1. The extension watches the inbox file. When it changes, for each Actor
      with at least one message whose ``notified`` is not set and whose setting
      asks for automatic delivery, the extension asks the client to announce.
      The User can ask for the same delivery for one Actor by hand (the play
      action of the Messages view).
   2. When the Actor has no chat, the client creates it first
      (``SPEC_COM_BINDING`` Creating the chat). The announcement is queued only
      after the start-up instruction and the name were handed over
      (``REQ_COM_NOTIFY`` AC-5).
   3. The announcement goes to the chat of that Actor (``SPEC_COM_INJECT``). It
      names the number of waiting messages and tells the Actor to read them with
      ``jarvis_receiveMessage`` until none is left. It contains nothing that a
      sender wrote (``REQ_COM_NOTIFY`` AC-1 and AC-2). The setting of the old
      notification template does not apply to it.
   4. After the client has handed the announcement to the Agent Host, the
      messages are marked ``notified``. A message that is already marked is not
      announced again.
   5. An Actor without automatic delivery gets no announcement and no chat
      unless the User asks for the delivery (``REQ_COM_NOTIFY`` AC-3). The
      messages wait until the Actor receives them.

   **No connection:** While the client has no connection to the Agent Host, for
   example in a remote window that finds no host, or before the host has
   started, nothing is announced and no chat is created. The messages stay in
   the inbox and are announced after the connection (the old chat UI path is
   removed, User, 2026-10-28).

   **Record:** The history of ``REQ_COM_RECORD`` is not part of the next step.
   It will use the message log file of today.

.. spec:: Writing Into an Actor Chat
   :id: SPEC_COM_INJECT
   :status: implemented
   :links: REQ_COM_INJECT; REQ_COM_NOTIFY; REQ_COM_CHATNAME; SPEC_COM_CLIENTMODULE

   **Description:**
   One private function of the client, ``queue()``, writes text into a chat in
   the voice of the User. Only the creation of an Actor chat (the start-up
   instruction) and the announcement call it. It is not a tool, a command or a
   setting, and nothing outside the module passes it message content
   (``REQ_COM_INJECT`` AC-2).

   **Callers and texts:** There are two callers, each with a text that Jarvis
   defines:

   * Creating the chat of an Actor: the start-up instruction, built as today
     (``SPEC_ACTOR_INITPROMPT``).
   * Announcing messages (``SPEC_COM_INBOX``): a constant text with the number
     of waiting messages.

   The name of the chat is set by the client directly with
   ``session/titleChanged``, not by text. Typing ``/rename`` into the chat also
   works, because the host executes it; it is the fallback, but it takes a turn
   and a place in the queue.

   **Agent:** Each message that the function hands over carries ``message.agent``
   with the address of the agent file of the Actor. The host does not keep the
   agent for later messages, so the start-up instruction and every announcement
   carry it (``FI-2026-10-28``). The address comes from the ``customizations``
   of the session, which list the agent files of its working folder about three
   seconds after the session was created; the client waits up to eight seconds
   for it. The host lists an agent file only when
   its frontmatter has a ``description``; for a file without one the address is
   accepted and the model ignores the agent. When the agent of the Actor is not
   listed, the function writes the text without an agent and logs a warning that
   names the Actor and the missing ``description``. **Open:** Whether the
   function fails instead. The User decides.

   **Description of the agent file:** It is the summary of the Actor, and the
   Actor name when the summary is empty, because the host lists only agent
   files with a non-empty description (``REQ_COM_CHATNAME`` AC-5,
   ``SPEC_ACTOR_WHOAMI`` step 5).

   **Delivery:** The function hands the text to the Agent Host with
   ``pendingMessageSet``. An idle chat starts a turn at once, a busy chat takes
   the text when it is idle (``FI-2026-10-27-ahp-message-path-spike``). The
   function never uses ``turnStarted`` on an existing chat, because that
   replaces the running turn and removes it from the history
   (``REQ_COM_NOTIFY`` AC-4). A new chat has no running turn, so its
   start-up instruction may use either.

.. spec:: Actor Session Binding
   :id: SPEC_COM_BINDING
   :status: verified
   :links: REQ_COM_CHATNAME; US_COM_NAME; US_COM_SENDER; SPEC_COM_TOOLS; SPEC_COM_INJECT; SPEC_COM_CLIENTMODULE

   **Description:**
   How the client knows which session is the chat of which Actor.

   **No record:** The name of the chat is the key. The client keeps no file and
   no list of its own. It asks the Agent Host for the sessions when it needs
   one (``listSessions``), so a session is found even when the chat was created
   by another window or by an earlier run (User, 2026-10-28).

   **Finding the chat of an Actor** (``REQ_COM_CHATNAME`` AC-2 and AC-3):

   1. Take the sessions of the Agent Host whose title is exactly the name of the
      Actor and whose working folder is the workspace of the window. The working
      folders are the ``workingDirectories`` of the session summary; they are
      compared after normalising the ``file:`` spelling, the ``%3A`` and the case of a
      drive letter on every platform (``FI-2026-10-28``); the rest of the path is
      case-insensitive only where the file system is (not on Linux). The folder keeps an Actor of
      another workspace with the same name apart. When several remain, take the
      one modified last and log a warning, because titles are not unique.
   2. When none remains, create the chat as described below.

   A User who renames the chat of an Actor takes it out of this lookup; the
   next delivery then creates a new chat.

   **Archived chats:** A session with the status bit ``IsArchived`` (64) is an
   archived chat; the Agents window archives it with Mark done, and the editor
   shows it read-only (User run, 2026-10-28). A chat that is not archived goes
   first, and the one modified last among those is taken. When only archived
   chats carry the name, the client takes the one modified last and restores it
   with ``session/isArchivedChanged`` ``false``, the action of Restore in the
   Agents window, before it opens the chat or delivers to it (``REQ_COM_CHATNAME``
   AC-6). Delete in the Agents window removes the session; then the lookup finds
   none and creates a new chat.

   **Creating the chat of an Actor:** The following steps run in this order
   (``REQ_COM_CHATNAME`` AC-1, ``REQ_COM_NOTIFY`` AC-5):

   1. ``createSession`` with the working folder of the workspace, ``isolation``
      ``folder`` and the tools of ``SPEC_COM_TOOLS``. The call has no field for
      an agent. The agent is carried by each message that is written into the
      chat (``SPEC_COM_INJECT``).
   2. The start-up instruction (``SPEC_COM_INJECT``): it tells the Actor who it
      is and where its memory is, and asks it to read the memory
      (``SPEC_ACTOR_INITPROMPT``).
   3. The title: the name of the Actor, set by ``session/titleChanged`` right
      after the first item has been queued.
   4. Only then may the announcement of ``SPEC_COM_INBOX`` be queued. The
      Agent Host takes the queued items one after the other.

   Calls for one Actor run one after the other, so that two deliveries at the
   same time create one chat and not two.

   **Title:** The harness keeps a title that a client has set and generates one
   only when none is set. A title set right after the first item stayed through
   all turns (``FI-2026-10-28``, this build and the default model).

   **Finding the Actor of a chat** (the sender of a tool call,
   ``SPEC_COM_TOOLS``): the Actor whose name equals the title of the calling
   session. The title is read from the session, not from the chat; a second
   chat of a session has an empty title. A chat without a match is no Actor
   chat. The User can rename a session at any time, so the client resolves the
   Actor again on each ``titleChanged`` and keys its state on the session
   address.

.. spec:: Opening an Actor Chat
   :id: SPEC_COM_OPEN
   :status: approved
   :links: REQ_COM_OPEN; SPEC_COM_BINDING; SPEC_COM_CLIENTMODULE

   **Description:**
   The commands ``jarvis.openActorSession`` (click and Open on an Actor node) and
   ``jarvis.openMessageActorChat`` (label click of an Actor group in the Messages
   view, and click on an Actor in the message-flow diagram, ``SPEC_FLOW_ACTORCLICK``)
   call the client. ``jarvis.openMessageActorChat`` takes any object with a
   ``destination`` and only finds the chat.

   **Algorithm:**

   1. Find the chat of the Actor (``SPEC_COM_BINDING``). For the Actors tree, create
      it when it is missing; for the Messages view, do nothing when it is missing
      (``REQ_COM_OPEN`` AC-3).
   2. Read ``vscode.window.tabGroups.all``. The editor addresses a session of the
      Agent Host as ``agent-host-<provider>:/<id>``, that is the session address
      with the prefix ``agent-host-``; the address without the prefix belongs to
      the Copilot CLI provider and opens an empty chat (User run, 2026-10-28).
      A tab shows the chat when ``tab.input.uri.toString()`` equals that
      editor address (the tab label is not reliable and is not used). When such a
      tab exists, call ``vscode.open`` with the editor address and the
      ``viewColumn`` of its group, which shows that tab. Otherwise call
      ``vscode.open`` with the editor address and ``ViewColumn.One``. Both with
      ``preview: false``. Other ways failed in the User run: ``vscode.open`` on
      ``copilotcli:/`` and ``ahp-session:/``, a ``agent-host-session://`` link and
      ``openSessionInEditorGroup``.
   3. The window whose extension host runs the command opens the chat; no routing by
      workspace takes place.
   4. While the client has no connection, show an information message and open
      nothing (``REQ_COM_OPEN`` AC-5).

   A delivery never calls this function (``REQ_COM_OPEN`` AC-4). The creation
   of an Actor calls it when ``jarvis.actors.openSessionOnCreate`` is ``true``
   (``SPEC_ACTOR_CREATE`` step 7, ``REQ_COM_OPEN`` AC-6).

   **Focus:** The open call does not steal the focus from the chat in which the
   User is typing (User run in a window with focus, 2026-10-28).

.. spec:: Actor State in the Tree
   :id: SPEC_COM_STATE
   :status: implemented
   :links: REQ_COM_STATE; SPEC_COM_CLIENTMODULE; SPEC_COM_BINDING

   **Description:**
   How the client turns the status of the sessions into the state of the Actors
   (``FI-2026-10-28-ahp-probe4-activity-signals``).

   **Source:** The client keeps its subscription to the root channel
   ``ahp-root://``. It reads ``listSessions`` after each connection, also a new
   one, because notifications are not repeated. After that it follows
   ``root/sessionAdded``, ``root/sessionSummaryChanged`` and
   ``root/sessionRemoved``. A change arrives about 100 ms after the action. The
   module offers ``onSessionsChanged(listener)``; the listener receives the
   sessions with address, title, working folders and status.

   **Status to state:** The status of a session is a set of bits: ``Idle`` 1,
   ``Error`` 2, ``InProgress`` 8, ``InputNeeded`` 24; ``IsRead`` 32 and
   ``IsArchived`` 64 are ignored here. The state is Waiting when the
   ``InputNeeded`` part is set, otherwise Working when ``InProgress`` is set,
   otherwise Error when ``Error`` is set, otherwise Idle. A cancelled turn gives
   Idle. A failed turn keeps Error until the next turn runs. A client tool in
   flight, a compaction and a subagent change nothing.

   **Actor:** A session belongs to the Actor whose name equals its title and whose
   working folder is the workspace of the window (``SPEC_COM_BINDING``). When
   several sessions carry the name of an Actor, the strongest state shows (Error,
   Waiting, Working, Idle). A session of no Actor is ignored.

   **Tree:** The extension passes the state per Actor to ``ActorTreeProvider``,
   which refreshes only when the state of an Actor changes. The icons are a red
   ``error`` (circle with a cross) for Error, a blue ``question`` for Waiting and
   an animated ``loading~spin`` for Working (the spin modifier animates the icon
   of a tree node, User run, 2026-10-28); Idle sets no icon. The state is shown
   before the mark of a recording and before any indicator (``SPEC_ACTOR_TREE``
   AC-6). While the client has no connection the extension passes no state.

   **Replaces:** the former ``ActivityTracker``; nothing else supplies the state.
