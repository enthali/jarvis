Explorer Requirements
=====================

.. req:: Activity Bar Registration
   :id: REQ_EXP_ACTIVITYBAR
   :status: implemented
   :priority: mandatory
   :links: US_EXP_SIDEBAR

   **Description:**
   The extension SHALL register a view container in the VS Code Activity Bar
   with a unique icon and the label "Jarvis".

   **Acceptance Criteria:**

   * AC-1: A dedicated icon is visible in the Activity Bar when the extension is installed
   * AC-2: The tooltip shows "Jarvis"


.. req:: Project and Event Tree Views
   :id: REQ_EXP_TREEVIEW
   :status: implemented
   :priority: mandatory
   :links: US_EXP_SIDEBAR

   **Description:**
   The extension SHALL provide tree views inside the Jarvis sidebar:
   "Projects", "Events", "Messages", "Heartbeat", and "Categories". The
   Projects and Events tree views display items hierarchically reflecting
   the folder structure on disk. The Messages tree view displays queued
   messages grouped by target session. The Categories view displays
   Outlook categories (see ``REQ_PIM_CATVIEW``).

   **Acceptance Criteria:**

   * AC-1: The sidebar contains a "Projects" tree view (always visible)
   * AC-2: The sidebar contains an "Events" tree view (visible when configured)
   * AC-3: Both Projects and Events tree views are collapsible sections
   * AC-4: Subfolders that do **not** contain the applicable convention file appear as
     collapsible grouping nodes labeled with the folder name
   * AC-5: Folder nodes can be nested to any depth
   * AC-6: A folder containing the applicable convention file (``project.yaml`` or
     ``event.yaml``) is a leaf item labeled with the entity ``name``; no further descent
     into that folder occurs
   * AC-7: The sidebar contains a "Messages" tree view
   * AC-8: When the message queue is empty, the Messages tree view SHALL display a
     single node with label ``nothing to deliver``
   * AC-9: Grouping nodes with no descendant leaf items SHALL be omitted from the tree
   * AC-10: The sidebar contains a "Categories" tree view (visible when
     categories are enabled — see ``REQ_PIM_CATVIEW`` for visibility rules)


.. req:: Static Dummy Data
   :id: REQ_EXP_DUMMYDATA
   :status: deprecated
   :priority: mandatory
   :links: US_EXP_SIDEBAR

   **Description:**
   For the initial version, the tree views SHALL be populated with
   hardcoded dummy data. The Projects view SHALL show at least 3 items,
   the Events view SHALL show at least 2 items. Item names SHALL follow
   the existing naming patterns ("Project: ..." and "Event: ...").

   **Acceptance Criteria:**

   * AC-1: Projects view shows at least 3 hardcoded project entries
   * AC-2: Events view shows at least 2 hardcoded event entries
   * AC-3: Project names follow "Project: <name>" pattern
   * AC-4: Event names follow "Event: <name>" pattern


.. req:: YAML-based Project and Event Data
   :id: REQ_EXP_YAMLDATA
   :status: implemented
   :priority: mandatory
   :links: US_EXP_SIDEBAR; REQ_EXP_TREEVIEW

   **Description:**
   The tree views SHALL load project and event data from YAML files in the
   configured folder paths, representing subfolders as folder nodes.
   Invalid or unreadable files SHALL be skipped silently.

   **Acceptance Criteria:**

   * AC-1: Subfolders in ``jarvis.projectsFolder`` are scanned recursively. A folder containing
     a ``project.yaml`` file is a leaf node (the project); folders without it are grouping
     nodes. Only ``project.yaml`` is read — other YAML files in the same folder are ignored.
   * AC-2: Same behaviour applies for ``jarvis.eventsFolder`` using ``event.yaml`` as the
     convention file.
   * AC-3: The ``name`` field value is used as the tree item label
   * AC-4: If a convention file is present but cannot be parsed or is missing the ``name``
     field, the folder SHALL still appear as a leaf node with the folder name as the label
   * AC-5: For event YAML files, the ``dates.end`` field SHALL be extracted and stored as
     ``EntityEntry.datesEnd`` (string ``YYYY-MM-DD``); if absent or not a string, this field is ``undefined``


