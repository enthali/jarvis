Explorer Design Specifications
===============================

.. spec:: Extension Manifest & Activation
   :id: SPEC_EXP_EXTENSION
   :status: implemented
   :links: REQ_EXP_ACTIVITYBAR, REQ_CFG_FOLDERPATHS, REQ_CFG_SCANINTERVAL, REQ_EXP_FILTERPERSIST, REQ_EXP_EVENTFILTERPERSIST, REQ_EXP_OPENYAML, REQ_EXP_NEWPROJECT, REQ_EXP_NEWEVENT, REQ_EXP_RESCAN_BTN, REQ_EXP_FEATURETOGGLE, REQ_CFG_DEFAULTPATHS, REQ_EXP_CONTEXTACTIONS

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
   :links: REQ_CFG_SCANINTERVAL; SPEC_AUT_JOBREG; SPEC_EXP_SCANNER

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
   :links: REQ_EXP_TREEVIEW, REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE, REQ_EXP_PROJECTFILTER, REQ_EXP_EVENTFILTER, REQ_EVT_DATESORT, SPEC_EXP_SCANNER

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


.. spec:: YAML Scanner Service
   :id: SPEC_EXP_SCANNER
   :status: implemented
   :links: REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE, REQ_EXP_NAMESORT, REQ_EVT_DATESORT

   **Description:**
   File ``src/yamlScanner.ts`` — background scanner service with two-layer output.
   The scanner does NOT own a timer; periodic re-scanning is managed via a
   heartbeat job (see ``SPEC_AUT_JOBREG``).

   **Data Types:**

   .. code-block:: typescript

      interface EntityEntry {
          name: string;
          datesEnd?: string;         // event end date YYYY-MM-DD; undefined for projects or if absent
          datesStart?: string;       // event start date YYYY-MM-DD; undefined for projects or if absent
      }

      interface FolderNode {
          kind: 'folder';
          name: string;              // folder name
          children: TreeNode[];
      }

      interface LeafNode {
          kind: 'leaf';
          id: string;                // key into entity store
      }

      type TreeNode = FolderNode | LeafNode;

   **Public Interface:**

   * ``constructor(onCacheChanged: () => void)``
   * ``start(projectsFolder, eventsFolder): void`` — stores folder paths and
     performs one immediate scan. Does NOT create a timer.
   * ``stop(): void`` — no-op (no timer to clear); kept for API compatibility
   * ``rescan(): Promise<void>`` — triggers an immediate re-scan using the folder
     paths stored from the last ``start()`` call. No-op if ``start()`` has not been
     called yet.
   * ``getProjectTree(): TreeNode[]`` — returns root-level children for projects
   * ``getEventTree(): TreeNode[]`` — returns root-level children for events
   * ``getEntity(id: string): EntityEntry | undefined`` — looks up entity by id

   **Stored folder paths:**

   ``start()`` stores ``projectsFolder`` and ``eventsFolder`` in private fields
   (``_projectsFolder``, ``_eventsFolder``) so that ``rescan()`` can call
   ``_scan(_projectsFolder, _eventsFolder)`` without requiring the caller to
   supply paths again.

   **Scan Logic (convention file model):**

   ``_buildTree(folder, entities, conventionFile)`` where ``conventionFile`` is
   ``'project.yaml'`` or ``'event.yaml'``:

   * Read directory entries. For each subdirectory:

     1. Check whether ``conventionFile`` exists in that subdirectory.
     2. **Convention file found and valid** — read it, extract ``name``
        (+ ``datesEnd`` for events via ``doc['dates']?.['end']``). Store
        ``EntityEntry`` keyed by the convention file's absolute path.
        Emit ``LeafNode`` with ``id`` = convention file path. **No further
        descent** into the subdirectory.
     3. **Convention file found but invalid** (unparseable or missing ``name``) —
        emit ``LeafNode`` with ``id`` = convention file path. Store
        ``EntityEntry`` with ``name`` = folder name (fallback). No further descent.
     4. **No convention file** — recurse into the subdirectory → ``FolderNode``
        (only if children exist; empty grouping folders are omitted).

   * Non-YAML files and YAML files other than the convention file are ignored.
   * Compares new tree + entity map against cached versions;
     fires ``onCacheChanged()`` only when diff detected.

   **Entity-map comparison (scanner-refresh change):**

   The ``_scan()`` method SHALL compare the new entity map against the cached
   entity map in addition to comparing tree structures. Comparison is done by
   converting each map to a sorted array of ``[key, JSON.stringify(value)]``
   pairs and comparing the resulting strings. This ensures that changes to
   YAML content (e.g. ``name`` or ``dates.end``) are detected even when the
   tree structure (folder/leaf paths) remains identical.

   **Sort logic (scanner-refresh change):**

   After ``_buildTree()`` has assembled all nodes for a directory level, it
   SHALL sort them alphabetically before returning. The sort key is:

   * ``LeafNode``: ``entities.get(node.id)?.name?.toLowerCase()`` (fallback:
     ``path.basename(path.dirname(node.id)).toLowerCase()``)
   * ``FolderNode``: ``node.name.toLowerCase()``

   **Event date sort override (event-sort change):**

   When ``conventionFile === 'event.yaml'``, the sort key for ``LeafNode``\s
   SHALL be ``(entity.datesStart ?? '') + entity.name.toLowerCase()`` instead
   of ``entity.name.toLowerCase()`` alone. This ensures events with a start date
   sort chronologically (YYYY-MM-DD is lexicographically sortable), while events
   without a date sort after all dated events (empty string prefix).

   Folders and leaves are interleaved — the sort treats all children uniformly.
   The sort is applied recursively (each call to ``_buildTree`` sorts its own
   level). ``localeCompare`` is used for comparison.

   **``datesStart`` extraction (event-sort change):**

   In ``_buildTree()``, when reading the convention file for events, the scanner
   SHALL also extract ``dates.start``:

   * If ``dates.start`` is a ``Date`` object (YAML auto-parses unquoted dates) →
     ``toISOString().slice(0, 10)``
   * If ``dates.start`` is a ``string`` → use directly
   * Otherwise → ``undefined`` (field omitted from ``EntityEntry``)

   **Callers in ``_scan()``:**

   * ``_buildTree(projectsFolder, entities, 'project.yaml')`` for projects
   * ``_buildTree(eventsFolder, entities, 'event.yaml')`` for events

   Dependency: ``js-yaml`` in ``package.json`` dependencies.

   **Design note:** ``EntityEntry`` will be further enriched in future changes
   (summary, tasks, emails).


.. spec:: Project Folder Filter Command
   :id: SPEC_EXP_FILTERCOMMAND
   :status: implemented
   :links: REQ_EXP_PROJECTFILTER, REQ_EXP_FILTERPERSIST, SPEC_EXP_SCANNER, SPEC_EXP_PROVIDER

   **Description:**
   A new command ``jarvis.filterProjectFolders`` implements the filter dialog using a
   single-click toggle QuickPick (no OK button — each click applies immediately).

   **Flow:**

   1. Collect root-level ``FolderNode`` names from ``scanner.getProjectTree()``
   2. Build QuickPick items: one per folder, with ``$(check)`` if visible, ``$(circle-large-outline)`` if hidden
   3. Open ``vscode.window.createQuickPick()`` with ``canSelectMany = false``
   4. On ``onDidAccept``: toggle the selected folder in/out of ``hiddenFolders`` set
   5. Re-render items with updated codicons (immediate feedback)
   6. Apply filter: ``provider.setHiddenFolders(new Set(hiddenFolders))``
   7. Persist: ``workspaceState.update('jarvis.hiddenProjectFolders', [...hiddenFolders])``
   8. Update icon + description: ``setContext('jarvis.projectFilterActive', isActive)``,
      ``projectView.description = isActive ? '(filtered)' : ''``
   9. On ``onDidHide``: dispose QuickPick

   **Registration in package.json:**

   * ``contributes.commands``: two commands —
     ``jarvis.filterProjectFolders`` (icon ``$(filter)``) and
     ``jarvis.filterProjectFoldersActive`` (icon ``$(filter-filled)``),
     both bound to the same handler
   * ``contributes.menus.view/title``: two entries toggled via ``jarvis.projectFilterActive``
     context key — one with ``!jarvis.projectFilterActive``, one with ``jarvis.projectFilterActive``

   **Icon toggle:** Two command definitions in ``package.json`` with different icons,
   shown/hidden via ``when`` clauses using the ``jarvis.projectFilterActive`` context key.


