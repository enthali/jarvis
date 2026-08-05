Explorer Design Specifications
===============================

.. spec:: Extension Manifest & Activation
   :id: SPEC_EXP_EXTENSION
   :status: implemented
   :links: REQ_EXP_ACTIVITYBAR, REQ_CFG_FOLDERPATHS, REQ_CFG_SCANINTERVAL, REQ_PRJ_FILTERPERSIST, REQ_EVT_EVENTFILTERPERSIST, REQ_PRJ_NEWPROJECT, REQ_EVT_NEWEVENT, REQ_ENT_SCANREFRESH, REQ_EXP_FEATURETOGGLE, REQ_CFG_DEFAULTPATHS, REQ_ENT_CONTEXTACTIONS

   **Description:**
   The extension is scaffolded as a standard VS Code TypeScript extension.

   **Manifest (package.json):**

   * ``name``: ``jarvis``
   * ``displayName``: ``Jarvis``
   * ``activationEvents``: ``onStartupFinished``, ``onView:jarvisProjects``,
     ``onView:jarvisEvents``, ``onView:jarvisMessages``, ``onView:jarvisHeartbeat``,
     ``onView:jarvisCategories``
   * ``contributes.viewsContainers.activitybar``: One entry with id ``jarvis-explorer``,
     title ``Jarvis``, and a custom icon (``resources/jarvis.svg``)
   * ``contributes.views.jarvis-explorer``: Five views with conditional visibility.
     See ``SPEC_EXP_FEATURETOGGLE`` for the authoritative ``when``-clause definitions.

   **Activation:**
   The extension activates lazily when any tree view becomes visible.
   The ``activate()`` function first calls ``populateDefaultPaths()`` (see
   ``SPEC_CFG_DEFAULTPATHS``), then registers all four TreeDataProviders.

   **Activation order (heartbeat-register change):**

   0. ``await populateDefaultPaths(context)`` — writes default paths to settings
   1. ``kindDrivenScanner = new KindDrivenScanner(folderResolver, onCacheChanged, log)``
   2. Register entity kinds via ``kindDrivenScanner.addKind(...)``
   3. ``activateHeartbeat(context, ..., kindDrivenScanner)`` → returns ``HeartbeatScheduler``
   4. ``kindDrivenScanner.rescan()`` → immediate scan
   5. ``syncRescanJob()`` → if ``scanInterval > 0``: ``scheduler.registerJob(rescanJob)``

   A ``syncRescanJob()`` helper reads ``jarvis.scanInterval`` and either registers or
   unregisters the ``"Jarvis: Rescan"`` heartbeat job. The config change handler calls
   ``syncRescanJob()`` when ``jarvis.scanInterval`` changes, and ``startScanner()`` when
   folder paths change.

   **New-entity manifest additions (unified-entity-tree CR — relocated):**

   * ``contributes.commands``: ``jarvis.newProject`` (title "Jarvis: New Project",
     icon ``$(add)``) and ``jarvis.newEvent`` (title "Jarvis: New Event",
     icon ``$(add)``)
   * ``contributes.menus.view/item/context``: inline entries —
     ``jarvis.newProject`` with ``when: "view == jarvisEntities && viewItem == jarvisEntityCategory:project"`` (group ``inline``)
     and ``jarvis.newEvent`` with ``when: "view == jarvisEntities && viewItem == jarvisEntityCategory:event"`` (group ``inline``)
   * ``contributes.menus.commandPalette``: both commands SHALL be reachable
     (no ``when: "false"`` exclusion) — previously hidden, now also available
     via the Command Palette as a keyboard-driven alternative

   **Rescan-button manifest additions (scanner-refresh change):**

   * ``contributes.commands``: ``jarvis.rescan`` (title "Jarvis: Rescan",
     icon ``$(refresh)``)
   * ``contributes.menus.view/title``: two entries —
     ``jarvis.rescan`` with ``when: "view == jarvisProjects"``
     (group ``navigation``) and ``jarvis.rescan`` with
     ``when: "view == jarvisEvents"`` (group ``navigation``)
   * ``contributes.menus.commandPalette``: hide command (``when: "false"``)

   **Project structure:**

   .. code-block:: text

      src/
        extension.ts            — activate/deactivate entry point
        projectTreeProvider.ts  — TreeDataProvider for projects
        eventTreeProvider.ts    — TreeDataProvider for events
        messageTreeProvider.ts  — TreeDataProvider for messages
        messageQueue.ts         — Queue file store (read/write/delete)
        sessionLookup.ts        — state.vscdb UUID resolver
      resources/
        jarvis.svg              — Activity Bar icon
      package.json
      tsconfig.json


.. spec:: syncRescanJob Bridge
   :id: SPEC_EXP_RESCANBRIDGE
   :status: implemented
   :links: REQ_CFG_SCANINTERVAL; SPEC_AUT_JOBREG; SPEC_ENG_SCANNER

   **Description:**
   A helper function in ``src/extension.ts`` that bridges the ``KindDrivenScanner`` and the
   HeartbeatScheduler. It reads the ``jarvis.scanInterval`` setting and registers
   or unregisters a ``"Jarvis: Rescan"`` heartbeat job accordingly.

   **Implementation** (``src/extension.ts``, inside ``activate()``):

   .. code-block:: typescript

      function syncRescanJob(): void {
          const interval = vscode.workspace
              .getConfiguration('jarvis')
              .get<number>('scanInterval', 2);
          if (interval > 0) {
              const job: HeartbeatJob = {
                  name: 'Jarvis: Rescan',
                  schedule: `*/${interval} * * * *`,
                  steps: [{ type: 'command', run: 'jarvis.rescan' }]
              };
              scheduler.registerJob(job);
              log.info(`[Scanner] registered rescan job: */${interval} * * * *`);
          } else {
              scheduler.unregisterJob('Jarvis: Rescan');
              log.info('[Scanner] unregistered rescan job (interval=0)');
          }
      }

   **Callers:**

   * Called once during activation after ``startScanner()`` to establish the
     initial rescan schedule
   * Called from the ``onDidChangeConfiguration`` handler when
     ``jarvis.scanInterval`` changes at runtime

   **Behaviour:**

   * ``scanInterval > 0``: registers a heartbeat job named ``"Jarvis: Rescan"``
     with a cron schedule of ``*/<interval> * * * *`` and a single ``command``
     step that executes ``jarvis.rescan``. If the job already exists, it is
     updated (upsert via ``SPEC_AUT_JOBREG``).
   * ``scanInterval === 0``: unregisters the ``"Jarvis: Rescan"`` job, disabling
     automatic periodic scanning. The scanner still performs its initial scan
     via ``startScanner()``.

   **Dependencies:**

   * ``scheduler`` (``HeartbeatScheduler``) — must be initialized before
     ``syncRescanJob()`` is called (see ``SPEC_DEV_ACTIVATION``)
   * ``log`` (``LogOutputChannel``) — shared logging channel


