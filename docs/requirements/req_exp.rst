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
   The extension SHALL provide two tree views inside the Jarvis sidebar:
   one labeled "Projects" and one labeled "Events". Each tree view SHALL
   display a flat list of items showing their name as label.

   **Acceptance Criteria:**

   * AC-1: The sidebar contains a "Projects" tree view
   * AC-2: The sidebar contains an "Events" tree view
   * AC-3: Both tree views are collapsible sections
   * AC-4: Each item displays a text label


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
   The tree views SHALL load project and event names from YAML files in the
   configured folder paths. Invalid or unreadable files SHALL be skipped silently.

   **Acceptance Criteria:**

   * AC-1: All `.yaml` / `.yml` files in `jarvis.projectsFolder` are read for projects
   * AC-2: All `.yaml` / `.yml` files in `jarvis.eventsFolder` are read for events
   * AC-3: The `name` field value is used as the tree item label
   * AC-4: Files that cannot be parsed or are missing the `name` field are skipped without crashing


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
