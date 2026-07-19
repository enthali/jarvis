Auto Delivery UAT Design Specifications
=========================================

.. spec:: Auto Delivery Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_MSG_AUTODELIVERY_SCENARIOS
   :status: approved
   :links: REQ_UAT_MSG_AUTODELIVERY_TESTDATA; REQ_UAT_MSG_AUTODELIVERY_TREE; REQ_UAT_MSG_AUTODELIVERY_POLL

   **Description:**
   Expected outcomes for all fourteen auto-delivery test scenarios, covering
   tree layout, context menu commands, persistence, poll-loop delivery, the
   ``notified`` deduplication flag, Secondary-column placement (including
   the only-Main-open split edge case), Focus-Snapshot/Restore (editor and
   terminal cases), and confirmation that delivery is not suppressed by the
   target session's focus state (focus gate removed).

   **Test Setup:**

   * Extension loaded in the Extension Development Host
   * At least one queued message for session "TestTarget" (run the T-8 heartbeat
     job from ``testdata/heartbeat/heartbeat.yaml``, or use any queue step that
     targets "TestTarget")
   * The ``autodelivery.json`` file starts absent or empty (delete from extension
     storage folder before each full run)
   * For T-10, at least 2 editor columns already open before queuing the
     message.
   * For T-11, an unrelated file open and focused in the editor before
     queuing the message.
   * For T-12, an integrated terminal open and focused before queuing the\n     message.\n   * For T-14, exactly 1 editor-group column open (Main only, e.g. an
     Actor chat) before queuing the message — no Docs column yet.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 10 40 50

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (tree layout)
        - Open Jarvis Explorer → Messages view, no auto-delivery sessions
          registered
        - "Auto Delivery" group node visible; manual message root visible;
          no crash or missing node
      * - T-2 (enable context menu)
        - Right-click "TestTarget" session node in manual root
        - Context menu shows "Enable Direct Delivery" entry
      * - T-3 (enable moves node)
        - Right-click "TestTarget" → "Enable Direct Delivery"
        - "TestTarget" moves from manual root into "Auto Delivery" group;
          tree refreshes automatically
      * - T-4 (json persistence)
        - Inspect ``autodelivery.json`` after T-3
        - File exists in extension storage folder; contains "TestTarget";
          valid JSON
      * - T-5 (disable context menu)
        - Right-click "TestTarget" inside "Auto Delivery" group
        - Context menu shows "Disable Direct Delivery" entry
      * - T-6 (disable moves node)
        - Right-click "TestTarget" → "Disable Direct Delivery"
        - "TestTarget" moves back to manual root; ``autodelivery.json``
          updated (entry removed); tree refreshes
      * - T-7 (poll auto-delivery)
        - Re-enable auto-delivery for "TestTarget"; open "TestTarget" chat
          session; queue a message; wait ≤10 s
        - Message delivered to "TestTarget" chat without pressing Play;
          message count on node decreases or clears
      * - T-8 (no re-delivery)
        - After T-7, wait another 10 s (two more ticks)
        - No second delivery of the same message; no duplicate in chat
      * - T-9 (manual play)
        - With "TestTarget" in Auto Delivery group, queue a new message;
          click Play on "TestTarget" node before next tick
        - Message delivered immediately; subsequent poll tick does NOT
          deliver it again
      * - T-10 (Secondary placement)
        - 2 columns open (Main + Docs); "TestTarget" chat not open; queue a
          message; wait ≤10 s
        - New "TestTarget" tab opens in column 2 (last existing column) — no
          3rd column is created
      * - T-11 (focus restore — editor)
        - Unrelated file focused in editor; "TestTarget" chat closed; queue
          a message; wait ≤10 s
        - Delivery occurs, then focus automatically returns to the unrelated
          file tab — no manual action needed
      * - T-12 (focus restore — terminal)
        - Integrated terminal focused; "TestTarget" chat closed; queue a
          message; wait ≤10 s
        - Delivery occurs, then focus automatically returns to the
          integrated terminal (``terminal.show()``)
      * - T-14 (Secondary split when only Main open)
        - Exactly 1 column open (Main, e.g. an Actor chat); "TestTarget"
          chat not open anywhere; queue a message; wait ≤10 s
        - A new column 2 is split off and "TestTarget" opens there; the
          Main tab in column 1 is undisturbed — "TestTarget" does NOT open
          inside/replace column 1
      * - T-16 (delivery when target tab is active/focused)
        - "TestTarget" chat tab open **and currently focused**; queue a
          message; wait ≤10 s
        - Message is delivered to "TestTarget" chat; no suppression, no
          error; Focus-Snapshot/Restore executes silently (returns to the
          already-focused tab — no perceptible focus change)

.. spec:: Auto Delivery Test Data Files
   :id: SPEC_UAT_MSG_AUTODELIVERY_FILES
   :status: approved
   :links: REQ_UAT_MSG_AUTODELIVERY_TESTDATA; SPEC_UAT_MSG_AUTODELIVERY_SCENARIOS

   **Description:**
   The ``testdata/heartbeat/heartbeat.yaml`` SHALL contain a manual job that
   queues a message for "TestTarget", reusing or extending the existing T-8 job
   defined in ``SPEC_UAT_HEARTBEAT_FILES`` (or equivalent).  No additional
   test-data files are required for auto-delivery beyond what the message-queue
   UAT already provides.

   **Acceptance Criteria:**

   * AC-1: Running ``Jarvis: Run Heartbeat Job`` and selecting the queue job
     SHALL append a message with ``session="TestTarget"`` to ``messages.json``
   * AC-2: The extension storage folder location SHALL be shown in the Jarvis
     output channel so the tester can locate ``autodelivery.json``
