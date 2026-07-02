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
   * AC-3: The sidebar contains four collapsible sections: Projects (always visible),
     Events, Messages, and Heartbeat. Visibility rules for optional views are governed
     by ``US_EXP_FEATURETOGGLE``.
   * AC-4: Each section displays items hierarchically. A folder containing a convention
     file (``project.yaml`` or ``event.yaml``) is a leaf node representing that item.
     Folders without a convention file are grouping nodes (collapsible). Grouping folders
     are shown recursively; empty grouping folders (no descendants) are omitted.


.. story:: Feature-Toggled Sidebar Views
   :id: US_EXP_FEATURETOGGLE
   :status: approved
   :priority: mandatory
   :links: US_EXP_SIDEBAR; US_CFG_PROJECTPATH; US_CFG_HEARTBEAT; US_CFG_MSG

   **As a** Jarvis User,
   **I want** optional sidebar views (Events, Messages, Heartbeat) to appear only
   when their feature is configured,
   **so that** the Jarvis Explorer stays clean and doesn't show empty views for
   features I don't use.

   **Acceptance Criteria:**

   * AC-1: The Projects view is always visible (core feature)
   * AC-2: The Events view appears only when ``jarvis.eventsFolder`` is set to a
     non-empty value
   * AC-3: The Messages view appears only when ``jarvis.messagesFile`` is non-empty
   * AC-4: The Heartbeat view appears only when ``jarvis.heartbeatConfigFile`` is
     non-empty
   * AC-5: When the extension activates for the first time (no prior configuration),
     the Messages and Heartbeat views appear automatically — the user does not need
     to manually configure a path to make them visible


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


.. story:: Tree Quick Search
   :id: US_EXP_TREESEARCH
   :status: implemented
   :priority: optional
   :links: US_EXP_SIDEBAR

   **As a** Jarvis User with many projects or events (20+),
   **I want** to quickly find and focus an element in the Projects or Events tree
   via a QuickPick — similar to "Go to Symbol" in VS Code —
   **so that** I can navigate to a specific item instantly without scrolling through
   a long list.

   **Acceptance Criteria:**

   * AC-1: A search icon (``$(search)``) appears in the Projects tree title bar
   * AC-2: A search icon (``$(search)``) appears in the Events tree title bar
   * AC-3: Clicking the icon opens a QuickPick that lists all items from that tree
   * AC-4: Typing in the QuickPick filters the list in real time (fuzzy match,
     identical behaviour to the VS Code Command Palette)
   * AC-5: Selecting an item closes the QuickPick and reveals and focuses that
     item in the tree (scroll + highlight)
   * AC-6: Pressing Escape dismisses the QuickPick without any side effects


