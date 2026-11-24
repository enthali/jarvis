Outlook Categories and Tasks Acceptance Criteria
================================================

Manual acceptance criteria for the PIM module (category sync, category tool,
Categories view, Outlook tasks) and the Outlook COM integration. All criteria
run against a live Outlook Classic on Windows; no test data files are needed.
Each criterion is an end-to-end journey: one sitting in an Extension
Development Host that walks through several related checks in order. Setting
defaults, setting declarations and the wording of the no-provider category
error are proven by automated tests (``src\tests\pim-categories-default.test.ts``)
and are not repeated here.

**Setup (all journeys):** Windows with Outlook Classic installed and running,
the extension running in an Extension Development Host. Outlook holds the
categories "Project: Alpha", "Event: Beta" and "General" and at least two
tasks, one of them tagged "Project: Alpha" (or equivalents). Items the tester
creates use the prefix "UAT-" (categories) or "UAT-Task-" (tasks) and each
journey removes them at its end, so the journeys can run in any order. The
tools are called in Chat as ``jarvis_pim_category`` and ``jarvis_pim_task``.
Except for the first journey, which sets the toggles itself,
``jarvis.outlook.enabled``, ``jarvis.outlook.categories.enabled`` and
``jarvis.outlook.tasks.enabled`` are ``true`` and the window was reloaded after
the change.


.. ac:: Journey: the Outlook toggles switch the Categories view and the task tool
   :id: AC_OLK_SWITCH_JOURNEY
   :status: approved
   :validates: US_PIM_CATVIEW; US_PIM_TASKS

   **Given** ``jarvis.outlook.enabled`` is ``true``,
   ``jarvis.outlook.categories.enabled`` is removed from the user, workspace
   and folder settings, ``jarvis.outlook.tasks.enabled`` is ``false``, and the
   window was reloaded

   1. **When** the tester opens the Jarvis sidebar, then sets
      ``jarvis.outlook.categories.enabled`` to ``true`` and reloads the window
      **Then** the "Categories" view is not shown before the change and appears
      after it

   2. **When** the tester invokes ``jarvis_pim_task`` with ``action: "get"``
      (tasks toggle still ``false``)
      **Then** the tool returns an informational no-provider message and no
      tasks

   3. **When** the tester sets ``jarvis.outlook.tasks.enabled`` to ``true``,
      then sets ``jarvis.outlook.enabled`` to ``false``, reloads the window,
      opens the Jarvis sidebar and invokes ``jarvis_pim_category`` and
      ``jarvis_pim_task`` with ``action: "get"``
      **Then** no "Categories" view is shown, the category tool returns the
      no-provider error, and the task tool returns an informational
      no-provider message instead of tasks

   Finally the tester sets ``jarvis.outlook.enabled`` back to ``true`` and
   reloads the window; the other journeys need this state.


.. ac:: Journey: Outlook categories in the Categories view and its refresh, rename and delete
   :id: AC_PIM_CATEGORIES_JOURNEY
   :status: approved
   :validates: US_PIM_CATEGORIES; US_PIM_CATVIEW

   **Given** both Outlook toggles are on, ``jarvis.heartbeatInterval`` is
   ``10``, the window was reloaded, and Outlook holds at least two categories
   including "UAT-Test-Rename" and "UAT-Test-Delete" (created in Outlook before
   the reload)

   1. **When** the tester invokes ``jarvis_pim_category`` with
      ``action: "get"``
      **Then** every Outlook category is returned with ``name``, ``color`` and
      ``source: "outlook"``

   2. **When** the tester opens the Jarvis sidebar and expands the Categories
      view
      **Then** the "Categories" section is the 5th view, the categories are
      listed alphabetically, and each node shows the category name with
      ``source: outlook`` in its description or tooltip

   3. **When** the tester adds the category "UAT-Refresh-1" in Outlook and
      clicks the refresh icon in the view title bar, then adds
      "UAT-Refresh-2" in Outlook and waits for the next heartbeat tick without
      clicking anything
      **Then** "UAT-Refresh-1" appears in the tree immediately after the click
      and "UAT-Refresh-2" appears after the tick

   4. **When** the tester right-clicks "UAT-Test-Rename" in the Categories
      view, chooses "Rename Category" and enters "UAT-Test-Renamed"
      **Then** the input box was pre-filled with the current name, the tree
      shows "UAT-Test-Renamed" and Outlook lists the renamed category

   5. **When** the tester right-clicks "UAT-Test-Delete", chooses "Delete
      Category" and confirms the dialog
      **Then** the category disappears from the tree and from Outlook

   Finally the tester removes "UAT-Refresh-1", "UAT-Refresh-2" and
   "UAT-Test-Renamed" in Outlook.