.. req:: Background Cache with Reactive Tree Update
   :id: REQ_EXP_REACTIVECACHE
   :status: implemented
   :priority: mandatory
   :links: US_EXP_SIDEBAR; REQ_CFG_SCANINTERVAL

   **Description:**
   A background scanner SHALL maintain an in-memory cache and update the tree view
   reactively via `onDidChangeTreeData`. The scanner SHALL only run while the
   tree view is visible.

   **Acceptance Criteria:**

   * AC-1: The UI thread never performs file I/O — all reads happen in the background scanner
   * AC-2: The scanner starts when the tree view becomes visible and pauses when hidden
   * AC-3: The scanner runs at the interval defined by `jarvis.scanInterval`
   * AC-4: After each scan, the result is compared to the current cache — `onDidChangeTreeData`
     is fired only if the cache actually changed
   * AC-5: On first scan the cache is empty and the tree shows nothing; after the first scan
     completes the cache is populated and the event is fired
   * AC-6: The scanner SHALL expose a public method to trigger an immediate rescan
     outside the timer cycle
   * AC-7: The change comparison SHALL include entity data (name, datesEnd), not only
     tree structure — editing a YAML field without adding or removing folders SHALL
     trigger a cache update


.. req:: Project Folder Filter
   :id: REQ_EXP_PROJECTFILTER
   :status: implemented
   :priority: optional
   :links: US_EXP_PROJECTFILTER; REQ_EXP_FILTERPERSIST

   **Description:**
   The Projects tree view SHALL provide a filter mechanism to show/hide
   individual folders via a QuickPick dialog.

   **Acceptance Criteria:**

   * AC-1: A filter icon in the Projects title bar triggers the command ``jarvis.filterProjectFolders``
   * AC-2: The command shows a QuickPick with ``canPickMany: true``, one entry per existing root-level folder
   * AC-3: Pre-selected = visible, deselected = hidden
   * AC-4: After confirmation the tree updates immediately
   * AC-5: The icon changes visually when a filter is active (``filter`` vs ``filter-filled``)


.. req:: Filter Persistence
   :id: REQ_EXP_FILTERPERSIST
   :status: implemented
   :priority: optional
   :links: US_EXP_PROJECTFILTER

   **Description:**
   The folder filter selection SHALL be persisted in ``workspaceState``
   and restored on extension activation.

   **Acceptance Criteria:**

   * AC-1: The list of hidden folders is stored in ``workspaceState``
   * AC-2: On extension start the saved filter is applied
   * AC-3: On save only existing folders are persisted — stale entries are implicitly discarded


.. req:: Future Event Filter
   :id: REQ_EXP_EVENTFILTER
   :status: implemented
   :priority: optional
   :links: US_EXP_EVENTFILTER; REQ_EXP_TREEVIEW; REQ_EXP_EVENTFILTERPERSIST

   **Description:**
   The Events tree view SHALL provide a toggle button that, when active,
   shows only events not yet fully in the past.

   **Acceptance Criteria:**

   * AC-1: A filter icon in the Events title bar triggers the command ``jarvis.filterFutureEvents``
   * AC-2: The command toggles the future-only filter on and off (single click)
   * AC-3: When active, events whose ``datesEnd`` is strictly before today are hidden
   * AC-4: Events with no parseable ``datesEnd`` are always shown (fail-open)
   * AC-5: The icon changes visually when the filter is active (``filter`` vs ``filter-filled``)
   * AC-6: When the future-only filter is active, grouping nodes whose **every** descendant
     leaf is hidden SHALL themselves be hidden (empty-branch pruning)


.. req:: Event Filter Persistence
   :id: REQ_EXP_EVENTFILTERPERSIST
   :status: implemented
   :priority: optional
   :links: US_EXP_EVENTFILTER

   **Description:**
   The future-event filter toggle state SHALL be persisted in ``workspaceState``
   and restored on extension activation.

   **Acceptance Criteria:**

   * AC-1: Filter state is stored under key ``jarvis.eventFutureFilter`` (boolean)
   * AC-2: On extension start, the saved state is applied to the EventTreeProvider


