Message Queue UAT Requirements
================================

.. req:: Message Queue Test Data
   :id: REQ_UAT_MSG_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_MSG; REQ_MSG_QUEUE; REQ_COM_CAPABILITY; REQ_COM_STATE; REQ_ACTOR_BINDING; REQ_CFG_HOOKCLEANUP; REQ_AUT_HEARTBEAT_RESOLVER_REUSE

   **Description:**
   The repo SHALL contain test data and documented expected outcomes for manual
   verification of the message queue feature.

   **Acceptance Criteria:**

   * AC-1: The queue step defined by ``REQ_UAT_HEARTBEAT_TESTDATA`` AC-5 SHALL
     target a known Actor name with deterministic message text
   * AC-4: Every destination and sender named by the messaging UAT procedures
     SHALL exist as an Actor test fixture, since only Actors are valid
     destinations and senders (``REQ_AUT_HEARTBEAT_RESOLVER_REUSE`` AC-3)
   * AC-2: Expected outcomes for each test scenario (T-1 through T-22 from
     ``US_UAT_MSG``) SHALL be documented in the test protocol, each with the
     status NOT RUN, PASS or FAIL.
   * AC-3: The scenarios that need the Agent Host (T-2 to T-6, T-9 to T-22) SHALL
     run in a window of the same VS Code product that has the Copilot Chat
     extension signed in, because the message tools and session states exist only
     in Actor chats that the Agent Host hosts. A scenario that cannot be observed
     (focus, Agents window, provoked failure) is recorded NOT RUN with the reason,
     not PASS.
