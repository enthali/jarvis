Actor Kernel Instructions Delivery UAT Design Specifications
=============================================================

.. spec:: Actor Rule Set Delivery — Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_MOD_ACTORRULES
   :status: approved
   :links: REQ_UAT_MOD_ACTORRULES

   **Description:**
   Step-by-step scenarios for the actor-kernel-instructions-delivery CR.
   Executed in an Extension Development Host with ``packages/core`` active,
   workspace open.

   Module integration (compile/package/CI) is out of UAT scope.

   **Test Setup:**

   * EDH from ``feature/actor-kernel-instructions-delivery``.
   * Workspace open (single-folder or multi-folder; any writable workspace).
   * Jarvis Output Channel open (View → Output → Jarvis).
   * Before each scenario: note the state of ``.github/instructions/``.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          Default off: no files provisioned without opt-in

          *AC: REQ_MOD_ACTORRULES AC-3*
        - Confirm ``.github/instructions/`` contains no
          ``jarvis-actor.*`` files. Open VS Code Settings; confirm
          ``jarvis.actor.autoProvision`` is absent or ``false``.
          Reload VS Code window; wait for core to activate.
        - No ``jarvis-actor.kernel.instructions.md``,
          ``jarvis-actor.memory.instructions.md``, or
          ``jarvis-actor.authoring.instructions.md`` appear in
          ``.github/instructions/``. Output Channel shows no write
          activity for the ``jarvis-actor`` namespace. No activation
          error.

      * - T-2

          Opt-in: three files provisioned with correct names

          *AC: REQ_MOD_ACTORRULES AC-1, AC-2, AC-4*
        - Open VS Code Settings; set
          ``jarvis.actor.autoProvision`` to ``true``.
          Reload VS Code window; wait for core to activate.
        - All three files present in ``.github/instructions/``:

          - ``jarvis-actor.kernel.instructions.md``
          - ``jarvis-actor.memory.instructions.md``
          - ``jarvis-actor.authoring.instructions.md``

          Each filename begins with ``jarvis-actor.`` (dot separator,
          satisfying both the namespace rule and the product
          ``jarvis-*`` convention). No activation error.

      * - T-3

          Idempotency: second activation produces no writes

          *AC: REQ_MOD_SKILL_PROVISION AC-4 (via SPEC_UAT_SKILL_PROVISION T-2)*
        - From T-2 (files provisioned). Note the last-modified
          timestamp of ``jarvis-actor.kernel.instructions.md``.
          Reload VS Code window; wait for core to activate.
        - Last-modified timestamp of the file is unchanged — no
          rewrite occurred. Output Channel shows no write activity.
          All three files still present and byte-identical to bundle.
          No activation error.

      * - T-4

          Opt-out: three files removed, other files untouched

          *AC: REQ_MOD_ACTORRULES AC-5; REQ_MOD_SKILL_OPTOUT AC-2*
        - From T-2 (files provisioned). Also confirm at least one
          other file exists in ``.github/instructions/`` (e.g. an
          existing instructions file from another extension). Open
          Settings; set ``jarvis.actor.autoProvision`` to ``false``.
          Reload VS Code window.
        - The three ``jarvis-actor.*`` files are removed from
          ``.github/instructions/``. Any other file in the directory
          (e.g. ``mermaid.instructions.md`` from MermaidChart, or any
          user file) is present and unchanged. No activation error.

      * - T-5

          Isolation: user-authored file never touched

          *AC: REQ_MOD_SKILL_ORPHAN AC-3 (via SPEC_UAT_SKILL_PROVISION T-5)*
        - Create ``user.custom.instructions.md`` in
          ``.github/instructions/`` (any content). Ensure
          ``jarvis.actor.autoProvision`` is ``true``; reload window to
          provision. Then set to ``false``; reload window to
          de-provision.
        - ``user.custom.instructions.md`` is present and unchanged
          after both activation (provision) and reload (de-provision).
          The file is not in the ``jarvis-actor`` manifest; the helper
          never writes it, never removes it.

      * - T-6

          Old hyphenated files: NOT removed by opt-out

          *AC: REQ_MOD_ACTORRULES_MIGRATE AC-3*
        - Ensure ``jarvis.actor.autoProvision`` is ``true`` and the
          three ``jarvis-actor.*`` files are provisioned. Place (or
          confirm the presence of) an old-convention file, e.g.
          ``jarvis-actor-kernel.instructions.md`` (hyphen, no dot
          separator after ``actor``), in ``.github/instructions/``.

          Set ``jarvis.actor.autoProvision`` to ``false``; reload.
        - The three ``jarvis-actor.*`` provisioned files are removed.
          ``jarvis-actor-kernel.instructions.md`` (hyphenated) is
          **still present** — the helper never wrote it, so it is not
          in the manifest, and ``REQ_MOD_SKILL_ORPHAN`` AC-3 forbids
          removing files outside the manifest.

          **Migration note (informational):** The user must manually
          delete the old hyphenated files to avoid running two
          copies of the same rules simultaneously. This is a
          deliberate one-time manual step, not a test assertion.
