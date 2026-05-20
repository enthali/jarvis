Configuration Requirements
==========================

.. req:: Configurable Folder Paths
   :id: REQ_CFG_FOLDERPATHS
   :status: implemented
   :priority: mandatory
   :links: US_CFG_PROJECTPATH

   **Description:**
   The extension SHALL provide VS Code settings for the project and event folder paths.

   **Acceptance Criteria:**

   * AC-1: ``jarvis.projectsFolder`` accepts an absolute folder path for project YAML files
   * AC-2: ``jarvis.eventsFolder`` accepts an absolute folder path for event YAML files
   * AC-3: Changing either folder setting immediately triggers a new scan cycle


.. req:: Configurable Scan Interval
   :id: REQ_CFG_SCANINTERVAL
   :status: implemented
   :priority: mandatory
   :links: US_CFG_PROJECTPATH; REQ_AUT_JOBREG

   **Description:**
   The extension SHALL provide a VS Code setting to control the background scanner
   interval, expressed in minutes.

   **Acceptance Criteria:**

   * AC-1: ``jarvis.scanInterval`` accepts an integer number of minutes; minimum 0,
     default 2; value 0 disables automatic scanning
   * AC-2: A non-zero value SHALL cause the extension to register a heartbeat job
     ``"Jarvis: Rescan"`` with schedule ``*/<value> * * * *``
   * AC-3: A change to the interval SHALL take effect immediately: the rescan heartbeat
     job is re-registered with the new schedule, or unregistered if the new value is 0


.. req:: Heartbeat Config File Resolution
   :id: REQ_CFG_HEARTBEATPATH
   :status: implemented
   :priority: optional
   :links: US_CFG_HEARTBEAT

   **Description:**
   The extension SHALL resolve the heartbeat config file path according to a defined
   priority order.

   **Acceptance Criteria:**

   * AC-1: If ``jarvis.heartbeatConfigFile`` is set to a non-empty absolute path, that
     path SHALL be used as the config file location
   * AC-2: Otherwise, the config file SHALL default to
     ``context.storageUri + "/heartbeat.yaml"`` (workspace storage, not tracked in repo)
   * AC-3: No legacy fallback path (e.g. ``.jarvis/heartbeat.yaml``) SHALL be consulted
   * AC-4: When ``jarvis.heartbeatConfigFile`` changes at runtime, the scheduler SHALL
     reload the config file at the start of the next tick cycle


.. req:: Configurable Heartbeat Tick Interval
   :id: REQ_CFG_HEARTBEATINTERVAL
   :status: implemented
   :priority: optional
   :links: US_CFG_HEARTBEAT

   **Description:**
   The extension SHALL provide a VS Code setting to control how often the heartbeat
   scheduler fires.

   **Acceptance Criteria:**

   * AC-1: ``jarvis.heartbeatInterval`` accepts integer seconds, minimum 10, default 60
   * AC-2: A change to the interval takes effect at the start of the next tick cycle

.. req:: Message Queue File Path
   :id: REQ_CFG_MSGPATH
   :status: implemented
   :priority: optional
   :links: US_CFG_MSG; REQ_MSG_QUEUE

   **Description:**
   The extension SHALL resolve the message queue file path with a sensible default
   and provide an optional user override.

   **Acceptance Criteria:**

   * AC-1: The default queue file path SHALL be
     ``context.storageUri/messages.json``
   * AC-2: The VS Code setting ``jarvis.messagesFile`` SHALL override the default
     with an absolute file path
   * AC-3: A runtime change to the setting SHALL trigger a reload of the queue
     data and a refresh of the Messages tree view


.. req:: Update Check Configuration
   :id: REQ_CFG_UPDATECHECK
   :status: implemented
   :priority: optional
   :links: US_REL_SELFUPDATE

   **Description:**
   The extension SHALL provide a boolean setting to enable or disable the automatic
   update check on activation.

   **Acceptance Criteria:**

   * AC-1: ``jarvis.checkForUpdates`` is a boolean setting with default ``true``
   * AC-2: When set to ``false``, the automatic check at activation is skipped
   * AC-3: The manual command ``Jarvis: Check for Updates`` works regardless of
     this setting


.. req:: MCP Server Configuration
   :id: REQ_CFG_MCPPORT
   :status: implemented
   :priority: mandatory
   :links: US_MSG_MCPSERVER; REQ_MSG_MCPSERVER

   **Description:**
   The extension SHALL provide VS Code settings for the MCP server port and
   enable/disable toggle.

   **Acceptance Criteria:**

   * AC-1: ``jarvis.mcpPort`` SHALL accept a number with default ``31415``
   * AC-2: ``jarvis.mcpEnabled`` SHALL accept a boolean with default ``true``
   * AC-3: When ``jarvis.mcpEnabled`` is ``false``, the MCP server SHALL not
     start during activation
   * AC-4: The port setting SHALL be read at activation time — runtime changes
     require extension reload


