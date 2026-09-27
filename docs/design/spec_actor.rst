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
   :status: approved
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
          agent: string;   // "" when absent
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
      empty; ``summary`` and ``agent`` fall back to ``""``
      (``REQ_ACTOR_TREE`` AC-3).
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
   (``SPEC_INJ_INJECT``), ``jarvis_whoAmI`` (``SPEC_ACTOR_WHOAMI``), the
   touched-files tracker and display (``SPEC_ACTOR_TOUCHEDFILES``), the
   activity tracker (``SPEC_ACTOR_ACTIVITY``), ``jarvis_sendMessage``
   (``SPEC_MSG_SENDMESSAGE``), ``JarvisCoreApi.sendMessage``
   (``SPEC_ENG_API``), the creation check (``SPEC_ACTOR_CREATE``: any
   result other than ``unknown`` blocks creation) and
   ``getValidDestinations()``. Among the ambiguous-name refusals, only a
   refused message send shows the user an error notification naming the
   name and its folders; activity, touched files, ``whoAmI``, prompt
   injection and Kanban owner resolution refuse silently
   (``REQ_ACTOR_SCHEMA`` AC-7). Creation's own "already exists" notification
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


.. spec:: Actor Schema
   :id: SPEC_ACTOR_SCHEMA
   :status: approved
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
          "agent":   { "type": "string", "description": "Agent identity (SPEC_ACTOR_AGENT_DISCOVERY); \"\" = no agent." }
        }
      }

   .. code-block:: json

      { "fileMatch": "actor.yaml", "url": "./schemas/actor.schema.json" }

   **Acceptance Criteria:**

   * AC-1: The schema requires ``name``, allows ``summary`` and ``agent``,
     and sets ``additionalProperties: false``.
   * AC-2: ``actor.yaml`` is the only YAML file core binds to a schema;
     ``resolveJarvisYamlSchema()`` returns ``undefined`` for every other
     basename.


