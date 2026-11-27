PIM Design Specifications
=========================

.. spec:: ICategoryProvider Interface
   :id: SPEC_PIM_IFACE
   :status: implemented
   :links: REQ_PIM_PROVIDER

   **Description:**
   File ``src/pim/ICategoryProvider.ts`` defines the Strategy
   Pattern contract for category sources.

   **TypeScript interfaces:**

   .. code-block:: typescript

      export interface Category {
          id?: string;         // provider-specific unique ID (e.g. Outlook CategoryID)
          name: string;
          color: number;       // provider-specific colour value (0 = none)
          source: string;      // provider identifier (e.g. "outlook")
      }

      export interface ICategoryProvider {
          readonly source: string;
          getCategories(): Promise<Category[]>;
          setCategory(name: string, color: number): Promise<void>;
          deleteCategory(name: string): Promise<void>;
          renameCategory(oldName: string, newName: string): Promise<void>;
      }

   **Design notes:**

   * ``color`` uses integer values. The Outlook provider maps to
     ``OlCategoryColor`` enum (0 = none, 8 = blue, 10 = pink, etc.).
     Other provider implementations may map their own colour systems
     to these values or use 0.
   * ``id`` is optional — not all providers have internal unique IDs.
     When present, operations (delete, rename) SHOULD prefer ``id`` over
     ``name`` for provider dispatch. Name-based lookup remains the fallback.
   * ``source`` is set by each provider implementation (e.g. ``"outlook"``);
     callers use it for filtering and targeted operations.


.. spec:: DomainCache<T> Implementation
   :id: SPEC_PIM_CACHE
   :status: implemented
   :links: REQ_PIM_CACHE

   **Description:**
   File ``src/pim/DomainCache.ts`` implements a generic in-memory
   cache with a refresh callback.

   **TypeScript implementation:**

   .. code-block:: typescript

      export class DomainCache<T> {
          private _data: T | undefined;
          private _refreshFn: () => Promise<T>;

          constructor(refreshFn: () => Promise<T>) {
              this._refreshFn = refreshFn;
          }

          get(): T | undefined {
              return this._data;
          }

          invalidate(): void {
              this._data = undefined;
          }

          async refresh(): Promise<T> {
              this._data = await this._refreshFn();
              return this._data;
          }
      }

   **Design notes:**

   * The ``refreshFn`` is injected by ``CategoryService`` and calls all
     providers' ``getCategories()`` sequentially, merging results
   * ``invalidate()`` clears data; next ``get()`` returns ``undefined`` —
     the caller (``CategoryService.getCategories()``) auto-refreshes on
     cache miss
   * Thread safety is not required — VS Code extension host is single-threaded


