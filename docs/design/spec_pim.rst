PIM Design Specifications
=========================

.. spec:: ICategoryProvider Interface
   :id: SPEC_PIM_IFACE
   :status: draft
   :links: REQ_PIM_PROVIDER

   **Description:**
   File ``src/pim/ICategoryProvider.ts`` defines the Strategy
   Pattern contract for category sources.

   **TypeScript interfaces:**

   .. code-block:: typescript

      export interface Category {
          name: string;
          color: number;       // provider-specific colour value (0 = none)
          source: string;      // provider identifier (e.g. "outlook")
      }

      export interface ICategoryProvider {
          readonly source: string;
          getCategories(): Promise<Category[]>;
          setCategory(name: string, color: number): Promise<void>;
          deleteCategory(name: string): Promise<void>;
      }

   **Design notes:**

   * ``color`` uses integer values. The Outlook provider maps to
     ``OlCategoryColor`` enum (0 = none, 8 = blue, 10 = pink, etc.).
     Other provider implementations may map their own colour systems
     to these values or use 0.
   * ``source`` is set by each provider implementation (e.g. ``"outlook"``);
     callers use it for filtering and targeted operations.


.. spec:: DomainCache<T> Implementation
   :id: SPEC_PIM_CACHE
   :status: draft
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
   :status: draft
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
              provider?: string
          ): Promise<void> {
              const targets = provider
                  ? this._providers.filter(p => p.source === provider)
                  : this._providers;
              for (const p of targets) {
                  await p.deleteCategory(name);
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

   A ``syncCategoryRefreshJob()`` helper (analogous to ``syncRescanJob()``)
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
   * ``hasProviders()`` is used by the tool guard and heartbeat refresh to
     determine whether the PIM layer is operational


.. spec:: jarvis_category Dual Tool
   :id: SPEC_PIM_CATTOOL
   :status: draft
   :links: REQ_PIM_CATTOOL; SPEC_PIM_SERVICE; SPEC_MSG_DUALREGISTRATION

   **Description:**
   Register ``jarvis_category`` via ``registerDualTool()`` in
   ``extension.ts``.

   **Registration (in ``activate()``):**

   .. code-block:: typescript

      const categoryTool = registerDualTool(
        'jarvis_category',
        // LM handler
        async (options, _token) => {
          if (!categoryService || !categoryService.hasProviders()) {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(
                'No category providers configured. '
                + 'Enable a PIM provider (e.g. jarvis.outlookEnabled).'
              )
            ]);
          }
          const { action, name, filter, provider } = options.input;
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
            default:
              throw new Error(`Unknown action: ${action}`);
          }
          categoryTreeProvider?.refresh();
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(JSON.stringify(result))
          ]);
        },
        // MCP description
        'Manage categories: get, set, or delete.',
        // MCP input schema (Zod)
        {
          action: z.enum(['get', 'set', 'delete']),
          name: z.string().optional(),
          filter: z.string().optional(),
          provider: z.string().optional()
        },
        // MCP handler
        async (args) => {
          if (!categoryService || !categoryService.hasProviders()) {
            return { error: 'No category providers configured.' };
          }
          const action = args.action as string;
          const name = args.name as string | undefined;
          const filter = args.filter as string | undefined;
          const provider = args.provider as string | undefined;
          switch (action) {
            case 'get':
              return {
                categories: await categoryService!.getCategories(filter)
              };
            case 'set':
              if (!name) return { error: 'name is required' };
              await categoryService!.setCategory(name, 0, provider);
              categoryTreeProvider?.refresh();
              return { status: 'ok', name };
            case 'delete':
              if (!name) return { error: 'name is required' };
              await categoryService!.deleteCategory(name, provider);
              categoryTreeProvider?.refresh();
              return { status: 'ok', name };
            default:
              return { error: `Unknown action: ${action}` };
          }
        }
      );

   **package.json tool registration:**

   .. code-block:: json

      {
        "name": "jarvis_category",
        "displayName": "Manage Categories",
        "modelDescription": "Manage categories from all configured PIM providers. Actions: get (list/filter categories from cache), set (create/update a category), delete (remove a category). When no providers are configured, returns an error.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "category",
        "icon": "$(tag)",
        "inputSchema": {
          "type": "object",
          "properties": {
            "action": {
              "type": "string",
              "enum": ["get", "set", "delete"],
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
            }
          },
          "required": ["action"]
        }
      }


.. spec:: CategoryTreeProvider
   :id: SPEC_PIM_CATVIEW
   :status: draft
   :links: REQ_PIM_CATVIEW; SPEC_PIM_SERVICE

   **Description:**
   File ``src/pim/CategoryTreeProvider.ts`` implements
   ``vscode.TreeDataProvider<CategoryNode>`` for the "Categories" sidebar view.

   **Node type:**

   .. code-block:: typescript

      type CategoryNode = CategoryLeafNode | EmptyNode;

      interface CategoryLeafNode {
          kind: 'category';
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

   **Manifest additions (package.json):**

   * ``contributes.views.jarvis-explorer``: add 5th view:

     .. code-block:: json

        {
          "id": "jarvisCategories",
          "name": "Categories",
          "when": "config.jarvis.pim.showCategories"
        }

   * ``contributes.commands``: ``jarvis.refreshCategories``
     (title "Jarvis: Refresh Categories", icon ``$(refresh)``)
   * ``contributes.menus.view/title``: ``jarvis.refreshCategories``
     with ``when: "view == jarvisCategories"`` (group ``navigation``)
   * ``contributes.menus.commandPalette``: hide (``when: "false"``)
   * ``activationEvents``: add ``onView:jarvisCategories``

   **Settings (package.json — "Categories" group):**

   .. code-block:: json

      {
        "title": "Categories",
        "properties": {
          "jarvis.pim.showCategories": {
            "type": "boolean",
            "default": true,
            "description": "Show the Categories view in the Jarvis sidebar."
          }
        }
      }
