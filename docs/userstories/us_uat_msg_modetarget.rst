Agent Mode Target and Delivery Re-Entrancy Acceptance Tests
============================================================

.. story:: Agent Mode and Delivery Re-Entrancy Acceptance Tests
   :id: US_UAT_MSG_MODETARGET
   :status: approved
   :priority: required
   :links: US_MSG_MODETARGET

   **As a** Jarvis Test Engineer,
   **I want** acceptance scenarios for the two defects fixed by the
   ``agent-mode-reset-race`` CR,
   **so that** I can verify that (A) a mode assignment is skipped — not
   mis-applied — when the focused editor is not the intended session, and
   (B) the delivery poll loop cannot overlap itself.

   The two defects are independent and SHALL be exercised separately:

   - **Defect A + A2** — ``reapplyAgentMode`` had no target check; success
     log emitted unconditionally even on mis-targeted applies.
   - **Defect B** — the auto-delivery poll loop had no re-entrancy guard;
     two ticks could overlap, causing one tick's ``restoreFocus`` to
     execute while another's mode command was in its settle window.

   Module integration (compile/package/CI) is out of UAT scope.

   **Acceptance Criteria:**

   * AC-1: A test verifies that ``reapplyAgentMode`` executes the mode
     command and emits a success log when the active tab's label matches the
     intended session name (T-1).
   * AC-2: A test verifies that when the active tab's label does NOT match the
     intended session name, the mode command is not executed and a warning is
     logged naming both the intended session and the actual focused tab (T-2).
   * AC-3: A test verifies that when no chat editor is active, the mode
     application is skipped and a warning is logged — not executed against
     an arbitrary tab (T-3).
   * AC-4: A test verifies that a skipped mode application does not abort the
     surrounding delivery — the session still opens and receives its message
     (T-4).
   * AC-5: A test verifies that a new tick does not begin a second delivery
     while the previous delivery's ``deliveryInFlight`` flag is set (T-5).
   * AC-6: A test verifies that a delivery that throws still releases the
     ``deliveryInFlight`` flag so subsequent ticks can proceed (T-6).
   * AC-7: A test verifies that reminder processing in the tick body runs
     regardless of whether the ``deliveryInFlight`` guard was set (T-7).
