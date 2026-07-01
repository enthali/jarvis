Explorer Design Specifications
===============================

.. spec:: Extension Manifest & Activation
   :id: SPEC_EXP_EXTENSION
   :status: implemented
   :links: REQ_EXP_ACTIVITYBAR, REQ_CFG_FOLDERPATHS, REQ_CFG_SCANINTERVAL, REQ_PRJ_FILTERPERSIST, REQ_EVT_EVENTFILTERPERSIST, REQ_ENT_OPENYAML, REQ_EXP_NEWPROJECT, REQ_EXP_NEWEVENT, REQ_ENT_SCANREFRESH, REQ_EXP_FEATURETOGGLE, REQ_CFG_DEFAULTPATHS, REQ_ENT_CONTEXTACTIONS

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
   1. ``activateHeartbeat(context, ...)`` → returns ``HeartbeatScheduler``
   2. ``scanner = new YamlScanner(callback)``
   3. ``scanner.start(projectsFolder, eventsFolder)`` → immediate scan (no timer)
   4. ``syncRescanJob()`` → if ``scanInterval > 0``: ``scheduler.registerJob(rescanJob)``

   A ``syncRescanJob()`` helper reads ``jarvis.scanInterval`` and either registers or
   unregisters the ``"Jarvis: Rescan"`` heartbeat job. The config change handler calls
   ``syncRescanJob()`` when ``jarvis.scanInterval`` changes, and ``startScanner()`` when
   folder paths change.

   **New-entity manifest additions:**

   * ``contributes.commands``: ``jarvis.newProject`` (title "Jarvis: New Project",
     icon ``$(add)``) and ``jarvis.newEvent`` (title "Jarvis: New Event",
     icon ``$(add)``)
   * ``contributes.menus.view/title``: two entries —
     ``jarvis.newProject`` with ``when: "view == jarvisProjects"`` (group ``navigation``)
     and ``jarvis.newEvent`` with ``when: "view == jarvisEvents"`` (group ``navigation``)
   * ``contributes.menus.commandPalette``: hide both commands (``when: "false"``)

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
   A helper function in ``src/extension.ts`` that bridges the YamlScanner and the
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