.. req:: Open YAML from Tree Item
   :id: REQ_EXP_OPENYAML
   :status: implemented
   :priority: optional
   :links: US_EXP_OPENYAML

   **Description:**
   Project and event leaf items SHALL provide an inline action button that
   opens the associated YAML file in the VS Code editor.

   **Acceptance Criteria:**

   * AC-1: Project leaf items have ``contextValue = 'project'``;
     event leaf items have ``contextValue = 'event'`` (already the case)
   * AC-2: A ``view/item/context`` menu entry with ``when: viewItem == project``
     and a second entry with ``when: viewItem == event`` provide an inline
     ``$(go-to-file)`` button in group ``inline``
   * AC-3: The command opens the file via ``vscode.commands.executeCommand('vscode.open', uri)``
     where ``uri = vscode.Uri.file(element.id)``
   * AC-4: ``TreeItem.command`` is NOT set on leaf items (reserved for future detail view)
   * AC-5: Folder nodes (``contextValue = 'folder'``) have no inline button


.. req:: Open Agent Session from Tree
   :id: REQ_EXP_AGENTSESSION
   :status: implemented
   :priority: optional
   :links: US_EXP_AGENTSESSION; REQ_MSG_SESSIONLOOKUP; REQ_EXP_OPENYAML

   **Description:**
   Every project and event leaf item SHALL provide an inline action button that
   opens the agent chat session for that item.

   **Acceptance Criteria:**

   * AC-1: All project and event leaf items SHALL display an inline
     ``$(comment-discussion)`` button in addition to the existing
     ``$(go-to-file)`` button
   * AC-2: Clicking the button SHALL resolve the session UUID by passing the
     entity ``name`` to ``REQ_MSG_SESSIONLOOKUP`` and open the session via
     ``vscode.open(Uri.parse('vscode-chat-session://local/<b64uuid>'))``
   * AC-3: If no session matching the entity name exists in ``state.vscdb``,
     a new editor chat SHALL be opened via
     ``vscode-chat-session://local/new`` and an initialization prompt SHALL be
     submitted via ``workbench.action.chat.open({ query })`` containing the
     entity name, instructing the agent to work in the context of that
     project/event and asking the user to rename the session to match
   * AC-4: Folder nodes SHALL NOT display the button
   * AC-5: The command SHALL NOT appear in the Command Palette (it requires a
     tree element argument and would fail without one)


.. req:: New Project Command
   :id: REQ_EXP_NEWPROJECT
   :status: implemented
   :priority: optional
   :links: US_EXP_NEWENTITY; REQ_EXP_REACTIVECACHE; REQ_EXP_AGENTSESSION; REQ_EXP_YAMLDATA; REQ_CFG_FOLDERPATHS

   **Description:**
   A command triggered by a ``+`` icon in the Projects title bar SHALL create
   a new project folder with a convention file and immediately refresh the scanner.

   **Acceptance Criteria:**

   * AC-1: A ``$(add)`` icon in the Projects view title bar triggers the command
     ``jarvis.newProject``
   * AC-2: The command shows an InputBox prompting for the project name
   * AC-3: The folder name is derived as kebab-case of the input name (lowercase,
     spaces and special characters replaced by hyphens, consecutive hyphens collapsed)
   * AC-4: The folder ``<kebab-name>/`` is created inside ``jarvis.projectsFolder``
     with ``project.yaml`` containing ``name: "<input>"``
   * AC-5: After file creation, an immediate scanner rescan is triggered
   * AC-6: After the rescan, the agent session for the new entity is opened
     (delegated to ``jarvis.openAgentSession`` logic)
   * AC-7: If the user cancels the InputBox, the command exits without side effects
   * AC-8: The command SHALL NOT appear in the Command Palette
   * AC-9: If a folder with the derived name already exists, the command SHALL
     show an error notification and abort without modifying the file system


.. req:: New Event Command
   :id: REQ_EXP_NEWEVENT
   :status: implemented
   :priority: optional
   :links: US_EXP_NEWENTITY; REQ_EXP_REACTIVECACHE; REQ_EXP_AGENTSESSION; REQ_EXP_YAMLDATA; REQ_CFG_FOLDERPATHS

   **Description:**
   A command triggered by a ``+`` icon in the Events title bar SHALL create
   a new event folder with a convention file and immediately refresh the scanner.

   **Acceptance Criteria:**

   * AC-1: A ``$(add)`` icon in the Events view title bar triggers the command
     ``jarvis.newEvent``
   * AC-2: The command shows an InputBox prompting for the event name
   * AC-3: The command shows a second InputBox prompting for a start date
     (``YYYY-MM-DD``) with validation — if the input does not match the format
     or is not a valid calendar date, the InputBox shows an inline error and
     re-prompts
   * AC-4: The folder name is derived as ``<date>-<kebab-name>``
     (e.g. ``2026-06-10-devcon-2026``)
   * AC-5: The folder is created directly in ``jarvis.eventsFolder``
     (not nested in a year subfolder)
   * AC-6: ``event.yaml`` contains ``name``, ``dates.start``, ``dates.end``
     (start = end = input date)
   * AC-7: After file creation, an immediate scanner rescan is triggered
   * AC-8: After the rescan, the agent session for the new entity is opened
   * AC-9: If the user cancels any InputBox, the command exits without side effects
   * AC-10: The command SHALL NOT appear in the Command Palette
   * AC-11: If a folder with the derived name already exists, the command SHALL
     show an error notification and abort without modifying the file system


