Actor Design Specifications
============================

.. spec:: sessions-feature: SessionTreeProvider Module
   :id: SPEC_ACT_TREE
   :status: implemented
   :links: REQ_ACT_TREE; REQ_ACT_OPENCONTEXT; SPEC_ENT_ENTITY_FILE_CHILDREN

   **Description:**
   New module ``src/sessionTreeProvider.ts`` — a slimmed clone of
   ``src/projectTreeProvider.ts``. It consumes ``YamlScanner.getSessionTree()``
   and renders session leaf nodes.

   **(actor-terminology-rename CR amendment, Phase 1):** The ``package.json``
   contribution for this view uses the user-visible display name ``"Actors"``
   (not "Sessions") per ``REQ_ACT_TREE`` AC-7. The internal view ID
   (``jarvisSessions``), module filename, class name, and storage paths were
   unchanged in Phase 1 — only the human-facing label in the sidebar/activity
   bar was updated. Command title for ``jarvis.newSession`` was updated per
   AC-8 to ``"Jarvis: New Actor"``. The settings-group title is ``"Actors"``
   per AC-9.

   **(actor-internal-identifiers-rename CR amendment, Phase 1b):** the
   internal view ID left unchanged by Phase 1 is now renamed:
   ``jarvisSessions`` → ``jarvisActors`` (``REQ_ACT_TREE`` AC-10); the command
   ID ``jarvis.newSession`` → ``jarvis.newActor`` (AC-11). The entity
   ``kind`` string (``'session'``)/``contextValue`` (``jarvisSession``) are
   explicitly **not** renamed in this CR — see AC-10's rationale.
   **Bug fix (AC-13):** ``jarvis.openAgentSession``'s title, incorrectly
   changed to "Jarvis: Open Actor Chat" by Phase 1 (that command is shared by
   Project/Event/Actor, not Actor-specific — see ``REQ_ENT_AGENTSESSION``),
   is corrected here to the entity-neutral ``"Jarvis: Open Agent Chat"``; its
   command ID is unchanged.

   **Class removed, not renamed (AC-12, corrected during design):** the
   ``SessionTreeProvider`` class shown in the "Skeleton" below (and the
   module it lived in, ``src/apps/session/sessionTreeProvider.ts``) is
   **removed entirely** by this CR, along with its sole consumer
   ``src/tests/sessionTreeEquivalence.test.ts``. Impact analysis found this
   class was never wired into the running extension — the real, live Actor
   tree provider is produced by the generic
   ``engine.treeFactory.getProvider('session')`` (the same
   ``EntityKindConfig``-driven factory used for Project/Event). This class
   was a deliberately-kept "legacy reference implementation" retained solely
   so the now-also-removed equivalence test could prove the generic factory
   behaves like the original hand-written provider — a one-time migration
   proof whose job is done (Project/Event already have their own
   ``projectTreeExpectation.test.ts``/``eventTreeExpectation.test.ts``
   replacing their own equivalent legacy classes/tests the same way).
   Renaming dead code would have been misleading; removal is correct.

   **View registration retired into unified tree (unified-entity-tree CR,
   AC-14):** the ``createTreeView('jarvisActors', ...)`` call in
   ``packages/core/src/extension.ts`` (shown in AC-14's rationale) is removed;
   ``engine.treeFactory.getProvider('session')`` is instead wrapped by the new
   unified-tree provider registered as ``jarvisEntities`` — see
   ``SPEC_EXP_UNIFIEDTREE``. ``sessionKindConfig`` (``kind: 'session'``,
   ``viewId``) itself is unchanged; ``viewId: 'jarvisActors'`` on the config
   object becomes informational only (no longer used to create a standalone
   view) since the unified wrapper now owns view creation.

   **Skeleton (HISTORICAL — this module/class no longer exists, removed by
   actor-internal-identifiers-rename; kept below only as a description of
   what the generic factory replaced):**

   .. note::

      The ``item.command`` binding shown below is superseded by
      ``SPEC_ACT_TREECLICK`` for ``jarvisSession`` items: the primary action is
      now ``jarvis.openAgentSession`` (open the agent chat), and ``context.md``
      access moves to an inline-icon menu entry. See ``SPEC_ACT_TREECLICK`` for
      the current assignment.

   .. note::

      The ``vscode.TreeItemCollapsibleState.None`` shown below is superseded
      by ``SPEC_ENT_ENTITY_FILE_CHILDREN``: session leaf nodes become
      expandable (``Collapsed``) to show file children. See
      ``SPEC_ENT_ENTITY_FILE_CHILDREN`` for the current assignment.

   .. code-block:: typescript

      // Implementation: SPEC_ACT_TREE (HISTORICAL — file/class removed,
      // actor-internal-identifiers-rename CR)
      // Requirements: REQ_ACT_TREE

      import * as path from 'path';
      import * as vscode from 'vscode';
      import { YamlScanner, TreeNode, FolderNode } from './yamlScanner';

      export class SessionTreeProvider
          implements vscode.TreeDataProvider<TreeNode> {

          private _onDidChangeTreeData = new vscode.EventEmitter<void>();
          readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

          private _scanner: YamlScanner;

          constructor(scanner: YamlScanner) {
              this._scanner = scanner;
          }

          refresh(): void {
              this._onDidChangeTreeData.fire();
          }

          getTreeItem(element: TreeNode): vscode.TreeItem {
              if (element.kind === 'folder') {
                  const item = new vscode.TreeItem(
                      element.name,
                      vscode.TreeItemCollapsibleState.Collapsed
                  );
                  item.contextValue = 'jarvisFolder';
                  return item;
              }
              // LeafNode — session entity
              const entity = this._scanner.getEntity(element.id);
              const name = entity?.name ?? path.basename(path.dirname(element.id));
              const item = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.None);
              item.tooltip = entity?.summary ?? '';
              item.contextValue = 'jarvisSession';
              item.command = {
                  command: 'jarvis.openContext',
                  title: 'Open Context',
                  arguments: [{ path: path.dirname(element.id) }]
              };
              return item;
          }

          getChildren(element?: TreeNode): TreeNode[] {
              if (!element) {
                  return this._scanner.getSessionTree();
              }
              if (element.kind === 'folder') {
                  return (element as FolderNode).children;
              }
              return [];
          }

          getParent(element: TreeNode): TreeNode | undefined {
              // Required for TreeView.reveal(); full parent tracking
              // is a follow-up; returning undefined is safe for display.
              return undefined;
          }
      }

   **Notes:**

   * No filter state (no hidden-folders UI) in this CR.
   * The ``command`` on leaf nodes reuses ``jarvis.openContext`` — no new
     command is needed. **Historical, superseded twice since:** first by
     ``SPEC_ACT_TREECLICK`` (leaf-node command rebound to
     ``jarvis.openAgentSession``), then ``jarvis.openContext`` itself was
     fully retired (``SPEC_ENT_OPENCONTEXT_CMD``, entity-tree-context-menu
     CR) — neither the command nor this binding exist any more.
   * ``SessionTreeProvider`` (HISTORICAL) used to be a candidate for
     registration in ``extension.ts`` inside the ``if (sessions.enabled)``
     block, but in the actual shipped implementation that block instead
     registers via ``engine.registerEntityKind()`` + ``engine.treeFactory.
     getProvider('session')`` — this class was never the live registration
     path (see the class-removal note above).
   * **Design rationale (REQ_ACT_OPENCONTEXT, historical):** No change to
     ``jarvis.openContext`` was needed at the time because both project and
     session tree nodes passed ``{ folder: <dir> }`` as the command
     argument — moot now that the command is retired.


