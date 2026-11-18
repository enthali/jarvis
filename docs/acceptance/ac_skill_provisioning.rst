Module Skill Provisioning Acceptance Criteria
==============================================

The provisioning of a module's bundled skill and instructions, executed by the
User in an Extension Development Host with ``packages/core`` and
``packages/kanban`` active and the Jarvis Output Channel (View → Output → Jarvis)
visible. ``packages/kanban`` is the first adopter: its bundle holds
``packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md`` and
``packages/kanban/assets/instructions/jarvis-kanban.yaml.instructions.md``, and
the setting ``jarvis.kanban.autoProvision`` (default ``true``) switches
provisioning off. The workspace is a single folder with a writable ``.github/``.

.. ac:: A module's skill and instructions arrive, follow a module update, leave on opting out and return, and other files stay untouched
   :id: AC_SKILL_PROVISION_JOURNEY
   :status: approved
   :validates: US_MOD_SKILL_PROVISION

   **Given** a workspace without ``.github/skills/jarvis-kanban.*`` or
   ``.github/instructions/jarvis-kanban.*``, and with
   ``.github/skills/user.custom-skill/SKILL.md`` (user-authored) and
   ``.github/skills/other-module.some-skill/SKILL.md`` (standing in for another
   module) created before the launch

   1. **When** the tester launches the host so that core and kanban activate
      **Then** ``.github/skills/jarvis-kanban.board/SKILL.md`` and
      ``.github/instructions/jarvis-kanban.yaml.instructions.md`` exist, the Output
      Channel shows no activation error, and both pre-created skills are present
      with unchanged content.

   2. **When** the tester appends a comment to
      ``.github/skills/jarvis-kanban.board/SKILL.md``, removes the folder
      ``packages/kanban/assets/skills/jarvis-kanban.board/`` from the repository,
      recompiles kanban (simulating a module update that drops the skill) and
      reloads the VS Code window
      **Then** ``.github/skills/jarvis-kanban.board/`` is gone from the workspace,
      and ``.github/instructions/jarvis-kanban.yaml.instructions.md`` is still
      present.

   3. **When** the tester restores the skill folder in the repository, recompiles
      kanban and reloads the window
      **Then** the skill is back with the bundle content and without the appended
      comment.

   4. **When** the tester sets ``jarvis.kanban.autoProvision`` to ``false`` and
      reloads the window, and later sets it to ``true`` and reloads again
      **Then** after the first reload ``.github/skills/jarvis-kanban.board/`` and
      ``.github/instructions/jarvis-kanban.yaml.instructions.md`` are gone and both
      pre-created skills are present with unchanged content, and after the second
      reload both module files are back; the Output Channel shows no activation
      error.
