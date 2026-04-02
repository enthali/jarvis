Configuration User Stories
==========================

.. story:: Configurable Project and Event Folder Paths
   :id: US_CFG_PROJECTPATH
   :status: implemented
   :priority: mandatory

   **As a** project manager,
   **I want** to configure the folder paths where Jarvis looks for project and event YAML files,
   **so that** I can point the extension to my own storage locations.

   **Acceptance Criteria:**

   * AC-1: A VS Code setting ``jarvis.projectsFolder`` accepts an absolute folder path for projects
   * AC-2: A VS Code setting ``jarvis.eventsFolder`` accepts an absolute folder path for events
   * AC-3: A VS Code setting ``jarvis.scanInterval`` controls background refresh interval (default: 120s)
   * AC-4: Changing a folder setting immediately triggers a rescan
