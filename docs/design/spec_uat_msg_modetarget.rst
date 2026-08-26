Agent Mode Target and Delivery Re-Entrancy UAT Design Specifications
======================================================================

.. spec:: Agent Mode Target and Re-Entrancy Guard Test Scenarios
   :id: SPEC_UAT_MSG_MODETARGET
   :status: approved
   :links: REQ_UAT_MSG_MODETARGET

   **Description:**
   Step-by-step scenarios for the ``agent-mode-reset-race`` CR, covering
   Defect A/A2 (target verification in ``reapplyAgentMode``) and Defect B
   (re-entrancy guard in the auto-delivery poll loop).

   All scenarios are exercisable via static code analysis against the
   implementation in ``packages/core/src/extension.ts``.

   Module integration (compile/package/CI) is out of UAT scope.

   **--- Defect A + A2: Mode Target Verification ---**

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          Target matches: command executes, success log emitted

          *AC: REQ_MSG_MODETARGET AC-1..AC-2, AC-5;
          SPEC_MSG_OPENCHAT AC-M1, AC-M3*
        - Read ``reapplyAgentMode`` in ``packages/core/src/extension.ts``.
          Locate the path where the active tab's label equals
          ``sessionName`` and the registry probe succeeds.
        - The target-check branch evaluates true.
          ``vscode.commands.executeCommand(cmdId)`` is called **inside**
          the identity guard. The ``log.info(... "re-applied agent mode
          ...")`` entry is emitted on the same path — **after** the
          command, **inside** the guard block. No success log appears
          outside the guard. ``sessionName`` (not a stale ``context``
          label) is interpolated.

      * - T-2

          Target mismatch: command skipped, warning names both sessions

          *AC: REQ_MSG_MODETARGET AC-3..AC-4;
          SPEC_MSG_OPENCHAT AC-M1, AC-M2*
        - In the same function, locate the path where the active tab's
          label differs from ``sessionName`` (or is ``undefined``).
        - ``executeCommand`` is **not** called on this path. The function
          returns without error. A ``log.warn`` entry is emitted naming
          both the intended session (``sessionName``) and the actual
          focused tab label (or ``'<none>'`` when absent). No
          ``log.info`` success entry exists on this path.

      * - T-3

          No active chat editor: treated as mismatch, skip + warn

          *AC: REQ_MSG_MODETARGET AC-6;
          SPEC_MSG_OPENCHAT AC-M1, AC-M2*
        - In the same function, locate the path taken when no active
          tab is found (``activeLabel`` is ``undefined`` or ``null``).
        - The function falls into the same mismatch branch as T-2. A
          ``log.warn`` entry is emitted (with ``'<none>'`` or equivalent
          for the focused tab). ``executeCommand`` is not called.

      * - T-4

          Skipped mode: delivery continues normally

          *AC: REQ_MSG_MODETARGET AC-7;
          SPEC_MSG_OPENCHAT AC-M4*
        - Confirm that ``reapplyAgentMode``'s mismatch path returns
          without throwing. Confirm that the caller in the auto-delivery
          or send-messages code path does not gate the delivery on
          ``reapplyAgentMode``'s result.
        - The mismatch path ends with ``return`` (no throw). At the call
          site, ``await reapplyAgentMode(...)`` is not wrapped in a
          conditional that would abort the delivery. The session still
          opens and receives its message regardless of whether the mode
          was applied.

   **--- Defect B: Poll Loop Re-Entrancy Guard ---**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-5

          In-flight guard: second tick is a no-op while first is running

          *AC: REQ_MSG_DELIVERY_REENTRANCY AC-1..AC-2, AC-4;
          SPEC_MSG_AUTODELIVER_POLL*
        - Read the ``setInterval`` tick body in
          ``packages/core/src/extension.ts``. Locate the ``deliveryInFlight``
          flag declaration (module scope) and the guard check inside the
          tick body.
        - ``deliveryInFlight`` is declared as ``let deliveryInFlight = false``
          at module scope (survives across ticks). Inside the tick body,
          where a pending session is found, the code checks
          ``if (deliveryInFlight)`` before starting a delivery. When true,
          it logs at ``debug`` level (not ``warn``) and breaks without
          consuming or marking any message. No delivery action is taken by
          the skipped tick.

      * - T-6

          Guard released on throwing delivery

          *AC: REQ_MSG_DELIVERY_REENTRANCY AC-3;
          SPEC_MSG_AUTODELIVER_POLL*
        - In the same tick body, locate where ``deliveryInFlight`` is
          set to ``true`` and where it is released.
        - ``deliveryInFlight = true`` is set immediately before the
          ``try`` block that performs the delivery.
          ``deliveryInFlight = false`` is set in the corresponding
          ``finally`` block — **not** after a bare ``await`` inside
          the ``try``. The ``finally`` guarantees release even if
          ``injectPrompt`` or any other awaited call inside the block
          throws; the loop is never permanently blocked by a failed delivery.

      * - T-7

          Reminders unaffected by delivery guard

          *AC: REQ_MSG_DELIVERY_REENTRANCY AC-5;
          SPEC_MSG_AUTODELIVER_POLL*
        - In the same tick body, locate the reminder-processing code and
          confirm its position relative to the delivery guard.
        - The reminder-processing block appears **outside** the delivery
          ``if (deliveryInFlight) { ... } / try { ... } finally { ... }``
          structure — it is not inside the guard and not inside the
          ``try/finally`` block. Reminders therefore run on every tick
          regardless of whether a delivery was skipped or is in flight.