.. req:: Grouped Settings Categories
   :id: REQ_CFG_SETTINGSGROUPS
   :status: deprecated
   :priority: mandatory
   :links: US_CFG_SETTINGSGROUPS; REQ_EXP_FEATURETOGGLE

   **Superseded by:** ``REQ_CFG_GROUPS`` (settings-cleanup CR, 2026-05-18).
   The "no setting key, type, or default value SHALL change" guarantee is
   explicitly broken by ``REQ_CFG_RENAMES``. Retained for historical
   traceability.

   **Description:**
   The extension SHALL organize its VS Code settings into named sub-categories
   so they appear grouped in the Settings UI.

   **Acceptance Criteria:**

   * AC-1: The ``contributes.configuration`` block in ``package.json`` SHALL be
     an array of configuration objects, each with a distinct ``title``
   * AC-2: The groups SHALL be: Projects, Events, Heartbeat, Messages,
     MCP Server, Updates, PIM
   * AC-3: Each setting SHALL appear in exactly one group
   * AC-4: No setting key, type, or default value SHALL change


.. req:: Default Path Population at Activation
   :id: REQ_CFG_DEFAULTPATHS
   :status: implemented
   :priority: mandatory
   :links: US_EXP_FEATURETOGGLE; REQ_CFG_HEARTBEATPATH; REQ_CFG_MSGPATH

   **Description:**
   The extension SHALL write the resolved default file paths into the user-visible
   settings at activation time when those settings are empty. This ensures that
   ``when``-clauses based on non-empty settings evaluate correctly.

   **Acceptance Criteria:**

   * AC-1: If ``jarvis.heartbeatConfigFile`` is empty at activation, the extension
     SHALL write the resolved default path (workspace storage) into the setting
   * AC-2: If ``jarvis.messagesFile`` is empty at activation, the extension SHALL
     write the resolved default path (workspace storage) into the setting
   * AC-3: The written value SHALL be the same path that the extension would use
     as fallback — no behavioral change
   * AC-4: The write SHALL use ``ConfigurationTarget.Workspace`` so the value is
     scoped to the current workspace


.. req:: Per-Feature Enable Toggles
   :id: REQ_CFG_TOGGLES
   :status: implemented
   :priority: required
   :links: US_CFG_FEATURETOGGLES

   **Description:**
   Each Jarvis feature SHALL have a single boolean setting
   ``jarvis.<feature>.enabled`` that gates all activation work for that feature.

   **Settings, names, and defaults:**

   * ``jarvis.projects.enabled`` — boolean, default: ``false``
   * ``jarvis.events.enabled`` — boolean, default: ``false``
   * ``jarvis.heartbeat.enabled`` — boolean, default: ``true``
   * ``jarvis.messages.enabled`` — boolean, default: ``true``
   * ``jarvis.reminders.enabled`` — boolean, default: ``true``
   * ``jarvis.mcp.enabled`` — boolean, default: ``false``

   **Acceptance Criteria:**

   * AC-1: When ``jarvis.projects.enabled`` is ``false``, no Projects tree view,
     no project-related commands, and no ``listProjects`` tool are registered.
   * AC-2: When ``jarvis.events.enabled`` is ``false``, no Events tree view,
     no event-related commands, and no event tools are registered.
   * AC-3: When ``jarvis.heartbeat.enabled`` is ``false``, no Heartbeat tree view,
     no heartbeat scheduler, and no heartbeat tools are registered.
   * AC-4: When ``jarvis.messages.enabled`` is ``false``, no Messages tree view,
     no message commands, and no ``sendToSession`` / ``readMessage`` /
     ``listSessions`` tools are registered.
   * AC-5: When ``jarvis.reminders.enabled`` is ``false`` (or ``messages.enabled``
     is ``false``), no Reminders tree view and no reminder tools are registered.
   * AC-6: When ``jarvis.mcp.enabled`` is ``false``, the embedded MCP server SHALL
     NOT start.
   * When ``enabled=false``, the feature's entire activation block SHALL be
     skipped — no tree views registered, no commands registered, no tools
     registered, no timers started.
   * Runtime toggle (changing the setting without reload) is **not** required in
     this CR; "Developer: Reload Window" is the documented path.