.. spec:: Dual-Path Actor Storage Convention Scanner
   :id: SPEC_ACT_DUALPATH_SCANNER
   :status: draft
   :links: REQ_ACT_DUALPATH_SCANNER; SPEC_CFG_PATHRESOLVER

   **Description:**
   Extends ``KindDrivenScanner`` (``packages/core/src/engine/sessions/
   yamlScanner.ts``) and ``EntityKindConfig`` (``packages/core/src/engine/
   core/types.ts``) with an optional **additional scan roots** mechanism,
   used exclusively by the session/actor kind's config to add the new
   ``.jarvis/actors/*/actor.yaml`` convention alongside the existing
   ``.jarvis/sessions/*/session.yaml`` primary root, without changing the
   generic engine's single-root contract for Project/Event (they simply
   never set this new optional field).

   **``EntityKindConfig`` addition (``types.ts``):**

   .. code-block:: typescript

      export interface EntityKindConfig {
          kind: string;
          viewId: string;
          folderSettingKey: string;
          label(name: string, entity?: { data: Record<string, unknown> }): string;
          // ...existing optional hooks unchanged...

          /**
           * Additional (folderSettingKey, conventionFile) roots scanned and
           * merged into this kind's tree/entities, alongside the primary
           * (folderSettingKey, `${kind}.yaml`) root. Optional; unused by
           * Project/Event. Used by the session/actor kind
           * (actor-dualpath-scanner CR) to add the `.jarvis/actors/`/
           * `actor.yaml` convention without touching the primary
           * `.jarvis/sessions/`/`session.yaml` root.
           */
          additionalScanRoots?: { folderSettingKey: string; conventionFile: string }[];
      }

   **``KindDrivenScanner`` changes (``yamlScanner.ts``):**

   .. code-block:: typescript

      export interface KindScanConfig {
          kind: string;
          folderSettingKey: string;
          conventionFile: string;
          additionalScanRoots?: { folderSettingKey: string; conventionFile: string }[];
      }

      addKind(config: EntityKindConfig): void {
          const conventionFile = `${config.kind}.yaml`;
          this._kinds.set(config.kind, {
              kind: config.kind,
              folderSettingKey: config.folderSettingKey,
              conventionFile,
              additionalScanRoots: config.additionalScanRoots,
          });
          this._trees.set(config.kind, []);
          this.rescan();
      }

      async rescan(): Promise<void> {
          let changed = false;
          const newEntities = new Map<string, EntityEntry>();

          for (const [kind, scanConfig] of this._kinds) {
              // Primary root (unchanged behavior for Project/Event; also the
              // existing .jarvis/sessions/ root for session/actor)
              const folder = this._folderResolver(scanConfig.folderSettingKey);
              let newTree = await this._buildTree(folder, newEntities, scanConfig.conventionFile, kind as 'project' | 'event' | 'session');

              // Additional roots (actor-dualpath-scanner CR) — merge in place
              for (const root of scanConfig.additionalScanRoots ?? []) {
                  const altFolder = this._folderResolver(root.folderSettingKey);
                  const altTree = await this._buildTree(altFolder, newEntities, root.conventionFile, kind as 'project' | 'event' | 'session');
                  newTree = this._mergeSortedTrees(newTree, altTree);
              }

              const oldTree = this._trees.get(kind) ?? [];
              if (!treesEqual(newTree, oldTree)) {
                  this._trees.set(kind, newTree);
                  changed = true;
              }
          }

          // ...entity-diff check + _onCacheChanged() unchanged...
      }

      /**
       * Merges two already-name-sorted node lists (each independently
       * produced by _buildTree, which sorts its own root's nodes) into one
       * combined, still name-sorted list — a simple sorted-merge, not a
       * concatenate-then-resort, to avoid re-deriving each node's sort key.
       * Folder nodes with the same display name from different roots are
       * NOT merged into one folder — they appear as two sibling folder
       * nodes with that name (REQ_ACT_DUALPATH_SCANNER AC-7, accepted
       * cosmetic edge case).
       */
      private _mergeSortedTrees(a: TreeNode[], b: TreeNode[]): TreeNode[] {
          const keyOf = (n: TreeNode) => n.kind === 'folder' ? n.name.toLowerCase() : (this._entities.get(n.id)?.name?.toLowerCase() ?? '');
          const merged: TreeNode[] = [];
          let i = 0, j = 0;
          while (i < a.length && j < b.length) {
              merged.push(keyOf(a[i]).localeCompare(keyOf(b[j])) <= 0 ? a[i++] : b[j++]);
          }
          return merged.concat(a.slice(i), b.slice(j));
      }

   **``extension.ts`` wiring — session/actor kind config gains the new root:**

   .. code-block:: typescript

      const sessionKindConfig: EntityKindConfig = {
          kind: 'session',
          viewId: 'jarvisActors',
          folderSettingKey: 'jarvis.sessions.folder',   // primary (legacy) root — unchanged
          label: (name: string) => name,
          additionalScanRoots: [
              { folderSettingKey: 'jarvis.actors.folder', conventionFile: 'actor.yaml' }
          ],
      };

   The shared folder-resolver callback (already present in ``extension.ts``,
   used for ``folderSettingKey`` lookups) gains one new case:

   .. code-block:: typescript

      if (settingKey === 'jarvis.actors.folder') {
          return configPaths.getActorsDir() ?? '';
      }

   **Design notes:**

   * ``kind`` and ``contextValue`` are unaffected by which root an entity
     came from — ``_buildTree`` is called with the same ``kind`` string
     (``'session'``) for both roots, so downstream tree-rendering code
     (``GenericTreeDataProvider``) treats all Actor entities identically
     regardless of source convention, satisfying ``REQ_ACT_DUALPATH_SCANNER``
     AC-2's "no visible distinction" requirement.
   * No new persisted state, no new setting for enabling/disabling the
     additional root — the second convention is always scanned whenever
     the session/actor kind itself is enabled (``jarvis.sessions.enabled``).
     No new ``jarvis.actors.folder`` *user-facing* setting is introduced
     either — like ``jarvis.sessions.folder``, it resolves to a fixed path
     (``<workspaceRoot>/.jarvis/actors/``) with no override, mirroring the
     existing session convention's "no folder setting" pattern
     (``US_ACT_ACTORS`` AC-1).
   * Entity-map merging is automatic and collision-free: both calls to
     ``_buildTree`` share the same ``newEntities`` map instance, and entity
     IDs are the convention file's absolute path — since the two roots live
     under different parent directories with different filenames, no two
     entities from different roots can ever produce the same ID
     (``REQ_ACT_DUALPATH_SCANNER`` AC-3).
   * Project and Event kinds never populate ``additionalScanRoots``, so
     ``rescan()``'s new loop body (``for (const root of scanConfig.
     additionalScanRoots ?? [])``) is a no-op for them — zero behavior
     change to their scanning.


.. spec:: sessions-feature: newEntity Command — Session Branch
   :id: SPEC_ACT_NEWENTITY
   :status: draft
   :links: REQ_ACT_NEWENTITY; SPEC_ACT_DUALPATH_SCANNER

   **(actor-internal-identifiers-rename CR amendment):** the command ID
   ``jarvis.newSession`` referenced throughout this spec is renamed to
   ``jarvis.newActor`` (``REQ_ACT_TREE`` AC-11). The handler function name
   (``newSessionCommand``), file location, and all internal logic below are
   otherwise unchanged — only the string passed to
   ``vscode.commands.registerCommand``/``executeCommand`` and the matching
   ``package.json`` ``command`` fields change. Wherever this spec's prose
   below says ```jarvis.newSession```, read it as the (unchanged-behavior)
   predecessor of the now-current ``jarvis.newActor``.

   **(actor-dualpath-scanner CR amendment):** steps 1 and 7 below are
   rewritten — this command now writes new Actors under the new storage
   convention (``configPaths.ensureActorsDir()`` / ``actor.yaml``,
   ``SPEC_CFG_PATHRESOLVER``/``SPEC_ACT_DUALPATH_SCANNER``) instead of the
   old ``ensureSessionsDir()``/``session.yaml`` pair. This command never
   writes a new ``session.yaml`` going forward; old-convention Actors
   elsewhere in the workspace are entirely unaffected.

   **Description:**
   Two commands implement session creation. ``jarvis.newSession`` is the actual
   implementation; ``jarvis.newEntity`` is a unified QuickPick that delegates to it.

   **``jarvis.newSession`` command** (``src/extension.ts`` newSessionCommand):

   1. Call ``configPaths.ensureActorsDir()`` (was ``ensureSessionsDir()`` —
      changed by ``actor-dualpath-scanner``) to get the fixed actors path
      (``<workspaceRoot>/.jarvis/actors/``), creating the directory if absent.
   2. If the return value is ``undefined`` (no workspace open) → show
      ``vscode.window.showWarningMessage('Jarvis: No workspace open.')`` and abort.
   3. Prompt for ``name`` (required, non-empty). Abort if the user cancels or
      provides an empty string.
   4. Prompt for ``summary`` (optional). Empty string is valid.
   5. Validate the ``name`` via the showInputBox ``validateInput`` callback
      (real-time inline validation).  The validator rejects any of:
      empty/whitespace-only; ``.`` or ``..``; characters
      ``/ \ : * ? " < > |``; null byte (``\0``) or ASCII control characters
      U+0000–U+001F; case-insensitive reserved Windows device names
      (``CON``, ``PRN``, ``AUX``, ``NUL``, ``COM1``–``COM9``,
      ``LPT1``–``LPT9``) — enforced on all platforms for portability.  On
      rejection, the inline error message is shown in the InputBox and the OK
      button is disabled until the user enters a valid name; pressing Escape
      cancels creation.  Do NOT silently sanitize and do NOT show a separate
      ``showErrorMessage`` notification.
   6. Construct ``<ensureActorsDir()>/<name>/`` (was ``<ensureSessionsDir()>/
      <name>/`` — changed by ``actor-dualpath-scanner``; ``name`` used
      verbatim — no transformation).
   7. Write ``actor.yaml`` (was ``session.yaml`` — changed by
      ``actor-dualpath-scanner``)::

         name: <name>
         summary: <summary>

   8. Write ``context.md``::

          # <name>

          <summary>

   9. Call ``scanner.rescan()`` so the new session appears in the tree
      immediately (no window reload required).
   10. Open the chat editor using the consolidated chat-open primitive
       (per ``SPEC_ENT_AGENT_PICKER`` Chat-Open Primitive). Cancel path is
       handled by the early-return guard after ``pickAgentMode()``, so this
       code is only reached for ``""`` or a concrete agent::

          // Mode-prime (only for concrete agent)
          if (agentInput) {
              try {
                  await vscode.commands.executeCommand(
                      'workbench.action.chat.open', { mode: agentInput }
                  );
                  await new Promise(resolve => setTimeout(resolve, 300));
              } catch (err) {
                  log.warn(`Mode-prime failed: ${err}`);
              }
          }
          // Editor creation (always) — SPEC_MSG_OPENCHAT
          await openNewChatEditor();

   .. note::

      (``project-actor-click-placement-fix`` CR) This creation flow funnels
      through the same shared ``openChatForEntity()`` helper as
      ``jarvis.openAgentSession``'s fresh-session-creation branch
      (``SPEC_ENT_AGENTSESSION``) — it automatically gains that helper's
      guaranteed Main-placement relocate step (rename + init-prompt, then
      ``lookupSessionUUID`` + ``openAtMain``) with no separate change needed
      here.

   **``jarvis.newEntity`` Session branch** (``src/extension.ts`` newEntityCommand):

   When the user selects **Session** in the QuickPick, the handler immediately
   delegates to ``jarvis.newSession`` via
   ``vscode.commands.executeCommand('jarvis.newSession')``. No duplicate creation
   logic exists in the ``newEntity`` handler.

   **Notes:**

   * The ``Session`` QuickPick option is only offered when
     ``jarvis.sessions.enabled`` is ``true``.
   * ``SessionTreeProvider.getParent()`` returns ``undefined`` in this CR,
     so ``TreeView.reveal()`` is not called after creation.
   * File touchpoints: ``src/extension.ts`` (``newSessionCommand``,
     ``newEntityCommand`` delegating), ``package.json`` (commands + view/title +
     commandPalette hide).

   .. note::

      Both ``jarvis.newSession`` and ``jarvis_createActor`` (renamed from
      ``jarvis_createSession`` by the actor-tool-rename CR, Phase 5 —
      ``SPEC_ACT_CREATETOOL``) now use the session name verbatim as the folder
      name — no slug transformation.  The previously-documented asymmetry
      between the two creation paths is resolved by this CR.  The folder name is
      storage only; session identity is the ``name:`` field inside
      ``session.yaml``.


