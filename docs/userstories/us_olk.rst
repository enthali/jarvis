Outlook User Stories
====================

.. story:: Outlook Category Sync
   :id: US_OLK_CATEGORIES
   :status: draft
   :priority: mandatory
   :links: US_AUT_HEARTBEAT

   **As a** Jarvis User,
   **I want** Outlook categories automatically maintained for my projects and events
   via a pluggable provider architecture,
   **so that** I can use Outlook's native categorisation to organise emails, tasks,
   and calendar items by project or event.

   **Acceptance Criteria:**

   * AC-1: A ``CategoryService`` manages one or more category providers behind a
     common ``ICategoryProvider`` interface (Strategy Pattern) — enabling future
     alternative sources (e.g. Gmail Labels)
   * AC-2: An ``OutlookCategoryProvider`` reads and writes Outlook categories via
     COM/PowerShell (``child_process``), Windows + Outlook Classic only
   * AC-3: Categories are cached in RAM via a generic ``DomainCache<T>`` interface
     (``get``, ``invalidate``, ``refresh``) reusable for all Outlook domains
   * AC-4: Cache refresh runs via the heartbeat scheduler at the configured scan interval
   * AC-5: The provider is stateless — cache management lives in the ``CategoryService``
   * AC-6: A setting ``jarvis.outlookEnabled`` (default: ``false``) controls whether
     Outlook COM integration is active; when disabled, no COM calls are made and all
     Outlook features are hidden
   * AC-7: A colour heuristic assigns category colours: names containing "Project" →
     blue, names containing "Event" → pink, otherwise no colour
   * AC-8: Each cache entry carries a ``source`` tag identifying which provider
     supplied it


.. story:: Outlook Category Management Tool (LM/MCP)
   :id: US_OLK_CATTOOL
   :status: draft
   :priority: mandatory
   :links: US_OLK_CATEGORIES; US_MSG_MCPSERVER

   **As a** LLM agent working in a Jarvis workspace,
   **I want** a tool to get, set, and delete Outlook categories,
   **so that** automation workflows can manage categories programmatically.

   **Acceptance Criteria:**

   * AC-1: A Language Model Tool ``jarvis_outlookCategory`` is available in the
     Chat tool picker
   * AC-2: The tool accepts ``action: "get" | "set" | "delete"``, optional
     ``name``, ``filter``, and ``provider`` parameters
   * AC-3: ``get`` without filter returns all categories from cache; with filter
     returns only categories matching the prefix or source
   * AC-4: ``set`` creates or updates a category; without ``provider`` the
     operation is broadcast to all providers
   * AC-5: ``delete`` removes a category; without ``provider`` the operation is
     broadcast to all providers
   * AC-6: The tool does NOT enforce naming conventions — that is the caller's
     responsibility
   * AC-7: The tool is also available via the MCP server (dual registration via
     ``registerDualTool()``)
   * AC-8: When ``jarvis.outlookEnabled`` is ``false``, the tool returns an error
     explaining that Outlook integration is disabled


.. story:: Categories Sidebar View
   :id: US_OLK_CATVIEW
   :status: draft
   :priority: optional
   :links: US_OLK_CATEGORIES; US_EXP_SIDEBAR

   **As a** Jarvis User,
   **I want** a sidebar view listing all Outlook categories,
   **so that** I can see which categories exist, verify sync state, and manage
   categories during initial setup and UAT.

   **Acceptance Criteria:**

   * AC-1: A "Categories" tree view appears in the Jarvis sidebar when Outlook
     is enabled
   * AC-2: Each category is shown as a leaf node with its name and source tag
   * AC-3: A refresh button in the title bar triggers an immediate cache refresh
   * AC-4: The view is controlled by ``jarvis.outlook.showCategories``
     (default: ``true`` when ``outlookEnabled`` is active)
   * AC-5: When ``jarvis.outlookEnabled`` is ``false``, the view is hidden
     regardless of the ``showCategories`` setting