.. spec:: New Project Command
   :id: SPEC_EXP_NEWPROJECT_CMD
   :status: draft
   :links: REQ_EXP_NEWPROJECT; REQ_EXP_REACTIVECACHE; SPEC_ENG_SCANNER; SPEC_EXP_EXTENSION; SPEC_ENT_AGENT_PICKER

   **Description:**
   Register ``jarvis.newProject`` in ``extension.ts``. Triggered by the ``$(add)``
   icon in the Projects view title bar. Creates a new project folder with
   ``project.yaml`` and opens the new entity's chat editor (same new-session
   pattern used by ``jarvis.newSession``).

   **Handler flow:**

   1. Read ``jarvis.projectsFolder`` from configuration.
      If empty, show warning notification and return.
   2. Show ``InputBox`` with prompt ``"Project name"``,
      ``placeHolder: "My Project"``, with ``validateInput``:

      .. code-block:: typescript

         validateInput: (value: string) => {
             if (/[<>:"\/\\|?*\x00-\x1f]/.test(value)) {
                 return 'Name contains characters not allowed in folder names';
             }
             if (!value.trim()) {
                 return 'Name must not be empty';
             }
             return undefined;
         }

   3. If user cancels (``undefined``), return.
   4. Invoke ``pickAgentMode()`` (per ``SPEC_ENT_AGENT_PICKER``).
   5. If picker returns ``undefined`` (cancel), return (creation aborted).
   6. Use raw input as folder name (verbatim, no transformation).
   7. Compute target path: ``path.join(projectsFolder, input)``.
   8. If target path already exists (``fs.existsSync``), show error notification
      ``"Folder '<input>' already exists in projects folder"`` and return.
   9. Create directory: ``await fs.promises.mkdir(targetPath)``.
   10. Write ``project.yaml``:

       .. code-block:: typescript

          const agent = pickerResult; // "" or "<agent-name>"
          const content = `name: "${input}"\nagent: "${agent}"\n`;
          await fs.promises.writeFile(
              path.join(targetPath, 'project.yaml'), content, 'utf-8');

   11. Trigger scanner rescan: ``await scanner.rescan()``.
   12. Open chat editor (per ``SPEC_ENT_AGENT_PICKER`` Chat-Open Primitive):

       .. code-block:: typescript

          // Mode-prime (only for concrete agent)
          if (pickerResult) {
              try {
                  await vscode.commands.executeCommand(
                      'workbench.action.chat.open', { mode: pickerResult }
                  );
                  await new Promise(resolve => setTimeout(resolve, 300));
              } catch (err) {
                  log.warn(`Mode-prime failed: ${err}`);
              }
          }
          // Editor creation (always)
          await openNewChatEditor();  // SPEC_MSG_OPENCHAT

   **Disposable** pushed to ``context.subscriptions``.

   **Registration in package.json** — see ``SPEC_EXP_EXTENSION``.


.. spec:: New Event Command
   :id: SPEC_EXP_NEWEVENT_CMD
   :status: draft
   :links: REQ_EXP_NEWEVENT; REQ_EXP_REACTIVECACHE; SPEC_ENG_SCANNER; SPEC_EXP_EXTENSION; SPEC_ENT_AGENT_PICKER

   **Description:**
   Register ``jarvis.newEvent`` in ``extension.ts``. Triggered by the ``$(add)``
   icon in the Events view title bar. Creates a new event folder with
   ``event.yaml`` and opens the new entity's chat editor (same new-session
   pattern used by ``jarvis.newSession``).

   **Handler flow:**

   1. Read ``jarvis.eventsFolder`` from configuration.
      If empty, show warning notification and return.
   2. Show ``InputBox`` with prompt ``"Event name"``,
      ``placeHolder: "My Event"``, with ``validateInput``:

      .. code-block:: typescript

         validateInput: (value: string) => {
             if (/[<>:"\/\\|?*\x00-\x1f]/.test(value)) {
                 return 'Name contains characters not allowed in folder names';
             }
             if (!value.trim()) {
                 return 'Name must not be empty';
             }
             return undefined;
         }

   3. If user cancels (``undefined``), return.
   4. Show second ``InputBox`` with prompt ``"Start date (YYYY-MM-DD)"``,
      ``placeHolder: "2026-01-15"``, with ``validateInput``:

      .. code-block:: typescript

         validateInput: (value: string) => {
             if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                 return 'Date must be in YYYY-MM-DD format';
             }
             const [y, m, d] = value.split('-').map(Number);
             const date = new Date(y, m - 1, d);
             if (date.getFullYear() !== y ||
                 date.getMonth() !== m - 1 ||
                 date.getDate() !== d) {
                 return 'Not a valid calendar date';
             }
             return undefined;
         }

   5. If user cancels (``undefined``), return.
   6. Invoke ``pickAgentMode()`` (per ``SPEC_ENT_AGENT_PICKER``).
   7. If picker returns ``undefined`` (cancel), return (creation aborted).
   8. Derive folder name: ```${dateInput}_${nameInput}`` (underscore separator,
      raw name verbatim).
   9. Compute target path: ``path.join(eventsFolder, folderName)``.
   10. If target path already exists (``fs.existsSync``), show error notification
       ``"Folder '<folderName>' already exists in events folder"`` and return.
   11. Create directory: ``await fs.promises.mkdir(targetPath)``.
   12. Write ``event.yaml``:

       .. code-block:: typescript

          const agent = pickerResult; // "" or "<agent-name>"
          const content = [
              `name: "${nameInput}"`,
              `agent: "${agent}"`,
              `dates:`,
              `  start: "${dateInput}"`,
              `  end: "${dateInput}"`,
              ''
          ].join('\n');
          await fs.promises.writeFile(
              path.join(targetPath, 'event.yaml'), content, 'utf-8');

   13. Trigger scanner rescan: ``await scanner.rescan()``.
   14. Open chat editor (per ``SPEC_ENT_AGENT_PICKER`` Chat-Open Primitive):

       .. code-block:: typescript

          // Mode-prime (only for concrete agent)
          if (pickerResult) {
              try {
                  await vscode.commands.executeCommand(
                      'workbench.action.chat.open', { mode: pickerResult }
                  );
                  await new Promise(resolve => setTimeout(resolve, 300));
              } catch (err) {
                  log.warn(`Mode-prime failed: ${err}`);
              }
          }
          // Editor creation (always)
          await openNewChatEditor();  // SPEC_MSG_OPENCHAT

   **Disposable** pushed to ``context.subscriptions``.

   **Registration in package.json** — see ``SPEC_EXP_EXTENSION``.


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
   :links: REQ_EXP_REMINDER_OPENFILE; SPEC_MSG_REMINDERSVIEW; SPEC_MSG_REMINDERSTORE

   **Description:**
   Register ``jarvis.openReminderFile`` in ``extension.ts``. Set as
   ``TreeItem.command`` on every ``ReminderNode`` in ``RemindersTreeProvider``.
   Opens ``reminders.yaml`` and reveals the line with the matching reminder id.

   **Handler:**

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.openReminderFile',
        async (node: ReminderNode) => {
          const remindersPath = resolveRemindersPath(resolveMessagesPath());
          if (!fs.existsSync(remindersPath)) {
            vscode.window.showWarningMessage(
              `Jarvis: Cannot open reminders file: ${remindersPath}`
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
   :status: implemented
   :links: REQ_EXP_SEARCHPROJECTS; REQ_EXP_SEARCHEVENTS; SPEC_EXP_EXTENSION

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
   :status: implemented
   :links: REQ_EXP_SEARCHPROJECTS; REQ_EXP_SEARCHEVENTS; SPEC_ENG_SCANNER; SPEC_EXP_PROVIDER; SPEC_EXP_SEARCH_MANIFEST

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


