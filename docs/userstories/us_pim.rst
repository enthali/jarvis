PIM User Stories
================

.. story:: Category Sync via Exchangeable Providers
   :id: US_PIM_CATEGORIES
   :status: implemented
   :tracked_by: MOD_PIM
   :priority: mandatory
   :links: US_AUT_HEARTBEAT

   **As a** Jarvis User,
   **I want** categories automatically maintained for my projects and events
   via a pluggable provider architecture,
   **so that** I can use external PIM system categorisation (Outlook, Gmail, etc.)
   to organise items by project or event.

   **Acceptance Criteria:**

   * AC-1: Categories come from one or more exchangeable category providers,
     so that alternative sources (e.g. Outlook Categories, Gmail Labels) can be
     added or swapped without changing how I use categories
   * AC-2: Categories are kept in memory, so that reading them does not ask the
     source every time; the same caching approach serves all PIM domains
   * AC-3: The cache is refreshed by the heartbeat at the configured scan interval
   * AC-4: A provider only reads and writes its own source; keeping the cache is
     not its job
   * AC-5: Each cached category shows which provider supplied it


.. story:: Category Management Tool (LM/MCP)
   :id: US_PIM_CATTOOL
   :status: implemented
   :tracked_by: MOD_PIM
   :priority: mandatory
   :links: US_PIM_CATEGORIES; US_MSG_MCPSERVER

   **As an** Actor,
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
   * AC-8: The tool is also available to MCP clients
   * AC-9: When no category providers are configured, the tool returns an error
     explaining that no PIM providers are available


.. story:: Categories Sidebar View
   :id: US_PIM_CATVIEW
   :status: implemented
   :tracked_by: MOD_PIM
   :priority: optional
   :links: US_PIM_CATEGORIES; US_EXP_SIDEBAR

   **As a** Jarvis User,
   **I want** a sidebar view listing all categories from all configured providers,
   **so that** I can see which categories exist, verify sync state, and manage
   categories during initial setup and UAT.

   **Acceptance Criteria:**

   * AC-1: A "Categories" tree view appears in the Jarvis sidebar while the
     Outlook integration and its categories feature are both turned on
   * AC-2: Each category is shown as a leaf node with its name and source tag
   * AC-3: A refresh button in the title bar triggers an immediate cache refresh
   * AC-4: The view is hidden by default; the user turns it on by turning on
     the categories feature of the Outlook integration
   * AC-5: When no providers are configured, the view shows "no categories"
   * AC-6: Right-clicking a category node offers "Rename Category" — shows an
     input box pre-filled with the current name, then renames the category
   * AC-7: Right-clicking a category node offers "Delete Category" — shows a
     confirmation dialog, then deletes the category


.. story:: Task Sync via Exchangeable Task Providers
   :id: US_PIM_TASKS
   :status: implemented
   :tracked_by: MOD_PIM
   :priority: mandatory
   :links: US_AUT_HEARTBEAT; US_PIM_CATEGORIES

   **As a** Jarvis User,
   **I want** my tasks automatically cached and editable via a pluggable
   provider architecture,
   **so that** I can manage my work items from VS Code without switching to a
   dedicated task application.

   *Note (retire-legacy-actor-kinds):* the task display under Project/Event
   nodes is removed with those kinds. Where tasks appear in the Jarvis tree
   again, and how the user opens the task editor from there, is open and
   decided in a separate PIM change.

   **Acceptance Criteria:**

   * AC-1: Tasks come from one or more exchangeable task providers, so that
     alternative sources (e.g. Outlook Tasks, Gmail Tasks) can be added or
     swapped without changing how I use tasks
   * AC-2: Tasks are kept in memory in the same way as categories; the cache is
     refreshed by the heartbeat at the configured scan interval
   * AC-3: A provider only reads and writes its own source; keeping the cache is
     not its job
   * AC-4: The cached tasks can be listed and filtered by category, status, and
     due date
   * AC-5: Creating, changing, and deleting a task is passed on to its provider,
     and the cached tasks are up to date immediately afterwards
   * AC-6: A single task opens in a custom editor; its editable fields are
     subject, body, due date, status, priority, and categories (multi-select
     from the cached categories); the source and the completion date are
     read-only
   * AC-7: Saving in the editor changes the task in its provider, and the cached
     tasks are up to date immediately afterwards
   * AC-8: A ``jarvis_task`` tool, available to language models and MCP clients,
     supports ``get``, ``set``, ``modify``, and ``delete`` actions
   * AC-9: Outlook as a task source is off by default; the user turns on the
     Outlook integration and, separately, its tasks feature, and the tasks
     feature can be turned off without turning off the Outlook integration
