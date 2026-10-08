Actor Design Specifications
===========================

.. note::
  The Actor is the only kind of persistent participant in Jarvis. Its code
  lives in ``packages/core/src/engine/actors/``; the two hook-driven signal
  consumers (touched files, activity) live in
  ``packages/core/src/engine/hooks/`` because they are replaced as a unit
  once another signal source supplies the same events. There is no kind
  registry, no generic tree factory and no decorator API: the ACTORS view is
  one provider that renders Actor nodes and all of their children.

.. spec:: Actor Scanner
   :id: SPEC_ACTOR_SCANNER
   :status: implemented
   :links: REQ_ACTOR_SCHEMA; REQ_ACTOR_ACTIVATION; REQ_ACTOR_TREE; REQ_EXP_REACTIVECACHE; REQ_CFG_SCANINTERVAL; SPEC_CFG_PATHRESOLVER; SPEC_AUT_HEARTBEAT_RESOLVER_REUSE; SPEC_AUT_JOBREG

   **Description:**
   ``ActorScanner`` (``engine/actors/actorScanner.ts``) is the single source
   of Actors. Every consumer — the ACTORS view, the Actor tools, the
   injection primitive, destination validation for heartbeat, reminders and
   messages, and ``JarvisCoreApi.listActors()`` — reads its cache. No other
   component enumerates Actor folders.

   **Data model:**

   .. code-block:: typescript

      export interface ActorEntry {
          id: string;      // absolute path of actor.yaml (REQ_ACTOR_SCHEMA AC-7)
          name: string;    // actor.yaml name; fallback: folder name
          summary: string; // "" when absent
          folder: string;  // absolute path of the Actor folder
      }

      export type ActorLookup =
          | { status: 'found'; actor: ActorEntry }
          | { status: 'unknown' }
          | { status: 'ambiguous'; matches: ActorEntry[] };

      export class ActorScanner {
          constructor(resolveRoot: () => string, onDidChange: () => void);
          get actors(): ActorEntry[];          // sorted like the tree
          getActor(id: string): ActorEntry | undefined;
          resolveName(name: string): ActorLookup;  // the unique-name rule
          rescan(): Promise<void>;
      }

      export function ambiguousActorMessage(name: string, matches: ActorEntry[]): string;
      // → `Actor name "<name>" is ambiguous: <folder>, <folder>`

   **Discovery algorithm (``rescan``):**

   1. Resolve the root via ``resolveRoot()`` — ``jarvis.actors.folder``
      relative to the first workspace folder (``SPEC_CFG_PATHRESOLVER``).
      An empty or unreadable root yields an empty result, not an error
      (``REQ_ACTOR_TREE`` AC-12).
   2. ``readdir`` the root once; for every **directory** entry, test for
      ``<entry>/actor.yaml``. Nested folders are never visited
      (``REQ_ACTOR_TREE`` AC-2, AC-11).
   3. Parse each ``actor.yaml`` with ``js-yaml``. ``name`` falls back to the
      folder name when the file is unparseable or ``name`` is missing or
      empty; ``summary`` falls back to ``""``. A legacy ``agent`` key is not
      read (``REQ_ACTOR_TREE`` AC-3, ``REQ_ACTOR_SCHEMA`` AC-2).
   4. Key each entry by the absolute ``actor.yaml`` path. Two folders whose
      YAML names collide stay two entries (``REQ_ACTOR_SCHEMA`` AC-7).
   5. Sort by ``name`` with ``localeCompare(…, { sensitivity: 'base' })``
      (``REQ_ACTOR_TREE`` AC-4).
   6. Compare with the previous cache; call ``onDidChange()`` only when the
      result differs, so a periodic rescan of an unchanged folder does not
      refresh the view.

   **Rescan triggers** (``REQ_ACTOR_TREE`` AC-5 to AC-7):

   * once at activation;
   * ``jarvis.rescan`` (the view's ``$(refresh)`` button);
   * the background timer (below);
   * ``onDidChangeConfiguration`` for ``jarvis.actors.folder``;
   * explicitly after a create (``SPEC_ACTOR_CREATE``).

   ``jarvis.rescan`` calls ``actorScanner.rescan()`` only; there is no other
   scanner.

   **Background timer** (``REQ_CFG_SCANINTERVAL``, ``REQ_EXP_REACTIVECACHE``):
   ``ActorScanner`` owns the periodic rescan. It is a plain ``setInterval``,
   not a heartbeat job, so it is invisible in the Heartbeat view and runs
   whether or not ``jarvis.heartbeat.enabled`` is on.

   .. code-block:: typescript

      startTimer(minutes: number): void {
          this.stopTimer();
          if (minutes > 0) {
              this._timer = setInterval(() => { void this.rescan(); }, minutes * 60_000);
          }
      }
      stopTimer(): void { if (this._timer) { clearInterval(this._timer); this._timer = undefined; } }
      dispose(): void { this.stopTimer(); }

   ``extension.ts`` calls ``startTimer(jarvis.scanInterval)`` at activation
   and again on ``onDidChangeConfiguration`` for ``jarvis.scanInterval``; the
   scanner is pushed to ``context.subscriptions``. A rescan that is still
   running when the next tick fires is not started twice: ``rescan()``
   returns the in-flight promise.

   **Leftover heartbeat job:** earlier versions registered ``"Jarvis:
   Rescan"`` in ``heartbeat.yaml``. When the heartbeat feature activates,
   ``extension.ts`` calls ``scheduler.unregisterJob('Jarvis: Rescan')``
   once (``SPEC_AUT_JOBREG``; a no-op when absent). ``syncRescanJob()`` is
   removed.

   **Unique-name resolution** (``REQ_ACTOR_SCHEMA`` AC-7): ``resolveName``
   is the one place that turns a name into an Actor. It returns ``found``
   for exactly one entry with that ``name`` (exact, case-sensitive match),
   ``unknown`` for none and ``ambiguous`` with every match for more than one;
   it never picks one of several. The duplicate entries stay in ``actors``
   so the view shows both folders, but no name-based function acts on them.
   Every core consumer resolves names through it: ``injectPrompt``
   (``SPEC_INJ_INJECT``), the
   touched-files tracker and display (``SPEC_ACTOR_TOUCHEDFILES``), the
   activity tracker (``SPEC_ACTOR_ACTIVITY``), ``jarvis_sendMessage``
   (``SPEC_MSG_SENDMESSAGE``), ``JarvisCoreApi.sendMessage``
   (``SPEC_ENG_API``), the creation check (``SPEC_ACTOR_CREATE``: any
   result other than ``unknown`` blocks creation) and
   ``getValidDestinations()``. Among the ambiguous-name refusals, only a
   refused message send shows the user an error notification naming the
   name and its folders; activity, touched files, prompt
   injection, agent file maintenance and Kanban owner resolution refuse
   silently (``REQ_ACTOR_SCHEMA`` AC-7). Agent file maintenance
   (``SPEC_ACTOR_WHOAMI``) refuses by precondition: its callers
   (``injectPrompt`` and the creation paths) have established exactly one
   Actor before they call it. Creation's own "already exists" notification
   (``SPEC_ACTOR_CREATE`` step 3) is a separate case, not part of this list:
   it fires on any blocking result, ``found`` or ``ambiguous`` alike,
   because attempting to create a name that already exists is itself the
   error being reported, independent of how many Actors currently carry it.
   Add-ons see
   only ``listActors()`` and apply the same exactly-one rule to it
   (``SPEC_KAN_CREATE``).

   **Destination source:** ``getValidDestinations()`` (``sessionLookup.ts``,
   ``SPEC_AUT_HEARTBEAT_RESOLVER_REUSE``) returns the names of
   ``actorScanner.actors`` for which ``resolveName`` is ``found`` — an
   ambiguous name is not in the set — and nothing else; chat session titles
   are not valid destinations or senders (``REQ_AUT_HEARTBEAT_RESOLVER_REUSE``
   AC-3). Validators that only test membership (heartbeat load-time,
   fire-time and ``jarvis_registerJob``) therefore refuse an ambiguous name
   without a check of their own. The former merged entity source
   (``createActorEntitySource``) is removed together with the legacy scanner
   it merged.

   **Acceptance Criteria:**

   * AC-1: Only direct child folders of the resolved root that contain
     ``actor.yaml`` become entries; nested folders are not visited.
   * AC-2: ``id`` is the absolute ``actor.yaml`` path; the name fallback is
     the folder name.
   * AC-3: ``resolveName`` returns ``found`` only for exactly one matching
     entry, ``unknown`` for none and ``ambiguous`` (with all matches) for
     several; no core component matches Actor names by any other means.
   * AC-4: ``onDidChange`` fires only when the scanned result differs from
     the cache.
   * AC-5: The rescan triggers above are the only ones; no file-system
     watcher is used.
   * AC-6: Heartbeat, reminder and message destination validation read
     Actor names from this scanner and from no other enumeration.
   * AC-7: The periodic rescan is a ``setInterval`` owned by the scanner; no
     heartbeat job is created for it, and a leftover ``"Jarvis: Rescan"``
     job is removed when the heartbeat feature starts.
   * AC-8: ``getValidDestinations()`` excludes every name that resolves to
     ``ambiguous``.
   * AC-9: An ``ActorEntry`` carries no ``agent``; a legacy ``agent`` key in
     ``actor.yaml`` has no effect on any entry.


.. spec:: Actor Schema
   :id: SPEC_ACTOR_SCHEMA
   :status: implemented
   :links: REQ_ACTOR_SCHEMA

   **Description:**
   ``schemas/actor.schema.json`` (JSON Schema draft-07) describes
   ``actor.yaml``. It is shipped in ``packages/core/schemas/`` and bound in
   two ways: ``contributes.yamlValidation`` in ``packages/core/package.json``,
   and the YAML-extension contributor ``resolveJarvisYamlSchema()``
   (``engine/core/yamlSchemaContributor.ts``), which maps the basename
   ``actor.yaml`` to the schema.

   .. code-block:: json

      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Jarvis Actor",
        "type": "object",
        "required": ["name"],
        "additionalProperties": false,
        "properties": {
          "name":    { "type": "string", "minLength": 1 },
          "summary": { "type": "string" },
          "agent":   { "type": "string", "description": "Deprecated and ignored. An Actor's agent is identified by the Actor name (SPEC_ACTOR_WHOAMI)." }
        }
      }

   .. code-block:: json

      { "fileMatch": "actor.yaml", "url": "./schemas/actor.schema.json" }

   **Acceptance Criteria:**

   * AC-1: The schema requires ``name``, allows ``summary`` and the
     deprecated ``agent`` (described as ignored; Jarvis never writes it), and
     sets ``additionalProperties: false``.
   * AC-2: ``actor.yaml`` is the only YAML file core binds to a schema;
     ``resolveJarvisYamlSchema()`` returns ``undefined`` for every other
     basename.


