Explorer User Stories
=====================

.. story:: Project & Event Explorer
   :id: US_EXP_SIDEBAR
   :status: implemented
   :priority: mandatory
   :links: US_MSG_CHATQUEUE

   **As a** Jarvis User,
   **I want** a dedicated sidebar in VS Code that lists my projects, events, messages,
   and heartbeat jobs in four separate groups,
   **so that** I can quickly see and navigate to my active projects, upcoming events,
   queued messages, and scheduled automation jobs without leaving the editor.

   **Acceptance Criteria:**

   * AC-1: A "Jarvis" icon appears in the VS Code Activity Bar
   * AC-2: Clicking the icon opens a sidebar panel
   * AC-3: The sidebar contains four collapsible sections: "Projects", "Events",
     "Messages", and "Heartbeat"
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


.. story:: Manual Rescan Button
   :id: US_EXP_SCANREFRESH
   :status: implemented
   :priority: mandatory
   :links: US_EXP_SIDEBAR

   **As a** Jarvis User,
   **I want** a refresh button in the title bar of the Projects and Events tree views,
   **so that** I can trigger an immediate rescan without waiting for the next scan cycle.

   **Acceptance Criteria:**

   * AC-1: A refresh icon (``$(refresh)``) is visible in the Projects title bar
   * AC-2: A refresh icon (``$(refresh)``) is visible in the Events title bar
   * AC-3: Clicking the button triggers an immediate rescan and the tree updates


.. story:: YAML Content Change Detection
   :id: US_EXP_CONTENTDETECT
   :status: implemented
   :priority: mandatory
   :links: US_EXP_SIDEBAR

   **As a** Jarvis User,
   **I want** changes to YAML file content (e.g. renaming a project) to be reflected
   in the sidebar after the next scan,
   **so that** the displayed data stays accurate and I don't see stale names or dates.

   **Acceptance Criteria:**

   * AC-1: After editing a YAML field (e.g. ``name:``) and the next scan runs,
     the sidebar reflects the new value
   * AC-2: Changes to ``dates.end`` in event YAML are detected and the future-event
     filter behaves correctly with the new value


.. story:: Sort Tree by Entity Name
   :id: US_EXP_NAMESORT
   :status: implemented
   :priority: optional
   :links: US_EXP_SIDEBAR

   **As a** Jarvis User,
   **I want** the tree items sorted alphabetically by their YAML entity name
   rather than by folder name,
   **so that** I can find projects and events more easily in the sidebar.

   **Acceptance Criteria:**

   * AC-1: Leaf nodes are sorted by their YAML ``name`` field (case-insensitive)
   * AC-2: Folder (grouping) nodes are sorted by folder name (case-insensitive)
   * AC-3: Folders and leaves are interleaved — all children at a given level are
     sorted together in a single alphabetical list


.. story:: Open Agent Session from Explorer
   :id: US_EXP_AGENTSESSION
   :status: approved
   :priority: optional
   :links: US_EXP_SIDEBAR; US_MSG_OPENSESSION; US_EXP_OPENYAML

   **As a** Jarvis User,
   **I want** to open the dedicated agent chat session for a project or event
   directly from its tree node in the Jarvis Explorer,
   **so that** I can jump straight into the agent conversation for that item
   without searching through chat sessions manually.

   **Acceptance Criteria:**

   * AC-1: Every project and event leaf node shows an inline action button
     (comment-discussion icon) to open the agent session for that item
   * AC-2: Clicking the button looks up a chat session whose title matches the
     project/event ``name`` and opens it in the editor
   * AC-3: If no matching session exists, a new editor chat is opened and an
     initialization prompt is sent that tells the agent which project/event it
     is working on and asks the user to rename the session
   * AC-4: Folder nodes do not show the button
