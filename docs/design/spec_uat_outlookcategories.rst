Outlook Categories UAT Design Specifications
==============================================

.. spec:: Category Sync Test Procedures
   :id: SPEC_UAT_CATEGORIES_FILES
   :status: approved
   :links: REQ_UAT_CATEGORIES_TESTDATA; SPEC_PIM_SERVICE; SPEC_PIM_CACHE

   **Description:**
   Manual test procedures for verifying the category sync architecture. Uses a
   live Outlook instance — no additional test data files required.

   **Test data:**

   * Uses live Outlook Classic categories (no new testdata/ files)
   * Precondition: at least two categories exist in Outlook before testing

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (provider registered)
        - Set ``outlookEnabled=true``, reload window
        - Output Channel logs provider registration; ``hasProviders()`` is true
      * - T-2 (no providers)
        - Set ``outlookEnabled=false``, reload window
        - No provider registered; zero providers
      * - T-3 (cache populated)
        - ``jarvis_category get``
        - Categories returned with name, color, source: "outlook"
      * - T-4 (heartbeat refresh)
        - Add category in Outlook, wait for tick
        - New category appears in next ``get``
      * - T-5 (manual refresh)
        - Add category in Outlook, click refresh in view
        - New category appears immediately


.. spec:: Category Tool Test Procedures
   :id: SPEC_UAT_CATTOOL_FILES
   :status: approved
   :links: REQ_UAT_CATTOOL_TESTDATA; SPEC_PIM_CATTOOL

   **Description:**
   Manual test procedures for the ``jarvis_category`` LM/MCP tool. Tests form
   a self-contained CRUD cycle — categories are created and cleaned up during
   the test run.

   **Test data:**

   * No new testdata/ files — tool creates/deletes categories directly
   * Test categories use "UAT-Test-" prefix for identification

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-6 (get all)
        - ``jarvis_category action:get``
        - All Outlook categories returned with name, color, source
      * - T-7 (get filtered)
        - ``jarvis_category action:get filter:"Project:"``
        - Only categories starting with "Project:" returned
      * - T-8 (set)
        - ``jarvis_category action:set name:"UAT-Test-Set"``
        - Category created; visible in Outlook and subsequent ``get``
      * - T-9 (delete)
        - ``jarvis_category action:delete name:"UAT-Test-Set"``
        - Category removed; no longer in ``get`` or Outlook
      * - T-10 (rename)
        - ``jarvis_category action:rename oldName/newName``
        - Renamed in Outlook; color preserved; old name gone
      * - T-11 (no providers)
        - ``outlookEnabled=false``, ``jarvis_category action:get``
        - Error: no PIM providers available
      * - T-12 (MCP)
        - Call ``jarvis_category`` via MCP client
        - Same results as LM tool invocation


.. spec:: Categories View Test Procedures
   :id: SPEC_UAT_CATVIEW_FILES
   :status: approved
   :links: REQ_UAT_CATVIEW_TESTDATA; SPEC_PIM_CATVIEW

   **Description:**
   Manual test procedures for the Categories sidebar tree view, feature toggle,
   and context menu actions.

   **Test data:**

   * No new testdata/ files — tests use live Extension Development Host UI
   * Precondition: Outlook running with at least two categories

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-13 (view visible)
        - ``showCategories=true``, open sidebar
        - "Categories" appears as 5th view; nodes listed alphabetically
      * - T-14 (view hidden)
        - ``showCategories=false``
        - "Categories" section not visible in sidebar
      * - T-15 (node details)
        - Expand Categories view
        - Nodes show name; tooltip/description includes source: outlook
      * - T-16 (refresh)
        - Add category in Outlook, click refresh icon
        - New category appears in tree
      * - T-17 (rename via context menu)
        - Right-click → Rename Category → enter new name
        - Input box pre-filled; tree updates; Outlook reflects rename
      * - T-18 (delete via context menu)
        - Right-click → Delete Category → confirm
        - Category removed from tree and Outlook
      * - T-19 (no providers)
        - ``outlookEnabled=false``, ``showCategories=true``
        - "no categories" placeholder shown


