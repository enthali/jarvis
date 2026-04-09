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
   The extension SHALL provide three tree views inside the Jarvis sidebar:
   "Projects", "Events", and "Messages". The Projects and Events tree views
   display items hierarchically reflecting the folder structure on disk. The
   Messages tree view displays queued messages grouped by target session.

   **Acceptance Criteria:**

   * AC-1: The sidebar contains a "Projects" tree view
   * AC-2: The sidebar contains an "Events" tree view
   * AC-3: Both Projects and Events tree views are collapsible sections
   * AC-4: Subfolders within projectsFolder/eventsFolder appear as collapsible folder nodes
     labeled with the folder name
   * AC-5: Folder nodes can be nested to any depth
   * AC-6: YAML files are leaf items under their parent folder node
   * AC-7: The sidebar contains a "Messages" tree view
   * AC-8: When the message queue is empty, the Messages tree view SHALL display a
     single node with label ``nothing to deliver``


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
   :links: US_EXP_SIDEBAR

   **Description:**
   The tree views SHALL load project and event data from YAML files in the
   configured folder paths, representing subfolders as folder nodes.
   Invalid or unreadable files SHALL be skipped silently.

   **Acceptance Criteria:**

   * AC-1: Subfolders in ``jarvis.projectsFolder`` are represented as collapsible folder nodes;
     YAML files within them appear as named leaf items beneath their parent folder node
   * AC-2: Same behaviour applies for ``jarvis.eventsFolder``
   * AC-3: The ``name`` field value is used as the tree item label
   * AC-4: Files that cannot be parsed or are missing the ``name`` field are skipped without crashing
   * AC-5: For event YAML files, the ``dates.end`` field SHALL be extracted and stored as
     ``EntityEntry.datesEnd`` (string ``YYYY-MM-DD``); if absent or not a string, this field is ``undefined``


.. req:: Background Cache with Reactive Tree Update
   :id: REQ_EXP_REACTIVECACHE
   :status: implemented
   :priority: mandatory
   :links: US_EXP_SIDEBAR

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


.. req:: Project Folder Filter
   :id: REQ_EXP_PROJECTFILTER
   :status: implemented
   :priority: optional
   :links: US_EXP_PROJECTFILTER

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
   :links: US_EXP_EVENTFILTER

   **Description:**
   The Events tree view SHALL provide a toggle button that, when active,
   shows only events not yet fully in the past.

   **Acceptance Criteria:**

   * AC-1: A filter icon in the Events title bar triggers the command ``jarvis.filterFutureEvents``
   * AC-2: The command toggles the future-only filter on and off (single click)
   * AC-3: When active, events whose ``datesEnd`` is strictly before today are hidden
   * AC-4: Events with no parseable ``datesEnd`` are always shown (fail-open)
   * AC-5: The icon changes visually when the filter is active (``filter`` vs ``filter-filled``)


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
