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
   * AC-4: A module that exposes a user setting for this SHALL name it
     ``jarvis.<module>.autoProvision`` (boolean, default ``true``) and pass its
     value as ``enabled``. A module whose assets are functionally required MAY
     omit the setting entirely and never pass ``enabled: false``.
   * AC-5: The core helper SHALL NOT read any configuration setting itself — the
     calling module supplies the value. This keeps ``REQ_MOD_ZEROTRACE`` intact:
     no setting for an uninstalled module exists anywhere.