.. spec:: Future Event Filter Command
   :id: SPEC_EXP_EVENTFILTER_CMD
   :status: implemented
   :links: REQ_EXP_EVENTFILTER, REQ_EXP_EVENTFILTERPERSIST, SPEC_EXP_PROVIDER

   **Description:**
   Two commands ``jarvis.filterFutureEvents`` and ``jarvis.filterFutureEventsActive``
   are bound to the same handler that toggles the future-only filter on the EventTreeProvider.

   **Flow:**

   1. Toggle: ``const next = !eventProvider.isFutureOnly()``
   2. Apply: ``eventProvider.setFutureOnly(next)``
   3. Persist: ``workspaceState.update('jarvis.eventFutureFilter', next)``
   4. Update icon + description: ``setContext('jarvis.eventFilterActive', next)``,
      ``eventView.description = next ? '(future only)' : ''``

   **Registration in package.json:**

   * ``contributes.commands``: two commands —
     ``jarvis.filterFutureEvents`` (icon ``$(filter)``) and
     ``jarvis.filterFutureEventsActive`` (icon ``$(filter-filled)``),
     both bound to the same handler
   * ``contributes.menus.view/title``: two entries for ``view == jarvisEvents``
     toggled via ``jarvis.eventFilterActive`` context key


.. spec:: Open YAML Command
   :id: SPEC_EXP_OPENYAML_CMD
   :status: implemented
   :links: REQ_EXP_OPENYAML

   **Description:**
   A command ``jarvis.openYamlFile`` opens the YAML file associated with a tree leaf item.

   **Handler:**

   The command receives the selected ``LeafNode`` as its argument (VS Code passes the
   element from the ``TreeDataProvider`` when the inline action is triggered).

   .. code-block:: typescript

      vscode.commands.registerCommand('jarvis.openYamlFile', (element: LeafNode) => {
          const uri = vscode.Uri.file(element.id);
          vscode.commands.executeCommand('vscode.open', uri);
      });

   **Registration in package.json:**

   * ``contributes.commands``: ``jarvis.openYamlFile`` with title "Open YAML File"
     and icon ``$(go-to-file)``
   * ``contributes.menus.view/item/context``: two entries, both with ``group: "inline"``

     .. code-block:: json

        [
          {
            "command": "jarvis.openYamlFile",
            "when": "viewItem == jarvisProject",
            "group": "inline"
          },
          {
            "command": "jarvis.openYamlFile",
            "when": "viewItem == jarvisEvent",
            "group": "inline"
          }
        ]


.. spec:: Open Agent Session Command
   :id: SPEC_EXP_AGENTSESSION
   :status: draft
   :links: REQ_EXP_AGENTSESSION; SPEC_MSG_SESSIONLOOKUP; SPEC_EXP_PROVIDER; SPEC_EXP_OPENYAML_CMD; SPEC_MSG_OPENCHAT; SPEC_MSG_PINNED; SPEC_MSG_AGENTSESSION; SPEC_EXP_AGENTSESSION_INITPROMPT

   **Description:**
   Register ``jarvis.openAgentSession`` in ``extension.ts``. Invoked from the
   inline ``$(comment-discussion)`` button on every project and event leaf node.
   Looks up a chat session whose title matches the entity ``name`` and opens it;
   if no session is found, creates a **fresh** chat editor via
   ``openNewChatEditor()`` (``SPEC_MSG_OPENCHAT``) and sends an initialization
   prompt. The full lifecycle sequence is specified in ``SPEC_MSG_AGENTSESSION``.

   **Rationale — URI-reuse bug fix:**
   ``openNewChatEditor()`` (``SPEC_MSG_OPENCHAT``) ensures each invocation
   produces a unique session URI and a dedicated editor; see
   ``SPEC_MSG_OPENCHAT`` for the canonical rationale.

   **Handler:**

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.openAgentSession',
        async (element: LeafNode) => {
          const entity = scanner.getEntity(element.id);
          if (!entity) { return; }

          const uuid = await lookupSessionUUID(entity.name);

          if (uuid) {
            // Open existing session pinned
            const b64 = Buffer.from(uuid).toString('base64');
            const uri = vscode.Uri.parse(
              `vscode-chat-session://local/${b64}`
            );
            await openPinnedResource(uri);  // SPEC_MSG_PINNED
          } else {
            // Mode-primed creation: set the mode selector BEFORE openNewChatEditor()
            // so the new session is born in the bound agent mode (SPEC_MSG_OPENCHAT
            // mode-prime note). workbench.action.chat.open with mode does NOT
            // retroactively change an already-active session's mode.
            if (entity.agent) {
                await vscode.commands.executeCommand(
                    'workbench.action.chat.open', { mode: entity.agent }
                );
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // Create a fresh chat editor — opens in the primed mode
            await openNewChatEditor();  // SPEC_MSG_OPENCHAT (includes 800 ms settle delay)

            // Rename session so future lookups can resolve it by name
            await renameFocusedChatSession(entity.name);

            // Send initialization prompt (SPEC_EXP_AGENTSESSION_INITPROMPT)
            const kind = entity.kind ?? 'project';
            const folder = entity.folder ?? path.dirname(element.id);
            const contextPath = path.join(folder, 'context.md');
            const rawInitTemplate = vscode.workspace.getConfiguration('jarvis')
                .get<string>('agentSession.initPromptTemplate') ?? '';
            const initTemplate = rawInitTemplate.trim() ? rawInitTemplate : DEFAULT_INIT_PROMPT;
            const initPrompt = applyTemplate(initTemplate, { kind, name: entity.name, contextPath });
            // Mode is already set at creation time — submit prompt without mode param
            await vscode.commands.executeCommand(
                'workbench.action.chat.open', { query: initPrompt }
            );
          }
        }
      );

   **Registration in package.json:**

   * ``contributes.commands``:

     .. code-block:: json

        {
          "command": "jarvis.openAgentSession",
          "title": "Jarvis: Open Agent Session",
          "icon": "$(comment-discussion)"
        }

   * ``contributes.menus.view/item/context``: two entries, both with
     ``group: "inline"``:

     .. code-block:: json

        [
          {
            "command": "jarvis.openAgentSession",
            "when": "viewItem == jarvisProject",
            "group": "inline"
          },
          {
            "command": "jarvis.openAgentSession",
            "when": "viewItem == jarvisEvent",
            "group": "inline"
          }
        ]

   * ``contributes.menus.commandPalette``: hide from Command Palette
     (the command requires a ``LeafNode`` argument and would fail without one):

     .. code-block:: json

        [
          {
            "command": "jarvis.openAgentSession",
            "when": "false"
          }
        ]

   **Design notes:**

   * ``contextValue`` uses namespaced values (``jarvisProject``, ``jarvisEvent``,
     ``jarvisFolder``) to prevent collisions with other extensions — the button
     appears on all ``jarvisProject`` and ``jarvisEvent`` items alongside the
     existing ``$(go-to-file)`` button
   * No changes to ``yamlScanner.ts`` — uses existing ``entity.name`` from the
     entity store
   * No changes to ``sessionLookup.ts`` — reuses ``lookupSessionUUID()`` as-is
   * The initialization prompt is submitted directly via
     ``workbench.action.chat.open`` (not via the message queue)
   * Disposable pushed to ``context.subscriptions``
   * **The verbatim prompt template is specified in
     ``SPEC_EXP_AGENTSESSION_INITPROMPT``.** The old hardcoded wording shown
     above is retained for historical reference only.