.. spec:: CategoryService Orchestrator
   :id: SPEC_PIM_SERVICE
   :status: implemented
   :links: REQ_PIM_SERVICE; SPEC_PIM_IFACE; SPEC_PIM_CACHE

   **Description:**
   File ``src/pim/CategoryService.ts`` manages providers and cache.

   **TypeScript implementation:**

   .. code-block:: typescript

      import { Category, ICategoryProvider } from './ICategoryProvider';
      import { DomainCache } from './DomainCache';

      export class CategoryService {
          private _providers: ICategoryProvider[] = [];
          private _cache: DomainCache<Category[]>;
          private _log: vscode.LogOutputChannel;

          constructor(log: vscode.LogOutputChannel) {
              this._log = log;
              this._cache = new DomainCache<Category[]>(
                  () => this._fetchAll()
              );
          }

          addProvider(provider: ICategoryProvider): void {
              this._providers.push(provider);
          }

          hasProviders(): boolean {
              return this._providers.length > 0;
          }

          async getCategories(filter?: string): Promise<Category[]> {
              let cats = this._cache.get();
              if (!cats) {
                  cats = await this._cache.refresh();
              }
              if (filter) {
                  const f = filter.toLowerCase();
                  return cats.filter(c =>
                      c.name.toLowerCase().startsWith(f) ||
                      c.source.toLowerCase() === f
                  );
              }
              return cats;
          }

          async setCategory(
              name: string,
              color: number,
              provider?: string
          ): Promise<void> {
              const targets = provider
                  ? this._providers.filter(p => p.source === provider)
                  : this._providers;
              for (const p of targets) {
                  await p.setCategory(name, color);
              }
              this._cache.invalidate();
          }

          async deleteCategory(
              name: string,
              provider?: string,
              id?: string
          ): Promise<void> {
              const targets = provider
                  ? this._providers.filter(p => p.source === provider)
                  : this._providers;
              for (const p of targets) {
                  await p.deleteCategory(id ?? name);
              }
              this._cache.invalidate();
          }

          async renameCategory(
              oldName: string,
              newName: string,
              provider?: string,
              id?: string
          ): Promise<void> {
              const targets = provider
                  ? this._providers.filter(p => p.source === provider)
                  : this._providers;
              for (const p of targets) {
                  await p.renameCategory(id ?? oldName, newName);
              }
              this._cache.invalidate();
          }

          async refresh(): Promise<Category[]> {
              return this._cache.refresh();
          }

          invalidate(): void {
              this._cache.invalidate();
          }

          private async _fetchAll(): Promise<Category[]> {
              const results: Category[] = [];
              for (const p of this._providers) {
                  try {
                      const cats = await p.getCategories();
                      results.push(...cats);
                  } catch (e) {
                      this._log.error(
                          `[PIM] Provider ${p.source} failed: ${e}`
                      );
                  }
              }
              return results;
          }
      }

   **Heartbeat-triggered cache refresh:**

   A ``syncCategoryRefreshJob()`` helper
   registers a ``"Jarvis: Category Refresh"`` heartbeat job when
   ``categoryService`` has providers and ``scanInterval > 0``:

   .. code-block:: typescript

      function syncCategoryRefreshJob(): void {
          if (!categoryService || !categoryService.hasProviders()) {
              scheduler.unregisterJob('Jarvis: Category Refresh');
              return;
          }
          const interval = vscode.workspace
              .getConfiguration('jarvis')
              .get<number>('scanInterval', 2);
          if (interval > 0) {
              const job: HeartbeatJob = {
                  name: 'Jarvis: Category Refresh',
                  schedule: `*/${interval} * * * *`,
                  steps: [{ type: 'command', run: 'jarvis.refreshCategories' }]
              };
              scheduler.registerJob(job);
              log.info(
                `[PIM] registered refresh job: */${interval} * * * *`
              );
          } else {
              scheduler.unregisterJob('Jarvis: Category Refresh');
              log.info('[PIM] unregistered refresh job (interval=0)');
          }
      }

   Called once during activation after providers are added, and from the
   ``onDidChangeConfiguration`` handler when ``jarvis.scanInterval`` changes.

   **Design notes:**

   * ``_fetchAll()`` iterates providers sequentially — parallel execution is
     unnecessary given the expected small number of providers; errors are caught
     per-provider so one failing provider does not block others
   * ``setCategory`` / ``deleteCategory`` iterate targets sequentially for
     deterministic ordering
   * After write operations, only ``invalidate()`` is called — the next
     ``getCategories()`` call triggers a fresh ``refresh()``
   * ``renameCategory`` delegates to each provider's ``renameCategory()`` —
     provider implementations decide how to perform the rename (e.g. Outlook
     COM deletes + re-creates)
   * ``deleteCategory`` and ``renameCategory`` accept an optional ``id``
     parameter; when present, ``id`` is passed to the provider instead of
     ``name``, enabling lookup by provider-specific ID
   * ``hasProviders()`` is used by the tool guard and heartbeat refresh to
     determine whether the PIM layer is operational


.. spec:: jarvis_pim_category Tool
   :id: SPEC_PIM_CATTOOL
   :status: implemented
   :links: REQ_PIM_CATTOOL; SPEC_PIM_SERVICE; SPEC_ENG_REGISTER_TOOL; SPEC_MOD_MCP_PKG; REQ_ENG_TOOLREF

   **Description:**
   Register ``jarvis_pim_category`` once through ``api.registerTool()`` in
   ``packages/pim/src/extension.ts``. The MCP extension enumerates the engine's
   tool registry and reads the manifest ``inputSchema`` (``SPEC_MOD_MCP_PKG``), so the
   tool is available to MCP clients without a second handler or a Zod schema.

   **Registration (in ``activate()``):**

   .. code-block:: typescript

      context.subscriptions.push(api.registerTool(
        'jarvis_pim_category',
        'Manage categories: get, set, delete, or rename.',
        async (options, _token) => {
          if (!categoryService || !categoryService.hasProviders()) {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(
                'No category providers configured. '
                + 'Enable jarvis.outlook.enabled and jarvis.outlook.categories.enabled.'
              )
            ]);
          }
          const { action, name, filter, provider, oldName, newName } = options.input;
          let result: object;
          switch (action) {
            case 'get':
              result = {
                categories: await categoryService!.getCategories(filter)
              };
              break;
            case 'set':
              if (!name) throw new Error('name required for set');
              await categoryService!.setCategory(name, 0, provider);
              result = { status: 'ok', name };
              break;
            case 'delete':
              if (!name) throw new Error('name required for delete');
              await categoryService!.deleteCategory(name, provider);
              result = { status: 'ok', name };
              break;
            case 'rename':
              if (!oldName || !newName) throw new Error('oldName and newName required for rename');
              await categoryService!.renameCategory(oldName, newName, provider);
              result = { status: 'ok', oldName, newName };
              break;
            default:
              throw new Error(`Unknown action: ${action}`);
          }
          categoryTreeProvider?.refresh();
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(JSON.stringify(result))
          ]);
        }
      ));

   **package.json tool registration:**

   .. code-block:: json

      {
        "name": "jarvis_pim_category",
        "displayName": "Manage Categories",
        "modelDescription": "jarvis_pim: Manage categories from all configured PIM providers. Actions: get (list/filter categories from cache), set (create/update a category), delete (remove a category), rename (rename a category). When no providers are configured, returns an error.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "jarvis_pim_category",
        "icon": "$(tag)",
        "inputSchema": {
          "type": "object",
          "properties": {
            "action": {
              "type": "string",
              "enum": ["get", "set", "delete", "rename"],
              "description": "The action to perform"
            },
            "name": {
              "type": "string",
              "description": "Category name (required for set/delete)"
            },
            "filter": {
              "type": "string",
              "description": "Filter by name prefix or source (for get)"
            },
            "provider": {
              "type": "string",
              "description": "Target provider (omit to broadcast to all)"
            },
            "oldName": {
              "type": "string",
              "description": "Current category name (required for rename)"
            },
            "newName": {
              "type": "string",
              "description": "New category name (required for rename)"
            }
          },
          "required": ["action"]
        }
      }