.. spec:: ACTORS Tree Provider
   :id: SPEC_ACTOR_TREE
   :status: approved
   :links: REQ_ACTOR_TREE; REQ_EXP_TREEVIEW; SPEC_ACTOR_SCANNER; SPEC_ACTOR_FILES; SPEC_ACTOR_TOUCHEDFILES; SPEC_ACTOR_ACTIVITY; SPEC_ACTOR_OPENSESSION; SPEC_ENG_ACTORMARK

   **Description:**
   ``ActorTreeProvider`` (``engine/actors/actorTreeProvider.ts``) is the
   ``TreeDataProvider`` of the ``jarvisActors`` view. It renders Actor nodes
   from ``ActorScanner`` and delegates their children to the file-children
   and touched-files logic (``SPEC_ACTOR_FILES``,
   ``SPEC_ACTOR_TOUCHEDFILES``). It sets the activity icon itself
   (``SPEC_ACTOR_ACTIVITY``) and holds the icon marks of add-ons
   (``SPEC_ENG_ACTORMARK``), which take precedence.

   **Node union** (provider-local; the variants below are defined in
   ``SPEC_ACTOR_FILES`` and ``SPEC_ACTOR_TOUCHEDFILES``):

   .. code-block:: typescript

      interface ActorNode { kind: 'actor'; id: string } // id = ActorEntry.id

      type ActorTreeNode =
          | ActorNode
          | ActorFileCategoryNode | ActorFileNode | ActorFileFolderNode
          | TouchedFileFolderNode | TouchedFileLeafNode;

   **Actor node rendering:**

   .. code-block:: typescript

      const actor = scanner.getActor(node.id);
      const item = new vscode.TreeItem(actor?.name ?? '', vscode.TreeItemCollapsibleState.Collapsed);
      item.tooltip = actor?.summary ?? '';
      item.contextValue = 'jarvisActor';
      item.command = { command: 'jarvis.openActorSession', title: 'Open', arguments: [node] };
      const mark = marks.get(node.id);                 // SPEC_ENG_ACTORMARK
      if (mark) {
          item.iconPath = mark.icon;
      } else if (actor && activity.isActive(actor.name)) {
          item.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
      }

   **View registration** (``extension.ts``):

   .. code-block:: typescript

      const actorsView = vscode.window.createTreeView('jarvisActors', {
          treeDataProvider: actorTreeProvider,
          showCollapseAll: true,                 // REQ_ACTOR_TREE AC-9
      });
      const first = vscode.workspace.workspaceFolders?.[0];
      if (first) { actorsView.title = `${first.name} Actors`; }  // AC-1

   **Refresh API:** ``refresh()`` fires ``onDidChangeTreeData(undefined)``.
   It is called by the scanner's ``onDidChange``, by the activity tracker on
   a state flip, by the touch tracker after a recorded touch, by the
   touched-files commands, and on a change of
   ``jarvis.touchedFiles.windowDays``. With one view there is nothing to
   refresh selectively.

   **package.json (core):**

   * ``contributes.views.jarvis-explorer``: ``{ "id": "jarvisActors", "name": "Actors" }``
     (the runtime title replaces the name once a workspace is open).
   * ``contributes.menus.view/title`` for ``view == jarvisActors``:
     ``jarvis.newActor`` (``$(add)``, ``navigation@1``) and ``jarvis.rescan``
     (``$(refresh)``, ``navigation@2``).
   * ``contributes.commands``: ``jarvis.rescan`` (title "Jarvis: Rescan",
     icon ``$(refresh)``), hidden from the Command Palette.

   **Acceptance Criteria:**

   * AC-1: Actor nodes carry label ``name``, tooltip ``summary``,
     ``contextValue`` ``jarvisActor``, ``collapsibleState = Collapsed`` and
     the click command ``jarvis.openActorSession``.
   * AC-2: The view title is ``<first workspace folder name> Actors``.
   * AC-3: The title bar shows ``$(add)``, ``$(refresh)`` and VS Code's
     Collapse All; Collapse All is provided by ``showCollapseAll`` and needs
     no command of its own.
   * AC-4: The provider renders no grouping, category or filter nodes at the
     root level.
   * AC-5: The provider is the only ``TreeDataProvider`` for Actors; no
     generic tree factory or decorator registry exists.


