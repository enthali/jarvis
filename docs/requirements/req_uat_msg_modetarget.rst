Agent Mode Target and Delivery Re-Entrancy UAT Requirements
=============================================================

.. req:: Agent Mode Target and Re-Entrancy Guard Test Infrastructure
   :id: REQ_UAT_MSG_MODETARGET
   :status: approved
   :priority: required
   :links: US_UAT_MSG_MODETARGET; REQ_MSG_MODETARGET; REQ_MSG_DELIVERY_REENTRANCY

   **Description:**
   The repository SHALL provide the test infrastructure needed to execute
   the ``agent-mode-reset-race`` acceptance scenarios against the
   implementation on ``feature/agent-mode-reset-race``.

   All seven scenarios (T-1..T-7) are exercisable via static code analysis:
   the correctness guarantees they check are structural properties of the
   implementation (presence of an identity guard before ``executeCommand``,
   placement of the success log, ``finally`` block on the guard flag,
   reminder code outside the guard block) that are verifiable by reading
   the source without running an Extension Development Host.

   **Acceptance Criteria:**

   * AC-1: The implementation of ``reapplyAgentMode`` is in
     ``packages/core/src/extension.ts`` (renamed parameter
     ``context`` → ``sessionName``; target check added before
     ``executeCommand``; success log inside the identity guard). The source
     is readable without running the EDH for T-1..T-4.
   * AC-2: The implementation of the auto-delivery poll loop is in
     ``packages/core/src/extension.ts`` (``deliveryInFlight`` flag
     declared at module scope; guard before delivery block; ``finally``
     releases flag; reminders outside the delivery ``try/finally`` block).
     The source is readable for T-5..T-7.
   * AC-3: The log messages produced by each code path are verifiable from
     the source: warning on mismatch (T-2, T-3), no success entry on skip
     (T-2, T-3), debug on skipped tick (T-5).
   * AC-4: The step-by-step outcomes for T-1..T-7 are documented in the
     test protocol for this CR.