.. spec:: CategoryTreeProvider
   :id: SPEC_PIM_CATVIEW
   :status: implemented
   :links: REQ_PIM_CATVIEW; SPEC_PIM_SERVICE; SPEC_OLK_CATENABLE

   **Description:**
   File ``src/pim/CategoryTreeProvider.ts`` implements
   ``vscode.TreeDataProvider<CategoryNode>`` for the "Categories" sidebar view.

   **Node type:**

   .. code-block:: typescript

      type CategoryNode = CategoryLeafNode | EmptyNode;

      interface CategoryLeafNode {
          kind: 'category';
          id?: string;
          name: string;
          source: string;
          color: number;
      }

      interface EmptyNode {
          kind: 'empty';
      }

   **Constructor:**

   .. code-block:: typescript

      constructor(private _service: CategoryService) {}

   **getChildren(element?):**

   * No element (root):

     1. Call ``this._service.getCategories()``
     2. Map each ``Category`` to a ``CategoryLeafNode``
     3. Sort alphabetically by name (case-insensitive)
     4. If empty → return single ``{ kind: 'empty' }``

   * ``CategoryNode`` → return ``[]``

   **getTreeItem(element):**

   * ``kind === 'category'`` → ``TreeItem`` with label = ``name``,
     description = ``[${source}]``, ``collapsibleState = None``,
     ``contextValue = 'jarvisCategory'``
   * ``kind === 'empty'`` → ``TreeItem`` with label = ``no categories``,
     ``collapsibleState = None``

   **refresh():**

   Calls ``this._service.refresh()``, then fires
   ``this._onDidChangeTreeData.fire(undefined)`` to refresh the tree.

   **Context menu command handlers (registered in ``extension.ts``):**

   .. code-block:: typescript

      // jarvis.renameCategory
      vscode.commands.registerCommand(
          'jarvis.renameCategory',
          async (node: CategoryLeafNode) => {
              const newName = await vscode.window.showInputBox({
                  prompt: 'New category name',
                  value: node.name,
                  validateInput: v => v?.trim() ? null : 'Name cannot be empty'
              });
              if (newName && newName !== node.name) {
                  await categoryService.renameCategory(
                      node.name, newName, node.source, node.id
                  );
                  categoryTreeProvider.refresh();
              }
          }
      );

      // jarvis.deleteCategory
      vscode.commands.registerCommand(
          'jarvis.deleteCategory',
          async (node: CategoryLeafNode) => {
              const confirm = await vscode.window.showWarningMessage(
                  `Delete category "${node.name}"?`,
                  { modal: true },
                  'Delete'
              );
              if (confirm === 'Delete') {
                  await categoryService.deleteCategory(
                      node.name, node.source, node.id
                  );
                  categoryTreeProvider.refresh();
              }
          }
      );

   **Manifest additions (package.json):**

   * ``contributes.views.jarvis-explorer``: add 5th view:

     .. code-block:: json

        {
          "id": "jarvisCategories",
          "name": "Categories",
          "when": "config.jarvis.outlook.enabled == true && config.jarvis.outlook.categories.enabled == true"
        }

   * ``contributes.commands``: ``jarvis.refreshCategories``
     (title "Jarvis: Refresh Categories", icon ``$(refresh)``)
   * ``contributes.commands``: ``jarvis.renameCategory``
     (title "Jarvis: Rename Category")
   * ``contributes.commands``: ``jarvis.deleteCategory``
     (title "Jarvis: Delete Category")
   * ``contributes.menus.view/title``: ``jarvis.refreshCategories``
     with ``when: "view == jarvisCategories"`` (group ``navigation``)
   * ``contributes.menus.view/item/context``:

     - ``jarvis.renameCategory`` with
       ``when: "viewItem == jarvisCategory"`` (group ``inline``)
     - ``jarvis.deleteCategory`` with
       ``when: "viewItem == jarvisCategory"``

   * ``contributes.menus.commandPalette``:

     - ``jarvis.refreshCategories`` hidden (``when: "false"``)
     - ``jarvis.renameCategory`` hidden (``when: "false"``)
     - ``jarvis.deleteCategory`` hidden (``when: "false"``)
   * ``activationEvents``: ``onStartupFinished`` and ``onView:jarvisCategories``. The startup event
     is needed because the Actor mail indicators (``SPEC_ACTOR_MAIL``) belong to no view; with the
     view event alone PIM would stay inactive until the opt-in Categories view is opened
     (``REQ_ACTOR_MAIL`` AC-19).

   **Settings:** the Categories view has no setting of its own. It is gated by
   ``jarvis.outlook.categories.enabled`` in the "Jarvis PIM" configuration group
   (``SPEC_OLK_CATENABLE``). The former setting ``jarvis.pim.showCategories``
   and the "PIM" configuration group that held it no longer exist.


