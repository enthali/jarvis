Message Queue UAT Design Specifications
=========================================

.. spec:: Message Queue Test Data Files
   :id: SPEC_UAT_MSG_FILES
   :status: approved
   :links: REQ_UAT_MSG_TESTDATA; SPEC_UAT_HEARTBEAT_FILES

   **Description:**
   The T-8 queue step job in ``testdata/heartbeat/heartbeat.yaml`` (defined in
   ``SPEC_UAT_HEARTBEAT_FILES``) provides the test data for manual verification
   of the message queue feature.

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (queue write)
        - Run T-8 manual job
        - ``messages.json`` contains entry with ``session="Test Session"``
      * - T-2 (notify new)
        - Click send on "Test Session" group
        - New chat opens, notification stub sent, messages remain in queue
      * - T-3 (notify existing)
        - Create "Test Session" chat tab, run T-8, click send
        - Existing tab focused, notification stub sent, messages remain in queue
      * - T-4 (closed session)
        - Close "Test Session" tab, click send
        - Session restored via UUID, notification stub sent, messages remain in queue
      * - T-6 (readMessage)
        - Call ``jarvis_readMessage`` with destination "Test Session"
        - Oldest message returned and removed; remaining count correct; tree refreshes
      * - T-5 (delete)
        - Click trash icon on a queued message
        - Message removed from queue, tree refreshes
      * - T-7 (sendMessage valid)
        - Call ``jarvis_sendMessage`` with valid ``session``/``senderSession``
        - Message queued, no deprecation warning, ``message-log.json`` sender = supplied senderSession verbatim
      * - T-8 (sendMessage missing sender)
        - Call ``jarvis_sendMessage`` with ``senderSession`` omitted/empty
        - Throws ``senderSession is required. Callers must explicitly provide their session name — do not rely on the active editor tab.``; no message appended
      * - T-9 (sendMessage invalid sender)
        - Call ``jarvis_sendMessage`` with an unknown ``senderSession``
        - Throws ``Sender session "${senderSession}" does not exist. Valid senders: ${names}``; no message appended
      * - T-10 (receiveMessage)
        - Call ``jarvis_receiveMessage`` with destination "Test Session"
        - Identical behavior to T-6; no deprecation warning present
      * - T-11 (deprecated sendToSession, hard)
        - Call ``jarvis_sendToSession`` with any input
        - Throws ``This tool is deprecated and no longer functional. Use jarvis_sendMessage instead.``; no message appended; no tree refresh
      * - T-12 (deprecated readMessage, hard)
        - Call ``jarvis_readMessage`` with any input
        - Throws ``This tool is deprecated and no longer functional. Use jarvis_receiveMessage instead.``; no message popped; no tree refresh
      * - T-13 (deprecated tools' discovery-time notice)
        - Inspect ``jarvis_sendToSession``/``jarvis_readMessage`` descriptions in the tool picker
        - Each description prefixed with its own ``[DEPRECATED AND DISABLED — use ... instead.]`` notice
