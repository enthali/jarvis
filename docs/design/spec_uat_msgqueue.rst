Actor Communication UAT Design Specifications
=============================================

.. spec:: Message Queue Test Data Files
   :id: SPEC_UAT_MSG_FILES
   :status: draft
   :links: REQ_UAT_MSG_TESTDATA; SPEC_UAT_HEARTBEAT_FILES; SPEC_ACTOR_SCANNER; SPEC_COM_TOOLS; SPEC_COM_STATE; SPEC_CFG_HOOKCLEANUP

   **Description:**
   The ``t8-queue-message`` job in ``testdata/heartbeat/heartbeat.yaml`` (defined in
   ``SPEC_UAT_HEARTBEAT_FILES``) stores the test message for ``TestTarget``. The
   scenarios T-1 to T-22 are in ``US_UAT_MSG``; this specification holds the test
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
   isolated environment. Jarvis no longer provisions agent hooks and removes legacy
   hook files from ``.github/hooks/`` on activation (``REQ_CFG_HOOKCLEANUP``), so the
   Sandbox needs no external ``node`` on ``PATH`` for Actor chats to call tools.

   **Results:** recorded in the test protocol of the Change, each scenario as NOT RUN,
   PASS or FAIL with the reason for NOT RUN.