.. spec:: ACTORS Tree Provider
   :id: SPEC_ACTOR_TREE
   :status: approved
   :links: REQ_ACTOR_TREE; REQ_EXP_TREEVIEW; SPEC_ACTOR_SCANNER; SPEC_ACTOR_FILES; SPEC_ACTOR_TOUCHEDFILES; SPEC_ACTOR_ACTIVITY; SPEC_ACTOR_OPENSESSION

   **Description:**
   ``ActorTreeProvider`` (``engine/actors/actorTreeProvider.ts``) is the
   ``TreeDataProvider`` of the ``jarvisActors`` view. It renders Actor nodes
   from ``ActorScanner`` and delegates their children to the file-children
   and touched-files logic (``SPEC_ACTOR_FILES``,
   ``SPEC_ACTOR_TOUCHEDFILES``). It sets the activity icon itself
   (``SPEC_ACTOR_ACTIVITY``).

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
      if (actor && activity.isActive(actor.name)) {
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
   :status: approved
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
          if (await resolveAgentFile(actor.agent)) {
              nodes.push({ kind: 'actorFileCategory', category: 'agent', actorId: actor.id });
          }
          nodes.push({ kind: 'actorFileCategory', category: 'files', actorId: actor.id });
          // "touched" category: SPEC_ACTOR_TOUCHEDFILES
          return nodes;
      }

   ``resolveAgentFile(agent)`` returns the absolute path of the
   ``*.agent.md`` whose identity equals ``agent``, using
   ``discoverAgentModes()`` (``SPEC_ACTOR_AGENT_DISCOVERY``). It returns
   ``undefined`` for an empty or unresolved ``agent``; the category is then
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

   * AC-1: An Actor node's children are "Agent" (only when the agent
     resolves to an existing file) followed by "Files"; the touched-files
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
   * AC-4: The indicator is set by ``ActorTreeProvider`` alone; no decorator
     API exists.


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
   :status: approved
   :links: REQ_ACTOR_CREATE; REQ_ACTOR_CREATETOOL; REQ_ACTOR_SCHEMA; SPEC_ACTOR_SCANNER; SPEC_ACTOR_AGENT_DISCOVERY; SPEC_ACTOR_OPENSESSION

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
          name: string; summary: string; agent: string;
      }): Promise<string /* absolute Actor folder */>;

      /** Rewrites only the agent field of an existing actor.yaml. */
      export async function writeActorAgent(actorFolder: string, a: {
          name: string; summary: string; agent: string;
      }): Promise<void>;

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
      agent: "<agent or empty>"

   All three fields are always written; values are double-quoted with ``\``
   and ``"`` escaped (``yamlString``). ``context.md`` is ``# <name>\n\n``
   followed by ``<summary>\n`` when the summary is non-blank. The folder
   name is the verbatim ``name`` (``REQ_ACTOR_SCHEMA`` AC-6).

   **``jarvis.newActor`` flow** (``REQ_ACTOR_CREATE``):

   1. QuickPick "New Entry" with the single item "Create Actor"; cancel →
      return (AC-1, AC-8).
   2. InputBox for the name with ``validateInput: actorNameProblem``;
      cancel → return (AC-2, AC-8).
   3. Resolve the actors folder; none → show "no workspace" and return.
      ``existingActorFolder(actorsFolder, name, actorScanner)`` returns a
      folder → error notification
      ``Jarvis: An Actor named "<name>" already exists: <folder>``, return,
      nothing written (AC-3). The rescan inside the check catches an
      ``actor.yaml`` edited by hand since the last scan.
   4. Optional InputBox for the summary; Escape → ``""`` (AC-4).
   5. ``writeActorFiles(folder, { name, summary, agent: "" })`` (AC-5).
   6. ``pickAgentMode()`` (``SPEC_ACTOR_AGENT_DISCOVERY``); a selection is
      written with ``writeActorAgent``; "No agent" or Escape keeps ``""``
      (AC-6).
   7. ``await actorScanner.rescan()`` (AC-7).
   8. When ``jarvis.actors.openSessionOnCreate`` is ``true``, execute
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
     same name, summary and agent.
   * AC-3: An existing target folder, or an existing Actor with the same
     name in any folder, aborts the command before any write; both entry
     points decide this through ``existingActorFolder`` only.
   * AC-4: The agent picker runs after the files exist; its result never
     aborts the creation.
   * AC-5: The session is opened only when
     ``jarvis.actors.openSessionOnCreate`` is ``true``.


.. spec:: jarvis_createActor Tool
   :id: SPEC_ACTOR_CREATETOOL
   :status: approved
   :links: REQ_ACTOR_CREATETOOL; SPEC_ACTOR_CREATE; SPEC_ACTOR_AGENT_DISCOVERY; SPEC_ACTOR_OPENSESSION; SPEC_ENG_REGISTER_TOOL; SPEC_MSG_DUALREGISTRATION; SPEC_MSG_QUEUESTORE

   **Description:**
   ``jarvis_createActor`` is registered with ``engine.registerTool()``
   (LM and MCP, ``SPEC_ENG_REGISTER_TOOL``) whenever the actors folder is
   resolvable at activation; no feature setting gates it. Handler logic lives in ``actorCreation.ts``
   (``createActorHandler``) so LM and MCP share it.

   **Algorithm:**

   1. ``validateActorName(name)`` (AC-5).
   2. If ``agent`` is non-blank: compare it with the identities from
      ``discoverAgentModes()``; unknown → throw
      ``Agent "<agent>" is not available.\nAvailable agents: <sorted names | (none)>``
      (AC-6).
   3. Resolve the actors folder; none → throw
      ``"jarvis_createActor: no workspace open"`` (AC-8).
   4. ``existingActorFolder(actorsFolder, name, actorScanner)`` returns a
      folder → return
      ``{ created: false, reason: 'actor "<name>" already exists; no action taken', path }``
      with ``path`` the workspace-relative returned folder, and do nothing
      else: no write, no enqueue, no session (AC-7).
   5. ``writeActorFiles(folder, { name, summary: summary ?? "", agent: agent ?? "" })``.
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
            "agent":          { "type": "string", "description": "Optional agent identity to bind." },
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


