Auto Delivery UAT Requirements
================================

.. req:: Auto Delivery Test Data
   :id: REQ_UAT_MSG_AUTODELIVERY_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_MSG_AUTODELIVERY; REQ_MSG_AUTODELIVER_CONFIG; REQ_MSG_AUTODELIVER_POLL

   **Description:**
   The repo SHALL contain test data and documented expected outcomes for manual
   verification of the auto-delivery feature.

   **Acceptance Criteria:**

   * AC-1: A heartbeat job or equivalent mechanism SHALL be available to queue
     a test message for a known session name (e.g. "TestTarget") on demand,
     so that T-7 and T-8 can be executed without manual JSON editing
   * AC-2: Expected outcomes for each test scenario (T-1 through T-9 from
     ``US_UAT_MSG_AUTODELIVERY``) SHALL be documented in the test protocol
   * AC-3: The test environment SHALL allow inspection of ``autodelivery.json``
     in the extension storage folder to verify T-4 and T-6

.. req:: Auto Delivery Tree Node Requirements
   :id: REQ_UAT_MSG_AUTODELIVERY_TREE
   :status: approved
   :priority: optional
   :links: US_UAT_MSG_AUTODELIVERY; REQ_MSG_AUTODELIVER_TREE

   **Description:**
   The Messages tree SHALL present the restructured layout required for T-1
   through T-6 and T-9.

   **Acceptance Criteria:**

   * AC-1: An "Auto Delivery" group node SHALL always be visible in the Messages
     tree regardless of how many sessions are registered
   * AC-2: Session nodes under the manual root SHALL carry the
     ``enableAutoDelivery`` context value so the "Enable Direct Delivery" command
     appears in their context menu
   * AC-3: Session nodes inside the Auto Delivery group SHALL carry the
     ``disableAutoDelivery`` context value so the "Disable Direct Delivery"
     command appears in their context menu

.. req:: Auto Delivery Poll Loop Requirements
   :id: REQ_UAT_MSG_AUTODELIVERY_POLL
   :status: approved
   :priority: optional
   :links: US_UAT_MSG_AUTODELIVERY; REQ_MSG_AUTODELIVER_POLL; REQ_MSG_AUTODELIVER_TAG

   **Description:**
   The poll loop SHALL deliver messages automatically and prevent re-delivery,
   as verified by T-7 and T-8.

   **Acceptance Criteria:**

   * AC-1: The poll loop SHALL fire at most every 5 seconds and deliver to at
     most one registered session per tick
   * AC-2: After delivery, the ``notified`` flag on the ``QueuedMessage`` SHALL
     be set to ``true`` so subsequent ticks skip the message
   * AC-3: The manual Play action SHALL also work for sessions in the Auto
     Delivery group (T-9), and SHALL NOT cause double delivery on the next tick
