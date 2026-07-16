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
   * AC-11: Entity leaf nodes (project, event, actor) SHALL themselves be
     expandable (``collapsibleState = Collapsed``) to show file children
     (see ``REQ_ENT_ENTITY_FILE_CHILDREN``). Expandability does not change
     leaf-node identity — AC-6 still applies unmodified.
   * AC-12 (``ui-improvements`` CR): Every Jarvis tree view (Projects,
     Events, Actors, Messages, Reminders, Heartbeat) SHALL show VS Code's
     native "Collapse All" title-bar button (``showCollapseAll: true`` on
     ``createTreeView()``). This is additive UI convenience only — no
     change to tree content, node structure, or click behavior.


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


.. req:: Open heartbeat.yaml at Job Line
   :id: REQ_EXP_HEARTBEAT_OPENFILE
   :status: implemented
   :priority: optional
   :links: US_EXP_OPENFILE

   **Description:**
   Clicking a Heartbeat Job node in the Heartbeat tree view SHALL open
   ``heartbeat.yaml`` in the VS Code editor and reveal the line where that
   job's definition begins.

   **Acceptance Criteria:**

   * AC-1: The command is triggered by clicking the job node (``TreeItem.command``)
   * AC-2: The file opened is the path from ``jarvis.heartbeatConfigFile`` setting
   * AC-3: The revealed line is the first line in the file that contains the job
     name (case-sensitive match against ``name:`` YAML key)
   * AC-4: If the job name is not found in the file, the file opens at line 0
     (start of file, fail-open)
   * AC-5: The file is opened read-write (standard editor, no custom editor)
   * AC-6: If ``jarvis.heartbeatConfigFile`` is empty or the file does not exist,
     the command shows a warning notification and returns without opening a file


.. req:: Open Messages File at Message Position
   :id: REQ_EXP_MESSAGE_OPENFILE
   :status: implemented
   :priority: optional
   :links: US_EXP_OPENFILE

   **Description:**
   Clicking a Message leaf node in the Messages tree view SHALL open the messages
   JSON file in the VS Code editor and reveal the position of that message.

   **Acceptance Criteria:**

   * AC-1: The command is triggered by clicking the message node (``TreeItem.command``)
   * AC-2: The file opened is the path from ``jarvis.messagesFile`` setting
   * AC-3: The revealed position is determined by the message's index in the queue
     (the Nth message entry in the JSON array)
   * AC-4: If the index is out of range or the position cannot be determined, the
     file opens at line 0 (fail-open)
   * AC-5: The file is opened read-write (standard editor, no custom editor)
   * AC-6: If ``jarvis.messagesFile`` is empty or the file does not exist, the
     command shows a warning notification and returns without opening a file


.. req:: Open Reminders File at Reminder Position
   :id: REQ_EXP_REMINDER_OPENFILE
   :status: draft
   :priority: optional
   :links: US_MSG_REMINDERS; US_EXP_OPENFILE

   **Description:**
   Clicking a reminder node in the "Reminders" sidebar view SHALL open
   ``reminders.yaml`` in the VS Code editor and reveal the line of that
   reminder entry.

   **Acceptance Criteria:**

   * AC-1: The command is triggered by clicking the reminder node
     (``TreeItem.command``)
   * AC-2: The file opened is ``reminders.yaml`` resolved by
     ``resolveRemindersPath(messagesPath)``
   * AC-3: The revealed line contains the matching ``id: <uuid>`` entry of
     the clicked reminder
   * AC-4: If the matching id cannot be found, the file opens at line 0
     (fail-open)
   * AC-5: The file is opened read-write (standard editor, no custom editor)
   * AC-6: If ``reminders.yaml`` is missing the command shows a warning
     notification and returns without opening a file


