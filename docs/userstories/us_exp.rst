Explorer User Stories
=====================

.. story:: Project & Event Explorer
   :id: US_EXP_SIDEBAR
   :status: implemented
   :priority: mandatory
   :links: US_MSG_CHATQUEUE

   **As a** Jarvis User,
   **I want** a dedicated sidebar in VS Code that lists my projects, events, and messages in three separate groups,
   **so that** I can quickly see and navigate to my active projects and upcoming events without leaving the editor.

   **Acceptance Criteria:**

   * AC-1: A "Jarvis" icon appears in the VS Code Activity Bar
   * AC-2: Clicking the icon opens a sidebar panel
   * AC-3: The sidebar contains three collapsible sections: "Projects", "Events",
     and "Messages"
   * AC-4: Each section displays items hierarchically. A folder containing a convention
     file (``project.yaml`` or ``event.yaml``) is a leaf node representing that item.
     Folders without a convention file are grouping nodes (collapsible). Grouping folders
     are shown recursively; empty grouping folders (no descendants) are omitted.


.. story:: Project Folder Filter
   :id: US_EXP_PROJECTFILTER
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


.. story:: Future Event Filter
   :id: US_EXP_EVENTFILTER
   :status: implemented
   :priority: optional
   :links: US_EXP_SIDEBAR

   **As a** Jarvis User,
   **I want** to toggle a filter in the Events explorer that shows only upcoming events,
   **so that** I can focus on what's ahead without past events cluttering the view.

   **Acceptance Criteria:**

   * AC-1: A filter icon in the Events title bar toggles the future-only filter on/off with a single click
   * AC-2: When active, only events whose end date (``dates.end``) is on or after today are shown
   * AC-3: Events without a parseable end date are shown regardless of filter state (fail-open)
   * AC-4: When the filter is active, the icon visually indicates the active state
   * AC-5: The filter state persists across VS Code restarts (workspaceState)
   * AC-6: When the future-only filter hides all events within a grouping folder
     (and its sub-folders), that folder node SHALL also be hidden (empty-branch pruning)


.. story:: Open YAML from Tree Item
   :id: US_EXP_OPENYAML
   :status: implemented
   :priority: optional

   **As a** Jarvis User,
   **I want** to open the YAML file of a project or event directly from the tree view,
   **so that** I can quickly view or edit the raw data in the VS Code editor.

   **Acceptance Criteria:**

   * AC-1: Each project leaf item shows an inline action button (go-to-file icon) on hover
   * AC-2: Each event leaf item shows an inline action button (go-to-file icon) on hover
   * AC-3: Clicking the button opens the associated YAML file in the VS Code editor
   * AC-4: Clicking on the tree item label itself does nothing (``TreeItem.command`` stays
     empty, reserved for a future detail view)
   * AC-5: Folder nodes do not have this button


.. story:: Create New Project or Event
   :id: US_EXP_NEWENTITY
   :status: implemented
   :priority: optional
   :links: US_EXP_SIDEBAR; US_EXP_AGENTSESSION; US_CFG_PROJECTPATH

   **As a** Jarvis User,
   **I want** to create a new project or event directly from a ``+`` button in the
   explorer title bar,
   **so that** I can quickly scaffold a new entity folder, see it immediately in the
   sidebar, and start working in its agent session.

   **Acceptance Criteria:**

   * AC-1: A ``+`` icon (``$(add)``) in the Projects title bar triggers
     ``Jarvis: New Project`` — prompts for a project name, creates
     ``<kebab-name>/project.yaml`` in ``jarvis.projectsFolder``, triggers a scanner
     refresh, and opens the agent session
   * AC-2: A ``+`` icon (``$(add)``) in the Events title bar triggers
     ``Jarvis: New Event`` — prompts for an event name and a start date
     (``YYYY-MM-DD``), creates ``<yyyy-MM-dd-kebab-name>/event.yaml`` in
     ``jarvis.eventsFolder``, triggers a scanner refresh, and opens the agent session
   * AC-3: The convention YAML file is pre-populated with a minimal template
     (``name`` field, plus ``dates`` for events with start = end = input date)
   * AC-4: If the user cancels any input prompt, the command aborts without side effects
   * AC-5: The scanner refresh is immediate — the new entity appears in the sidebar
     without waiting for the next scan interval
   * AC-6: The commands SHALL NOT appear in the Command Palette (they are only
     reachable via the title bar icons)
