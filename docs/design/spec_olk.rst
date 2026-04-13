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
   * The "Outlook" settings group contains only ``jarvis.outlookEnabled``;
     ``jarvis.pim.showCategories`` belongs to the "Categories" group
     (see ``SPEC_PIM_CATVIEW``)
