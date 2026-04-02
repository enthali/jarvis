Explorer Design Specifications
===============================

.. spec:: Extension Manifest & Activation
   :id: SPEC_EXP_EXTENSION
   :status: implemented
   :links: REQ_EXP_ACTIVITYBAR, REQ_CFG_FOLDERPATHS, REQ_CFG_SCANINTERVAL

   **Description:**
   The extension is scaffolded as a standard VS Code TypeScript extension.

   **Manifest (package.json):**

   * ``name``: ``jarvis``
   * ``displayName``: ``Jarvis``
   * ``activationEvents``: ``onView:jarvisProjects``, ``onView:jarvisEvents``
   * ``contributes.viewsContainers.activitybar``: One entry with id ``jarvis-explorer``,
     title ``Jarvis``, and a custom icon (``resources/jarvis.svg``)
   * ``contributes.views.jarvis-explorer``: Two views — ``jarvisProjects`` (title "Projects")
     and ``jarvisEvents`` (title "Events")

   **Activation:**
   The extension activates lazily when either tree view becomes visible.
   The ``activate()`` function registers both TreeDataProviders.

   **Project structure:**

   .. code-block:: text

      src/
        extension.ts          — activate/deactivate entry point
        projectTreeProvider.ts — TreeDataProvider for projects
        eventTreeProvider.ts   — TreeDataProvider for events
      resources/
        jarvis.svg            — Activity Bar icon
      package.json
      tsconfig.json


.. spec:: Tree Data Providers
   :id: SPEC_EXP_PROVIDER
   :status: implemented
   :links: REQ_EXP_TREEVIEW, REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE

   **Description:**
   Two classes implement ``vscode.TreeDataProvider<TreeItem>``:

   * ``ProjectTreeProvider`` — returns hardcoded project items
   * ``EventTreeProvider`` — returns hardcoded event items

   Both providers follow the same pattern:

   * ``getTreeItem(element)``: Returns the element directly (it is already a TreeItem)
   * ``getChildren(element)``: If no parent, returns the list of root-level items.
     Items are leaf nodes (no children).

   **TreeItem properties:**

   * ``label``: The item name (e.g. "Project: Auto Strategy")
   * ``collapsibleState``: ``None`` (leaf items)
   * ``contextValue``: ``"project"`` or ``"event"`` (for future context menus)

   **Dummy data:**

   Projects:

   * "Project: Auto Strategy"
   * "Project: Cloud Migration"
   * "Project: Partner Portal"

   Events:

   * "Event: embedded world"
   * "Event: CES 2027"


.. spec:: YAML Scanner Service
   :id: SPEC_EXP_SCANNER
   :status: implemented
   :links: REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE

   **Description:**
   New file `src/yamlScanner.ts` — a self-contained background scanner service.

   `YamlScanner` holds two string-array caches (project names, event names) and
   a `NodeJS.Timeout` timer. Its public interface:

   * `constructor(onCacheChanged: () => void)`
   * `start(projectsFolder: string, eventsFolder: string, intervalSec: number): void`
     — clears any existing timer, starts `setInterval` at `max(20, intervalSec) * 1000 ms`,
     and immediately invokes `_scan()` for the first run.
   * `stop(): void` — clears the timer.
   * `getProjects(): string[]` / `getEvents(): string[]` — return cached names.

   `_scan()` is `async`: reads all `.yaml`/`.yml` files from both folders via
   `fs.promises`, parses each with `js-yaml`, extracts the `name` field,
   skips files that fail to parse or lack `name`. Compares result to current cache —
   fires `onCacheChanged()` only when the content differs.

   Dependency: `js-yaml` added to `package.json` dependencies.

   <!-- Implementation: SPEC_EXP_SCANNER -->
   <!-- Requirements: REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE -->
