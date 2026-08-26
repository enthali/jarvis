Modular Delivery Requirements
=============================

.. req:: Core Extension Standalone
   :id: REQ_MOD_CORE
   :status: approved
   :priority: required
   :links: US_MOD_INSTALL

   **Description:**
   The core extension (id ``enthali.jarvis``) SHALL be installable and fully
   functional on its own, providing the kind-agnostic engine plus the core
   capabilities: sessions, messaging, reminders, and heartbeat. It SHALL NOT
   depend on the PIM or recorder add-ons.

   **Acceptance Criteria:**

   * AC-1: With only the core installed, sessions (tree, create, agent-bind),
     messaging (queue, delivery, notifications), reminders, and heartbeat
     function fully.
   * AC-2: The core declares no dependency on any add-on extension.
   * AC-3: The core retains the existing extension id ``enthali.jarvis`` so that
     current installs update in place.
   * AC-4 (``module-skill-provisioning`` CR): ``packages/core`` exports a
     ``provisionModuleAssets`` helper that any module's ``activate()`` MAY call
     to copy its VSIX-bundled Copilot Skills and Instructions assets into the
     workspace (see ``REQ_MOD_SKILL_PROVISION``).


.. req:: Add-ons Separately Installable
   :id: REQ_MOD_ADDONS
   :status: approved
   :priority: required
   :links: US_MOD_INSTALL; SPEC_MOD_ADDON_ONBOARDING

   **Description:**
   PIM, the recorder, MCP, the message-flow diagram, and syspilot SHALL each
   be packaged as a separate extension that depends on the core via
   ``extensionDependencies: ["enthali.jarvis"]`` (or ``"enthali.jarvis-core"``) and
   cannot activate without it. When a new add-on is introduced, the onboarding
   checklist (``SPEC_MOD_ADDON_ONBOARDING``) SHALL be followed to ensure it is
   registered in all required places.

   **Acceptance Criteria:**

   * AC-1: ``enthali.jarvis-pim`` is a separate extension declaring
     ``extensionDependencies: ["enthali.jarvis"]``.
   * AC-2: ``enthali.jarvis-recorder`` is a separate extension declaring
     ``extensionDependencies: ["enthali.jarvis"]``.
   * AC-3: Each add-on contributes its own views, settings, commands, and tools
     in its own ``package.json``.
   * AC-4: An add-on obtains the engine via
     ``vscode.extensions.getExtension('enthali.jarvis').exports`` and registers
     its kinds and tools through the contract.
   * AC-5: ``enthali.jarvis-mcp`` is a separate extension declaring
     ``extensionDependencies: ["enthali.jarvis"]``.
   * AC-6 (``message-flow-diagram`` CR): ``enthali.jarvis-flow`` is a separate
     extension declaring ``extensionDependencies: ["enthali.jarvis"]`` — see
     ``REQ_FLOW_PACKAGE``.
   * AC-7 (``jarvis-syspilot`` CR): ``enthali.jarvis-syspilot`` is a separate
     extension declaring ``extensionDependencies: ["enthali.jarvis-core"]`` —
     see ``REQ_SPL_PACKAGE``.
   * AC-8 (``module-skill-provisioning`` CR): A module that bundles Copilot Skill
     or Instructions assets SHALL call ``provisionModuleAssets`` during
     ``activate()``; idempotency and orphan cleanup are handled by the helper
     (see ``REQ_MOD_SKILL_PROVISION``, ``REQ_MOD_SKILL_ORPHAN``).


