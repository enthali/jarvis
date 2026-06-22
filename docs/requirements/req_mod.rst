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


.. req:: Add-ons Separately Installable
   :id: REQ_MOD_ADDONS
   :status: approved
   :priority: required
   :links: US_MOD_INSTALL

   **Description:**
   PIM, the recorder, and MCP SHALL each be packaged as a separate extension
   that depends on the core via ``extensionDependencies: ["enthali.jarvis"]``
   and cannot activate without it.

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
