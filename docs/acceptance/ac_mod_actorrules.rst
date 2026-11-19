Actor Kernel Instructions Delivery Acceptance Criteria
======================================================

The delivery of the three actor rule files by the core module
(``packages/core``), executed by the User in an Extension Development Host with
a writable workspace folder open and the Jarvis Output Channel (View → Output →
Jarvis) visible. The files are
``jarvis-actor.kernel.instructions.md``, ``jarvis-actor.memory.instructions.md``
and ``jarvis-actor.authoring.instructions.md`` in ``.github/instructions/``; the
setting is ``jarvis.actor.autoProvision``, which is ``true`` by default. The
provisioning function, the default value and the removal of provisioned files
with the other instructions files kept are asserted by
``src/tests/actor-autoprovision-default.test.ts``; the journey covers what only
a real window reload shows.

.. ac:: The three actor rule files arrive on reload, leave on opting out and return on opting in
   :id: AC_MOD_ACTORRULES_JOURNEY
   :status: approved
   :validates: US_MOD_ACTORRULES

   **Given** a workspace whose ``.github/instructions/`` holds no ``jarvis-actor.*``
   file but an old-convention ``jarvis-actor-kernel.instructions.md`` (hyphen after
   ``actor``), and ``jarvis.actor.autoProvision`` set at no scope (Settings shows
   the default ``true``)

   1. **When** the tester reloads the VS Code window and waits for core to activate
      **Then** ``.github/instructions/`` holds the three ``jarvis-actor.*`` files
      named above, and the Output Channel shows no activation error.

   2. **When** the tester sets ``jarvis.actor.autoProvision`` to ``false`` and
      reloads the window
      **Then** none of the three ``jarvis-actor.*`` files is in
      ``.github/instructions/``, and ``jarvis-actor-kernel.instructions.md`` is
      still there with unchanged content.

   3. **When** the tester sets ``jarvis.actor.autoProvision`` to ``true`` and
      reloads the window again
      **Then** all three ``jarvis-actor.*`` files are back under the same names,
      and ``jarvis-actor-kernel.instructions.md`` is still there with unchanged
      content.
