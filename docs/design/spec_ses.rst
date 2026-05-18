Sessions Design Specifications
================================

.. spec:: sessions-feature: YamlScanner Extension for Sessions
   :id: SPEC_SES_SCANNER
   :status: implemented
   :links: REQ_SES_SCHEMA; REQ_SES_TREE; REQ_SES_TOGGLE

   **Description:**
   Extend ``src/yamlScanner.ts`` to recognise ``session.yaml`` as a third leaf
   marker and emit session entities from each configured sessions folder.

   **Interface changes** (``yamlScanner.ts``):

   Add ``summary`` to ``EntityEntry`` and add ``kind`` to ``LeafNode`` so tree
   providers and tools can distinguish entity types without separate getter
   methods:

   .. code-block:: typescript

      export interface EntityEntry {
          name: string;
          summary?: string;           // NEW — populated from session.yaml
          kind?: 'project' | 'event' | 'session';  // NEW
          datesStart?: string;
          datesEnd?: string;
      }

   **New state and API** (``YamlScanner`` class):

   Add a ``_sessionTree`` array and matching getter alongside the existing
   ``_projectTree`` / ``_eventTree`` pair:

   .. code-block:: typescript

      private _sessionTree: TreeNode[] = [];
      private _sessionsFolder = '';   // single folder (fixed path)

      getSessionTree(): TreeNode[] {
          return this._sessionTree;
      }

   Update ``start()`` / ``rescan()`` to accept a single
   ``sessionsFolder?: string`` parameter (no array — path is fixed):

   .. code-block:: typescript

      start(projectsFolder: string, eventsFolder: string, sessionsFolder?: string): void

      // In _scan():
      const newSessionTree = await this._buildTree(
          sessionsFolder ?? '', newEntities, 'session.yaml', 'session'
      );

   **YAML reading** — in ``_buildTree`` when ``conventionFile === 'session.yaml'``,
   read the ``summary`` field and store it in the entity entry:

   .. code-block:: typescript

      // After reading doc['name']:
      entities.set(conventionPath, {
          name: doc['name'],
          kind: 'session',
          summary: typeof doc['summary'] === 'string' ? doc['summary'] : '',
      });

   **Change-detection** — extend ``_scan()`` to compare the new session tree
   against ``_sessionTree`` (same ``_treesEqual`` helper already exists).

   **Touchpoints in ``yamlScanner.ts``:**

   * Line ~10: ``EntityEntry`` interface — add ``summary`` and ``kind`` fields.
   * Line ~69–70: ``_scan()`` private method — add session-tree build loop.
   * Line ~152: ``isEvent`` constant — no change; ``isSession`` follows the
     same pattern for the optional ``summary`` read.
   * ``start()`` signature — add optional ``sessionsFolder?: string`` parameter
     (single fixed path).
   * Add ``getSessionTree()`` getter after ``getEventTree()``.


.. spec:: sessions-feature: SessionTreeProvider Module
   :id: SPEC_SES_TREE
   :status: implemented
   :links: REQ_SES_TREE; REQ_SES_OPENCONTEXT

   **Description:**
   New module ``src/sessionTreeProvider.ts`` — a slimmed clone of
   ``src/projectTreeProvider.ts``. It consumes ``YamlScanner.getSessionTree()``
   and renders session leaf nodes.

   **Skeleton** (``src/sessionTreeProvider.ts``):

   .. code-block:: typescript

      // Implementation: SPEC_SES_TREE
      // Requirements: REQ_SES_TREE

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
     command is needed.
   * ``SessionTreeProvider`` is registered in ``extension.ts`` inside the
     ``if (sessions.enabled)`` block, same pattern as Projects/Events.
   * **Design rationale (REQ_SES_OPENCONTEXT):** No change to
     ``jarvis.openContext`` was needed because both project and session tree
     nodes pass ``{ folder: <dir> }`` as the command argument.


