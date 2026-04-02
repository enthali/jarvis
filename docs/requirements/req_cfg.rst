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
