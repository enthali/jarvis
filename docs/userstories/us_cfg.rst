Configuration User Stories
==========================

.. story:: Configurable Project and Event Folder Paths
   :id: US_CFG_PROJECTPATH
   :status: implemented
   :priority: mandatory

   **As a** Jarvis User,
   **I want** to configure the folder paths where Jarvis looks for project and event YAML files,
   **so that** I can point the extension to my own storage locations.

   **Acceptance Criteria:**

   * AC-1: A VS Code setting ``jarvis.projectsFolder`` accepts an absolute folder path for projects
   * AC-2: A VS Code setting ``jarvis.eventsFolder`` accepts an absolute folder path for events
   * AC-3: A VS Code setting ``jarvis.scanInterval`` controls background refresh interval (default: 120s)
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