.. spec:: Agent-Session Identity Prompt Template
   :id: SPEC_EXP_AGENTSESSION_INITPROMPT
   :status: draft
   :links: REQ_SES_AGENTPROMPT; REQ_EXP_AGENTPROMPT_TEMPLATE

   **Description:**
   When ``jarvis.openAgentSession`` or ``jarvis.newSession`` opens a **new** chat
   session, it sends a kind-aware initialization prompt that instructs the agent
   to adopt the entity's identity and maintain ``context.md`` as a minimal,
   action-oriented persistent memory. The prompt text is read from the VS Code
   setting ``jarvis.agentSession.initPromptTemplate``; three placeholders are
   substituted at send-time. This applies to all entity kinds: ``project``,
   ``event``, and ``session``.

   **Template substitution** (``src/extension.ts``, shared private helper ``applyTemplate``):

   .. code-block:: typescript

      // Shared helper — also used by SPEC_MSG_SENDCOMMAND and SPEC_MSG_AUTODELIVER_POLL.
      function applyTemplate(template: string, vars: Record<string, string>): string {
          return template.replace(/\$\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
          // Unknown placeholders are left as-is.
      }

   **Call site (init prompt):**

   .. code-block:: typescript

      const rawInitTemplate = vscode.workspace.getConfiguration('jarvis')
          .get<string>('agentSession.initPromptTemplate') ?? '';
      const initTemplate = rawInitTemplate.trim() ? rawInitTemplate : DEFAULT_INIT_PROMPT;
      const initPrompt = applyTemplate(initTemplate, { kind, name: entity.name, contextPath });

   **Default prompt** (``DEFAULT_INIT_PROMPT`` constant in ``extension.ts``):

   .. code-block:: text

      You are the ${kind} "${name}".

      Use only `${contextPath}` as your persistent memory. Read it now.

      Keep it minimal and action-oriented:
      - Store only long-lived items under Decision / Finding / Next.
      - One concise line per bullet. Prune aggressively.
      - Replace outdated bullets — never append logs.
      - Never store retries, raw tool output, or transient chatter.
      - Before writing, ask: "Will this still matter in 2 weeks?" If no, skip.

   **Fallback rule:** If ``jarvis.agentSession.initPromptTemplate`` is empty or
   not set, the built-in ``DEFAULT_INIT_PROMPT`` is used. Unknown placeholders in
   a custom template are passed through unchanged.

   **Placeholder definitions:**

   * ``${kind}`` — ``entity.kind`` (``'project' | 'event' | 'session'``), defaulting
     to ``'project'`` when the field is absent (backwards compatibility).
   * ``${name}`` — the display name from ``session.yaml`` / ``project.yaml`` /
     ``event.yaml``.
   * ``${contextPath}`` — ``path.join(entity.folder ?? path.dirname(element.id),
     'context.md')`` — absolute filesystem path so the agent can open the file
     directly without resolving workspace-relative paths.

   **Trigger points:**

   * ``jarvis.openAgentSession`` — new-session branch only (no existing UUID found).
   * ``jarvis.newSession`` — always (a new session folder is always created).
   * ``jarvis.sendMessages`` — new-session branch only (no UUID found) AND the
     scanner entity store contains an entity whose ``name`` matches
     ``node.destination``. If no entity matches, the init prompt is skipped.
   * Auto-delivery poll loop — new-session branch only (no UUID found) AND the
     scanner entity store contains an entity whose ``name`` matches the session
     name being delivered to. If no entity matches, the init prompt is skipped.

   **Mode-apply sequencing (delta — mode-prime pattern):**
   For all trigger points, when ``entity.agent`` is set the bound mode must be
   applied at session creation time, not post-creation. The caller primes the VS
   Code Chat mode selector with ``workbench.action.chat.open { mode: entity.agent }``
   + 300 ms settle *before* calling ``openNewChatEditor()``. The subsequently
   created session inherits the primed mode. The final init-prompt submission uses
   ``workbench.action.chat.open { query: initPrompt }`` without a ``mode``
   parameter — the mode is already set. See ``SPEC_MSG_OPENCHAT`` mode-prime note
   for the design rationale.

   **Scope:** Cross-entity — benefits projects, events, and sessions. The spec
   lives here (``spec_exp.rst``) because ``jarvis.openAgentSession`` is an EXP
   command; the triggering requirements live in ``REQ_SES_AGENTPROMPT`` (sessions
   CR) and ``REQ_EXP_AGENTPROMPT_TEMPLATE`` (this CR).

   **File touchpoint:** ``src/extension.ts`` — ``openAgentSessionCommand`` and
   ``newSessionCommand``.


.. spec:: New Project Command
   :id: SPEC_EXP_NEWPROJECT_CMD
   :status: draft
   :links: REQ_EXP_NEWPROJECT; REQ_EXP_REACTIVECACHE; SPEC_EXP_SCANNER; SPEC_EXP_EXTENSION; SPEC_EXP_AGENT_PICKER

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
   4. Invoke ``pickAgentMode()`` (per ``SPEC_EXP_AGENT_PICKER``).
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
   12. Open chat editor (per ``SPEC_EXP_AGENT_PICKER`` chat-open gate):

       - If ``pickerResult`` is a non-empty string (concrete agent):
         ``chat.open({ mode: pickerResult })``
       - If ``pickerResult`` is ``""`` (default agent):
         ``chat.open({})`` — no ``mode`` parameter.

   **Disposable** pushed to ``context.subscriptions``.

   **Registration in package.json** — see ``SPEC_EXP_EXTENSION``.


.. spec:: New Event Command
   :id: SPEC_EXP_NEWEVENT_CMD
   :status: draft
   :links: REQ_EXP_NEWEVENT; REQ_EXP_REACTIVECACHE; SPEC_EXP_SCANNER; SPEC_EXP_EXTENSION; SPEC_EXP_AGENT_PICKER

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
   6. Invoke ``pickAgentMode()`` (per ``SPEC_EXP_AGENT_PICKER``).
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
   14. Open chat editor (per ``SPEC_EXP_AGENT_PICKER`` chat-open gate):

       - If ``pickerResult`` is a non-empty string (concrete agent):
         ``chat.open({ mode: pickerResult })``
       - If ``pickerResult`` is ``""`` (default agent):
         ``chat.open({})`` — no ``mode`` parameter.

   **Disposable** pushed to ``context.subscriptions``.

   **Registration in package.json** — see ``SPEC_EXP_EXTENSION``.


.. spec:: Shared Agent Picker Component
   :id: SPEC_EXP_AGENT_PICKER
   :status: draft
   :links: REQ_EXP_NEWPROJECT; REQ_EXP_NEWEVENT; REQ_EXP_ENTITY_LAZYBIND; REQ_SES_AGENT_PICKER; SPEC_SES_AGENT_PICKER; SPEC_SES_AGENT_DISCOVERY

   **Description:**
   Shared agent-picker component — the single source of truth for interactive
   agent selection across new-entity flows and lazy-bind. Implementation
   reference: existing ``pickAgentMode()`` function (specced in
   ``SPEC_SES_AGENT_PICKER``).

   **Return contract (3-way):**

   - ``undefined`` — user cancelled (Escape / dismissed)
   - ``""`` (empty string) — user selected "default agent" entry
   - ``"<agent-name>"`` — user selected a concrete agent (non-empty string)

   **Picker UI:**

   - Entry labelled ``"default agent"`` always present at top.
   - Below it: the list of discoverable agents from
     ``.github/agents/*.agent.md`` filtered by ``user-invocable``
     (per ``SPEC_SES_AGENT_DISCOVERY``).

   **Interactive consumer list (5 — anti-drift applies):**

   1. ``jarvis.newSession`` (via ``SPEC_SES_AGENT_PICKER``)
   2. ``jarvis.newProject`` (via ``SPEC_EXP_NEWPROJECT_CMD``)
   3. ``jarvis.newEvent`` (via ``SPEC_EXP_NEWEVENT_CMD``)
   4. Lazy-bind flow (via ``SPEC_EXP_ENTITY_LAZYBIND``)
   5. (Reserved for future) — agent-edit / re-bind command (not in scope this CR)

   **Anti-drift rule:** No interactive consumer SHALL implement its own agent
   QuickPick. All SHALL call ``pickAgentMode()``.

   **Programmatic-validation consumer pattern (separate, no picker):**
   ``jarvis_createProject``, ``jarvis_createEvent``, ``jarvis_createSession``
   LM tools — receive ``agent`` parameter, validate via ``discoverAgents()``
   (per ``SPEC_SES_AGENT_DISCOVERY``), no picker invocation. Anti-drift rule
   does NOT apply here (different mechanism by design).

   **Chat-open gate (cross-cutting rule):** Chat-open SHALL occur on **all
   non-cancel** picker returns. When picker returns ``undefined`` (cancel) →
   no chat-open. When picker returns ``""`` ("default agent") → chat opens
   in VS Code's default mode (no ``mode`` parameter passed to ``chat.open``).
   When picker returns a concrete ``"<name>"`` → chat opens with
   ``mode: <name>``. Consumers reference this rule rather than re-deriving it.

   **Acceptance Criteria:**

   1. ``pickAgentMode()`` returns one of exactly three values: ``undefined``,
      ``""``, or a non-empty agent name string.
   2. The QuickPick shows "default agent" as the first entry.
   3. Agent list below "default agent" is sourced from ``discoverAgents()``
      filtered by ``user-invocable``.
   4. All 5 interactive consumers call ``pickAgentMode()`` — none implement
      their own QuickPick.
   5. Programmatic LM-tool consumers use ``discoverAgents()`` for validation
      without invoking the picker.
   6. Chat-open occurs on all non-cancel returns: ``""`` → ``chat.open({})``
      (no mode param); ``"<name>"`` → ``chat.open({ mode: <name> })``.
   7. "default agent" entry returns ``""`` (empty string) when selected.
   8. Escape / dismiss returns ``undefined``.


.. spec:: Entity Lazy-Bind Flow
   :id: SPEC_EXP_ENTITY_LAZYBIND
   :status: draft
   :links: REQ_EXP_ENTITY_LAZYBIND; SPEC_EXP_AGENT_PICKER; SPEC_EXP_ENTITY_TREECLICK; SPEC_SES_AGENT_OPEN; SPEC_EXP_AGENTSESSION_INITPROMPT

   **Description:**
   Lazy-bind flow triggered on tree-click of an unbound entity. Allows the user
   to assign an agent to an entity that currently has ``agent === undefined``
   (per ``SPEC_EXP_ENTITY_AGENT`` AC-2).

   **Trigger:** Tree-click on an entity where ``EntityEntry.agent === undefined``
   (unbound). ``SPEC_EXP_ENTITY_TREECLICK`` delegates to this spec when
   ``EntityEntry.agent === undefined``. When ``agent`` is defined and non-empty,
   normal open-flow is used (no lazy-bind detour).

   **Flow:**

   1. Detect unbound (check ``EntityEntry.agent``).
   2. Invoke ``pickAgentMode()`` (per ``SPEC_EXP_AGENT_PICKER``).
   3. Handle 3-way return:

      - ``undefined`` (cancel): abort — no YAML mutation, no chat-open. Return
        early.
      - ``""`` (default agent): write ``agent: ""`` to the entity's YAML
        (read-modify-write). **Idempotency:** if the YAML already has
        ``agent: ""``, skip the file write (no-op). Then open the chat editor:
        ``chat.open({})`` (no ``mode`` parameter — VS Code's default mode).
      - ``"<a>"`` (concrete agent): write ``agent: "<a>"`` to the entity's
        YAML, trigger scanner rescan, then open the chat editor in ``<a>``
        mode (per ``SPEC_SES_AGENT_OPEN`` / existing open-flow). Init prompt
        fires per ``SPEC_EXP_AGENTSESSION_INITPROMPT``.

   **Error handling:** Wrap the ``writeFileSync()`` call in try/catch. On
   failure: ``console.warn("Failed to lazy-bind agent for <entity>: <error>")``,
   abort the command, no chat editor opened, no scanner rescan, entity remains
   unbound (no partial state).

   **YAML write mechanism:** Read existing YAML → parse → set/update ``agent``
   field → serialize → write. Preserve other fields and key order where
   possible.

   **Tree-click delegation:** ``SPEC_EXP_ENTITY_TREECLICK`` delegates to this
   spec when ``EntityEntry.agent === undefined``. When ``agent`` is defined and
   non-empty, normal open-flow is used (no lazy-bind detour).

   **Acceptance Criteria:**

   1. Tree-click on entity with ``agent === undefined`` invokes the picker.
   2. Picker cancel (``undefined``) results in no YAML mutation and no
      chat-open.
   3. Picker returns ``""`` (default agent): ``agent: ""`` is written to entity
      YAML (idempotent — skip write if already ``""``). Chat editor opens with
      ``chat.open({})`` (no mode param — VS Code default mode).
   4. Picker returns concrete agent: ``agent: "<a>"`` written, scanner rescan
      triggered, chat editor opened in ``<a>`` mode with init prompt.
   5. ``writeFileSync()`` failure is caught: warn log emitted, command aborted,
      no chat editor opened, no scanner rescan, entity remains unbound.
   6. YAML write preserves existing fields and key order.
   7. Tree-click on entity with defined non-empty ``agent`` does NOT trigger
      lazy-bind (normal open-flow used).
   8. Tree-click on entity with ``agent: ""`` does NOT trigger lazy-bind
      (entity is bound to default agent, not unbound).


.. spec:: Rescan Command
   :id: SPEC_EXP_RESCAN_CMD
   :status: implemented
   :links: REQ_EXP_RESCAN_BTN; SPEC_EXP_SCANNER; SPEC_EXP_EXTENSION

   **Description:**
   Register ``jarvis.rescan`` in ``extension.ts``. Triggered by the ``$(refresh)``
   icon in both the Projects and Events view title bars. Calls the scanner's
   existing ``rescan()`` method.

   **Handler:**

   .. code-block:: typescript

      vscode.commands.registerCommand('jarvis.rescan', async () => {
          await scanner.rescan();
      });

   **Registration in package.json:**

   * ``contributes.commands``:

     .. code-block:: json

        {
          "command": "jarvis.rescan",
          "title": "Jarvis: Rescan",
          "icon": "$(refresh)"
        }

   * ``contributes.menus.view/title``: two entries:

     .. code-block:: json

        [
          {
            "command": "jarvis.rescan",
            "when": "view == jarvisProjects",
            "group": "navigation@3"
          },
          {
            "command": "jarvis.rescan",
            "when": "view == jarvisEvents",
            "group": "navigation@3"
          }
        ]

   * ``contributes.menus.commandPalette``: hide from Command Palette:

     .. code-block:: json

        {
          "command": "jarvis.rescan",
          "when": "false"
        }

   **Disposable** pushed to ``context.subscriptions``.


.. spec:: List Projects LM Tool
   :id: SPEC_EXP_LISTPROJECTS
   :status: implemented
   :links: REQ_EXP_LISTPROJECTS; SPEC_EXP_SCANNER; SPEC_MSG_DUALREGISTRATION

   **Description:**
   Register ``jarvis_listProjects`` as a dual LM + MCP tool in ``extension.ts``.
   Returns the list of projects from the scanner with their name and relative
   folder path. Follows the ``jarvis_listSessions`` pattern.

   **Leaf extraction helper** (local to ``activate()``):

   .. code-block:: typescript

      function collectLeaves(nodes: TreeNode[]): LeafNode[] {
          const leaves: LeafNode[] = [];
          for (const node of nodes) {
              if (node.kind === 'leaf') {
                  leaves.push(node);
              } else {
                  leaves.push(...collectLeaves(node.children));
              }
          }
          return leaves;
      }

   **Core logic** (shared by LM and MCP handlers):

   .. code-block:: typescript

      function getProjectList(): { name: string; folder: string }[] {
          const projectsFolder = vscode.workspace
              .getConfiguration('jarvis')
              .get<string>('projectsFolder', '');
          const leaves = collectLeaves(scanner.getProjectTree());
          return leaves.map(leaf => {
              const entity = scanner.getEntity(leaf.id);
              const absDir = path.dirname(leaf.id);
              const rel = projectsFolder
                  ? path.relative(projectsFolder, absDir)
                  : absDir;
              return {
                  name: entity?.name ?? path.basename(absDir),
                  folder: rel.replace(/\\/g, '/')
              };
          });
      }

   **Dual-tool registration:**

   .. code-block:: typescript

      const listProjectsTool = registerDualTool(
          'jarvis_listProjects',
          // LM handler
          async (_options, _token) => {
              const projects = getProjectList();
              return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(JSON.stringify(projects))
              ]);
          },
          // MCP description
          'Returns the list of projects with name and folder path.',
          // MCP input schema (Zod)
          {},
          // MCP handler
          async () => {
              const projects = getProjectList();
              return { projects };
          }
      );

   **Registration in package.json:**

   .. code-block:: json

      {
        "name": "jarvis_listProjects",
        "displayName": "List Projects",
        "modelDescription": "Returns the list of projects in the Jarvis workspace with their name and folder path. Use this to discover available projects.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "listProjects",
        "icon": "$(project)",
        "inputSchema": {
          "type": "object",
          "properties": {}
        }
      }

   **Design notes:**

   * No input parameters — mirrors ``jarvis_listSessions`` pattern
   * ``folder`` uses forward slashes for cross-platform consistency
   * Falls back to folder basename if entity lookup fails (defensive)
   * Disposable pushed to ``context.subscriptions``


.. spec:: List Events LM+MCP Tool
   :id: SPEC_EXP_LISTEVENTS
   :status: draft
   :links: REQ_EXP_LISTEVENTS; SPEC_EXP_SCANNER; SPEC_MSG_DUALREGISTRATION; SPEC_EXP_LISTPROJECTS

   **Description:**
   Register ``jarvis_listEvents`` as a dual LM + MCP tool in ``extension.ts``.
   Returns the list of events from the scanner with their name, summary, dates,
   agent, and relative folder path. Mirrors the ``SPEC_EXP_LISTPROJECTS`` pattern
   but adds event-specific fields.

   **Core logic** (shared by LM and MCP handlers):

   .. code-block:: typescript

      function getEventList(): {
          name: string; summary: string; agent: string;
          datesStart: string; datesEnd: string; folder: string;
      }[] {
          const eventsFolder = vscode.workspace
              .getConfiguration('jarvis')
              .get<string>('eventsFolder', '');
          const leaves = collectLeaves(scanner.getEventTree());
          return leaves.map(leaf => {
              const entity = scanner.getEntity(leaf.id);
              const absDir = path.dirname(leaf.id);
              const rel = eventsFolder
                  ? path.relative(eventsFolder, absDir)
                  : absDir;
              return {
                  name: entity?.name ?? path.basename(absDir),
                  summary: entity?.summary ?? '',
                  agent: entity?.agent ?? '',
                  datesStart: entity?.datesStart ?? '',
                  datesEnd: entity?.datesEnd ?? '',
                  folder: rel.replace(/\\/g, '/'),
              };
          });
      }

   **Dual-tool registration:**

   .. code-block:: typescript

      const listEventsTool = registerDualTool(
          'jarvis_listEvents',
          // LM handler
          async (_options, _token) => {
              const events = getEventList();
              return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(JSON.stringify(events))
              ]);
          },
          // MCP description
          'Returns the list of events with name, summary, dates, agent, and folder path.',
          // MCP input schema (Zod)
          {},
          // MCP handler
          async () => {
              const events = getEventList();
              return { events };
          }
      );

   **Registration in package.json:**

   .. code-block:: json

      {
        "name": "jarvis_listEvents",
        "displayName": "List Events",
        "modelDescription": "Returns the list of events in the Jarvis workspace with name, summary, dates, agent, and folder path. Use this to discover available events.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "listEvents",
        "icon": "$(calendar)",
        "inputSchema": {
          "type": "object",
          "properties": {}
        }
      }

   **Error handling:**

   * If no events exist, return an empty array (not an error).
   * Entity lookup failure (``scanner.getEntity()`` returns ``undefined``) →
     use fallback values (folder basename for ``name``, empty strings for all
     other fields). The tool never throws on missing data.

   **Acceptance Criteria:**

   1. ``jarvis_listEvents`` is registered via ``registerDualTool()`` with
      ``canBeReferencedInPrompt: true``.
   2. The tool accepts no input parameters (empty input schema).
   3. Each returned record contains ``name``, ``summary``, ``agent``,
      ``datesStart``, ``datesEnd``, and ``folder``.
   4. ``agent`` is ``""`` when the entity has no agent (unbound).
   5. If no events exist, the tool returns an empty array.
   6. The tool is simultaneously available via the MCP server.
   7. ``collectLeaves()`` helper is reused from ``SPEC_EXP_LISTPROJECTS``.
   8. Disposable pushed to ``context.subscriptions``.

   **Design notes:**

   * Reuses ``collectLeaves()`` helper defined in ``SPEC_EXP_LISTPROJECTS``
   * ``folder`` uses forward slashes for cross-platform consistency
   * ``summary`` and ``agent`` default to ``""`` when absent — never ``null``
     or ``undefined`` in the output


.. spec:: jarvis_createProject LM+MCP Tool
   :id: SPEC_EXP_CREATEPROJECT
   :status: draft
   :links: REQ_EXP_CREATEPROJECT; SPEC_EXP_SCANNER; SPEC_MSG_DUALREGISTRATION; SPEC_SES_CREATETOOL; SPEC_EXP_AGENT_PICKER

   **Description:**
   Register ``jarvis_createProject`` via ``registerDualTool()`` in
   ``src/extension.ts``. Creates a project folder with ``project.yaml`` and
   ``context.md`` under the configured projects folder. Mirrors
   ``SPEC_SES_CREATETOOL`` for structure; uses programmatic agent validation
   (no picker) per ``SPEC_EXP_AGENT_PICKER`` programmatic-consumer pattern.

   **Tool input schema:**

   .. list-table::
      :header-rows: 1
      :widths: 20 12 12 56

      * - Parameter
        - Type
        - Required
        - Purpose
      * - ``name``
        - ``string``
        - yes
        - Project name; used verbatim as folder name.
      * - ``summary``
        - ``string``
        - no
        - Short description written to ``project.yaml``
          (omitted from the file when blank or absent).
      * - ``agent``
        - ``string``
        - no
        - Agent mode to bind. Validated via ``discoverAgents()``
          (per ``SPEC_SES_AGENT_DISCOVERY``). Omitted from YAML
          when blank or absent.

   **Name validation** (identical to ``SPEC_SES_CREATETOOL``):

   * The name MUST NOT be empty (``""``).
   * The name MUST NOT contain any of: ``/ \\ : * ? " < > |``, null bytes, or
     ASCII control characters (U+0000–U+001F).
   * The name MUST NOT be ``.`` or ``..``.
   * On Windows, the name MUST NOT be a reserved device name (``CON``, ``PRN``,
     ``AUX``, ``NUL``, ``COM1``–``COM9``, ``LPT1``–``LPT9``), case-insensitive.

   Violation → throw ``Error("invalid project name: <reason>")``.

   **Agent validation** (when ``agent`` is non-blank):

   Validate against ``discoverAgents()`` (per ``SPEC_SES_AGENT_DISCOVERY``).
   If the agent name is not in the discovered list, throw
   ``Error("unknown agent \"<agent>\"; available: <list>")``.
   No picker is invoked — this is a programmatic consumer.

   **Idempotency check** (after validation, before writes):

   .. code-block:: typescript

      const projectsFolder = vscode.workspace
          .getConfiguration('jarvis')
          .get<string>('projectsFolder', '');
      if (!projectsFolder) { throw new Error('jarvis_createProject: projectsFolder not configured'); }
      const targetPath = path.join(projectsFolder, name);
      if (fs.existsSync(targetPath)) {
          return { created: false, reason: `project "${name}" already exists` };
      }

   **File layout after creation:**

   .. code-block:: text

      <projectsFolder>/
        <name>/
          project.yaml    ← name always; summary when non-blank; agent when non-blank
          context.md      ← always; starts with "# <name>\n\n"

   **``project.yaml`` format:**

   .. code-block:: yaml

      name: "<name>"
      summary: "<summary>"    # only present when summary is non-blank
      agent: "<agent>"        # only present when agent is non-blank and valid

   **``context.md`` initial content:**

   .. code-block:: markdown

      # <name>

   (Trailing newline, then empty line — identical to ``SPEC_SES_CREATETOOL``.)

   **Post-creation:** Call ``scanner.rescan()`` to update the entity cache.

   **Acceptance Criteria:**

   1. ``jarvis_createProject`` is registered via ``registerDualTool()`` with
      ``canBeReferencedInPrompt: true``.
   2. Input parameters: ``name`` (required), ``summary`` (optional),
      ``agent`` (optional).
   3. On success, creates ``<projectsFolder>/<name>/project.yaml`` and
      ``context.md``.
   4. ``scanner.rescan()`` is called after creation.
   5. If the folder already exists, returns
      ``{ created: false, reason: "project \"<name>\" already exists" }``.
   6. Name validation uses the same rules as ``SPEC_SES_CREATETOOL``.
   7. Agent validation uses ``discoverAgents()``; invalid agent → error with
      available agents listed.
   8. Disposable pushed to ``context.subscriptions``.


.. spec:: jarvis_createEvent LM+MCP Tool
   :id: SPEC_EXP_CREATEEVENT
   :status: draft
   :links: REQ_EXP_CREATEEVENT; SPEC_EXP_SCANNER; SPEC_MSG_DUALREGISTRATION; SPEC_SES_CREATETOOL; SPEC_EXP_AGENT_PICKER

   **Description:**
   Register ``jarvis_createEvent`` via ``registerDualTool()`` in
   ``src/extension.ts``. Creates an event folder with ``event.yaml`` and
   ``context.md`` under the configured events folder. Folder name uses
   ``${startDate}_${name}`` (underscore separator, verbatim name — per KISS
   convention). Uses programmatic agent validation (no picker).

   **Tool input schema:**

   .. list-table::
      :header-rows: 1
      :widths: 20 12 12 56

      * - Parameter
        - Type
        - Required
        - Purpose
      * - ``name``
        - ``string``
        - yes
        - Event name; used verbatim in folder name and YAML.
      * - ``startDate``
        - ``string``
        - yes
        - Start date in ``YYYY-MM-DD`` format.
      * - ``endDate``
        - ``string``
        - no
        - End date in ``YYYY-MM-DD`` format. Defaults to ``startDate``.
      * - ``summary``
        - ``string``
        - no
        - Short description (defaults to empty).
      * - ``agent``
        - ``string``
        - no
        - Agent mode to bind. Validated via ``discoverAgents()``.

   **Name validation** (identical to ``SPEC_SES_CREATETOOL``):

   Same rules as ``SPEC_EXP_CREATEPROJECT``. Violation → throw
   ``Error("invalid event name: <reason>")``.

   **Date validation:**

   * ``startDate`` MUST match ``/^\d{4}-\d{2}-\d{2}$/`` and be a valid
     calendar date (``new Date(startDate)`` must not be ``NaN``).
   * ``endDate``, when provided, MUST match the same pattern and be a valid
     calendar date.
   * Violation → throw ``Error("invalid date: <reason>")``.

   **Agent validation** (when ``agent`` is non-blank):

   Same as ``SPEC_EXP_CREATEPROJECT`` — validate via ``discoverAgents()``,
   throw error with available agents on mismatch.

   **Folder naming:**

   .. code-block:: typescript

      const folderName = `${startDate}_${name}`;
      const targetPath = path.join(eventsFolder, folderName);

   **Idempotency check:**

   .. code-block:: typescript

      if (fs.existsSync(targetPath)) {
          return { created: false, reason: `event folder "${folderName}" already exists` };
      }

   **File layout after creation:**

   .. code-block:: text

      <eventsFolder>/
        <startDate>_<name>/
          event.yaml      ← name, summary, dates.start, dates.end; agent when valid
          context.md      ← always; starts with "# <name>\n\n"

   **``event.yaml`` format:**

   .. code-block:: yaml

      name: "<name>"
      summary: "<summary>"
      dates:
        start: "<startDate>"
        end: "<endDate>"
      agent: "<agent>"        # only present when agent is non-blank and valid

   **``context.md`` initial content:**

   .. code-block:: markdown

      # <name>

   **Post-creation:** Call ``scanner.rescan()`` to update the entity cache.

   **Acceptance Criteria:**

   1. ``jarvis_createEvent`` is registered via ``registerDualTool()`` with
      ``canBeReferencedInPrompt: true``.
   2. Input parameters: ``name`` (required), ``startDate`` (required),
      ``endDate`` (optional, defaults to ``startDate``), ``summary`` (optional),
      ``agent`` (optional).
   3. Folder name is ``${startDate}_${name}`` (underscore separator, verbatim
      name).
   4. On success, creates ``event.yaml`` with ``name``, ``summary``,
      ``dates.start``, ``dates.end``; ``agent`` included only when non-blank
      and valid.
   5. ``scanner.rescan()`` is called after creation.
   6. If the folder already exists, returns ``{ created: false }``.
   7. Name validation uses the same rules as ``SPEC_SES_CREATETOOL``.
   8. Date validation ensures valid ``YYYY-MM-DD`` format and valid calendar
      date.
   9. Agent validation uses ``discoverAgents()``; invalid → error with
      available agents listed.
   10. Disposable pushed to ``context.subscriptions``.


.. spec:: Entity Agent Field — Scanner Implementation
   :id: SPEC_EXP_ENTITY_AGENT
   :status: draft
   :links: REQ_EXP_ENTITY_AGENT; SPEC_EXP_SCANNER

   **Description:**
   Specifies how the ``agent`` field is read from ``project.yaml`` and
   ``event.yaml`` during the scanner's ``_buildTree()`` loop, the treatment of
   missing/invalid values, and the runtime semantics of unbound entities.

   **Scanner read logic** (in ``_buildTree()``, after reading the convention
   file):

   .. code-block:: typescript

      // After parsing the YAML document (doc)
      const rawAgent = doc['agent'];
      let agent: string | undefined;
      if (typeof rawAgent === 'string' && rawAgent.length > 0) {
          agent = rawAgent;
      } else {
          agent = undefined;
      }

   **4-case treatment of the ``agent`` field:**

   1. **Missing** (key absent from YAML) → ``rawAgent`` is ``undefined`` →
      ``EntityEntry.agent = undefined`` (unbound).
   2. **Explicitly ``undefined``** (``agent:`` with no value / YAML null) →
      ``rawAgent`` is ``null`` or ``undefined`` → ``EntityEntry.agent = undefined``
      (unbound).
   3. **Empty string** (``agent: ""``) → ``rawAgent`` is ``""`` →
      ``typeof`` check passes but ``length === 0`` → ``EntityEntry.agent = undefined``
      (unbound).
   4. **Non-string** (``agent: 42``, ``agent: true``) → ``typeof`` check fails →
      ``EntityEntry.agent = undefined`` (unbound).

   Only a non-empty string results in a bound entity.

   **Warn-log line** (emitted in cases 1–4):

   .. code-block:: typescript

      console.warn(
          `${kind} ${entity.name} at ${filePath} is missing required 'agent' field — marked unbound`
      );

   Where ``kind`` is ``"project"`` or ``"event"`` (derived from
   ``conventionFile``), and ``filePath`` is the convention file's absolute path.

   **``EntityEntry`` interface update:**

   The ``agent`` field is declared as an optional property in ``EntityEntry``
   (see ``SPEC_EXP_SCANNER``):

   .. code-block:: typescript

      interface EntityEntry {
          name: string;
          datesEnd?: string;
          datesStart?: string;
          summary?: string;        // entity-parity: event summary; empty string default
          agent?: string;          // entity-parity: bound agent mode; undefined = unbound
          kind?: string;           // entity-parity: 'project' | 'event' | 'session'
          folder?: string;         // entity-parity: absolute path to entity folder
      }

   **Runtime "unbound" semantic:**

   ``entity.agent === undefined`` means the entity is unbound. Downstream
   consumers (``SPEC_EXP_ENTITY_TREECLICK``, ``SPEC_EXP_ENTITY_LAZYBIND``,
   ``SPEC_EXP_LISTEVENTS``, ``SPEC_EXP_LISTPROJECTS``) check this property
   to determine bound vs. unbound state. No separate boolean flag is used.

   **Acceptance Criteria:**

   1. The scanner reads the ``agent`` field from ``project.yaml`` and
      ``event.yaml`` in the ``_buildTree()`` loop.
   2. Missing, undefined, empty-string, and non-string values all result
      in ``EntityEntry.agent = undefined`` (unbound).
   3. Only a non-empty string value results in a bound entity.
   4. A ``console.warn()`` line is emitted for each unbound entity with the
      text: ``"<kind> <name> at <path> is missing required 'agent' field —
      marked unbound"``.
   5. ``EntityEntry`` declares ``agent?: string`` as an optional property.
   6. ``entity.agent === undefined`` is the sole indicator of unbound state
      (no separate flag).


.. spec:: Entity Tree-Click-to-Chat Implementation
   :id: SPEC_EXP_ENTITY_TREECLICK
   :status: draft
   :links: REQ_EXP_ENTITY_TREECLICK; SPEC_EXP_AGENTSESSION; SPEC_EXP_ENTITY_LAZYBIND; SPEC_EXP_ENTITY_AGENT

   **Description:**
   Specifies how ``TreeItem.command`` is wired for project, event, and session
   leaf nodes so that a single click opens the agent-chat editor. Delegates to
   ``SPEC_EXP_ENTITY_LAZYBIND`` when the entity is unbound.

   **``TreeItem.command`` wiring** (in ``getTreeItem()`` of each
   TreeDataProvider):

   For every leaf node with ``contextValue`` of ``jarvisProject``,
   ``jarvisEvent``, or ``jarvisSession``, the ``TreeItem.command`` property
   SHALL be set to:

   .. code-block:: typescript

      item.command = {
          command: 'jarvis.openAgentSession',
          title: 'Open Agent Session',
          arguments: [element],   // LeafNode passed as argument
      };

   This causes a single-click to invoke ``jarvis.openAgentSession``
   (``SPEC_EXP_AGENTSESSION``) with the leaf node.

   **Delegation rule:**

   The ``jarvis.openAgentSession`` handler (``SPEC_EXP_AGENTSESSION``) checks
   ``entity.agent``:

   * **``entity.agent`` is a non-empty string** (bound entity): Normal
     open-flow proceeds — look up existing chat session by name, open if found,
     or create new chat editor with mode-primed creation and init prompt
     (per ``SPEC_EXP_AGENTSESSION``).
   * **``entity.agent === undefined``** (unbound entity): Delegate to
     ``SPEC_EXP_ENTITY_LAZYBIND`` — invoke the agent picker, write YAML on
     selection, then proceed with open-flow (or abort on cancel / default
     agent).

   **Same behavior for all 3 entity kinds:**

   The ``TreeItem.command`` wiring and the delegation logic apply uniformly to
   projects, events, and sessions. No entity-kind-specific branching in the
   tree-click path.

   **Acceptance Criteria:**

   1. ``TreeItem.command`` for project, event, and session leaf nodes is set
      to ``jarvis.openAgentSession`` with the ``LeafNode`` as argument.
   2. Single-click on any leaf node invokes ``jarvis.openAgentSession``.
   3. Bound entities (``entity.agent`` is non-empty string) follow the normal
      open-flow (``SPEC_EXP_AGENTSESSION``).
   4. Unbound entities (``entity.agent === undefined``) delegate to
      ``SPEC_EXP_ENTITY_LAZYBIND``.
   5. Double-click behaves identically to single-click (VS Code default).
   6. All three entity kinds (project, event, session) use the same
      ``TreeItem.command`` binding — no kind-specific branching.


.. spec:: Uniform Inline Icons for All Entities
   :id: SPEC_EXP_ENTITY_ICONS
   :status: draft
   :links: REQ_EXP_ENTITY_ICONS; SPEC_EXP_EXTENSION; SPEC_EXP_PROVIDER; SPEC_EXP_CONTEXTACTIONS

   **Description:**
   Every leaf node across all three entity types (project, event, session) SHALL
   display three inline icons: YAML, context.md, and recording (conditional).
   This spec formalizes the icon identifiers, order, command bindings, and the
   recording-icon visibility mechanism.

   **Icon identifiers and commands:**

   .. list-table::
      :header-rows: 1
      :widths: 20 20 25 35

      * - Icon
        - Codicon
        - Command
        - Purpose
      * - YAML
        - ``$(go-to-file)``
        - ``jarvis.openYaml``
        - Opens the entity's convention YAML file
      * - context.md
        - ``$(notebook)``
        - ``jarvis.openContext``
        - Opens ``context.md`` in the entity's folder
      * - Recording
        - ``$(record)``
        - ``jarvis.openRecording``
        - Opens the ``recording/`` subfolder

   **Icon order** (left to right in the tree item inline area):

   ``$(record)`` (conditional) → ``$(notebook)`` → ``$(go-to-file)``

   This is controlled via ``group: "inline@<n>"`` in the
   ``contributes.menus.view/item/context`` entries in ``package.json``.

   **Recording icon visibility:**

   The recording icon is conditionally visible, gated by the
   ``jarvis.hasRecording`` context key:

   * **When to show:** The ``$(record)`` inline icon SHALL be visible only
     when ``jarvis.hasRecording`` is ``true`` for the given tree item.
   * **``when`` clause** in ``package.json``:

     .. code-block:: json

        {
          "command": "jarvis.openRecording",
          "when": "viewItem =~ /^jarvis(Project|Event|Session)$/ && jarvis.hasRecording",
          "group": "inline@1"
        }

   **Context key mechanism — ``jarvis.hasRecording``:**

   The ``jarvis.hasRecording`` context key is set per tree item during
   ``getTreeItem()`` in each TreeDataProvider:

   1. **Folder scan rule:** For each leaf node, check whether the entity's
      folder contains a ``recording/`` subdirectory
      (``fs.existsSync(path.join(entityFolder, 'recording'))``).
   2. **Set context key:** If ``recording/`` exists → set
      ``jarvis.hasRecording`` to ``true`` for that tree item via the
      ``contextValue`` mechanism: append ``+recording`` to the
      ``contextValue`` string (e.g., ``jarvisProject+recording``).
   3. **``when`` clause match:** Update the ``when`` clause to check for the
      ``+recording`` suffix:

      .. code-block:: json

         {
           "command": "jarvis.openRecording",
           "when": "viewItem =~ /recording/",
           "group": "inline@1"
         }

   4. **No ``recording/`` subfolder** → standard ``contextValue`` without
      suffix (e.g., ``jarvisProject``). The recording icon is not shown.

   **Implementation in ``getTreeItem()``:**

   .. code-block:: typescript

      const entityFolder = path.dirname(element.id);
      const hasRecording = fs.existsSync(
          path.join(entityFolder, 'recording')
      );
      item.contextValue = hasRecording
          ? `${baseContextValue}+recording`
          : baseContextValue;

   Where ``baseContextValue`` is ``jarvisProject``, ``jarvisEvent``, or
   ``jarvisSession`` depending on the entity kind.

   **Manifest entries** (``package.json`` ``contributes.menus.view/item/context``):

   .. code-block:: json

      [
        {
          "command": "jarvis.openRecording",
          "when": "viewItem =~ /recording/",
          "group": "inline@1"
        },
        {
          "command": "jarvis.openContext",
          "when": "viewItem =~ /^jarvis(Project|Event|Session)/",
          "group": "inline@2"
        },
        {
          "command": "jarvis.openYaml",
          "when": "viewItem =~ /^jarvis(Project|Event|Session)/",
          "group": "inline@3"
        }
      ]

   **Acceptance Criteria:**

   1. Every leaf node shows ``$(go-to-file)`` inline icon for opening the
      entity YAML file.
   2. Every leaf node shows ``$(notebook)`` inline icon for opening
      ``context.md``.
   3. Every leaf node whose folder contains a ``recording/`` subfolder shows
      ``$(record)`` inline icon.
   4. Icon order (left to right): ``$(record)`` (conditional), ``$(notebook)``,
      ``$(go-to-file)``.
   5. Recording icon visibility is gated by the ``+recording`` suffix in
      ``contextValue``, set during ``getTreeItem()`` based on
      ``fs.existsSync(path.join(entityFolder, 'recording'))``.
   6. The ``when`` clause for the recording icon matches ``viewItem =~
      /recording/``.
   7. All three entity kinds (project, event, session) use the same icon set
      and visibility logic — no kind-specific branching.
   8. Session nodes already have these icons; this spec extends the pattern to
      project and event nodes.


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


.. spec:: Context Actions Commands
   :id: SPEC_EXP_CONTEXTACTIONS
   :status: implemented
   :links: REQ_EXP_CONTEXTACTIONS; SPEC_EXP_EXTENSION; SPEC_EXP_PROVIDER

   **Description:**
   Register three commands in ``extension.ts`` that delegate to built-in VS Code
   commands to reveal the entity folder in the file explorer, OS file manager, or
   integrated terminal. Each command receives a ``LeafNode`` from the tree view
   context menu and derives the folder URI from the convention file path.

   **Handlers:**

   .. code-block:: typescript

      vscode.commands.registerCommand('jarvis.revealInExplorer', (node: LeafNode) => {
          vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(node.id));
      });

      vscode.commands.registerCommand('jarvis.revealInOS', (node: LeafNode) => {
          vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(node.id));
      });

      vscode.commands.registerCommand('jarvis.openInTerminal', (node: LeafNode) => {
          vscode.commands.executeCommand('openInTerminal', vscode.Uri.file(node.id));
      });

   **Design note:** ``node.id`` is the absolute path to the convention file
   (``project.yaml`` / ``event.yaml``). The built-in ``revealInExplorer`` command
   accepts a file URI and reveals the containing folder. ``revealFileInOS`` opens
   the OS file manager at that path. ``openInTerminal`` opens a terminal at the
   directory of the given URI. All three handle the folder resolution internally.

   **Registration in package.json:**

   * ``contributes.commands``:

     .. code-block:: json

        [
          {
            "command": "jarvis.revealInExplorer",
            "title": "Reveal in Explorer"
          },
          {
            "command": "jarvis.revealInOS",
            "title": "Reveal in File Explorer"
          },
          {
            "command": "jarvis.openInTerminal",
            "title": "Open in Terminal"
          }
        ]

   * ``contributes.menus.view/item/context``: six entries (3 commands × 2 contextValues),
     all in group ``"context-actions"``:

     .. code-block:: json

        [
          {
            "command": "jarvis.revealInExplorer",
            "when": "viewItem == jarvisProject",
            "group": "context-actions"
          },
          {
            "command": "jarvis.revealInExplorer",
            "when": "viewItem == jarvisEvent",
            "group": "context-actions"
          },
          {
            "command": "jarvis.revealInOS",
            "when": "viewItem == jarvisProject",
            "group": "context-actions"
          },
          {
            "command": "jarvis.revealInOS",
            "when": "viewItem == jarvisEvent",
            "group": "context-actions"
          },
          {
            "command": "jarvis.openInTerminal",
            "when": "viewItem == jarvisProject",
            "group": "context-actions"
          },
          {
            "command": "jarvis.openInTerminal",
            "when": "viewItem == jarvisEvent",
            "group": "context-actions"
          }
        ]

   * ``contributes.menus.commandPalette``: hide all three commands:

     .. code-block:: json

        [
          { "command": "jarvis.revealInExplorer", "when": "false" },
          { "command": "jarvis.revealInOS", "when": "false" },
          { "command": "jarvis.openInTerminal", "when": "false" }
        ]

   **Disposables** pushed to ``context.subscriptions``.


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
   :links: REQ_EXP_SEARCHPROJECTS; REQ_EXP_SEARCHEVENTS; SPEC_EXP_SCANNER; SPEC_EXP_PROVIDER; SPEC_EXP_SEARCH_MANIFEST

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


.. spec:: Open Context File Command
   :id: SPEC_EXP_OPENCONTEXT_CMD
   :status: draft
   :links: REQ_EXP_OPENCONTEXT; SPEC_EXP_OPENYAML_CMD; SPEC_EXP_AGENTSESSION; SPEC_EXP_EXTENSION

   **Description:**
   A command ``jarvis.openContext`` resolves and opens the ``context.md`` file
   associated with a project or event leaf item using a 3-step discovery
   process. If no file is found, an information message is shown.

   **Handler:**

   The command receives the selected ``LeafNode`` as its argument (VS Code
   passes the element from the ``TreeDataProvider`` when the inline action is
   triggered).

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.openContext',
        async (element: LeafNode) => {
          const folder = path.dirname(element.id);

          // Step 1: direct hit
          const direct = path.join(folder, 'context.md');
          if (fs.existsSync(direct)) {
            await vscode.window.showTextDocument(vscode.Uri.file(direct));
            return;
          }

          // Step 2: one-level subfolder search (hidden folders excluded)
          const candidates: string[] = [];
          try {
            for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
              if (!entry.isDirectory() || entry.name.startsWith('.')) { continue; }
              const candidate = path.join(folder, entry.name, 'context.md');
              if (fs.existsSync(candidate)) {
                candidates.push(candidate);
              }
            }
          } catch {
            // entity folder unreadable — fall through to "not found"
          }

          if (candidates.length === 1) {
            // Step 2a: exactly one match — open without prompting
            await vscode.window.showTextDocument(vscode.Uri.file(candidates[0]));
            return;
          }

          if (candidates.length > 1) {
            // Step 3: multiple matches — let user pick
            const items = candidates.map(c => ({
              label: path.relative(folder, c).replace(/\\/g, '/'),
              fullPath: c
            }));
            const pick = await vscode.window.showQuickPick(items, {
              placeHolder: 'Multiple context.md found — pick one'
            });
            if (pick) {
              await vscode.window.showTextDocument(vscode.Uri.file(pick.fullPath));
            }
            return;
          }

          // Step 4: nothing found
          vscode.window.showInformationMessage('No context.md found for this entity');
        }
      );

   **Registration in package.json:**

   * ``contributes.commands``: ``jarvis.openContext`` with title
     "Jarvis: Open Context" and icon ``$(notebook)``

     .. code-block:: json

        {
          "command": "jarvis.openContext",
          "title": "Jarvis: Open Context",
          "icon": "$(notebook)"
        }

   * ``contributes.menus.view/item/context``: two entries, both with
     ``group: "inline"``

     .. code-block:: json

        [
          {
            "command": "jarvis.openContext",
            "when": "viewItem == jarvisProject",
            "group": "inline"
          },
          {
            "command": "jarvis.openContext",
            "when": "viewItem == jarvisEvent",
            "group": "inline"
          }
        ]

   * ``contributes.menus.commandPalette``: hide from Command Palette (the
     command requires a ``LeafNode`` argument and would fail without one)

     .. code-block:: json

        [
          {
            "command": "jarvis.openContext",
            "when": "false"
          }
        ]

   **Design notes:**

   * Same inline-button pattern as ``SPEC_EXP_OPENYAML_CMD`` and
     ``SPEC_EXP_AGENTSESSION`` — three icons will be shown on leaf nodes:
     ``$(go-to-file)``, ``$(comment-discussion)``, and ``$(notebook)``
   * ``fs.existsSync()`` is used synchronously for all existence checks — this
     is acceptable because the subfolder count is small (project/event folders
     typically contain fewer than 20 entries)
   * ``fs.readdirSync`` with ``{ withFileTypes: true }`` avoids a second stat
     call to determine whether an entry is a directory
   * Hidden subfolders (names starting with ``.``) are excluded to avoid
     scanning ``.git``, ``.vscode``, and similar tool directories
   * Discovery is limited to exactly one level of depth — no recursion — to
     keep the search predictable and fast
   * The QuickPick label uses a forward-slash-normalised relative path so it
     looks consistent on Windows and macOS (e.g. ``pm/context.md``)
   * If the entity folder itself cannot be read (permissions, missing dir),
     the ``readdirSync`` error is silently swallowed and the "not found"
     info message is shown — no error dialog is raised
   * The ``$(notebook)`` icon visually suggests "documentation" or "notes" and
     is distinct from the existing icons
   * No tree provider changes required — purely a command + menu contribution