.. spec:: ITaskProvider Interface + Task Model
   :id: SPEC_PIM_ITASKPROVIDER
   :status: implemented
   :links: REQ_PIM_TASKPROVIDER

   **Description:**
   File ``src/pim/ITaskProvider.ts`` defines the Strategy Pattern contract
   for task sources and the ``Task`` domain model.

   **TypeScript interfaces:**

   .. code-block:: typescript

      export type TaskStatus =
        | "notStarted" | "inProgress" | "completed"
        | "deferred" | "waitingOnOther";

      export type TaskPriority = "low" | "normal" | "high";

      export interface Task {
          id: string;               // provider-specific unique ID (e.g. Outlook EntryID)
          subject: string;
          dueDate?: string;         // ISO date string (YYYY-MM-DD)
          status: TaskStatus;
          priority: TaskPriority;
          isComplete: boolean;      // explicit completion flag — independent of status
          completedDate?: string;   // read-only; side-effect of isComplete → true
          body?: string;            // optional, loaded on-demand only
          categories: string[];     // link to Jarvis projects/events via category name
          source: string;           // provider identifier (e.g. "outlook")
      }

      export interface ITaskProvider {
          readonly source: string;
          getTasks(): Promise<Task[]>;
          setTask(task: Partial<Task>): Promise<Task>;
          modifyTask(id: string, changes: Partial<Task>): Promise<void>;
          deleteTask(id: string): Promise<void>;
      }

   **Design notes:**

   * ``completedDate`` is never directly writable. Providers MUST NOT accept
     writes to it. Setting ``isComplete: true`` causes the provider to trigger
     native completion (e.g. Outlook sets ``DateCompleted`` automatically).
   * ``body`` is optional and should be loaded on-demand only, not during
     bulk ``getTasks()`` — avoids unnecessary COM roundtrips on large task lists.
   * ``categories`` contains raw category names matching the ``"Project: ..."``
     / ``"Event: ..."`` convention — the tree provider resolves them to tree
     nodes via prefix matching.
   * ``source`` is set by each provider implementation; callers use it for
     filtering and "Open in <source>" actions.


