Module Skill Provisioning UAT Design Specifications
====================================================

.. spec:: Module Asset Provisioning Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_SKILL_PROVISION
   :status: approved
   :links: REQ_UAT_SKILL_PROVISION

   **Description:**
   Step-by-step procedures and expected outcomes for the module-asset-provisioning
   acceptance scenarios, executed in an Extension Development Host with
   ``packages/core`` + ``packages/kanban``.

   Module integration (compile/package/CI) is out of UAT scope.

   **Test Setup:**

   * Extension host launched with core + kanban.
   * ``packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md`` and
     ``packages/kanban/assets/instructions/jarvis-kanban.yaml.instructions.md``
     present in the repository (fixture files for this CR).
   * Workspace: any single-folder workspace with a writable ``.github/``
     directory (or none at all for T-8).
   * Jarvis Output Channel open (View → Output → Jarvis).

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          First activation: assets provisioned

          *AC: REQ_MOD_SKILL_PROVISION AC-1..AC-4*
        - Launch extension host with a clean workspace (no
          ``.github/skills/jarvis-kanban.*`` or
          ``.github/instructions/jarvis-kanban.*`` files). Activate
          core + kanban.
        - ``.github/skills/jarvis-kanban.board/SKILL.md`` created.
          ``.github/instructions/jarvis-kanban.yaml.instructions.md``
          created. No activation error in Output Channel.

      * - T-2

          Idempotency: unchanged bundle writes nothing

          *AC: REQ_MOD_SKILL_PROVISION AC-3..AC-4, SPEC_MOD_SKILL_PROVISION AC-4*
        - From T-1. Note the last-modified timestamp of
          ``.github/skills/jarvis-kanban.board/SKILL.md``.
          Reload VS Code window (Developer: Reload Window).
        - Last-modified timestamp is unchanged — file was not rewritten.
          Output Channel shows no repeated provisioning writes. No
          activation error.

      * - T-3

          Content update: modified file is re-synchronised

          *AC: REQ_MOD_SKILL_PROVISION AC-3..AC-4*
        - From T-1. Manually edit
          ``.github/skills/jarvis-kanban.board/SKILL.md`` (e.g. append a
          comment). Reload VS Code window.
        - The file is overwritten with the bundle content; the manual
          edit is gone. The instructions file is not touched (its content
          matched the bundle). No activation error.

      * - T-4

          Orphan cleanup: removed skill deleted on next activation

          *AC: REQ_MOD_SKILL_ORPHAN AC-1..AC-4, SPEC_MOD_SKILL_MANIFEST AC-2, AC-4*
        - From T-1. Remove
          ``packages/kanban/assets/skills/jarvis-kanban.board/``
          from the repository (simulating a module update that drops this
          skill). Recompile kanban. Reload VS Code window.
        - ``.github/skills/jarvis-kanban.board/`` is removed from the
          workspace. The instructions file (still in bundle) remains
          present and correct. No activation error.

          **Restore:** After verification, re-add the skill folder to
          ``packages/kanban/assets/skills/`` and recompile.

      * - T-5

          Isolation: user-authored and other-module files untouched

          *AC: REQ_MOD_SKILL_ORPHAN AC-3, SPEC_MOD_SKILL_MANIFEST AC-3*
        - Before launching the host, create
          ``.github/skills/user.custom-skill/SKILL.md`` (user-authored)
          and
          ``.github/skills/other-module.some-skill/SKILL.md``
          (simulating another module's asset). Launch host; activate
          core + kanban.
        - ``jarvis-kanban.*`` assets are provisioned correctly.
          ``user.custom-skill/`` and ``other-module.some-skill/`` are
          present and unchanged. No activation error.

      * - T-6

          Opt-out: ``enabled: false`` removes provisioned assets

          *AC: REQ_MOD_SKILL_OPTOUT AC-1..AC-2, SPEC_MOD_SKILL_MANIFEST AC-6*

          *Requires ``jarvis.kanban.autoProvision`` setting (REQ_UAT_SKILL_PROVISION AC-6).*
        - From T-1 (kanban assets provisioned). Open VS Code Settings;
          set ``jarvis.kanban.autoProvision`` to ``false``. Reload
          VS Code window.
        - ``.github/skills/jarvis-kanban.board/`` and
          ``.github/instructions/jarvis-kanban.yaml.instructions.md``
          are removed from the workspace. Files from T-5 pre-population
          (``user.custom-skill/``, ``other-module.some-skill/``) are
          untouched if present. No activation error.

      * - T-7

          Re-enable: assets restored after opt-out

          *AC: REQ_MOD_SKILL_OPTOUT AC-3, SPEC_MOD_SKILL_MANIFEST AC-7*
        - From T-6 (assets absent). Set ``jarvis.kanban.autoProvision``
          back to ``true`` in Settings. Reload VS Code window.
        - All kanban assets re-provisioned: ``.github/skills/jarvis-kanban.board/SKILL.md``
          and ``.github/instructions/jarvis-kanban.yaml.instructions.md``
          recreated. No activation error.

      * - T-8

          No workspace: no writes, no activation error

          *AC: REQ_MOD_SKILL_PROVISION AC-5, SPEC_MOD_SKILL_PROVISION AC-5*
        - Open a new VS Code window with no workspace folder open
          (File → New Window; close any open folder). Install and
          activate core + kanban in this window.
        - No ``.github/`` folder is created. Jarvis Output Channel shows
          a warning message (not an error) about no open workspace
          folder. Extension activation completes without error.
