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

   .. note::

      The ``item.command`` binding shown below is superseded by
      ``SPEC_SES_TREECLICK`` for ``jarvisSession`` items: the primary action is
      now ``jarvis.openAgentSession`` (open the agent chat), and ``context.md``
      access moves to an inline-icon menu entry. See ``SPEC_SES_TREECLICK`` for
      the current assignment.

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

   .. note::

      ``jarvis_createSession`` (``SPEC_SES_CREATETOOL``) uses the supplied name
      verbatim as the folder name — no slug transformation — to preserve
      round-trip consistency with ``jarvis_sendToSession``.  The two creation
      paths are intentionally asymmetric; see CR Decision 1 in
      ``docs/changes/create-session-tool.md``.


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
   ``src/extension.ts``, inside the ``if (cfg.get<boolean>('sessions.enabled', true))``
   activation block, mirroring the gating pattern of ``jarvis_createSession``
   (``SPEC_SES_CREATETOOL``).

   **Gating:**
   The tool is registered only when ``jarvis.sessions.enabled`` is ``true`` at
   activation time.  Disabling the feature removes the tool from both the LM
   tool catalog and the MCP tool catalog after extension reload.  Statically
   gated per ADR ``tool-deregistration.md`` — no runtime add/remove.

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

   * ``jarvis.openContext`` was already wired for ``jarvisSession`` (previously
     via the leaf node's default command; now via the inline
     ``view/item/context`` entry — see ``SPEC_SES_TREECLICK``). The explicit
     ``view/item/context`` inline entry makes the inline icon appear like
     Projects/Events.
   * ``jarvis.openAgentSession`` is the new addition that enables one-click agent
     chat opening from a session node, analogous to project and event nodes.
   * The three context-actions entries (``revealInExplorer``, ``revealInOS``,
     ``openInTerminal``) bring Sessions to full parity with the EXP context-actions
     feature (``SPEC_EXP_CONTEXTACTIONS``).
   * File touchpoint: ``package.json`` ``contributes.menus.view/item/context``.