.. spec:: TaskService Orchestrator
   :id: SPEC_PIM_TASKSERVICE
   :status: implemented
   :links: REQ_PIM_TASKSERVICE; SPEC_PIM_ITASKPROVIDER; SPEC_PIM_CACHE

   **Description:**
   File ``src/pim/TaskService.ts`` manages providers and a
   ``DomainCache<Task[]>``, orchestrating fan-out writes and filtered reads.

   **TypeScript implementation:**

   .. code-block:: typescript

      export interface TaskFilter {
          category?: string;
          status?: string;
          dueBefore?: string;   // ISO date string
      }

      export class TaskService {
          private _providers: ITaskProvider[] = [];
          private _cache: DomainCache<Task[]>;

          constructor() {
              this._cache = new DomainCache<Task[]>(
                  () => this._fetchAll()
              );
          }

          addProvider(p: ITaskProvider): void {
              this._providers.push(p);
          }

          hasProviders(): boolean {
              return this._providers.length > 0;
          }

          async getTasks(filter?: TaskFilter): Promise<Task[]> {
              let tasks = this._cache.get();
              if (!tasks) { tasks = await this._cache.refresh(); }
              if (!filter) { return tasks; }
              const catLower = filter.category?.toLowerCase();
              return tasks.filter(t => {
                  if (catLower && !t.categories.some(c => c.toLowerCase().startsWith(catLower))) {
                      return false;
                  }
                  if (filter.status && t.status !== filter.status) { return false; }
                  if (filter.dueBefore && t.dueDate && t.dueDate > filter.dueBefore) {
                      return false;
                  }
                  return true;
              });
          }

          async setTask(task: Partial<Task>, provider?: string): Promise<Task> {
              const targets = this._targets(provider);
              const result = await targets[0].setTask(task);
              this._cache.invalidate();
              await this._cache.refresh();
              return result;
          }

          async modifyTask(
              id: string, changes: Partial<Task>, provider?: string
          ): Promise<void> {
              for (const p of this._targets(provider)) {
                  await p.modifyTask(id, changes);
              }
              // Invalidate synchronously; refresh in background so caller is
              // not blocked by the full provider read-back
              this._cache.invalidate();
              this._cache.refresh().catch(e => console.error(`[TaskService] refresh failed: ${e}`));
          }

          async deleteTask(id: string, provider?: string): Promise<void> {
              for (const p of this._targets(provider)) {
                  await p.deleteTask(id);
              }
              this._cache.invalidate();
              this._cache.refresh().catch(e => console.error(`[TaskService] refresh failed: ${e}`));
          }

          async refresh(): Promise<void> {
              await this._cache.refresh();
          }

          private _targets(provider?: string): ITaskProvider[] {
              if (!provider) { return this._providers; }
              const t = this._providers.find(p => p.source === provider);
              if (!t) { throw new Error(`Unknown provider: ${provider}`); }
              return [t];
          }

          private async _fetchAll(): Promise<Task[]> {
              const results: Task[] = [];
              for (const p of this._providers) {
                  try {
                      results.push(...await p.getTasks());
                  } catch (e) {
                      // log but do not propagate — one failing provider must not
                      // block others
                  }
              }
              return results;
          }
      }

   **Heartbeat-triggered cache refresh (in ``extension.ts``):**

   A ``syncTaskRefreshJob()`` helper (analogous to ``syncCategoryRefreshJob()``)
   registers a ``"Jarvis: Task Refresh"`` heartbeat job when ``taskService``
   has providers and ``scanInterval > 0``:

   .. code-block:: typescript

      function syncTaskRefreshJob(): void {
          if (!taskService || !taskService.hasProviders()) {
              scheduler.unregisterJob('Jarvis: Task Refresh');
              return;
          }
          const interval = vscode.workspace
              .getConfiguration('jarvis')
              .get<number>('scanInterval', 2);
          if (interval > 0) {
              const job: HeartbeatJob = {
                  name: 'Jarvis: Task Refresh',
                  schedule: `*/${interval} * * * *`,
                  steps: [{ type: 'command', run: 'jarvis.refreshTasks' }]
              };
              scheduler.registerJob(job);
          } else {
              scheduler.unregisterJob('Jarvis: Task Refresh');
          }
      }

   Called once during activation after providers are added (fire-and-forget
   initial ``taskService.refresh()`` populates the cache immediately without
   blocking the activation path), and from ``onDidChangeConfiguration`` when
   ``jarvis.scanInterval`` changes.


