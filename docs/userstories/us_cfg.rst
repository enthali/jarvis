Configuration User Stories
==========================

.. story:: Heartbeat Check Interval
   :id: US_CFG_HEARTBEAT
   :status: implemented
   :tracked_by: MOD_CONFIG
   :priority: optional
   :links: US_AUT_HEARTBEAT; US_CFG_FIXEDPATHS

   **As a** Jarvis User,
   **I want** to control how often Jarvis checks whether a job is due,
   **so that** I can tune the scheduler to my needs.

   **Acceptance Criteria:**

   * AC-1: The interval between two scheduler ticks, in seconds, is a user setting; its default is 60 seconds


.. story:: Per-Feature Enable Toggles
   :id: US_CFG_FEATURETOGGLES
   :status: approved
   :tracked_by: MOD_CONFIG
   :priority: required

   **As a** Jarvis user,
   **I want** one on/off toggle per feature
   **so that** I can disable features I don't use without removing configuration.

   **Acceptance Criteria:**

   * AC-1: A boolean setting ``jarvis.heartbeat.enabled`` (default: ``true``) enables
     or disables the Heartbeat feature. When disabled, no Heartbeat tree view,
     scheduler, or tools are registered.
   * AC-2: A boolean setting ``jarvis.messages.enabled`` (default: ``true``) enables
     or disables the Messages feature. When disabled, no Messages tree view, commands,
     or tools are registered.
   * AC-3: A boolean setting ``jarvis.reminders.enabled`` (default: ``true``) enables
     or disables the Reminders feature. When disabled, no Reminders tree view or tools
     are registered. Reminders is a sub-feature of Messages (only available when
     Messages is also enabled).
   * AC-4: A boolean setting ``jarvis.mcp.enabled`` (default: ``false``) enables or
     disables the MCP server. When disabled, the embedded MCP server does not start.
   * When a feature is disabled, none of that feature's tree views, commands, tools,
     or timers are registered during extension activation.
   * Changing a toggle requires "Developer: Reload Window" to take effect (hot toggling
     is deferred to a future CR).


.. story:: Fixed Runtime File Paths
   :id: US_CFG_FIXEDPATHS
   :status: implemented
   :tracked_by: MOD_CONFIG
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
   :status: approved
   :tracked_by: MOD_CONFIG
   :priority: required
   :links: US_CFG_FIXEDPATHS

   **As a** Jarvis user whose workspace is a version-controlled repository,
   **I want** every file Jarvis generates into my workspace to be recognisable
   as Jarvis-owned and selectively ignorable,
   **so that** I can keep Jarvis's runtime artifacts out of my repository
   without also losing control over my own files in the same directories, and
   without having to investigate each unfamiliar file that appears.

   *Context: Jarvis generates files into directories that other tools and the
   project also use. The rules below apply to every such directory.*

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
   * AC-4: Upgrading Jarvis SHALL NOT leave generated files behind that the new
     version no longer uses — no orphaned or duplicated artifacts accumulate
     across upgrades, and none of them keeps affecting my agent's work.
   * AC-5: An existing installation SHALL keep working across such an upgrade:
     no manual repair, reinstall, or workspace reset is required.
   * AC-6: The naming convention and the ignore pattern that follows from it
     SHALL be documented, so a user can apply them without reading Jarvis's
     source.


.. story:: Comprehensible Runtime File Layout
   :id: US_CFG_RUNTIMELAYOUT
   :status: implemented
   :tracked_by: MOD_CONFIG
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
   would silently leave it tracked.* ``state/`` *already shows
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
   :tracked_by: MOD_CONFIG
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
   :status: approved
   :tracked_by: MOD_CONFIG
   :priority: required

   **As a** Jarvis user,
   **I want** settings organized into clearly named groups — Jarvis core
   groups plus one group per installed add-on
   **so that** settings are discoverable without scrolling through a flat list.

   **Acceptance Criteria:**

   * AC-8: The VS Code Settings UI shows the core groups in a fixed order and
     one or more groups per installed add-on, each containing only its own
     feature's settings.