.. req:: Search Projects via QuickPick
   :id: REQ_EXP_SEARCHPROJECTS
   :status: deprecated
   :priority: optional
   :links: US_EXP_TREESEARCH; REQ_EXP_SEARCHENTITIES

   **Description (HISTORICAL — superseded by unified-entity-tree CR):**
   ~~The Projects tree view SHALL provide a search command, triggered by a
   ``$(search)`` icon in its title bar, that opens a QuickPick listing all
   projects. Selecting a project SHALL reveal and focus it in the tree.~~
   The dedicated ``jarvisProjects`` view (and its ``jarvis.searchProjects``
   command) no longer exists as a standalone view — Projects are now one
   entity kind among others inside the unified "Jarvis Entities" tree. See
   ``REQ_EXP_SEARCHENTITIES`` for the current, authoritative requirement.
   Kept here (not deleted) for traceability of the historical acceptance
   criteria below.

   **Acceptance Criteria (historical, no longer authoritative):**

   * AC-1: A ``$(search)`` icon button in the Projects title bar triggers the
     command ``jarvis.searchProjects``
   * AC-2: The QuickPick lists all project leaf items sourced from the in-memory
     scanner cache; the list reflects the current scan result
   * AC-3: Each QuickPick item label is the project ``name`` field; the
     description shows the absolute path of the project's YAML folder (``leaf.id``)
   * AC-4: Selecting an item calls ``TreeView.reveal()`` with
     ``{ select: true, focus: true, expand: true }`` on the corresponding
     ``LeafNode``
   * AC-5: The command SHALL NOT appear in the Command Palette
   * AC-6: If the scanner cache is empty (no projects), the QuickPick opens with
     an empty list — no error is shown
   * AC-7: The QuickPick SHALL apply VS Code's built-in fuzzy filtering on item
     label and description as the user types — no custom filtering code is
     required
   * AC-8: Pressing Escape or clicking outside the QuickPick SHALL dismiss it
     without any side effects on the tree view or scanner state


.. req:: Search Events via QuickPick
   :id: REQ_EXP_SEARCHEVENTS
   :status: deprecated
   :priority: optional
   :links: US_EXP_TREESEARCH; REQ_EXP_SEARCHENTITIES

   **Description (HISTORICAL — superseded by unified-entity-tree CR):**
   ~~The Events tree view SHALL provide a search command, triggered by a
   ``$(search)`` icon in its title bar, that opens a QuickPick listing all
   events. Selecting an event SHALL reveal and focus it in the tree.~~
   The dedicated ``jarvisEvents`` view (and its ``jarvis.searchEvents``
   command) no longer exists as a standalone view — Events are now one
   entity kind among others inside the unified "Jarvis Entities" tree. See
   ``REQ_EXP_SEARCHENTITIES`` for the current, authoritative requirement.
   Kept here (not deleted) for traceability of the historical acceptance
   criteria below.

   **Acceptance Criteria (historical, no longer authoritative):**

   * AC-1: A ``$(search)`` icon button in the Events title bar triggers the
     command ``jarvis.searchEvents``
   * AC-2: The QuickPick lists all event leaf items sourced from the in-memory
     scanner cache; the list reflects the current scan result
   * AC-3: Each QuickPick item label is the event ``name`` field; the
     description shows ``datesStart`` when available, otherwise is empty
   * AC-4: Selecting an item calls ``TreeView.reveal()`` with
     ``{ select: true, focus: true, expand: true }`` on the corresponding
     ``LeafNode``
   * AC-5: The command SHALL NOT appear in the Command Palette
   * AC-6: If the scanner cache is empty (no events), the QuickPick opens with
     an empty list — no error is shown
   * AC-7: The QuickPick SHALL apply VS Code's built-in fuzzy filtering on item
     label and description as the user types — no custom filtering code is
     required
   * AC-8: Pressing Escape or clicking outside the QuickPick SHALL dismiss it
     without any side effects on the tree view or scanner state


