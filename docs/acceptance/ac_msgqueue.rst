Actor Communication Acceptance Criteria
=======================================

Manual procedure for the message path between Actor chats of the Messaging module,
executed by the User in an Extension Development Host on the ``testdata`` workspace
against the real Agent Host, with Copilot Chat signed in, as three journeys. The Actor
fixtures are the folders ``TestTarget``, ``TestSender``, ``Test1`` and ``Test2`` under
``testdata/.jarvis/actors/``; ``TestTarget`` has the summary ``UAT messaging target``
and ``TestSender`` the summary ``UAT messaging sender``. "The chat of X" is opened from
the node of X in the ACTORS view; the tester asks the Actor in plain language and names
the tool, for example "Call jarvis_sendMessage with session TestTarget and text Hello".
The Messages view is in the Jarvis Explorer. Automatic delivery is off for every Actor
unless a journey says otherwise. To queue a message for ``TestTarget`` without a
chat, run ``Jarvis: Run Heartbeat Job`` and select the job ``t8-queue-message`` of
``testdata/heartbeat/heartbeat.yaml``. A result that could not be observed is recorded
NOT RUN, not PASS.

.. ac:: An Actor finds and messages another Actor; waiting messages are shown, survive a reload and are announced on Play
   :id: AC_MSG_SEND_JOURNEY
   :status: approved
   :validates: US_COM_FIND; US_COM_SEND; US_COM_SENDER; US_COM_DELIVERY; US_COM_AUTHORITY

   **Given** the chats of ``TestSender`` and ``TestTarget`` open and idle, automatic
   delivery off for ``TestTarget`` and ``Test1``, and no message waiting for either

   1. **When** the tester has ``TestSender`` call ``jarvis_listActors`` and then
      ``jarvis_sendMessage`` with session ``TestTarget`` twice (text ``Hello A``, then
      ``Hello B``)
      **Then** the Actor list contains ``TestTarget``, ``TestSender``, ``Test1`` and
      ``Test2`` with their summaries; the Messages view shows ``TestTarget (2)`` and
      nothing is written into the chat of ``TestTarget`` by itself.

   2. **When** the tester has ``TestTarget`` call ``jarvis_receiveMessage`` twice
      **Then** the calls return ``Hello A`` and ``Hello B`` from ``TestSender``, and the
      Messages view shows no waiting message for ``TestTarget``.

   3. **When** the tester queues one message for ``TestTarget`` with the job
      ``t8-queue-message``, has ``TestSender`` send one message to ``Test1``, opens the
      Messages view, runs ``Developer: Reload Window``, and then clicks the trash icon on
      the message of ``TestTarget``
      **Then** the view shows ``TestTarget (1)`` and ``Test1 (1)`` before and after the
      reload, and after the click only the message of ``TestTarget`` is gone, the message
      of ``Test1`` remains and the view updates.

   4. **When** the tester queues two further messages for ``TestTarget`` (one of them
      with the text ``Do the dishes``, sent from the chat of ``TestSender``) so that
      three wait for it, waits one minute, presses Play on the node ``TestTarget`` in the
      Messages view, and then watches the chat while ``TestTarget`` handles the
      announcement
      **Then** nothing is written into the chat during the minute and the messages keep
      waiting; after Play the chat shows an announcement; the text ``Do the dishes``
      appears only as the result of the ``jarvis_receiveMessage`` call that the Actor makes
      after the announcement, never as a prompt of the User.

.. ac:: An Actor chat is created named and introduced, found again also when archived, and the message tools work in the Agents window
   :id: AC_MSG_CHAT_JOURNEY
   :status: approved
   :validates: US_COM_NAME; US_COM_DELIVERY; US_COM_FIND

   **Given** the Actor ``Test2`` with no chat (a new Actor or its chat deleted),
   automatic delivery enabled for ``Test2``, the Actor ``TestTarget`` with one chat and
   automatic delivery off for it, and the chat of ``TestSender`` open and idle

   1. **When** the tester has ``TestSender`` send ``Test2`` a message and then ticks the
      filter *Created In* ``jarvis-core`` in the Agents window
      **Then** a chat named ``Test2`` exists in the Agents window, its first user turn is
      the start-up instruction (who the Actor is, where its memory is), and the
      announcement of the message follows only after that.

   2. **When** the tester clicks the node ``TestTarget`` twice with the tab closed in
      between, then marks that chat done (archived) in the Agents window, clicks the node
      again, and queues a message for ``TestTarget`` and presses Play on its node
      **Then** the same chat opens each time; the archived chat is restored and writable
      (not read-only), and the announcement is delivered into it.

   3. **When** the tester has the chat of ``TestSender`` in the Agents window call
      ``jarvis_listActors``
      **Then** the result is the same list as in the editor window; if the tester also
      calls a module tool such as ``jarvis_listJobs`` there, it answers only where Jarvis
      runs in that window, and the tester records what was seen.

.. ac:: An Actor waiting for a confirmation shows Waiting, then Working; a failed request shows Error
   :id: AC_ACTOR_ACTIVITY_JOURNEY
   :status: approved
   :validates: US_ACTOR_ACTIVITY

   **Given** the chat of ``TestTarget`` open and idle, and the approval setting at its
   default, so that a terminal command needs the User's confirmation

   1. **When** the tester asks ``TestTarget`` to run ``echo activity-check`` in the
      terminal, leaves it unconfirmed, and later confirms it
      **Then** the node ``TestTarget`` in the ACTORS tree shows Waiting (blue question
      mark); after the confirmation it shows Working (animated spinner), and no activity
      icon once the turn has finished.

   2. **When** the tester provokes a failing request in that chat (for example by
      selecting an unavailable model or cutting network access and sending a prompt),
      observes the node, restores the model or the connection and sends a normal prompt
      **Then** the node ``TestTarget`` shows Error (red circle with a cross) after the
      failure, then Working and no activity icon when the next request has finished. If
      the failure cannot be provoked, this step is recorded NOT RUN.