.. spec:: Outlook COM Bridge Test Procedures
   :id: SPEC_UAT_COMBRIDGE_FILES
   :status: approved
   :links: REQ_UAT_COMBRIDGE_TESTDATA; SPEC_OLK_COMBRIDGE

   **Description:**
   Manual test procedures for the Outlook COM bridge provider. Requires
   Windows OS with Outlook Classic installed and running.

   **Test data:**

   * No new testdata/ files — tests use live Outlook instance
   * Precondition: Outlook Classic running; categories "Project: Alpha",
     "Event: Beta", and "General" exist (or equivalent)
   * Test categories use "UAT-" prefix for easy cleanup

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-20 (read via COM)
        - ``jarvis_category action:get`` with Outlook running
        - All three categories returned with source: "outlook"
      * - T-21 (colour heuristic)
        - ``jarvis_category action:get``
        - "Project: Alpha" → blue; "Event: Beta" → pink; "General" → no colour
      * - T-22 (set with colour)
        - ``jarvis_category action:set name:"Project: UAT-Color"``
        - Category created in Outlook with blue colour
      * - T-23 (delete via COM)
        - ``jarvis_category action:delete name:"Project: UAT-Color"``
        - Category removed from Outlook; confirmed via Outlook UI
      * - T-24 (rename preserves colour)
        - Rename "UAT-Test-Rename" → "UAT-Test-Renamed2"
        - New name in Outlook; same colour; old name gone
      * - T-25 (Category.id)
        - ``get``; check debug log
        - Each category has non-empty ``id`` from COM CategoryID
      * - T-26 (disabled guard)
        - ``outlookEnabled=false``; check Output Channel
        - No COM/PowerShell log entries; no child processes


.. spec:: Auto-Category on New Entity Test Procedures
   :id: SPEC_UAT_AUTOCAT_FILES
   :status: implemented
   :links: REQ_UAT_AUTOCAT_TESTDATA; SPEC_OLK_AUTOCAT_NEWENTITY; SPEC_EXP_NEWPROJECT_CMD; SPEC_EXP_NEWEVENT_CMD

   **Description:**
   Manual test procedures for the automatic Outlook category creation triggered
   by the ``jarvis.newProject`` and ``jarvis.newEvent`` commands. Requires
   Windows OS with Outlook Classic running.

   **Test data:**

   * No new testdata/ files — entity folders are created and deleted during testing
   * Precondition: ``jarvis.outlookEnabled = true``; ``jarvis.projectsFolder`` and
     ``jarvis.eventsFolder`` configured; Outlook Classic open

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-27 (project auto-category)
        - ``+`` in Projects bar; name ``"UAT-AutoCat"``
        - Category ``"Project: UAT-AutoCat"`` created in Outlook (blue); entity folder created
      * - T-28 (event auto-category)
        - ``+`` in Events bar; name ``"UAT-AutoCat Conf"``; date ``2099-12-31``
        - Category ``"Event: UAT-AutoCat Conf"`` created in Outlook (pink); event folder created
      * - T-29 (guard disabled)
        - ``outlookEnabled=false``; ``+`` in Projects bar; name ``"UAT-GuardTest"``
        - Entity created successfully; NO new Outlook category created; no user-visible error


