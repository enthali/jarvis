PIM Requirements
================

.. req:: Category Provider Interface (Strategy Pattern)
   :id: REQ_PIM_PROVIDER
   :status: implemented
   :priority: mandatory
   :links: US_PIM_CATEGORIES

   **Description:**
   The extension SHALL define a common ``ICategoryProvider`` interface that all
   category sources implement. The interface enables a Strategy Pattern where
   providers are interchangeable and new sources can be added without modifying
   the orchestration layer.

   **Acceptance Criteria:**

   * AC-1: The interface SHALL define ``source: string`` — a unique identifier
     for the provider
   * AC-2: The interface SHALL define ``getCategories(): Promise<Category[]>``
     to read all categories from the source
   * AC-3: The interface SHALL define
     ``setCategory(name: string, color: number): Promise<void>`` to create or
     update a category
   * AC-4: The interface SHALL define
     ``deleteCategory(name: string): Promise<void>`` to remove a category
   * AC-5: The interface SHALL define
     ``renameCategory(oldName: string, newName: string): Promise<void>`` to
     rename a category
   * AC-6: Each ``Category`` object SHALL carry a ``source`` tag identifying
     which provider supplied it
   * AC-7: Each ``Category`` object MAY carry an optional ``id`` field
     containing the provider-specific unique identifier; operations (delete,
     rename) SHALL prefer ``id`` over ``name`` when available


.. req:: Generic Domain Cache
   :id: REQ_PIM_CACHE
   :status: implemented
   :priority: mandatory
   :links: US_PIM_CATEGORIES; REQ_AUT_SCHEDULER

   **Description:**
   The extension SHALL provide a generic ``DomainCache<T>`` mechanism for
   in-memory caching of domain data (starting with categories). The cache SHALL
   be refreshable via the heartbeat scheduler.

   **Acceptance Criteria:**

   * AC-1: The cache SHALL expose ``get(): T | undefined`` to retrieve cached data
   * AC-2: The cache SHALL expose ``invalidate(): void`` to clear cached data
   * AC-3: The cache SHALL expose ``refresh(): Promise<T>`` to reload data from
     the source and update the cache
   * AC-4: Cache refresh SHALL be triggerable via a heartbeat job at the
     configured scan interval
   * AC-5: The cache SHALL be generic (``DomainCache<T>``) so it can be reused
     for future PIM domains (Tasks, Calendar, Contacts)


.. req:: Category Service
   :id: REQ_PIM_SERVICE
   :status: implemented
   :priority: mandatory
   :links: US_PIM_CATEGORIES; REQ_PIM_PROVIDER; REQ_PIM_CACHE

   **Description:**
   The extension SHALL provide a ``CategoryService`` that manages an array of
   category providers and a domain cache, orchestrating fan-out writes and
   merged reads.

   **Acceptance Criteria:**

   * AC-1: The service SHALL manage one or more ``ICategoryProvider`` instances
   * AC-2: ``get`` operations SHALL return cached data; cache-miss SHALL trigger
     a cache refresh from all providers, merging results
   * AC-3: ``set`` without ``provider`` parameter SHALL broadcast to all
     providers; with ``provider`` SHALL target only the named provider
   * AC-4: ``delete`` without ``provider`` parameter SHALL broadcast to all
     providers; with ``provider`` SHALL target only the named provider
   * AC-5: ``rename`` without ``provider`` parameter SHALL broadcast to all
     providers; with ``provider`` SHALL target only the named provider
   * AC-6: After ``set``, ``delete``, or ``rename``, the cache SHALL be
     invalidated so the next ``get`` fetches fresh data
   * AC-7: The service SHALL own the cache — providers are stateless