.. req:: Zero-Trace When Not Installed
   :id: REQ_MOD_ZEROTRACE
   :status: approved
   :priority: required
   :links: US_MOD_INSTALL

   **Description:**
   When an add-on is not installed, none of its surface SHALL be present
   anywhere in the workspace — no tree view, no setting, no command, no
   language-model/MCP tool. This is achieved by each add-on owning its
   ``package.json`` contributions (not by runtime hiding within a single
   extension).

   **Acceptance Criteria:**

   * AC-1: With the core alone, the Settings UI shows no PIM or recorder
     settings.
   * AC-2: With the core alone, no PIM or recorder views or view containers
     appear.
   * AC-3: With the core alone, no PIM or recorder commands appear in the
     Command Palette.
   * AC-4: With the core alone, no PIM or recorder language-model or MCP tools
     are registered.
   * AC-5: Persisted heartbeat jobs referencing add-on commands that are not
     registered SHALL degrade gracefully — the step is soft-skipped (warning
     logged, job continues), with no user-facing error notification.
   * AC-6 (``message-flow-diagram`` CR): With ``enthali.jarvis-flow`` not
     installed, no title-bar button, command, or webview it contributes
     appears anywhere — same guarantee as AC-1 through AC-3 for PIM/recorder.


.. req:: No Migration Across the Transition
   :id: REQ_MOD_NOMIGRATION
   :status: approved
   :priority: required
   :links: US_MOD_INSTALL

   **Description:**
   Existing users SHALL keep their data, messages, and settings across the
   transition with no manual migration. The core keeps the existing extension
   id (in-place update), and all settings keep their existing ``jarvis.*`` keys
   regardless of which extension contributes them.

   **Acceptance Criteria:**

   * AC-1: Existing entity files (sessions, projects, events) are read unchanged
     from their current locations.
   * AC-2: Existing message queues and message logs under ``.jarvis/`` are read
     unchanged.
   * AC-3: Existing settings (``jarvis.projects.folder``, ``jarvis.recording.*``,
     …) are honoured unchanged; no setting key is renamed.
   * AC-4: Updating from the monolith to the core requires no reinstall and no
     data move.


.. req:: Module Asset Provisioning Helper
   :id: REQ_MOD_SKILL_PROVISION
   :status: approved
   :priority: required
   :links: US_MOD_SKILL_PROVISION; US_MOD_INSTALL

   **Description:**
   ``packages/core`` SHALL export a ``provisionModuleAssets(ctx, config)`` function
   that any module's ``activate()`` may call to copy its VSIX-bundled Copilot Skill
   folders and Instructions files into the current workspace's ``.github/skills/``
   and ``.github/instructions/`` directories. The function is non-blocking
   (called fire-and-forget from ``activate()``).

   **Acceptance Criteria:**

   * AC-1: The function accepts an ``ExtensionContext`` (for workspace-state
     persistence) and a configuration object with: ``namespace`` (string), optional
     ``skillsSourceDir`` (absolute path to a bundled skills folder), optional
     ``instructionsSourceDir`` (absolute path to a bundled instructions folder),
     and optional ``enabled`` (boolean, default ``true``; see
     ``REQ_MOD_SKILL_OPTOUT``).
   * AC-2: Every skill folder name in the bundle MUST start with ``<namespace>.``;
     every instructions filename MUST start with ``<namespace>.``. The function
     SHALL log a warning and skip any asset that violates this constraint —
     it SHALL NOT write the file.
   * AC-3: A skill folder is written to ``.github/skills/<foldername>/`` only if
     it is absent or any file within it differs from the bundled version (content
     comparison; no unnecessary writes).
   * AC-4: An instructions file is written to ``.github/instructions/<filename>``
     only if it is absent or its content differs from the bundled version.
   * AC-5: If no open workspace folder exists, the function logs a warning and
     returns without taking any action.
   * AC-6: The function is invoked asynchronously from ``activate()`` and SHALL NOT
     block extension activation.


.. req:: Module Asset Orphan Cleanup
   :id: REQ_MOD_SKILL_ORPHAN
   :status: approved
   :priority: required
   :links: US_MOD_SKILL_PROVISION

   **Description:**
   Each invocation of ``provisionModuleAssets()`` SHALL remove files and folders
   previously written by the same module that are no longer present in the current
   bundle (orphan cleanup). Cleanup is strictly scoped to files the helper itself
   previously wrote.

   **Acceptance Criteria:**

   * AC-1: The set of files and folders written in the previous invocation SHALL be
     persisted in ``ExtensionContext.workspaceState`` under the key
     ``jarvis.provisioned.<namespace>``.
   * AC-2: On invocation, any entry present in the persisted set but absent from the
     current bundle SHALL be removed from its target directory
     (``.github/skills/`` or ``.github/instructions/``).
   * AC-3: Files and folders in the target directories that are NOT in the persisted
     set SHALL NEVER be removed — regardless of whether their name matches the
     namespace prefix.
   * AC-4: The persisted set SHALL be updated to exactly the current bundle's file
     list after every invocation (write phase complete, cleanup phase complete).


