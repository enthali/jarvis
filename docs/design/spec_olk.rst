Outlook Design Specifications
=============================

.. spec:: ICategoryProvider Interface
   :id: SPEC_OLK_IFACE
   :status: draft
   :links: REQ_OLK_PROVIDER

   **Description:**
   File ``src/outlookIntegration/ICategoryProvider.ts`` defines the Strategy
   Pattern contract for category sources.

   **TypeScript interfaces:**

   .. code-block:: typescript

      export interface Category {
          name: string;
          color: number;       // OlCategoryColor enum value
          source: string;      // provider identifier (e.g. "outlook")
      }

      export interface ICategoryProvider {
          readonly source: string;
          getCategories(): Promise<Category[]>;
          setCategory(name: string, color: number): Promise<void>;
          deleteCategory(name: string): Promise<void>;
      }

   **Design notes:**

   * ``color`` uses Outlook's ``OlCategoryColor`` integer enum (0 = none,
     8 = blue, 10 = pink, etc.). Other provider implementations may map
     their own colour systems to these values or use 0.
   * ``source`` is set by each provider implementation (e.g. ``"outlook"``);
     callers use it for filtering and targeted operations.


.. spec:: DomainCache<T> Implementation
   :id: SPEC_OLK_CACHE
   :status: draft
   :links: REQ_OLK_CACHE

   **Description:**
   File ``src/outlookIntegration/DomainCache.ts`` implements a generic in-memory
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


.. spec:: OutlookCategoryProvider (COM Bridge)
   :id: SPEC_OLK_COMBRIDGE
   :status: draft
   :links: REQ_OLK_COMBRIDGE; SPEC_OLK_IFACE

   **Description:**
   File ``src/outlookIntegration/OutlookCategoryProvider.ts`` implements
   ``ICategoryProvider`` using PowerShell COM automation.

   **COM execution pattern:**

   All COM calls use
   ``child_process.execFile('powershell', ['-NoProfile', '-Command', script])``
   with a timeout of 10 000 ms. The provider holds a reference to the shared
   ``LogOutputChannel`` for error reporting.

   **getCategories() PowerShell script:**

   .. code-block:: powershell

      $ol = New-Object -ComObject Outlook.Application
      $ns = $ol.GetNamespace('MAPI')
      $cats = $ns.Categories
      $result = @()
      foreach ($c in $cats) {
          $result += [PSCustomObject]@{
              Name = $c.Name
              Color = [int]$c.Color
          }
      }
      $result | ConvertTo-Json -Compress

   Output is parsed as ``JSON.parse()``; each entry gets ``source: "outlook"``
   appended. An empty ``$result`` (no categories) produces ``null`` from
   ``ConvertTo-Json`` — the parser treats ``null`` as ``[]``.

   **setCategory() PowerShell script:**

   .. code-block:: powershell

      $ol = New-Object -ComObject Outlook.Application
      $ns = $ol.GetNamespace('MAPI')
      $existing = $ns.Categories | Where-Object { $_.Name -eq '{{name}}' }
      if ($existing) {
          $existing.Color = {{color}}
      } else {
          $ns.Categories.Add('{{name}}', {{color}})
      }

   Template placeholders ``{{name}}`` and ``{{color}}`` are replaced before
   execution. The ``name`` parameter is sanitized by escaping single quotes
   (``'`` → ``''``) to prevent PowerShell injection.

   **deleteCategory() PowerShell script:**

   .. code-block:: powershell

      $ol = New-Object -ComObject Outlook.Application
      $ns = $ol.GetNamespace('MAPI')
      $cat = $ns.Categories | Where-Object { $_.Name -eq '{{name}}' }
      if ($cat) { $ns.Categories.Remove($cat.CategoryID) }

   **Colour heuristic** (applied during ``setCategory`` when ``color`` is 0):

   .. code-block:: typescript

      function resolveColor(name: string, requestedColor: number): number {
          if (requestedColor !== 0) return requestedColor;
          const lower = name.toLowerCase();
          if (lower.includes('project')) return 8;   // olCategoryColorBlue
          if (lower.includes('event'))   return 10;  // olCategoryColorPink
          return 0;                                   // olCategoryColorNone
      }

   **Error handling:**

   * Non-zero exit code → log error via ``log.error('[Outlook] ...')``, reject
     Promise
   * Timeout (10 s) → log timeout error, reject Promise
   * Non-Windows platform (``process.platform !== 'win32'``) →
     ``getCategories()`` returns ``[]``; ``setCategory()`` / ``deleteCategory()``
     reject with ``"Windows + Outlook Classic required"``


.. spec:: CategoryService Orchestrator
   :id: SPEC_OLK_SERVICE
   :status: draft
   :links: REQ_OLK_SERVICE; SPEC_OLK_IFACE; SPEC_OLK_CACHE

   **Description:**
   File ``src/outlookIntegration/CategoryService.ts`` manages providers and cache.

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
                          `[Outlook] Provider ${p.source} failed: ${e}`
                      );
                  }
              }
              return results;
          }
      }

   **Design notes:**

   * ``_fetchAll()`` iterates providers sequentially — parallel execution is
     unnecessary given the expected single-provider setup; errors are caught
     per-provider so one failing provider does not block others
   * ``setCategory`` / ``deleteCategory`` iterate targets sequentially for
     deterministic ordering
   * After write operations, only ``invalidate()`` is called — the next
     ``getCategories()`` call triggers a fresh ``refresh()``


