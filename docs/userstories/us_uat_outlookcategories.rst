Outlook Categories User Acceptance Tests
=========================================

.. story:: Category Sync Acceptance Tests
   :id: US_UAT_CATEGORIES
   :status: approved
   :priority: optional
   :links: US_PIM_CATEGORIES

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the category sync architecture,
   **so that** I can verify provider registration, caching, and refresh end-to-end
   before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios verify that ``CategoryService`` registers the Outlook
     provider when ``jarvis.outlookEnabled`` is ``true``
   * AC-2: Test scenarios verify that the category cache returns categories
     after initial load
   * AC-3: Test scenarios verify that cache refresh via heartbeat updates the
     category list
   * AC-4: Test scenarios verify that categories carry the correct ``source`` tag
   * AC-5: Test scenarios verify that with no providers configured, the service
     returns an empty list

   **Test Scenarios:**

   **T-1 — Provider registered when outlookEnabled=true**
     Setup: Set ``jarvis.outlookEnabled`` to ``true``; reload window.
     Action: Open Output Channel "Jarvis"; search for provider registration log.
     Expected: Log shows ``OutlookCategoryProvider`` registered with
     ``CategoryService``; ``hasProviders()`` is true.

   **T-2 — No providers when outlookEnabled=false**
     Setup: Set ``jarvis.outlookEnabled`` to ``false``; reload window.
     Action: Open Output Channel "Jarvis"; check provider registration logs.
     Expected: No provider registration logged; ``CategoryService`` reports
     zero providers.

   **T-3 — Cache populated on first access**
     Setup: ``jarvis.outlookEnabled`` = ``true``; Outlook running with at least
     two categories.
     Action: Use ``jarvis_category`` tool with ``action: "get"``.
     Expected: Categories returned with ``name``, ``color``, and
     ``source: "outlook"`` for each entry.

   **T-4 — Heartbeat cache refresh**
     Setup: Categories cached; add a new category directly in Outlook.
     Action: Wait for next heartbeat tick (or set ``jarvis.heartbeatInterval``
     to ``10`` for faster feedback).
     Expected: Next ``get`` call returns the newly added category.

   **T-5 — Manual cache refresh via category view**
     Setup: Categories cached; add a new category directly in Outlook.
     Action: Click the refresh button in the Categories sidebar view.
     Expected: New category appears in the tree immediately.


.. story:: Category Tool Acceptance Tests
   :id: US_UAT_CATTOOL
   :status: approved
   :priority: optional
   :links: US_PIM_CATTOOL

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the ``jarvis_category`` tool,
   **so that** I can verify all CRUD actions and error handling before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios cover all four actions: ``get``, ``set``, ``delete``,
     ``rename``
   * AC-2: Test scenarios verify the tool is available in both LM and MCP modes
   * AC-3: Test scenarios verify the error response when no providers are configured
   * AC-4: Test scenarios verify filtered ``get`` returns only matching categories

   **Test Scenarios:**

   **T-6 — get returns all categories**
     Setup: ``jarvis.outlookEnabled`` = ``true``; Outlook running with categories.
     Action: In Chat, invoke ``jarvis_category`` with ``action: "get"``.
     Expected: Tool returns a list of all Outlook categories with name, color,
     and source.

   **T-7 — get with filter**
     Setup: Outlook has categories including one starting with "Project:".
     Action: Invoke ``jarvis_category`` with ``action: "get"``,
     ``filter: "Project:"``.
     Expected: Only categories whose name starts with "Project:" are returned.

   **T-8 — set creates a new category**
     Setup: Outlook running; no category named "UAT-Test-Set".
     Action: Invoke ``jarvis_category`` with ``action: "set"``,
     ``name: "UAT-Test-Set"``.
     Expected: Tool confirms creation; subsequent ``get`` includes
     "UAT-Test-Set"; category visible in Outlook.

   **T-9 — delete removes a category**
     Setup: Category "UAT-Test-Set" exists (from T-8).
     Action: Invoke ``jarvis_category`` with ``action: "delete"``,
     ``name: "UAT-Test-Set"``.
     Expected: Tool confirms deletion; subsequent ``get`` no longer includes
     "UAT-Test-Set"; category removed from Outlook.

   **T-10 — rename renames a category**
     Setup: Create category "UAT-Test-Rename" via ``set``.
     Action: Invoke ``jarvis_category`` with ``action: "rename"``,
     ``oldName: "UAT-Test-Rename"``, ``newName: "UAT-Test-Renamed"``.
     Expected: Tool confirms rename; subsequent ``get`` shows
     "UAT-Test-Renamed" (old name gone); color preserved.

   **T-11 — Tool error when no providers**
     Setup: Set ``jarvis.outlookEnabled`` to ``false``; reload window.
     Action: Invoke ``jarvis_category`` with ``action: "get"``.
     Expected: Tool returns an error message indicating no PIM providers
     are available.

   **T-12 — Tool available via MCP server**
     Setup: MCP client connected to Jarvis MCP server.
     Action: Call ``jarvis_category`` tool via MCP with ``action: "get"``.
     Expected: Same category list returned as via LM tool invocation.