.. spec:: jarvis_listActors Tool
   :id: SPEC_ACTOR_LISTTOOL
   :status: approved
   :links: REQ_ACTOR_LISTTOOL; SPEC_ACTOR_SCANNER; SPEC_ENG_REGISTER_TOOL; SPEC_ENG_ACTORLIST

   **Description:**
   ``jarvis_listActors`` is registered with ``engine.registerTool()``
   whenever the actors folder is resolvable, with no feature gate. The
   handler (``createListActorsHandler`` in ``actorRuntime.ts``) returns the
   same projection as ``JarvisCoreApi.listActors()`` (``SPEC_ENG_ACTORLIST``).

   .. code-block:: typescript

      const actors = actorScanner.actors.map(a => ({
          name: a.name, summary: a.summary, agent: a.agent, folder: a.folder, id: a.id,
      }));
      return JSON.stringify({ actors });

   **package.json ``languageModelTools``:** name ``jarvis_listActors``,
   ``toolReferenceName`` ``listActors``, empty ``inputSchema``,
   ``modelDescription`` "Lists all Jarvis Actors (name, summary, agent,
   folder, id). Distinct from jarvis_listChatSessions, which lists VS Code
   chat tab titles."

   **Acceptance Criteria:**

   * AC-1: The response is ``{ "actors": [...] }`` with exactly the five
     fields per entry.
   * AC-2: Entries come from ``ActorScanner`` only.


.. spec:: jarvis_whoAmI Tool
   :id: SPEC_ACTOR_WHOAMI
   :status: approved
   :links: REQ_ACTOR_WHOAMI; REQ_ACTOR_BINDING; SPEC_ACTOR_SCANNER; SPEC_HOOK_ROUTE; SPEC_HOOK_INTAKE; SPEC_ENG_REGISTER_TOOL

   **Description:**
   ``jarvis_whoAmI`` is registered with ``engine.registerTool()`` whenever
   the actors folder is resolvable, with no feature gate. It identifies the
   calling session from that session's own hook ``session_id`` and never
   from editor focus.

   **Why a correlation buffer:** ``LanguageModelToolInvocationOptions``
   carries no session identity. The ``session_id`` arrives on the
   invocation's own ``PreToolUse`` hook event, which ``SPEC_HOOK_INTAKE``
   dispatches before the tool handler runs. The handler reads it from a
   buffer filled by a ``PreToolUse`` subscriber. Focus is not a fallback:
   it moves independently of the executing session and gives confidently
   wrong answers (``REQ_ACTOR_WHOAMI`` AC-4, AC-7).

   **Buffer rules:**

   1. Capture only ``PreToolUse`` events whose ``payload.tool_name`` ends
      with ``jarvis_whoAmI`` (bare or transport-prefixed) and that carry a
      ``sessionId``.
   2. The handler drains the buffer; an entry serves at most one call.
   3. Entries older than a freshness window (10 s) are discarded.
   4. Fresh entries with more than one distinct ``session_id`` are
      ambiguous; none is picked. Several sessions calling ``whoAmI`` close
      together are normal in a multi-actor workspace.
   5. No fresh entry is an absence; there is no second source.

   **Algorithm:**

   1. ``takeCallingSessionId()``; ``undefined`` → error.
   2. ``getEntityNameForSessionId(id)``; unresolved → error.
   3. ``actorScanner.resolveName(title)``: ``unknown`` or ``ambiguous`` →
      error (``REQ_ACTOR_WHOAMI`` AC-8).
   4. Return ``{ name, contextPath: path.join(folder, 'context.md'), id }``
      (AC-2).

   Every failure returns the same result:
   ``{ "error": "Unable to determine your identity automatically (hooks disabled or unavailable). Please confirm your identity with the user." }``.
   The distinguishing cause goes to the log only. This replaces today's
   separate collision message that lists the colliding paths: the remedy is
   the same in every case, and ``REQ_ACTOR_WHOAMI`` AC-8 asks for the AC-3
   error.

   **Known limitation:** with hook intake off (``SPEC_HOOK_AUTOINST``) the
   buffer stays empty and the tool always returns the error. A tool that
   reliably says "ask the user" is safe; one that sometimes guesses is not.

   **package.json ``languageModelTools``:** name ``jarvis_whoAmI``,
   ``toolReferenceName`` ``whoAmI``, icon ``$(account)``, empty
   ``inputSchema``.

   **Acceptance Criteria:**

   * AC-1: The handler reads no editor-focus API.
   * AC-2: Buffer entries are filtered at capture, consumed on read and
     expire after the freshness window; disagreeing entries are an error.
   * AC-3: Name resolution uses ``resolveName`` and fails unless the result
     is ``found``.
   * AC-4: All failures return the single error text above.


