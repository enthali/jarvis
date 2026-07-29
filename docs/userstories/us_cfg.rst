Configuration User Stories
==========================

.. story:: Configurable Project and Event Folder Paths
   :id: US_CFG_PROJECTPATH
   :status: approved
   :priority: mandatory
   :links: US_AUT_HEARTBEAT

   **As a** Jarvis User,
   **I want** to configure the folder paths where Jarvis looks for project and event YAML files,
   **so that** I can point the extension to my own storage locations.

   **Acceptance Criteria:**

   * AC-1: A VS Code setting ``jarvis.projectsFolder`` accepts an absolute folder path for projects
   * AC-2: A VS Code setting ``jarvis.eventsFolder`` accepts an absolute folder path for events
   * AC-3: A VS Code setting ``jarvis.scanInterval`` controls background refresh interval
     in minutes (default: 2, value 0 disables automatic scanning)
   * AC-4: Changing a folder setting immediately triggers a rescan

.. story:: Heartbeat Config File Location
   :id: US_CFG_HEARTBEAT
   :status: implemented
   :priority: optional
   :links: US_AUT_HEARTBEAT

   **As a** Jarvis User,
   **I want** to control where Jarvis reads the heartbeat configuration and how often it checks,
   **so that** I can keep job definitions out of the repository by default or share them via an
   explicit path, and tune the scheduler to my needs.

   **Acceptance Criteria:**

   * AC-1: By default, ``heartbeat.yaml`` is read from VS Code workspace storage (not tracked in the repo)
   * AC-2: A setting ``jarvis.heartbeatConfigFile`` overrides the default with an absolute path
   * AC-3: A setting ``jarvis.heartbeatInterval`` controls the scheduler tick interval in seconds (default: 60)


.. story:: Message Queue Storage Location
   :id: US_CFG_MSG
   :status: approved
   :priority: optional
   :links: US_MSG_CHATQUEUE

   **As a** Jarvis User,
   **I want** to control where Jarvis stores queued messages,
   **so that** I can place the queue file in a shared or backed-up location if needed.

   **Acceptance Criteria:**

   * AC-1: By default, ``messages.json`` is stored in VS Code workspace storage
     (``context.storageUri``)
   * AC-2: A setting ``jarvis.messagesFile`` overrides the default with an absolute path


.. story:: Grouped Settings Categories
   :id: US_CFG_SETTINGSGROUPS
   :status: deprecated
   :priority: mandatory
   :links: US_CFG_PROJECTPATH; US_CFG_HEARTBEAT; US_CFG_MSG

   **Superseded by:** ``US_CFG_GROUPS`` (settings-cleanup CR, 2026-05-18).
   The original "presentation-only" guarantee no longer holds: the
   settings-cleanup CR explicitly renames keys and removes path settings.
   Retained for historical traceability.

   **As a** Jarvis User,
   **I want** the Jarvis settings to be organized in named sub-categories
   (Projects, Events, Heartbeat, Messages, MCP Server, Updates),
   **so that** I can find and configure related settings together instead of
   scrolling through a flat list.

   **Acceptance Criteria:**

   * AC-1: The VS Code Settings UI shows Jarvis settings grouped under named
     sub-headings
   * AC-2: Each group contains only its related settings according to the
     grouping table (Projects, Events, Heartbeat, Messages, MCP Server, Updates,
     Outlook)
   * AC-3: No setting changes its key name, type, or default value — this is a
     presentation-only change


.. story:: Per-Feature Enable Toggles
   :id: US_CFG_FEATURETOGGLES
   :status: implemented
   :priority: required

   **As a** Jarvis user,
   **I want** one on/off toggle per feature
   **so that** I can disable features I don't use without removing configuration.

   **Acceptance Criteria:**

   * AC-1: A boolean setting ``jarvis.projects.enabled`` (default: ``false``) enables
     or disables the Projects feature. When disabled, no Projects tree view, commands,
     or tools are registered.
   * AC-2: A boolean setting ``jarvis.events.enabled`` (default: ``false``) enables
     or disables the Events feature. When disabled, no Events tree view, commands,
     or tools are registered.
   * AC-3: A boolean setting ``jarvis.heartbeat.enabled`` (default: ``true``) enables
     or disables the Heartbeat feature. When disabled, no Heartbeat tree view,
     scheduler, or tools are registered.
   * AC-4: A boolean setting ``jarvis.messages.enabled`` (default: ``true``) enables
     or disables the Messages feature. When disabled, no Messages tree view, commands,
     or tools are registered.
   * AC-5: A boolean setting ``jarvis.reminders.enabled`` (default: ``true``) enables
     or disables the Reminders feature. When disabled, no Reminders tree view or tools
     are registered. Reminders is a sub-feature of Messages (only available when
     Messages is also enabled).
   * AC-6: A boolean setting ``jarvis.mcp.enabled`` (default: ``false``) enables or
     disables the MCP server. When disabled, the embedded MCP server does not start.
   * When a feature is disabled, none of that feature's tree views, commands, tools,
     or timers are registered during extension activation.
   * Changing a toggle requires "Developer: Reload Window" to take effect (hot toggling
     is deferred to a future CR).