.. spec:: Tree Data Providers
   :id: SPEC_EXP_PROVIDER
   :status: implemented
   :links: REQ_EXP_TREEVIEW, REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE, REQ_PRJ_PROJECTFILTER, REQ_EVT_EVENTFILTER, REQ_EVT_DATESORT, SPEC_ENG_SCANNER, SPEC_ENT_ENTITY_FILE_CHILDREN

   **Description:**
   Two classes implement ``vscode.TreeDataProvider<TreeNode>``:

   * ``ProjectTreeProvider`` — renders the project folder/item tree
   * ``EventTreeProvider`` — renders the event folder/item tree

   **getChildren(element?):**

   * If no element (root) → return ``scanner.getProjectTree()`` / ``scanner.getEventTree()``
   * ``ProjectTreeProvider`` additionally filters: root-level ``FolderNode``\s whose name
     is in ``_hiddenFolders`` are excluded
   * If element is ``FolderNode`` → return ``element.children``
   * If element is ``LeafNode`` → return ``[]``

   **getTreeItem(element):**

   * ``FolderNode`` → ``TreeItem`` with label = folder name,
     ``collapsibleState = Collapsed``, ``contextValue = 'jarvisFolder'``
   * ``LeafNode`` → look up ``scanner.getEntity(element.id)`` →
     ``TreeItem`` with label = entity name,
     ``collapsibleState = None``, ``contextValue = 'jarvisProject'`` or ``'jarvisEvent'``.
     If entity lookup fails, the label falls back to the parent folder name
     (derived from ``path.basename(path.dirname(element.id))``)

   .. note::

      The ``LeafNode`` ``collapsibleState = None`` shown above is superseded
      by ``SPEC_ENT_ENTITY_FILE_CHILDREN``: leaf nodes become expandable
      (``collapsibleState = Collapsed``) to show file children. See
      ``SPEC_ENT_ENTITY_FILE_CHILDREN`` for the current assignment.

   **Event date label (event-sort change, EventTreeProvider only):**

   For event leaf nodes, if ``entity.datesStart`` is defined, the label SHALL be
   ``<datesStart> — <name>`` (e.g. ``2026-04-15 — DevCon 2026``). The separator
   is an em-dash (``—``) with surrounding spaces. If ``datesStart`` is
   ``undefined``, the label is the entity name only (fail-open).

   **ProjectTreeProvider filter state:**

   * ``private _hiddenFolders: Set<string>`` — root-level folder names to hide
   * ``setHiddenFolders(folders: Set<string>): void`` — update set + refresh
   * ``getHiddenFolders(): Set<string>`` — return current set

   Both providers share no state — all data comes from the scanner.

   **EventTreeProvider filter state:**

   * ``private _futureOnly: boolean = false`` — when true, past events are excluded
   * ``setFutureOnly(value: boolean): void`` — update flag + refresh
   * ``isFutureOnly(): boolean`` — return current flag

   **Future-only filter in getChildren (EventTreeProvider only):**

   * ``const today = new Date().toISOString().slice(0, 10)``
   * Exclude ``LeafNode``\s where ``entity.datesEnd !== undefined && entity.datesEnd < today``
   * After filtering, ``FolderNode``\s with zero remaining children SHALL be excluded
     from the result (empty-branch pruning). This applies recursively — a
     ``FolderNode`` containing only pruned ``FolderNode``\s is itself pruned.


.. spec:: Collapse All Title-Bar Button (All Tree Views)
   :id: SPEC_EXP_COLLAPSEALL
   :status: approved
   :links: REQ_EXP_TREEVIEW; SPEC_EXP_PROVIDER; SPEC_ACT_TREE

   **Description:**
   Every ``vscode.window.createTreeView()`` call in the extension SHALL pass
   ``showCollapseAll: true`` in its options object, adding VS Code's native
   "Collapse All" title-bar button to each tree view
   (``REQ_EXP_TREEVIEW`` AC-12, ``ui-improvements`` CR). Purely additive UI
   convenience — no ``TreeDataProvider`` interface change, no new command,
   no change to node content or click behavior.

   **Call sites** (6 total, confirmed via repo-wide grep):

   .. list-table::
      :header-rows: 1
      :widths: 30 35 35

      * - View ID
        - File
        - Package
      * - ``jarvisProjects``
        - ``extension.ts`` (``vscode.window.createTreeView``)
        - ``packages/pim``
      * - ``jarvisEvents``
        - ``extension.ts`` (``vscode.window.createTreeView``)
        - ``packages/pim``
      * - ``jarvisSessions``
        - ``extension.ts`` (``vscode.window.createTreeView``)
        - ``packages/core``
      * - ``jarvisMessages``
        - ``extension.ts`` (``vscode.window.createTreeView``)
        - ``packages/core``
      * - ``jarvisReminders``
        - ``extension.ts`` (``vscode.window.createTreeView``)
        - ``packages/core``
      * - ``jarvisHeartbeat``
        - ``apps/session/heartbeat.ts`` (``vscode.window.createTreeView``)
        - ``packages/core``

   **Example change** (representative — same pattern at all 6 sites):

   .. code-block:: typescript

      // Before:
      const projectView = vscode.window.createTreeView('jarvisProjects', {
          treeDataProvider: projectProvider
      });

      // After:
      const projectView = vscode.window.createTreeView('jarvisProjects', {
          treeDataProvider: projectProvider,
          showCollapseAll: true
      });

   **Acceptance Criteria:**

   1. All 6 ``createTreeView()`` call sites listed above pass
      ``showCollapseAll: true``.
   2. No other option on any ``createTreeView()`` call is changed.
   3. VS Code's built-in "Collapse All" command (auto-provided by the
      ``showCollapseAll`` option) requires no explicit command
      registration or ``package.json`` contribution — it is a framework
      feature, not a Jarvis command.
   4. No tree view is newly created or removed by this spec — the 6 call
      sites are exhaustive as of this CR; a future 7th tree view SHALL
      also set ``showCollapseAll: true`` for consistency (not verifiable at
      spec-review time, noted for future authors).

   **Design notes:**

   * ``showCollapseAll`` has no interaction with ``showCollapseAll``'s
     sibling option ``canSelectMany`` or any other existing
     ``createTreeView()`` option at any of the 6 sites — purely additive.
   * VS Code renders the button automatically in the view's title bar
     when 2+ top-level nodes are expandable; for trees with 0-1 expandable
     root nodes the button may be visually absent per VS Code's own
     rendering rules — this is standard VS Code behavior, not a defect in
     this spec.


