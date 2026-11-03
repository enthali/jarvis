Auto Delivery UAT Design Specifications
=========================================

.. spec:: Auto Delivery Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_MSG_AUTODELIVERY_SCENARIOS
   :status: draft
   :links: REQ_UAT_MSG_AUTODELIVERY_TESTDATA; REQ_UAT_MSG_AUTODELIVERY_TREE; REQ_UAT_MSG_AUTODELIVERY_POLL; SPEC_UAT_MSG_FILES

   **Description:**
   The thirteen scenarios T-1 to T-13 and their expected results are in
   ``US_UAT_MSG_AUTODELIVERY``; they cover the tree layout, the context menu
   commands, the persistence of ``autodelivery.json``, the announcement without Play,
   the ``notified`` deduplication, the Play action, and that a delivery opens no tab
   and moves no focus.

   **Test Setup:**

   * Extension loaded in the Extension Development Host or a Sandbox window, with the
     Agent Host and Copilot Chat available (``SPEC_UAT_MSG_FILES``, Test means).
   * The ``TestTarget`` Actor fixture exists (``SPEC_UAT_MSG_FILES``).
   * ``<workspace>/.jarvis/messages/autodelivery.json`` starts absent or empty before
     each full run.
   * For T-10 two editor columns are open before the message is queued; for T-11 an
     unrelated file is focused; for T-12 the integrated terminal is focused.

.. spec:: Auto Delivery Test Data Files
   :id: SPEC_UAT_MSG_AUTODELIVERY_FILES
   :status: draft
   :links: REQ_UAT_MSG_AUTODELIVERY_TESTDATA; SPEC_UAT_MSG_AUTODELIVERY_SCENARIOS

   **Description:**
   ``testdata/heartbeat/heartbeat.yaml`` contains the manual job ``t8-queue-message``
   (``SPEC_UAT_HEARTBEAT_FILES``), which queues a message for ``TestTarget``. No
   further test data file is required beyond the Actor fixtures of
   ``SPEC_UAT_MSG_FILES``.

   **Acceptance Criteria:**

   * AC-1: Running ``Jarvis: Run Heartbeat Job`` and selecting the job appends a message
     with ``destination`` ``TestTarget`` to ``<workspace>/.jarvis/messages/queue.json``.
   * AC-2: The tester can read ``autodelivery.json`` in the same folder.