.. spec:: sessions-feature: newEntity Command — Session Branch
   :id: SPEC_SES_NEWENTITY
   :status: implemented
   :links: REQ_SES_NEWENTITY

   **Description:**
   Two commands implement session creation. ``jarvis.newSession`` is the actual
   implementation; ``jarvis.newEntity`` is a unified QuickPick that delegates to it.

   **``jarvis.newSession`` command** (``src/extension.ts`` newSessionCommand):

   1. Call ``configPaths.ensureSessionsDir()`` to get the fixed sessions path
      (``<workspaceRoot>/.jarvis/sessions/``), creating the directory if absent.
   2. If the return value is ``undefined`` (no workspace open) → show
      ``vscode.window.showWarningMessage('Jarvis: No workspace open.')`` and abort.
   3. Prompt for ``name`` (required, non-empty). Abort if the user cancels or
      provides an empty string.
   4. Prompt for ``summary`` (optional). Empty string is valid.
   5. Slug the name: convert to lowercase, replace every run of non-alphanumeric
      characters with a single ``-``, trim leading/trailing ``-``.
   6. Construct ``<ensureSessionsDir()>/<slug>/``.
   7. Write ``session.yaml``::

          name: <original name>
          summary: <summary>

   8. Write ``context.md``::

          # <original name>

          <summary>

   9. Call ``scanner.rescan()`` so the new session appears in the tree
      immediately (no window reload required).
   10. Execute ``jarvis.openAgentSession`` with a synthetic ``LeafNode`` whose
       ``id`` equals ``<targetPath>/session.yaml``, so the new session chat opens
       automatically::

          await vscode.commands.executeCommand(
              'jarvis.openAgentSession',
              { kind: 'leaf', id: `${targetPath}/session.yaml` }
          );

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


.. spec:: sessions-feature: session.schema.json and yamlValidation Entry
   :id: SPEC_SES_SCHEMA
   :status: implemented
   :links: REQ_SES_SCHEMA

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


.. spec:: sessions-feature: jarvis_listSessionEntities Tool Registration
   :id: SPEC_SES_TOOLS
   :status: implemented
   :links: REQ_SES_LISTTOOL

   **Description:**
   Register ``jarvis_listSessionEntities`` via ``registerDualTool()`` in
   ``src/extension.ts``, inside the ``if (sessions.enabled)`` activation block.

   **Handler sketch** (``extension.ts``):

   .. code-block:: typescript

      const listSessionEntitiesTool = registerDualTool(
          'jarvis_listSessionEntities',
          async (
              _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
              _token: vscode.CancellationToken
          ) => {
              const sessions = scanner?.entities
                  .filter(e => e.kind === 'session')
                  .map(e => ({ name: e.name, summary: e.summary ?? '', folder: e.folder })) ?? [];
              log.info(`[SES] listSessionEntities: ${sessions.length} session(s)`);
              return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(JSON.stringify({ sessions }))
              ]);
          },
          'Returns the list of session entities configured in the current Jarvis workspace. Each session has a name, summary, and folder path.',
          {},
          async () => {
              const sessions = scanner?.entities
                  .filter(e => e.kind === 'session')
                  .map(e => ({ name: e.name, summary: e.summary ?? '', folder: e.folder })) ?? [];
              log.info(`[SES] listSessionEntities(MCP): ${sessions.length} session(s)`);
              return { sessions };
          }
      );

   **``package.json`` ``contributes.languageModelTools`` entry:**

   .. code-block:: json

      {
        "name": "jarvis_listSessionEntities",
        "displayName": "List Session Entities",
        "modelDescription": "Returns the list of session entities configured in the current Jarvis workspace. Each session has a name, summary, and folder path.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "listSessionEntities",
        "icon": "$(list-unordered)",
        "inputSchema": {
          "type": "object",
          "properties": {}
        }
      }


