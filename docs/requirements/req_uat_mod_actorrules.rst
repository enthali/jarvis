Actor Kernel Instructions Delivery UAT Requirements
====================================================

.. req:: Actor Rule Set Delivery Test Harness and Data
   :id: REQ_UAT_MOD_ACTORRULES
   :status: approved
   :priority: required
   :links: US_UAT_MOD_ACTORRULES; REQ_MOD_ACTORRULES; REQ_MOD_ACTORRULES_MIGRATE

   **Description:**
   The repository SHALL provide the test infrastructure needed to execute the
   actor-kernel-instructions-delivery acceptance scenarios against
   ``feature/actor-kernel-instructions-delivery`` in an Extension Development
   Host with ``packages/core`` active.

   **Acceptance Criteria:**

   * AC-1: The EDH is launched from ``feature/actor-kernel-instructions-delivery``
     with at minimum ``packages/core`` active.
   * AC-2: A workspace folder is open in the EDH during all scenarios.
   * AC-3: Before T-1, confirm ``.github/instructions/`` contains no
     ``jarvis-actor.*`` files; if it does, remove them to start clean.
   * AC-4: For T-3 (idempotency), the tester records last-modified timestamps
     of the three provisioned files before reloading the window, and compares
     after reload.
   * AC-5: For T-5 (isolation), the tester creates a file
     ``user.custom.instructions.md`` in ``.github/instructions/`` before
     activation and confirms it survives all provisioning and de-provisioning
     operations.
   * AC-6: For T-6 (old-file preservation), the tester places (or confirms the
     presence of) ``jarvis-actor-kernel.instructions.md`` (hyphenated, no dot
     separator after ``jarvis-actor``) in ``.github/instructions/`` before the
     opt-out step; confirms it is still present after opt-out.
   * AC-7: Migration note (out of test scope): the old hyphenated files must be
     manually removed by the user who opts in to avoid running two copies of the
     same rules simultaneously (``REQ_MOD_ACTORRULES_MIGRATE`` AC-2). The
     scenarios document this limitation but do not test the removal step itself.
   * AC-8: Step-by-step outcomes for T-1..T-6 are documented in the test
     protocol for this CR.
