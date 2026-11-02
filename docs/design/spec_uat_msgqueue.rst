Actor Communication UAT Design Specifications
=============================================

.. spec:: Message Queue Test Data Files
   :id: SPEC_UAT_MSG_FILES
   :status: draft
   :links: REQ_UAT_MSG_TESTDATA; SPEC_UAT_HEARTBEAT_FILES; SPEC_ACTOR_SCANNER; SPEC_COM_TOOLS; SPEC_COM_STATE

   **Description:**
   The ``t8-queue-message`` job in ``testdata/heartbeat/heartbeat.yaml`` (defined in
   ``SPEC_UAT_HEARTBEAT_FILES``) stores the test message for ``TestTarget``. The
   scenarios T-1 to T-21 are in ``US_UAT_MSG``; this specification holds the test
   data and the test means they need.

   **Actor fixtures** (shared by the messaging UATs: Actor communication,
   heartbeat queue steps, auto-delivery, reminders, MCP server, message logging):
   only Actors are valid destinations and senders
   (``REQ_AUT_HEARTBEAT_RESOLVER_REUSE`` AC-3), so the repo SHALL contain every
   name these procedures address as an Actor folder under
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

   Each name SHALL be carried by exactly one Actor. The chat of an Actor is the
   session of the Agent Host whose title is the Actor name in the workspace folder
   of the window (``REQ_COM_CHATNAME`` AC-2); "no chat exists" in a procedure means
   that no session with that title exists in the workspace yet.

   **Test means:** an Extension Development Host or a Windows Sandbox window of the
   VS Code product that offers the Agent Host, on the ``testdata`` workspace, with
   Copilot Chat signed in. The Sandbox in ``test-environments/windows-sandbox/`` is the
   isolated environment. In a Sandbox without ``node`` on the path, the hook that
   Jarvis provisions blocks every tool call (open finding of the hook-removal Change),
   so T-2 to T-6, T-9, T-10, T-12, T-17 and T-18 are NOT RUN there and are not reported
   as failed. The scenarios T-1, T-7, T-8, T-11, T-13 to T-16 and T-19 to T-21 need no
   tool call inside the guest chat.

   **Results:** recorded in the test protocol of the Change, each scenario as NOT RUN,
   PASS or FAIL with the reason for NOT RUN.