.. spec:: Feature-Toggled Sidebar Views
   :id: SPEC_EXP_FEATURETOGGLE
   :status: implemented
   :links: REQ_EXP_FEATURETOGGLE; SPEC_CFG_DEFAULTPATHS; SPEC_EXP_EXTENSION

   **Description:**
   The `contributes.views` section in `package.json` SHALL be updated so that
   optional sidebar views carry a `when`-clause that hides them until the
   corresponding feature setting is non-empty.

   **package.json change** (`contributes.views.jarvis-explorer`):

   .. code-block:: json

      [
        { "id": "jarvisProjects",  "name": "Projects" },
        { "id": "jarvisEvents",    "name": "Events",
          "when": "config.jarvis.eventsFolder != ''" },
        { "id": "jarvisMessages",  "name": "Messages",
          "when": "config.jarvis.messagesFile != ''" },
        { "id": "jarvisHeartbeat", "name": "Heartbeat",
          "when": "config.jarvis.heartbeatConfigFile != ''" },
        { "id": "jarvisCategories", "name": "Categories",
          "when": "config.jarvis.pim.showCategories" }
      ]

   **Bootstrap sequence for new installations:**

   1. VS Code starts; `onStartupFinished` fires; extension activates
   2. `SPEC_CFG_DEFAULTPATHS` logic writes resolved paths into
      `jarvis.messagesFile` and `jarvis.heartbeatConfigFile`
   3. VS Code re-evaluates `when`-clauses; Messages and Heartbeat views
      become visible automatically
   4. On subsequent starts the settings are already non-empty; views are
      visible immediately without waiting for `onStartupFinished`

   **Constraints:**

   * The Projects view carries NO `when`-clause (always visible)
   * The Events view is hidden until the user explicitly sets
     `jarvis.eventsFolder` — no default is written for this setting
   * `when`-clause syntax uses `config.<key> != ''`; this evaluates to
     `true` as soon as the setting holds any non-empty string
   * No TypeScript code changes are required for the visibility logic itself;
     VS Code evaluates `when`-clauses natively


.. spec:: Inline Task Nodes + Badge Logic
   :id: SPEC_EXP_TASKTREE
   :status: implemented
   :links: REQ_EXP_TASKTREE; SPEC_PIM_TASKSERVICE; SPEC_EXP_PROVIDER

   **Description:**
   Modifies ``src/projectTreeProvider.ts`` and ``src/eventTreeProvider.ts``
   to inject task child nodes under project/event leaves and an
   "Uncategorized Tasks" top-level section.

   **Tree node types added:**

   .. code-block:: typescript

      type TaskGroupNode = {
          kind: 'taskGroup';
          label: string;      // "Open Tasks (n)" | "Completed Tasks (n)"
          tasks: Task[];
          collapsed: boolean; // Completed groups start collapsed
      };

      type TaskLeafNode = {
          kind: 'taskLeaf';
          task: Task;
      };

      type UncategorizedTasksNode = {
          kind: 'uncategorizedTasks';
          tasks: Task[];
      };

   **ProjectTreeProvider.getChildren(element):**

   * Root level: prepend an ``UncategorizedTasksNode`` (if tasks feature is
     active and uncategorized tasks exist) before all project nodes
   * Project leaf (``ProjectNode``): after the existing leaf item, expand to
     return ``[TaskGroupNode(open), TaskGroupNode(completed)]``, where tasks
     are filtered by ``taskService.getTasks({ category: "Project: <name>" })``
   * ``TaskGroupNode``: return ``TaskLeafNode[]`` from ``node.tasks``
   * ``UncategorizedTasksNode``: return ``TaskLeafNode[]``
   * All task reads are synchronous cache reads (``_taskService.getTasks()``
     called during ``getChildren`` — cache must already be populated by
     heartbeat refresh)

   **EventTreeProvider.getChildren(element):**

   * Event leaf (``EventNode``): same pattern as project leaf, filtered by
     ``taskService.getTasks({ category: "Event: <name>" })``

   **getTreeItem(element):**

   * ``ProjectNode``/``EventNode`` label: plain name (no text suffix).
     Task indicator via ``_applyTaskBadge(item, name)``:

     - Count open tasks ``n``. If ``n === 0``: no change.
     - Set ``item.description = n`` (renders as dimmed count right of label).
     - If any open task has ``dueDate < today``:
       ``item.iconPath = ThemeIcon('warning', ThemeColor('list.warningForeground'))``
     - Else if any open task has ``dueDate ≤ today + 5 days``:
       ``item.iconPath = ThemeIcon('circle-filled', ThemeColor('charts.orange'))``

   * ``TaskGroupNode``: ``collapsibleState = Collapsed`` (completed) or
     ``Expanded`` (open); label = ``"Open Tasks (n)"`` / ``"Completed Tasks (n)"``
   * ``TaskLeafNode``: label = ``<subject>`` when no dueDate, or
     ``<shortDate>  <subject>`` (where ``shortDate = yy-MM-dd``, i.e. ``dueDate.slice(2)``) when set; icon = ``$(check)`` for complete,
     ``$(circle-outline)`` for open; command = open with ``jarvis.taskEditor``
   * ``UncategorizedTasksNode``: label = ``"Uncategorized Tasks (n)"``;
     ``collapsibleState = Collapsed``

   **Guard:**

   All task-related code in ``getChildren`` and ``getTreeItem`` is conditioned
   on ``taskService && taskService.hasProviders()``. When false, behavior is
   identical to the current implementation (no task nodes rendered).

   **Cache-only contract:**

   ``getChildren`` calls ``taskService.getTasks(filter)`` synchronously from
   cache. It does NOT ``await`` — the cache is pre-populated by the heartbeat
   ``"Jarvis: Task Refresh"`` job. If the cache is cold (e.g. first activation
   before the first heartbeat tick), the tree shows no task nodes without error.


