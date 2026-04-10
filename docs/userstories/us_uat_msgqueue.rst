Message Queue User Acceptance Tests
=====================================

.. story:: Message Queue and Send-to-Chat Acceptance Tests
   :id: US_UAT_MSG
   :status: approved
   :priority: optional
   :links: US_MSG_CHATQUEUE; US_AUT_HEARTBEAT

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the message queue and send-to-chat
   feature, so that I can verify the feature end-to-end before release.

   **Acceptance Criteria:**

   * AC-1: ``testdata/heartbeat/`` contains a job with a ``queue`` step that appends
     a test message
   * AC-2: Test scenarios document expected outcomes for: queue write, Explorer
     display, message send, session-not-found handling, and single message deletion
   * AC-3: At least one test covers the ``state.vscdb`` lookup path for both open
     and closed sessions

   **Test Scenarios:**

   **T-1 — Queue step writes message**
     Setup: ``heartbeat.yaml`` with a manual job, step type ``queue``,
     ``session: TestTarget``, ``text: Hello from T-1``.
     Action: Run ``Jarvis: Run Heartbeat Job`` → select job.
     Expected: ``messages.json`` in storageUri contains the entry; Explorer shows
     ``TestTarget (1)`` under Messages group.

   **T-2 — Notification stub sent to new session (session not in state.vscdb)**
     Setup: T-1 message in queue; no session named "TestTarget" exists.
     Action: Click ``TestTarget (1)`` in Explorer.
     Expected: New chat tab opens; a single notification stub is sent via
     ``workbench.action.chat.open`` informing the session about 1 pending message;
     messages remain in the queue (not cleared).

   **T-3 — Notification stub sent to existing named session**
     Setup: Tab from T-2 renamed to "TestTarget". Run T-1 job again to enqueue
     another message.
     Action: Click ``TestTarget (1)`` in Explorer.
     Expected: Existing "TestTarget" session focused (via UUID from
     ``state.vscdb``); notification stub sent; messages remain in queue.

   **T-4 — Notification stub sent to closed session (restored via UUID)**
     Setup: Close "TestTarget" tab. Run T-1 job again.
     Action: Click ``TestTarget (1)`` in Explorer.
     Expected: Closed session restored via UUID; notification stub sent;
     messages remain in queue.

   **T-6 — Read message via jarvis_readMessage tool**
     Setup: Two messages queued for "TestTarget" (run T-1 job twice).
     Action: In the target session, call ``jarvis_readMessage`` with
     ``destination: "TestTarget"``.
     Expected: First call returns oldest message with ``remaining: 1``;
     second call returns next message with ``remaining: 0``; third call
     returns ``{ message: null, remaining: 0 }``; Messages tree updates
     after each call.

   **T-5 — Delete single message**
     Setup: Two messages in queue for different sessions.
     Action: Click ``$(trash)`` on one message.
     Expected: Only that message removed; other remains; Explorer updates.
