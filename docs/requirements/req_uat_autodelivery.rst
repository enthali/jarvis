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
   :links: US_UAT_MSG_AUTODELIVERY; REQ_MSG_AUTODELIVER_POLL; REQ_MSG_AUTODELIVER_TAG; REQ_MSG_EDITORPLACEMENT; REQ_MSG_FOCUSRESTORE; REQ_MSG_AUTODELIVERY_OPTOUT

   **Description:**
   The poll loop SHALL deliver messages automatically and prevent re-delivery,
   as verified by T-7 and T-8; it SHALL also place a newly-opened delivery
   tab at the Secondary column when other columns already exist (T-10) and
   split a new column when only Main is open, never collapsing into it
   (T-14), restore the user's prior focus after delivery (T-11, T-12), and
   skip delivery to an actively-focused session (T-13).

   **Acceptance Criteria:**

   * AC-1: The poll loop SHALL fire at most every 5 seconds and deliver to at
     most one registered session per tick
   * AC-2: After delivery, the ``notified`` flag on the ``QueuedMessage`` SHALL
     be set to ``true`` so subsequent ticks skip the message
   * AC-3: The manual Play action SHALL also work for sessions in the Auto
     Delivery group (T-9), and SHALL NOT cause double delivery on the next tick
   * AC-4 (REQ_MSG_EDITORPLACEMENT AC-3 — Secondary placement):
     For T-10, the tester SHALL verify that a delivery to a session with no
     currently-open chat tab opens it in the last existing editor-group
     column (not a newly created column), when other columns are already
     open (e.g. Main + Docs).
   * AC-5 (REQ_MSG_FOCUSRESTORE AC-1–AC-3 — focus restore, editor case):
     For T-11, the tester SHALL verify that focus on an unrelated,
     previously-active editor tab is automatically restored immediately
     after a system-initiated delivery completes, with no manual action.
   * AC-6 (REQ_MSG_FOCUSRESTORE AC-1–AC-3 — focus restore, terminal case):
     For T-12, the tester SHALL verify that focus on a previously-active
     integrated terminal is automatically restored (via ``terminal.show()``)
     immediately after a system-initiated delivery completes.
   * AC-7 (REQ_MSG_AUTODELIVERY_OPTOUT AC-1–AC-2 — active-use opt-out):
     For T-13, the tester SHALL verify that a poll tick skips delivery to a
     session whose chat tab is the currently active/focused tab, that the
     message remains queued (retrievable via ``jarvis_readMessage``), and
     that delivery proceeds normally once the tab is no longer active/focused.
   * AC-8 (REQ_MSG_EDITORPLACEMENT AC-3/AC-7 — Secondary split when only
     Main is open):
     For T-14, the tester SHALL verify that a delivery to a not-yet-open
     session, when exactly 1 editor-group column (Main) is currently open,
     splits a new column 2 for the delivery target — it SHALL NOT open the
     session inside column 1 alongside or in place of the Main tab. This is
     the degenerate-column edge case distinct from T-10 (2+ columns already
     open).