.. spec:: Open Heartbeat Job Command
   :id: SPEC_EXP_HEARTBEAT_OPENFILE
   :status: implemented
   :links: REQ_EXP_HEARTBEAT_OPENFILE; SPEC_EXP_EXTENSION

   **Description:**
   Register ``jarvis.openHeartbeatJob`` in ``extension.ts``. Set as
   ``TreeItem.command`` on every ``JobNode`` in ``HeartbeatTreeProvider``.
   Opens ``heartbeat.yaml`` and reveals the line where the job is defined.

   **Handler:**

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.openHeartbeatJob',
        async (node: JobNode) => {
          const configPath = vscode.workspace
            .getConfiguration('jarvis')
            .get<string>('heartbeatConfigFile', '');
          if (!configPath) {
            vscode.window.showWarningMessage('Jarvis: heartbeatConfigFile is not configured.');
            return;
          }
          const uri = vscode.Uri.file(configPath);
          let lineIndex = 0;
          try {
            const doc = await vscode.workspace.openTextDocument(uri);
            const target = `name: ${node.job.name}`;
            for (let i = 0; i < doc.lineCount; i++) {
              if (doc.lineAt(i).text.includes(target)) {
                lineIndex = i;
                break;
              }
            }
            const range = new vscode.Range(lineIndex, 0, lineIndex, 0);
            const editor = await vscode.window.showTextDocument(doc);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
            editor.selection = new vscode.Selection(range.start, range.start);
          } catch {
            vscode.window.showWarningMessage(`Jarvis: Cannot open heartbeat config: ${configPath}`);
          }
        }
      );

   **HeartbeatTreeProvider change:**

   In ``getTreeItem``, for ``JobNode``, set ``item.command``:

   .. code-block:: typescript

      item.command = {
        command: 'jarvis.openHeartbeatJob',
        title: 'Open in heartbeat.yaml',
        arguments: [element]
      };

   **Registration in package.json:**

   * ``contributes.commands``:

     .. code-block:: json

        {
          "command": "jarvis.openHeartbeatJob",
          "title": "Jarvis: Open Heartbeat Job"
        }

   * ``contributes.menus.commandPalette``: hide from Command Palette:

     .. code-block:: json

        { "command": "jarvis.openHeartbeatJob", "when": "false" }

   **Design notes:**

   * ``TreeItem.command`` fires on single-click — no inline button needed
   * Line search uses ``includes()`` — matches both ``name: JobName`` and
     ``  - name: JobName`` (any indentation level)
   * Falls back to ``lineIndex = 0`` if no match is found (fail-open)
   * Disposable pushed to ``context.subscriptions``


.. spec:: Open Message File Command
   :id: SPEC_EXP_MESSAGE_OPENFILE
   :status: implemented
   :links: REQ_EXP_MESSAGE_OPENFILE; SPEC_EXP_EXTENSION

   **Description:**
   Register ``jarvis.openMessageFile`` in ``extension.ts``. Set as
   ``TreeItem.command`` on every ``MessageLeafNode`` in ``MessageTreeProvider``.
   Opens the messages JSON file and reveals the position of the message at the
   node's queue index.

   **Handler:**

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.openMessageFile',
        async (node: MessageLeafNode) => {
          const messagesPath = vscode.workspace
            .getConfiguration('jarvis')
            .get<string>('messagesFile', '');
          if (!messagesPath) {
            vscode.window.showWarningMessage('Jarvis: messagesFile is not configured.');
            return;
          }
          const uri = vscode.Uri.file(messagesPath);
          let lineIndex = 0;
          try {
            const doc = await vscode.workspace.openTextDocument(uri);
            // Find the Nth "text": occurrence (0-based index = node.index)
            let count = -1;
            for (let i = 0; i < doc.lineCount; i++) {
              if (doc.lineAt(i).text.trimStart().startsWith('"text":')) {
                count++;
                if (count === node.index) {
                  lineIndex = i;
                  break;
                }
              }
            }
            const range = new vscode.Range(lineIndex, 0, lineIndex, 0);
            const editor = await vscode.window.showTextDocument(doc);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
            editor.selection = new vscode.Selection(range.start, range.start);
          } catch {
            vscode.window.showWarningMessage(`Jarvis: Cannot open messages file: ${messagesPath}`);
          }
        }
      );

   **MessageTreeProvider change:**

   In ``getTreeItem``, for ``MessageLeafNode``, set ``item.command``:

   .. code-block:: typescript

      item.command = {
        command: 'jarvis.openMessageFile',
        title: 'Open in messages file',
        arguments: [element]
      };

   **Registration in package.json:**

   * ``contributes.commands``:

     .. code-block:: json

        {
          "command": "jarvis.openMessageFile",
          "title": "Jarvis: Open Message File"
        }

   * ``contributes.menus.commandPalette``: hide from Command Palette:

     .. code-block:: json

        { "command": "jarvis.openMessageFile", "when": "false" }

   **Design notes:**

   * ``TreeItem.command`` fires on single-click — no inline button needed
   * The ``"text":`` line heuristic works because the messages JSON format
     places exactly one ``"text":`` field per message object (see ``messageQueue.ts``)
   * ``node.index`` is the 0-based queue position, set by ``MessageTreeProvider``
     during ``getChildren``
   * Falls back to ``lineIndex = 0`` if the index exceeds the number of ``"text":``
     lines found (fail-open)
   * Disposable pushed to ``context.subscriptions``