.. req:: Module-Owned Provisioning Opt-Out
   :id: REQ_MOD_SKILL_OPTOUT
   :status: approved
   :priority: required
   :links: US_MOD_SKILL_PROVISION

   **Description:**
   Whether a module's asset provisioning is user-controllable is the **module's**
   decision, not the core helper's. Some modules' assets are functionally required
   (e.g. without its skill, an agent does not know how to read or write a module's
   data files), so a mandatory global opt-out would break them. The core helper
   therefore provides only the *mechanism* — an ``enabled`` flag — and each module
   decides whether to expose it as a user setting.

   **Acceptance Criteria:**

   * AC-1: ``provisionModuleAssets`` SHALL accept ``enabled?: boolean`` in its
     config, defaulting to ``true`` when omitted.
   * AC-2: When ``enabled`` is ``false``, the function SHALL remove every asset
     recorded in the module's manifest (``REQ_MOD_SKILL_ORPHAN`` AC-1), clear the
     manifest, and write nothing.
   * AC-3: When ``enabled`` returns to ``true``, provisioning SHALL resume in full
     on the next activation — no residual disabled state is persisted.
   * AC-4: A module that exposes a user setting for this SHALL derive its name
     from the **asset namespace**, not the module: ``jarvis.`` + the namespace
     with its leading ``jarvis-`` removed + ``.autoProvision`` (boolean). So
     namespace ``jarvis-kanban`` yields ``jarvis.kanban.autoProvision`` and
     namespace ``jarvis-actor`` yields ``jarvis.actor.autoProvision``. The
     namespace rather than the module is the unit because one module may
     provision several namespaces (``actor-kernel-instructions-delivery`` CR:
     ``packages/core`` ships the ``jarvis-actor`` set and may later ship
     others), and a per-module name could then govern two unrelated asset sets.
   * AC-4a: (``actor-kernel-instructions-delivery`` CR) The setting's **default
     SHALL reflect whether the assets are required for the module to function**,
     not a fixed value:

     - Required — the module cannot be used correctly without them — default
       ``true``, and the module MAY omit the setting entirely and never pass
       ``enabled: false``. Example: without the kanban skill an agent does not
       know how to read or write ``kanban.yaml``.
     - Not required — the assets serve a usage mode the workspace may not be in
       — default ``false``, so a workspace receives nothing it did not ask for.
       Example: the ``jarvis-actor`` rule set is meaningless in a workspace that
       runs no actors.

     This supersedes the flat "default ``true``" previously stated in AC-4.
   * AC-5: The core helper SHALL NOT read any configuration setting itself — the
     calling module supplies the value. This keeps ``REQ_MOD_ZEROTRACE`` intact:
     no setting for an uninstalled module exists anywhere.