.. req:: Category Management Tool (LM/MCP)
   :id: REQ_PIM_CATTOOL
   :status: implemented
   :priority: mandatory
   :links: US_PIM_CATTOOL; REQ_PIM_SERVICE; REQ_MSG_MCPSERVER

   **Description:**
   The extension SHALL register a ``jarvis_category`` tool available via
   both Language Model API and MCP server for programmatic category management.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept ``action: "get" | "set" | "delete" | "rename"``
   * AC-2: The tool SHALL accept optional ``name`` (string), ``filter``
     (string), ``provider`` (string), ``oldName`` (string), and ``newName``
     (string) parameters
   * AC-3: ``get`` without filter SHALL return all categories from cache; with
     filter SHALL return categories matching the prefix or source
   * AC-4: ``set`` SHALL create or update a category via ``CategoryService``
   * AC-5: ``delete`` SHALL remove a category via ``CategoryService``
   * AC-6: ``rename`` SHALL rename a category via ``CategoryService``;
     requires both ``oldName`` and ``newName`` parameters
   * AC-7: The tool SHALL NOT enforce naming conventions — that is the caller's
     responsibility
   * AC-8: The tool SHALL be registered via ``registerDualTool()`` for
     simultaneous LM and MCP availability
   * AC-9: When no category providers are configured, the tool SHALL return
     an informational error message


.. req:: Categories Sidebar Tree View
   :id: REQ_PIM_CATVIEW
   :status: implemented
   :priority: optional
   :links: US_PIM_CATVIEW; REQ_PIM_SERVICE; REQ_EXP_TREEVIEW

   **Description:**
   The extension SHALL provide a "Categories" tree view in the Jarvis sidebar
   displaying all cached categories from all configured providers.

   **Acceptance Criteria:**

   * AC-1: A "Categories" tree view SHALL appear in the Jarvis sidebar as the
     5th section when ``jarvis.pim.showCategories`` is ``true``
   * AC-2: Each category SHALL be displayed as a leaf node with its name and
     source tag
   * AC-3: A refresh button (``$(refresh)``) in the title bar SHALL trigger an
     immediate cache refresh
   * AC-4: The view SHALL be controlled by ``jarvis.pim.showCategories``
     (default: ``true``)
   * AC-5: When no providers are configured, the view SHALL display
     "no categories"
   * AC-6: The ``when``-clause SHALL be:
     ``config.jarvis.pim.showCategories == true``
   * AC-7: A context menu on category nodes (``contextValue: jarvisCategory``)
     SHALL offer "Rename Category" — opening an input box pre-filled with
     the current name, then renaming via ``CategoryService``
   * AC-8: A context menu on category nodes SHALL offer "Delete Category" —
     showing a confirmation dialog, then deleting via ``CategoryService``
   * AC-9: Both context menu commands SHALL be hidden from the Command Palette


.. req:: Task Provider Interface (Strategy Pattern)
   :id: REQ_PIM_TASKPROVIDER
   :status: implemented
   :priority: mandatory
   :links: US_PIM_TASKS

   **Description:**
   The extension SHALL define a common ``ITaskProvider`` interface that all
   task sources implement, enabling a Strategy Pattern for interchangeable
   task providers.

   **Acceptance Criteria:**

   * AC-1: The interface SHALL define ``source: string`` — a unique provider
     identifier
   * AC-2: The interface SHALL define ``getTasks(): Promise<Task[]>`` to read
     all tasks from the source
   * AC-3: The interface SHALL define ``setTask(task: Partial<Task>): Promise<Task>``
     to create a new task
   * AC-4: The interface SHALL define
     ``modifyTask(id: string, changes: Partial<Task>): Promise<void>``
     to update an existing task
   * AC-5: The interface SHALL define ``deleteTask(id: string): Promise<void>``
     to remove a task
   * AC-6: The ``Task`` model SHALL include: ``id`` (string), ``subject``
     (string), ``dueDate?`` (ISO date string), ``status`` (enum of 5 values),
     ``priority`` (enum of 3 values), ``isComplete`` (boolean), ``completedDate?``
     (read-only string), ``body?`` (optional string, on-demand only),
     ``categories`` (string[]), and ``source`` (string)
   * AC-7: ``completedDate`` SHALL be read-only — it is a side-effect of
     setting ``isComplete: true``; providers MUST NOT accept direct writes to it