.. spec:: sessions-feature: session.schema.json and yamlValidation Entry
   :id: SPEC_ACT_SCHEMA
   :status: implemented
   :links: REQ_ACT_SCHEMA

   **Description:**
   New JSON Schema file ``schemas/session.schema.json`` and a corresponding
   ``contributes.yamlValidation`` entry in ``package.json``.

   **``schemas/session.schema.json``** (JSON Schema draft-07):

   .. code-block:: json

      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "https://github.com/jarvis/schemas/session.schema.json",
        "title": "Jarvis Session",
        "description": "Schema for session.yaml — leaf marker for a Jarvis session entity.",
        "type": "object",
        "required": ["name"],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string",
            "description": "Short display name for this session.",
            "minLength": 1
          },
          "summary": {
            "type": "string",
            "description": "One-sentence description of the session's purpose."
          }
        }
      }

   **``package.json`` ``contributes.yamlValidation`` addition:**

   .. code-block:: json

      {
        "fileMatch": "session.yaml",
        "url": "./schemas/session.schema.json"
      }

   This entry SHALL be added directly after the existing ``event.yaml`` entry,
   keeping the order: ``project.yaml``, ``event.yaml``, ``session.yaml``.


.. spec:: sessions-feature: jarvis_listActors Tool Registration
   :id: SPEC_ACT_TOOLS
   :status: approved
   :links: REQ_ACT_LISTTOOL

   **Description:**
   Register ``jarvis_listActors`` (renamed by the actor-tool-rename CR,
   Phase 5, from ``jarvis_listSessions``, which was itself renamed from
   ``jarvis_listSessionEntities``) via ``registerDualTool()`` in
   ``src/extension.ts``, inside the
   ``if (cfg.get<boolean>('sessions.enabled', true))`` activation block,
   mirroring the gating pattern of ``jarvis_createActor``
   (``SPEC_ACT_CREATETOOL``).

   **Gating:**
   The tool is registered only when ``jarvis.sessions.enabled`` is ``true`` at
   activation time.  Disabling the feature removes the tool from both the LM
   tool catalog and the MCP tool catalog after extension reload.  Statically
   gated per ADR ``tool-deregistration.md`` — no runtime add/remove.

   **Handler sketch** (``extension.ts``):

   .. code-block:: typescript

      const listActorsTool = registerDualTool(
          'jarvis_listActors',
          async (
              _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
              _token: vscode.CancellationToken
          ) => {
              const sessions = scanner?.entities
                  .filter(e => e.kind === 'session')
                  .map(e => ({ name: e.name, summary: e.summary ?? '', folder: e.folder, agent: e.agent ?? '' })) ?? [];
              log.info(`[SES] listActors: ${sessions.length} session(s)`);
              return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(JSON.stringify({ sessions }))
              ]);
          },
          'Lists all Jarvis Actor entities discovered under <workspace>/.jarvis/sessions/ and <workspace>/.jarvis/actors/. Each entry has name, summary, folder, and agent (empty string when no binding set). Distinct from jarvis_listChatSessions which lists VS Code chat tab titles.',
          {},
          async () => {
              const sessions = scanner?.entities
                  .filter(e => e.kind === 'session')
                  .map(e => ({ name: e.name, summary: e.summary ?? '', folder: e.folder, agent: e.agent ?? '' })) ?? [];
              log.info(`[SES] listActors(MCP): ${sessions.length} session(s)`);
              return { sessions };
          }
      );

   The JSON response key remains ``"sessions"`` (unchanged by this rename —
   REQ_ACT_LISTTOOL AC-1) even though the tool name and log-message prefixes
   are updated.

   **``package.json`` ``contributes.languageModelTools`` entry:**

   .. code-block:: json

      {
        "name": "jarvis_listActors",
        "displayName": "List Actors",
        "modelDescription": "Lists all Jarvis Actor entities discovered under <workspace>/.jarvis/sessions/ and <workspace>/.jarvis/actors/. Each entry has name, summary, folder, and agent (empty string when no binding set). Distinct from jarvis_listChatSessions which lists VS Code chat tab titles.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "listActors",
        "icon": "$(list-unordered)",
        "inputSchema": {
          "type": "object",
          "properties": {}
        }
      }


.. spec:: sessions-feature: package.json Manifest Changes
   :id: SPEC_ACT_MANIFEST
   :status: implemented
   :links: REQ_ACT_TOGGLE; REQ_ACT_TREE; REQ_ACT_NEWENTITY

   **Description:**
   All ``package.json`` structural changes required by this CR. No new named
   commands are added (``jarvis.newEntity`` is shared; ``jarvis_listSessionEntities``
   is a tool).

   **(actor-internal-identifiers-rename CR amendment):** the code samples
   below were never updated after ``actor-terminology-rename`` (Phase 1)
   shipped the display-name/title changes, and are now updated a second time
   for this CR's (Phase 1b) internal-identifier renames. Both sets of changes
   are reflected together below so the samples match the current real
   ``package.json`` content exactly:

   * Phase 1 (shipped): settings-group title "Sessions" → "Actors"; setting
     description "Enable the Sessions feature." → "Enable the Actors
     feature."; view display ``name`` "Sessions" → "Actors"; command title
     "Jarvis: New Session" → "Jarvis: New Actor" (``REQ_ACT_TREE`` AC-7/AC-9).
   * Phase 1b (this CR): view ``id`` ``jarvisSessions`` → ``jarvisActors``
     (and its activation event / ``when``-clauses); command id
     ``jarvis.newSession`` → ``jarvis.newActor`` (``REQ_ACT_TREE``
     AC-10/AC-11).

   **1. ``contributes.configuration`` — Actors group**:

   The Actors group contains only ``jarvis.sessions.enabled`` (setting key
   itself unchanged — Phase 2+ scope). Paths are fixed under
   ``.jarvis/sessions/`` (no folder setting):

   .. code-block:: json

      {
        "title": "Actors",
        "properties": {
          "jarvis.sessions.enabled": {
            "type": "boolean",
            "default": true,
            "description": "Enable the Actors feature. When false, no Actors tree view, commands, or tools are registered."
          }
        }
      }

   **2. ``contributes.views.jarvis-explorer``** — insert ``jarvisActors``
   between ``jarvisProjects`` and ``jarvisEvents``:

   .. code-block:: json

      {
        "id": "jarvisActors",
        "name": "Actors",
        "when": "config.jarvis.sessions.enabled == true"
      }

   **3. ``contributes.activationEvents``** — add ``onView:jarvisActors``
   analogous to the existing ``onView:jarvisProjects`` and
   ``onView:jarvisEvents`` entries.

   **4. ``contributes.languageModelTools``** — add the
   ``jarvis_listSessionEntities`` entry (full detail in ``SPEC_ACT_TOOLS``).
   Tool name unchanged — Phase 5 scope (LM/MCP tool renaming).

   **5. ``contributes.yamlValidation``** — add the ``session.yaml`` entry
   (full detail in ``SPEC_ACT_SCHEMA``). File name unchanged — Phase 2+ scope
   (storage paths).

   **6. ``contributes.commands``** — add ``jarvis.newActor``:

   .. code-block:: json

      {
        "command": "jarvis.newActor",
        "title": "Jarvis: New Actor",
        "icon": "$(add)"
      }

   **7. ``contributes.menus.view/title``** — add two entries for the
   ``jarvisActors`` view:

   .. code-block:: json

      [
        {
          "command": "jarvis.newActor",
          "when": "view == jarvisActors",
          "group": "navigation@1"
        },
        {
          "command": "jarvis.rescan",
          "when": "view == jarvisActors",
          "group": "navigation@3"
        }
      ]

   **8. ``contributes.menus.commandPalette``** — hide ``jarvis.newActor``
   from the Command Palette (same pattern as ``jarvis.newProject`` /
   ``jarvis.newEvent``):

   .. code-block:: json

      { "command": "jarvis.newActor", "when": "false" }