.. req:: Actor Rule Set Delivery
   :id: REQ_MOD_ACTORRULES
   :status: approved
   :priority: required
   :links: US_MOD_ACTORRULES; REQ_MOD_SKILL_PROVISION; REQ_MOD_SKILL_OPTOUT; REQ_MOD_CORE

   **Description:**
   ``packages/core`` SHALL bundle the three actor behavioural rule files and
   provision them through the existing ``provisionModuleAssets`` helper. This
   requirement adds a *consumer* of that mechanism; it changes nothing about the
   mechanism itself.

   **Asset set:**

   Source of truth is ``packages/core/assets/instructions/``, tracked in git via
   the ``!packages/*/assets/**`` negation (``.gitignore``), which exempts it from
   the repository-wide ``jarvis-*`` ignore.

   .. list-table::
      :header-rows: 1

      * - File
        - Content baseline
      * - ``jarvis-actor.kernel.instructions.md``
        - The strict superset containing "End your turn with a clean tree" and
          the scope-escalation paragraph
      * - ``jarvis-actor.memory.instructions.md``
        - The common cross-repository version plus the one reconciled added rule
      * - ``jarvis-actor.authoring.instructions.md``
        - The common cross-repository version, unchanged

   **Acceptance Criteria:**

   * AC-1: The namespace SHALL be ``jarvis-actor``, and every bundled filename
     SHALL begin ``jarvis-actor.`` so it satisfies
     ``REQ_MOD_SKILL_PROVISION`` AC-2 without any change to that rule.
   * AC-2: The filenames SHALL also begin ``jarvis-`` so the repository-wide
     ``jarvis-*`` ignore continues to classify the provisioned copies as
     product-generated rather than user source. Both conventions are satisfied
     by the single shape ``jarvis-<namespace-tail>.<topic>.instructions.md``.
   * AC-3: ``packages/core`` SHALL contribute
     ``jarvis.actor.autoProvision`` (boolean, **default** ``false``) per
     ``REQ_MOD_SKILL_OPTOUT`` AC-4/AC-4a, and pass it as ``enabled``.
     Default ``false`` because the rules govern actor operation, which is a
     usage mode many workspaces are not in (``US_MOD_ACTORRULES`` AC-3).
   * AC-4: Core's ``activate()`` SHALL call ``provisionModuleAssets`` with
     ``instructionsSourceDir`` only — this set ships no skills.
   * AC-5: With the setting ``false``, no file SHALL be written into the
     workspace, and any previously provisioned file SHALL be removed
     (``REQ_MOD_SKILL_OPTOUT`` AC-2).
   * AC-6: The ``jarvis-actor.*`` rule files SHALL NOT duplicate
     ``jarvis-actor-memory-repository.instructions.md``, which stays
     syspilot-private and is out of scope.
   * AC-7: ``.gitignore`` SHALL NOT be changed to un-ignore
     ``.github/instructions/``. With the source of truth in
     ``packages/core/assets/instructions/``, the workspace copy is generated
     output, and generated output stays ignored. Only the stale rationale
     comment is corrected (``REQ_MOD_ACTORRULES`` AC-8).
   * AC-8: The ``.gitignore`` comment above ``.github/instructions/`` SHALL be
     corrected. It currently reads "Actor Kernel instructions — private IP, not
     for public repo", which is false twice over: the files are MIT-licensed,
     and the directory is now provisioned output rather than private source.


.. req:: Actor Rule Set Migration
   :id: REQ_MOD_ACTORRULES_MIGRATE
   :status: approved
   :priority: required
   :links: US_MOD_ACTORRULES; REQ_MOD_SKILL_ORPHAN

   **Description:**
   The three rule files already exist in developer workspaces under their
   pre-convention hyphenated names (``jarvis-actor-kernel.instructions.md`` and
   siblings). Those copies are **not** in any provisioning manifest, so
   ``REQ_MOD_SKILL_ORPHAN`` AC-3 correctly forbids the helper from removing
   them — they must be retired deliberately.

   **Acceptance Criteria:**

   * AC-1: The pre-convention filenames SHALL be documented as superseded, with
     the one-time removal recorded as an explicit migration step rather than
     left for the helper to perform.
   * AC-2: Until they are removed, both the old and new files apply
     (``applyTo: "**"`` in each), so a workspace runs two copies of the same
     rules simultaneously. The migration note SHALL state this consequence, as
     it is the reason the step is not optional.
   * AC-3: The removal SHALL NOT be automated by extending the helper to delete
     files it did not write. That would void the guarantee in
     ``REQ_MOD_SKILL_ORPHAN`` AC-3, which is the property protecting every
     user-authored file in ``.github/instructions/``.
   * AC-4: Workspaces that never opted in are unaffected — with
     ``jarvis.actor.autoProvision`` defaulting to ``false``, no new file is
     written and no collision arises.
   * AC-5: (**Data-loss note**) ``.github/instructions/`` is git-ignored, so the
     existing files are unversioned. Any local edit to them is unrecoverable
     once superseded. The migration note SHALL say so, so a user who customised
     a copy can rescue it before opting in.
