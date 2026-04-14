Outlook Design Specifications
=============================

.. spec:: OutlookCategoryProvider (COM Bridge)
   :id: SPEC_OLK_COMBRIDGE
   :status: implemented
   :links: REQ_OLK_COMBRIDGE; SPEC_PIM_IFACE

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
              Id    = $c.CategoryID
              Name  = $c.Name
              Color = [int]$c.Color
          }
      }
      $result | ConvertTo-Json -Compress

   Output is parsed as ``JSON.parse()``; each entry gets ``source: "outlook"``
   and ``id`` (set to the COM ``CategoryID``) appended. An empty ``$result``
   (no categories) produces ``null`` from ``ConvertTo-Json`` — the parser
   treats ``null`` as ``[]``.

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

   The ``nameOrId`` parameter is either a ``CategoryID`` (when ``id`` was
   provided by the caller) or a category name (fallback). The script tries
   ``CategoryID`` match first, then falls back to name.

   .. code-block:: powershell

      $ol = New-Object -ComObject Outlook.Application
      $ns = $ol.GetNamespace('MAPI')
      $cat = $ns.Categories | Where-Object {
          $_.CategoryID -eq '{{nameOrId}}' -or $_.Name -eq '{{nameOrId}}'
      } | Select-Object -First 1
      if ($cat) { $ns.Categories.Remove($cat.CategoryID) }

   **renameCategory() PowerShell script:**

   The ``oldNameOrId`` parameter is either a ``CategoryID`` (when ``id`` was
   provided by the caller) or a category name (fallback).

   .. code-block:: powershell

      $ol = New-Object -ComObject Outlook.Application
      $ns = $ol.GetNamespace('MAPI')
      $cat = $ns.Categories | Where-Object {
          $_.CategoryID -eq '{{oldNameOrId}}' -or $_.Name -eq '{{oldNameOrId}}'
      } | Select-Object -First 1
      if ($cat) {
          $color = [int]$cat.Color
          $ns.Categories.Remove($cat.CategoryID)
          $ns.Categories.Add('{{newName}}', $color)
      }

   The implementation deletes the old category and re-creates it with the new
   name, preserving the original colour value. Both ``{{oldNameOrId}}`` and
   ``{{newName}}`` are sanitized by escaping single quotes (``'`` → ``''``).

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


.. spec:: Outlook Settings and Activation Guard
   :id: SPEC_OLK_SETTINGS
   :status: implemented
   :links: REQ_OLK_ENABLE; REQ_CFG_SETTINGSGROUPS; SPEC_CFG_SETTINGSGROUPS

   **Description:**
   Add ``jarvis.outlookEnabled`` to the ``"PIM"`` configuration group in
   ``package.json`` (merged with ``jarvis.pim.showCategories`` — see
   ``SPEC_PIM_CATVIEW``) and wire the activation guard in ``extension.ts``.

   **package.json addition** (property inside the shared "PIM" configuration object):

   .. code-block:: json

      {
        "title": "PIM",
        "properties": {
          "jarvis.outlookEnabled": {
            "type": "boolean",
            "default": false,
            "description": "Enable Outlook COM integration (Windows + Outlook Classic). When disabled, no Outlook COM calls are made."
          }
        }
      }

   **Activation guard (in ``activate()``):**

   .. code-block:: typescript

      // PIM layer: always instantiate CategoryService
      const categoryService = new CategoryService(log);
      const categoryTreeProvider = new CategoryTreeProvider(categoryService);
      vscode.window.registerTreeDataProvider(
          'jarvisCategories', categoryTreeProvider
      );

      // Outlook provider: conditionally add
      const outlookEnabled = vscode.workspace
          .getConfiguration('jarvis')
          .get<boolean>('outlookEnabled', false);

      if (outlookEnabled) {
          categoryService.addProvider(new OutlookCategoryProvider(log));
      }

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

   * ``outlookEnabled`` change requires window reload because
     ``OutlookCategoryProvider`` is instantiated once during activation
   * The ``CategoryService`` and ``CategoryTreeProvider`` are always
     instantiated (PIM layer) — only the provider registration is conditional
   * Both ``jarvis.outlookEnabled`` and ``jarvis.pim.showCategories`` are
     combined in the single ``"PIM"`` settings group (see ``SPEC_PIM_CATVIEW``)


.. spec:: Auto-Create Outlook Category in New-Entity Commands
   :id: SPEC_OLK_AUTOCAT_NEWENTITY
   :status: implemented
   :links: REQ_OLK_AUTOCAT_NEWENTITY; SPEC_EXP_NEWPROJECT_CMD; SPEC_EXP_NEWEVENT_CMD; SPEC_PIM_SERVICE

   **Description:**
   Both ``jarvis.newProject`` and ``jarvis.newEvent`` command handlers in
   ``src/extension.ts`` include a guarded category-creation step after writing
   the entity files.

   **Placement within ``jarvis.newProject`` handler:**

   After step 8 (``fs.promises.writeFile`` for ``project.yaml``), before
   step 9 (``scanner.rescan()``):

   .. code-block:: typescript

      try {
          const outlookEnabled = vscode.workspace
              .getConfiguration('jarvis')
              .get<boolean>('outlookEnabled', false);
          if (outlookEnabled && categoryService.hasProviders()) {
              await categoryService.setCategory(`Project: ${input}`, 0);
              log.info(`[NewProject] Outlook category created: "Project: ${input}"`);
          }
      } catch (err) {
          log.warn(`[NewProject] Failed to create Outlook category: ${err}`);
      }

   **Placement within ``jarvis.newEvent`` handler:**

   After step 10 (``fs.promises.writeFile`` for ``event.yaml``), before
   step 11 (``scanner.rescan()``):

   .. code-block:: typescript

      try {
          const outlookEnabled = vscode.workspace
              .getConfiguration('jarvis')
              .get<boolean>('outlookEnabled', false);
          if (outlookEnabled && categoryService.hasProviders()) {
              await categoryService.setCategory(`Event: ${nameInput}`, 0);
              log.info(`[NewEvent] Outlook category created: "Event: ${nameInput}"`);
          }
      } catch (err) {
          log.warn(`[NewEvent] Failed to create Outlook category: ${err}`);
      }

   **Naming convention:**

   * Projects: ``"Project: <name>"`` — the human-readable user input, not the
     kebab-case folder name
   * Events: ``"Event: <name>"`` — the human-readable user input

   The ``OutlookCategoryProvider`` colour heuristic automatically assigns
   blue (8) for names containing "Project" and pink (10) for names containing
   "Event" when ``color`` is passed as ``0``.

   **Guard conditions (evaluated inline each call):**

   1. ``outlookEnabled === true`` — read fresh from configuration at call time
      (not hoisted from activation) to reflect current state
   2. ``categoryService.hasProviders() === true`` — ensures the
      ``OutlookCategoryProvider`` is registered; prevents no-op COM calls

   **``categoryService`` reference:**

   The ``categoryService`` instance is already in scope in the outer
   ``activate()`` closure (line 148 of ``src/extension.ts``). No parameter
   passing is required.

   **No changes** to ``CategoryService``, ``OutlookCategoryProvider``,
   ``package.json``, or any other file.


.. spec:: OutlookTaskProvider (COM Bridge)
   :id: SPEC_OLK_TASKPROVIDER
   :status: implemented
   :links: REQ_OLK_TASKPROVIDER; SPEC_PIM_ITASKPROVIDER; SPEC_OLK_COMBRIDGE

   **Description:**
   File ``src/outlookIntegration/OutlookTaskProvider.ts`` implements
   ``ITaskProvider`` using PowerShell COM automation (same technique as
   ``OutlookCategoryProvider``).

   **COM execution pattern:**

   All COM calls use
   ``child_process.execFile('powershell', ['-NoProfile', '-Command', script])``
   with a timeout of 15 000 ms.

   **getTasks() PowerShell script:**

   .. code-block:: powershell

      $ol = New-Object -ComObject Outlook.Application
      $ns = $ol.GetNamespace('MAPI')
      $tasks = $ns.GetDefaultFolder(13).Items  # 13 = olFolderTasks
      $result = @()
      foreach ($t in $tasks) {
          $due = if ($t.DueDate -and $t.DueDate -ne '4501-01-01') {
              $t.DueDate.ToString('yyyy-MM-dd')
          } else { $null }
          $completed = if ($t.DateCompleted -and $t.Complete) {
              $t.DateCompleted.ToString('yyyy-MM-dd')
          } else { $null }
          $result += [PSCustomObject]@{
              Id            = $t.EntryID
              Subject       = $t.Subject
              DueDate       = $due
              Status        = [int]$t.Status
              Priority      = [int]$t.Importance
              IsComplete    = [bool]$t.Complete
              CompletedDate = $completed
              Categories    = $t.Categories
          }
      }
      $result | ConvertTo-Json -Compress

   Output is parsed as ``JSON.parse()``. Field mapping:

   * ``Status`` (0–4) → ``TaskStatus`` enum:
     0 → ``"notStarted"``, 1 → ``"inProgress"``, 2 → ``"completed"``,
     3 → ``"waitingOnOther"``, 4 → ``"deferred"``
   * ``Priority`` (0–2, Outlook Importance) → ``TaskPriority``:
     0 → ``"low"``, 1 → ``"normal"``, 2 → ``"high"``
   * ``Categories`` is a comma-separated string; split on ``", "``

   **JSON output sanitization:**

   ``ConvertTo-Json`` does not escape all Unicode control characters.
   The TypeScript layer strips ``U+0000–U+001F`` (except tab, LF, CR) from
   the raw JSON string before parsing::

      const sanitized = output.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');
      const raw = JSON.parse(sanitized);

   **modifyTask() PowerShell script:**

   .. code-block:: powershell

      $ol = New-Object -ComObject Outlook.Application
      $ns = $ol.GetNamespace('MAPI')
      $task = $ns.GetItemFromID('{{id}}')
      {{patchStatements}}

   ``{{patchStatements}}`` is generated from the ``changes`` object,
   emitting one assignment line per changed field. ``completedDate`` is
   always excluded. Setting ``IsComplete = $true`` causes Outlook to set
   ``DateCompleted`` natively. Clearing ``dueDate`` (empty string) sets
   ``$task.DueDate = [DateTime]::MaxValue`` (Outlook's "no due date" sentinel).

   Input parameters are sanitized: string values have single quotes escaped
   (``'`` → ``''``).

   **deleteTask() PowerShell script:**

   .. code-block:: powershell

      $ol = New-Object -ComObject Outlook.Application
      $ns = $ol.GetNamespace('MAPI')
      $task = $ns.GetItemFromID('{{id}}')
      if ($task) { $task.Delete() }

   **setTask() PowerShell script:**

   Creates a new task item in the default Tasks folder and applies fields
   from the ``task`` partial using the same patch-statement generator as
   ``modifyTask()``.

   **Design notes:**

   * ``body`` is NOT loaded in ``getTasks()`` — only in on-demand calls
   * ``completedDate`` is never sent as an assignment in COM scripts
   * Invalid ``id`` (item not found by ``GetItemFromID``) raises a COM
     exception which propagates as a rejected ``Promise``


.. spec:: Tasks Sub-Toggle Setting
   :id: SPEC_OLK_TASKENABLE
   :status: implemented
   :links: REQ_OLK_TASKENABLE; SPEC_EXP_EXTENSION

   **Description:**
   Adds ``jarvis.outlook.tasks.enabled`` to the ``package.json`` configuration
   and guards task provider instantiation in ``extension.ts``.

   **package.json delta (``contributes.customEditors`` + configuration):**

   .. code-block:: json

      "customEditors": [
        {
          "viewType": "jarvis.taskEditor",
          "displayName": "Jarvis Task Editor",
          "selector": [ { "filenamePattern": "*.jarvis-task" } ],
          "priority": "default"
        }
      ]

   The tasks setting stays in the existing "PIM" configuration group:

   .. code-block:: json

      {
        "title": "Outlook",
        "properties": {
          "jarvis.outlook.tasks.enabled": {
            "type": "boolean",
            "default": true,
            "description": "Enable the Outlook Tasks integration. Only effective when jarvis.outlookEnabled is true."
          }
        }
      }

   **Instantiation guard (``extension.ts``):**

   .. code-block:: typescript

      const cfg = vscode.workspace.getConfiguration('jarvis');
      if (cfg.get('outlookEnabled') === true
          && cfg.get('outlook.tasks.enabled') === true) {
          const outlookTaskProvider = new OutlookTaskProvider(log);
          taskService.addProvider(outlookTaskProvider);
      }

   **When-clause example** (task-related tree commands):

   .. code-block:: json

      "when": "config.jarvis.outlookEnabled == true && config.jarvis.outlook.tasks.enabled == true"

   **Design notes:**

   * ``jarvis.outlookEnabled`` guard precedes the tasks toggle — no COM
     instantiation without the master switch
   * Changing either setting requires a window reload (same behaviour as
     ``REQ_OLK_ENABLE``)