.. spec:: Outlook Tasks Test Procedures
   :id: SPEC_UAT_TASKS_FILES
   :status: approved
   :links: REQ_UAT_TASKS_TESTDATA; SPEC_PIM_ITASKPROVIDER; SPEC_PIM_TASKSERVICE; SPEC_PIM_TASKEDITOR; SPEC_PIM_TASKTOOL; SPEC_EXP_TASKTREE; SPEC_OLK_TASKPROVIDER; SPEC_OLK_TASKENABLE

   **Description:**
   Manual test procedures for the Outlook Tasks integration. Requires Windows OS
   with Outlook Classic installed and running. Most tests require both
   ``jarvis.outlookEnabled=true`` and ``jarvis.outlook.tasks.enabled=true``.

   **Test data:**

   * No new testdata/ files — tests use a live Outlook Classic instance
   * Precondition: Outlook Classic running with at least two tasks, including
     one tagged "Project: Alpha" and one with no Jarvis-linked category
   * Test tasks use ``"UAT-Task-"`` prefix for easy cleanup

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-30 (sub-toggle off)
        - ``tasks.enabled=false``; reload; open tree
        - No task nodes; jarvis_task returns "tasks not enabled"
      * - T-31 (master toggle off)
        - ``outlookEnabled=false``; reload; open tree
        - No task nodes; no COM/PowerShell processes
      * - T-32 (get all tasks)
        - ``jarvis_task action:get``
        - All tasks returned with subject, dueDate, isComplete, categories, source: "outlook"
      * - T-33 (get by category)
        - ``jarvis_task action:get filter:{category:"Project: Alpha"}``
        - Only tasks tagged "Project: Alpha" returned
      * - T-34 (get by status)
        - ``jarvis_task action:get filter:{status:"open"}``
        - Only open tasks returned; no completed tasks
      * - T-35 (get by dueBefore)
        - ``jarvis_task action:get filter:{dueBefore:"2026-12-31"}``
        - Only tasks due before 2026-12-31 returned
      * - T-36 (create task)
        - ``jarvis_task action:set subject:"UAT-Task-New" dueDate:"2027-01-01" categories:["Project: Alpha"]``
        - Task created in Outlook; appears in subsequent get
      * - T-37 (modify task)
        - ``jarvis_task action:set subject:"UAT-Task-New" priority:"high"``
        - Task priority updated in Outlook; subsequent get shows priority: "high"
      * - T-38 (complete task)
        - ``jarvis_task action:set subject:"UAT-Task-New" isComplete:true``
        - Outlook marks complete; DateCompleted set; get shows isComplete:true + completedDate
      * - T-39 (delete task)
        - ``jarvis_task action:delete subject:"UAT-Task-New"``
        - Task removed from Outlook; absent in subsequent get
      * - T-40 (uncategorized section)
        - Open Projects tree with ≥1 uncategorized Outlook task
        - "Uncategorized Tasks" section at top of tree with task nodes
      * - T-41 (inline task nodes)
        - Expand "Alpha" project node
        - Task tagged "Project: Alpha" appears as child node; no COM call triggered
      * - T-42 (badge count)
        - 2 open tasks for "Project: Alpha", not overdue
        - Project node label shows "(2)"
      * - T-43 (badge overdue)
        - 1 overdue task for "Project: Alpha"
        - Project node label shows "(1 !)"
      * - T-44 (badge ⚠)
        - Uncategorized task exists
        - "Uncategorized Tasks" node label includes ⚠
      * - T-45 (editor opens)
        - Click task node
        - Custom Editor opens with subject, body, dueDate, status, priority, categories; completedDate read-only
      * - T-46 (editor save)
        - Edit subject; press Ctrl+S
        - Task updated in Outlook; tree node label updates
      * - T-47 ("Open in Outlook" button)
        - Click "Open in Outlook" in editor
        - Outlook opens to the specific task item
      * - T-48 (completedDate read-only)
        - Open editor for completed task; inspect completedDate field
        - Displayed as plain read-only text; no input control
      * - T-49 (single-quote escaping)
        - ``jarvis_task action:get``; Outlook has task "Team's Meeting UAT"
        - Task returned intact; no PowerShell error in Output Channel
      * - T-50 (isComplete → completedDate)
        - Outlook completed task; ``jarvis_task action:get``
        - Returned task has isComplete:true and completedDate from COM DateCompleted
      * - T-51 (heartbeat refresh)
        - Add task in Outlook; wait for heartbeat tick
        - Task appears in tree; Output Channel logs TaskService refresh