.. req:: Rescan Button in Title Bar
   :id: REQ_EXP_RESCAN_BTN
   :status: implemented
   :priority: mandatory
   :links: US_EXP_SCANREFRESH; REQ_EXP_REACTIVECACHE

   **Description:**
   Both the Projects and Events tree views SHALL provide a refresh icon in the
   title bar that triggers an immediate rescan of the YAML scanner.

   **Acceptance Criteria:**

   * AC-1: A ``$(refresh)`` icon is displayed in the Projects view title bar
   * AC-2: A ``$(refresh)`` icon is displayed in the Events view title bar
   * AC-3: Clicking either icon triggers the scanner's ``rescan()`` method
   * AC-4: A single command ``jarvis.rescan`` is shared by both views
   * AC-5: The command SHALL NOT appear in the Command Palette


.. req:: Sort Tree by Entity Name
   :id: REQ_EXP_NAMESORT
   :status: implemented
   :priority: optional
   :links: US_EXP_NAMESORT

   **Description:**
   The scanner SHALL sort tree nodes alphabetically by entity name (for leaf
   nodes) or folder name (for grouping nodes), so that the explorer displays
   items in a predictable, user-friendly order.

   **Acceptance Criteria:**

   * AC-1: Leaf nodes at each level are sorted by their YAML ``name`` field
     (case-insensitive)
   * AC-2: Folder nodes at each level are sorted by folder name (case-insensitive)
   * AC-3: Folders and leaves are interleaved in a single alphabetical list at
     each level (not grouped separately)


.. req:: Chronological Event Sorting
   :id: REQ_EVT_DATESORT
   :status: implemented
   :priority: optional
   :links: US_EVT_DATESORT

   **Description:**
   The Events tree view SHALL sort event leaf nodes by their start date
   (``dates.start``) in ascending order and display the start date as a
   prefix in the tree item label.

   **Acceptance Criteria:**

   * AC-1: Event leaf nodes SHALL be sorted by ``dates.start``
     (``YYYY-MM-DD``, ascending) rather than by entity name
   * AC-2: The event tree item label SHALL be ``<dates.start> — <name>``
     (e.g. ``2026-04-15 — DevCon 2026``)
   * AC-3: If ``dates.start`` is a JavaScript ``Date`` object (unquoted YAML),
     it SHALL be converted to ``YYYY-MM-DD`` via ``toISOString().slice(0, 10)``
   * AC-4: If ``dates.start`` is already a string, it SHALL be used directly
   * AC-5: If ``dates.start`` is absent or not parseable, the event SHALL sort
     by name and display name only (fail-open)
   * AC-6: Grouping folder sort order is unchanged (alphabetical by folder name)


.. req:: List Projects LM Tool
   :id: REQ_EXP_LISTPROJECTS
   :status: implemented
   :priority: optional
   :links: US_EXP_LISTPROJECTS; REQ_EXP_YAMLDATA

   **Description:**
   The extension SHALL register a Language Model Tool that returns the list of
   projects from the configured projects folder, enabling LLM agents and MCP
   clients to discover available projects programmatically.

   **Acceptance Criteria:**

   * AC-1: A Language Model Tool named ``jarvis_listProjects`` SHALL be registered
     via ``registerDualTool()`` with ``canBeReferencedInPrompt: true``
   * AC-2: The tool SHALL accept no input parameters (empty input schema)
   * AC-3: The tool SHALL return an array of objects, each containing ``name``
     (string, from the project YAML ``name`` field) and ``folder`` (string,
     relative path from the configured projects folder to the project directory)
   * AC-4: If no projects exist, the tool SHALL return an empty array
   * AC-5: The tool SHALL be simultaneously available via the MCP server


