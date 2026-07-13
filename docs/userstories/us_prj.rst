Project User Stories
=====================

.. story:: Project Entity Kind
   :id: US_PRJ_PROJECT
   :status: draft
   :priority: required
   :links: US_EXP_SIDEBAR; US_ENT_ENTITY

   **As a** Jarvis user,
   **I want** a Project entity kind — a work body scoped to a concrete
   deliverable or initiative — so that I have a durable, identifiable
   container for project-specific work, distinct from the time-bound Event
   kind and the standing-function Actor kind.

   **Acceptance Criteria:**

   * AC-1: A Project is a Jarvis Entity kind, discovered by the generic
     scanner from ``jarvis.projectsFolder`` via ``project.yaml`` as its
     convention file.
   * AC-2: Project-specific feature behavior (folder filtering, LM tool
     listing, programmatic creation) is specified separately in this file's
     other User Stories (``US_PRJ_PROJECTFILTER``, ``US_PRJ_LISTPROJECTS``,
     ``US_PRJ_CREATEPROJECT``) and is not duplicated here.


.. story:: Project Folder Filter
   :id: US_PRJ_PROJECTFILTER
   :status: implemented
   :priority: optional
   :links: US_EXP_SIDEBAR

   **As a** Jarvis User,
   **I want** to show/hide individual folders in the Projects explorer,
   **so that** I can hide archived or irrelevant project folders and focus on active work.

   **Acceptance Criteria:**

   * AC-1: A filter icon in the Projects title bar opens a QuickPick listing all project folders
   * AC-2: Folders can be toggled visible/hidden via multi-select
   * AC-3: The filter selection persists across VS Code restarts (workspaceState)
   * AC-4: When a filter is active, the icon visually indicates that filtering is applied


.. story:: List Projects (LM Tool)
   :id: US_PRJ_LISTPROJECTS
   :status: implemented
   :priority: optional
   :links: US_EXP_SIDEBAR; US_MSG_MCPSERVER

   **As a** LLM agent working in a Jarvis workspace,
   **I want** a tool that lists all projects with their name, summary, agent,
   and folder path,
   **so that** I can discover available projects programmatically and use the
   information in automation workflows.

   **Acceptance Criteria:**

   * AC-1: A Language Model Tool ``jarvis_listProjects`` is available in the
     Chat tool picker
   * AC-2: The tool returns a list of projects, each with ``name`` (from YAML),
     ``summary`` (from YAML, empty string if absent), ``agent`` (from YAML,
     empty string if absent), and ``folder`` (relative path from the configured
     projects folder)
   * AC-3: The tool requires no input parameters
   * AC-4: The tool is also available via the MCP server (dual registration)
   * AC-5: The output shape matches ``jarvis_listActors``
     (``{name, summary, agent, folder}``)


.. story:: Programmatic Project Creation Tool
   :id: US_PRJ_CREATEPROJECT
   :status: draft
   :priority: optional
   :links: US_ENT_NEWENTITY; US_MSG_MCPSERVER

   **As an** LLM operating within an active Jarvis session,
   **I want** a tool ``jarvis_createProject`` that programmatically creates a
   new project folder with ``project.yaml`` and ``context.md``,
   **so that** I can orchestrate project setup workflows without requiring
   the human to click through the Explorer UI.

   **Acceptance Criteria:**

   * AC-1: The tool ``jarvis_createProject`` is registered via LM and MCP.
   * AC-2: A successful call creates ``<projectsFolder>/<name>/``,
     ``project.yaml`` (with ``name``, ``summary``, and optionally ``agent``),
     and an empty ``context.md``.
   * AC-3: The Projects Tree reflects the new project within 2 seconds of
     creation, without any manual rescan.
   * AC-4: If a project folder with the given ``name`` already exists, the tool
     returns a success response with ``created: false`` and the reason; no file
     is overwritten.
   * AC-5: A ``name`` value that is empty, contains filesystem-illegal
     characters, or is a reserved name results in an error — same rules as
     ``jarvis_createActor``.
   * AC-6: An optional ``agent`` parameter is validated against available agents
     before any filesystem operation.