.. spec:: TaskEditorProvider (Custom Editor)
   :id: SPEC_PIM_TASKEDITOR
   :status: implemented
   :links: REQ_PIM_TASKEDITOR; SPEC_PIM_TASKSERVICE; SPEC_PIM_IFACE

   **Description:**
   File ``src/pim/TaskEditorProvider.ts`` implements a VS Code
   ``CustomEditorProvider`` that opens when the user activates a task tree node.

   **Registration (``extension.ts``):**

   .. code-block:: typescript

      context.subscriptions.push(
          vscode.window.registerCustomEditorProvider(
              TaskEditorProvider.viewType,   // 'jarvis.taskEditor'
              new TaskEditorProvider(taskService, categoryService, log),
              { supportsMultipleEditorsPerDocument: false }
          )
      );

   Task tree nodes set ``command.command = 'vscode.openWith'`` with
   ``command.arguments = [taskUri, 'jarvis.taskEditor']`` where
   ``taskUri`` is a virtual URI of scheme ``task:`` with path
   ``/task.jarvis-task`` and query ``id=<encodedOutlookEntryID>``.
   The ``id`` is placed in the query string (not the authority) to avoid
   URI authority restrictions on long Outlook EntryIDs.

   **HTML layout:**

   * Small ``<div>`` label ``"jarvis task"`` rendered above the ``<h2>`` heading
     (using ``descriptionForeground`` color, font-size 0.8em)
   * ``<h2>`` heading populated from ``task.subject``
   * ``<span class="badge">`` shows ``task.source`` below the heading
   * Editor tab title set to ``task.subject`` via ``webviewPanel.title =
     document.task.subject`` in ``resolveCustomEditor()``

   **Editor fields:**

   * Editable: ``subject`` (text), ``body`` (textarea), ``dueDate`` (date input),
     ``status`` (select: notStarted/inProgress/completed/deferred/waitingOnOther),
     ``priority`` (select: low/normal/high),
     ``categories`` (collapsed multi-select: current selections rendered as tag
     badges; a ``▶ Change…`` / ``▼ Change…`` toggle button reveals the hidden
     ``<select multiple>``; Ctrl+Click selects multiple items; saves immediately
     on ``change``)
   * Read-only: ``source`` (badge label), ``completedDate`` (rendered as a
     read-only table row whenever ``task.isComplete`` is ``true``, showing
     ``—`` when the completed date value is an empty string)
   * No "Open in Outlook" button — task editing stays inside the custom editor
     (not in v1)

   **Save flow:**

   #. User changes an editor field (no explicit save gesture required)
   #. Immediate save: ``status``, ``priority``, ``dueDate``, and
      ``categories`` trigger ``save()`` on the DOM ``change`` event
   #. Debounced save (300 ms): ``subject`` and ``body`` call
      ``scheduleSave()`` on the DOM ``input`` event
   #. Webview posts ``{ command: 'save', changes }`` message
   #. ``TaskEditorProvider.resolveCustomEditor()`` message handler calls
      ``taskService.modifyTask(id, changes)``
   #. Provider executes COM call → ``cache.invalidate()`` + background
      ``cache.refresh()`` (fire-and-forget)
   #. ``"Saved."`` feedback shown in the status div for 2 seconds; tree
      refreshes when background refresh completes

   **Design notes:**

   * ``completedDate`` is never passed as a writable field in ``changes``
   * If ``body`` was not already loaded, the editor loads it on open via a
     separate ``getTasks()`` call with ``includeBody: true`` scoped to the
     task id (provider-level optimization)


.. spec:: jarvis_pim_task Tool
   :id: SPEC_PIM_TASKTOOL
   :status: implemented
   :links: REQ_PIM_TASKTOOL; SPEC_PIM_TASKSERVICE; SPEC_ENG_REGISTER_TOOL; SPEC_MOD_MCP_PKG

   **Description:**
   Register ``jarvis_pim_task`` once through ``api.registerTool()`` in
   ``packages/pim/src/extension.ts``. The MCP extension reaches it through the engine's
   tool registry and the manifest ``inputSchema`` (``SPEC_MOD_MCP_PKG``); there is no
   second handler.

   **Input schema:**

   .. code-block:: typescript

      {
        action:       "get" | "set" | "modify" | "delete",
        // get filters
        category?:    string,
        status?:      string,
        dueBefore?:   string,   // ISO date
        includeBody?: boolean,  // default false
        // set / modify / delete fields
        id?:          string,   // required for modify/delete
        subject?:     string,
        body?:        string,
        dueDate?:     string,
        priority?:    string,
        isComplete?:  boolean,
        categories?:  string[],
        provider?:    string,   // optional; broadcast if omitted
      }

   **Handler logic:**

   * Guard: if ``!taskService || !taskService.hasProviders()`` → return
     informational error
   * ``get``: ``taskService.getTasks(filter)``; when ``includeBody`` is false,
     strip ``body`` field from results
   * ``set``: ``taskService.setTask(input, provider)``
   * ``modify``: reject if ``completedDate`` present in input; call
     ``taskService.modifyTask(id, changes, provider)``
   * ``delete``: ``taskService.deleteTask(id, provider)``