.. spec:: sessions-feature: package.json Manifest Changes
   :id: SPEC_SES_MANIFEST
   :status: implemented
   :links: REQ_SES_TOGGLE; REQ_SES_TREE; REQ_SES_NEWENTITY

   **Description:**
   All ``package.json`` structural changes required by this CR. No new named
   commands are added (``jarvis.newEntity`` is shared; ``jarvis_listSessionEntities``
   is a tool).

   **1. ``contributes.configuration`` — Sessions group**:

   The Sessions group contains only ``jarvis.sessions.enabled``. Paths are
   fixed under ``.jarvis/sessions/`` (no folder setting):

   .. code-block:: json

      {
        "title": "Sessions",
        "properties": {
          "jarvis.sessions.enabled": {
            "type": "boolean",
            "default": true,
            "description": "Enable the Sessions feature. When false, no Sessions tree view, commands, or tools are registered."
          }
        }
      }

   **2. ``contributes.views.jarvis-explorer``** — insert ``jarvisSessions``
   between ``jarvisProjects`` and ``jarvisEvents``:

   .. code-block:: json

      {
        "id": "jarvisSessions",
        "name": "Sessions",
        "when": "config.jarvis.sessions.enabled == true"
      }

   **3. ``contributes.activationEvents``** — add ``onView:jarvisSessions``
   analogous to the existing ``onView:jarvisProjects`` and
   ``onView:jarvisEvents`` entries.

   **4. ``contributes.languageModelTools``** — add the
   ``jarvis_listSessionEntities`` entry (full detail in ``SPEC_SES_TOOLS``).

   **5. ``contributes.yamlValidation``** — add the ``session.yaml`` entry
   (full detail in ``SPEC_SES_SCHEMA``).

   **6. ``contributes.commands``** — add ``jarvis.newSession``:

   .. code-block:: json

      {
        "command": "jarvis.newSession",
        "title": "Jarvis: New Session",
        "icon": "$(add)"
      }

   **7. ``contributes.menus.view/title``** — add two entries for the
   ``jarvisSessions`` view:

   .. code-block:: json

      [
        {
          "command": "jarvis.newSession",
          "when": "view == jarvisSessions",
          "group": "navigation@1"
        },
        {
          "command": "jarvis.rescan",
          "when": "view == jarvisSessions",
          "group": "navigation@3"
        }
      ]

   **8. ``contributes.menus.commandPalette``** — hide ``jarvis.newSession``
   from the Command Palette (same pattern as ``jarvis.newProject`` /
   ``jarvis.newEvent``):

   .. code-block:: json

      { "command": "jarvis.newSession", "when": "false" }


.. spec:: sessions-feature: Session Tree-Node Context Menu
   :id: SPEC_SES_CONTEXTMENU
   :status: implemented
   :links: REQ_SES_CONTEXTMENU

   **Description:**
   Five ``view/item/context`` ``package.json`` menu entries extend the context
   menu for ``viewItem == jarvisSession`` leaf nodes. All five command
   implementations are unchanged; only their ``when``-clauses are extended.

   **``contributes.menus.view/item/context`` additions:**

   .. code-block:: json

      [
        {
          "command": "jarvis.openContext",
          "when": "viewItem == jarvisSession",
          "group": "inline"
        },
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

   **Notes:**

   * ``jarvis.openContext`` was already wired for ``jarvisSession`` (via the leaf
     node's default ``command``). The explicit ``view/item/context`` inline entry
     makes the inline icon appear like Projects/Events.
   * ``jarvis.openAgentSession`` is the new addition that enables one-click agent
     chat opening from a session node, analogous to project and event nodes.
   * The three context-actions entries (``revealInExplorer``, ``revealInOS``,
     ``openInTerminal``) bring Sessions to full parity with the EXP context-actions
     feature (``SPEC_EXP_CONTEXTACTIONS``).
   * File touchpoint: ``package.json`` ``contributes.menus.view/item/context``.
