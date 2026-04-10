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