.. req:: Task Service + Domain Cache
   :id: REQ_PIM_TASKSERVICE
   :status: implemented
   :priority: mandatory
   :links: US_PIM_TASKS; REQ_PIM_TASKPROVIDER; REQ_PIM_CACHE

   **Description:**
   The extension SHALL provide a ``TaskService`` that manages an array of task
   providers and a ``DomainCache<Task[]>``.

   **Note (v1):** ``setTask`` / ``modifyTask`` / ``deleteTask`` target the **first
   registered provider only**. Multi-provider fan-out will be introduced when a
   second ``ITaskProvider`` is added.

   **Acceptance Criteria:**

   * AC-1: The service SHALL manage one or more ``ITaskProvider`` instances
   * AC-2: ``getTasks(filter?)`` SHALL return cached data; cache-miss SHALL
     trigger a refresh; filters: ``category`` (string), ``status`` (string),
     ``dueBefore`` (ISO date string)
   * AC-3: ``setTask`` / ``modifyTask`` / ``deleteTask`` SHALL delegate to the
     **first registered provider** and immediately call ``cache.invalidate()`` + ``cache.refresh()``
     (single-provider by design in v1; multi-provider fan-out deferred)
   * AC-4: The service SHALL expose ``hasProviders(): boolean``
   * AC-5: Cache refresh SHALL be schedulable via a ``syncTaskRefreshJob()``
     helper (analogous to ``syncCategoryRefreshJob()``) that registers a
     ``"Jarvis: Task Refresh"`` heartbeat job when providers are available and
     ``scanInterval > 0``


.. req:: Task Editor (Custom Editor)
   :id: REQ_PIM_TASKEDITOR
   :status: implemented
   :priority: mandatory
   :links: US_PIM_TASKS; REQ_PIM_TASKSERVICE

   **Description:**
   The extension SHALL provide a ``TaskEditorProvider`` that opens a Custom
   Editor when the user clicks a task tree node, enabling inline task editing.

   **Acceptance Criteria:**

   * AC-1: The editor SHALL be a VS Code Custom Editor (``CustomEditorProvider``),
     NOT a Webview panel
   * AC-2: Editable fields: ``subject`` (text input), ``body`` (textarea),
     ``dueDate`` (date picker — leaving empty is supported; clearing an existing
     date is not supported in v1), ``status`` (dropdown), ``priority`` (dropdown),
     ``categories`` (multi-select from ``CategoryService.getCategories()`` cache)
   * AC-3: Read-only display fields: ``source`` (provider badge),
     ``completedDate`` (shown as read-only text whenever the task is completed,
     displaying ``—`` when the completed date value is empty)
   * AC-4: An "Open in Outlook" button is **not implemented in v1**; task
     editing stays entirely inside the VS Code custom editor
   * AC-5: Field changes SHALL auto-save via ``TaskService.modifyTask()`` →
     provider → cache invalidate + immediate refresh; ``status``, ``priority``,
     ``dueDate``, and ``categories`` save immediately on DOM ``change``;
     ``subject`` and ``body`` use a 300 ms debounce on DOM ``input``


.. req:: Task Management Tool (LM/MCP)
   :id: REQ_PIM_TASKTOOL
   :status: implemented
   :priority: mandatory
   :links: US_PIM_TASKS; REQ_PIM_TASKSERVICE; REQ_MSG_MCPSERVER

   **Description:**
   The extension SHALL register a ``jarvis_task`` tool available via both
   Language Model API and MCP server for programmatic task management.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept ``action: "get" | "set" | "modify" | "delete"``
   * AC-2: ``get`` SHALL accept optional ``category`` (string), ``status``
     (string), ``dueBefore`` (ISO date), and ``includeBody`` (boolean,
     default ``false``) parameters
   * AC-3: ``set`` SHALL accept ``subject``, ``body``, ``dueDate``, ``priority``,
     ``isComplete``, ``categories``, and optional ``provider`` parameters;
     **due date deletion (setting to empty) is not supported in v1** — the field
     can only be set or changed, not cleared
   * AC-4: ``modify`` SHALL accept ``id`` (required) plus any subset of the
     writable ``Task`` fields; ``completedDate`` SHALL be rejected if supplied
   * AC-5: ``delete`` SHALL accept ``id`` (required)
   * AC-6: Without ``provider`` the operation targets the **first registered provider**
     (single-provider by design in v1); multi-provider fan-out is deferred
   * AC-7: The tool SHALL be registered via ``registerDualTool()`` for
     simultaneous LM and MCP availability
   * AC-8: When no task providers are configured, the tool SHALL return an
     informational error message