.. ac:: Journey: the category tool lists, filters, creates, colours, renames and deletes categories, in Chat and through MCP
   :id: AC_PIM_CATTOOL_JOURNEY
   :status: approved
   :validates: US_PIM_CATTOOL

   **Given** Outlook holds "Project: Alpha", "Event: Beta" and "General" and the
   category "UAT-Test-Rename" with a known colour, and has no category
   "Project: UAT-Color", "UAT-Test-Set", "UAT-Test-Renamed" or
   "UAT-Test-Renamed2"; an MCP client is connected to the Jarvis MCP server

   1. **When** the tester invokes ``jarvis_pim_category`` with
      ``action: "get"`` and then with ``action: "get"``,
      ``filter: "Project:"``
      **Then** the first call returns all categories and the second returns
      only those whose name starts with "Project:"

   2. **When** the tester invokes ``jarvis_pim_category`` with
      ``action: "get"``, then with ``action: "set"``,
      ``name: "Project: UAT-Color"``
      **Then** the ``get`` shows "Project: Alpha" in blue, "Event: Beta" in
      pink and "General" without a colour; Outlook shows the new category
      "Project: UAT-Color" in blue

   3. **When** the tester invokes ``jarvis_pim_category`` with
      ``action: "set"``, ``name: "UAT-Test-Set"``, then with
      ``action: "rename"``, ``oldName: "UAT-Test-Set"``,
      ``newName: "UAT-Test-Renamed"``, then with ``action: "delete"``,
      ``name: "UAT-Test-Renamed"``
      **Then** after each call a ``get`` and the Outlook category list agree:
      the category exists as "UAT-Test-Set", then only as "UAT-Test-Renamed",
      then not at all

   4. **When** the tester invokes ``jarvis_pim_category`` with
      ``action: "rename"``, ``oldName: "UAT-Test-Rename"``,
      ``newName: "UAT-Test-Renamed2"``
      **Then** Outlook shows "UAT-Test-Renamed2" with the same colour as before
      and no category "UAT-Test-Rename"

   5. **When** the tester calls ``jarvis_pim_category`` through the MCP client
      with ``action: "get"``
      **Then** the same category list is returned as by the Chat invocation

   Finally the tester removes "Project: UAT-Color" and "UAT-Test-Renamed2" in
   Outlook.


.. ac:: Journey: the task tool lists, filters, creates, modifies, completes and deletes Outlook tasks and sees new ones
   :id: AC_PIM_TASKS_JOURNEY
   :status: approved
   :validates: US_PIM_TASKS

   **Given** tasks are enabled, ``jarvis.heartbeatInterval`` is ``10``, and
   Outlook holds open and completed tasks, tasks tagged "Project: Alpha" and
   "Project: Beta", tasks due before and after 2026-12-31, the open task
   "UAT-Task-Complete", a task that was completed directly in Outlook, and no
   task "UAT-Task-New" or "UAT-Task-Refresh"

   1. **When** the tester invokes ``jarvis_pim_task`` with ``action: "get"``,
      then with ``filter`` ``category: "Project: Alpha"``, then with
      ``status: "open"``, then with ``dueBefore: "2026-12-31"``
      **Then** the first call returns all tasks with ``subject``, ``dueDate``,
      ``isComplete``, ``categories`` and ``source: "outlook"``; each filtered
      call returns only the matching tasks

   2. **When** the tester invokes ``jarvis_pim_task`` with ``action: "set"``,
      ``subject: "UAT-Task-New"``, ``dueDate: "2027-01-01"``,
      ``categories: ["Project: Alpha"]``, then with ``action: "modify"``, the
      task ``id`` and ``priority: "high"``, then with ``action: "delete"`` and
      the task ``id``
      **Then** the task appears in the Outlook Tasks list and in ``get``; after
      the modify ``get`` shows ``priority: "high"``; after the delete the task
      is gone from Outlook and from ``get``

   3. **When** the tester invokes ``jarvis_pim_task`` with ``action: "modify"``,
      the id of "UAT-Task-Complete" and ``isComplete: true``, then with
      ``action: "get"``
      **Then** Outlook shows the task as complete with a completion date, and
      ``get`` returns ``isComplete: true`` and a ``completedDate`` for both
      "UAT-Task-Complete" and the task completed directly in Outlook

   4. **When** the tester adds the task "UAT-Task-Refresh" in Outlook, waits
      for the next heartbeat tick and invokes ``jarvis_pim_task`` with
      ``action: "get"``
      **Then** the returned list contains "UAT-Task-Refresh"

   Finally the tester removes "UAT-Task-Complete" and "UAT-Task-Refresh" in
   Outlook.
