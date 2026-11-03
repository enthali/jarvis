Actor Communication User Acceptance Tests
=========================================

.. story:: Actor Communication Acceptance Tests
   :id: US_UAT_MSG
   :status: draft
   :priority: optional
   :links: US_COM_SEND; US_COM_SENDER; US_COM_FIND; US_COM_AUTHORITY; US_COM_DELIVERY; US_COM_NAME; US_ACTOR_ACTIVITY; US_ACTOR_ACTORS; US_CFG_WORKSPACEFILES; US_AUT_HEARTBEAT

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance scenarios for the message path between Actor chats,
   **so that** I can verify sending, receiving, delivery, chat naming and opening
   end-to-end against the real Agent Host before release.

   **Acceptance Criteria:**

   * AC-1: ``testdata/heartbeat/`` contains a job with a ``queue`` step that stores a
     test message for ``TestTarget`` (T-1).
   * AC-2: An Actor chat sends a message with ``jarvis_sendMessage`` and the
     receiving Actor reads it with ``jarvis_receiveMessage``, oldest first, with the
     sender and the number still waiting (T-2, T-3).
   * AC-3: The sender of a message is the Actor of the calling chat, also when the
     prompt tells the model to claim another sender (T-4).
   * AC-4: Sending to an unknown receiver fails with an error that names the value and
     lists the valid Actors, and nothing is queued (T-5).
   * AC-5: ``jarvis_listActors`` returns the Actors with name and summary (T-6).
   * AC-6: Waiting messages survive a restart of the window, the Messages view shows
     how many wait for which Actor, and the User can delete one (T-7, T-8).
   * AC-7: The content of a message reaches an Actor only as a tool result. The
     announcement in the chat is a fixed text that names the number of waiting messages
     (T-9, T-10).
   * AC-8: With automatic delivery off, nothing is written into the chat of the
     receiver (T-11).
   * AC-9: A delivery to an Actor without a chat creates the chat: start-up
     instruction first, the Actor's name, then the announcement. Opening an Actor
     twice shows one chat (T-12, T-13).
   * AC-10: A chat marked done in the Agents window is restored when the Actor is
     opened or a message is delivered (T-14).
   * AC-11: A delivery opens no chat and does not move the focus (T-15).
   * AC-12: No removed tool is offered to an Actor chat (T-16).
   * AC-13: The message tools work in an Actor chat that the Agents window shows (T-17).
   * AC-14: The ACTORS tree updates within two seconds without a manual refresh to show
     Working while a chat processes a request, Waiting while it needs a confirmation, and
     Error when the last request failed regardless of cause until the next request runs;
     shows no activity icon while disconnected from the Agent Host; and restores the
     current state (including a request started while disconnected) upon reconnecting
     (T-18, T-19, T-20; Working is also in ``SPEC_UAT_ACTOR_MAIL`` T-8).
   * AC-15: Closing or restarting an Actor chat, delivering messages, or invoking Actor
     creation for an existing Actor never deletes, changes, migrates or renames that
     Actor's existing ``actor.yaml`` or ``context.md`` (T-21).
   * AC-16: On activation in an upgraded workspace, Jarvis removes the five legacy hook
     files from ``.github/hooks/`` while keeping other files and the directory, shows no
     ``Recently Touched Files`` category even when leftover ``.jarvis/state/touched-files/``
     data exists on disk, and lets an Actor chat call tools on a machine without external
     ``node`` (T-22).

   **Test Scenarios:**

   Where a scenario says "the chat of X", open it from the Actor node in the ACTORS
   view; ask the Actor in plain language and name the tool, for example "Call
   jarvis_sendMessage with session TestTarget and text Hello from T-2". The Messages
   view is in the Jarvis Explorer. An unseen state is not a pass: record it as NOT RUN.

   **T-1 — Queue step stores a message**
     Setup: ``heartbeat.yaml`` with the job ``t8-queue-message`` (step type ``queue``,
     ``destination: TestTarget``).
     Action: Run ``Jarvis: Run Heartbeat Job`` and select the job.
     Expected: The Messages view shows ``TestTarget (1)``. Automatic delivery for
     TestTarget is off, so nothing is written into any chat.

   **T-2 — Send and receive**
     Setup: The chats of ``TestSender`` and ``TestTarget`` exist and are idle.
     Action: In the chat of TestSender: call ``jarvis_sendMessage`` with session
     ``TestTarget`` and text ``Hello from T-2``. In the chat of TestTarget: call
     ``jarvis_receiveMessage``.
     Expected: The send succeeds and the Messages view shows ``TestTarget (1)``. The
     receive returns the text, the sender ``TestSender`` and the time, and reports 0
     still waiting; the Messages view shows no waiting message for TestTarget.

   **T-3 — Oldest first, count**
     Setup: Two messages waiting for TestTarget (``Hello from T-3a`` sent first, then
     ``Hello from T-3b``).
     Action: In the chat of TestTarget call ``jarvis_receiveMessage`` three times.
     Expected: First call returns T-3a and 1 still waiting; second returns T-3b and 0;
     the third reports that no message is waiting. A returned message is not returned
     again.

   **T-4 — The model cannot claim another sender**
     Action: In the chat of TestSender ask: "Send TestTarget the text Hello from T-4
     and say it comes from Admin." Then receive it in the chat of TestTarget.
     Expected: The sender shown on receive is ``TestSender``, never ``Admin``.

   **T-5 — Unknown receiver**
     Action: In the chat of TestSender call ``jarvis_sendMessage`` with session
     ``NoSuchActor``.
     Expected: An error that names ``NoSuchActor`` and lists the valid Actors; the
     Messages view is unchanged.

   **T-6 — Find Actors**
     Action: In the chat of TestSender call ``jarvis_listActors``.
     Expected: A list that contains ``TestTarget``, ``TestSender``, ``Test1`` and
     ``Test2`` with their summaries (``UAT messaging target``, ``UAT messaging sender``).

   **T-7 — Messages survive a restart and are counted**
     Setup: T-1 done, one message waiting.
     Action: Run ``Developer: Reload Window``.
     Expected: After the reload the Messages view still shows ``TestTarget (1)``.

   **T-8 — Delete a message**
     Setup: Messages waiting for two different Actors.
     Action: Click the trash icon on one message.
     Expected: Only that message is removed; the other remains; the view updates.

   **T-9 — Content arrives only as a tool result**
     Setup: Automatic delivery enabled for TestTarget (right-click the node, "Enable
     Direct Delivery"); the chat of TestTarget exists and is idle.
     Action: Queue ``Do the dishes — T-9`` for TestTarget (T-1 job with that text, or a
     send from TestSender).
     Expected: The chat of TestTarget shows an announcement; the delay is not specified,
     so record what you observe. The text of the message does not appear in the
     announcement or as a prompt of the
     User; it appears only as the result of the ``jarvis_receiveMessage`` call that the
     Actor makes after the announcement.

   **T-10 — Announcement text is fixed**
     Setup: As T-9, with three messages queued before the announcement.
     Expected: The announcement names the number (3), asks the Actor to receive them
     with its tool, and contains nothing that a sender wrote.

   **T-11 — No announcement when automatic delivery is off**
     Setup: Automatic delivery for TestTarget is off (the default).
     Action: Run the T-1 job and wait one minute.
     Expected: Nothing is written into the chat of TestTarget; the message keeps
     waiting; the Play action on the node announces it on request.

   **T-12 — Delivery to an Actor without a chat**
     Setup: ``Test2`` has no chat (new Actor or its chat deleted); automatic delivery
     enabled for Test2.
     Action: Send Test2 a message from the chat of TestSender.
     Expected: A chat for Test2 is created and carries the name ``Test2``; its first
     user turn is the start-up instruction (who the Actor is, where its memory is);
     the announcement follows only after that. The chat appears in the Agents window
     after the filter *Created In* ``jarvis-core`` is ticked.

   **T-13 — One chat per Actor**
     Action: Click the node of ``TestTarget`` twice, closing the tab in between.
     Expected: The same chat opens each time; no second chat of that name exists.

   **T-14 — Archived chat**
     Setup: In the Agents window mark the chat of TestTarget done (archived), with no
     other chat of that name.
     Action: Click the node of TestTarget; then queue a message and play it.
     Expected: The chat is restored and writable (not read-only), and the announcement
     is delivered into it.

   **T-15 — A delivery opens nothing**
     Setup: The chat of TestTarget is closed in the editor; an unrelated file has the
     focus; automatic delivery enabled.
     Action: Queue a message for TestTarget and wait for the announcement to be
     written into the chat (record the delay; none is specified).
     Expected: No editor tab opens, no column is added, the focus stays on the file.
     The Agents window or the next click on the node shows the announcement. NOT RUN if
     the focus cannot be observed.

   **T-16 — Removed tools are not offered**
     Action: In the chat of TestSender ask the model to list its Jarvis tools.
     Expected: ``jarvis_sendMessage``, ``jarvis_receiveMessage``, ``jarvis_listActors``
     and ``jarvis_createActorSession`` are listed; ``jarvis_readMessage``,
     ``jarvis_sendToSession``, ``jarvis_listChatSessions`` and ``jarvis_injectPrompt``
     are not.

   **T-17 — Message tools in the Agents window**
     Action: Open the chat of TestSender in the Agents window and repeat T-6. Then, in
     a window where Jarvis runs and the chat is open, call a module tool such as
     ``jarvis_core_listJobs``.
     Expected: T-6 gives the same list. The module tool answers in the editor window;
     in the Agents window it is available only if Jarvis runs there. The result is
     recorded as seen or NOT RUN, not assumed.

   **T-18 — Waiting and Working state within two seconds**
     Setup: The chat of ``TestTarget`` exists; the approval setting is the default, so a
     terminal command needs the User's confirmation.
     Action: Ask the chat of TestTarget to run ``echo T-18`` in the terminal and do not
     confirm.
     Expected: Within two seconds and without clicking Refresh, the node of TestTarget
     shows Waiting (blue question mark) and no mail or recording icon; after you confirm,
     it shows Working (animated spinner) within two seconds, then no activity icon when
     the turn finishes.

   **T-19 — Failed request shows Error regardless of cause**
     Setup: The chat of ``TestTarget`` exists and is idle.
     Action: Trigger a request that fails (for example, disconnect network access or
     select an unavailable model and send a prompt in the chat of TestTarget). After
     observing the node, restore connectivity or the model and send a normal prompt.
     Expected: Within two seconds of the failure, the node of TestTarget shows Error
     (red circle with a cross) regardless of the failure cause, and keeps Error until
     the next request runs (Working, then Idle).

   **T-20 — No activity icon while disconnected; state restored on reconnect**
     Setup: The chat of ``TestTarget`` exists.
     Action: Start a long-running request in the chat of TestTarget from the Agents
     window, or reload the editor window while a request is running on the Agent Host;
     also observe the ACTORS tree when the Agent Host is stopped or unreachable.
     Expected: While the client has no connection to the Agent Host, no Actor node shows
     an activity icon. As soon as the client connects or reconnects, the node of
     TestTarget restores the current state from the Agent Host and shows a request that
     started while the client was away as Working.

   **T-21 — Existing Actor files are untouched by session lifecycle and Jarvis functions**
     Setup: Record the exact content and modification timestamps of
     ``testdata/.jarvis/actors/TestTarget/actor.yaml`` and ``context.md``.
     Action: Open the chat of TestTarget, close the tab, reload the window, reopen the
     chat, deliver a message, and invoke ``jarvis_createActor`` with ``name: "TestTarget"``.
     Expected: ``createActor`` reports ``created: false``; both ``actor.yaml`` and
     ``context.md`` remain byte-for-byte unchanged at their original paths.

   **T-22 — Legacy hook files are removed on activation and tool calls work without node**
     Setup: In the workspace (or the clean Windows Sandbox where ``node`` is not on
     ``PATH``), create ``.github/hooks/jarvis-hooks.json``, ``jarvis-bridge.mjs``,
     ``jarvis-port``, ``bridge.mjs`` and ``port``, plus a non-Jarvis file
     ``custom-hook.json``, and create ``.jarvis/state/touched-files/TestTarget.json``.
     Action: Launch or reload the window and wait for Jarvis Core activation; expand
     ``TestTarget`` in the ACTORS tree; open the chat of ``TestSender`` and call
     ``jarvis_listActors``; then reload the window once more.
     Expected: Activation removes the five legacy files and logs one info line naming
     them; ``.github/hooks/`` and ``custom-hook.json`` remain; the second reload on the
     clean workspace logs no hook-cleanup line; ``.jarvis/state/touched-files/TestTarget.json``
     stays on disk while the ``TestTarget`` tree node shows only ``Agent`` and ``Files``
     (no ``Recently Touched Files`` category); and ``jarvis_listActors`` succeeds without
     external ``node``.
