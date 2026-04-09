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
   :links: US_CFG_PROJECTPATH

   **Description:**
   The extension SHALL provide a VS Code setting to control the background scanner interval.

   **Acceptance Criteria:**

   * AC-1: ``jarvis.scanInterval`` accepts integer seconds, minimum 20, default 120
   * AC-2: A change to the interval takes effect at the start of the next scan cycle


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
