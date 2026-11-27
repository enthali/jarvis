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
   :links: REQ_OLK_ENABLE; REQ_CFG_GROUPS; SPEC_ACTOR_MAIL

   **Description:**
   Add ``jarvis.outlook.enabled`` to the ``"Jarvis PIM"`` configuration group in
   ``package.json`` and wire the activation guard in ``extension.ts``. The
   category provider is additionally gated by the categories sub-toggle
   (``SPEC_OLK_CATENABLE``).

   **package.json addition** (property inside the "Jarvis PIM" configuration object):

   .. code-block:: json

      {
        "title": "Jarvis PIM",
        "properties": {
          "jarvis.outlook.enabled": {
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

      // Outlook provider: conditionally add (master switch AND categories
      // sub-toggle, see SPEC_OLK_CATENABLE)
      const cfg = vscode.workspace.getConfiguration('jarvis');

      if (cfg.get<boolean>('outlook.enabled', false)
          && cfg.get<boolean>('outlook.categories.enabled', false)) {
          categoryService.addProvider(new OutlookCategoryProvider(log));
      }

   **Config change handler addition:**

   .. code-block:: typescript

      if (e.affectsConfiguration('jarvis.outlook.enabled')) {
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

   * ``jarvis.outlook.enabled`` change requires window reload because
     ``OutlookCategoryProvider`` is instantiated once during activation
   * The ``CategoryService`` and ``CategoryTreeProvider`` are always
     instantiated (PIM layer) — only the provider registration is conditional
   * The Actor mail indicators are the exception to the reload rule: ``ActorMailStatus`` is
     instantiated once, reads the setting at each read and is called through ``requestRead()`` by
     the same change handler, so a change takes effect at once (``SPEC_ACTOR_MAIL``,
     ``REQ_OLK_ENABLE`` AC-3). The reload message is still shown for the providers.


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

   The tasks setting lives in the "Jarvis PIM" configuration group:

   .. code-block:: json

      {
        "title": "Jarvis PIM",
        "properties": {
          "jarvis.outlook.tasks.enabled": {
            "type": "boolean",
            "default": true,
            "description": "Enable the Outlook Tasks integration. Only effective when jarvis.outlook.enabled is true."
          }
        }
      }

   **Instantiation guard (``extension.ts``):**

   .. code-block:: typescript

      const cfg = vscode.workspace.getConfiguration('jarvis');
      if (cfg.get('outlook.enabled') === true
          && cfg.get('outlook.tasks.enabled') === true) {
          const outlookTaskProvider = new OutlookTaskProvider(log);
          taskService.addProvider(outlookTaskProvider);
      }

   **When-clause example** (task-related tree commands):

   .. code-block:: json

      "when": "config.jarvis.outlook.enabled == true && config.jarvis.outlook.tasks.enabled == true"

   **Design notes:**

   * ``jarvis.outlook.enabled`` guard precedes the tasks toggle — no COM
     instantiation without the master switch
   * Changing either setting requires a window reload (same behaviour as
     ``REQ_OLK_ENABLE``)


.. spec:: Categories Sub-Toggle Setting
   :id: SPEC_OLK_CATENABLE
   :status: implemented
   :links: REQ_OLK_CATENABLE; REQ_PIM_CATVIEW; SPEC_OLK_SETTINGS; SPEC_OLK_TASKENABLE

   **Description:**
   Adds ``jarvis.outlook.categories.enabled`` to the "Jarvis PIM" configuration
   group next to ``jarvis.outlook.tasks.enabled``, removes
   ``jarvis.pim.showCategories``, and gates the Outlook category provider and
   the Categories view with it. The setting keys are those of the shipped
   manifest (``jarvis.outlook.enabled``).

   **package.json delta (``contributes.configuration``):** the "PIM" group
   with ``jarvis.pim.showCategories`` is removed; the "Jarvis PIM" group gains:

   .. code-block:: json

      "jarvis.outlook.categories.enabled": {
        "type": "boolean",
        "default": false,
        "description": "Enable the Outlook Categories integration (category provider and Categories view). Only effective when jarvis.outlook.enabled is true."
      }

   **View gating (``contributes.views.jarvis-explorer``, ``jarvisCategories``):**

   .. code-block:: json

      "when": "config.jarvis.outlook.enabled == true && config.jarvis.outlook.categories.enabled == true"

   **Instantiation guard (``packages/pim/src/extension.ts``):**

   .. code-block:: typescript

      const cfg = vscode.workspace.getConfiguration('jarvis');
      if (cfg.get<boolean>('outlook.enabled', false)) {
          if (cfg.get<boolean>('outlook.categories.enabled', false)) {
              categoryService.addProvider(new OutlookCategoryProvider(log));
          }
          // tasks guard unchanged (SPEC_OLK_TASKENABLE)
      }

   **Behaviour while the setting is off (decision of the Architect):**

   * ``CategoryService`` and ``CategoryTreeProvider`` stay instantiated, the
     provider list is empty
   * The tool ``jarvis_pim_category`` returns the informational error of
     ``REQ_PIM_CATTOOL`` AC-9, which names the two settings
   * The task editor shows no category choices (``hasProviders()`` is false);
     tasks keep their ``categories`` field and the task tool still reads and
     writes it, because that field belongs to the task and not to the category
     provider
   * No migration code: a value of ``jarvis.pim.showCategories`` left in a
     user's settings is ignored, and users who had it on set the new setting to
     ``true``. The release note carries this hint. Reason: the old setting only
     governed the view (the provider was registered with the master switch), so
     a mapping would silently switch on the provider too, and the feature as a
     whole is under review (backlog #23)

   **Design notes:**

   * A change of the setting requires a window reload for the provider (the
     provider is instantiated once during activation); the ``when`` clause
     reacts at once, so the view disappears before the reload
   * The master switch ``jarvis.outlook.enabled`` precedes the sub-toggle, as
     for tasks