.. req:: Fixed Runtime File Paths Under .jarvis/
   :id: REQ_CFG_FIXEDPATHS
   :status: implemented
   :priority: required
   :links: US_CFG_FIXEDPATHS

   **Description:**
   All Jarvis runtime files SHALL be stored at fixed paths under
   ``<workspaceRoot>/.jarvis/``. These paths are not user-configurable.

   **Fixed file paths:**

   * ``<workspaceRoot>/.jarvis/heartbeat.yaml``
   * ``<workspaceRoot>/.jarvis/messages.json``
   * ``<workspaceRoot>/.jarvis/reminders.yaml``
   * ``<workspaceRoot>/.jarvis/message-log.json``
   * ``<workspaceRoot>/.jarvis/autodelivery.json``

   **Acceptance Criteria:**

   * AC-1: The ``.jarvis/`` directory is created lazily on first write; it SHALL
     NOT be created at extension activation.
   * AC-2: Read operations (e.g., ``readQueue``) SHALL return an empty result if
     the file does not yet exist — no error thrown.
   * AC-3: When no workspace folder is open, affected features SHALL log a
     one-time ``warn``-level message and short-circuit; no exception is thrown.
   * AC-4: The paths are not exposed as VS Code settings — no user override
     is possible.


.. req:: Settings Group Structure
   :id: REQ_CFG_GROUPS
   :status: implemented
   :priority: required
   :links: US_CFG_GROUPS

   **Description:**
   The ``contributes.configuration`` array in ``package.json`` SHALL contain
   exactly the following groups in this order:
   Projects, Events, Sessions, Messages, Heartbeat, Reminders, MCP, PIM,
   Outlook, Recording, Updates.

   **Acceptance Criteria:**

   * AC-1: The ``contributes.configuration`` value is a JSON array.
   * AC-2: Each element has a distinct ``title`` matching one of the eleven
     group names listed above.
   * AC-3: The order of groups matches the list above.
   * AC-4: Each setting appears in exactly one group.
   * AC-5: The Sessions group MAY be empty in this CR (it is reserved for the
     ``sessions-feature`` CR).
   * AC-6: The Updates group contains ``jarvis.checkForUpdates`` (self-update
     flag); it has no natural home in the other ten groups.


.. req:: MCP Default Off
   :id: REQ_CFG_MCPDEFAULTOFF
   :status: implemented
   :priority: required
   :links: US_CFG_FEATURETOGGLES

   **Description:**
   The MCP server feature SHALL default to disabled. The legacy setting key
   ``jarvis.mcpEnabled`` is removed in favour of the dotted-group key
   ``jarvis.mcp.enabled``.

   **Acceptance Criteria:**

   * AC-1: ``jarvis.mcp.enabled`` is a boolean setting with default ``false``.
   * AC-2: The old setting key ``jarvis.mcpEnabled`` SHALL be removed from
     ``contributes.configuration``; any user value stored under the old key
     is ignored.
   * AC-3: When ``jarvis.mcp.enabled`` is ``false`` (the default), the MCP
     server SHALL NOT start during activation and no MCP tools are registered.


.. req:: Setting Key Renames for Group Consistency
   :id: REQ_CFG_RENAMES
   :status: implemented
   :priority: required
   :links: US_CFG_GROUPS

   **Description:**
   The following settings SHALL be renamed to use the
   ``jarvis.<group>.<property>`` dotted-group convention. Old keys are removed
   (breaking change; documented in release notes).

   **Renamed keys:**

   * ``jarvis.projectsFolder`` → ``jarvis.projects.folder``
   * ``jarvis.eventsFolder`` → ``jarvis.events.folder``
   * ``jarvis.mcpEnabled`` → ``jarvis.mcp.enabled`` (see also REQ_CFG_MCPDEFAULTOFF)
   * ``jarvis.outlookEnabled`` → ``jarvis.outlook.enabled``

   **Removed keys (fixed paths, no replacement):**

   * ``jarvis.heartbeatConfigFile`` — replaced by fixed path
     ``<workspaceRoot>/.jarvis/heartbeat.yaml``
   * ``jarvis.messagesFile`` — replaced by fixed path
     ``<workspaceRoot>/.jarvis/messages.json``

   **Default value change:**

   * ``jarvis.messages.logging`` default flips from ``false`` to ``true``
     (message logging is on by default; users may disable explicitly)

   **Acceptance Criteria:**

   * AC-1: All old keys listed above SHALL NOT appear in ``contributes.configuration``
     after this CR.
   * AC-2: Extension code SHALL reference only the new key names.
   * AC-3: The release notes SHALL include a migration note for each renamed/removed
     key.