.. spec:: Open Reminder File Command
   :id: SPEC_EXP_REMINDER_OPENFILE
   :status: draft
   :links: REQ_EXP_REMINDER_OPENFILE; SPEC_MSG_REMINDERSVIEW; SPEC_MSG_REMINDERSTORE; REQ_CFG_PATHSINGLESOURCE

   **Description:**
   Register ``jarvis.openReminderFile`` in ``extension.ts``. Set as
   ``TreeItem.command`` on every ``ReminderNode`` in ``RemindersTreeProvider``.
   Opens ``reminders.yaml`` and reveals the line with the matching reminder id.

   The handler resolves the path through ``configPaths.getRemindersPath()`` —
   the same accessor the reminder store writes through
   (``SPEC_MSG_REMINDERSTORE``). It previously derived the path from the queue
   path, contradicting the element it links; the two agreed only while the
   layout was flat, and ``REQ_CFG_MSGDIR`` ends that. Opening a file by a
   different route from the one that writes it is the defect, independent of
   whether the two routes currently happen to agree.

   **Handler:**

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.openReminderFile',
        async (node: ReminderNode) => {
          const remindersPath = configPaths.getRemindersPath();
          if (!remindersPath || !fs.existsSync(remindersPath)) {
            vscode.window.showWarningMessage(
              `Jarvis: Cannot open reminders file: ${remindersPath ?? '(no workspace)'}`
            );
            return;
          }
          const uri = vscode.Uri.file(remindersPath);
          let lineIndex = 0;
          try {
            const doc = await vscode.workspace.openTextDocument(uri);
            const target = `id: ${node.reminder.id}`;
            for (let i = 0; i < doc.lineCount; i++) {
              if (doc.lineAt(i).text.includes(target)) {
                lineIndex = i;
                break;
              }
            }
            const range = new vscode.Range(lineIndex, 0, lineIndex, 0);
            const editor = await vscode.window.showTextDocument(doc);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
            editor.selection = new vscode.Selection(range.start, range.start);
          } catch {
            vscode.window.showWarningMessage(`Jarvis: Cannot open reminders file: ${remindersPath}`);
          }
        }
      );

   **RemindersTreeProvider change:**

   In ``getTreeItem``, set ``item.command``:

   .. code-block:: typescript

      item.command = {
        command: 'jarvis.openReminderFile',
        title: 'Open in reminders file',
        arguments: [element]
      };

   **Registration in package.json:**

   * ``contributes.commands``:

     .. code-block:: json

        {
          "command": "jarvis.openReminderFile",
          "title": "Jarvis: Open Reminder File"
        }

   * ``contributes.menus.commandPalette``: hide from Command Palette:

     .. code-block:: json

        { "command": "jarvis.openReminderFile", "when": "false" }

   **Design notes:**

   * ``TreeItem.command`` fires on single-click, consistent with messages
     and heartbeat nodes
   * Line match uses substring contains of ``id: <uuid>`` — fails open to
     line 0 if the id is not found
   * Disposable pushed to ``context.subscriptions``


.. spec:: Tree Search — Manifest
   :id: SPEC_EXP_SEARCH_MANIFEST
   :status: deprecated
   :links: REQ_EXP_SEARCHPROJECTS; REQ_EXP_SEARCHEVENTS; SPEC_EXP_EXTENSION; SPEC_EXP_SEARCH_ENTITIES_MANIFEST

   **(HISTORICAL — superseded by unified-entity-tree CR, see**
   **``SPEC_EXP_SEARCH_ENTITIES_MANIFEST``.) The** ``jarvisProjects``/
   ``jarvisEvents`` **views these menus targeted no longer exist as
   standalone views. Kept below for traceability.**

   **Description:**
   Package.json additions for the two tree search commands.

   **``contributes.commands``:**

   .. code-block:: json

      [
        {
          "command": "jarvis.searchProjects",
          "title": "Jarvis: Search Projects",
          "icon": "$(search)"
        },
        {
          "command": "jarvis.searchEvents",
          "title": "Jarvis: Search Events",
          "icon": "$(search)"
        }
      ]

   **``contributes.menus.view/title``:**

   .. code-block:: json

      [
        {
          "command": "jarvis.searchProjects",
          "when": "view == jarvisProjects",
          "group": "navigation"
        },
        {
          "command": "jarvis.searchEvents",
          "when": "view == jarvisEvents",
          "group": "navigation"
        }
      ]

   **``contributes.menus.commandPalette``:**

   .. code-block:: json

      [
        { "command": "jarvis.searchProjects", "when": "false" },
        { "command": "jarvis.searchEvents",   "when": "false" }
      ]


