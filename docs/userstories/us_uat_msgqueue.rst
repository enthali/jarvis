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

   **T-2 — Message sent to new session (session not in state.vscdb)**
     Setup: T-1 message in queue; no session named "TestTarget" exists.
     Action: Click ``TestTarget (1)`` in Explorer.
     Expected: New chat tab opens; message is sent via
     ``workbench.action.chat.open``; prompt reminds user to rename tab; queue is
     cleared for that session.

   **T-3 — Message sent to existing named session**
     Setup: Tab from T-2 renamed to "TestTarget". Run T-1 job again to enqueue
     another message.
     Action: Click ``TestTarget (1)`` in Explorer.
     Expected: Message sent to existing "TestTarget" session (via UUID from
     ``state.vscdb``); queue cleared.

   **T-4 — Message sent to closed session (restored via UUID)**
     Setup: Close "TestTarget" tab. Run T-1 job again.
     Action: Click ``TestTarget (1)`` in Explorer.
     Expected: Closed session restored via UUID; message sent; queue cleared.

   **T-5 — Delete single message**
     Setup: Two messages in queue for different sessions.
     Action: Click ``$(trash)`` on one message.
     Expected: Only that message removed; other remains; Explorer updates.