.. spec:: Actor File Children
   :id: SPEC_ACTOR_FILES
   :status: implemented
   :links: REQ_ACTOR_FILES_TREE; SPEC_ACTOR_TREE; SPEC_ACTOR_AGENT_DISCOVERY; SPEC_MSG_EDITORPLACEMENT

   **Description:**
   An Actor node expands into an "Agent" category (conditional) and a
   "Files" category (always). Both are computed on each expansion; nothing
   is cached in the scanner (``REQ_ACTOR_FILES_TREE`` AC-10).

   **Node types:**

   .. code-block:: typescript

      interface ActorFileCategoryNode {
          kind: 'actorFileCategory';
          category: 'agent' | 'files' | 'touched';
          actorId: string;      // owning ActorEntry.id — re-resolved on expansion
      }
      interface ActorFileNode {
          kind: 'actorFile';
          filePath: string;     // absolute
          label: string;        // basename
      }
      interface ActorFileFolderNode {
          kind: 'actorFileFolder';
          folderPath: string;   // absolute
          label: string;
      }

   **Children of an Actor node:**

   .. code-block:: typescript

      async function actorChildren(actor: ActorEntry): Promise<ActorTreeNode[]> {
          const nodes: ActorTreeNode[] = [];
          if (await resolveAgentFile(actor.name)) {
              nodes.push({ kind: 'actorFileCategory', category: 'agent', actorId: actor.id });
          }
          nodes.push({ kind: 'actorFileCategory', category: 'files', actorId: actor.id });
          // "touched" category: SPEC_ACTOR_TOUCHEDFILES
          return nodes;
      }

   ``resolveAgentFile(name)`` returns the absolute path of the
   ``*.agent.md`` whose identity equals the Actor name, using
   ``discoverAgentModes()`` (``SPEC_ACTOR_AGENT_DISCOVERY``). It returns
   ``undefined`` when no agent carries that name; the category is then
   omitted without error (``REQ_ACTOR_FILES_TREE`` AC-4). Discovery runs on
   every call; the former module-level cache (``getAgentModesCached``) is
   removed, because ``REQ_ACTOR_AGENT_DISCOVERY`` AC-6 forbids a persistent
   cache and the check must follow each refresh (``REQ_ACTOR_FILES_TREE``
   AC-9).

   **Category and folder expansion:**

   * ``agent`` → exactly one ``ActorFileNode`` with label
     ``Agent File: <basename>``.
   * ``files`` → ``listFolder(actor.folder)``.
   * ``actorFileFolder`` → ``listFolder(folderPath)``.

   .. code-block:: typescript

      async function listFolder(folder: string): Promise<(ActorFileNode | ActorFileFolderNode)[]> {
          let entries: fs.Dirent[];
          try { entries = await fs.promises.readdir(folder, { withFileTypes: true }); }
          catch { return []; }                      // unreadable → empty, no error
          return entries
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
              .map(e => e.isDirectory()
                  ? { kind: 'actorFileFolder', folderPath: path.join(folder, e.name), label: e.name }
                  : { kind: 'actorFile', filePath: path.join(folder, e.name), label: e.name });
      }

   ``readdir`` includes dot-prefixed entries; files and folders are sorted
   together (``REQ_ACTOR_FILES_TREE`` AC-3).

   **Tree items:**

   .. list-table::
      :header-rows: 1
      :widths: 25 20 55

      * - Node
        - State
        - ``contextValue`` / other
      * - category ``agent``/``files``
        - Collapsed
        - ``jarvisActorFileCategory:agent`` / ``jarvisActorFileCategory:files``; label "Agent" / "Files"
      * - ``actorFileFolder``
        - Collapsed
        - ``jarvisActorFileFolder``; tooltip = absolute path, forward slashes
      * - ``actorFile``
        - None
        - ``jarvisActorFile``; tooltip = absolute path, forward slashes; command ``jarvis.openActorFile``

   **``jarvis.openActorFile``** (``extension.ts``, hidden from the Command
   Palette):

   .. code-block:: typescript

      vscode.commands.registerCommand('jarvis.openActorFile',
        async (node: { filePath: string; resourceUri?: vscode.Uri }) => {
          const uri = node.resourceUri ?? vscode.Uri.file(node.filePath);
          try {
            await vscode.workspace.openTextDocument(uri);   // existence check, no creation
            if (uri.path.toLowerCase().endsWith('.md')) {
              await vscode.commands.executeCommand('markdown.showPreview', uri, DOCS_COLUMN);
            } else {
              await openAtDocs(uri, { preview: true });      // focus in place if open elsewhere
            }
          } catch {
            vscode.window.showWarningMessage(`Jarvis: Cannot open file: ${node.filePath}`);
          }
        });

   ``DOCS_COLUMN`` and ``openAtDocs`` are the Docs-column helpers of
   ``SPEC_MSG_EDITORPLACEMENT`` (``REQ_ACTOR_FILES_TREE`` AC-6). The same
   command opens touched-file leaves, which carry ``resourceUri``
   (``SPEC_ACTOR_TOUCHEDFILES``).

   **Acceptance Criteria:**

   * AC-1: An Actor node's children are "Agent" (only when the Actor's own
     agent is found by the Actor name) followed by "Files"; the touched-files
     category follows them (``SPEC_ACTOR_TOUCHEDFILES``).
   * AC-2: "Files" and every subfolder are listed by ``readdir`` on each
     expansion, alphabetically, hidden entries included.
   * AC-3: Agent resolution calls ``discoverAgentModes()`` on each
     evaluation; no module-level cache remains.
   * AC-4: ``contextValue`` values are exactly those in the table.
   * AC-5: Clicking a file child opens it via ``jarvis.openActorFile``:
     ``.md`` as Markdown Preview in the Docs column, other files in preview
     mode in the Docs column; a missing file shows a warning and creates
     nothing.


