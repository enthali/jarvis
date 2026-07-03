Message Queue UAT Requirements
================================

.. req:: Message Queue Test Data
   :id: REQ_UAT_MSG_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_MSG; REQ_MSG_QUEUE; REQ_MSG_SENDMESSAGE; REQ_MSG_RECEIVEMESSAGE; REQ_MSG_SENDER_ERROR

   **Description:**
   The repo SHALL contain test data and documented expected outcomes for manual
   verification of the message queue feature.

   **Acceptance Criteria:**

   * AC-1: The queue step defined by ``REQ_UAT_HEARTBEAT_TESTDATA`` AC-5 SHALL
     target a known session name with deterministic message text
   * AC-2: Expected outcomes for each test scenario (T-1 through T-6 from
     ``US_UAT_MSG``) SHALL be documented in the test protocol
   * AC-3: Expected outcomes for the ``jarvis_sendMessage``/``jarvis_receiveMessage``
     canonical tools and the deprecated ``jarvis_sendToSession``/
     ``jarvis_readMessage`` tools (T-7 through T-13 from ``US_UAT_MSG``) SHALL be
     documented in the test protocol, including the exact expected error text for
     missing/invalid ``senderSession``, the deprecation-warning presence/absence,
     and the correct ``sender`` attribution in ``message-log.json``