.. spec:: sessions-feature: Session Tree-Node Context Menu — Partially Retired
   :id: SPEC_ACT_CONTEXTMENU
   :status: implemented
   :links: REQ_ACT_CONTEXTMENU; SPEC_ENT_ENTITY_CONTEXTMENU

   **Description:**
   Four remaining ``view/item/context`` ``package.json`` menu entries extend
   the context menu for ``viewItem == jarvisSession`` leaf nodes:
   ``jarvis.openAgentSession`` (inline) plus the three ``context-actions``
   entries. The former fifth entry, ``jarvis.openContext`` (inline group),
   is **retired (entity-tree-context-menu CR)** — see below.

   **Retired (entity-tree-context-menu CR): ``jarvis.openContext`` inline entry**

   The JSON entry ``{ "command": "jarvis.openContext", "when": "viewItem ==
   jarvisSession", "group": "inline" }`` — shown below for historical
   reference only — no longer exists. ``jarvis.openContext`` itself was
   fully retired (``REQ_ACT_OPENCONTEXT``, ``REQ_ENT_OPENCONTEXT``). In its
   place, ``jarvisSession`` nodes now get the right-click Open/Copy
   Path/Copy Full Path menu specified by ``SPEC_ENT_ENTITY_CONTEXTMENU``
   (its ``jarvis.openAgentSession`` "Open" entry, added under
   ``viewItem =~ /^jarvisSession$/`` in that spec, supersedes this one).

   **``contributes.menus.view/item/context`` — current (4 entries):**

   .. code-block:: json

      [
        {
          "command": "jarvis.openAgentSession",
          "when": "viewItem == jarvisSession",
          "group": "inline"
        },
        {
          "command": "jarvis.revealInExplorer",
          "when": "viewItem == jarvisSession",
          "group": "context-actions"
        },
        {
          "command": "jarvis.revealInOS",
          "when": "viewItem == jarvisSession",
          "group": "context-actions"
        },
        {
          "command": "jarvis.openInTerminal",
          "when": "viewItem == jarvisSession",
          "group": "context-actions"
        }
      ]

   **Historical entry** (removed, kept for reference only):

   .. code-block:: json

      {
        "command": "jarvis.openContext",
        "when": "viewItem == jarvisSession",
        "group": "inline"
      }

   **Notes:**

   * ``jarvis.openAgentSession`` enables one-click agent chat opening from a
     session node, analogous to project and event nodes — this is the sole
     remaining inline entry.
   * The three context-actions entries (``revealInExplorer``, ``revealInOS``,
     ``openInTerminal``) bring Sessions to full parity with the EXP context-actions
     feature (``SPEC_ENT_CONTEXTACTIONS``).
   * File touchpoint: ``package.json`` ``contributes.menus.view/item/context``
     (Dev Engineer: delete the ``jarvis.openContext`` entry as part of this
     CR's command retirement, alongside the ``SPEC_ENT_OPENCONTEXT_CMD``
     removal work).


.. spec:: jarvis_createActor: LM+MCP Tool Registration
   :id: SPEC_ACT_CREATETOOL
   :status: implemented
   :links: REQ_ACT_CREATETOOL; SPEC_ACT_DUALPATH_SCANNER

   **(actor-dualpath-scanner CR amendment):** the idempotency check, file
   layout, and ``actor.yaml``-format sections below are rewritten — this
   tool now writes new Actors under ``configPaths.ensureActorsDir()`` /
   ``actor.yaml`` instead of ``ensureSessionsDir()``/``session.yaml``. The
   tool's input schema is unaffected by that amendment — only its internal
   write target changed.

   **(actor-tool-rename CR, Phase 5 — hard cutover):** the tool's own name
   is renamed from ``jarvis_createSession`` to ``jarvis_createActor``. The
   old name is REMOVED entirely (no deprecated stub). All code samples
   below use the new name.

   **Description:**
   Register ``jarvis_createActor`` via ``registerDualTool()`` in
   ``src/extension.ts``, inside a dedicated
   ``if (cfg.get<boolean>('sessions.enabled', true))`` guard so the tool is
   absent when sessions are disabled at activation time.  No runtime mutation
   per ADR ``tool-deregistration.md``.  After creating the session (or on
   idempotent skip), the tool auto-opens the new session's agent chat via
   ``jarvis.openAgentSession`` (best-effort; errors are logged at warn and
   do not cause the tool to fail).

   **Rationale for no slug-ification:**
   The folder name equals the ``name`` parameter verbatim.  If the tool
   silently transformed the name (e.g. kebab-casing), the caller could not
   address the new session with ``jarvis_sendToSession`` using the original
   value.  Rejecting invalid names instead of transforming them preserves
   round-trip consistency.

   **Tool input schema**

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
        - Session name; used verbatim as folder name.
      * - ``summary``
        - ``string``
        - no
        - Short description written to ``actor.yaml``
          (omitted from the file when blank or absent).
      * - ``initialMessage``
        - ``string``
        - no
        - First message enqueued in the new session's
          message queue; skipped on idempotent return.

   **Name validation** (performed before any filesystem operation):

   * The name MUST NOT be empty (``""``).
   * The name MUST NOT contain any of: ``/ \\ : * ? " < > |``, null bytes, or
     ASCII control characters (U+0000–U+001F).
   * The name MUST NOT be ``.`` or ``..``.
   * On Windows, the name MUST NOT be a reserved device name (``CON``, ``PRN``,
     ``AUX``, ``NUL``, ``COM1``–``COM9``, ``LPT1``–``LPT9``), case-insensitive.

   Violation → throw ``Error("invalid session name: <reason>")``.  For the LM
   path this propagates as a tool invocation error; for the MCP path it
   propagates as an MCP error response.

   **Idempotency check** (after validation, before writes):

   .. code-block:: typescript

      const actorsDir = configPaths.ensureActorsDir();
      if (!actorsDir) { throw new Error('jarvis_createActor: no workspace open'); }
      const targetPath = path.join(actorsDir, name);
      if (fs.existsSync(targetPath)) {
          // Auto-open even on idempotent skip (AC-10)
          const leaf: LeafNode = { kind: 'leaf', id: path.join(targetPath, 'actor.yaml') };
          try { await vscode.commands.executeCommand('jarvis.openAgentSession', leaf); }
          catch (e) { log.warn(`[SES] createActor: auto-open failed (idempotent): ${e}`); }
          return {
              created: false,
              reason: `session "${name}" already exists; no action taken`,
              path: `.jarvis/actors/${name}`,
          };
      }

   **Note (actor-dualpath-scanner):** this check only guards against a
   name collision in the *new* convention folder (``.jarvis/actors/<name>/``)
   — it does not check whether an old-convention Actor
   (``.jarvis/sessions/<name>/``) of the same name already exists. Per
   ``REQ_ACT_CREATETOOL`` AC-5 and ``REQ_ACT_DUALPATH_SCANNER`` AC-3, this is
   an accepted edge case: both would appear as two distinct (same-named)
   Actor entities in the merged tree, rather than one silently shadowing the
   other or the tool refusing to create the new one.

   **File layout after creation:**

   .. code-block:: text

      <workspaceRoot>/
        .jarvis/
          actors/
            <name>/
              actor.yaml      ← name field always; summary field when non-blank
              context.md      ← always; starts with "# <name>\n\n"

   **``actor.yaml`` format** (mirrors ``jarvis.newActor`` command):

   .. code-block:: yaml

      name: "<name>"
      summary: "<summary>"    # only present when summary is non-blank

   Serialisation uses ``"name: \"<name>\""`` with double-quote wrapping and
   escaping of ``\`` and ``"`` in values — identical to the ``newSessionCommand``
   write logic.  (``name`` values do not require escaping because ``\`` and
   ``"`` are rejected by the name validator; the escape rule applies to
   ``summary`` only.)

   **``context.md`` initial content:**

   .. code-block:: markdown

      # <name>

      <summary>

   When ``summary`` is blank or absent, the line after the blank line is empty
   (``# <name>\n\n``).

   **``initialMessage`` enqueue** (only when session was newly created):

   .. code-block:: typescript

      if (initialMessage) {
          appendMessage(resolveMessagesPath(), name, 'jarvis_createActor', initialMessage);
          messageProvider.reload();
      }

   ``destination`` = verbatim ``name``; ``sender`` = ``"jarvis_createActor"``
   (was ``"jarvis_createSession"`` — changed by the actor-tool-rename CR,
   Phase 5).
   This is consistent with how ``jarvis_sendToSession`` targets sessions by name.

   **Rescan trigger:**

   .. code-block:: typescript

      await scanner?.rescan();

   Called unconditionally after successful creation (satisfies AC-3 / 2-second
   tree refresh requirement).

   **Auto-open** (AC-10, after rescan):

   .. code-block:: typescript

      const leaf: LeafNode = { kind: 'leaf', id: path.join(targetPath, 'actor.yaml') };
      try { await vscode.commands.executeCommand('jarvis.openAgentSession', leaf); }
      catch (e) { log.warn(`[SES] createActor: auto-open failed: ${e}`); }

   Errors from ``openAgentSession`` MUST be caught and logged at ``warn`` level;
   they MUST NOT propagate as a tool failure.  The session folder already exists
   at this point; auto-open is best-effort.  The existing 5 s auto-delivery poll
   will subsequently deliver any queued ``initialMessage`` into the newly opened
   chat (satisfies AC-4 delivery path).

   **Response shapes:**

   *Created:*

   .. code-block:: json

      { "created": true, "path": ".jarvis/actors/<name>" }

   *Already existed (idempotent):*

   .. code-block:: json

      {
        "created": false,
        "reason": "session \"<name>\" already exists; no action taken",
        "path": ".jarvis/actors/<name>"
      }

   *Invalid name / no workspace:* thrown ``Error`` — surfaces as LM tool error
   or MCP error response; no JSON result object.

   **Registration sketch** (``src/extension.ts``, inside ``if (sessions.enabled)``):

   .. code-block:: typescript

      // Implementation: SPEC_ACT_CREATETOOL
      // Requirements: REQ_ACT_CREATETOOL
      const createActorTool = registerDualTool(
          'jarvis_createActor',
          async (
              options: vscode.LanguageModelToolInvocationOptions<{
                  name: string;
                  summary?: string;
                  initialMessage?: string;
              }>,
              _token: vscode.CancellationToken
          ) => {
              const result = await createSession(options.input);
              log.info(`[SES] createActor: created=${result.created}, path=${result.path}`);
              return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(JSON.stringify(result))
              ]);
          },
          'Creates a new Jarvis actor folder with actor.yaml and context.md under <workspace>/.jarvis/actors/<name>/. Idempotent: returns success if the actor already exists.',
          {
              name: z.string().describe('Session name; used verbatim as the folder name'),
              summary: z.string().optional().describe('Optional short description'),
              initialMessage: z.string().optional().describe('Optional first message to enqueue in the new session\'s inbox'),
          },
          async (args) => {
              const result = await createSession({
                  name: args.name as string,
                  summary: args.summary as string | undefined,
                  initialMessage: args.initialMessage as string | undefined,
              });
              log.info(`[SES] createActor(MCP): created=${result.created}, path=${result.path}`);
              return result;
          }
      );

   The ``createSession`` helper (internal function name, unrenamed — only the
   externally-visible tool name changes) encapsulates validation, idempotency
   check, file writes, ``initialMessage`` enqueue, and rescan trigger so the
   LM and MCP handler bodies share no duplicated logic.

   **``package.json`` ``contributes.languageModelTools`` entry:**

   .. code-block:: json

      {
        "name": "jarvis_createActor",
        "displayName": "Create Actor",
        "modelDescription": "Creates a new Jarvis actor folder with actor.yaml and context.md under .jarvis/actors/<name>/. Idempotent: safe to call if the actor already exists.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "createActor",
        "icon": "$(add)",
        "inputSchema": {
          "type": "object",
          "required": ["name"],
          "properties": {
            "name": {
              "type": "string",
              "description": "Session name; used verbatim as the folder name."
            },
            "summary": {
              "type": "string",
              "description": "Optional short description written to actor.yaml."
            },
            "initialMessage": {
              "type": "string",
              "description": "Optional first message to enqueue in the new session's inbox."
            }
          }
        }
      }

   **File touchpoints for the Dev Engineer:**

   * ``src/extension.ts`` — add ``createSession`` helper + ``registerDualTool``
     call inside ``if (sessions.enabled)`` block; add ``createSessionTool`` to
     the ``context.subscriptions.push(...)`` aggregate.  The ``createSession``
     helper must import / reference the ``LeafNode`` type and call
     ``vscode.commands.executeCommand('jarvis.openAgentSession', leaf)`` on both
     creation and idempotent-skip paths (AC-10).
   * ``package.json`` — add ``jarvis_createActor`` entry under
     ``contributes.languageModelTools``.


