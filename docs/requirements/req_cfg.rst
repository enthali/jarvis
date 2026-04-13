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
   :status: implemented
   :priority: mandatory
   :links: US_CFG_SETTINGSGROUPS; REQ_EXP_FEATURETOGGLE

   **Description:**
   The extension SHALL organize its VS Code settings into named sub-categories
   so they appear grouped in the Settings UI.

   **Acceptance Criteria:**

   * AC-1: The ``contributes.configuration`` block in ``package.json`` SHALL be
     an array of configuration objects, each with a distinct ``title``
   * AC-2: The groups SHALL be: Projects, Events, Heartbeat, Messages,
     MCP Server, Updates
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