.. spec:: jarvis_outlookCategory Dual Tool
   :id: SPEC_OLK_CATTOOL
   :status: draft
   :links: REQ_OLK_CATTOOL; SPEC_OLK_SERVICE; SPEC_MSG_DUALREGISTRATION

   **Description:**
   Register ``jarvis_outlookCategory`` via ``registerDualTool()`` in
   ``extension.ts``.

   **Registration (in ``activate()``):**

   .. code-block:: typescript

      const outlookCategoryTool = registerDualTool(
        'jarvis_outlookCategory',
        // LM handler
        async (options, _token) => {
          const enabled = vscode.workspace
            .getConfiguration('jarvis')
            .get<boolean>('outlookEnabled', false);
          if (!enabled) {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(
                'Outlook integration is disabled. '
                + 'Set jarvis.outlookEnabled to true.'
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
        'Manage Outlook categories: get, set, or delete.',
        // MCP input schema (Zod)
        {
          action: z.enum(['get', 'set', 'delete']),
          name: z.string().optional(),
          filter: z.string().optional(),
          provider: z.string().optional()
        },
        // MCP handler
        async (args) => {
          const enabled = vscode.workspace
            .getConfiguration('jarvis')
            .get<boolean>('outlookEnabled', false);
          if (!enabled) {
            return { error: 'Outlook integration is disabled.' };
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
        "name": "jarvis_outlookCategory",
        "displayName": "Manage Outlook Categories",
        "modelDescription": "Manage Outlook categories. Actions: get (list/filter categories from cache), set (create/update a category), delete (remove a category). When Outlook integration is disabled, returns an error.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "outlookCategory",
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
   :id: SPEC_OLK_CATVIEW
   :status: draft
   :links: REQ_OLK_CATVIEW; SPEC_OLK_SERVICE

   **Description:**
   File ``src/outlookIntegration/CategoryTreeProvider.ts`` implements
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
          "when": "config.jarvis.outlookEnabled && config.jarvis.outlook.showCategories"
        }

   * ``contributes.commands``: ``jarvis.refreshCategories``
     (title "Jarvis: Refresh Categories", icon ``$(refresh)``)
   * ``contributes.menus.view/title``: ``jarvis.refreshCategories``
     with ``when: "view == jarvisCategories"`` (group ``navigation``)
   * ``contributes.menus.commandPalette``: hide (``when: "false"``)
   * ``activationEvents``: add ``onView:jarvisCategories``


.. spec:: Outlook Settings and Activation Guard
   :id: SPEC_OLK_SETTINGS
   :status: draft
   :links: REQ_OLK_ENABLE; REQ_CFG_SETTINGSGROUPS; SPEC_CFG_SETTINGSGROUPS

   **Description:**
   Add an "Outlook" group to the ``contributes.configuration`` array in
   ``package.json`` and wire the activation guard in ``extension.ts``.

   **package.json addition** (new configuration object in the array):

   .. code-block:: json

      {
        "title": "Outlook",
        "properties": {
          "jarvis.outlookEnabled": {
            "type": "boolean",
            "default": false,
            "description": "Enable Outlook COM integration (Windows + Outlook Classic). When disabled, all Outlook features are hidden and no COM calls are made."
          },
          "jarvis.outlook.showCategories": {
            "type": "boolean",
            "default": true,
            "description": "Show the Categories view in the Jarvis sidebar (requires outlookEnabled)."
          }
        }
      }

   **Activation guard (in ``activate()``):**

   .. code-block:: typescript

      const outlookEnabled = vscode.workspace
          .getConfiguration('jarvis')
          .get<boolean>('outlookEnabled', false);

      let categoryService: CategoryService | undefined;
      let categoryTreeProvider: CategoryTreeProvider | undefined;

      if (outlookEnabled) {
          categoryService = new CategoryService(log);
          categoryService.addProvider(new OutlookCategoryProvider(log));
          categoryTreeProvider = new CategoryTreeProvider(categoryService);
          vscode.window.registerTreeDataProvider(
              'jarvisCategories', categoryTreeProvider
          );
      }

   **Heartbeat-triggered cache refresh:**

   A ``syncOutlookRefreshJob()`` helper (analogous to ``syncRescanJob()``)
   registers a ``"Jarvis: Outlook Refresh"`` heartbeat job when
   ``outlookEnabled`` is ``true`` and ``scanInterval > 0``:

   .. code-block:: typescript

      function syncOutlookRefreshJob(): void {
          if (!categoryService) {
              scheduler.unregisterJob('Jarvis: Outlook Refresh');
              return;
          }
          const interval = vscode.workspace
              .getConfiguration('jarvis')
              .get<number>('scanInterval', 2);
          if (interval > 0) {
              const job: HeartbeatJob = {
                  name: 'Jarvis: Outlook Refresh',
                  schedule: `*/${interval} * * * *`,
                  steps: [{ type: 'command', run: 'jarvis.refreshCategories' }]
              };
              scheduler.registerJob(job);
              log.info(
                `[Outlook] registered refresh job: */${interval} * * * *`
              );
          } else {
              scheduler.unregisterJob('Jarvis: Outlook Refresh');
              log.info('[Outlook] unregistered refresh job (interval=0)');
          }
      }

   Called once during activation after the Outlook guard block, and from the
   ``onDidChangeConfiguration`` handler when ``jarvis.scanInterval`` or
   ``jarvis.outlookEnabled`` changes.

   **Config change handler addition:**

   .. code-block:: typescript

      if (e.affectsConfiguration('jarvis.outlookEnabled')) {
          vscode.window.showInformationMessage(
              'Jarvis: Outlook toggle changed. Reload window to apply.',
              'Reload'
          ).then(choice => {
              if (choice === 'Reload') {
                  vscode.commands.executeCommand(
                      'workbench.action.reloadWindow'
                  );
              }
          });
      }

   **Design notes:**

   * ``outlookEnabled`` change requires window reload because the
     ``CategoryService``, ``OutlookCategoryProvider``, and
     ``CategoryTreeProvider`` are instantiated once during activation
   * ``showCategories`` change is handled natively by VS Code's ``when``-clause
     evaluation — no runtime code needed
   * The ``syncOutlookRefreshJob()`` pattern matches ``syncRescanJob()`` exactly
     — same cron schedule, same heartbeat-based dispatch
