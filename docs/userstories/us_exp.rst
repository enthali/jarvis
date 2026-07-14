Explorer User Stories
=====================

.. story:: Unified Jarvis Entities Explorer
   :id: US_EXP_SIDEBAR
   :status: implemented
   :priority: mandatory
   :links: US_MSG_CHATQUEUE; US_ACT_ACTORS; REQ_EXP_UNIFIEDTREE

   **As a** Jarvis User,
   **I want** a dedicated sidebar in VS Code that lists my actors, projects, events,
   messages, and heartbeat jobs,
   **so that** I can quickly see and navigate to my active entities, queued messages,
   and scheduled automation jobs without leaving the editor.

   **Acceptance Criteria:**

   * AC-1: A "Jarvis" icon appears in the VS Code Activity Bar
   * AC-2: Clicking the icon opens a sidebar panel
   * AC-3: (unified-entity-tree CR) The sidebar contains three collapsible sections:
     a single unified "Jarvis Entities" tree (Actors, Projects, and Events merged —
     see AC-5), Messages, and Heartbeat. Visibility rules for the optional Messages/
     Heartbeat views are governed by ``US_EXP_FEATURETOGGLE``. Previously (before this
     CR) Actors, Projects, and Events were three separate top-level sections; this AC
     supersedes that arrangement.
   * AC-4: Each section displays items hierarchically. A folder containing a convention
     file (e.g. ``project.yaml``, ``event.yaml``, ``session.yaml``/``actor.yaml``) is a
     leaf node representing that item. Folders without a convention file are grouping
     nodes (collapsible). Grouping folders are shown recursively; empty grouping folders
     (no descendants) are omitted.
   * AC-5: (unified-entity-tree CR, amended) Within the "Jarvis Entities"
     section, entity kinds (Actors/Projects/Events) are always grouped under a
     category node bearing the kind's plural name — regardless of how many
     kinds are registered. ~~Earlier draft: flattened when ≤1 kind present~~
     — superseded by PM decision (categories always on). See
     ``REQ_EXP_UNIFIEDTREE`` for the precise rule.


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
   :links: US_EXP_SIDEBAR; REQ_EXP_SEARCHENTITIES

   **As a** Jarvis User with many entities (20+),
   **I want** to quickly find and focus an element in the unified Jarvis Entities tree
   via a QuickPick — similar to "Go to Symbol" in VS Code —
   **so that** I can navigate to a specific item instantly without scrolling through
   a long list, regardless of whether it's an Actor, Project, or Event.

   **Acceptance Criteria:**

   * AC-1: (unified-entity-tree CR) A single search icon (``$(search)``) appears in the
     "Jarvis Entities" tree title bar. Previously (before this CR) separate search icons
     existed on the Projects and Events title bars only (no Actor search existed); this
     AC supersedes that arrangement — see ``REQ_EXP_SEARCHENTITIES``.
   * AC-2: Clicking the icon opens a QuickPick that lists all items across all
     registered entity kinds (Actors, Projects, Events alike)
   * AC-3: Typing in the QuickPick filters the list in real time (fuzzy match,
     identical behaviour to the VS Code Command Palette)
   * AC-4: Selecting an item closes the QuickPick and reveals and focuses that
     item in the tree (scroll + highlight), expanding its category node first if
     the tree is currently in grouped (non-flattened) mode
   * AC-5: Pressing Escape dismisses the QuickPick without any side effects


