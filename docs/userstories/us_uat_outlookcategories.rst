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
