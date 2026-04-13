Outlook Requirements
====================

.. req:: Category Provider Interface (Strategy Pattern)
   :id: REQ_OLK_PROVIDER
   :status: draft
   :priority: mandatory
   :links: US_OLK_CATEGORIES

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
   * AC-5: Each ``Category`` object SHALL carry a ``source`` tag identifying
     which provider supplied it


.. req:: Generic Domain Cache
   :id: REQ_OLK_CACHE
   :status: draft
   :priority: mandatory
   :links: US_OLK_CATEGORIES; REQ_AUT_SCHEDULER

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
     for future Outlook domains (Tasks, Calendar, Contacts)


.. req:: Outlook Category Provider (COM Bridge)
   :id: REQ_OLK_COMBRIDGE
   :status: draft
   :priority: mandatory
   :links: US_OLK_CATEGORIES; REQ_OLK_PROVIDER

   **Description:**
   The extension SHALL provide an ``OutlookCategoryProvider`` that reads and
   writes Outlook categories via COM automation on Windows using PowerShell.

   **Acceptance Criteria:**

   * AC-1: The provider SHALL implement the ``ICategoryProvider`` interface
     with ``source: "outlook"``
   * AC-2: COM calls SHALL be made via ``child_process.execFile`` executing
     PowerShell scripts — no native Node.js COM binding
   * AC-3: The provider SHALL be stateless — it only performs COM calls and
     does not cache results
   * AC-4: The provider SHALL only function on Windows with Outlook Classic
     installed; on other platforms, calls SHALL return empty results or reject
     gracefully
   * AC-5: A colour heuristic SHALL assign category colours: names containing
     "project" (case-insensitive) → ``olCategoryColorBlue`` (8), names
     containing "event" (case-insensitive) → ``olCategoryColorPink`` (10),
     otherwise ``olCategoryColorNone`` (0)


.. req:: Category Service
   :id: REQ_OLK_SERVICE
   :status: draft
   :priority: mandatory
   :links: US_OLK_CATEGORIES; REQ_OLK_PROVIDER; REQ_OLK_CACHE

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
   * AC-5: After ``set`` or ``delete``, the cache SHALL be invalidated so the
     next ``get`` fetches fresh data
   * AC-6: The service SHALL own the cache — providers are stateless


.. req:: Outlook Master Toggle
   :id: REQ_OLK_ENABLE
   :status: draft
   :priority: mandatory
   :links: US_OLK_CATEGORIES; REQ_CFG_SETTINGSGROUPS

   **Description:**
   The extension SHALL provide a boolean setting ``jarvis.outlookEnabled`` that
   controls whether all Outlook integration features are active.

   **Acceptance Criteria:**

   * AC-1: ``jarvis.outlookEnabled`` SHALL be a boolean setting with default
     ``false``
   * AC-2: When ``false``, no COM calls SHALL be made and no Outlook providers
     SHALL be instantiated
   * AC-3: When ``false``, the Categories tree view SHALL be hidden regardless
     of other settings
   * AC-4: When ``false``, the ``jarvis_outlookCategory`` tool SHALL return an
     error explaining that Outlook integration is disabled


.. req:: Category Management Tool (LM/MCP)
   :id: REQ_OLK_CATTOOL
   :status: draft
   :priority: mandatory
   :links: US_OLK_CATTOOL; REQ_OLK_SERVICE; REQ_OLK_ENABLE; REQ_MSG_MCPSERVER

   **Description:**
   The extension SHALL register a ``jarvis_outlookCategory`` tool available via
   both Language Model API and MCP server for programmatic category management.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept ``action: "get" | "set" | "delete"``
   * AC-2: The tool SHALL accept optional ``name`` (string), ``filter``
     (string), and ``provider`` (string) parameters
   * AC-3: ``get`` without filter SHALL return all categories from cache; with
     filter SHALL return categories matching the prefix or source
   * AC-4: ``set`` SHALL create or update a category via ``CategoryService``
   * AC-5: ``delete`` SHALL remove a category via ``CategoryService``
   * AC-6: The tool SHALL NOT enforce naming conventions — that is the caller's
     responsibility
   * AC-7: The tool SHALL be registered via ``registerDualTool()`` for
     simultaneous LM and MCP availability
   * AC-8: When ``jarvis.outlookEnabled`` is ``false``, the tool SHALL return
     an informational error message


.. req:: Categories Sidebar Tree View
   :id: REQ_OLK_CATVIEW
   :status: draft
   :priority: optional
   :links: US_OLK_CATVIEW; REQ_OLK_SERVICE; REQ_OLK_ENABLE; REQ_EXP_TREEVIEW

   **Description:**
   The extension SHALL provide a "Categories" tree view in the Jarvis sidebar
   displaying all cached Outlook categories.

   **Acceptance Criteria:**

   * AC-1: A "Categories" tree view SHALL appear in the Jarvis sidebar as the
     5th section when Outlook is enabled
   * AC-2: Each category SHALL be displayed as a leaf node with its name and
     source tag
   * AC-3: A refresh button (``$(refresh)``) in the title bar SHALL trigger an
     immediate cache refresh
   * AC-4: The view SHALL be controlled by ``jarvis.outlook.showCategories``
     (default: ``true``)
   * AC-5: When ``jarvis.outlookEnabled`` is ``false``, the view SHALL be hidden
     regardless of the ``showCategories`` setting
   * AC-6: The ``when``-clause SHALL be:
     ``config.jarvis.outlookEnabled && config.jarvis.outlook.showCategories``
