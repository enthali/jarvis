Explorer User Stories
=====================

.. story:: Jarvis Explorer Sidebar
   :id: US_EXP_SIDEBAR
   :status: approved
   :priority: mandatory
   :links: US_MSG_CHATQUEUE; US_AUT_HEARTBEAT; US_CFG_FEATURETOGGLES

   **As a** Jarvis User,
   **I want** a dedicated Jarvis sidebar in VS Code that hosts the Jarvis views,
   **so that** I can see my Actors, queued messages, and scheduled heartbeat jobs
   without leaving the editor.

   **Acceptance Criteria:**

   * AC-1: A "Jarvis" icon appears in the VS Code Activity Bar
   * AC-2: Clicking the icon opens a sidebar panel
   * AC-3: The sidebar contains collapsible sections for the ACTORS tree
     (``US_ACTOR_TREE``), Messages, and Heartbeat. Further views are specified
     by their own stories.
   * AC-4: The Messages section lists queued messages; the Heartbeat section
     lists registered heartbeat jobs. Each section is shown only while its
     feature is enabled (``US_CFG_FEATURETOGGLES``).


.. story:: Open Source File from Tree Node
   :id: US_EXP_OPENFILE
   :status: implemented
   :priority: optional
   :links: US_EXP_SIDEBAR

   **As a** Jarvis User,
   **I want** to click a Heartbeat Job node or a Message node in the Jarvis Explorer
   to open the corresponding source file and navigate directly to the relevant line,
   **so that** I can quickly inspect and edit heartbeat job definitions or queued
   messages without manually searching through config files.

   **Acceptance Criteria:**

   * AC-1: Clicking a Heartbeat Job node opens ``heartbeat.yaml`` and reveals the
     line where that job is defined (matched by job name)
   * AC-2: Clicking a Message node opens the messages JSON file and reveals the
     position of that message (matched by index)
   * AC-3: If the exact position cannot be determined, the file opens at line 0
     (fail-open, no error dialog)
   * AC-4: The navigation is read-only — no side effects on the tree or the queue