.. req:: Feature-Toggled Sidebar Views
   :id: REQ_EXP_FEATURETOGGLE
   :status: implemented
   :priority: mandatory
   :links: US_EXP_FEATURETOGGLE; REQ_EXP_TREEVIEW; REQ_CFG_DEFAULTPATHS

   **Description:**
   Optional sidebar views SHALL only be visible when their corresponding feature
   is configured. This prevents empty views from cluttering the Jarvis Explorer.

   **Acceptance Criteria:**

   * AC-1: The Projects view SHALL always be visible (no ``when``-clause)
   * AC-2: The Events view SHALL only be visible when ``jarvis.eventsFolder``
     is set to a non-empty string
   * AC-3: The Messages view SHALL only be visible when ``jarvis.messagesFile``
     is set to a non-empty string
   * AC-4: The Heartbeat view SHALL only be visible when
     ``jarvis.heartbeatConfigFile`` is set to a non-empty string
   * AC-5: Visibility SHALL be controlled via the ``when`` property on the
     view definition in ``package.json`` — no runtime code required
   * AC-6: The Categories view SHALL only be visible when
     ``jarvis.pim.showCategories`` is ``true``


.. req:: Context Actions on Leaf Nodes
   :id: REQ_EXP_CONTEXTACTIONS
   :status: implemented
   :priority: optional
   :links: US_EXP_CONTEXTACTIONS

   **Description:**
   Project and event leaf nodes SHALL provide three context-menu actions that
   delegate to built-in VS Code commands for revealing the entity folder in
   the file explorer, the OS file manager, or an integrated terminal.

   **Acceptance Criteria:**

   * AC-1: Right-clicking a leaf node with ``contextValue`` = ``jarvisProject`` or
     ``jarvisEvent`` SHALL show "Reveal in Explorer", "Reveal in File Explorer",
     and "Open in Terminal" in the context menu
   * AC-2: "Reveal in Explorer" SHALL reveal the entity folder in the VS Code
     file explorer (built-in ``revealInExplorer``)
   * AC-3: "Reveal in File Explorer" SHALL open the entity folder in the OS-native
     file manager (built-in ``revealFileInOS``)
   * AC-4: "Open in Terminal" SHALL open an integrated terminal with the working
     directory set to the entity folder (built-in ``openInTerminal``)
   * AC-5: Folder nodes (``contextValue`` = ``jarvisFolder``) SHALL NOT show
     these actions
   * AC-6: The three commands SHALL NOT appear in the Command Palette (they require
     a tree node argument)


.. req:: Inline Task Nodes in Project/Event Tree
   :id: REQ_EXP_TASKTREE
   :status: implemented
   :priority: mandatory
   :links: US_EXP_SIDEBAR; REQ_PIM_TASKSERVICE; REQ_EXP_TREEVIEW

   **Description:**
   When the tasks feature is active, the project and event tree SHALL display
   task child nodes inline under each project/event leaf, and an "Uncategorized
   Tasks" top-level section SHALL appear before all project nodes.

   **Acceptance Criteria:**

   * AC-1: When ``jarvis.outlookEnabled == true`` AND
     ``jarvis.outlook.tasks.enabled == true``, each project and event leaf node
     SHALL expand to show two child groups: "Open Tasks (n)" and "Completed Tasks
     (m)" (where n/m are item counts)
   * AC-2: "Completed Tasks" groups SHALL be collapsed by default
   * AC-3: An "Uncategorized Tasks (n)" node SHALL appear at the TOP of the
     projects tree (before all project nodes) listing tasks whose ``categories``
     field contains no Jarvis project or event category name
   * AC-4: Task leaf nodes SHALL display label ``<shortDate>  <subject>`` (where
     ``shortDate = yy-MM-dd``, i.e. ``dueDate.slice(2)``) when ``dueDate`` is set,
     otherwise ``<subject>``
   * AC-5: The project/event leaf label SHALL include the open-task count in
     parentheses, e.g. ``My Project (3)``
   * AC-6: Badge encoding on the project/event label:
     ``⚠`` when at least one task is overdue;
     ``(n !)`` when open tasks exist and at least one is due within 5 days;
     ``(n)`` otherwise
   * AC-7: Tree providers SHALL read from ``TaskService`` cache only — no COM
     calls in the tree refresh path
   * AC-8: When ``TaskService`` is unavailable or has no providers, task child
     nodes SHALL be omitted silently (tree looks identical to current state)