.. spec:: Opt-In Actor Migration Command
   :id: SPEC_ACT_MIGRATIONCOMMAND
   :status: approved
   :links: REQ_ACT_MIGRATIONCOMMAND; SPEC_ACT_DUALPATH_SCANNER; SPEC_ACT_CREATETOOL

   **Description:**
   A plain VS Code command (not an LM/MCP tool) registered as
   ``jarvis.migrateSessionToActor``, Command Palette-only. Enumerates
   old-convention Actors, lets the user pick one, moves its folder/file to
   the new convention, rescans, and queues a notification message directly
   via the internal ``appendMessage()`` function.

   **Enumerating old-convention Actors (AC-2):**

   .. code-block:: typescript

      function listOldConventionActors(): { name: string; folderPath: string }[] {
          const provider = engine.treeFactory.getProvider('session');
          if (!provider) { return []; }
          const roots = provider.getChildren();
          const leaves = flattenLeaves(Array.isArray(roots) ? roots as TreeNode[] : []);
          return leaves
              .filter(leaf => leaf.id.endsWith('session.yaml'))  // old convention only
              .map(leaf => ({
                  name: kindDrivenScanner.getEntity(leaf.id)?.name
                      ?? path.basename(path.dirname(leaf.id)),
                  folderPath: path.dirname(leaf.id),
              }));
      }

   The ``leaf.id.endsWith('session.yaml')`` check is the same technique
   already used by ``UnifiedEntityTreeProvider._kindOf()`` to distinguish
   conventions — no new scanner API is required.

   **Command handler:**

   .. code-block:: typescript

      const migrateSessionToActorCommand = vscode.commands.registerCommand(
          'jarvis.migrateSessionToActor',
          async () => {
              const candidates = listOldConventionActors();
              if (candidates.length === 0) {
                  vscode.window.showInformationMessage(
                      'No session-convention Actors to migrate.'
                  );
                  return;
              }

              const picked = await vscode.window.showQuickPick(
                  candidates.map(c => ({ label: c.name, description: c.folderPath, c })),
                  { placeHolder: 'Select an Actor to migrate to the new .jarvis/actors/ convention' }
              );
              if (!picked) { return; }  // user cancelled

              const { name, folderPath } = picked.c;
              const actorsDir = configPaths.ensureActorsDir();
              if (!actorsDir) {
                  vscode.window.showErrorMessage('jarvis.migrateSessionToActor: no workspace open');
                  return;
              }
              const targetFolder = path.join(actorsDir, name);

              // AC-5: name-collision guard — abort cleanly, touch nothing
              if (fs.existsSync(targetFolder)) {
                  vscode.window.showErrorMessage(
                      `Cannot migrate "${name}": an Actor already exists at .jarvis/actors/${name}/`
                  );
                  return;
              }

              // AC-4(a)/(b): move folder, then rename convention file inside it
              await fs.promises.mkdir(path.dirname(targetFolder), { recursive: true });
              await fs.promises.rename(folderPath, targetFolder);
              await fs.promises.rename(
                  path.join(targetFolder, 'session.yaml'),
                  path.join(targetFolder, 'actor.yaml')
              );

              // AC-4(c): rescan so the tree reflects the new convention immediately
              await kindDrivenScanner.rescan();

              // AC-6: unconditional fire-and-forget notification
              appendMessage(
                  resolveMessagesPath(),
                  name,
                  'Jarvis',
                  `Your Actor has been migrated to the new storage convention.\n` +
                  `New folder: .jarvis/actors/${name}/\n` +
                  `context.md: .jarvis/actors/${name}/context.md`
              );
              messageProvider.reload();

              vscode.window.showInformationMessage(`Migrated "${name}" to .jarvis/actors/${name}/`);
              log.info(`[ACT] migrateSessionToActor: "${name}" moved to new convention`);
          }
      );
      context.subscriptions.push(migrateSessionToActorCommand);

   **Why ``appendMessage()`` directly, not the ``jarvis_sendMessage`` LM
   tool (AC-6 design note):**

   ``jarvis_sendMessage`` (``REQ_MSG_SENDMESSAGE`` AC-5/AC-6) requires
   ``senderSession`` to be a member of ``getValidDestinations()`` — a
   deliberate safety rail for **model-invoked** calls. ``"Jarvis"`` is not
   itself a registered session or entity name, so routing through that tool
   would incorrectly throw. This is not a gap: internal, non-model-invoked
   system notifications already bypass that tool entirely and call
   ``appendMessage()`` directly with a free-form sender string — the exact
   same pattern used by ``heartbeat.ts`` (sender ``'heartbeat'``),
   ``jarvis_createActor``'s initial-message enqueue (sender
   ``'jarvis_createActor'`` — was ``'jarvis_createSession'`` before the
   actor-tool-rename CR, Phase 5), and the Reminder feature (sender
   ``'Reminder'``). This command follows that established precedent with
   sender ``"Jarvis"``.

   **Manifest additions (``packages/core/package.json``):**

   * ``contributes.commands``: ``jarvis.migrateSessionToActor`` (title
     "Jarvis: Migrate Session to Actor", no icon — Command Palette only)
   * ``contributes.menus.commandPalette``: no exclusion entry needed (default
     visibility is "shown in palette"); explicitly NOT added to any
     ``view/title`` or ``view/item/context`` menu (REQ_ACT_MIGRATIONCOMMAND
     AC-7 — no tree/context-menu surface)

   **Design notes:**

   * ``fs.promises.rename()`` is used for both the folder move and the
     in-place file rename — a same-filesystem rename is atomic and
     preserves all file contents (``context.md`` and any other files)
     untouched, satisfying AC-4's "no other file touched" requirement.
   * The command performs no idempotency merge logic beyond the AC-5
     collision guard — if the target folder already exists, the migration
     for that Actor is simply refused; the user can resolve the naming
     conflict manually (out of scope for this minimal command per
     ``US_ACT_MIGRATIONCOMMAND`` AC-5).
   * No auto-open of a chat session occurs after migration (unlike
     ``jarvis_createActor``) — this command only relocates an existing
     Actor's storage; if a chat session for that Actor is already open, it
     is unaffected by the file move.


