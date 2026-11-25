Message Queue Design Specifications
=====================================

.. spec:: Message Queue File Store
   :id: SPEC_MSG_QUEUESTORE
   :status: implemented
   :links: REQ_MSG_QUEUE; REQ_CFG_FIXEDPATHS; REQ_CFG_MSGDIR; REQ_CFG_STATEMIGRATION

   **Description:**
   Module ``src/messageQueue.ts`` provides synchronous file-backed read/write/delete
   operations on the JSON message queue at ``.jarvis/messages/queue.json``.
   The file path is resolved by
   ``configPaths.getMessagesPath()`` (see ``SPEC_CFG_PATHRESOLVER``). If that
   function returns ``undefined`` (no workspace open), reads return an empty list
   and writes are silently skipped. The ``.jarvis/messages/`` parent directory is
   created on first write via ``configPaths.ensureMessagesDir()``.

   **(GH #59)** ``readQueue`` unions the superseded ``.jarvis/messages.json``
   into its result, and the write paths remove that file once the union has been
   persisted (``SPEC_CFG_STATEMIGRATION``).

   **Data type:**

   .. code-block:: typescript

      interface QueuedMessage {
        destination: string; // target chat tab label
        sender: string;      // originating session or component
        text: string;        // message content
        timestamp: string;   // ISO 8601
      }

   **Public API:**

   .. code-block:: typescript

      function readQueue(filePath: string): QueuedMessage[] {
        // (GH #59) Union with the superseded flat path — SPEC_CFG_STATEMIGRATION.
        // Identity: destination + sender + text + timestamp; ordered by timestamp.
        const current = readFileOrEmpty(filePath);
        const legacy = readFileOrEmpty(configPaths.getLegacyMessagesPath());
        return unionByIdentity(current, legacy);
      }

      function readFileOrEmpty(filePath: string | undefined): QueuedMessage[] {
        if (!filePath || !fs.existsSync(filePath)) return [];
        try {
          const raw = fs.readFileSync(filePath, 'utf8');
          return JSON.parse(raw) as QueuedMessage[];
        } catch {
          return [];
        }
      }

      function appendMessage(
        filePath: string,
        destination: string,
        sender: string,
        text: string
      ): void {
        const queue = readQueue(filePath);
        queue.push({ destination, sender, text, timestamp: new Date().toISOString() });
        writeQueue(filePath, queue);
      }

      /** Single write path: persists the union, then retires the superseded file. */
      function writeQueue(filePath: string, queue: QueuedMessage[]): void {
        configPaths.ensureMessagesDir();
        fs.writeFileSync(filePath, JSON.stringify(queue, null, 2));
        const legacy = configPaths.getLegacyMessagesPath();
        if (legacy && fs.existsSync(legacy)) {
          try { fs.unlinkSync(legacy); } catch { /* best-effort, REQ_CFG_STATEMIGRATION AC-5 */ }
        }
      }

      function deleteMessage(
        filePath: string,
        index: number
      ): void {
        const queue = readQueue(filePath);
        queue.splice(index, 1);
        writeQueue(filePath, queue);
      }

      function deleteByDestination(
        filePath: string,
        destination: string
      ): void {
        const queue = readQueue(filePath).filter(m => m.destination !== destination);
        writeQueue(filePath, queue);
      }

      function popMessage(
        filePath: string,
        destination: string
      ): { message: QueuedMessage | null; remaining: number } {
        const queue = readQueue(filePath);
        const idx = queue.findIndex(m => m.destination === destination);
        if (idx === -1) { return { message: null, remaining: 0 }; }
        const [message] = queue.splice(idx, 1);
        const remaining = queue.filter(m => m.destination === destination).length;
        writeQueue(filePath, queue);
        return { message, remaining };
      }

   **Index stability under the union (GH #59).**
   ``deleteMessage`` addresses an entry by its position in the list returned by
   ``readQueue``. Once ``readQueue`` returns a union, that position is only
   meaningful if every caller sees the same ordering — hence the deterministic
   ``timestamp`` ordering fixed by ``SPEC_CFG_STATEMIGRATION`` rather than
   file-concatenation order. A view that listed entries in one order while
   ``deleteMessage`` indexed another would delete the wrong message, and would
   do so only in workspaces still holding a superseded file. This is the one
   place where the union is not transparent to callers, so it is stated here
   rather than left to be discovered.


.. spec:: Message Tree Data Provider
   :id: SPEC_MSG_TREEPROVIDER
   :status: implemented
   :links: REQ_MSG_EXPLORER; REQ_MSG_DELETE; REQ_EXP_TREEVIEW; SPEC_MSG_QUEUESTORE; SPEC_MSG_EDITORPLACEMENT

   **Description:**
   Class ``MessageTreeProvider`` in ``src/messageTreeProvider.ts`` implements
   ``vscode.TreeDataProvider<MessageNode>`` for the "Messages" tree view.

   **Node types:**

   .. code-block:: typescript

      type MessageNode = SessionGroupNode | MessageLeafNode | EmptyNode;

      interface SessionGroupNode {
        kind: 'session';
        label: string;       // e.g. "My Session (3)"
        destination: string; // raw destination name
        children: MessageLeafNode[];
      }

      interface MessageLeafNode {
        kind: 'message';
        destination: string;
        sender: string;
        text: string;
        index: number;     // position in the flat queue array
      }

      interface EmptyNode {
        kind: 'empty';
      }

   **getChildren(element?):**

   * No element (root):

     1. Read queue via ``readQueue(filePath)``
     2. Group by ``destination`` → produce ``SessionGroupNode[]``
     3. If empty → return single ``EmptyNode``

   * ``SessionGroupNode`` → return ``element.children``
   * ``MessageLeafNode`` / ``EmptyNode`` → return ``[]``

   **getTreeItem(element):**

   * ``SessionGroupNode`` → collapsible, label = ``"${destination} (${count})"``,
     contextValue = ``'messageSession'`` (enables send button).
     **``ui-improvements`` CR**: ``item.command`` is set to
     ``jarvis.openMessageActorChat``, which shows the chat of the Actor when it
     exists (``REQ_COM_OPEN`` AC-3, ``SPEC_COM_OPEN``). The former handler that
     resolved the destination to a session UUID is removed
     (``retire-legacy-session-lookup`` CR).
   * ``MessageLeafNode`` → non-collapsible, label = truncated text (max 80 chars),
     contextValue = ``'messageItem'`` (enables trash button)
   * ``EmptyNode`` → non-collapsible, label = ``"nothing to deliver"``

   **Inline actions (``package.json`` menus):**

   * ``view/item/context`` when ``viewItem == messageSession``:
     ``jarvis.sendMessages`` (icon: ``$(debug-start)``)
   * ``view/item/context`` when ``viewItem == messageItem``:
     ``jarvis.deleteMessage`` (icon: ``$(trash)``)

   **reload():**

   Re-read queue file and call ``this._onDidChangeTreeData.fire(undefined)``
   to refresh the entire tree. Called after queue mutations and setting changes.


.. spec:: MCP Server Module
   :id: SPEC_MSG_MCPSERVER
   :status: implemented
   :links: REQ_MSG_MCPSERVER; SPEC_MOD_MCP_PKG; SPEC_ENG_TOOLREGISTRY

   **Description:**
   The module ``packages/mcp/src/mcpServer.ts`` is the MCP transport. It serves
   the tools of the shared Jarvis tool registry (``SPEC_ENG_TOOLREGISTRY``) with
   ``@modelcontextprotocol/sdk`` and ``StreamableHTTPServerTransport`` on
   ``127.0.0.1`` at the configured port. The package that hosts it, its
   activation, settings and status bar item are specified in
   ``SPEC_MOD_MCP_PKG``. The module registers no tools of its own.

   **Public API:**

   .. code-block:: typescript

      export interface McpToolDescriptor {
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;  // JSON Schema from the manifest
        invoke(args: Record<string, unknown>): Promise<object>;
      }

      export type ToolProvider = () => McpToolDescriptor[];

      export async function startMcpServer(
        port: number,
        log: vscode.LogOutputChannel,
        toolProvider: ToolProvider
      ): Promise<void>;

      export async function stopMcpServer(): Promise<void>;

   **Security:**

   * Server binds exclusively to ``127.0.0.1`` — no external access
   * No authentication required for localhost-only access

   **Design notes:**

   * The tool list is not collected at start. ``toolProvider`` is called on every
     request, so a tool registered or disposed later shows up on the next call.
     The provider is built from the registry and the manifest ``inputSchema``
     of each tool (``SPEC_MOD_MCP_PKG``).
   * **Stateless mode**: ``sessionIdGenerator: undefined`` means each POST
     request creates a fresh ``McpServer`` with the current tools and a fresh
     ``StreamableHTTPServerTransport``, which is closed when the response ends.
   * Each tool handler returns its result as a JSON text content item
   * The manifest ``inputSchema`` is converted to a ``zod`` shape for the SDK
     (top-level properties only)
   * ``startMcpServer()`` accepts a ``LogOutputChannel`` for structured
     ``[MCP]`` log output
   * Only POST is accepted; other methods receive 405
   * ``stopMcpServer()`` is called when the MCP extension deactivates


.. spec:: Auto-Delivery Config Store
   :id: SPEC_MSG_AUTODELIVER_STORE
   :status: implemented
   :links: REQ_MSG_AUTODELIVER_CONFIG; SPEC_MSG_QUEUESTORE; REQ_CFG_PATHSINGLESOURCE

   **Description:**
   Helper functions in ``src/messageQueue.ts`` (or a dedicated
   ``src/autoDelivery.ts`` module) manage the auto-delivery list at
   ``.jarvis/messages/autodelivery.json``.
   The file is a flat JSON array of destination name strings.

   **Path resolution (GH #59):**

   .. code-block:: typescript

      import * as configPaths from './configPaths';
      // configPaths.getAutoDeliveryPath() — no derivation from the queue path.

   The path was previously derived as
   ``path.join(path.dirname(messagesPath), 'autodelivery.json')``. After
   ``REQ_CFG_MSGDIR`` that derivation still lands on the correct path, which is
   why it is called out rather than quietly replaced: it would have passed every
   test while keeping "this file sits next to the queue" as a live assumption,
   and the next relocation would break it silently. The functions therefore take
   their own resolved path, not the queue's
   (``REQ_CFG_PATHSINGLESOURCE`` AC-2).

   **Public API:**

   .. code-block:: typescript

      function readAutoDelivery(filePath: string | undefined): string[] {
        if (!filePath || !fs.existsSync(filePath)) { return []; }
        try {
          const raw = fs.readFileSync(filePath, 'utf8');
          return JSON.parse(raw) as string[];
        } catch {
          log.warn('[MSG] autodelivery list malformed — falling back to empty list');
          return [];
        }
      }

      function addAutoDelivery(filePath: string | undefined, destination: string): void {
        if (!filePath) { return; }
        const list = readAutoDelivery(filePath);
        if (!list.includes(destination)) {
          list.push(destination);
          configPaths.ensureMessagesDir();
          fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
        }
      }

      function removeAutoDelivery(filePath: string | undefined, destination: string): void {
        if (!filePath) { return; }
        const list = readAutoDelivery(filePath).filter(d => d !== destination);
        fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
      }

   **Design notes:**

   * The signature change from ``messagesPath`` to the file's own path is the
     substance of the fix. Passing the queue path and deriving inside is what
     made the queue's location an input to three unrelated files.
   * Reads participate in the union described by ``SPEC_CFG_STATEMIGRATION``
     (identity = the session name, so the union is a plain set union).
   * ``log`` is the shared ``LogOutputChannel`` passed through or accessible
     via module scope


.. spec:: Notified Flag on QueuedMessage
   :id: SPEC_MSG_AUTODELIVER_TAG
   :status: implemented
   :links: REQ_MSG_AUTODELIVER_TAG; SPEC_MSG_QUEUESTORE

   **Description:**
   Extend the ``QueuedMessage`` interface in ``src/messageQueue.ts`` with an
   optional ``notified`` field. Add a ``writeQueue`` helper so the poll loop
   can persist the updated queue after tagging.

   **Updated interface:**

   .. code-block:: typescript

      export interface QueuedMessage {
        destination: string; // target chat tab label
        sender: string;      // originating session or component
        text: string;        // message content
        timestamp: string;   // ISO 8601
        notified?: boolean;  // true after auto-delivery notification
      }

   **New helper:**

   .. code-block:: typescript

      export function writeQueue(filePath: string, queue: QueuedMessage[]): void {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(queue, null, 2));
      }

   **Design notes:**

   * ``notified`` is absent on existing messages and on all messages written by
     ``appendMessage`` — the field is only set by the poll loop
   * ``writeQueue`` is intentionally minimal; all mutation logic stays in the
     poll loop so the helper has no side-effects
   * No change to ``popMessage``, ``deleteMessage``, or ``appendMessage``


.. spec:: Auto-Delivery Message Tree Provider
   :id: SPEC_MSG_AUTODELIVER_TREE
   :status: implemented
   :links: REQ_MSG_AUTODELIVER_TREE; REQ_MSG_AUTODELIVER_CMDS; SPEC_MSG_TREEPROVIDER; SPEC_MSG_AUTODELIVER_STORE

   **Description:**
   Restructure ``MessageTreeProvider`` in ``src/messageTreeProvider.ts`` to
   separate manual sessions from auto-delivery sessions. A new
   ``AutoDeliveryGroupNode`` appears as a fixed root entry. The provider
   receives a ``resolveAutoDeliveryPath`` helper (or the ``messagesPath``
   resolver) so it can read the auto-delivery list.

   **Extended node types:**

   .. code-block:: typescript

      interface AutoDeliveryGroupNode {
        kind: 'autoDeliveryGroup';
        children: SessionGroupNode[];
      }

      // Updated SessionGroupNode — adds contextValue discriminator
      interface SessionGroupNode {
        kind: 'session';
        label: string;
        destination: string;
        children: MessageLeafNode[];
        contextValue: 'jarvisSessionManual' | 'jarvisSessionAutoDeliver';
      }

      type MessageNode =
        | AutoDeliveryGroupNode
        | SessionGroupNode
        | MessageLeafNode
        | EmptyNode;

   **getChildren(element?) — root level:**

   1. Read queue via ``readQueue(messagesPath)``.
   2. Read auto-delivery list via ``readAutoDelivery(messagesPath)``.
   3. For each destination in the queue NOT in the auto-delivery list → produce
      a ``SessionGroupNode`` with ``contextValue: 'jarvisSessionManual'``.
   4. If no manual sessions → return single ``EmptyNode`` followed by the
      ``AutoDeliveryGroupNode``.
   5. Always append one ``AutoDeliveryGroupNode`` to the root result.

   **getChildren(AutoDeliveryGroupNode):**

   For each destination in the auto-delivery list, produce a
   ``SessionGroupNode`` with ``contextValue: 'jarvisSessionAutoDeliver'``.
   The ``children`` array is populated from the queue for that destination
   (may be empty — ``(0)`` is shown).

   **getTreeItem updates:**

   * ``AutoDeliveryGroupNode`` → collapsible, label ``"Auto Delivery"``,
     iconPath ``new vscode.ThemeIcon('zap')``, no contextValue
   * ``SessionGroupNode`` with ``contextValue: 'jarvisSessionManual'`` →
     contextValue = ``'jarvisSessionManual'``
   * ``SessionGroupNode`` with ``contextValue: 'jarvisSessionAutoDeliver'`` →
     contextValue = ``'jarvisSessionAutoDeliver'``

   **package.json inline actions:**

   .. code-block:: json

      {
        "view/item/context": [
          {
            "command": "jarvis.sendMessages",
            "when": "viewItem == jarvisSessionManual || viewItem == jarvisSessionAutoDeliver",
            "group": "inline"
          },
          {
            "command": "jarvis.enableAutoDelivery",
            "when": "viewItem == jarvisSessionManual",
            "group": "inline"
          },
          {
            "command": "jarvis.disableAutoDelivery",
            "when": "viewItem == jarvisSessionAutoDeliver",
            "group": "inline"
          },
          {
            "command": "jarvis.deleteMessage",
            "when": "viewItem == messageItem",
            "group": "inline"
          }
        ]
      }

   **Design notes:**

   * The ``AutoDeliveryGroupNode`` is always returned regardless of list size
     (satisfies ``REQ_MSG_AUTODELIVER_TREE AC-2``)
   * Sessions inside the Auto Delivery group still show the manual play button
     so the user can force an immediate delivery (``REQ_MSG_AUTODELIVER_TREE AC-7``)
   * The existing ``messageSession`` contextValue is replaced by
     ``jarvisSessionManual`` and ``jarvisSessionAutoDeliver`` — any existing
     ``when``-clause using ``messageSession`` must be updated accordingly


.. spec:: Enable / Disable Auto-Delivery Commands
   :id: SPEC_MSG_AUTODELIVER_CMDS
   :status: implemented
   :links: REQ_MSG_AUTODELIVER_CMDS; SPEC_MSG_AUTODELIVER_STORE; SPEC_MSG_AUTODELIVER_TREE

   **Description:**
   Register ``jarvis.enableAutoDelivery`` and ``jarvis.disableAutoDelivery`` in
   ``extension.ts``. Both commands accept a ``SessionGroupNode`` argument from
   the tree view context menu.

   **Handlers:**

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.enableAutoDelivery',
        (node?: SessionGroupNode) => {
          if (!node) { return; }
          addAutoDelivery(configPaths.getAutoDeliveryPath(), node.destination);
          messageProvider.reload();
        }
      );

      vscode.commands.registerCommand(
        'jarvis.disableAutoDelivery',
        (node?: SessionGroupNode) => {
          if (!node) { return; }
          removeAutoDelivery(configPaths.getAutoDeliveryPath(), node.destination);
          messageProvider.reload();
        }
      );

   **package.json ``contributes.commands``:**

   .. code-block:: json

      [
        {
          "command": "jarvis.enableAutoDelivery",
          "title": "Jarvis: Enable Direct Delivery",
          "icon": "$(zap)"
        },
        {
          "command": "jarvis.disableAutoDelivery",
          "title": "Jarvis: Disable Direct Delivery",
          "icon": "$(zap)"
        }
      ]

   **Design notes:**

   * Guards against missing node (command-palette invocation returns early)
   * ``messageProvider.reload()`` is sufficient — no ``vscode.window.showInformationMessage``
     needed; the tree update itself confirms the action
   * Disposables pushed to ``context.subscriptions``


.. spec:: Message Logging Setting Configuration
   :id: SPEC_MSG_LOGSETTING
   :status: implemented
   :links: REQ_MSG_LOGSETTING

   **Description:**
   Add ``jarvis.messages.logging`` to the ``Messages`` configuration group in
   ``package.json``.

   **package.json ``contributes.configuration``:**

   Add the following property to the ``Messages`` settings group:

   .. code-block:: json

      "jarvis.messages.logging": {
        "type": "boolean",
        "default": false,
        "description": "When enabled, every queued message is also appended to a persistent audit log at .jarvis/messages/log.json (never cleaned up by read/delete operations)."
      }


.. spec:: Message Audit Log Implementation
   :id: SPEC_MSG_AUDITLOG
   :status: implemented
   :links: REQ_MSG_AUDITLOG; REQ_MSG_LOGSETTING; SPEC_MSG_QUEUESTORE; SPEC_MSG_LOGSETTING; REQ_CFG_PATHSINGLESOURCE

   **Description:**
   Extend ``appendMessage()`` in ``src/messageQueue.ts`` to optionally append
   to the audit log at ``.jarvis/messages/log.json`` when
   ``jarvis.messages.logging`` is ``true``.

   **Log file path (GH #59):**

   Obtained from ``configPaths.getMessageLogPath()``. The previous internal
   helper derived it as
   ``path.join(path.dirname(messagesPath), 'message-log.json')``. That
   derivation is the one that fails *visibly* after ``REQ_CFG_MSGDIR``: it
   would land in the right directory under the superseded filename
   ``.jarvis/messages/message-log.json``, producing a second log that neither
   ``flow`` nor the log viewer reads.

   **Updated ``appendMessage()``:**

   .. code-block:: typescript

      export function appendMessage(
          filePath: string,
          destination: string,
          sender: string,
          text: string
      ): void {
          const entry: QueuedMessage = {
              destination, sender, text,
              timestamp: new Date().toISOString()
          };
          const queue = readQueue(filePath);
          queue.push(entry);
          configPaths.ensureMessagesDir();
          fs.writeFileSync(filePath, JSON.stringify(queue, null, 2));

          const loggingEnabled = vscode.workspace
              .getConfiguration('jarvis')
              .get<boolean>('messages.logging', false);
          if (loggingEnabled) {
              const logPath = configPaths.getMessageLogPath();
              if (!logPath) { return; }
              const log = readQueue(logPath);
              log.push(entry);
              fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
          }
      }

   **Design notes:**

   * The queue write and the log write both target ``.jarvis/messages/``, so the
     single ``ensureMessagesDir()`` above covers both; the log write needs no
     directory creation of its own. This remains a consequence of the two files
     being in the same directory — it is not a licence to derive one path from
     the other (``REQ_CFG_PATHSINGLESOURCE`` AC-2).
   * ``vscode.workspace.getConfiguration()`` is called live inside
     ``appendMessage()`` — no parameter change to the function signature; the
     setting is read on every call so hot-changes take effect immediately
   * ``readQueue(logPath)`` reuses the existing helper; returns ``[]`` safely if
     the file does not yet exist, creating it on first write
   * No changes to ``popMessage()``, ``deleteMessage()``, or
     ``deleteByDestination()`` — audit trail integrity is maintained by omission


.. spec:: Editor-Group Placement Helper
   :id: SPEC_MSG_EDITORPLACEMENT
   :status: implemented
   :links: REQ_MSG_EDITORPLACEMENT; SPEC_MSG_TREEPROVIDER

   **Description:**
   A set of helper functions in ``extension.ts`` computing the three
   placement targets (Main/Docs/Secondary) at call time from
   ``vscode.window.tabGroups.all`` — no persisted state. Validated on the
   throwaway spike branch ``experiment/editor-group-placement`` (6 test
   commands; reference only, never merged).

   **Note (ahp-mvp):**
   The code of these helpers is removed with the old chat UI path; a click on an
   Actor, the Play button and the automatic announcement follow
   ``SPEC_COM_OPEN`` and ``SPEC_COM_INBOX`` (see the note of
   ``REQ_MSG_EDITORPLACEMENT``). The Main and Secondary targets, the
   existing-tab lookup by label and the Messages tree group-node click below
   describe the removed behaviour; the Docs target remains in use by other
   features. The session UUID lookup that the existing-tab lookup and the
   Messages tree group-node click below relied on is retired as well
   (``retire-legacy-session-lookup`` CR).

   **Column constants:**

   .. code-block:: typescript

      const MAIN_COLUMN = vscode.ViewColumn.One;
      const DOCS_COLUMN = vscode.ViewColumn.Two; // aka "Content" column (message-flow-diagram CR)

   **Secondary column resolution (the runaway-column and Main-collision bug fixes):**

   .. code-block:: typescript

      function resolveSecondaryColumn(): vscode.ViewColumn {
          // Math.max(2, N) — NOT N alone, and NOT N + 1.
          // - N alone collapses Secondary into Main (column 1) when only 1
          //   column is open — Secondary and Main must never be the same
          //   column (confirmed regression found by PM in manual testing).
          // - N + 1 creates a brand-new column on every delivery (confirmed
          //   regression during spike validation).
          // The floor of 2 guarantees Secondary always splits at least
          // column 2 the first time; once 2+ columns exist, Secondary
          // reuses the existing last column, letting Secondary sessions
          // stack as tabs within the same group once 3+ columns exist.
          //
          // message-flow-diagram CR: the diagram Webview Panel is not a
          // chat tab or a plain file tab (no
          // .uri) — it is identified by viewType instead. It intentionally
          // is NOT excluded from tabGroups.all.length here: it occupies
          // column 2 (same as Docs/Content), so a workspace with only
          // Main+Content open still reports groupCount 2 either way, and
          // Math.max(2, ...) already floors at 2. No special-case filtering
          // is needed as long as the diagram panel is always opened at the
          // fixed CONTENT_COLUMN (REQ_MSG_EDITORPLACEMENT AC-11) rather than
          // via resolveSecondaryColumn() itself — it must never be treated
          // as a Secondary target.
          const groupCount = vscode.window.tabGroups.all.length;
          return Math.max(2, groupCount) as vscode.ViewColumn;
      }

   **Existing-tab lookup (shared by all 3 targets):**

   .. code-block:: typescript

      /** Finds an already-open tab for a chat session, by its label
       *  (chat tabs expose no .uri). */
      function findSessionTab(sessionName: string): vscode.Tab | undefined {
          for (const group of vscode.window.tabGroups.all) {
              for (const tab of group.tabs) {
                  if (tab.label === sessionName) { return tab; }
              }
          }
          return undefined;
      }

      /** Finds an already-open tab for a file, by comparing fsPath. */
      function findFileTab(filePath: string): vscode.Tab | undefined {
          for (const group of vscode.window.tabGroups.all) {
              for (const tab of group.tabs) {
                  const uri = (tab.input as { uri?: vscode.Uri } | undefined)?.uri;
                  if (uri?.fsPath === filePath) { return tab; }
              }
          }
          return undefined;
      }

   **Main-target open (user click — always column 1, close+reopen if elsewhere):**

   .. code-block:: typescript

      async function openAtMain(uri: vscode.Uri, sessionName: string): Promise<void> {
          const existing = findSessionTab(sessionName);
          if (existing && existing.group.viewColumn !== MAIN_COLUMN) {
              // AC-5: close the tab wherever it is, then reopen fresh at Main
              await vscode.window.tabGroups.close(existing);
          }
          await vscode.commands.executeCommand('vscode.open', uri, {
              preview: false,
              viewColumn: MAIN_COLUMN,
          });
      }

   **Docs-target open (always column 2, focus-in-place if already open elsewhere):**

   .. code-block:: typescript

      async function openAtDocs(uri: vscode.Uri, options?: { preview?: boolean }): Promise<void> {
          const existing = findFileTab(uri.fsPath);
          const viewColumn = existing ? existing.group.viewColumn : DOCS_COLUMN;
          await vscode.commands.executeCommand('vscode.open', uri, {
              preview: options?.preview ?? false,
              viewColumn,
          });
      }

   The message-flow diagram Webview Panel (``SPEC_FLOW_WEBVIEW``) uses the
   analogous ``vscode.window.createWebviewPanel(FLOW_VIEWTYPE, ..., DOCS_COLUMN, ...)``
   — always the fixed column, never routed through ``resolveSecondaryColumn()``.

   **Secondary-target open (system delivery — focus-in-place if open anywhere, else last column):**

   .. code-block:: typescript

      async function openAtSecondary(uri: vscode.Uri, sessionName: string): Promise<void> {
          const existing = findSessionTab(sessionName);
          const viewColumn = existing ? existing.group.viewColumn : resolveSecondaryColumn();
          await vscode.commands.executeCommand('vscode.open', uri, {
              preview: false,
              viewColumn,
          });
      }

   **Design notes:**

   * VS Code auto-materializes missing columns: requesting ``viewColumn: N``
     when fewer than ``N`` groups exist reliably creates the missing
     group(s) (confirmed across 1/2/3/4/5+ starting layouts on the spike).
   * Auxiliary (detached) windows remain part of ``tabGroups.all`` — no
     special-case handling needed; the close/reuse logic works transparently
     across window boundaries.
   * These helpers only ever act on tabs whose label matches a known session
     name or a known Actor file path — any file
     the user opens manually is entirely outside this contract.
   * ``openAtMain``/``openAtDocs``/``openAtSecondary`` replace ad-hoc
     ``vscode.open(uri, { preview: false })`` calls at their respective call
     sites (``SPEC_ACTOR_FILES``, ``SPEC_MSG_TREEPROVIDER``) — see each
     spec's updated handler.

   **Retired call site (``ui-improvements`` CR): Messages tree group-node click**

   The command ``jarvis.openMessageSession`` that opened the chat of a
   ``SessionGroupNode`` at Main through ``lookupSessionUUID`` and
   ``openAtMain`` no longer exists. The group-node click is
   ``jarvis.openMessageActorChat`` (``SPEC_MSG_TREEPROVIDER``,
   ``REQ_COM_OPEN`` AC-3); a click on a destination without a chat does
   nothing, deliberately: a label click is a lower-intent, exploratory action
   (unlike explicitly clicking "Play" to send), so it does not surprise the
   user with a brand-new chat.


.. spec:: Reminder Store Module
   :id: SPEC_MSG_REMINDERSTORE
   :status: implemented
   :links: REQ_MSG_REMINDERS_PERSIST; SPEC_MSG_QUEUESTORE; REQ_CFG_FIXEDPATHS; REQ_CFG_PATHSINGLESOURCE

   **Description:**
   The module ``packages/core/src/apps/session/reminders.ts`` provides
   synchronous file-backed read/write operations for the ``reminders.yaml``
   file. The file path is resolved by ``configPaths.getRemindersPath()``
   (``packages/core/src/engine/core/configPaths.ts``, see
   ``SPEC_CFG_PATHRESOLVER``); every caller passes it in as ``filePath``. The
   file lives at ``<workspaceRoot>/.jarvis/reminders.yaml``; it is not
   co-located by path derivation from the message queue — both paths are
   independently resolved by the central path resolver.

   **File format (reminders.yaml):**

   .. code-block:: yaml

      reminders:
        - id: "550e8400-e29b-41d4-a716-446655440000"
          text: "Review PR #42"
          session: "project-manager"
          deliverAt: "2026-05-18T15:00:00.000Z"
          createdAt: "2026-05-18T14:00:00.000Z"

   **Data type:**

   .. code-block:: typescript

      interface Reminder {
        id: string;          // UUID (crypto.randomUUID())
        text: string;        // message body
        session: string;     // target chat tab label
        deliverAt: string;   // ISO 8601 — delivery time
        createdAt: string;   // ISO 8601 — registration time
      }

   **Path resolution:**

   There is no path helper in the module. Callers (the poll loop, the tool
   handlers' ``remindersPath`` dependency, ``RemindersTreeProvider`` and the
   ``jarvis.cancelReminder`` / ``jarvis.openReminderFile`` commands) call
   ``configPaths.getRemindersPath() ?? ''`` and pass the result to the store;
   an empty path reads as an empty list (no workspace open).

   **Public API:**

   .. code-block:: typescript

      function readReminders(filePath: string): Reminder[] {
        if (!fs.existsSync(filePath)) { return []; }
        try {
          const raw = fs.readFileSync(filePath, 'utf8');
          const parsed = yaml.load(raw) as { reminders?: Reminder[] } | null;
          return parsed?.reminders ?? [];
        } catch {
          log?.warn('[MSG] reminders.yaml malformed — falling back to empty list');
          return [];
        }
      }

      function writeReminders(filePath: string, list: Reminder[]): void {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, yaml.dump({ reminders: list }));
      }

      function addReminder(
        filePath: string,
        text: string,
        session: string,
        deliverAt: string
      ): Reminder {
        const reminder: Reminder = {
          id: crypto.randomUUID(),
          text,
          session,
          deliverAt,
          createdAt: new Date().toISOString(),
        };
        const list = readReminders(filePath);
        list.push(reminder);
        writeReminders(filePath, list);
        return reminder;
      }

      function removeReminder(filePath: string, id: string): boolean {
        const list = readReminders(filePath);
        const next = list.filter(r => r.id !== id);
        if (next.length === list.length) { return false; }
        writeReminders(filePath, next);
        return true;
      }

      function popDueReminders(filePath: string, now: Date): Reminder[] {
        const list = readReminders(filePath);
        const due = list.filter(r => new Date(r.deliverAt) <= now);
        if (due.length === 0) { return []; }
        const remaining = list.filter(r => new Date(r.deliverAt) > now);
        writeReminders(filePath, remaining);
        return due;
      }

   **Dependencies:**

   * ``js-yaml`` (already a runtime dependency via ``actorScanner.ts``) —
     ``import * as yaml from 'js-yaml'``
   * Node.js built-in ``crypto.randomUUID()`` — no new dependency

   **Design notes:**

   * Path resolution is delegated to ``configPaths.getRemindersPath()``; the
     old ``resolveRemindersPath(messagesPath)`` helper (which derived the path
     from the queue file's directory) is replaced by this delegation.
     **This holds for every caller** — the store, the poll loop, the language
     model tools, the tree provider and any future consumer — not only for the
     call sites this element happens to name. The earlier wording named
     ``extension.ts`` as *the* caller; ``remindersTreeProvider.ts`` then kept
     the derivation, and nothing flagged it, because a spec that names one call
     site says nothing about the second (``REQ_CFG_PATHSINGLESOURCE`` AC-3).
     The helper itself is removed, so the derivation cannot be reintroduced by
     calling it.
   * ``reminders.yaml`` stays directly under ``.jarvis/`` after the message
     files move into ``.jarvis/messages/`` (``REQ_CFG_MSGDIR`` AC-4). This is
     what turns the dormant disagreement into a permanent one: the derived path
     would become ``.jarvis/messages/reminders.yaml``, which nothing writes, so
     the view would show an empty list and report no error.
   * ``popDueReminders`` completes in one synchronous step: it reads, separates
     due from remaining, writes remaining, then returns due — no separate
     ``removeReminder`` call needed from the poll loop; the extension host is
     single-threaded, so no other tick can interleave
   * ``log`` is the shared ``LogOutputChannel`` set via a module-level setter
     ``setRemindersLogger(log)`` called once during ``activate()``; the
     malformed-file warning is skipped when no logger is set


.. spec:: Reminder Poll Loop Integration
  :id: SPEC_MSG_REMINDERSLOOP
  :status: implemented
  :links: REQ_MSG_REMINDERS_DELIVER; SPEC_COM_INBOX; SPEC_MSG_REMINDERSTORE; SPEC_MSG_AUTODELIVER_STORE; SPEC_MSG_QUEUESTORE

  **Description:**
  The existing 5-second ``setInterval`` poll loop in ``extension.ts`` checks
  for due reminders after it has started the auto-delivery pass
  (``announcer.runAuto()``, run only while the AHP client is connected; the
  reminder check runs on every tick regardless). Due
  reminders are enqueued as regular messages without changing their target's
  auto-delivery preference. Existing message delivery decides whether the
  queued message is notified automatically or awaits manual notification.

  **Reminder processing in the tick body.** The tick calls
  ``processDueReminders`` (``packages/core/src/apps/session/reminderDelivery.ts``),
  which takes its collaborators as a dependency object so that it runs in a
  unit test with a fixed clock and a fake ``popDue``:

   .. code-block:: typescript

      processDueReminders({
        remindersPath: configPaths.getRemindersPath() ?? '',
        messagesPath,
        now: new Date(),
        reloadReminders: () => remindersProvider?.reload(),
        reloadMessages: () => messageProvider.reload(),
        info: message => log.info(message),
        warn: message => log.warn(message),
      });

   The helper's body:

   .. code-block:: typescript

      let due: Reminder[];
      try {
        due = popDueReminders(remindersPath, now);
      } catch (error) {
        warn(`[MSG] Reminder scan failed: ${error}`);
        return [];
      }
      for (const reminder of due) {
        try {
          appendMessage(messagesPath, reminder.session, 'Reminder', reminder.text);
          info(`[MSG] Reminder "${reminder.id}" queued for session "${reminder.session}"`);
        } catch (error) {
          warn(`[MSG] Reminder delivery failed for "${reminder.id}": ${error}`);
        }
      }
      if (due.length > 0) {
        // Refresh both views so the new message and removed reminder are visible
        reloadReminders();
        reloadMessages();
      }
      return due;

   **Design decisions:**

   * **Preserve delivery preference**: The reminder tick only appends to the
     message queue. The existing auto-delivery poll picks up a target already
     enabled for auto-delivery on a subsequent tick; otherwise the message
     remains queued for manual notification. A reminder does not enroll its
     target in auto-delivery.
   * **No UI interaction in reminder tick**: The reminder poll block does NOT
     attempt to open the chat session directly; automatic or manual message
     delivery handles notification according to the existing preference.
   * **popDueReminders atomicity**: The reminder is removed from ``reminders.yaml``
     inside ``popDueReminders`` before ``appendMessage`` is called. If
     ``appendMessage`` fails, the reminder is already gone — this is acceptable
     (guaranteed at-most-once delivery is preferable to a delivery retry loop).
   * **Pop errors**: If ``popDueReminders`` fails (including a failed write to
     ``reminders.yaml``), warn and end this reminder tick without stopping the
     interval. The next tick may try again; no due entries were returned for
     enqueueing. The ``processDueReminders`` helper keeps this guard inside
     itself and returns ``[]``.
   * **Tree refresh**: A single ``reloadReminders()`` plus ``reloadMessages()``
     (``remindersProvider.reload()`` and ``messageProvider.reload()``) after all
     due reminders in a tick is sufficient — both views update together.


.. spec:: Reminder LM and MCP Tools Registration
   :id: SPEC_MSG_REMINDERSTOOLS
   :status: implemented
   :links: REQ_MSG_REMINDERS_TOOLS; SPEC_MSG_REMINDERSTORE; SPEC_ENG_REGISTER_TOOL; SPEC_MOD_MCP_PKG; REQ_ENG_TOOLREF

   **Description:**
   Register three tools through ``engine.registerTool()`` in ``extension.ts``:
   ``jarvis_setReminder``, ``jarvis_listReminders``, and
   ``jarvis_cancelReminder``. Each is registered once, with a name, a
   description and a handler; it is a VS Code LM Tool because the manifest
   declares it (``contributes.languageModelTools``, ``REQ_MSG_REMINDERS_TOOLS``
   AC-5) and an MCP Tool because the MCP extension enumerates the engine's tool
   registry and reads the same manifest ``inputSchema`` (``SPEC_MOD_MCP_PKG``,
   ``SPEC_ENG_TOOLREGISTRY``). There is no second handler and no Zod schema per
   tool: a tool-specific MCP registration would be a second copy that could
   diverge from the manifest.

   The handlers are factories in ``src/apps/session/reminderRuntime.ts``
   (``createSetReminderHandler``, ``createListRemindersHandler``,
   ``createCancelReminderHandler``). Each takes the same dependency object:
   the reminders path from the central resolver, a ``reload`` callback for the
   Reminders view, a logger and a clock. The factories keep the handlers free
   of VS Code state, so they run in a unit test with a fixed clock.

   **Registration:**

   .. code-block:: typescript

      const reminderToolDependencies = {
        remindersPath: () => configPaths.getRemindersPath() ?? '',
        reload: () => remindersProvider?.reload(),
        info: (message: string) => log.info(message),
        now: () => new Date(),
      };

      const setReminderTool = engine.registerTool('jarvis_setReminder',
        'Registers a time-scheduled reminder.',
        createSetReminderHandler(reminderToolDependencies));
      const listRemindersTool = engine.registerTool('jarvis_listReminders',
        'Returns all pending reminders.',
        createListRemindersHandler(reminderToolDependencies));
      const cancelReminderTool = engine.registerTool('jarvis_cancelReminder',
        'Cancels a pending reminder by id.',
        createCancelReminderHandler(reminderToolDependencies));

   **Handler results** (each handler returns a ``LanguageModelToolResult`` with
   one text part holding the JSON; MCP clients receive the parsed JSON):

   * ``jarvis_setReminder``: ``{ error: 'deliverAt must be in the future' }`` when
     ``deliverAt`` is not after ``now()``; otherwise the reminder is stored with
     ``addReminder`` and ``{ id, deliverAt }`` is returned.
   * ``jarvis_listReminders``: ``{ reminders: [...] }`` where each entry carries
     ``remainingMs`` (``deliverAt`` minus ``now()``, negative when overdue).
   * ``jarvis_cancelReminder``: ``{ status: 'cancelled' }`` when ``removeReminder``
     found the id, otherwise ``{ status: 'not_found' }``.

   The set and cancel handlers log one ``[MSG]`` line and reload the Reminders
   view; the list handler changes nothing.


   **Registration in package.json (``contributes.languageModelTools``):**

   .. code-block:: json

      [
        {
          "name": "jarvis_setReminder",
          "displayName": "Set Reminder",
          "modelDescription": "jarvis_core: Registers a time-scheduled reminder. Delivers a message to the named chat session at deliverAt (ISO 8601). Returns { id, deliverAt }.",
          "canBeReferencedInPrompt": true,
          "toolReferenceName": "jarvis_core_setReminder",
          "icon": "$(bell)",
          "inputSchema": {
            "type": "object",
            "properties": {
              "text":      { "type": "string", "description": "Message to deliver" },
              "session":   { "type": "string", "description": "Target chat session name" },
              "deliverAt": { "type": "string", "description": "ISO 8601 delivery timestamp (must be in the future)" }
            },
            "required": ["text", "session", "deliverAt"]
          }
        },
        {
          "name": "jarvis_listReminders",
          "displayName": "List Reminders",
          "modelDescription": "jarvis_core: Returns all pending reminders: { reminders: [{ id, text, session, deliverAt, remainingMs }] }.",
          "canBeReferencedInPrompt": true,
          "toolReferenceName": "jarvis_core_listReminders",
          "icon": "$(bell)",
          "inputSchema": { "type": "object", "properties": {} }
        },
        {
          "name": "jarvis_cancelReminder",
          "displayName": "Cancel Reminder",
          "modelDescription": "jarvis_core: Cancels a pending reminder by id. Returns { status: 'cancelled' | 'not_found' }.",
          "canBeReferencedInPrompt": true,
          "toolReferenceName": "jarvis_core_cancelReminder",
          "icon": "$(bell-slash)",
          "inputSchema": {
            "type": "object",
            "properties": {
              "id": { "type": "string", "description": "Reminder UUID to cancel" }
            },
            "required": ["id"]
          }
        }
      ]

   **Design notes:**

   * ``deliverAt`` validation (must be in the future) is enforced in the one
     handler that serves both the LM and the MCP path; it returns an ``{ error }``
     object rather than throwing, for graceful LM tool error surfacing
   * ``remainingMs`` is computed at call time; negative values indicate an
     overdue reminder that has not yet been popped by the poll loop
   * The set and cancel tools reload the Reminders view after a mutation, through
     the ``reload`` dependency (``remindersProvider.reload()``)


.. spec:: Reminders Tree View
   :id: SPEC_MSG_REMINDERSVIEW
   :status: implemented
   :links: REQ_MSG_REMINDERS_VIEW; SPEC_MSG_REMINDERSTORE; REQ_MSG_REMINDERS_PERSIST

   **Description:**
   ``RemindersTreeProvider`` in
   ``packages/core/src/apps/session/remindersTreeProvider.ts`` backs the
   top-level sidebar view ``jarvisReminders`` (label ``"Reminders"``). The view
   sits next to ``jarvisMessages`` in the Jarvis Activity Bar container
   (``jarvis-explorer``). Reminders do not appear inside the Messages tree.
   The view is created in the Messages feature block of ``activate()`` only
   while ``jarvis.reminders.enabled`` is true, with ``showCollapseAll: true``
   (``US_MSG_TREE`` AC-4).

   **Node type:**

   .. code-block:: typescript

      interface ReminderNode {
        kind: 'reminder';
        reminder: Reminder;   // from reminders.ts
      }

   **TreeDataProvider behaviour:**

   * Root: read ``readReminders(<resolved path> ?? '')`` and
     return one ``ReminderNode`` per entry (flat, no group node). The path
     comes from a constructor-injected resolver that defaults to
     ``configPaths.getRemindersPath``, like every other consumer
     (``SPEC_CFG_PATHRESOLVER`` usage contract, ``REQ_CFG_PATHSINGLESOURCE``
     AC-3). The provider once derived the path from the queue path, which
     agrees with the resolver only in the flat layout
     (``REQ_EXP_REMINDER_OPENFILE``).
   * Leaf nodes have no children.

   **getTreeItem:**

   * ``ReminderNode`` → non-collapsible,
     label = ``"${truncate(reminder.text, 60)} — ${reminder.session}"``,
     description = computed countdown string (see below),
     iconPath ``new vscode.ThemeIcon('bell')``,
     contextValue = ``'jarvisReminder'``,
     command = ``jarvis.openReminderFile`` with the node as argument
     (see SPEC_EXP_REMINDER_OPENFILE).

   **Countdown string computation:**

   .. code-block:: typescript

      function formatCountdown(deliverAt: string): string {
        const ms = new Date(deliverAt).getTime() - Date.now();
        if (ms < 0) { return 'overdue'; }
        if (ms < 60_000) { return `in ${Math.round(ms / 1000)}s`; }
        return `in ${Math.round(ms / 60_000)} min`;
      }

   **package.json view registration:**

   .. code-block:: json

      {
        "id": "jarvisReminders",
        "name": "Reminders",
        "when": "config.jarvis.messages.enabled == true && config.jarvis.reminders.enabled == true"
      }

   Add ``"onView:jarvisReminders"`` to ``activationEvents``. The view is
   declared in the ``jarvis-explorer`` container.

   **Inline cancel action (package.json ``view/item/context``):**

   .. code-block:: json

      {
        "command": "jarvis.cancelReminder",
        "when": "viewItem == jarvisReminder",
        "group": "inline"
      }

   **Command ``jarvis.cancelReminder``:**

   Registered in ``extension.ts``; hidden from the Command Palette
   (``contributes.menus.commandPalette``: ``when: "false"``):

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.cancelReminder',
        (node?: ReminderNode) => {
          if (!node || node.kind !== 'reminder') { return; }
          removeReminder(configPaths.getRemindersPath() ?? '', node.reminder.id);
          log.info(`[MSG] cancelReminder(tree): id="${node.reminder.id}"`);
          remindersProvider?.reload();
        }
      );

   **package.json ``contributes.commands``:**

   .. code-block:: json

      {
        "command": "jarvis.cancelReminder",
        "title": "Jarvis: Cancel Reminder",
        "icon": "$(trash)"
      }

   **Design notes:**

   * The Reminders view is gated by ``config.jarvis.messages.enabled == true &&
     config.jarvis.reminders.enabled == true`` (see SPEC_CFG_VIEWGATING); this
     toggle-based gating replaces the former ``jarvis.messagesFile != ''``
     precondition.
   * Countdown strings are computed fresh on every ``getTreeItem`` call. The
     tree reloads on ``remindersProvider.reload()``, which the poll loop calls
     only on a tick that delivered a due reminder, and the tool handlers and
     the cancel command call after a mutation. No timer refreshes the view
     otherwise, so a countdown shown for an idle reminder is as old as the last
     reload.
   * The ``jarvis.cancelReminder`` tree command is distinct from the
     ``jarvis_cancelReminder`` LM/MCP tool — the command operates on a
     ``ReminderNode`` from the tree, the tool accepts a raw ``id`` string.