.. story:: Categories Sidebar View Acceptance Tests
   :id: US_UAT_CATVIEW
   :status: approved
   :priority: optional
   :links: US_PIM_CATVIEW

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the Categories sidebar view,
   **so that** I can verify tree rendering, feature toggle, and context menu
   actions before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios verify the view appears/hides based on
     ``jarvis.pim.showCategories``
   * AC-2: Test scenarios verify category nodes display name and source
   * AC-3: Test scenarios verify context menu Rename action
   * AC-4: Test scenarios verify context menu Delete action
   * AC-5: Test scenarios verify "no categories" placeholder when no providers

   **Test Scenarios:**

   **T-13 — View visible when showCategories=true**
     Setup: Set ``jarvis.pim.showCategories`` to ``true``; ``jarvis.outlookEnabled``
     = ``true``; reload window.
     Action: Open the Jarvis sidebar.
     Expected: "Categories" section appears as the 5th view; category nodes
     are listed alphabetically.

   **T-14 — View hidden when showCategories=false**
     Setup: Set ``jarvis.pim.showCategories`` to ``false``.
     Action: Open the Jarvis sidebar.
     Expected: "Categories" section is not visible.

   **T-15 — Category nodes show name and source**
     Setup: ``showCategories`` = ``true``; Outlook provider active with categories.
     Action: Expand the Categories view.
     Expected: Each node shows the category name; description or tooltip includes
     ``source: outlook``.

   **T-16 — Refresh button re-fetches categories**
     Setup: Categories view open; add a new category in Outlook directly.
     Action: Click the refresh icon in the Categories view title bar.
     Expected: The new category appears in the tree.

   **T-17 — Context menu: Rename Category**
     Setup: Categories view open with at least one category.
     Action: Right-click a category → select "Rename Category".
     Expected: Input box appears pre-filled with the current name; enter a new name;
     tree updates to show the new name; Outlook shows the renamed category.

   **T-18 — Context menu: Delete Category**
     Setup: Categories view open with at least one category (e.g. "UAT-Test-Delete").
     Action: Right-click the category → select "Delete Category".
     Expected: Confirmation dialog appears; confirm; category disappears from tree;
     category removed from Outlook.

   **T-19 — No-providers placeholder**
     Setup: ``jarvis.outlookEnabled`` = ``false``; ``jarvis.pim.showCategories``
     = ``true``; reload window.
     Action: Open the Jarvis sidebar; expand Categories.
     Expected: A "no categories" placeholder message is shown.


