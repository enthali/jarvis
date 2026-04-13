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
     ``config.jarvis.pim.showCategories``
   * AC-7: A context menu on category nodes (``contextValue: jarvisCategory``)
     SHALL offer "Rename Category" — opening an input box pre-filled with
     the current name, then renaming via ``CategoryService``
   * AC-8: A context menu on category nodes SHALL offer "Delete Category" —
     showing a confirmation dialog, then deleting via ``CategoryService``
   * AC-9: Both context menu commands SHALL be hidden from the Command Palette
