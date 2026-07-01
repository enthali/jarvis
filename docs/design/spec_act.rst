Sessions Design Specifications
================================

.. spec:: sessions-feature: SessionTreeProvider Module
   :id: SPEC_ACT_TREE
   :status: implemented
   :links: REQ_ACT_TREE; REQ_ACT_OPENCONTEXT; SPEC_ENT_ENTITY_FILE_CHILDREN

   **Description:**
   New module ``src/sessionTreeProvider.ts`` — a slimmed clone of
   ``src/projectTreeProvider.ts``. It consumes ``YamlScanner.getSessionTree()``
   and renders session leaf nodes.

   **Skeleton** (``src/sessionTreeProvider.ts``):

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

      // Implementation: SPEC_ACT_TREE
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
     command is needed.
   * ``SessionTreeProvider`` is registered in ``extension.ts`` inside the
     ``if (sessions.enabled)`` block, same pattern as Projects/Events.
   * **Design rationale (REQ_ACT_OPENCONTEXT):** No change to
     ``jarvis.openContext`` was needed because both project and session tree
     nodes pass ``{ folder: <dir> }`` as the command argument.


.. spec:: sessions-feature: newEntity Command — Session Branch
   :id: SPEC_ACT_NEWENTITY
   :status: draft
   :links: REQ_ACT_NEWENTITY

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
   6. Construct ``<ensureSessionsDir()>/<name>/`` (``name`` used verbatim—no
      transformation).
   7. Write ``session.yaml``::

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

      Both ``jarvis.newSession`` and ``jarvis_createSession``
      (``SPEC_ACT_CREATETOOL``) now use the session name verbatim as the folder
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


.. spec:: sessions-feature: jarvis_listSessionEntities Tool Registration
   :id: SPEC_ACT_TOOLS
   :status: draft
   :links: REQ_ACT_LISTTOOL

   **Description:**
   Register ``jarvis_listSessions`` (renamed from ``jarvis_listSessionEntities``)
   via ``registerDualTool()`` in ``src/extension.ts``, inside the
   ``if (cfg.get<boolean>('sessions.enabled', true))`` activation block,
   mirroring the gating pattern of ``jarvis_createSession``
   (``SPEC_ACT_CREATETOOL``).

   **Gating:**
   The tool is registered only when ``jarvis.sessions.enabled`` is ``true`` at
   activation time.  Disabling the feature removes the tool from both the LM
   tool catalog and the MCP tool catalog after extension reload.  Statically
   gated per ADR ``tool-deregistration.md`` — no runtime add/remove.

   **Handler sketch** (``extension.ts``):

   .. code-block:: typescript

      const listSessionsTool = registerDualTool(
          'jarvis_listSessions',
          async (
              _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
              _token: vscode.CancellationToken
          ) => {
              const sessions = scanner?.entities
                  .filter(e => e.kind === 'session')
                  .map(e => ({ name: e.name, summary: e.summary ?? '', folder: e.folder, agent: e.agent ?? '' })) ?? [];
              log.info(`[SES] listSessions: ${sessions.length} session(s)`);
              return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(JSON.stringify({ sessions }))
              ]);
          },
          'Lists all Jarvis session entities (lightweight projects) discovered under <workspace>/.jarvis/sessions/. Each entry has name, summary, folder, and agent (empty string when no binding set). Distinct from jarvis_listChatSessions which lists VS Code chat tab titles.',
          {},
          async () => {
              const sessions = scanner?.entities
                  .filter(e => e.kind === 'session')
                  .map(e => ({ name: e.name, summary: e.summary ?? '', folder: e.folder, agent: e.agent ?? '' })) ?? [];
              log.info(`[SES] listSessions(MCP): ${sessions.length} session(s)`);
              return { sessions };
          }
      );

   **``package.json`` ``contributes.languageModelTools`` entry:**

   .. code-block:: json

      {
        "name": "jarvis_listSessions",
        "displayName": "List Session Entities",
        "modelDescription": "Lists all Jarvis session entities (lightweight projects) discovered under <workspace>/.jarvis/sessions/. Each entry has name, summary, folder, and agent (empty string when no binding set). Distinct from jarvis_listChatSessions which lists VS Code chat tab titles.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "listSessions",
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
   ``jarvis_listSessionEntities`` entry (full detail in ``SPEC_ACT_TOOLS``).

   **5. ``contributes.yamlValidation``** — add the ``session.yaml`` entry
   (full detail in ``SPEC_ACT_SCHEMA``).

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
   :id: SPEC_ACT_CONTEXTMENU
   :status: implemented
   :links: REQ_ACT_CONTEXTMENU

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
     ``view/item/context`` entry — see ``SPEC_ACT_TREECLICK``). The explicit
     ``view/item/context`` inline entry makes the inline icon appear like
     Projects/Events.
   * ``jarvis.openAgentSession`` is the new addition that enables one-click agent
     chat opening from a session node, analogous to project and event nodes.
   * The three context-actions entries (``revealInExplorer``, ``revealInOS``,
     ``openInTerminal``) bring Sessions to full parity with the EXP context-actions
     feature (``SPEC_ENT_CONTEXTACTIONS``).
   * File touchpoint: ``package.json`` ``contributes.menus.view/item/context``.


.. spec:: jarvis_createSession: LM+MCP Tool Registration
   :id: SPEC_ACT_CREATETOOL
   :status: implemented
   :links: REQ_ACT_CREATETOOL

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

      // Implementation: SPEC_ACT_CREATETOOL
      // Requirements: REQ_ACT_CREATETOOL
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
   :id: SPEC_ACT_TREECLICK
   :status: implemented
   :links: REQ_ACT_TREECLICK; REQ_ACT_TREE; REQ_ACT_OPENCONTEXT

   **Description:**
   Change the default click action on ``jarvisSession`` tree items from
   ``jarvis.openContext`` to ``jarvis.openAgentSession``, and introduce a new
   command ``jarvis.openSessionContext`` exposed as an inline icon so the
   ``context.md`` open action remains one click away.

   **1. ``src/sessionTreeProvider.ts`` --- ``getTreeItem()`` change**

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

   No other changes to ``SessionTreeProvider``.

   **2. ``src/extension.ts`` --- new ``jarvis.openSessionContext`` command**

   Register a new command (inside the sessions-enabled activation block,
   adjacent to the existing ``jarvis.openContext`` registration):

   .. code-block:: typescript

      // Implementation: SPEC_ACT_TREECLICK
      // Requirements: REQ_ACT_TREECLICK
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
   This is what makes ``REQ_ACT_TREECLICK`` AC-3 verifiable.

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

   ``SPEC_ACT_CONTEXTMENU`` is not touched. The five existing
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


.. spec:: session-agent-binding: jarvis_createSession Agent Parameter
   :id: SPEC_ACT_AGENT_CREATETOOL
   :status: draft
   :links: REQ_ACT_AGENT_CREATETOOL; REQ_ACT_AGENT_VALIDATION; SPEC_ACT_CREATETOOL; SPEC_ACT_AGENT_DISCOVERY

   **Description:**
   Extend ``jarvis_createSession`` to accept an optional ``agent`` parameter,
   validate it against the discovered agent set, and write it to
   ``session.yaml`` when valid.

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

   **Updated ``package.json`` input schema** for ``jarvis_createSession``:

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
   * ``package.json`` — add ``agent`` to ``jarvis_createSession``
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