.. story:: Outlook COM Bridge Acceptance Tests
   :id: US_UAT_COMBRIDGE
   :status: approved
   :priority: optional
   :links: US_OLK_COMBRIDGE

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the Outlook COM bridge,
   **so that** I can verify PowerShell COM integration, color heuristic, and
   rename behaviour on a Windows machine with Outlook Classic.

   **Acceptance Criteria:**

   * AC-1: Test scenarios verify that Outlook categories are read via COM
   * AC-2: Test scenarios verify the colour heuristic (project → blue, event → pink)
   * AC-3: Test scenarios verify rename = delete + re-create with preserved colour
   * AC-4: Test scenarios verify that ``Category.id`` is populated from
     Outlook ``CategoryID``
   * AC-5: Test scenarios verify no COM calls when ``outlookEnabled=false``

   **Test Scenarios:**

   **T-20 — Read Outlook categories via COM**
     Setup: ``jarvis.outlookEnabled`` = ``true``; Outlook Classic running with
     known categories (e.g. "Project: Alpha", "Event: Beta", "General").
     Action: Invoke ``jarvis_category`` with ``action: "get"``.
     Expected: All three categories returned with correct names and
     ``source: "outlook"``.

   **T-21 — Colour heuristic**
     Setup: Outlook has categories "Project: Alpha" and "Event: Beta".
     Action: Invoke ``jarvis_category`` with ``action: "get"``.
     Expected: "Project: Alpha" has colour blue; "Event: Beta" has colour pink;
     "General" has no explicit colour assignment.

   **T-22 — Set creates category in Outlook with colour**
     Setup: No category named "Project: UAT-Color".
     Action: Invoke ``jarvis_category`` with ``action: "set"``,
     ``name: "Project: UAT-Color"``.
     Expected: Category created in Outlook with blue colour (heuristic match).

   **T-23 — Delete removes category from Outlook**
     Setup: Category "Project: UAT-Color" exists in Outlook.
     Action: Invoke ``jarvis_category`` with ``action: "delete"``,
     ``name: "Project: UAT-Color"``.
     Expected: Category removed from Outlook; confirmed via Outlook UI.

   **T-24 — Rename preserves colour (delete + re-create)**
     Setup: Category "UAT-Test-Rename" exists with a known colour.
     Action: Invoke ``jarvis_category`` with ``action: "rename"``,
     ``oldName: "UAT-Test-Rename"``, ``newName: "UAT-Test-Renamed2"``.
     Expected: Outlook shows "UAT-Test-Renamed2" with the same colour as before;
     old name no longer exists.

   **T-25 — Category.id from Outlook CategoryID**
     Setup: ``jarvis.outlookEnabled`` = ``true``; Outlook has categories.
     Action: Invoke ``jarvis_category`` with ``action: "get"``; inspect the
     Jarvis Output Channel debug log for returned category objects.
     Expected: Each category object includes a non-empty ``id`` field populated
     from the Outlook COM ``CategoryID`` property.

   **T-26 — No COM calls when disabled**
     Setup: Set ``jarvis.outlookEnabled`` to ``false``; reload window.
     Action: Open Output Channel "Jarvis"; search for any PowerShell or COM log.
     Expected: No Outlook COM-related log entries; no ``powershell`` child
     processes spawned.


.. story:: Auto-Category on New Entity Acceptance Tests
   :id: US_UAT_AUTOCAT
   :status: implemented
   :priority: optional
   :links: US_OLK_AUTOCATEGORY; REQ_OLK_AUTOCAT_NEWENTITY

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the automatic Outlook category
   creation triggered by the new-entity commands,
   **so that** I can verify convention enforcement, guard conditions, and error
   resilience before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios verify that creating a project auto-creates
     ``"Project: <name>"`` in Outlook when ``outlookEnabled = true``
   * AC-2: Test scenarios verify that creating an event auto-creates
     ``"Event: <name>"`` in Outlook when ``outlookEnabled = true``
   * AC-3: Test scenarios verify that with ``outlookEnabled = false`` no category
     is created but the entity is still created successfully

   **Test Scenarios:**

   **T-27 — New project auto-creates Outlook category**
     Setup: ``jarvis.outlookEnabled = true``; Outlook running; Extension
     Development Host launched.
     Action: Click ``+`` in the Projects title bar; enter name ``"UAT-AutoCat"``.
     Expected: Folder ``uat-autocat/project.yaml`` created; category
     ``"Project: UAT-AutoCat"`` appears in Outlook with blue colour.
     Cleanup: Delete ``uat-autocat/`` folder; delete category from Outlook.

   **T-28 — New event auto-creates Outlook category**
     Setup: ``jarvis.outlookEnabled = true``; Outlook running; Extension
     Development Host launched.
     Action: Click ``+`` in the Events title bar; enter name ``"UAT-AutoCat Conf"``
     and date ``"2099-12-31"``.
     Expected: Folder ``2099-12-31-uat-autocat-conf/event.yaml`` created; category
     ``"Event: UAT-AutoCat Conf"`` appears in Outlook with pink colour.
     Cleanup: Delete event folder; delete category from Outlook.

   **T-29 — Guard: no category created when outlookEnabled=false**
     Setup: ``jarvis.outlookEnabled = false`` (default); Extension Development
     Host launched.
     Action: Click ``+`` in the Projects title bar; enter name ``"UAT-GuardTest"``.
     Expected: Folder ``uat-guardtest/project.yaml`` created and appears in sidebar;
     NO new category ``"Project: UAT-GuardTest"`` visible in Outlook; no error shown
     to the user.
     Cleanup: Delete ``uat-guardtest/`` folder.

