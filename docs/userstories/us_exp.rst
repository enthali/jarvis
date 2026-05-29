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
   :status: draft
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
     ``<raw-name>/project.yaml`` in ``jarvis.projectsFolder`` (verbatim folder
     name, no slug transformation), triggers a scanner refresh, and opens the
     agent session
   * AC-2: A ``+`` icon (``$(add)``) in the Events title bar triggers
     ``Jarvis: New Event`` — prompts for an event name and a start date
     (``YYYY-MM-DD``), creates ``<yyyy-MM-dd>_<raw-name>/event.yaml`` in
     ``jarvis.eventsFolder`` (underscore separator, raw name verbatim), triggers
     a scanner refresh, and opens the agent session
   * AC-3: The convention YAML file is pre-populated with a minimal template
     (``name`` field, plus ``dates`` for events with start = end = input date)
   * AC-4: If the user cancels any input prompt, the command aborts without side effects
   * AC-5: The scanner refresh is immediate — the new entity appears in the sidebar
     without waiting for the next scan interval
   * AC-6: The commands SHALL NOT appear in the Command Palette (they are only
     reachable via the title bar icons)
   * AC-7: Invalid entity names (filesystem-illegal characters, dot-only names,
     Windows reserved device names) SHALL be rejected via ``validateInput``
     inline feedback — same rules as session creation.


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


.. story:: List Projects (LM Tool)
   :id: US_EXP_LISTPROJECTS
   :status: implemented
   :priority: optional
   :links: US_EXP_SIDEBAR; US_MSG_MCPSERVER

   **As a** LLM agent working in a Jarvis workspace,
   **I want** a tool that lists all projects with their name and folder path,
   **so that** I can discover available projects programmatically and use the
   information in automation workflows.

   **Acceptance Criteria:**

   * AC-1: A Language Model Tool ``jarvis_listProjects`` is available in the
     Chat tool picker
   * AC-2: The tool returns a list of projects, each with ``name`` (from YAML)
     and ``folder`` (relative path from the configured projects folder)
   * AC-3: The tool requires no input parameters
   * AC-4: The tool is also available via the MCP server (dual registration)


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


.. story:: Context Actions on Project and Event Nodes
   :id: US_EXP_CONTEXTACTIONS
   :status: approved
   :priority: optional
   :links: US_EXP_SIDEBAR

   **As a** Jarvis User,
   **I want** context menu actions on project and event tree nodes,
   **so that** I can quickly navigate to the entity folder in the editor,
   OS file manager, or an integrated terminal.

   **Acceptance Criteria:**

   * AC-1: Right-clicking a project or event node shows "Reveal in Explorer",
     "Reveal in File Explorer", and "Open in Terminal" actions
   * AC-2: Each action delegates to the corresponding built-in VS Code command
   * AC-3: No custom file-system logic is needed — all three actions use VS Code
     built-in commands


.. story:: Chronological Event Sorting
   :id: US_EVT_DATESORT
   :status: approved
   :priority: optional
   :links: US_EXP_SIDEBAR

   **As a** Jarvis User,
   **I want** events displayed in chronological order with their start date visible,
   **so that** I can quickly find upcoming events without scanning unordered names.

   **Acceptance Criteria:**

   * AC-1: Events are sorted by ``dates.start`` in ascending order
   * AC-2: The event label shows the start date as a prefix (e.g. ``2025-06-24 — Event Name``)
   * AC-3: Events without a start date appear at the end of the list


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


.. story:: Open Context File from Tree Node
   :id: US_EXP_OPENCONTEXT
   :status: draft
   :priority: optional
   :links: US_EXP_SIDEBAR; US_EXP_OPENYAML; US_EXP_AGENTSESSION

   **As a** Jarvis User,
   **I want** to open the ``context.md`` file for a project or event directly
   from its tree node in the Jarvis Explorer,
   **so that** I can quickly view or edit the context documentation for that
   item without manually navigating the file system.

   **Acceptance Criteria:**

   * AC-1: Every project and event leaf node shows an inline action button
     (notebook icon) to open the ``context.md`` file for that item
   * AC-2: Clicking the button opens the ``context.md`` file from the entity's
     folder in the VS Code editor
   * AC-3: If no ``context.md`` exists directly in the folder, the button
     searches one level deep in subfolders (hidden folders excluded)
   * AC-4: If exactly one ``context.md`` is found in subfolders, it is opened
     directly without prompting
   * AC-5: If multiple ``context.md`` files are found, a QuickPick picker
     lets the user choose which one to open
   * AC-6: If no ``context.md`` is found anywhere, an information message is
     shown instead of attempting to open a non-existent file
   * AC-7: Folder nodes do not show the button


