Module Skill Provisioning Acceptance Tests
==========================================

.. story:: Module Skill Provisioning Acceptance Tests
   :id: US_UAT_SKILL_PROVISION
   :status: approved
   :priority: required
   :links: US_MOD_SKILL_PROVISION

   **As a** Jarvis Test Engineer,
   **I want** end-to-end acceptance scenarios for the module asset provisioning
   mechanism,
   **so that** I can verify bundled skills and instructions are written on first
   activation, remain stable on re-activation, are cleaned up when removed
   from the bundle, and never touch files owned by the user or other modules.

   Module integration (compile/package/CI) is out of UAT scope and is
   verified separately.

   **Acceptance Criteria:**

   * AC-1: At least one scenario verifies that a module's bundled skill and
     instructions assets are written to ``.github/skills/`` and
     ``.github/instructions/`` on first activation in a workspace that has no
     pre-existing files for that namespace.
   * AC-2: At least one scenario verifies idempotency — a second activation with
     an unchanged bundle writes no files.
   * AC-3: At least one scenario verifies that a file that differs from the
     bundle (e.g. manually edited) is re-synchronised on the next activation.
   * AC-4: At least one scenario verifies orphan cleanup — an asset removed from
     the bundle is deleted from the workspace on the next activation.
   * AC-5: At least one scenario verifies that user-authored files and other
     modules' files in the same target directories are never removed.
   * AC-6: At least one scenario verifies that calling with ``enabled: false``
     removes all manifested assets and leaves other files intact (only
     applicable to modules that expose ``jarvis.<module>.autoProvision``).
   * AC-7: At least one scenario verifies that re-enabling after opt-out
     restores all assets on the next activation.
   * AC-8: At least one scenario verifies that activating in a window with no
     open workspace folder produces no writes and no activation error.