.. spec:: Tree Search — Command Handlers
   :id: SPEC_EXP_SEARCH_CMD
   :status: deprecated
   :links: REQ_EXP_SEARCHPROJECTS; REQ_EXP_SEARCHEVENTS; SPEC_ENG_SCANNER; SPEC_EXP_PROVIDER; SPEC_EXP_SEARCH_MANIFEST; SPEC_EXP_SEARCH_ENTITIES_CMD

   **(HISTORICAL — superseded by unified-entity-tree CR, see**
   **``SPEC_EXP_SEARCH_ENTITIES_CMD``.) Kept below for traceability.**

   **Description:**
   Register ``jarvis.searchProjects`` and ``jarvis.searchEvents`` in
   ``extension.ts``. Both commands use ``vscode.window.createQuickPick()``
   (not ``showQuickPick``) so VS Code applies its built-in fuzzy filter as
   the user types. Items are populated once from the scanner cache at open
   time; no dynamic reload is needed.

   **Shared helper (local to ``activate()``):**

   .. code-block:: typescript

      function flattenLeaves(nodes: TreeNode[]): LeafNode[] {
          const result: LeafNode[] = [];
          for (const node of nodes) {
              if (node.kind === 'leaf') {
                  result.push(node);
              } else {
                  result.push(...flattenLeaves(node.children));
              }
          }
          return result;
      }

   **``jarvis.searchProjects`` handler:**

   .. code-block:: typescript

      vscode.commands.registerCommand('jarvis.searchProjects', () => {
          type PItem = vscode.QuickPickItem & { leaf: LeafNode };
          const leaves = flattenLeaves(scanner.getProjectTree());
          const items: PItem[] = leaves.map(leaf => {
              const entity = scanner.getEntity(leaf.id);
              const name = entity?.name
                  ?? path.basename(path.dirname(leaf.id));
              return { label: name, description: leaf.id, leaf };
          });
          const qp = vscode.window.createQuickPick<PItem>();
          qp.items = items;
          qp.matchOnDescription = true;
          qp.onDidAccept(() => {
              const sel = qp.selectedItems[0];
              qp.hide();
              if (sel?.leaf) {
                  projectTreeView.reveal(
                      sel.leaf, { select: true, focus: true, expand: true });
              }
          });
          qp.onDidHide(() => qp.dispose());
          qp.show();
      });

   **``jarvis.searchEvents`` handler:**

   .. code-block:: typescript

      vscode.commands.registerCommand('jarvis.searchEvents', () => {
          type EItem = vscode.QuickPickItem & { leaf: LeafNode };
          const leaves = flattenLeaves(scanner.getEventTree());
          const items: EItem[] = leaves.map(leaf => {
              const entity = scanner.getEntity(leaf.id);
              const name = entity?.name
                  ?? path.basename(path.dirname(leaf.id));
              return {
                  label: name,
                  description: entity?.datesStart,
                  leaf
              };
          });
          const qp = vscode.window.createQuickPick<EItem>();
          qp.items = items;
          qp.matchOnDescription = true;
          qp.onDidAccept(() => {
              const sel = qp.selectedItems[0];
              qp.hide();
              if (sel?.leaf) {
                  eventTreeView.reveal(
                      sel.leaf, { select: true, focus: true, expand: true });
              }
          });
          qp.onDidHide(() => qp.dispose());
          qp.show();
      });

   **Design notes:**

   * ``createQuickPick()`` is used instead of ``showQuickPick()`` to expose
     the ``QuickPick<T>`` API; VS Code performs built-in fuzzy filtering on
     ``label`` and (when ``matchOnDescription = true``) on ``description``
     automatically — no ``onDidChangeValue`` handler is needed
   * Items are sourced from the raw scanner cache (all projects/events), not
     from the tree provider — this means the folder filter and the future-only
     event filter are intentionally not applied in the QuickPick. All entities
     are searchable regardless of current filter state
   * ``TreeView.reveal()`` is called on the ``LeafNode`` directly; the VS Code
     API will expand parent folders automatically via ``expand: true``
   * ``projectTreeView`` and ``eventTreeView`` are ``vscode.TreeView<TreeNode>``
     references already held in ``extension.ts``
   * Both disposables are pushed to ``context.subscriptions``