.. spec:: Agent Discovery and Picker
   :id: SPEC_ACTOR_AGENT_DISCOVERY
   :status: approved
   :links: REQ_ACTOR_AGENT_DISCOVERY; REQ_ACTOR_CREATE; REQ_ACTOR_CREATETOOL; REQ_ACTOR_FILES_TREE

   **Description:**
   ``engine/sessions/agentDiscovery.ts`` finds the agents an Actor can be
   bound to and offers the picker used by ``jarvis.newActor``.

   .. code-block:: typescript

      export interface AgentModeEntry {
          name: string;      // identity
          filePath: string;  // workspace-relative, e.g. ".github/agents/syspilot.cm.agent.md"
      }
      export async function discoverAgentModes(): Promise<AgentModeEntry[]>;
      export async function pickAgentMode(): Promise<string | undefined>;

   **Discovery:** ``readdir`` ``<folder>/.github/agents/`` of each
   workspace folder; take every file ending in ``.agent.md``
   (case-insensitive); skip files whose frontmatter contains
   ``user-invocable: false`` (default include, explicit opt-out). Identity
   is the trimmed frontmatter ``name`` when non-empty, else the file name
   without ``.agent.md``. An absent or unreadable directory contributes
   nothing. The result is sorted by identity. Frontmatter is read with line
   regexes; no YAML parser is involved. There is no cache: each call reads
   the directory (``REQ_ACTOR_AGENT_DISCOVERY`` AC-6).

   **Picker:** a QuickPick with "No agent" first (detail "Opens a default
   chat — pick mode via the chat dropdown"), then one item per discovered
   agent (label = identity, description = ``filePath``). It returns
   ``undefined`` on Escape, ``""`` for "No agent", otherwise the identity.
   ``jarvis.newActor`` treats ``undefined`` like ``""``
   (``REQ_ACTOR_CREATE`` AC-6). The picker is shown only by
   ``jarvis.newActor``; the tool validates against ``discoverAgentModes()``
   without a picker.

   **Acceptance Criteria:**

   * AC-1: Discovery includes every ``*.agent.md`` without
     ``user-invocable: false`` and returns an empty list when the directory
     is missing.
   * AC-2: The identity rule is frontmatter ``name`` or file stem.
   * AC-3: No discovery result is cached across calls.
   * AC-4: The picker's first entry is "No agent" and returns ``""``.


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
   :status: approved
   :links: REQ_ACTOR_INITPROMPT; SPEC_INJ_INJECT; SPEC_MSG_NOTIFICATION_RESOLVE

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

   **Mode priming** (``REQ_ACTOR_INITPROMPT`` AC-6, AC-7): when the Actor's
   ``agent`` is non-empty, the new-session branch runs
   ``workbench.action.chat.open { mode: agent }`` and waits 300 ms before
   ``openNewChatEditor()``; a failure is logged and the default mode
   applies.

   **package.json (core), Prompt Templates group:**
   ``jarvis.agentSession.initPromptTemplate`` — ``string``, scope
   ``window``, ``editPresentation: multilineText``, default = the text above.

   **Acceptance Criteria:**

   * AC-1: Only ``${name}`` and ``${contextPath}`` are substituted.
   * AC-2: A blank setting falls back to ``DEFAULT_INIT_PROMPT``.
   * AC-3: The prompt is sent only by the new-session branch of
     ``injectPrompt``; the unused option ``skipInitPrompt`` is removed from
     ``InjectPromptOptions``.
