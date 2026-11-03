Auto Delivery UAT Requirements
================================

.. req:: Auto Delivery Test Data
   :id: REQ_UAT_MSG_AUTODELIVERY_TESTDATA
   :status: draft
   :priority: optional
   :links: US_UAT_MSG_AUTODELIVERY; REQ_MSG_AUTODELIVER_CONFIG; REQ_COM_NOTIFY

   **Description:**
   The repo SHALL contain test data and documented expected outcomes for manual
   verification of automatic delivery.

   **Acceptance Criteria:**

   * AC-1: A heartbeat job SHALL be available that queues a test message for a known
     Actor name (``TestTarget``) on demand, so that T-7 to T-13 run without manual JSON
     editing.
   * AC-2: Expected outcomes for each scenario (T-1 through T-13 from
     ``US_UAT_MSG_AUTODELIVERY``) SHALL be documented in the test protocol, each as
     NOT RUN, PASS or FAIL.
   * AC-3: The tester SHALL be able to inspect ``autodelivery.json`` in
     ``<workspace>/.jarvis/messages/`` to verify T-4 and T-6.

.. req:: Auto Delivery Tree Node Requirements
   :id: REQ_UAT_MSG_AUTODELIVERY_TREE
   :status: draft
   :priority: optional
   :links: US_UAT_MSG_AUTODELIVERY; REQ_MSG_AUTODELIVER_TREE

   **Description:**
   The Messages tree SHALL present the layout required for T-1 through T-6 and T-9.

   **Acceptance Criteria:**

   * AC-1: An "Auto Delivery" group node SHALL always be visible in the Messages tree
     regardless of how many Actors are registered.
   * AC-2: Nodes under the manual root SHALL offer "Enable Direct Delivery".
   * AC-3: Nodes inside the Auto Delivery group SHALL offer "Disable Direct Delivery".

.. req:: Auto Delivery Announcement Requirements
   :id: REQ_UAT_MSG_AUTODELIVERY_POLL
   :status: draft
   :priority: optional
   :links: US_UAT_MSG_AUTODELIVERY; REQ_COM_NOTIFY; REQ_COM_OPEN; REQ_MSG_AUTODELIVER_TAG

   **Description:**
   A queued message for an Actor in the group SHALL be announced in its chat without
   Play and not announced again (T-7, T-8); a delivery SHALL open no chat and move no
   focus (T-10 to T-12), and SHALL NOT be suppressed because the chat tab is focused
   (T-13).

   **Acceptance Criteria:**

   * AC-1: The announcement names the number of waiting messages and contains no text
     that a sender wrote (``REQ_COM_NOTIFY`` AC-1, AC-2; T-7).
   * AC-2: After the announcement the messages are marked ``notified`` and later passes
     skip them (``SPEC_COM_INBOX`` step 4; T-8).
   * AC-3: The Play action announces the waiting messages of an Actor in the group and
     does not cause a second announcement of the same messages (T-9).
   * AC-4: A delivery opens no editor tab, adds no editor column and does not change
     which editor or terminal has the focus (``REQ_COM_OPEN`` AC-4; T-10 to T-12).
   * AC-5: A delivery to a chat whose tab is open and focused is not suppressed
     (T-13).
