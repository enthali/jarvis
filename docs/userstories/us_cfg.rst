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
   :status: deprecated
   :priority: optional
   :links: US_MSG_CHATQUEUE; US_CFG_FIXEDPATHS

   **Superseded by:** ``US_CFG_FIXEDPATHS`` (settings-cleanup CR, 2026-05-18;
   formally deprecated by the ``jarvis-messages-dir-grouping`` CR, GH #59).

   Both acceptance criteria below became false when the settings-cleanup CR
   removed ``jarvis.messagesFile`` and fixed the queue at a non-configurable
   ``.jarvis/`` path (``REQ_CFG_RENAMES``). The story was left ``approved``,
   so for over a year it asserted a configurable default that the code does
   not offer and that ``US_CFG_FIXEDPATHS`` explicitly forbids. Retained for
   historical traceability; the user goal it describes — choosing the queue
   location — is deliberately no longer served.

   **As a** Jarvis User,
   **I want** to control where Jarvis stores queued messages,
   **so that** I can place the queue file in a shared or backed-up location if needed.

   **Acceptance Criteria (historic — no longer in force):**

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
   **I want** the runtime files (heartbeat.yaml, the message files under
   messages/, reminders.yaml) to live at fixed paths under ``.jarvis/``
   in my workspace root
   **so that** Jarvis works out of the box without any manual path configuration.

   **Acceptance Criteria:**

   * AC-3: ``heartbeat.yaml`` is always resolved as
     ``<workspaceRoot>/.jarvis/heartbeat.yaml`` and is not configurable.
   * AC-4: The message queue is always resolved as
     ``<workspaceRoot>/.jarvis/messages/queue.json`` and is not configurable.
   * AC-5: ``reminders.yaml`` is always resolved as
     ``<workspaceRoot>/.jarvis/reminders.yaml`` and is not configurable.
   * AC-7: The message log and the auto-delivery list are also stored under
     ``<workspaceRoot>/.jarvis/messages/`` (``log.json`` and
     ``autodelivery.json``) and are not configurable.
   * The ``.jarvis/`` directory is created lazily on first write; Jarvis does not
     create it at activation time.
   * When no workspace folder is open, features that require ``.jarvis/`` log a
     one-time warning and short-circuit gracefully — no errors are thrown.


.. story:: Identifiable Jarvis-Owned Workspace Files
   :id: US_CFG_WORKSPACEFILES
   :status: implemented
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


.. story:: Comprehensible Runtime File Layout
   :id: US_CFG_RUNTIMELAYOUT
   :status: implemented
   :priority: required
   :links: US_CFG_FIXEDPATHS; US_CFG_WORKSPACEFILES

   **As a** Jarvis user who inspects or maintains the ``.jarvis/`` directory
   in my workspace,
   **I want** runtime files that belong to the same feature to be grouped
   together and named for what they hold,
   **so that** I can understand, back up, ignore, or clear a feature's state as
   one unit, without first learning which of several flat files belong
   together.

   *Context:* ``.jarvis/`` *currently mixes persistent team knowledge*
   (``actors/``) *with flat runtime files. Three of them —*
   ``messages.json``, ``message-log.json``, ``autodelivery.json`` *— are all
   message-related, but neither their names nor their location says so. The
   consequence is visible in this repository's own* ``.gitignore``\ *, which
   has to enumerate the three files individually; adding a fourth message file
   would silently leave it tracked.* ``state/touched-files/`` *already shows
   the grouped, well-named pattern this story generalises.*

   **Acceptance Criteria:**

   * AC-1: Runtime files that belong to one feature SHALL be discoverable as a
     group from the directory listing alone — a user SHALL NOT have to open a
     file or read documentation to learn that it belongs with another.
   * AC-2: Each such group SHALL be addressable as a single unit for ignoring,
     backing up, or clearing — one path SHALL suffice, and it SHALL keep
     covering files the same feature adds later.
   * AC-3: A file's name SHALL describe what it holds within its group,
     without repeating the group name.
   * AC-4: Reorganising the layout SHALL NOT lose or duplicate any pending
     runtime data — no queued message, log entry, or auto-delivery
     registration is dropped, and none is delivered or recorded twice.
   * AC-5: AC-4 SHALL hold regardless of the order in which Jarvis's separately
     installed extensions activate, and regardless of whether they are all on
     the same version — the user upgrades extensions independently and is not
     required to upgrade them together.
   * AC-6: No manual migration step, workspace reset, or configuration change
     SHALL be required of the user.
   * AC-7: Files that do not belong to a group SHALL remain where they are —
     the layout SHALL NOT be changed for its own sake where no user-visible
     confusion exists.


.. story:: Automatically Maintained Ignore Entries
   :id: US_CFG_AUTOGITIGNORE
   :status: implemented
   :priority: required
   :links: US_CFG_WORKSPACEFILES; US_CFG_RUNTIMELAYOUT

   **As a** Jarvis user whose workspace is a version-controlled repository,
   **I want** Jarvis to keep the ignore entries for its own generated files
   current by itself,
   **so that** my repository stays free of Jarvis runtime state without me
   having to learn which files Jarvis writes, transcribe them into
   ``.gitignore``, and revisit that list after every Jarvis upgrade.

   *Context:* ``US_CFG_WORKSPACEFILES`` *AC-2 and* ``US_CFG_RUNTIMELAYOUT``
   *AC-2 both promise that one pattern suffices and keeps covering files the
   same feature adds later. Both reduce what the user has to write down;
   neither removes the step of writing it down at all, nor the step of noticing
   that it has to be written down again. This repository shows the residue: its
   own* ``.gitignore`` *carries six hand-maintained Jarvis entries, and the two
   most recent changes to Jarvis's file layout (GH #58, GH #59) each required
   editing it by hand. A consuming project has the same work with none of the
   insight into when it becomes necessary.*

   **Acceptance Criteria:**

   * AC-1: Jarvis SHALL maintain its own ignore entries without user action —
     neither at first use nor after an upgrade that changes what Jarvis
     generates SHALL the user have to edit the file.
   * AC-2: The maintained region SHALL be delimited so that a reader of a plain
     diff can tell which lines Jarvis owns, that Jarvis owns them, and how to
     turn the behaviour off — without consulting documentation or source.
     Jarvis writes into a file the user version-controls, so the change has to
     explain itself where it appears.
   * AC-3: Everything outside the maintained region SHALL be preserved exactly
     as the user left it — including the user's own Jarvis-related entries,
     their order, their comments, and the file's existing line endings.
   * AC-4: The maintained region SHALL NOT cause any file authored by the user
     or by another tool to be ignored. An ignore rule that silently withholds
     an authored file from version control is worse than the manual
     maintenance it replaces, because the loss is discovered later and
     elsewhere (``US_CFG_WORKSPACEFILES`` AC-3).
   * AC-5: Turning the behaviour off SHALL both stop the maintenance and remove
     the region Jarvis previously wrote — an opted-out workspace SHALL NOT be
     left carrying a managed block that nothing maintains.
   * AC-6: Once the file is current, further activations SHALL leave it
     byte-identical — the user SHALL NOT see the file appear as modified
     merely because Jarvis started.
   * AC-7: In a workspace where the behaviour does not apply — no folder open,
     or the folder is not version-controlled — Jarvis SHALL do nothing and
     SHALL continue to start normally.


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
