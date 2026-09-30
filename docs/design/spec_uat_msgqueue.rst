Message Queue UAT Design Specifications
=========================================

.. spec:: Message Queue Test Data Files
   :id: SPEC_UAT_MSG_FILES
   :status: approved
   :links: REQ_UAT_MSG_TESTDATA; SPEC_UAT_HEARTBEAT_FILES; SPEC_ACTOR_SCANNER

   **Description:**
   The T-8 queue step job in ``testdata/heartbeat/heartbeat.yaml`` (defined in
   ``SPEC_UAT_HEARTBEAT_FILES``) provides the test data for manual verification
   of the message queue feature.

   **Actor fixtures** (shared by the messaging UATs — message queue,
   heartbeat queue steps, auto-delivery, reminders, notification template,
   MCP server, message logging): only Actors are valid destinations and
   senders (``REQ_AUT_HEARTBEAT_RESOLVER_REUSE`` AC-3), so the repo SHALL
   contain every name these procedures address as an Actor folder under
   ``testdata/.jarvis/actors/``:

   .. list-table::
      :header-rows: 1
      :widths: 40 60

      * - Folder
        - ``actor.yaml``
      * - ``TestTarget/``
        - ``name: TestTarget``, ``summary: UAT messaging target``, ``agent: ""``
      * - ``TestSender/``
        - ``name: TestSender``, ``summary: UAT messaging sender``, ``agent: ""``
      * - ``TestSession/``
        - ``name: TestSession``, ``summary: UAT notification target``, ``agent: ""``

   Each name SHALL be carried by exactly one Actor. The legacy
   ``testdata/sessions-engine-test/TestSession/session.yaml`` SHALL NOT be
   part of the test data; it is not an Actor and addresses nothing. As of
   this design the three fixtures do not exist yet and the legacy file is
   still present — both are implementation work of
   ``retire-legacy-actor-kinds``. A destination's chat session is
   the Actor's own chat (``SPEC_INJ_INJECT``); "no session exists" in a
   procedure means no chat has been opened for that Actor yet.

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (queue write)
        - Run T-8 manual job
        - ``messages.json`` contains entry with ``session="TestTarget"``
      * - T-2 (notify new)
        - No chat open for "TestTarget"; click send on the "TestTarget" group
        - New chat opens, notification stub sent, messages remain in queue
      * - T-3 (notify existing)
        - "TestTarget" chat open (from T-2), run T-8, click send
        - Existing tab focused, notification stub sent, messages remain in queue
      * - T-4 (closed session)
        - Close "TestTarget" tab, click send
        - Session restored via UUID, notification stub sent, messages remain in queue
      * - T-6 (retired — readMessage)
        - Not run: ``jarvis_readMessage`` is hard-deprecated; its only expected behaviour is the error of T-12
        - —
      * - T-5 (delete)
        - Click trash icon on a queued message
        - Message removed from queue, tree refreshes
      * - T-7 (sendMessage valid)
        - Call ``jarvis_sendMessage`` with ``session: "TestTarget"``, ``senderSession: "TestSender"``
        - Message queued, no deprecation warning, ``message-log.json`` sender = ``TestSender`` verbatim
      * - T-8 (sendMessage missing sender)
        - Call ``jarvis_sendMessage`` with ``senderSession`` omitted/empty
        - Throws ``senderSession is required. Callers must explicitly provide their session name — do not rely on the active editor tab.``; no message appended
      * - T-9 (sendMessage invalid sender)
        - Call ``jarvis_sendMessage`` with an unknown ``senderSession``
        - Throws ``Sender session "${senderSession}" does not exist. Valid senders: ${names}``; no message appended
      * - T-10 (receiveMessage)
        - Call ``jarvis_receiveMessage`` with destination "TestTarget"
        - Oldest message returned and removed; remaining count correct; tree refreshes; no deprecation warning present
      * - T-11 (deprecated sendToSession, hard)
        - Call ``jarvis_sendToSession`` with any input
        - Throws ``This tool is deprecated and no longer functional. Use jarvis_sendMessage instead.``; no message appended; no tree refresh
      * - T-12 (deprecated readMessage, hard)
        - Call ``jarvis_readMessage`` with any input
        - Throws ``This tool is deprecated and no longer functional. Use jarvis_receiveMessage instead.``; no message popped; no tree refresh
      * - T-13 (deprecated tools' discovery-time notice)
        - Inspect ``jarvis_sendToSession``/``jarvis_readMessage`` descriptions in the tool picker
        - Each description prefixed with its own ``[DEPRECATED AND DISABLED — use ... instead.]`` notice