.. spec:: jarvis_createSession: LM+MCP Tool Registration
   :id: SPEC_SES_CREATETOOL
   :status: implemented
   :links: REQ_SES_CREATETOOL

   **Description:**
   Register ``jarvis_createSession`` via ``registerDualTool()`` in
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
        - Short description written to ``session.yaml``
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

      const sessionsDir = configPaths.ensureSessionsDir();
      if (!sessionsDir) { throw new Error('jarvis_createSession: no workspace open'); }
      const targetPath = path.join(sessionsDir, name);
      if (fs.existsSync(targetPath)) {
          // Auto-open even on idempotent skip (AC-10)
          const leaf: LeafNode = { kind: 'leaf', id: path.join(targetPath, 'session.yaml') };
          try { await vscode.commands.executeCommand('jarvis.openAgentSession', leaf); }
          catch (e) { log.warn(`[SES] createSession: auto-open failed (idempotent): ${e}`); }
          return {
              created: false,
              reason: `session "${name}" already exists; no action taken`,
              path: `.jarvis/sessions/${name}`,
          };
      }

   **File layout after creation:**

   .. code-block:: text

      <workspaceRoot>/
        .jarvis/
          sessions/
            <name>/
              session.yaml    ← name field always; summary field when non-blank
              context.md      ← always; starts with "# <name>\n\n"

   **``session.yaml`` format** (mirrors ``jarvis.newSession`` command):

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
          appendMessage(resolveMessagesPath(), name, 'jarvis_createSession', initialMessage);
          messageProvider.reload();
      }

   ``destination`` = verbatim ``name``; ``sender`` = ``"jarvis_createSession"``.
   This is consistent with how ``jarvis_sendToSession`` targets sessions by name.

   **Rescan trigger:**

   .. code-block:: typescript

      await scanner?.rescan();

   Called unconditionally after successful creation (satisfies AC-3 / 2-second
   tree refresh requirement).

   **Auto-open** (AC-10, after rescan):

   .. code-block:: typescript

      const leaf: LeafNode = { kind: 'leaf', id: path.join(targetPath, 'session.yaml') };
      try { await vscode.commands.executeCommand('jarvis.openAgentSession', leaf); }
      catch (e) { log.warn(`[SES] createSession: auto-open failed: ${e}`); }

   Errors from ``openAgentSession`` MUST be caught and logged at ``warn`` level;
   they MUST NOT propagate as a tool failure.  The session folder already exists
   at this point; auto-open is best-effort.  The existing 5 s auto-delivery poll
   will subsequently deliver any queued ``initialMessage`` into the newly opened
   chat (satisfies AC-4 delivery path).

   **Response shapes:**

   *Created:*

   .. code-block:: json

      { "created": true, "path": ".jarvis/sessions/<name>" }

   *Already existed (idempotent):*

   .. code-block:: json

      {
        "created": false,
        "reason": "session \"<name>\" already exists; no action taken",
        "path": ".jarvis/sessions/<name>"
      }

   *Invalid name / no workspace:* thrown ``Error`` — surfaces as LM tool error
   or MCP error response; no JSON result object.

   **Registration sketch** (``src/extension.ts``, inside ``if (sessions.enabled)``):

   .. code-block:: typescript

      // Implementation: SPEC_SES_CREATETOOL
      // Requirements: REQ_SES_CREATETOOL
      const createSessionTool = registerDualTool(
          'jarvis_createSession',
          async (
              options: vscode.LanguageModelToolInvocationOptions<{
                  name: string;
                  summary?: string;
                  initialMessage?: string;
              }>,
              _token: vscode.CancellationToken
          ) => {
              const result = await createSession(options.input);
              log.info(`[SES] createSession: created=${result.created}, path=${result.path}`);
              return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(JSON.stringify(result))
              ]);
          },
          'Creates a new Jarvis session folder with session.yaml and context.md under <workspace>/.jarvis/sessions/<name>/. Idempotent: returns success if session already exists.',
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
              log.info(`[SES] createSession(MCP): created=${result.created}, path=${result.path}`);
              return result;
          }
      );

   The ``createSession`` helper encapsulates validation, idempotency check,
   file writes, ``initialMessage`` enqueue, and rescan trigger so the LM and MCP
   handler bodies share no duplicated logic.

   **``package.json`` ``contributes.languageModelTools`` entry:**

   .. code-block:: json

      {
        "name": "jarvis_createSession",
        "displayName": "Create Session",
        "modelDescription": "Creates a new Jarvis session folder with session.yaml and context.md. Idempotent: safe to call if the session already exists.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "createSession",
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
              "description": "Optional short description written to session.yaml."
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
   * ``package.json`` — add ``jarvis_createSession`` entry under
     ``contributes.languageModelTools``.


.. spec:: session-tree-click-behavior: Inverted Click Semantics and Inline Context Icon
   :id: SPEC_SES_TREECLICK
   :status: implemented
   :links: REQ_SES_TREECLICK; REQ_SES_TREE; REQ_SES_OPENCONTEXT

   **Description:**
   Change the default click action on ``jarvisSession`` tree items from
   ``jarvis.openContext`` to ``jarvis.openAgentSession``, and introduce a new
   command ``jarvis.openSessionContext`` exposed as an inline icon so the
   ``context.md`` open action remains one click away.

   **1. ``src/sessionTreeProvider.ts`` --- ``getTreeItem()`` change**

   Replace the ``command`` binding on the session leaf ``TreeItem``:

   .. code-block:: typescript

      // Before (SPEC_SES_TREE -- implemented):
      item.command = {
          command: 'jarvis.openContext',
          title: 'Open Context',
          arguments: [element],
      };

      // After (SPEC_SES_TREECLICK):
      item.command = {
          command: 'jarvis.openAgentSession',
          title: 'Open Agent Session',
          arguments: [element],
      };

   No other changes to ``SessionTreeProvider``.

   **2. ``src/extension.ts`` --- new ``jarvis.openSessionContext`` command**

   Register a new command (inside the sessions-enabled activation block,
   adjacent to the existing ``jarvis.openContext`` registration):

   .. code-block:: typescript

      // Implementation: SPEC_SES_TREECLICK
      // Requirements: REQ_SES_TREECLICK
      const openSessionContextCommand = vscode.commands.registerCommand(
          'jarvis.openSessionContext',
          async (element: LeafNode) => {
              const sessionDir = path.dirname(element.id);
              const contextPath = path.join(sessionDir, 'context.md');

              if (!fs.existsSync(contextPath)) {
                  // Resilience: create context.md on the fly (AC-6)
                  const entity = scanner?.getEntity(element.id);
                  const sessionName = entity?.name ?? path.basename(sessionDir);
                  try {
                      await fs.promises.writeFile(
                          contextPath,
                          '# ' + sessionName + '\n\n',
                          'utf-8'
                      );
                      log.info('[OpenSessionContext] created missing context.md for "' + sessionName + '"');
                  } catch (err) {
                      vscode.window.showErrorMessage(
                          'Jarvis: Could not create context.md -- ' + err
                      );
                      return;
                  }
              }

              await vscode.window.showTextDocument(
                  vscode.Uri.file(contextPath),
                  { preview: false }
              );
          }
      );

   Add ``openSessionContextCommand`` to the ``context.subscriptions.push(...)``
   call alongside the other session commands.

   **Rationale:** A new command id is introduced rather than reusing the previous
   ``jarvis.openContext`` binding. The previous binding's default semantics (the
   TreeView item primary action) is exactly what this CR reverts; keeping it for
   the inline icon would invite confusion about which behaviour belongs to which
   trigger. A dedicated command also gives the menu wiring a stable, named target
   if future CRs evolve either action independently.

   **3. ``package.json`` --- command registration and menu wiring**

   Add to ``contributes.commands``:

   .. code-block:: json

      {
        "command": "jarvis.openSessionContext",
        "title": "Jarvis: Open Session Context",
        "shortTitle": "Open context.md",
        "icon": "$(book)"
      }

   VS Code uses ``shortTitle`` (when present) as the inline-icon tooltip on
   ``view/item/context`` menu entries, falling back to ``title`` when absent.
   This is what makes ``REQ_SES_TREECLICK`` AC-3 verifiable.

   Add to ``contributes.menus.commandPalette`` (hide from palette; icon-only
   action):

   .. code-block:: json

      { "command": "jarvis.openSessionContext", "when": "false" }

   Add to ``contributes.menus.view/item/context`` (renders as inline icon button
   on each ``jarvisSession`` tree item):

   .. code-block:: json

      {
        "command": "jarvis.openSessionContext",
        "when": "view == jarvisSessions && viewItem == jarvisSession",
        "group": "inline"
      }

   The ``view ==`` segment defensively scopes the inline icon to the Sessions
   Tree only, preventing accidental rendering if the ``jarvisSession``
   contextValue is ever reused elsewhere.

   ``view/item/context`` with ``group: "inline"`` is the only valid VS Code
   contribution point for per-item inline tree actions; ``view/item/title`` is
   silently ignored by VS Code in this position.

   **4. Codicon choice: ``$(book)``**

   ``$(book)`` (notebook/memory feel) was selected per PM preference.
   ``context.md`` is the session's persistent memory file, so a book/notebook
   glyph is semantically accurate and immediately recognisable. It is visually
   distinct from ``$(file)`` (generic file) and from ``$(comment-discussion)``
   (chat), and requires no custom SVG asset.

   **5. Legacy resilience (AC-6)**

   The defensive ``context.md`` creation pattern mirrors ``newSessionCommand``
   in ``src/extension.ts``. The file is created only on demand (when the inline
   icon is clicked), not eagerly on tree load, so legacy sessions remain
   unmodified until the user actively opens the context.

   **6. Existing context-menu entries --- no change**

   ``SPEC_SES_CONTEXTMENU`` is not touched. The five existing
   ``view/item/context`` entries (``jarvis.openContext``,
   ``jarvis.openAgentSession``, ``jarvis.revealInExplorer``,
   ``jarvis.revealInOS``, ``jarvis.openInTerminal``) are preserved as-is.
   The inline ``jarvis.openContext`` context-menu entry continues to work,
   giving power users two paths to ``context.md``.

   **File touchpoints:**

   * ``src/sessionTreeProvider.ts`` --- ``item.command`` in ``getTreeItem()``.
   * ``src/extension.ts`` --- new ``openSessionContextCommand`` registration
     (inside the ``if (sessions.enabled)`` activation block).
   * ``package.json`` --- ``contributes.commands``,
     ``contributes.menus.commandPalette``, ``contributes.menus.view/item/context``.
   * No new SVG files required.