.. spec:: Actor Mail Indicators
   :id: SPEC_ACTOR_MAIL
   :status: implemented
   :links: REQ_ACTOR_MAIL; REQ_ENG_ACTORINDICATOR; SPEC_ENG_ACTORINDICATOR; SPEC_ENG_ACTORLIST; SPEC_ACTOR_SCANNER; SPEC_ACTOR_TREE; SPEC_OLK_SETTINGS; SPEC_MOD_PIM_PKG

   **Description:**
   PIM shows the mail state of an Actor as one indicator on its node. Two classes carry it,
   following the split of ``SPEC_OLK_COMBRIDGE`` between a stateless read and the state around it.
   ``OutlookActorMail`` (``packages/pim/src/outlookIntegration/OutlookActorMail.ts``) is the only
   code that reads Outlook for this feature and keeps no state. ``ActorMailStatus``
   (``packages/pim/src/ActorMailStatus.ts``) holds the indicators PIM has set and nothing else.
   The core reads no mail (``SPEC_ENG_ACTORINDICATOR``); PIM uses only ``listActors``,
   ``onDidScanActors`` and ``indicateActor`` of the core API. The read follows the PowerShell COM
   route and the error conventions of ``SPEC_OLK_COMBRIDGE``, except that it attaches to a running
   Outlook instead of starting one.

   .. code-block:: typescript

      export interface FolderMail {
          name: string;      // Inbox subfolder name
          unread: number;    // UnReadItemCount
          flagged: boolean;  // at least one item with FlagStatus 2; false when not looked up
          checked: boolean;  // false when the flag lookup was skipped or failed
      }

      // outlookIntegration/OutlookActorMail.ts — stateless
      export function readActorMail(actorNames: string[], log: Log): Promise<FolderMail[]>;

      // ActorMailStatus.ts
      export class ActorMailStatus implements vscode.Disposable {
          constructor(api: JarvisCoreApi, log: Log);
          requestRead(): void;   // called by the jarvis.outlook.enabled listener in extension.ts
          dispose(): void;       // disposes every indicator and the onDidScanActors subscription
      }

   **State:** a map from ``JarvisActor.id`` to ``{ kind: 'flag' | 'mail', indicator: Disposable }``.
   Nothing else is kept: no unread counts, folder names, folder ids or mail items
   (``REQ_ACTOR_MAIL`` AC-5).

   **Trigger:** one read at activation, because the core may have scanned before PIM activated; one
   read after every ``api.onDidScanActors`` (``SPEC_ACTOR_SCANNER``, whatever started the rescan);
   one read after a change of ``jarvis.outlook.enabled``, whose listener in ``extension.ts`` calls
   ``requestRead()``. There is no timer and no Outlook event subscription. If the core API lacks
   ``indicateActor`` or ``onDidScanActors``, the constructor writes one ``log.warn`` line and the
   instance does nothing (``REQ_ACTOR_MAIL`` AC-15).

   **Read** (one at a time; a trigger during a run marks one re-read as pending, which runs once
   after the running read ends; triggers during the same run share it):

   1. If ``jarvis.outlook.enabled`` is ``false``
      (``getConfiguration('jarvis').get('outlook.enabled', false)``), no process is started and
      the desired state is empty (step 6; ``REQ_OLK_ENABLE`` AC-2).
   2. Take ``listActors()`` and keep the names that occur exactly once; these are the candidate
      names (``REQ_ACTOR_MAIL`` AC-3). When there are none, no process is started and the desired
      state is empty.
   3. If ``process.platform`` is not ``win32``, the read fails (step 5).
   4. Start one PowerShell process with ``child_process.execFile``, no shell, the arguments
      ``['-NoProfile', '-Command', READ_SCRIPT]`` and the options ``{ timeout: 10_000,
      windowsHide: true, env }``. The candidate names reach the script as data, as a JSON array in
      an environment variable of ``env`` (``JARVIS_ACTOR_NAMES``), and are never concatenated into
      ``READ_SCRIPT`` (``REQ_ACTOR_MAIL`` AC-18). The script below is the reference for the
      behaviour; the unread count is read for every Inbox subfolder first, the flag lookup runs
      afterwards and only for folders named like a candidate, within a budget of 5 000 ms of the
      10 000 ms limit (``REQ_ACTOR_MAIL`` AC-17):

      .. code-block:: powershell

         [Console]::OutputEncoding = [Text.Encoding]::UTF8
         $ErrorActionPreference = 'Stop'   # without it a failed attach exits 0 and prints []
         $clock = [Diagnostics.Stopwatch]::StartNew()
         $wanted = @(ConvertFrom-Json $env:JARVIS_ACTOR_NAMES)
         $ol = [Runtime.InteropServices.Marshal]::GetActiveObject('Outlook.Application')  # attach only
         $inbox = $ol.Session.GetDefaultFolder(6)                                        # olFolderInbox
         $rows = @(foreach ($f in $inbox.Folders) {
             [pscustomobject]@{ f = $f; name = $f.Name; unread = $f.UnReadItemCount }
         })
         $list = @(foreach ($r in $rows) {
             $flagged = $false; $checked = $true
             if ($wanted -ccontains $r.name) {
                 if ($clock.ElapsedMilliseconds -lt 5000) {
                     try { $t = $r.f.GetTable('[FlagStatus] >= 2'); $flagged = -not $t.EndOfTable }   # pending = olFlagMarked (2)
                     catch { $checked = $false }
                 } else { $checked = $false }
             }
             [pscustomobject]@{ name = $r.name; unread = $r.unread; flagged = $flagged; checked = $checked }
         })
         ConvertTo-Json -InputObject $list -Compress

      The first line makes folder names with non-ASCII characters match the Actor names. The second
      line makes a failed attach end the process with exit code 1. The failure signal is the exit
      code, not stderr: PowerShell also writes harmless warnings to stderr. ``FlagStatus`` 2 is
      "marked" (pending); 1 is "complete" and 0 is "none", and neither counts
      (``REQ_ACTOR_MAIL`` AC-13). The table filter needs only "is there at least one", so no row is
      fetched. The filter is ``>= 2``, not ``= 2``: measured on a live mailbox (8 folders with real
      pending flags, counts only), ``[FlagStatus] = 2`` matched no item in ``GetTable`` and in
      ``Items.Restrict``, in Jet and DASL syntax, while ``>= 2`` and ``> 1`` matched exactly the
      number of flagged items read per item through ``PidTagFlagStatus``. The reason ``= 2``
      matches nothing is not known; ``>= 2`` is the filter that was measured, not one derived from
      the object model. A value above 2 is not defined there and is not expected.

   5. A failure (non-zero exit, timeout, output that is not a JSON array, COM error, Outlook not
      running) makes the desired state empty, writes one ``log.warn`` line and shows nothing to the
      user (``REQ_ACTOR_MAIL`` AC-10).
   6. Reconcile. For each candidate Actor whose name equals an entry's ``name``, the desired kind is
      ``flag`` when ``flagged`` is true, otherwise ``mail`` when ``unread > 0``, otherwise none.
      Per Actor: keep the held indicator when its kind equals the desired kind; otherwise dispose it
      and, when a kind is desired, create one with ``api.indicateActor(id, icon)``
      (``new ThemeIcon('flag')`` or ``new ThemeIcon('mail')``). Dispose the indicators of Actors
      with no desired kind. An unchanged read therefore sets and disposes nothing, and the tree
      is not refreshed (``REQ_ACTOR_MAIL`` AC-5). When the read had entries with
      ``checked: false``, write one ``log.warn`` line for the read.

   **Residual:** a single ``GetTable`` call cannot be interrupted, so the budget is checked between
   folders only; the 10 000 ms limit remains the hard stop (and a failed read, step 5).

   **Acceptance Criteria:**

   * AC-1: For an Actor whose name is unique in ``listActors()`` and equals the name of a direct
     Inbox subfolder, ``ActorMailStatus`` holds one indicator: ``flag`` when the folder has at least
     one item with ``FlagStatus`` 2 (AC-14), otherwise ``mail`` when ``UnReadItemCount > 0``,
     otherwise none.
   * AC-2: The script reads the direct children of the default store's Inbox only
     (``GetDefaultFolder(6)``, ``Folders``); no deeper folder is opened, and the flag lookup runs
     only for folders whose name is a candidate name.
   * AC-3: A read starts at activation, after every ``onDidScanActors``, changed or not, and after a
     change of ``jarvis.outlook.enabled``; after no other trigger.
   * AC-4: While ``jarvis.outlook.enabled`` is ``false``, no PowerShell process is started and no
     indicator is held.
   * AC-5: The script attaches with ``GetActiveObject`` and never starts Outlook; an Outlook that is
     not running makes the script stop with exit code 1, so the read fails (step 5).
   * AC-6: The script only reads properties and tables and changes no item, flag, folder or store
     (``REQ_ACTOR_MAIL`` AC-8).
   * AC-7: A failed read leaves no indicator, writes one log line and shows no message
     (``REQ_ACTOR_MAIL`` AC-10).
   * AC-8: ``indicateActor`` is called only when an Actor's kind changes from none or the other
     kind, and the indicator is disposed when the kind ends; at most one indicator exists per Actor
     (``REQ_ACTOR_MAIL`` AC-16).
   * AC-9: A flag lookup that is skipped for the budget or fails does not remove the unread result:
     the Actor shows ``mail`` when it has unread mail, and the read writes one log line
     (``REQ_ACTOR_MAIL`` AC-17).
   * AC-10: Candidate names are passed to the script as data and are not part of its text
     (``REQ_ACTOR_MAIL`` AC-18).
   * AC-11: ``dispose()`` disposes every held indicator and the ``onDidScanActors`` subscription; it
     starts no read.
   * AC-12: PIM calls ``listActors``, ``onDidScanActors`` and ``indicateActor`` of the core for this
     feature and no other engine registration (``SPEC_MOD_PIM_PKG`` AC-2).
   * AC-13: ``packages/pim/package.json`` declares ``onStartupFinished`` in ``activationEvents``, so
     the activation read of AC-3 happens without any view being opened (``REQ_ACTOR_MAIL`` AC-19).
   * AC-14: The flag lookup of a folder uses the table filter ``[FlagStatus] >= 2``; a folder with
     an item of that status counts as flagged.