.. spec:: session-tree-click-behavior: Inverted Click Semantics
   :id: SPEC_ACT_TREECLICK
   :status: implemented
   :links: REQ_ACT_TREECLICK; REQ_ACT_TREE; REQ_ACT_OPENCONTEXT; SPEC_ENT_OPENCONTEXT_CMD

   **Description:**
   Change the default click action on ``jarvisSession`` tree items from
   ``jarvis.openContext`` to ``jarvis.openAgentSession``. Opening
   ``context.md`` is now reachable via the entity's expandable file
   children (``jarvis.openEntityFile``, ``REQ_ENT_ENTITY_FILE_CHILDREN``)
   and the right-click "Open"/"Copy Path"/"Copy Full Path" menu
   (``SPEC_ENT_ENTITY_CONTEXTMENU``) — ``jarvis.openContext`` itself was
   later fully retired by the ``entity-tree-context-menu`` CR
   (``SPEC_ENT_OPENCONTEXT_CMD``), including its inline icon which this
   spec originally described as the remaining way to reach ``context.md``.

   **1. ``src/sessionTreeProvider.ts`` --- ``getTreeItem()`` change**

   .. note::

      (actor-internal-identifiers-rename CR) ``src/sessionTreeProvider.ts``/
      ``SessionTreeProvider`` referenced throughout this spec element no
      longer exists — it was removed (see ``SPEC_ACT_TREE``'s "Class
      removed, not renamed" note); it was never the live registration path
      for the running tree (that's the generic ``engine.treeFactory``). The
      *behavior* this section describes (leaf-node click → ``jarvis.
      openAgentSession``) is unaffected and still accurate — it now lives in
      the generic factory's ``EntityKindConfig`` rather than this removed
      standalone class.

   Replace the ``command`` binding on the session leaf ``TreeItem``:

   .. code-block:: typescript

      // Before (SPEC_ACT_TREE -- implemented):
      item.command = {
          command: 'jarvis.openContext',
          title: 'Open Context',
          arguments: [element],
      };

      // After (SPEC_ACT_TREECLICK):
      item.command = {
          command: 'jarvis.openAgentSession',
          title: 'Open Agent Session',
          arguments: [element],
      };

   No other changes to ``SessionTreeProvider``. **Historical note:** an
   earlier revision of this spec stated the inline ``$(notebook)`` icon on
   ``jarvisSession`` nodes "continues to invoke the shared
   ``jarvis.openContext`` command" — this is no longer accurate:
   ``entity-tree-context-menu`` removed that inline icon and then fully
   retired ``jarvis.openContext`` itself (``SPEC_ENT_OPENCONTEXT_CMD``). No
   new command registration exists for this purpose; ``context.md`` access
   moved entirely to ``SPEC_ENT_ENTITY_CONTEXTMENU``.

   **Retired (entity-open-context-cleanup CR): ``jarvis.openSessionContext``**

   An earlier revision of this spec introduced a dedicated
   ``jarvis.openSessionContext`` command (auto-create-on-missing semantics,
   icon ``$(book)``) as the Actor inline context.md icon. That command was
   **never activated** — its ``package.json`` menu binding shipped with
   ``"when": "false"`` and no code path ever invoked it. It duplicated
   ``jarvis.openContext`` without ever superseding it in practice.

   **Removal (code, paired with this spec update):**

   * ``src/extension.ts``: delete the ``openSessionContextCommand`` handler
     registration and its ``context.subscriptions.push(...)`` entry.
   * ``package.json``: delete the ``jarvis.openSessionContext`` entry from
     ``contributes.commands`` and its ``"when": "false"`` entry from
     ``contributes.menus.commandPalette``. No ``view/item/context`` entry
     exists to remove (it was never added — that is precisely why the
     command was unreachable).

   **Rationale for removal-not-merge:** the command had no live callers and
   no unique behavior worth preserving under a new name — see the
   Auto-create decision below for why its auto-create semantics were not
   ported to ``jarvis.openContext`` either.

   **Auto-create decision (entity-open-context-cleanup CR):** `jarvis.openContext`
   does **not** gain auto-create-on-missing behavior. All 3 entity kinds
   already receive a `context.md` at entity-creation time via their
   respective creation tools/commands (`jarvis_createProject`,
   `jarvis_createEvent`, `jarvis_createActor` (was `jarvis_createSession`
   before the actor-tool-rename CR, Phase 5), and their UI-driven
   equivalents) — the Actor "state = context.md" architectural expectation
   from the actor-model description is satisfied at creation time, not by
   the open command. A missing `context.md` at open-time is an edge case
   (manual folder creation, accidental deletion) equally possible for any
   kind; auto-creating it silently as a side effect of a read-only "open"
   action would be a surprising mutation and was rejected in favor of the
   existing, already-majority (2 of 3 kinds) discovery-only behavior.


   **Acceptance Criteria:**

   1. `TreeItem.command` for `jarvisSession` leaf nodes is bound to
      `jarvis.openAgentSession` (per `REQ_ACT_TREECLICK` AC-1).
   2. No `jarvis.openSessionContext` command is registered anywhere in the
      codebase (`src/extension.ts` contains no handler for it) and no
      `package.json` `contributes.commands`/`contributes.menus` entry
      references it.
   3. **Historical (superseded by ``entity-tree-context-menu``
      ``SPEC_ENT_OPENCONTEXT_CMD`` retirement):** the inline ``$(notebook)``
      icon on ``jarvisSession`` nodes previously invoked ``jarvis.openContext``
      — that icon and command are now fully retired; ``context.md`` is
      reached via file children / the right-click menu
      (``SPEC_ENT_ENTITY_CONTEXTMENU``) instead.
   4. Double-click behaves identically to single-click (VS Code default).
   5. **Historical:** the five ``view/item/context`` entries for ``viewItem ==
      jarvisSession`` originally listed here (``jarvis.openContext``,
      ``jarvis.openAgentSession``, ``jarvis.revealInExplorer``,
      ``jarvis.revealInOS``, ``jarvis.openInTerminal``) are reduced to four
      after ``jarvis.openContext``'s retirement; ``SPEC_ACT_CONTEXTMENU`` is
      not otherwise touched.

   **File touchpoints:**

   * `src/sessionTreeProvider.ts` — `item.command` in `getTreeItem()`
     (unchanged by this CR, already correct).
   * `src/extension.ts` — **remove** the `openSessionContextCommand`
     registration and its `context.subscriptions.push(...)` entry.
   * `package.json` — **remove** the `jarvis.openSessionContext` entry from
     `contributes.commands` and its `commandPalette` `"when": "false"` entry.
   * No SVG/icon files to remove (`$(book)` is a built-in codicon, not a
     custom asset).


.. spec:: session-agent-binding: Agent Discovery Function
   :id: SPEC_ACT_AGENT_DISCOVERY
   :status: draft
   :links: REQ_ACT_AGENT_DISCOVERY; REQ_ACT_AGENT_PICKER; REQ_ACT_AGENT_CREATETOOL

   **Description:**
   A new module-level helper function ``discoverAgentModes()`` in
   ``src/extension.ts`` scans ``.github/agents/*.agent.md`` across all workspace
   folders and returns the list of user-invocable agents.

   **Discovery rule decision — rationale:**

   The valid set is defined as all ``*.agent.md`` files in
   ``<workspaceRoot>/.github/agents/`` **except** those whose YAML frontmatter
   explicitly contains ``user-invocable: false`` (default-include, opt-out).

   * *File-based* — avoids runtime dependencies on live VS Code state (no DB,
     no chat API).  Agents are static configuration; a file-per-agent model is
     already the established convention in this repository.
   * *``.github/agents/`` path* — the canonical home for Jarvis-managed agent
     definitions already in use; no new convention is introduced.
   * *Default-include, explicit opt-out* — a new ``*.agent.md`` file is
     user-invocable by default, matching User expectation.  Internal
     orchestration agents that must not be directly bound to user sessions
     (``syspilot.implement``, ``syspilot.mece``, ``syspilot.docu``,
     ``syspilot.uat``, ``syspilot.trace``, ``syspilot.verify``,
     ``syspilot.release``, ``syspilot.design``) opt out by explicitly setting
     ``user-invocable: false`` in their frontmatter.  All such existing
     orchestration agents in this repository already carry the explicit
     ``user-invocable: false`` line, so this policy change has **zero behavior
     change** for existing files — only newly-added files without the key are
     affected (they appear in the picker, as expected).  The four
     currently-visible agents (``syspilot.cm``, ``syspilot.pm``,
     ``syspilot.qm``, ``syspilot.setup``) are unaffected.
   * *Identity-first naming* — the agent's identity is its frontmatter ``name``
     field (trimmed) when present and non-empty; otherwise the filename basename
     without the ``.agent.md`` suffix (e.g., ``syspilot.cm.agent.md`` →
     ``syspilot.cm``).  This mirrors VS Code's own chat-mode picker logic:
     ``workbench.action.chat.open { mode: X }`` accepts both space-containing
     names (e.g., ``"Change Manager"``) and filename-stem strings
     (e.g., ``"syspilot.cm"``).  Backward compatibility: existing
     ``session.yaml`` files that store the filename stem continue to resolve
     correctly because agents without a ``name:`` key keep the same identity.

   **Interface:**

   .. code-block:: typescript

      interface AgentModeEntry {
          name: string;       // identity: frontmatter name (if set+non-empty) or filename stem
                              // e.g. "Change Manager" or "syspilot.cm"
          filePath: string;   // workspace-relative, e.g. ".github/agents/syspilot.cm.agent.md"
      }

      async function discoverAgentModes(): Promise<AgentModeEntry[]>

   **Algorithm** (``src/extension.ts``):

   .. code-block:: typescript

      async function discoverAgentModes(): Promise<AgentModeEntry[]> {
          const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
          const agents: AgentModeEntry[] = [];

          for (const workspaceFolder of workspaceFolders) {
              const agentsDir = path.join(workspaceFolder.uri.fsPath, '.github', 'agents');
              let entries: import('fs').Dirent[];
              try {
                  entries = await fs.promises.readdir(agentsDir, { withFileTypes: true });
              } catch {
                  continue; // directory absent or unreadable — skip silently
              }

              for (const entry of entries) {
                  if (!entry.isFile()) { continue; }
                  const lower = entry.name.toLowerCase();
                  if (!lower.endsWith('.agent.md')) { continue; }

                  const agentPath = path.join(agentsDir, entry.name);
                  try {
                      const content = await fs.promises.readFile(agentPath, 'utf8');
                      if (isExplicitlyExcluded(content, 'user-invocable')) { continue; }
                  } catch {
                      continue;
                  }

                  const identity = getAgentIdentity(content, entry.name);
                  agents.push({
                      name: identity,
                      filePath: path.relative(workspaceFolder.uri.fsPath, agentPath),
                  });
              }
          }

          return agents.sort((a, b) => a.name.localeCompare(b.name));
      }

   **Frontmatter helpers** (module-private, ``src/extension.ts``):

   .. code-block:: typescript

      /** Returns true only if the key is explicitly set to false in frontmatter. */
      function isExplicitlyExcluded(content: string, key: string): boolean {
          if (!content.startsWith('---')) { return false; }
          const closeIdx = content.indexOf('\n---', 3);
          if (closeIdx < 0) { return false; }
          const header = content.slice(3, closeIdx);
          const re = new RegExp(`^${key}:\\s*false\\s*$`, 'm');
          return re.test(header);
      }

      /** Returns true only if the key is explicitly set to true in frontmatter. */
      function readFrontmatterBool(content: string, key: string): boolean {
          if (!content.startsWith('---')) { return false; }
          const closeIdx = content.indexOf('\n---', 3);
          if (closeIdx < 0) { return false; }
          const header = content.slice(3, closeIdx);
          // Simple line-by-line match — avoids full YAML parse dependency
          const re = new RegExp(`^${key}:\\s*true\\s*$`, 'm');
          return re.test(header);
      }

      /**
       * Returns the trimmed string value of `key` in YAML frontmatter,
       * or undefined if the key is absent or produces an empty string.
       * Handles both bare values (name: Change Manager) and
       * double- or single-quoted values (name: "Change Manager").
       * `key` must be a plain identifier (no regex special characters).
       */
      function readFrontmatterString(content: string, key: string): string | undefined {
          if (!content.startsWith('---')) { return undefined; }
          const closeIdx = content.indexOf('\n---', 3);
          if (closeIdx < 0) { return undefined; }
          const header = content.slice(3, closeIdx);
          const re = new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm');
          const m = re.exec(header);
          if (!m) { return undefined; }
          let val = m[1].trim();
          if ((val.startsWith('"') && val.endsWith('"')) ||
              (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1).trim();
          }
          return val.length > 0 ? val : undefined;
      }

      /** Returns the agent identity: frontmatter `name` (trimmed, non-empty) or filename stem. */
      function getAgentIdentity(content: string, filename: string): string {
          const frontmatterName = readFrontmatterString(content, 'name');
          return frontmatterName ?? filename.slice(0, -'.agent.md'.length);
      }

   ``isExplicitlyExcluded`` is the primary helper for discovery: it returns
   ``true`` only when ``user-invocable: false`` is present, implementing the
   default-include opt-out policy.  ``readFrontmatterBool`` is retained as an
   explicit-true probe for any future call sites that need affirmative
   confirmation.

   **Design decisions:**

   * Both helpers use a simple regex rather than a full YAML parse.
     The ``user-invocable`` key is always a boolean literal in agent files;
     a regex match is sufficient and avoids adding a new import or dependency.
   * The function iterates all workspace folders and does **not** deduplicate
     by agent name: two folders providing the same agent name would both appear
     in the picker.  Ordering follows per-folder scan order, then alphabetical
     within each folder.  In single-workspace operation — the normative case
     for Jarvis — this is moot; only one folder is scanned.
   * ``discoverAgentModes()`` is called on-demand (at picker open and at
     validation time) — no caching, no file watcher.

   **File touchpoint:** ``src/extension.ts`` — add ``AgentModeEntry``
   interface, ``isExplicitlyExcluded()`` helper, ``readFrontmatterBool()``
   helper, ``readFrontmatterString()`` helper, ``getAgentIdentity()`` helper,
   and ``discoverAgentModes()`` function in the module preamble
   (before ``activate()``).

   **Identity drift edge case (advisory — out of code scope for this CR):**
   When a ``*.agent.md`` file's frontmatter ``name`` key is added, removed,
   or changed after sessions have already been bound using the prior identity,
   those sessions' ``session.yaml agent:`` fields will no longer match any
   discovered identity.  Jarvis does **not** auto-migrate existing files.
   Design proposal for a follow-up CR: at picker-open time, iterate all known
   session entities and emit a ``warn``-level log entry for each session whose
   ``agent`` value does not appear in the current ``discoverAgentModes()``
   result.  The session continues to open; the bound-agent mode is silently
   ignored (falls through to the default VS Code chat mode).  This risk is
   acceptable for the current CR scope because no existing
   ``syspilot.*.agent.md`` file has its identity changed.


.. spec:: session-agent-binding: Schema and EntityEntry Extension
   :id: SPEC_ACT_AGENT_SCHEMA
   :status: implemented
   :links: REQ_ACT_AGENT_FIELD; REQ_ACT_AGENT_COMPAT; SPEC_ENG_SCANNER; SPEC_ACT_SCHEMA; SPEC_ACT_TOOLS

   **Description:**
   Three coordinated changes add the optional ``agent`` field to the data model:
   ``schemas/session.schema.json``, ``src/yamlScanner.ts`` ``EntityEntry``, and
   the ``jarvis_listSessionEntities`` tool output.

   **1. ``schemas/session.schema.json`` — add ``agent`` property:**

   .. code-block:: json

      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Jarvis Session",
        "type": "object",
        "required": ["name"],
        "additionalProperties": false,
        "properties": {
          "name":    { "type": "string", "description": "Short display name for this session.", "minLength": 1 },
          "summary": { "type": "string", "description": "One-sentence description of the session's purpose." },
          "agent":   { "type": "string", "description": "VS Code chat-mode name bound to this session (e.g. 'syspilot.cm' or 'Change Manager' — identity may be filename-stem or frontmatter name with spaces, per SPEC_ACT_AGENT_DISCOVERY). When set, opening the session activates that chat agent automatically." }
        }
      }

   No other schema fields change.  The ``additionalProperties: false`` constraint
   continues to hold; the new ``agent`` property is explicitly listed.

   **2. ``src/yamlScanner.ts`` — extend ``EntityEntry``:**

   Add ``agent?: string`` to the interface (after ``summary``):

   .. code-block:: typescript

      export interface EntityEntry {
          name: string;
          summary?: string;
          agent?: string;      // NEW — optional chat-mode binding for sessions
          datesStart?: string;
          datesEnd?: string;
          kind?: 'project' | 'event' | 'session';
          folder?: string;
      }

   In ``_buildTree()`` (the session-reading branch), read the ``agent`` field:

   .. code-block:: typescript

      const agent = typeof doc['agent'] === 'string' && doc['agent']
          ? doc['agent']
          : undefined;
      entities.set(conventionPath, {
          name: doc['name'],
          kind: 'session',
          ...(summary ? { summary } : {}),
          ...(agent   ? { agent }   : {}),
          // ... datesStart etc. unchanged
      });

   Only string values that are non-empty are stored; absent or
   non-string ``agent`` fields result in ``undefined``.

   **3. ``jarvis_listSessionEntities`` tool — expose ``agent`` in output:**

   Amend both the LM and MCP handler bodies in ``SPEC_ACT_TOOLS`` to include
   ``agent``:

   .. code-block:: typescript

      .map(e => ({
          name:    e.name,
          summary: e.summary ?? '',
          agent:   e.agent   ?? '',   // NEW — empty string when no binding
          folder:  e.folder,
      }))

   Callers MUST treat ``""`` as "no binding" (``REQ_ACT_AGENT_COMPAT AC-3``).

   **File touchpoints:**

   * ``schemas/session.schema.json`` — add ``agent`` property.
   * ``src/yamlScanner.ts`` — ``EntityEntry`` interface + ``_buildTree()``
     session branch.
   * ``src/extension.ts`` — ``listSessionEntities`` LM and MCP handler
     ``.map()`` call.


.. spec:: session-agent-binding: Agent Picker and newSession Update
   :id: SPEC_ACT_AGENT_PICKER
   :status: draft
   :links: REQ_ACT_AGENT_PICKER; REQ_ACT_AGENT_DISCOVERY; SPEC_ACT_NEWENTITY; SPEC_ACT_AGENT_DISCOVERY

   **Description:**
   A new helper ``pickAgentMode()`` presents the agent picker QuickPick.
   ``newSessionCommand`` in ``src/extension.ts`` calls it after the ``summary``
   prompt and writes the result to ``session.yaml``.

   **``pickAgentMode()`` implementation** (``src/extension.ts``):

   .. code-block:: typescript

      async function pickAgentMode(): Promise<string | undefined> {
          const agents = await discoverAgentModes();

          const items: (vscode.QuickPickItem & { mode: string })[] = [
              {
                  label:       'No agent',
                  description: 'Opens a default chat — pick mode via the chat dropdown',
                  mode:        '',
              },
              ...agents.map(a => ({
                  label:       a.name,
                  description: a.filePath,
                  mode:        a.name,
              })),
          ];

          const pick = await vscode.window.showQuickPick(items, {
              placeHolder: 'Select the agent for this session (Escape = cancel creation)',
              matchOnDescription: true,
          });

          // undefined → user dismissed (Escape) → caller aborts creation
          return pick === undefined ? undefined : pick.mode;
      }

   **Return semantics:**

   * ``undefined`` — user dismissed (Escape); ``newSessionCommand`` MUST abort.
   * ``""`` (empty string) — "No agent" was selected; write ``agent: ""``
     to ``session.yaml``.
   * ``"<identity>"`` (non-empty) — write ``agent: "<identity>"`` to
     ``session.yaml``.  The identity is the string from ``AgentModeEntry.name``
     (frontmatter ``name`` if present and non-empty, otherwise filename stem)
     and is used verbatim as the ``mode:`` parameter in
     ``workbench.action.chat.open``.  Identities may contain spaces.

   **Scope:** This picker is shown ONLY by the 3 New-Entity command flows
   (``jarvis.newProject``, ``jarvis.newEvent``, ``jarvis.newSession`` /
   ``jarvis.newEntity``). It is NEVER shown by tree-click,
   ``jarvis.openAgentSession``, or any post-creation flow.

   **Chat-open rule for ``newSession``:**

   After YAML creation, ``newSessionCommand`` SHALL always open a chat editor
   (cancel is handled by the earlier early-return guard).  The consolidated
   chat-open primitive (``SPEC_ENT_AGENT_PICKER``) applies: if ``agentInput``
   is non-empty, mode-prime with ``workbench.action.chat.open({ mode: agentInput })``
   + 300 ms settle; then always ``openNewChatEditor()`` (``SPEC_MSG_OPENCHAT``).
   If ``agentInput === ""`` ("No agent"), skip mode-prime, just
   ``openNewChatEditor()``. ``chat.open({mode})`` is mode-prime only — NOT
   editor-creation.

   **``newSessionCommand`` change** (``src/extension.ts``):

   After the ``summary`` prompt (step 4 in ``SPEC_ACT_NEWENTITY``) and before
   slug + folder creation (steps 5–6), insert:

   .. code-block:: typescript

      // Implementation: SPEC_ACT_AGENT_PICKER
      const agentInput = await pickAgentMode();
      if (agentInput === undefined) { return; }  // user cancelled

   And after the ``summary`` write line in the ``yamlLines`` construction
   (step 7), add:

   .. code-block:: typescript

      // Always write agent field (empty string for "No agent")
      yamlLines.push(`agent: ${yamlString(agentInput)}`);

   The existing ``yamlString()`` helper (already used for ``name`` and
   ``summary``) handles escaping.

   **Chat-open** (after YAML write + rescan):

   .. code-block:: typescript

      // Implementation: SPEC_ACT_AGENT_PICKER (chat-open per SPEC_ENT_AGENT_PICKER consolidated primitive)
      if (agentInput) {
          try {
              await vscode.commands.executeCommand(
                  'workbench.action.chat.open', { mode: agentInput }
              );
              await new Promise(resolve => setTimeout(resolve, 300));
          } catch (err) {
              log.warn(`Mode-prime failed: ${err}`);
          }
      }
      // Editor creation (always) — SPEC_MSG_OPENCHAT
      await openNewChatEditor();

   If ``agentInput === ""`` ("No agent"), mode-prime is skipped and
   the chat opens in VS Code default mode.  If ``agentInput`` is non-empty,
   mode-prime sets the global mode selector before editor creation.
   ``chat.open({mode})`` is mode-prime only — NOT a substitute for
   ``openNewChatEditor()``.

   **No change to ``jarvis.newEntity`` delegation path** — it continues to
   call ``vscode.commands.executeCommand('jarvis.newSession')``; the picker
   is invoked inside ``newSessionCommand``.

   **File touchpoints:**

   * ``src/extension.ts`` — add ``pickAgentMode()`` function; amend
     ``newSessionCommand`` to call it and write the result.


.. spec:: session-agent-binding: jarvis_createActor Agent Parameter
   :id: SPEC_ACT_AGENT_CREATETOOL
   :status: draft
   :links: REQ_ACT_AGENT_CREATETOOL; REQ_ACT_AGENT_VALIDATION; SPEC_ACT_CREATETOOL; SPEC_ACT_AGENT_DISCOVERY

   **Description:**
   Extend ``jarvis_createActor`` (renamed from ``jarvis_createSession`` by
   the actor-tool-rename CR, Phase 5) to accept an optional ``agent``
   parameter, validate it against the discovered agent set, and write it to
   ``actor.yaml`` when valid.

   **Updated ``createSession`` helper signature** (``src/extension.ts``):

   .. code-block:: typescript

      const createSession = async (args: {
          name: string;
          summary?: string;
          agent?: string;        // NEW
          initialMessage?: string;
      }): Promise<{ created: boolean; reason?: string; path: string }>

   **Agent validation step** (inserted after name validation, before
   idempotency check):

   .. note::

      ``agent`` is an identity string (see ``SPEC_ACT_AGENT_DISCOVERY
      getAgentIdentity``): it may be a frontmatter name with spaces
      (e.g. ``"Change Manager"``) or a filename stem (e.g. ``"syspilot.cm"``).
      The validation checks the supplied value against the identity strings
      from ``discoverAgentModes()`` exactly.

   .. code-block:: typescript

      // Implementation: SPEC_ACT_AGENT_CREATETOOL
      if (agent) {
          const available = await discoverAgentModes();
          const validNames = available.map(a => a.name);
          if (!validNames.includes(agent)) {
              const names = validNames.length > 0
                  ? validNames.sort().join(', ')
                  : '(none)';
              throw new Error(
                  `Agent "${agent}" is not available.\nAvailable agents: ${names}`
              );
          }
      }

   **YAML write** (in the file-construction block after ``summary``):

   .. code-block:: typescript

      if (agent) {
          yamlLines.push(`agent: ${yamlString(agent)}`);
      }

   **Updated tool input schema** (LM handler ``options`` type):

   .. code-block:: typescript

      options: vscode.LanguageModelToolInvocationOptions<{
          name: string;
          summary?: string;
          agent?: string;        // NEW
          initialMessage?: string;
      }>

   **Updated ``package.json`` input schema** for ``jarvis_createActor``
   (was ``jarvis_createSession`` before the actor-tool-rename CR, Phase 5):

   .. code-block:: json

      "agent": {
        "type": "string",
        "description": "Optional VS Code chat-mode name (e.g. 'syspilot.cm'). When set, opening the session activates that agent automatically. Must match a user-invocable agent file in .github/agents/."
      }

   (Added to the existing ``properties`` object; not added to ``required``.)

   **Updated MCP handler** — pass ``agent`` through to ``createSession()``:

   .. code-block:: typescript

      async (args) => {
          const result = await createSession({
              name:           args.name as string,
              summary:        args.summary as string | undefined,
              agent:          args.agent as string | undefined,  // NEW
              initialMessage: args.initialMessage as string | undefined,
          });
          // ...
      }

   **Error contract (REQ_ACT_AGENT_VALIDATION):**

   *Example — unknown agent, two available:*

   .. code-block:: text

      Agent "syspilot.design" is not available.
      Available agents: syspilot.cm, syspilot.pm

   *Example — unknown agent, no agents discoverable:*

   .. code-block:: text

      Agent "my-custom" is not available.
      Available agents: (none)

   **File touchpoints:**

   * ``src/extension.ts`` — ``createSession`` helper: add ``agent`` destructure,
     validation block, and ``yamlLines`` push; update LM options type; update
     MCP handler ``args`` passthrough.
   * ``package.json`` — add ``agent`` to ``jarvis_createActor``
     ``inputSchema.properties``.
   * ``src/extension.ts`` — Zod schema for MCP: add
     ``agent: z.string().optional().describe('...')``.


.. spec:: session-agent-binding: openAgentSession Agent Mode Binding
   :id: SPEC_ACT_AGENT_OPEN
   :status: implemented
   :links: REQ_ACT_AGENT_OPEN; REQ_ACT_AGENT_COMPAT; SPEC_ENT_AGENTSESSION; SPEC_ACT_AGENT_SCHEMA

   **Description:**
   Amend ``jarvis.openAgentSession`` so that when creating a **new** chat session
   for a session entity with a bound ``agent``, the VS Code chat editor is opened
   in that agent mode.

   **Mechanism — spike validation:**

   The VS Code ``workbench.action.chat.open`` command accepts an optional
   ``mode`` property alongside ``query``.  When ``mode`` is set to an agent
   name (e.g. ``"syspilot.cm"``), VS Code opens the chat editor pre-configured
   in that custom chat mode.  The spike (``experiment/agent-mode-spike@acd46bb``)
   confirmed this API works end-to-end with the existing agent file convention.

   **Handler change** (in the new-session branch of ``openAgentSession``,
   ``src/extension.ts``):

   Replace the ``workbench.action.chat.open`` invocation that sends the init
   prompt with a conditional mode option:

   .. code-block:: typescript

      // Implementation: SPEC_ACT_AGENT_OPEN
      // Requirements: REQ_ACT_AGENT_OPEN
      const chatOpenOptions: { query: string; mode?: string } = { query: initPrompt };
      if (entity.agent) {
          chatOpenOptions.mode = entity.agent;
      }
      await vscode.commands.executeCommand(
          'workbench.action.chat.open',
          chatOpenOptions
      );

   This replaces the current unconditional:

   .. code-block:: typescript

      await vscode.commands.executeCommand(
          'workbench.action.chat.open',
          { query: initPrompt }
      );

   **Existing-session path — no change:**

   When a UUID is found, the command opens the pinned tab via
   ``openPinnedResource()``.  The ``agent`` binding is not re-applied —
   the session was already initialized in the correct mode on first open.

   **Backward compatibility (REQ_ACT_AGENT_COMPAT):**

   When ``entity.agent`` is ``undefined`` (existing sessions, or sessions
   created without a binding), ``chatOpenOptions.mode`` is never set.
   The call to ``workbench.action.chat.open`` receives
   ``{ query: initPrompt }`` — identical to the pre-change behavior.

   **Unrecognised ``mode`` value:**

   If the agent was removed after the session was created (``user-invocable``
   revoked, file deleted), VS Code silently falls back to its default chat
   mode.  Jarvis does not detect or surface this degradation; it is an
   accepted out-of-scope edge case.

   **File touchpoints:**

   * ``src/extension.ts`` — ``openAgentSessionCommand`` handler: replace the
     single ``workbench.action.chat.open`` call in the new-session branch with
     the conditional ``chatOpenOptions`` construction shown above.
