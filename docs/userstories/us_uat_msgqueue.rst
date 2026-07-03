Message Queue User Acceptance Tests
=====================================

.. story:: Message Queue and Send-to-Chat Acceptance Tests
   :id: US_UAT_MSG
   :status: approved
   :priority: optional
   :links: US_MSG_CHATQUEUE; US_AUT_HEARTBEAT; US_MSG_SENDER_REQUIRED

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
   * AC-4: Test scenarios verify that ``jarvis_sendMessage`` requires and validates
     ``senderSession``, rejecting missing and invalid values with the exact error
     text from ``REQ_MSG_SENDER_ERROR``
   * AC-5: A test scenario verifies that a successful ``jarvis_sendMessage`` call
     records the supplied ``senderSession`` verbatim as the ``sender`` field in
     ``message-log.json``
   * AC-6: A test scenario verifies that ``jarvis_receiveMessage`` behaves
     identically to ``jarvis_readMessage`` (pure rename)
   * AC-7: Test scenarios verify that the deprecated ``jarvis_sendToSession`` and
     ``jarvis_readMessage`` tools remain fully functional and each return a
     deprecation warning pointing to the canonical replacement
   * AC-8: A test scenario verifies that ``jarvis_sendToSession``'s active-tab
     sender fallback (the pre-existing bug) is unchanged when ``senderSession``
     is omitted

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

   **T-7 — jarvis_sendMessage with valid senderSession**
     Setup: A session named "TestSender" and a session named "TestTarget" both
     exist in the valid destination set. ``jarvis.messages.logging`` is true.
     Action: Call ``jarvis_sendMessage`` with ``session: "TestTarget"``,
     ``text: "Hello from T-7"``, ``senderSession: "TestSender"``.
     Expected: Message is queued (success response, no deprecation warning);
     ``message-log.json``'s newest entry has ``sender: "TestSender"`` verbatim.

   **T-8 — jarvis_sendMessage missing senderSession**
     Setup: "TestTarget" exists in the valid destination set.
     Action: Call ``jarvis_sendMessage`` with ``session: "TestTarget"``,
     ``text: "Hello from T-8"``, and ``senderSession`` omitted (or empty string).
     Expected: Call throws/returns an error with exactly: ``senderSession is
     required. Callers must explicitly provide their session name — do not rely
     on the active editor tab.``; no message appended to the queue.

   **T-9 — jarvis_sendMessage invalid senderSession**
     Setup: "TestTarget" exists; "NoSuchSender" does not exist in the valid
     destination set.
     Action: Call ``jarvis_sendMessage`` with ``session: "TestTarget"``,
     ``text: "Hello from T-9"``, ``senderSession: "NoSuchSender"``.
     Expected: Call throws/returns an error with exactly: ``Sender session
     "NoSuchSender" does not exist. Valid senders: ${sorted comma-separated
     list}``; no message appended to the queue.

   **T-10 — jarvis_receiveMessage identical to jarvis_readMessage**
     Setup: Two messages queued for "TestTarget" (repeat T-1 job twice).
     Action: In the target session, call ``jarvis_receiveMessage`` with
     ``destination: "TestTarget"``.
     Expected: Same behavior as T-6 (oldest message returned first with
     ``remaining: 1``, then ``remaining: 0``, then ``{ message: null,
     remaining: 0 }``); no deprecation warning present in the response.

   **T-11 — Deprecated jarvis_sendToSession still works, with deprecation warning**
     Setup: "TestTarget" exists in the valid destination set.
     Action: Call ``jarvis_sendToSession`` with ``session: "TestTarget"``,
     ``text: "Hello from T-11"`` (``senderSession`` provided).
     Expected: Message is queued exactly as before this CR (success response,
     unaffected queuing/audit/tree-refresh behavior); response includes an
     additional deprecation-warning field pointing to ``jarvis_sendMessage``;
     the tool's description shown to the model likewise notes the deprecation.

   **T-12 — Deprecated jarvis_readMessage still works, with deprecation warning**
     Setup: One message queued for "TestTarget".
     Action: Call ``jarvis_readMessage`` with ``destination: "TestTarget"``.
     Expected: Message popped exactly as before this CR (unchanged payload
     shape); response includes an additional deprecation-warning field pointing
     to ``jarvis_receiveMessage``; the tool's description shown to the model
     likewise notes the deprecation.

   **T-13 — jarvis_sendToSession active-tab fallback bug preserved**
     Setup: Active editor tab is NOT the calling agent's own session (e.g. a
     random file or unrelated tab is focused).
     Action: Call ``jarvis_sendToSession`` with ``session: "TestTarget"``,
     ``text: "Hello from T-13"``, ``senderSession`` omitted.
     Expected: Message is queued with ``sender`` set from ``activeTab?.label``
     (or ``'unknown'`` if none) — i.e. the pre-existing incorrect-attribution
     bug is reproduced unchanged, confirming this CR deliberately did not fix
     the deprecated tool.