.. req:: Unified Entities Tree
   :id: REQ_EXP_UNIFIEDTREE
   :status: approved
   :priority: mandatory
   :links: US_EXP_SIDEBAR; REQ_ACT_TREE; REQ_PRJ_PROJECTFILTER; REQ_EVT_EVENTFILTER

   **Description:**
   A single TreeView ``jarvisEntities`` ("Jarvis Entities") SHALL replace the
   three standalone views ``jarvisActors``, ``jarvisProjects``, and
   ``jarvisEvents``, presenting all registered entity kinds through one
   presentation-layer wrapper. The underlying per-kind scanning and data model
   (``KindDrivenScanner``, ``EntityKindConfig``, ``engine.treeFactory``) is
   unchanged — this requirement is additive at the view-registration layer
   only.

   **Acceptance Criteria:**

   * AC-1: ``jarvisEntities`` SHALL be registered and owned by
     ``packages/core`` (the always-active extension), since core's engine
     already receives Project/Event kind registrations from ``packages/pim``
     via the existing cross-extension ``JarvisCoreApi.registerEntityKind()``
     call — no new cross-package data API is introduced by this requirement.
   * AC-2: ``packages/pim`` SHALL NOT contribute its own ``jarvisProjects``/
     ``jarvisEvents`` views in ``package.json`` and SHALL NOT call
     ``vscode.window.createTreeView()`` for them; it SHALL continue calling
     ``api.registerEntityKind()`` for the ``project`` and ``event`` kinds
     exactly as before.
   * AC-3: A kind SHALL be considered "registered" for category-node purposes
     if ``registerEntityKind`` was called for it (which already reflects each
     kind's own enabled-setting gate). Each registered kind SHALL always be
     represented by a category root node, regardless of whether it currently
     contains entities. ~~(historical: earlier draft had a "present" concept
     requiring at least one entity — superseded by PM decision to always show
     categories)~~
   * AC-4: Each registered kind SHALL be represented by one category root
     node, labelled with the kind's plural display name
     ("Actors"/"Projects"/"Events"), ``contextValue`` of
     ``jarvisEntityCategory:<kind>``, default ``collapsibleState`` of
     ``Expanded``, whose children are exactly that kind's existing root tree
     nodes (unchanged rendering below the category node). If a kind has no
     entities, its category node SHALL be shown with an empty children list
     (collapsed, no expand arrow).
   * AC-5: ~~When at most 1 kind is present, no category node SHALL be
     rendered~~ — **superseded**: category nodes are unconditional (see AC-3/
     AC-4). There is no flattened mode.
   * AC-6: The wrapper provider SHALL forward refresh: firing
     ``onDidChangeTreeData(undefined)`` (whole-tree refresh) whenever any
     wrapped per-kind provider fires its own change event. No partial/subtree
     refresh optimization is required.
   * AC-7: ``package.json`` ``activationEvents`` SHALL include
     ``onView:jarvisEntities`` (replacing ``onView:jarvisActors``,
     ``onView:jarvisProjects``, ``onView:jarvisEvents``).
   * AC-8: The ``jarvisEntities`` view contribution SHALL NOT carry a
     ``when``-clause of its own (it is unconditionally visible, matching
     today's Projects/Actors precedent of no view-level gate) — per-kind
     presence is decided entirely at runtime per AC-3, not via
     ``package.json``. As a consequence, ``packages/pim`` SHALL gate its
     ``registerEntityKind(buildEventKindConfig(...))`` call behind
     ``jarvis.events.enabled`` at runtime (mirroring the existing Actor
     pattern in ``packages/core``), since the view-level ``when``-clause that
     previously gated ``jarvisEvents`` visibility no longer exists. The
     Projects kind registration remains unconditional (Projects has never had
     an enabled-gate).
   * AC-9: Existing per-leaf-node behaviour (labels, tooltips, context values,
     click actions, file-children expansion) SHALL be completely unchanged —
     this requirement only changes what sits *above* each kind's existing
     root nodes in the tree.
   * AC-10: (unified-entity-tree amendment) Per-kind "New" entity actions
     (``jarvis.newActor``, ``jarvis.newProject``, ``jarvis.newEvent``) SHALL
     be triggered via an inline icon (``$(add)``) on their respective
     category node (``contextValue == jarvisEntityCategory:<kind>``), NOT
     from the ``jarvisEntities`` view title bar. Each "New" command SHALL
     also remain reachable via the Command Palette. The view title bar SHALL
     only host the cross-kind search icon (``$(search)``, see
     ``REQ_EXP_SEARCHENTITIES``).
   * AC-11: (unified-entity-tree fix) ``packages/pim/package.json``
     ``activationEvents`` SHALL include ``onView:jarvisEntities`` — replacing
     the removed ``onView:jarvisProjects``/``onView:jarvisEvents`` triggers
     and ensuring PIM activates reliably whenever the unified tree is
     visible. ``onStartupFinished`` is NOT added (PIM activation outside the
     Jarvis sidebar context is unnecessary overhead).
   * AC-12: (unified-entity-tree fix) The unified wrapper provider SHALL
     handle late-arriving kind registrations: when a new kind is added to
     ``GenericTreeFactory`` after the wrapper is already constructed, the
     wrapper SHALL (a) subscribe to the new kind provider's
     ``onDidChangeTreeData`` event and (b) fire a whole-tree refresh
     (``onDidChangeTreeData(undefined)``) so that the new kind's category
     node appears immediately. This avoids a race condition where PIM's
     ``registerEntityKind()`` call executes after core has already
     constructed the ``UnifiedEntityTreeProvider``.
   * AC-13: (bold category labels) Each category node's ``label`` SHALL be
     rendered in **bold**, to visually separate the category level
     ("Actors"/"Projects"/"Events") from the entity nodes underneath. Since
     VS Code's ``TreeItem`` API has no font-weight attribute (and
     ``TreeItemLabel.highlights`` only applies a theme highlight color, not
     bold weight), rendering SHALL be achieved by substituting Unicode
     Mathematical Sans-Serif Bold codepoints for the label's ASCII
     letters/digits (non-alphanumeric characters unchanged) — no other
     visual property of the category ``TreeItem`` changes.
   * AC-14: (dynamic view title) The ``jarvisEntities`` ``TreeView``'s
     ``title`` SHALL be set at activation time to
     ``"${firstWorkspaceFolder.name} Entities"``, using
     ``vscode.workspace.workspaceFolders[0]`` — the same folder
     ``KindDrivenScanner`` scans for ``.jarvis`` — so the title reflects
     which project's entities are shown, at a glance, in multi-project
     setups with per-project themes/windows. If no workspace folder is
     open, the static ``"Jarvis Entities"`` title from ``package.json``
     remains unchanged. The title is set once at activation and is NOT
     re-evaluated on workspace-folder changes (multi-root add/remove is
     out of scope).


.. req:: Live Filter Entities in Tree
   :id: REQ_EXP_SEARCHENTITIES
   :status: approved
   :priority: optional
   :links: US_EXP_TREESEARCH; REQ_EXP_UNIFIEDTREE

   **Description (unified-entity-tree — pivoted from reveal-based search to
   live tree filter):** The unified ``jarvisEntities`` tree view SHALL
   provide a live filter command, triggered by a ``$(search)`` icon in its
   title bar, that opens a QuickPick **input box** (not an item-picker list).
   As the user types, the tree filters in real time to show only matching
   entities (and their ancestor folders/categories), across all registered
   kinds (Actors, Projects, Events). This supersedes
   ``REQ_EXP_SEARCHPROJECTS``/``REQ_EXP_SEARCHEVENTS`` and extends filtering
   to Actors for the first time.

   **Pivot rationale:** the originally specified reveal-based approach
   (QuickPick item list, selecting an item calls ``TreeView.reveal()``) was
   found to be blocked — ``TreeView.reveal()`` requires
   ``TreeDataProvider.getParent()``, which is not implemented by
   ``GenericTreeDataProvider``. Implementing ``getParent()`` was judged a
   larger rework; the team pivoted to a live tree filter instead, which needs
   no ``getParent()`` support since it filters ``getChildren()`` results
   directly rather than revealing a specific node.

   **Scope note:** this requirement covers only the basic live filter that
   has shipped (name/summary substring match, auto-expand, clear-on-close).
   Additional search/filter capabilities (e.g. more match fields, filter
   history, keyboard navigation between matches) are explicitly deferred to
   a separate follow-up CR and are NOT specified here.

   **Acceptance Criteria:**

   * AC-1: A single ``$(search)`` icon button in the ``jarvisEntities`` title
     bar triggers the command ``jarvis.searchEntities`` (replacing
     ``jarvis.searchProjects``/``jarvis.searchEvents``, which are removed).
     The command SHALL NOT appear in the Command Palette.
   * AC-2: Invoking the command SHALL open a ``vscode.QuickPick`` used purely
     as a live text-input box — it SHALL NOT populate ``items`` with an
     entity list. There is no pick-and-select step; filtering happens in the
     ``jarvisEntities`` tree itself, not in the QuickPick.
   * AC-3: On every keystroke (``onDidChangeValue``), the current input value
     (trimmed) SHALL be applied as a search filter to every registered kind's
     provider (Actor, Project, Event alike).
   * AC-4: A leaf entity SHALL match the filter if its ``name`` OR its
     ``summary`` field (case-insensitive substring match) contains the
     trimmed query. An empty query matches everything (no filtering).
   * AC-5: Filtering SHALL be recursive through folder/grouping nodes: a
     folder is included in the filtered tree if and only if at least one of
     its descendant leaves matches (empty-branch pruning, same principle as
     the existing Event future-filter). File-child nodes and other
     non-leaf/non-folder nodes are passed through unfiltered.
   * AC-6: While a filter is active (non-empty query), folder nodes SHALL
     auto-expand (``TreeItemCollapsibleState.Expanded``) so that matching
     descendants are immediately visible without manual expansion. When no
     filter is active, folders SHALL use their normal collapsed default.
   * AC-7: When the QuickPick is dismissed (``onDidHide`` — Escape, clicking
     outside, or losing focus), the filter SHALL be cleared (empty string)
     on every provider, restoring the tree to its unfiltered state.
   * AC-8: If no entities match the current filter, the affected kind's
     section of the tree SHALL simply show no children — no error or empty
     placeholder message is required.
   * AC-9: The per-kind Project folder filter (``REQ_PRJ_PROJECTFILTER``) and
     Event future-only filter (``REQ_EVT_EVENTFILTER``) SHALL continue to
     apply independently — the live search filter is applied in addition to,
     not instead of, those existing per-kind filters (both are combined at
     the provider level; a node must pass both to be shown).