.. spec:: Recently Touched Files per Actor
   :id: SPEC_ACTOR_TOUCHEDFILES
   :status: approved
   :links: REQ_ACTOR_TOUCHEDFILES; SPEC_ACTOR_FILES; SPEC_ACTOR_TREE; SPEC_ACTOR_CONTEXTMENU; SPEC_HOOK_ROUTE

   **Description:**
   ``TouchTracker`` (``engine/hooks/touchTracker.ts``) records file touches
   from ``PostToolUse`` hook events per Actor. ``TouchStore``
   (``engine/hooks/touchStore.ts``) persists them. ``ActorTreeProvider``
   renders them as the third category, "Recently Touched Files".

   **Classification** (``REQ_ACTOR_TOUCHEDFILES`` AC-1 to AC-3):

   .. code-block:: typescript

      const TOUCH_RULES: Record<string, { kind: 'read' | 'write'; extract: (i: any) => string[] }> = {
          read_file:                    { kind: 'read',  extract: i => [i.filePath] },
          create_file:                  { kind: 'write', extract: i => [i.filePath] },
          replace_string_in_file:       { kind: 'write', extract: i => [i.filePath] },
          multi_replace_string_in_file: { kind: 'write', extract: i => (i.replacements ?? []).map((r: any) => r.filePath) },
      };
      // any other tool_name is ignored

   **Tracker:** one ``hookEngine.on('PostToolUse', …)`` subscription
   (``SPEC_HOOK_ROUTE``). For each event:

   1. Ignore it when ``sessionId``, a matching rule, or ``payload.cwd`` is
      missing.
   2. Resolve ``sessionId`` to a chat title via
      ``getEntityNameForSessionId()`` (``sessionLookup.ts``), then to an
      Actor via ``actorScanner.resolveName(title)``. Ignore the event unless
      the result is ``found`` (``REQ_ACTOR_TOUCHEDFILES`` AC-4).
   3. De-duplicate the extracted paths and resolve each with
      ``resolveRecordedTouch(path, cwd, workspaceFolders)``: resolve against
      ``cwd``, pick the longest ``file``-scheme workspace folder that
      contains the result (checked with ``path.relative``, never a string
      prefix), and return ``{ recordKey, rootUri, relPath }`` where
      ``recordKey`` is the canonical resource URI and ``relPath`` is
      forward-slash separated. A path under no workspace folder is not
      recorded (``REQ_ACTOR_TOUCHEDFILES`` AC-5, AC-20).
   4. ``touchStore.recordTouches(actor.name, touches, rule.kind)``, then
      ``actorTreeProvider.refresh()``.

   **Store:** one JSON file per Actor at
   ``<workspaceRoot>/.jarvis/state/touched-files/actor-<name>.json``
   (``REQ_ACTOR_TOUCHEDFILES`` AC-6). The kind prefix is fixed to ``actor``;
   the former storage-kind disambiguation (``resolveTouchStorageKind``) is
   removed because only one kind exists.

   .. code-block:: typescript

      interface TouchEntry { lastRead?: string; lastEdited?: string; rootUri?: string; relPath?: string }
      interface TouchFile  { files: Record<string, TouchEntry> }   // key = recordKey

      class TouchStore {
          recordTouches(actorName: string, touches: RecordedTouch[], kind: 'read' | 'write'): void;
          getEntries(actorName: string): Record<string, TouchEntry>;
          removeEntry(actorName: string, recordKey: string): void;
          removeUnder(actorName: string, rootUri: string, relFolderPath: string): void;
          removeAll(actorName: string): void;                       // deletes the file
          removeEntriesIfUnchanged(actorName: string,
              snapshot: Record<string, TouchEntry>, absentKeys: readonly string[]): number;
      }

   Every mutating method reads, mutates and writes the file with
   synchronous ``fs`` calls and no ``await`` in between, so overlapping
   ``PostToolUse`` handlers cannot interleave and lose entries
   (``REQ_ACTOR_TOUCHEDFILES`` AC-6a). ``messageQueue.ts`` uses the same
   pattern for the same read-modify-write shape. A missing or corrupt file
   reads as empty.

   **Display filters** — both are applied at the category, never per node:

   * ``withinWindow(entries, days)``: keeps an entry whose later timestamp
     lies within ``days × 24 h`` of now; ``days <= 0`` keeps everything
     (``REQ_ACTOR_TOUCHEDFILES`` AC-15). ``days`` is read from
     ``jarvis.touchedFiles.windowDays`` on each use.
   * ``probeTouchEntry(recordKey, entry)``: returns ``present``, ``absent``
     or ``unknown``. It requires ``rootUri`` to equal an open workspace
     folder, joins ``relPath`` with ``Uri.joinPath``, checks the result
     against ``recordKey`` and its owning folder, then calls
     ``vscode.workspace.fs.stat``. Only ``FileSystemError.FileNotFound`` is
     ``absent``; missing metadata and every other failure are ``unknown``
     (``REQ_ACTOR_TOUCHEDFILES`` AC-16, AC-19 to AC-21). Using
     ``workspace.fs`` makes the probe correct for remote and virtual
     workspaces.

   **Category and tree:**

   * The category node (``category: 'touched'``) is added after "Files"
     when ``scanner.resolveName(actor.name)`` is ``found`` and
     ``withinWindow(getEntries(name))`` is non-empty. For an ambiguous name
     neither Actor node gets the category, so no touch is attributed to
     either folder (``REQ_ACTOR_TOUCHEDFILES`` AC-22). This decision
     never probes the file system, because it runs for every Actor on every
     refresh (``REQ_ACTOR_TOUCHEDFILES`` AC-7).
   * On expansion, entries are filtered by ``withinWindow`` and then by the
     probe (``present`` only). The filtered list is carried on the folder
     nodes, so expanding a folder costs no further probes.
   * The hierarchy is built from ``relPath`` segments: one folder node per
     distinct ``(rootUri, folder path)``, one leaf per file, sorted
     case-insensitively. A folder node exists only for a path in the
     filtered list, so empty branches never appear
     (``REQ_ACTOR_TOUCHEDFILES`` AC-8). With more than one workspace folder,
     the top level groups by root and shows the root's name.

   .. code-block:: typescript

      interface TouchedFileFolderNode {
          kind: 'touchedFileFolder'; actorName: string;
          rootUri: string; relFolderPath: string; label: string;
          entries: ResolvedTouchEntry[];
      }
      interface TouchedFileLeafNode {
          kind: 'touchedFileLeaf'; actorName: string;
          recordKey: string; resourceUri: vscode.Uri;
          filePath: string;      // display/copy text only, never used for I/O
          label: string; entry: TouchEntry;
      }

   .. list-table::
      :header-rows: 1
      :widths: 30 20 50

      * - Node
        - State
        - ``contextValue`` / other
      * - category ``touched``
        - Collapsed
        - ``jarvisActorFileCategory:touched``; label "Recently Touched Files"
      * - ``touchedFileFolder``
        - Collapsed
        - ``jarvisTouchedFileFolder``; tooltip = ``relFolderPath``
      * - ``touchedFileLeaf``
        - None
        - ``jarvisTouchedFile``; tooltip = last edited / last read; command ``jarvis.openActorFile``

   **Commands** (``extension.ts``; all hidden from the Command Palette):

   .. code-block:: typescript

      // Show Changes — delegates to the Git extension; no fallback (AC-12)
      'jarvis.diffTouchedFile':    (n: TouchedFileLeafNode) => executeCommand('git.openChange', n.resourceUri)
      // inline trash on a leaf (AC-13)
      'jarvis.removeTouchedFile':  (n) => { touchStore.removeEntry(n.actorName, n.recordKey); refresh(); }
      // inline trash on a folder or the category (AC-13), no confirmation
      'jarvis.removeTouchedFiles': (n) => { n.kind === 'touchedFileFolder'
                                              ? touchStore.removeUnder(n.actorName, n.rootUri, n.relFolderPath)
                                              : touchStore.removeAll(n.actorName); refresh(); }
      // category cleanup (AC-17): snapshot → probe all (ignoring the window) → remove unchanged absent
      'jarvis.cleanupTouchedFiles': async (n) => {
          const snapshot = touchStore.getEntries(n.actorName);
          const absent = (await Promise.all(Object.entries(snapshot).map(
              async ([k, e]) => [k, (await probeTouchEntry(k, e)).state] as const)))
              .filter(([, s]) => s === 'absent').map(([k]) => k);
          const removed = touchStore.removeEntriesIfUnchanged(n.actorName, snapshot, absent);
          showInformationMessage(`${n.actorName}: removed ${removed} touched-file entr${removed === 1 ? 'y' : 'ies'} with no file on disk.`);
          refresh();
      }

   The probes run outside the synchronous section;
   ``removeEntriesIfUnchanged`` deletes a candidate only if its stored value
   still equals the snapshot, so a touch during the probes protects the
   entry. The cleanup reports the count even when it is zero, because the
   entries it targets are hidden (``REQ_ACTOR_TOUCHEDFILES`` AC-17).
   Legacy entries without ``rootUri``/``relPath`` stay ``unknown``: hidden,
   persisted, never guessed or migrated, removable only by the
   category-level trash (AC-19, AC-20).

   **package.json (core):**

   * ``contributes.commands``: ``jarvis.diffTouchedFile`` ("Jarvis: Show
     Changes"), ``jarvis.removeTouchedFile`` / ``jarvis.removeTouchedFiles``
     (``$(trash)``), ``jarvis.cleanupTouchedFiles`` (``$(clear-all)``).
   * ``view/item/context``: ``jarvis.removeTouchedFile`` inline on
     ``jarvisTouchedFile``; ``jarvis.removeTouchedFiles`` inline on
     ``jarvisTouchedFileFolder`` and (``inline@2``) on
     ``jarvisActorFileCategory:touched``; ``jarvis.cleanupTouchedFiles``
     ``inline@1`` on ``jarvisActorFileCategory:touched``;
     ``jarvis.diffTouchedFile`` in group ``diff`` on ``jarvisTouchedFile``.
     Open, Copy and Reveal entries: ``SPEC_ACTOR_CONTEXTMENU``.
   * ``contributes.configuration`` (Hooks group):
     ``jarvis.touchedFiles.windowDays`` — ``number``, default ``0``,
     minimum ``0``.

   **Wiring:** ``onDidChangeConfiguration`` for
   ``jarvis.touchedFiles.windowDays`` calls ``actorTreeProvider.refresh()``
   (``REQ_ACTOR_TOUCHEDFILES`` AC-15a). No other code path removes entries:
   there is no timer and no activation-time sweep (AC-18).

   **Acceptance Criteria:**

   * AC-1: The tracker subscribes to ``PostToolUse`` only and classifies by
     ``TOUCH_RULES``; unknown tools are ignored.
   * AC-2: An event is recorded only for exactly one matching Actor.
   * AC-3: Records are keyed by canonical resource URI and store ``rootUri``
     and ``relPath``; a path outside every workspace folder is not recorded.
   * AC-4: The store file is ``actor-<name>.json``; all mutations are
     synchronous read-mutate-write turns.
   * AC-5: Category visibility depends on the window only; leaf visibility
     depends on the window and on a ``present`` probe.
   * AC-6: Probing uses ``vscode.workspace.fs.stat``; only ``FileNotFound``
     counts as absent.
   * AC-7: Leaf, folder and category removal and the cleanup behave as in
     the Commands block; cleanup ignores the window and reports its count.
   * AC-8: Opening, revealing and diffing a leaf use its ``resourceUri``.
   * AC-9: An Actor whose name does not resolve to ``found`` shows no
     "Recently Touched Files" category, whatever its store contains.


.. spec:: Actor Activity Indicator
   :id: SPEC_ACTOR_ACTIVITY
   :status: approved
   :links: REQ_ACTOR_ACTIVITY; SPEC_ACTOR_TREE; SPEC_ACTOR_SCANNER; SPEC_HOOK_ROUTE; SPEC_HOOK_INTAKE

   **Description:**
   ``ActivityTracker`` (``engine/hooks/activityTracker.ts``) keeps an
   in-memory set of active Actor names from hook lifecycle events.
   ``ActorTreeProvider`` asks it for each Actor node (``SPEC_ACTOR_TREE``).
   The former ``ActivityDecorator`` and its registration through the
   decorator API are removed.

   .. code-block:: typescript

      const ACTIVE_EVENTS = new Set([
          'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse',
          'PreCompact', 'SubagentStart', 'SubagentStop',
      ]);

      export class ActivityTracker {
          constructor(hookEngine: HookEngine, scanner: ActorScanner, onChange: () => void);
          isActive(actorName: string): boolean;
      }

   **Algorithm** (one ``hookEngine.on`` subscription per event in
   ``ACTIVE_EVENTS`` plus ``Stop``):

   1. Ignore events without ``sessionId`` (``REQ_ACTOR_ACTIVITY`` AC-6).
   2. Resolve ``sessionId`` to the chat title via
      ``getEntityNameForSessionId()`` (reverse of ``lookupSessionUUID()``,
      same ``getAllSessions()`` source), then the title with
      ``scanner.resolveName(title)``. Ignore the event unless the result is
      ``found``: a title of no Actor (AC-5, AC-6) and a title carried by
      several Actors (AC-10) change nothing and show no notification.
   3. ``Stop`` removes the name from the set; every other event adds it.
   4. Call ``onChange()`` only when membership actually flipped, so a burst
      of tool events in one turn causes one refresh.

   ``isActive(actorName)`` returns ``false`` outright when
   ``scanner.resolveName(actorName)`` is not ``found``, even if the name is
   still in the set from before a duplicate appeared: a manual
   ``actor.yaml`` edit can make a name ambiguous between one hook event and
   the next tree refresh, and the query, not only the event path, is what
   ``REQ_ACTOR_ACTIVITY`` AC-10 requires to stay silent about it. The
   membership set is otherwise unpruned; a name that becomes unique again
   resumes showing its old state without a new hook event.

   ``onChange`` is wired to ``actorTreeProvider.refresh()``. While Active,
   the node's ``iconPath`` is a green ``circle-filled`` ``ThemeIcon``;
   while Inactive it is left unset (AC-7). There is no timeout and no third
   state (AC-4).

   **Acceptance Criteria:**

   * AC-1: The seven events in ``ACTIVE_EVENTS`` mark an Actor Active;
     ``Stop`` marks it Inactive; an Actor never seen is Inactive.
   * AC-2: Events without ``sessionId``, or whose title does not resolve to
     ``found``, change nothing and raise no error or notification.
   * AC-2a: ``isActive(actorName)`` is ``false`` whenever
     ``scanner.resolveName(actorName)`` is not ``found``, regardless of
     what the event-driven set holds.
   * AC-3: A refresh is triggered only on a state flip.
   * AC-4: The activity indicator is set by ``ActorTreeProvider`` alone; no decorator
     API exists. The only other influence on the icon is the mark of
     ``SPEC_ENG_ACTORMARK``, also held by the provider, which takes precedence while it is set.


.. spec:: Actor Context Menus
   :id: SPEC_ACTOR_CONTEXTMENU
   :status: approved
   :links: REQ_ACTOR_CONTEXTACTIONS; REQ_ACTOR_FILES_TREE; REQ_ACTOR_TOUCHEDFILES; SPEC_ACTOR_TREE; SPEC_ACTOR_FILES; SPEC_ACTOR_OPENSESSION

   **Description:**
   Right-click menus on Actor nodes, file children and touched-file leaves.
   All commands are registered in ``extension.ts`` and hidden from the
   Command Palette (``"when": "false"``).

   **Commands:**

   .. code-block:: typescript

      // Actor node → Actor folder (REQ_ACTOR_CONTEXTACTIONS AC-2)
      const folderUri = (n: ActorNode) => vscode.Uri.file(scanner.getActor(n.id)!.folder);
      'jarvis.revealInExplorer': (n) => executeCommand('revealInExplorer', uriOf(n))
      'jarvis.revealInOS':       (n: ActorNode) => executeCommand('revealFileInOS', folderUri(n))
      'jarvis.openInTerminal':   (n: ActorNode) => executeCommand('openInTerminal', folderUri(n))

      // Paths (REQ_ACTOR_CONTEXTACTIONS AC-3, REQ_ACTOR_FILES_TREE AC-8)
      function copyPaths(n): { folder: string; full: string } {
          switch (n.kind) {
            case 'actor':           { const f = scanner.getActor(n.id)!.folder; return { folder: f, full: f }; }
            case 'actorFile':
            case 'touchedFileLeaf': return { folder: path.dirname(n.filePath), full: n.filePath };
          }
      }
      'jarvis.copyPath':     (n) => clipboard.writeText(copyPaths(n).folder)
      'jarvis.copyFullPath': (n) => clipboard.writeText(copyPaths(n).full)
      'jarvis.copyFileName': (n: ActorFileNode | TouchedFileLeafNode) => clipboard.writeText(path.basename(n.filePath))

   ``uriOf(n)`` is the Actor folder for an Actor node and ``resourceUri``
   for a touched-file leaf (``SPEC_ACTOR_TOUCHEDFILES``). Copy Path and Copy
   Full Path deliberately both give the folder for an Actor node, which has
   no file name (``REQ_ACTOR_CONTEXTACTIONS`` AC-3).

   **package.json ``view/item/context`` (core):**

   .. list-table::
      :header-rows: 1
      :widths: 24 38 38

      * - ``viewItem``
        - Group ``open`` / ``context-actions``
        - Group ``clipboard@1..3``
      * - ``jarvisActor``
        - ``jarvis.openActorSession``; ``jarvis.revealInExplorer``, ``jarvis.revealInOS``, ``jarvis.openInTerminal``
        - ``jarvis.copyPath``, ``jarvis.copyFullPath``
      * - ``jarvisActorFile``
        - ``jarvis.openActorFile``
        - ``jarvis.copyPath``, ``jarvis.copyFullPath``, ``jarvis.copyFileName``
      * - ``jarvisTouchedFile``
        - ``jarvis.openActorFile``; ``jarvis.revealInExplorer``
        - ``jarvis.copyPath``, ``jarvis.copyFullPath``, ``jarvis.copyFileName``

   Titles: "Open", "Reveal in Explorer", "Reveal in File Explorer", "Open in
   Terminal", "Copy Path", "Copy Full Path", "Copy File Name". Categories and
   folders have no context menu; the touched-files inline actions are in
   ``SPEC_ACTOR_TOUCHEDFILES``.

   **Acceptance Criteria:**

   * AC-1: The menus contain exactly the entries in the table.
   * AC-2: Reveal, Terminal and both Copy Path commands on an Actor node act
     on the Actor folder.
   * AC-3: None of these commands appears in the Command Palette.


.. spec:: Actor Creation
   :id: SPEC_ACTOR_CREATE
   :status: implemented
   :links: REQ_ACTOR_CREATE; REQ_ACTOR_CREATETOOL; REQ_ACTOR_SCHEMA; SPEC_ACTOR_SCANNER; SPEC_ACTOR_WHOAMI; SPEC_ACTOR_OPENSESSION

   **Description:**
   ``engine/actors/actorCreation.ts`` owns everything that touches the file
   system when an Actor is created. Both entry points — the ``+`` command
   ``jarvis.newActor`` and the tool ``jarvis_createActor``
   (``SPEC_ACTOR_CREATETOOL``) — call it; ``extension.ts`` only wires
   dialogs, the tool registration and session opening.

   **Shared module:**

   .. code-block:: typescript

      /** Throws Error("invalid actor name: <reason>") — REQ_ACTOR_CREATETOOL AC-5. */
      export function validateActorName(name: string): void;

      /** Same rules as validateActorName; returns the message for InputBox validateInput. */
      export function actorNameProblem(name: string): string | undefined;

      /** mkdir <actorsFolder>/<name>, write actor.yaml and context.md. Caller has checked non-existence. */
      export async function writeActorFiles(actorsFolder: string, a: {
          name: string; summary: string;
      }): Promise<string /* absolute Actor folder */>;

      /**
       * Rescans, then returns the folder that blocks creating `name`, or undefined:
       * <actorsFolder>/<name> when it exists on disk (with or without actor.yaml),
       * otherwise the folder of an Actor whose name is `name` (any resolveName
       * result other than 'unknown'; for 'ambiguous' the first match).
       */
      export async function existingActorFolder(actorsFolder: string, name: string,
          scanner: ActorScanner): Promise<string | undefined>;

   **File contents** (``REQ_ACTOR_CREATETOOL`` AC-2):

   .. code-block:: yaml

      name: "<name>"
      summary: "<summary or empty>"

   Both fields are always written; values are double-quoted with ``\``
   and ``"`` escaped (``yamlString``). ``context.md`` is ``# <name>\n\n``
   followed by ``<summary>\n`` when the summary is non-blank. The folder
   name is the verbatim ``name`` (``REQ_ACTOR_SCHEMA`` AC-6).

   **``jarvis.newActor`` flow** (``REQ_ACTOR_CREATE``):

   1. InputBox for the name with ``validateInput: actorNameProblem``;
      cancel → return (AC-1, AC-2, AC-8).
   2. Resolve the actors folder; none → show "no workspace" and return.
      ``existingActorFolder(actorsFolder, name, actorScanner)`` returns a
      folder → error notification
      ``Jarvis: An Actor named "<name>" already exists: <folder>``, return,
      nothing written (AC-3). The rescan inside the check catches an
      ``actor.yaml`` edited by hand since the last scan.
   3. Optional InputBox for the summary; Escape → ``""`` (AC-4).
   4. ``writeActorFiles(folder, { name, summary })`` (AC-5).
   5. ``ensureActorAgent({ name, folder })`` (``SPEC_ACTOR_WHOAMI``); no
      picker is shown, and a ``skipped`` result does not abort the creation
      (AC-6).
   6. ``await actorScanner.rescan()`` (AC-7).
   7. When ``jarvis.actors.openSessionOnCreate`` is ``true``, execute
      ``jarvis.openActorSession`` with the new Actor's node (AC-9).

   **package.json (core):**

   * ``contributes.commands``: ``jarvis.newActor`` (title "Jarvis: New
     Actor", icon ``$(add)``), hidden from the Command Palette; title-bar
     placement in ``SPEC_ACTOR_TREE``.
   * ``contributes.configuration`` (Actors group):
     ``jarvis.actors.openSessionOnCreate`` — ``boolean``, default ``true``,
     description: "Open the new Actor's chat right after creating it. Turn
     off to keep your current chat in focus, e.g. when creating several
     Actors in a row." (AC-10).

   **Acceptance Criteria:**

   * AC-1: Folder creation and all writes of ``actor.yaml`` and
     ``context.md`` happen only in ``actorCreation.ts``.
   * AC-2: The command and the tool produce byte-identical files for the
     same name and summary.
   * AC-3: An existing target folder, or an existing Actor with the same
     name in any folder, aborts the command before any write; both entry
     points decide this through ``existingActorFolder`` only.
   * AC-4: ``ensureActorAgent`` runs after the files exist, in both entry
     points; its result never aborts the creation.
   * AC-5: The session is opened only when
     ``jarvis.actors.openSessionOnCreate`` is ``true``.


.. spec:: jarvis_createActor Tool
   :id: SPEC_ACTOR_CREATETOOL
   :status: implemented
   :links: REQ_ACTOR_CREATETOOL; SPEC_ACTOR_CREATE; SPEC_ACTOR_WHOAMI; SPEC_ACTOR_OPENSESSION; SPEC_ENG_REGISTER_TOOL; SPEC_MSG_DUALREGISTRATION; SPEC_MSG_QUEUESTORE

   **Description:**
   ``jarvis_createActor`` is registered with ``engine.registerTool()``
   (LM and MCP, ``SPEC_ENG_REGISTER_TOOL``) whenever the actors folder is
   resolvable at activation; no feature setting gates it. Handler logic lives in ``actorCreation.ts``
   (``createActorHandler``) so LM and MCP share it.

   **Algorithm:**

   1. ``validateActorName(name)`` (AC-5).
   2. An ``agent`` input is ignored: it is neither validated nor written
      (``REQ_ACTOR_CREATETOOL`` AC-1).
   3. Resolve the actors folder; none → throw
      ``"jarvis_createActor: no workspace open"`` (AC-8).
   4. ``existingActorFolder(actorsFolder, name, actorScanner)`` returns a
      folder → return
      ``{ created: false, reason: 'actor "<name>" already exists; no action taken', path }``
      with ``path`` the workspace-relative returned folder, and do nothing
      else: no write, no enqueue, no session (AC-7).
   5. ``writeActorFiles(folder, { name, summary: summary ?? "" })``, then
      ``ensureActorAgent({ name, folder })`` (``SPEC_ACTOR_WHOAMI``,
      ``REQ_ACTOR_CREATETOOL`` AC-6).
   6. ``initialMessage`` → ``appendMessage(messagesPath, name, 'jarvis_createActor', initialMessage)``
      and reload the Messages view (AC-4).
   7. ``await actorScanner.rescan()`` (AC-3).
   8. When ``jarvis.actors.openSessionOnCreate`` is ``true``: execute
      ``jarvis.openActorSession``; a failure is logged at ``warn`` and does
      not fail the tool (AC-9).
   9. Return ``{ created: true, path }``; ``path`` is workspace-relative with
      forward slashes.

   **package.json ``languageModelTools``:**

   .. code-block:: json

      {
        "name": "jarvis_createActor",
        "displayName": "Create Actor",
        "toolReferenceName": "createActor",
        "canBeReferencedInPrompt": true,
        "icon": "$(add)",
        "modelDescription": "Creates a Jarvis Actor (actor.yaml and context.md) under the configured actors folder. Returns created: false without changes when an Actor with that name or folder already exists.",
        "inputSchema": {
          "type": "object",
          "required": ["name"],
          "properties": {
            "name":           { "type": "string", "description": "Actor name; used verbatim as the folder name." },
            "summary":        { "type": "string", "description": "Optional short description." },
            "initialMessage": { "type": "string", "description": "Optional first message queued for the new Actor." }
          }
        }
      }

   **Acceptance Criteria:**

   * AC-1: Error messages use the prefixes ``invalid actor name:`` and
     ``jarvis_createActor: no workspace open``.
   * AC-2: An existing folder, or an existing Actor with that name in any
     folder, yields ``created: false`` and no side effect, including no
     session opening.
   * AC-3: Files are written through ``writeActorFiles`` only.
   * AC-4: The tool is not gated by any feature setting.
   * AC-5: The input schema has no ``agent`` property; a caller that passes
     one anyway (e.g. through ``invokeTool``) is not rejected and the value
     has no effect.


.. spec:: jarvis_listActors Tool
   :id: SPEC_ACTOR_LISTTOOL
   :status: implemented
   :links: REQ_ACTOR_LISTTOOL; SPEC_ACTOR_SCANNER; SPEC_ENG_REGISTER_TOOL; SPEC_ENG_ACTORLIST

   **Description:**
   ``jarvis_listActors`` is registered with ``engine.registerTool()``
   whenever the actors folder is resolvable, with no feature gate. The
   handler (``createListActorsHandler`` in ``actorRuntime.ts``) returns the
   same projection as ``JarvisCoreApi.listActors()`` (``SPEC_ENG_ACTORLIST``).

   .. code-block:: typescript

      const actors = actorScanner.actors.map(a => ({
          name: a.name, summary: a.summary, agent: a.name, folder: a.folder, id: a.id,
      }));
      return JSON.stringify({ actors });

   ``agent`` is the Actor's own agent, identified by the Actor name
   (``SPEC_ACTOR_WHOAMI``), so it always equals ``name``.

   **package.json ``languageModelTools``:** name ``jarvis_listActors``,
   ``toolReferenceName`` ``listActors``, empty ``inputSchema``,
   ``modelDescription`` "Lists all Jarvis Actors (name, summary, agent,
   folder, id). Distinct from jarvis_listChatSessions, which lists VS Code
   chat tab titles."

   **Acceptance Criteria:**

   * AC-1: The response is ``{ "actors": [...] }`` with exactly the five
     fields per entry.
   * AC-2: Entries come from ``ActorScanner`` only.


.. spec:: Actor Identity via Own Agent
   :id: SPEC_ACTOR_WHOAMI
   :status: implemented
   :links: REQ_ACTOR_WHOAMI; REQ_ACTOR_BINDING; SPEC_ACTOR_AGENT_DISCOVERY; SPEC_ACTOR_SCANNER; SPEC_ACTOR_CREATE; SPEC_INJ_INJECT

   **Description:**
   ``engine/actors/actorAgent.ts`` owns the Actor's agent file. Its one
   function ``ensureActorAgent`` makes the file exist and carry the two
   Jarvis lines, and nothing else in Jarvis writes an agent file. The spec ID
   is kept for traceability from the former ``jarvis_whoAmI`` tool, which is
   removed together with its handler, its ``package.json`` contribution and
   the hook correlation buffer in ``extension.ts``. The agent body reaches
   every request of the session, so the Actor knows its name and the
   location of its ``context.md`` without a tool call and without hooks
   (``REQ_ACTOR_WHOAMI``).

   **Signature:**

   .. code-block:: typescript

      export type EnsureAgentResult =
          | { status: 'ready'; mode: string }   // mode = the Actor name
          | { status: 'skipped';
              reason: 'nameMismatch' | 'duplicateAgent' | 'noWorkspace' | 'writeFailed' };

      /**
       * Precondition: actor.name resolved to exactly one Actor, or the Actor
       * was just created. Never throws; a failure is logged and returned.
       */
      export async function ensureActorAgent(
          actor: { name: string; folder: string }
      ): Promise<EnsureAgentResult>;

   **Callers** (``REQ_ACTOR_WHOAMI`` AC-4), and only these:

   * ``injectPrompt`` step 1b (``SPEC_INJ_INJECT``). Every open of an Actor
     session, every delivery and the injection tool and command reach the
     Actor through ``injectPrompt``, so one call there covers
     ``jarvis.openActorSession``, ``jarvis.sendMessages`` and the
     auto-delivery poll loop.
   * ``jarvis.newActor`` (``SPEC_ACTOR_CREATE`` step 5).
   * ``createActorHandler`` for ``jarvis_createActor``
     (``SPEC_ACTOR_CREATETOOL`` step 5).

   **Algorithm:**

   1. Calls for the same Actor name are serialized: a second call waits for
      the first, so two deliveries to one Actor never write the file twice
      at the same time.
   2. The target folder is ``.github/agents/`` of the first workspace folder,
      the folder the actors folder is resolved against
      (``SPEC_CFG_PATHRESOLVER``). No workspace folder → ``skipped``
      (``noWorkspace``).
   3. ``discoverAgentModes()`` (``SPEC_ACTOR_AGENT_DISCOVERY``); the
      candidates are the entries whose identity equals the Actor name.

      * More than one → no file is touched; one warning notification
        naming the files; ``skipped`` (``duplicateAgent``).
      * Exactly one → step 4 on that file, whatever its file name is.
      * None → the target file is ``<Actor name>.agent.md``. When it
        already exists, it is not the Actor's agent (its ``name`` differs, or
        discovery skips it): no file is touched; one warning notification
        naming the file; ``skipped`` (``nameMismatch``). Otherwise step 5.
   4. **Restore the two lines.** Find the end of the front matter (the
      closing ``---`` line of a file that starts with ``---``; no front
      matter means the start of the file). Directly after it, line 1 is
      replaced when it starts with ``You act as Actor ``, otherwise
      inserted; the following line is replaced when it starts with
      ``Your context memory is ``, otherwise inserted. The line ending of
      the file (``\n`` or ``\r\n``) is kept. The file is written only when
      the result differs from the content read.
   5. **Create.** Create the folder when needed and write the file below.
      Then wait until VS Code has registered the mode command
      ``workbench.action.chat.open<Actor name>``, polling
      ``vscode.commands.getCommands(true)`` every 100 ms for at most 3 s,
      because VS Code learns of a new agent file asynchronously. On timeout
      the result is still ``ready``; ``reapplyAgentMode`` skips with a
      logged warning when the command is not registered yet
      (``SPEC_MSG_OPENCHAT``), and the next open applies the mode. A write
      error is logged and returns ``skipped`` (``writeFailed``).
   6. Return ``{ status: 'ready', mode: <Actor name> }``.

   **File content** (steps 4 and 5; ``<rel>`` is the workspace-relative path
   of ``<Actor folder>/context.md`` with forward slashes):

   .. code-block:: text

      ---
      name: "<Actor name>"
      ---
      You act as Actor <Actor name>
      Your context memory is <rel>. Read it and the files it links if you did not do that already or after a compaction.

   The front matter is written only when the file is created; ``name`` is
   double-quoted with ``\`` and ``"`` escaped (``yamlString``). An existing
   file keeps everything except the two recognised lines. Persona content is
   never written: the persona is referenced from ``context.md``
   (``REQ_ACTOR_WHOAMI`` AC-8).

   **Warnings:** a warning notification for a given file and reason is shown
   at most once per window session, because the check runs on every open and
   delivery and would otherwise repeat for every message. The text is
   ``Jarvis: <rel file> exists but is not the agent of Actor "<name>"; the
   Actor opens without its own agent.`` (``nameMismatch``) and
   ``Jarvis: Several agents are named "<name>": <files>; the Actor opens
   without its own agent.`` (``duplicateAgent``).

   **Removed with ``jarvis_whoAmI``:** the tool registration, its
   ``languageModelTools`` entry (``toolReferenceName`` ``whoAmI``), the
   ``PreToolUse`` correlation buffer and its freshness window. The delivered
   ``jarvis-actor.kernel.instructions.md`` (``SPEC_MOD_ACTORRULES``) has no
   identity section: the Actor's agent already carries its name and the
   path of its ``context.md``, so section ``## 0. Identity`` is removed.
   Sections ``## 1. Local Memory`` to ``## 4. Culture`` keep their numbers.
   The kernel no longer says what an Actor does when the two lines of
   its agent are missing.

   **Acceptance Criteria:**

   * AC-1: ``ensureActorAgent`` is the only function that creates or changes
     an Actor's agent file, and it has exactly the three callers above.
   * AC-2: An agent is found by its identity, not by its file name; when
     none carries the Actor name, ``<Actor name>.agent.md`` is created with
     ``name`` in its front matter.
   * AC-3: The two lines have the text above, are recognised by their fixed
     prefixes, and are restored when absent or different; nothing else in
     the file changes, and an unchanged file is not written.
   * AC-4: The check runs only at the three callers: not at extension
     startup and not in a rescan.
   * AC-5: A caller reaches it only after the Actor name resolved to exactly
     one Actor (``injectPrompt`` step 1) or after creation checked that no
     Actor of that name exists (``SPEC_ACTOR_CREATE`` step 2); an ambiguous
     name therefore never gets an agent created or changed.
   * AC-6: A file named ``<Actor name>.agent.md`` that is not the Actor's
     agent, or two agents with the Actor's name, leave every file unchanged,
     show one warning per file and reason and window session, and return
     ``skipped``.
   * AC-7: No agent file is ever deleted; the agent of a former name stays
     after a rename.
   * AC-8: ``jarvis_whoAmI`` is neither registered as Language Model or MCP
     tool nor contributed in ``package.json``, and the kernel instructions
     asset does not mention it.
   * AC-9: Concurrent calls for one Actor name are serialized.
   * AC-10: The kernel instructions asset has no identity section, and its
     remaining sections keep their numbers (``## 1.`` to ``## 4.``).




.. spec:: Agent Discovery
   :id: SPEC_ACTOR_AGENT_DISCOVERY
   :status: implemented
   :links: REQ_ACTOR_AGENT_DISCOVERY; REQ_ACTOR_FILES_TREE; SPEC_ACTOR_WHOAMI

   **Description:**
   ``engine/sessions/agentDiscovery.ts`` finds the agents of the workspace,
   so that an Actor's agent can be found by its name
   (``SPEC_ACTOR_WHOAMI``).

   .. code-block:: typescript

      export interface AgentModeEntry {
          name: string;      // identity
          filePath: string;  // workspace-relative, e.g. ".github/agents/syspilot.cm.agent.md"
      }
      export async function discoverAgentModes(): Promise<AgentModeEntry[]>;

   **Discovery:** ``readdir`` ``<folder>/.github/agents/`` of each
   workspace folder; take every file ending in ``.agent.md``
   (case-insensitive); skip files whose frontmatter contains
   ``user-invocable: false`` (default include, explicit opt-out). Identity
   is the trimmed frontmatter ``name`` when non-empty, else the file name
   without ``.agent.md``. An absent or unreadable directory contributes
   nothing. The result is sorted by identity. Frontmatter is read with line
   regexes; no YAML parser is involved. There is no cache: each call reads
   the directory (``REQ_ACTOR_AGENT_DISCOVERY`` AC-6).

   **Acceptance Criteria:**

   * AC-1: Discovery includes every ``*.agent.md`` without
     ``user-invocable: false`` and returns an empty list when the directory
     is missing.
   * AC-2: The identity rule is frontmatter ``name`` or file stem.
   * AC-3: No discovery result is cached across calls.
   * AC-4: The module offers no picker; ``pickAgentMode`` does not exist.


.. spec:: Open Actor Session Command
   :id: SPEC_ACTOR_OPENSESSION
   :status: approved
   :links: REQ_ACTOR_OPENSESSION; SPEC_INJ_INJECT; SPEC_ACTOR_TREE; SPEC_MSG_EDITORPLACEMENT

   **Description:**
   ``jarvis.openActorSession`` opens an Actor's chat. It owns no session
   logic: it resolves the Actor and delegates to ``injectPrompt`` with an
   empty payload and Main placement (``SPEC_INJ_INJECT``). The primitive
   focuses an existing session or spawns, mode-primes, renames and
   initializes a new one, then relocates it to column 1.

   .. code-block:: typescript

      vscode.commands.registerCommand('jarvis.openActorSession', async (node: ActorNode) => {
          const actor = actorScanner.getActor(node.id);
          if (!actor) { return; }
          await injectPrompt(actor.name, '', { placement: 'main' });
      });

   **package.json (core):** ``contributes.commands`` entry
   ``jarvis.openActorSession`` (title "Open"), hidden from the Command
   Palette. It is bound as the Actor node's click command
   (``SPEC_ACTOR_TREE``) and as the "Open" context-menu entry
   (``SPEC_ACTOR_CONTEXTMENU``).

   **Acceptance Criteria:**

   * AC-1: The handler calls ``injectPrompt(name, '', { placement: 'main' })``
     and nothing else that opens, renames or prompts a chat.
   * AC-2: An unknown node id is a silent no-op.


.. spec:: Actor Session Initialization Prompt
   :id: SPEC_ACTOR_INITPROMPT
   :status: implemented
   :links: REQ_ACTOR_INITPROMPT; SPEC_INJ_INJECT; SPEC_MSG_NOTIFICATION_RESOLVE; SPEC_ACTOR_WHOAMI

   **Description:**
   The init prompt is composed in exactly one place: the new-session branch
   of ``injectPrompt`` (``engine/sessions/injectPrompt.ts``,
   ``SPEC_INJ_INJECT``). No caller composes or sends it.

   .. code-block:: typescript

      const raw = vscode.workspace.getConfiguration('jarvis')
          .get<string>('agentSession.initPromptTemplate') ?? '';
      const template = raw.trim() ? raw : DEFAULT_INIT_PROMPT;         // AC-3
      const prompt = applyTemplate(template, {
          name: actor.name,
          contextPath: path.join(actor.folder, 'context.md'),            // absolute
      });
      await sendPromptToFocusedAgentChat(prompt);

   ``applyTemplate`` replaces ``${key}`` for known keys and leaves every
   other placeholder as-is, so an old template using ``${kind}`` shows it
   literally (``REQ_ACTOR_INITPROMPT`` AC-2).

   **``DEFAULT_INIT_PROMPT``** (single constant in ``injectPrompt.ts``,
   co-located with ``DEFAULT_NOTIFICATION``, ``SPEC_MSG_NOTIFICATION_RESOLVE``):

   .. code-block:: text

      You are the Actor "${name}".

      Use only `${contextPath}` as your persistent memory. Read it now.

      Keep it minimal and action-oriented:
      - Store only long-lived items under Decision / Finding / Next.
      - One concise line per bullet. Prune aggressively.
      - Replace outdated bullets — never append logs.
      - Never store retries, raw tool output, or transient chatter.
      - Before writing, ask: "Will this still matter in 2 weeks?" If no, skip.
      - When a topic grows past ~5 bullets, move it to a dedicated file beside `context.md` and leave a one-line summary with a relative link in `context.md`.

   **Mode priming** (``REQ_ACTOR_INITPROMPT`` AC-6, AC-7): when
   ``ensureActorAgent`` returned ``ready`` (``SPEC_INJ_INJECT`` step 1b), the
   new-session branch runs
   ``workbench.action.chat.open { mode: <Actor name> }`` and waits 300 ms
   before ``openNewChatEditor()``; a failure is logged and the default mode
   applies. With a ``skipped`` result no mode is passed.

   **package.json (core), Prompt Templates group:**
   ``jarvis.agentSession.initPromptTemplate`` — ``string``, scope
   ``window``, ``editPresentation: multilineText``, default = the text above.

   **Acceptance Criteria:**

   * AC-1: Only ``${name}`` and ``${contextPath}`` are substituted.
   * AC-2: A blank setting falls back to ``DEFAULT_INIT_PROMPT``.
   * AC-3: The prompt is sent only by the new-session branch of
     ``injectPrompt``; the unused option ``skipInitPrompt`` is removed from
     ``InjectPromptOptions``.
