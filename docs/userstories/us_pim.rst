PIM User Stories
================

.. story:: Category Sync via Exchangeable Providers
   :id: US_PIM_CATEGORIES
   :status: implemented
   :priority: mandatory
   :links: US_AUT_HEARTBEAT

   **As a** Jarvis User,
   **I want** categories automatically maintained for my projects and events
   via a pluggable provider architecture,
   **so that** I can use external PIM system categorisation (Outlook, Gmail, etc.)
   to organise items by project or event.

   **Acceptance Criteria:**

   * AC-1: A ``CategoryService`` manages one or more category providers behind a
     common ``ICategoryProvider`` interface (Strategy Pattern) — enabling
     alternative sources (e.g. Outlook Categories, Gmail Labels)
   * AC-2: Categories are cached in RAM via a generic ``DomainCache<T>`` interface
     (``get``, ``invalidate``, ``refresh``) reusable for all PIM domains
   * AC-3: Cache refresh runs via the heartbeat scheduler at the configured scan interval
   * AC-4: The provider is stateless — cache management lives in the ``CategoryService``
   * AC-5: Each cache entry carries a ``source`` tag identifying which provider
     supplied it


.. story:: Category Management Tool (LM/MCP)
   :id: US_PIM_CATTOOL
   :status: implemented
   :priority: mandatory
   :links: US_PIM_CATEGORIES; US_MSG_MCPSERVER

   **As a** LLM agent working in a Jarvis workspace,
   **I want** a tool to get, set, delete, and rename categories,
   **so that** automation workflows can manage categories programmatically.

   **Acceptance Criteria:**

   * AC-1: A Language Model Tool ``jarvis_category`` is available in the
     Chat tool picker
   * AC-2: The tool accepts ``action: "get" | "set" | "delete" | "rename"``,
     optional ``name``, ``filter``, ``provider``, ``oldName``, and ``newName``
     parameters
   * AC-3: ``get`` without filter returns all categories from cache; with filter
     returns only categories matching the prefix or source
   * AC-4: ``set`` creates or updates a category; without ``provider`` the
     operation is broadcast to all providers
   * AC-5: ``delete`` removes a category; without ``provider`` the operation is
     broadcast to all providers
   * AC-6: ``rename`` renames a category from ``oldName`` to ``newName``;
     without ``provider`` the operation is broadcast to all providers
   * AC-7: The tool does NOT enforce naming conventions — that is the caller's
     responsibility
   * AC-8: The tool is also available via the MCP server (dual registration via
     ``registerDualTool()``)
   * AC-9: When no category providers are configured, the tool returns an error
     explaining that no PIM providers are available


.. story:: Categories Sidebar View
   :id: US_PIM_CATVIEW
   :status: implemented
   :priority: optional
   :links: US_PIM_CATEGORIES; US_EXP_SIDEBAR

   **As a** Jarvis User,
   **I want** a sidebar view listing all categories from all configured providers,
   **so that** I can see which categories exist, verify sync state, and manage
   categories during initial setup and UAT.

   **Acceptance Criteria:**

   * AC-1: A "Categories" tree view appears in the Jarvis sidebar when
     ``jarvis.pim.showCategories`` is ``true``
   * AC-2: Each category is shown as a leaf node with its name and source tag
   * AC-3: A refresh button in the title bar triggers an immediate cache refresh
   * AC-4: The view is controlled by ``jarvis.pim.showCategories``
     (default: ``true``)
   * AC-5: When no providers are configured, the view shows "no categories"
   * AC-6: Right-clicking a category node offers "Rename Category" — shows an
     input box pre-filled with the current name, then renames via
     ``CategoryService``
   * AC-7: Right-clicking a category node offers "Delete Category" — shows a
     confirmation dialog, then deletes via ``CategoryService``


.. story:: Task Sync via Exchangeable Task Providers
   :id: US_PIM_TASKS
   :status: approved
   :priority: mandatory
   :links: US_AUT_HEARTBEAT; US_EXP_SIDEBAR; US_PIM_CATEGORIES

   **As a** Jarvis User,
   **I want** my tasks automatically cached and displayed per project/event via a
   pluggable provider architecture,
   **so that** I can manage my work items project-oriented directly in the Jarvis
   explorer without switching to a dedicated task application.

   **Acceptance Criteria:**

   * AC-1: A ``TaskService`` manages one or more task providers behind a common
     ``ITaskProvider`` interface (Strategy Pattern) — enabling alternative sources
     (e.g. Outlook Tasks, Gmail Tasks)
   * AC-2: Tasks are cached in RAM via the existing generic ``DomainCache<T>``
     mechanism; cache refresh runs via the heartbeat scheduler at the configured
     scan interval
   * AC-3: The provider is stateless — cache management lives in ``TaskService``
   * AC-4: ``TaskService.getTasks(filter?)`` returns cached tasks; filters include
     ``category``, ``status``, and ``dueBefore``
   * AC-5: ``TaskService.setTask``, ``modifyTask``, and ``deleteTask`` delegate to
     the provider and immediately invalidate + refresh the cache
   * AC-6: A ``TaskEditorProvider`` Custom Editor opens when the user clicks a task
     node; editable fields are ``subject``, ``body``, ``dueDate``, ``status``,
     ``priority``, and ``categories`` (multi-select from cached categories);
     ``source`` and ``completedDate`` are read-only
   * AC-7: Save flow calls ``TaskService.modifyTask()`` → provider → cache invalidate
     + refresh
   * AC-8: A ``jarvis_task`` LM/MCP tool is registered via ``registerDualTool()``
     supporting ``get``, ``set``, ``modify``, and ``delete`` actions