.. story:: Outlook Tasks Integration Acceptance Tests
   :id: US_UAT_TASKS
   :status: approved
   :priority: optional
   :links: US_PIM_TASKS; US_OLK_TASKS

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the Outlook Tasks integration,
   **so that** I can verify feature toggle, task CRUD, tree rendering, editor
   behaviour, and COM bridge correctness end-to-end before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios verify both feature guard toggles
     (``jarvis.outlookEnabled`` and ``jarvis.outlook.tasks.enabled``)
   * AC-2: Test scenarios cover all ``jarvis_task`` tool actions: ``get``
     (with and without filters), ``set`` (create/modify/complete), and ``delete``
   * AC-3: Test scenarios verify inline task nodes in the project/event tree and
     the Uncategorized Tasks section at the top
   * AC-4: Test scenarios verify badge logic on project nodes (``(n)``,
     ``(n !)``, ``⚠``)
   * AC-5: Test scenarios verify Task Editor fields, read-only constraints,
     and the "Open in Outlook" button
   * AC-6: Test scenarios verify COM bridge single-quote escaping and
     ``isComplete`` → ``completedDate`` side-effect
   * AC-7: Test scenarios verify heartbeat-driven ``TaskService.refresh()``

   **Test Scenarios:**

   **T-30 — Guard: tasks sub-toggle off**
     Setup: ``jarvis.outlookEnabled=true``; ``jarvis.outlook.tasks.enabled=false``;
     reload window.
     Action: Open Output Channel "Jarvis"; inspect task provider registration log;
     open Projects tree.
     Expected: No OutlookTaskProvider registered; no task nodes in tree;
     ``jarvis_task`` tool returns a "tasks not enabled" message.

   **T-31 — Guard: outlookEnabled=false (master toggle)**
     Setup: ``jarvis.outlookEnabled=false``; ``jarvis.outlook.tasks.enabled=true``;
     reload window.
     Action: Open the Projects tree; check Output Channel for COM activity.
     Expected: No task nodes in tree; no OutlookTaskProvider registered;
     no PowerShell/COM processes spawned.

   **T-32 — jarvis_task get: all tasks**
     Setup: ``jarvis.outlookEnabled=true``; ``jarvis.outlook.tasks.enabled=true``;
     Outlook running with at least two tasks, one tagged "Project: Alpha".
     Action: In Chat, invoke ``jarvis_task`` with ``action:"get"``.
     Expected: Tool returns all tasks with subject, dueDate, isComplete,
     categories, and ``source:"outlook"``.

   **T-33 — jarvis_task get with category filter**
     Setup: Outlook has tasks tagged "Project: Alpha" and "Project: Beta".
     Action: Invoke ``jarvis_task`` with ``action:"get"``,
     ``filter:{ "category":"Project: Alpha" }``.
     Expected: Only tasks with "Project: Alpha" in their categories returned;
     "Project: Beta" tasks excluded.

   **T-34 — jarvis_task get with status filter**
     Setup: Outlook has both open and completed tasks.
     Action: Invoke ``jarvis_task`` with ``action:"get"``,
     ``filter:{ "status":"open" }``.
     Expected: Only non-completed tasks returned; no completed tasks in result.

   **T-35 — jarvis_task get with dueBefore filter**
     Setup: Outlook has tasks with due dates in 2025 and 2028.
     Action: Invoke ``jarvis_task`` with ``action:"get"``,
     ``filter:{ "dueBefore":"2026-12-31" }``.
     Expected: Only tasks with dueDate before 2026-12-31 returned.

   **T-36 — jarvis_task set: create new task**
     Setup: No Outlook task with subject "UAT-Task-New".
     Action: Invoke ``jarvis_task`` with ``action:"set"``,
     ``subject:"UAT-Task-New"``, ``dueDate:"2027-01-01"``,
     ``categories:["Project: Alpha"]``.
     Expected: Tool confirms creation; task visible in Outlook Tasks;
     subsequent ``get`` includes "UAT-Task-New" with correct fields.
     Cleanup: Delete task via ``jarvis_task action:"delete"`` or Outlook UI.

   **T-37 — jarvis_task set: modify existing task priority**
     Setup: Task "UAT-Task-New" exists (from T-36).
     Action: Invoke ``jarvis_task`` with ``action:"set"``,
     ``subject:"UAT-Task-New"``, ``priority:"high"``.
     Expected: Task updated in Outlook; subsequent ``get`` shows
     ``priority:"high"``.

   **T-38 — jarvis_task set: complete task (isComplete side-effect)**
     Setup: Task "UAT-Task-New" exists and is open.
     Action: Invoke ``jarvis_task`` with ``action:"set"``,
     ``subject:"UAT-Task-New"``, ``isComplete:true``.
     Expected: Task marked complete in Outlook; Outlook sets DateCompleted
     automatically; subsequent ``get`` shows ``isComplete:true`` and a
     non-null ``completedDate``.

   **T-39 — jarvis_task delete**
     Setup: Task "UAT-Task-New" exists.
     Action: Invoke ``jarvis_task`` with ``action:"delete"``,
     ``subject:"UAT-Task-New"``.
     Expected: Tool confirms deletion; task absent from Outlook Tasks list;
     subsequent ``get`` does not include it.

   **T-40 — Tree: Uncategorized Tasks section**
     Setup: Outlook has at least one task whose categories do not match any
     Jarvis project or event; ``jarvis.outlook.tasks.enabled=true``.
     Action: Open the Projects tree.
     Expected: "Uncategorized Tasks" section appears above all project nodes;
     uncategorized task subjects listed as child nodes.

   **T-41 — Tree: inline task nodes under project**
     Setup: Outlook task "UAT-Inline-Task" is tagged "Project: Alpha";
     "alpha" project exists in the configured projects folder.
     Action: Open Projects tree; expand the "Alpha" project node.
     Expected: "UAT-Inline-Task" node appears as a child of "Alpha";
     no direct COM call triggered on expand (tree reads from cache only).

   **T-42 — Tree badge: open tasks count (n)**
     Setup: Outlook has 2 open tasks for "Project: Alpha", none overdue,
     none high-priority.
     Action: Observe the "Alpha" project node label in the tree.
     Expected: Label shows ``(2)`` appended to the project name.

   **T-43 — Tree badge: overdue/high-priority tasks (n !)**
     Setup: Outlook has 1 open task for "Project: Alpha" with dueDate
     in the past (overdue).
     Action: Observe the "Alpha" project node label.
     Expected: Label shows ``(1 !)`` appended to the project name.

   **T-44 — Tree badge: Uncategorized Tasks ⚠**
     Setup: At least one uncategorized task exists.
     Action: Observe the "Uncategorized Tasks" node in the Projects tree.
     Expected: Node label includes ``⚠`` to signal unlinked tasks.

   **T-45 — Task editor opens on node click**
     Setup: A task node is visible in the project tree.
     Action: Click the task node.
     Expected: Custom Editor opens showing: subject, body, dueDate, status,
     priority, categories fields; completedDate (if set) shown as read-only.

   **T-46 — Task editor: edit subject and save**
     Setup: Task editor open for task "UAT-Task-Edit".
     Action: Change the subject field to "UAT-Task-Edited"; press Ctrl+S.
     Expected: Task updated in Outlook; task node label in tree updates
     to "UAT-Task-Edited".
     Cleanup: Rename back or delete the task.

   **T-47 — Task editor: "Open in Outlook" button**
     Setup: Task editor open for an Outlook task (``source:"outlook"`` shown).
     Action: Click the "Open in Outlook" button.
     Expected: Outlook opens and navigates to that specific task item.

   **T-48 — Task editor: completedDate is read-only**
     Setup: Task editor open for a completed task that has a ``completedDate``.
     Action: Look for the completedDate field; attempt to interact with it.
     Expected: completedDate displayed as plain read-only text; no input
     control rendered for it.

   **T-49 — COM bridge: single-quote in task subject**
     Setup: Outlook has a task with subject containing a single quote, e.g.
     ``"Team's Meeting UAT"``.
     Action: Invoke ``jarvis_task`` with ``action:"get"``.
     Expected: Task returned with subject ``Team's Meeting UAT`` intact;
     no PowerShell escaping error in Output Channel.

   **T-50 — COM bridge: isComplete → completedDate mapping**
     Setup: Outlook has a task completed directly in Outlook (Outlook populated
     DateCompleted).
     Action: Invoke ``jarvis_task`` with ``action:"get"``; find the completed task.
     Expected: Returned task has ``isComplete:true`` and ``completedDate``
     populated from Outlook's ``DateCompleted`` COM property.

   **T-51 — Heartbeat triggers TaskService.refresh()**
     Setup: ``jarvis.outlook.tasks.enabled=true``; set heartbeat interval to
     ``10`` seconds for faster feedback; add a new task in Outlook.
     Action: Wait for the next heartbeat tick; observe the Projects tree.
     Expected: New task appears in the tree without manual refresh; Output
     Channel logs a ``TaskService refresh`` entry.