.. story:: Fixed Runtime File Paths
   :id: US_CFG_FIXEDPATHS
   :status: implemented
   :priority: required

   **As a** Jarvis user,
   **I want** the runtime files (heartbeat.yaml, messages.json, reminders.yaml,
   message-log.json, autodelivery.json) to live at fixed paths under ``.jarvis/``
   in my workspace root
   **so that** Jarvis works out of the box without any manual path configuration.

   **Acceptance Criteria:**

   * AC-3: ``heartbeat.yaml`` is always resolved as
     ``<workspaceRoot>/.jarvis/heartbeat.yaml`` and is not configurable.
   * AC-4: ``messages.json`` is always resolved as
     ``<workspaceRoot>/.jarvis/messages.json`` and is not configurable.
   * AC-5: ``reminders.yaml`` is always resolved as
     ``<workspaceRoot>/.jarvis/reminders.yaml`` and is not configurable.
   * AC-7: ``message-log.json`` and ``autodelivery.json`` are also stored under
     ``<workspaceRoot>/.jarvis/`` and are not configurable.
   * The ``.jarvis/`` directory is created lazily on first write; Jarvis does not
     create it at activation time.
   * When no workspace folder is open, features that require ``.jarvis/`` log a
     one-time warning and short-circuit gracefully — no errors are thrown.


.. story:: Identifiable Jarvis-Owned Workspace Files
   :id: US_CFG_WORKSPACEFILES
   :status: approved
   :priority: required
   :links: US_CFG_FIXEDPATHS

   **As a** Jarvis user whose workspace is a version-controlled repository,
   **I want** every file Jarvis generates into my workspace to be recognisable
   as Jarvis-owned and selectively ignorable,
   **so that** I can keep Jarvis's runtime artifacts out of my repository
   without also losing control over my own files in the same directories, and
   without having to investigate each unfamiliar file that appears.

   *Context: Jarvis writes generated files into* ``.github/hooks/`` *— a
   directory pinned by GitHub Copilot and shared with any other tool's hook
   contributions, as well as with hook files the project itself may want to
   version. Two of the three files Jarvis writes there are named*
   ``bridge.mjs`` *and* ``port`` *: names that identify neither their owner nor
   their purpose. The only ignore pattern that reliably covers them today is
   the whole directory, which is why this repository's own* ``.gitignore``
   *excludes* ``.github/hooks/`` *entirely.*

   **Acceptance Criteria:**

   * AC-1: Every file Jarvis generates into a directory it does not
     exclusively own SHALL be attributable to Jarvis from its name alone,
     without opening the file or consulting documentation.
   * AC-2: All Jarvis-generated files in such a directory SHALL be coverable
     by a single ignore pattern that also covers files Jarvis adds there in
     future — the user SHALL NOT have to enumerate filenames or revisit the
     pattern after a Jarvis upgrade.
   * AC-3: Ignoring Jarvis's generated files SHALL NOT require ignoring files
     the user or another tool owns in the same directory. Directory-wide
     exclusion SHALL NOT be the only available remedy.
   * AC-4: Upgrading Jarvis SHALL NOT leave generated files behind under names
     a previous version used — no orphaned or duplicated artifacts accumulate
     across upgrades.
   * AC-5: An existing installation SHALL keep working across such an upgrade:
     hooks continue to fire and no manual repair, reinstall, or workspace
     reset is required.
   * AC-6: The naming convention and the ignore pattern that follows from it
     SHALL be documented, so a user can apply them without reading Jarvis's
     source.


.. story:: Grouped Settings Organization
   :id: US_CFG_GROUPS
   :status: implemented
   :priority: required

   **As a** Jarvis user,
   **I want** settings organized into clearly named groups (Projects, Events,
   Sessions, Messages, Heartbeat, Reminders, MCP, PIM, Outlook, Recording,
   Updates)
   **so that** settings are discoverable without scrolling through a flat list.

   **Acceptance Criteria:**

   * AC-8: The VS Code Settings UI shows exactly those eleven groups in that
     order, each containing only its own feature's settings. The ``Sessions``
     group may be empty in this CR (filled by CR ``sessions-feature``).
