Actor Kernel Instructions Delivery Acceptance Tests
====================================================

.. story:: Actor Kernel Instructions Delivery Acceptance Tests
   :id: US_UAT_MOD_ACTORRULES
   :status: approved
   :priority: required
   :links: US_MOD_ACTORRULES

   **As a** Jarvis Test Engineer,
   **I want** acceptance scenarios for the actor-kernel-instructions-delivery CR,
   **so that** I can verify that the three ``jarvis-actor.*`` instruction files
   are provisioned into ``.github/instructions/`` by default,
   are removed when the user opts out with ``jarvis.actor.autoProvision`` set
   to ``false``, leave user-authored files untouched, and do not touch
   pre-convention hyphenated files that predate the manifest.

   Module integration (compile/package/CI) is out of UAT scope.

   **Acceptance Criteria:**

   * AC-1: A test verifies that with ``jarvis.actor.autoProvision`` unset
     (default ``true``), the three ``jarvis-actor.*`` files are written to
     ``.github/instructions/`` on core activation (T-1).
   * AC-2: A test verifies that setting ``false`` and then ``true`` again
     restores the three files with the correct names (T-2).
   * AC-3: A test verifies idempotency: a second activation with unchanged
     content produces no file writes (T-3).
   * AC-4: A test verifies that setting ``jarvis.actor.autoProvision`` back to
     ``false`` removes the three provisioned files and leaves other files
     untouched (T-4).
   * AC-5: A test verifies that a user-authored file in ``.github/instructions/``
     is never removed or modified during provisioning or de-provisioning (T-5).
   * AC-6: A test verifies that old pre-convention hyphenated files
     (``jarvis-actor-kernel.instructions.md`` etc.) are NOT removed after
     opt-out, since they predate the manifest (T-6).