.. spec:: Unified Jarvis Entities Tree Provider
   :id: SPEC_EXP_UNIFIEDTREE
   :status: approved
   :links: REQ_EXP_UNIFIEDTREE; SPEC_EXP_EXTENSION

   **Description:**
   A new wrapper ``TreeDataProvider``, ``UnifiedEntityTreeProvider``, lives in
   ``packages/core`` and composes the per-kind providers already produced by
   ``engine.treeFactory.getProvider(kind)`` for every kind the engine knows
   about (``'session'``, ``'project'``, ``'event'``). It is the single
   ``treeDataProvider`` passed to ``createTreeView('jarvisEntities', ...)``,
   replacing the three separate ``createTreeView()`` calls for
   ``jarvisActors``/``jarvisProjects``/``jarvisEvents``.

   **Root node type union:**

   .. code-block:: typescript

      type UnifiedRootNode =
          | { kind: 'category'; entityKind: string; label: string }
          | TreeNode;  // existing per-kind root node, unchanged

   **``getChildren(element?)``:**

   .. code-block:: typescript

      getChildren(element?: UnifiedRootNode): UnifiedRootNode[] {
          if (element === undefined) {
              // Root level: always emit one category node per registered kind
              // (REQ_EXP_UNIFIEDTREE AC-3/4 — no flattening, categories unconditional)
              return this._registeredKinds().map(kind => ({
                  kind: 'category', entityKind: kind, label: this._pluralLabel(kind)
              }));
          }
          if ('entityKind' in element) {
              // Category node expands into that kind's existing root nodes, unchanged
              return this._kindProvider(element.entityKind).getChildren();
          }
          // Any other node: delegate straight to its owning kind's provider
          return this._kindProvider(this._kindOf(element)).getChildren(element);
      }

   **``getTreeItem(element)``:** for category nodes, returns a
   ``vscode.TreeItem`` with ``label`` passed through ``toBoldUnicode()`` —
   VS Code's ``TreeItem`` API has no font-weight attribute, and
   ``TreeItemLabel.highlights`` renders as a search-match highlight color
   (not bold), so bold rendering (REQ_EXP_UNIFIEDTREE AC-13) is achieved by
   substituting Unicode Mathematical Sans-Serif Bold codepoints for ASCII
   letters/digits (non-alphanumeric characters pass through unchanged) —
   ``contextValue: 'jarvisEntityCategory:' + entityKind``,
   ``collapsibleState: vscode.TreeItemCollapsibleState.Expanded`` (or
   ``None`` if that kind's provider returns an empty root — so the empty
   category shows no expand arrow per AC-4). For any other node, delegates
   to the owning kind's provider's own ``getTreeItem()`` unchanged (AC-9 —
   no per-leaf behavior change).

   **Refresh forwarding (AC-6):**

   .. code-block:: typescript

      // Subscribe to already-registered kinds at construction time
      for (const kind of engine.treeFactory.registeredKinds) {
          const provider = engine.treeFactory.getProvider(kind);
          if (provider) {
              this._subscriptions.push(
                  provider.onDidChangeTreeData(() => {
                      this._onDidChangeTreeData.fire(undefined);
                  })
              );
          }
      }

      // Late-registration handling (AC-12): subscribe to kinds added after
      // construction (e.g. PIM registers project/event after core activates)
      this._subscriptions.push(
          engine.treeFactory.onDidAddKind(kind => {
              const provider = engine.treeFactory.getProvider(kind);
              if (provider) {
                  this._subscriptions.push(
                      provider.onDidChangeTreeData(() => {
                          this._onDidChangeTreeData.fire(undefined);
                      })
                  );
              }
              // Refresh entire tree so new category node appears
              this._onDidChangeTreeData.fire(undefined);
          })
      );

   **``GenericTreeFactory.onDidAddKind`` (new, AC-12):**

   ``GenericTreeFactory`` SHALL expose a ``readonly onDidAddKind: vscode.Event<string>``
   event, fired from ``addKind()`` after the new provider is created. This is a
   one-line addition to ``addKind()`` (fire the emitter with ``config.kind``)
   plus a private ``EventEmitter<string>`` field.

   **Registration (``packages/core/src/extension.ts``, replacing the three
   standalone ``createTreeView()`` blocks):**

   .. code-block:: typescript

      const unifiedProvider = new UnifiedEntityTreeProvider(engine.treeFactory);
      const entitiesView = vscode.window.createTreeView('jarvisEntities', {
          treeDataProvider: unifiedProvider,
          showCollapseAll: true,
      });
      // Dynamic title: show first workspace folder name (the one scanned
      // for .jarvis), falling back to the static "Jarvis Entities" title
      // from package.json if no workspace folder is open (REQ_EXP_UNIFIEDTREE AC-14).
      const firstFolder = vscode.workspace.workspaceFolders?.[0];
      if (firstFolder) {
          entitiesView.title = `${firstFolder.name} Entities`;
      }
      context.subscriptions.push(entitiesView, unifiedProvider);

   **Design notes:**

   * ``packages/pim/src/extension.ts`` no longer calls ``createTreeView()``
     for ``'jarvisProjects'``/``'jarvisEvents'`` (``SPEC_EXP_EXTENSION``'s
     manifest sample is amended accordingly); it continues to call
     ``api.registerEntityKind(buildProjectKindConfig(...))``/
     ``api.registerEntityKind(buildEventKindConfig(...))`` unchanged, now
     additionally guarding the Event registration behind
     ``jarvis.events.enabled`` (REQ_EXP_UNIFIEDTREE AC-8) — mirroring
     ``packages/core``'s existing ``if (cfg.get('sessions.enabled', true))``
     pattern for Actors.
   * ``packages/pim/package.json`` ``activationEvents`` SHALL include
     ``onView:jarvisEntities`` (AC-11) — this replaces the removed
     ``onView:jarvisProjects``/``onView:jarvisEvents`` triggers and ensures
     PIM activates whenever the unified tree is opened. Together with the
     existing ``onView:jarvisCategories`` (for Outlook-enabled workspaces),
     PIM has two reliable lazy-activation paths. ``onStartupFinished`` is
     deliberately NOT added: PIM activation outside the Jarvis sidebar
     context is unnecessary overhead.
   * ``_pluralLabel(kind)`` is a small fixed lookup (``session`` → "Actors",
     ``project`` → "Projects", ``event`` → "Events") local to the new
     provider — no change to ``EntityKindConfig`` itself is required for this
     CR.
   * Category nodes are unconditional — ``_hasEntities()`` is no longer
     consulted for grouping/flatten decisions (earlier draft's flatten logic
     removed by PM decision). An empty kind simply expands to an empty list.
   * The wrapper never re-implements scanning, sorting, filtering, or
     leaf-node rendering — all of that remains exactly as implemented per
     kind today (Project's folder filter, Event's future filter and
     date-sort, Actor's file-children expansion all continue to work
     unmodified beneath their respective root nodes).

   **Per-kind "New" action placement (REQ_EXP_UNIFIEDTREE AC-10):**

   The per-kind "New" commands (``jarvis.newActor``, ``jarvis.newProject``,
   ``jarvis.newEvent``) are placed as inline icons (``$(add)``) on their
   respective category nodes, not on the ``jarvisEntities`` view title bar.

   ``contributes.menus.view/item/context`` entries:

   .. code-block:: json

      [
        {
          "command": "jarvis.newActor",
          "when": "view == jarvisEntities && viewItem == jarvisEntityCategory:session",
          "group": "inline"
        },
        {
          "command": "jarvis.newProject",
          "when": "view == jarvisEntities && viewItem == jarvisEntityCategory:project",
          "group": "inline"
        },
        {
          "command": "jarvis.newEvent",
          "when": "view == jarvisEntities && viewItem == jarvisEntityCategory:event",
          "group": "inline"
        }
      ]

   The ``view/title`` entries for these three commands are removed. Each
   command remains in the Command Palette (``when: "true"`` or no exclusion)
   so it can be invoked without clicking the tree.


.. spec:: Live Filter Entities \u2014 Manifest
   :id: SPEC_EXP_SEARCH_ENTITIES_MANIFEST
   :status: approved
   :links: REQ_EXP_SEARCHENTITIES; SPEC_EXP_UNIFIEDTREE

   **``contributes.commands``:**

   .. code-block:: json

      [
        {
          "command": "jarvis.searchEntities",
          "title": "Jarvis: Search Entities",
          "icon": "$(search)"
        }
      ]

   **``contributes.menus.view/title``:**

   .. code-block:: json

      [
        {
          "command": "jarvis.searchEntities",
          "when": "view == jarvisEntities",
          "group": "navigation"
        }
      ]

   **``contributes.menus.commandPalette``:**

   .. code-block:: json

      [
        { "command": "jarvis.searchEntities", "when": "false" }
      ]

   ``jarvis.searchProjects``/``jarvis.searchEvents`` and their manifest
   entries (``SPEC_EXP_SEARCH_MANIFEST``) are removed entirely (not merely
   hidden) — see the Artefakt-Removal-Check in this CR's Change Document.