.. story:: Disciplined & Configurable Agent-Session Init Prompt
   :id: US_EXP_AGENTSESSION_PROMPT
   :status: draft
   :priority: optional
   :links: US_EXP_AGENTSESSION

   **As a** Jarvis User,
   **I want** the agent-session initialization prompt to enforce disciplined
   ``context.md`` authoring and to be overridable in VS Code settings,
   **so that** agent sessions maintain a lean, action-oriented persistent memory
   instead of growing into an unbounded log, and advanced users can adapt the
   prompt to their conventions.

   **Acceptance Criteria:**

   * AC-1: The default prompt enforces a Decision / Finding / Next structure with
     one concise line per bullet, aggressive pruning, and no append-only logs,
     raw tool output, or transient chatter.
   * AC-2: The default prompt includes a "Will this still matter in 2 weeks?" gate
     before writing to ``context.md``.
   * AC-3: A VS Code setting ``jarvis.agentSession.initPromptTemplate`` (string)
     lets the user replace the default prompt with a custom template.
   * AC-4: The template supports three placeholders: ``${kind}``, ``${name}``, and
     ``${contextPath}``; these are substituted at session-open time.
   * AC-5: The configured prompt is sent on both ``jarvis.openAgentSession`` and
     ``jarvis.newSession``.
   * AC-6: The configured prompt is also sent when ``jarvis.sendMessages`` or the
     auto-delivery poll loop opens a **new** session (no matching UUID found) and
     the destination name matches a known project, event, or session entity in the
     scanner store; both paths use the same template and placeholder substitution
     as AC-4. If no entity matches the destination name, the init prompt is skipped
     and the new session receives only the notification stub.
   * AC-7: When a session is opened via tree-click, ``jarvis.sendMessages``, or
     the auto-delivery poll loop and the entity has a bound ``agent`` field, the
     session SHALL open in that agent mode — regardless of the user's currently
     active VS Code Chat mode setting at the time of opening. Mode is applied at
     session birth, not via post-creation switching.


.. story:: List Events (LM Tool)
   :id: US_EXP_LISTEVENTS
   :status: draft
   :priority: optional
   :links: US_EXP_SIDEBAR; US_MSG_MCPSERVER

   **As a** LLM agent working in a Jarvis workspace,
   **I want** a tool that lists all events with their name, dates, and folder path,
   **so that** I can discover available events programmatically and use the
   information in automation workflows.

   **Acceptance Criteria:**

   * AC-1: A Language Model Tool ``jarvis_listEvents`` is available in the
     Chat tool picker
   * AC-2: The tool returns a list of events, each with ``name`` (from YAML),
     ``summary`` (from YAML, may be empty), ``agent`` (from YAML, may be empty),
     ``datesStart``, ``datesEnd``, and ``folder`` (relative path from the
     configured events folder)
   * AC-3: The tool requires no input parameters
   * AC-4: The tool is also available via the MCP server (dual registration)


.. story:: Programmatic Project Creation Tool
   :id: US_EXP_CREATEPROJECT
   :status: draft
   :priority: optional
   :links: US_EXP_NEWENTITY; US_MSG_MCPSERVER

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
     ``jarvis_createSession``.
   * AC-6: An optional ``agent`` parameter is validated against available agents
     before any filesystem operation.


.. story:: Programmatic Event Creation Tool
   :id: US_EXP_CREATEEVENT
   :status: draft
   :priority: optional
   :links: US_EXP_NEWENTITY; US_MSG_MCPSERVER

   **As an** LLM operating within an active Jarvis session,
   **I want** a tool ``jarvis_createEvent`` that programmatically creates a
   new event folder with ``event.yaml`` and ``context.md``,
   **so that** I can orchestrate event planning workflows without requiring
   the human to click through the Explorer UI.

   **Acceptance Criteria:**

   * AC-1: The tool ``jarvis_createEvent`` is registered via LM and MCP.
   * AC-2: A successful call creates ``<eventsFolder>/<date>_<name>/``,
     ``event.yaml`` (with ``name``, ``summary``, ``dates``, and optionally
     ``agent``), and an empty ``context.md``.
   * AC-3: The Events Tree reflects the new event within 2 seconds of
     creation, without any manual rescan.
   * AC-4: Required parameters: ``name``, ``startDate`` (YYYY-MM-DD).
     Optional: ``endDate`` (defaults to ``startDate``), ``summary``, ``agent``.
   * AC-5: If an event folder with the derived name already exists, the tool
     returns ``created: false``.
   * AC-6: Invalid names or dates result in an error.


.. story:: Entity Feature Parity (Projects & Events)
   :id: US_EXP_ENTITYPARITY
   :status: draft
   :priority: required
   :links: US_EXP_SIDEBAR; US_SES_AGENTBIND; US_SES_TREECLICK; US_EXP_AGENTSESSION

   **As a** Jarvis User,
   **I want** Projects and Events to have the same feature-set as Sessions —
   agent binding, tree-click-to-chat, and uniform inline icons —
   **so that** every entity type behaves consistently and I do not have to
   remember different interaction patterns for different entity kinds.

   **Acceptance Criteria:**

   * AC-1: Project and Event schemas declare ``agent`` as **required**.
     The scanner is fail-open: YAMLs missing ``agent`` still load, but the
     entity is flagged internally as **unbound**. A warning log line is
     emitted at scan time.
   * AC-2: Event schema makes ``summary`` required. Existing events without
     ``summary`` get a validation warning in editors but still load at runtime.
   * AC-3: Tree-click on a project or event leaf node opens the agent-chat
     editor (same as session tree-click). The existing ``$(go-to-file)``
     button remains for opening the YAML.
   * AC-4: All three entity types show uniform inline icons:
     ``$(go-to-file)`` for YAML, ``$(notebook)`` for context.md,
     ``$(record)`` for recording folder (if present).
   * AC-5: ``jarvis.openAgentSession`` respects the ``agent`` field on
     project/event entities (same behavior as sessions: if agent is set, open
     in that mode).
   * AC-6: The YAML scanner reads ``agent`` from ``project.yaml`` and
     ``event.yaml`` — same pattern as ``session.yaml``.
   * AC-7: Tree-click on an **unbound** entity (project, event, or session)
     opens the agent-picker first. The user selects an agent, the ``agent``
     field is written into the YAML, then the normal open-flow proceeds.
     Cancel aborts — no YAML mutation.
   * AC-8: ``jarvis.newProject`` and ``jarvis.newEvent`` invoke the
     agent-picker after the name/date prompts — same shared picker component
     as ``jarvis.newSession``.
