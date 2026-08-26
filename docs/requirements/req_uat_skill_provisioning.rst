Module Skill Provisioning UAT Requirements
==========================================

.. req:: Module Asset Provisioning Test Harness & Data
   :id: REQ_UAT_SKILL_PROVISION
   :status: approved
   :priority: required
   :links: US_UAT_SKILL_PROVISION; REQ_MOD_SKILL_PROVISION; REQ_MOD_SKILL_ORPHAN; REQ_MOD_SKILL_OPTOUT

   **Description:**
   The repository SHALL provide the test infrastructure and fixture data needed
   to execute the module-asset-provisioning acceptance scenarios in an Extension
   Development Host.

   **Test module:** ``packages/kanban`` is used as the first adopter, with a
   sample skill placed at
   ``packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md`` and a sample
   instructions file at
   ``packages/kanban/assets/instructions/jarvis-kanban.yaml.instructions.md``.
   These fixtures are the minimum needed for all T-1..T-8 scenarios; their
   content does not need to be production-quality for this CR.

   ``packages/kanban/.vscodeignore`` SHALL NOT exclude ``assets/**``.

   **Acceptance Criteria:**

   * AC-1: The extension host can be launched with core + kanban for T-1..T-7.
   * AC-2: A workspace folder is open during T-1..T-7; the tester confirms this
     before running scenarios that depend on provisioning writing files.
   * AC-3: Step-by-step outcomes for T-1..T-8 are documented in the test
     protocol for this CR.
   * AC-4: Idempotency check (T-2) uses filesystem last-modified timestamps
     as the observable; the tester notes timestamps after T-1 and compares
     after the reload.
   * AC-5: Isolation check (T-5) pre-populates ``.github/skills/`` with one
     user-authored directory (``user.custom-skill/``) and one directory
     representing a second module (``other-module.some-skill/``) before
     activating the kanban module.
   * AC-6: Opt-out scenarios (T-6, T-7) require ``packages/kanban`` to expose
     ``jarvis.kanban.autoProvision`` (boolean, default ``true``) and pass it as
     ``enabled`` to ``provisionModuleAssets``.
   * AC-7: No-workspace scenario (T-8) opens a new VS Code window without any
     workspace folder before installing the extension.