.. spec:: Live Filter Entities \u2014 Command Handler
   :id: SPEC_EXP_SEARCH_ENTITIES_CMD
   :status: approved
   :links: REQ_EXP_SEARCHENTITIES; SPEC_EXP_UNIFIEDTREE; SPEC_EXP_SEARCH_ENTITIES_MANIFEST

   **Description (pivoted — see REQ_EXP_SEARCHENTITIES "Pivot rationale"):**
   The originally specified reveal-based QuickPick-item-list approach was
   blocked by the missing ``TreeDataProvider.getParent()`` implementation.
   The shipped command instead uses a ``vscode.QuickPick`` purely as a live
   text-input box, applying the typed value as a search filter directly on
   each kind's ``GenericTreeDataProvider``, which re-renders its
   ``getChildren()`` output through a recursive name/summary filter.

   **Command handler (``packages/core/src/extension.ts``):**

   .. code-block:: typescript

      const searchEntitiesCommand = vscode.commands.registerCommand('jarvis.searchEntities', () => {
          const qp = vscode.window.createQuickPick();
          qp.placeholder = 'Type to filter entities in the tree...';
          qp.matchOnDescription = false;
          qp.matchOnDetail = false;

          // Apply search filter to all providers on every keystroke
          qp.onDidChangeValue((query) => {
              const trimmed = query.trim();
              for (const kind of ['session', 'project', 'event']) {
                  const provider = engine.treeFactory.getProvider(kind);
                  if (provider) {
                      provider.setSearchFilter(trimmed);
                  }
              }
          });

          // Clear filter when closed
          qp.onDidHide(() => {
              for (const kind of ['session', 'project', 'event']) {
                  const provider = engine.treeFactory.getProvider(kind);
                  if (provider) {
                      provider.setSearchFilter('');
                  }
              }
              qp.dispose();
          });

          qp.show();
      });

   **``GenericTreeDataProvider`` additions (``packages/core/src/engine/core/treeFactory.ts``):**

   .. code-block:: typescript

      private _searchQuery: string = '';

      setSearchFilter(query: string): void {
          this._searchQuery = query.toLowerCase().trim();
          this.refresh();
      }

      getSearchFilter(): string {
          return this._searchQuery;
      }

   **Filtering logic — ``_applyFilters()``/``_applySearchFilter()`` (same file):**

   .. code-block:: typescript

      private _applyFilters(nodes: TreeNode[]): TreeNode[] {
          // Kind-specific filters first (Project folder filter / Event future-only)
          if (this._config.kind === 'project' && this._hiddenFolders.size > 0) {
              nodes = nodes.filter(n => n.kind !== 'folder' || !this._hiddenFolders.has(n.name));
          } else if (this._config.kind === 'event' && this._futureOnly) {
              nodes = this._applyEventFilter(nodes);
          }
          // Search filter applied on top (REQ_EXP_SEARCHENTITIES AC-9: combined, not exclusive)
          if (this._searchQuery) {
              nodes = this._applySearchFilter(nodes);
          }
          return nodes;
      }

      private _applySearchFilter(nodes: TreeNode[]): TreeNode[] {
          const filtered: TreeNode[] = [];
          for (const node of nodes) {
              if (node.kind === 'leaf') {
                  const entity = this._scanner.getEntity(node.id);
                  const name = entity?.name?.toLowerCase() ?? '';
                  const summary = entity?.summary?.toLowerCase() ?? '';
                  if (name.includes(this._searchQuery) || summary.includes(this._searchQuery)) {
                      filtered.push(node);
                  }
              } else if (node.kind === 'folder') {
                  // Recursive: keep folder only if it has at least one matching descendant
                  const filteredChildren = this._applySearchFilter(node.children);
                  if (filteredChildren.length > 0) {
                      filtered.push({ ...node, children: filteredChildren });
                  }
              } else {
                  filtered.push(node); // file nodes pass through unfiltered
              }
          }
          return filtered;
      }

   **Auto-expand while filtering — ``getTreeItem()`` folder branch:**

   .. code-block:: typescript

      if (element.kind === 'folder') {
          const collapsibleState = this._searchQuery
              ? vscode.TreeItemCollapsibleState.Expanded
              : vscode.TreeItemCollapsibleState.Collapsed;
          const item = new vscode.TreeItem(element.name, collapsibleState);
          item.contextValue = 'jarvisFolder';
          return item;
      }

   **Design notes:**

   * The QuickPick never populates ``items`` and never handles
     ``onDidAccept`` — there is no "select a result" step. The QuickPick
     exists solely to host a live text field; all visible feedback happens
     in the ``jarvisEntities`` tree via re-rendering.
   * ``TreeView.reveal()`` is NOT used by this command (superseded design
     decision — see REQ_EXP_SEARCHENTITIES "Pivot rationale"). No
     ``entitiesView`` reference or ``getParent()`` implementation is
     required by this feature.
   * The search filter and the existing per-kind filters (Project hidden
     folders, Event future-only) are applied in the same ``_applyFilters()``
     pipeline, in sequence — a node must pass both to remain visible
     (REQ_EXP_SEARCHENTITIES AC-9).
   * Filter state lives per-provider (``_searchQuery`` field on each
     ``GenericTreeDataProvider`` instance), not on the unified wrapper —
     ``UnifiedEntityTreeProvider`` is unaffected by this feature beyond
     forwarding the resulting ``refresh()`` calls (already covered by
     ``SPEC_EXP_UNIFIEDTREE`` AC-6's refresh forwarding).
   * Scope note: only basic substring matching on ``name``/``summary`` is
     implemented. Fuzzy matching, additional match fields, or a persistent
     filter history are out of scope for this CR (see REQ_EXP_SEARCHENTITIES
     "Scope note") and deferred to a follow-up CR.


