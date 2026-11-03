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
   persisted (``SPEC_CFG_STATEMIGRATION``). The ``:links:`` reference to the
   deprecated ``REQ_CFG_MSGPATH`` is replaced by ``REQ_CFG_FIXEDPATHS``, which
   is the actual owner of the location.

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
     **``ui-improvements`` CR**: ``item.command`` is now set, invoking a new
     handler that resolves ``element.destination`` via
     ``lookupSessionUUID()`` and opens the chat at Main via ``openAtMain``
     (``SPEC_MSG_EDITORPLACEMENT``, same helper already used by
     ``jarvis.openActorSession`` and ``jarvis.sendMessages``) — previously
     no command was set (label click only expanded/collapsed).
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


.. spec:: Session UUID Resolver
   :id: SPEC_MSG_SESSIONLOOKUP
   :status: implemented
   :links: REQ_MSG_SESSIONLOOKUP

   **Description:**
   Module ``src/sessionLookup.ts`` resolves a chat session title to a UUID by
   querying the **workspace-scoped** ``state.vscdb`` SQLite database. Uses
   ``sql.js`` (pure JavaScript/WASM — no native compilation needed for Electron).

   **Dependency (package.json):**

   .. code-block:: json

      {
        "dependencies": {
          "sql.js": "^1.14.1"
        }
      }

   **Workspace-scoped state.vscdb location:**

   The global ``state.vscdb`` contains sessions from **all** VS Code windows.
   To get only sessions belonging to the current workspace, the module uses the
   workspace-local ``state.vscdb`` located alongside the extension storage.

   ``context.storageUri`` points to
   ``workspaceStorage/<hash>/<extensionId>/``. The workspace-scoped
   ``state.vscdb`` lives in the parent directory: ``workspaceStorage/<hash>/state.vscdb``.

   In **Remote / Devcontainer** environments ``context.storageUri.fsPath`` may
   resolve to a remote filesystem path, making a direct ``path.dirname()``
   derivation invalid on the local machine. The fix uses
   ``context.globalStorageUri`` — which always resolves to a local path — to
   anchor the ``userDataPath``, then reconstructs the workspace storage path
   from there.

   ``context.globalStorageUri`` points to
   ``<userDataPath>/globalStorage/<extensionId>/``. Two levels up yields the
   VS Code User Data folder. The workspace hash is extracted as
   ``path.basename(path.dirname(storageUri.fsPath))``, which is stable even
   when ``storageUri`` is a remote URI because only the last path segment (the
   hash) is used.

   **WSL2 path resolution:**

   In **WSL2 remote** mode the extension host runs on Linux, so
   ``globalStorageUri.fsPath`` resolves to the WSL2 path (e.g.
   ``/home/<user>/.vscode-server/data/User/globalStorage/...``). However,
   VS Code's ``state.vscdb`` lives on the **Windows host** and is accessible
   from WSL2 at ``/mnt/c/Users/<USERNAME>/AppData/Roaming/Code/User/workspaceStorage/<hash>/state.vscdb``.

   The ``resolveUserDataPath(globalStorageUri)`` helper handles this:

   1. **Detect WSL2** — read ``/proc/version`` synchronously; if it contains
      ``"microsoft"`` (case-insensitive), the environment is WSL2.
   2. **WSL2 branch** — derive the Windows username from the environment
      variables with a fallback chain: ``process.env.USERNAME ?? process.env.USER ?? 'unknown'``.
      Construct the user data path as ``/mnt/c/Users/<username>/AppData/Roaming/Code/User``.
      If both ``USERNAME`` and ``USER`` are unset, fall back to the non-WSL2
      logic (using ``globalStorageUri``) instead of throwing.
   3. **Non-WSL2 branch** — use the existing logic:
      ``path.resolve(globalStorageUri.fsPath, '../..')``.

   The workspace hash extraction (``path.basename(path.dirname(storageUri.fsPath))``)
   is unchanged — it is the same hash on both sides.

   .. code-block:: typescript

      let _stateVscdbPath: string | undefined;

      function isWSL2(): boolean {
        try {
          const version = fs.readFileSync('/proc/version', 'utf-8');
          return /microsoft/i.test(version);
        } catch {
          return false;
        }
      }

      function resolveUserDataPath(globalStorageUri: vscode.Uri): string {
        if (isWSL2()) {
          const username = process.env.USERNAME ?? process.env.USER ?? 'unknown';
          if (username !== 'unknown') {
            return `/mnt/c/Users/${username}/AppData/Roaming/Code/User`;
          }
          // Both USERNAME and USER unset — fall back to non-WSL2 logic
        }
        return path.resolve(globalStorageUri.fsPath, '../..');
      }

      function initSessionLookup(storageUri: vscode.Uri, globalStorageUri: vscode.Uri): void {
        const hash = path.basename(path.dirname(storageUri.fsPath));
        const userDataPath = resolveUserDataPath(globalStorageUri);
        _stateVscdbPath = path.join(userDataPath, 'workspaceStorage', hash, 'state.vscdb');
      }

   ``initSessionLookup`` is called once during ``activate()`` with both
   ``context.storageUri`` and ``context.globalStorageUri``.

   **SessionStore structure:**

   The ``chat.ChatSessionStore.index`` value in ``state.vscdb`` is a JSON object
   with the following structure:

   .. code-block:: typescript

      interface SessionStoreEntry {
        sessionId: string;
        title: string;
      }

      interface SessionStore {
        version: number;
        entries: { [id: string]: SessionStoreEntry };
      }

   **Public API:**

   .. code-block:: typescript

      interface SessionInfo {
        title: string;
        sessionId: string;
      }

      function setSessionLookupLogger(log: vscode.LogOutputChannel): void

      async function getAllSessions(): Promise<SessionInfo[]> {
        const dbPath = getStateVscdbPath();
        if (!fs.existsSync(dbPath)) {
          _log?.warn('[sessionLookup] state.vscdb not found at: ' + dbPath);
          return [];
        }
        const SQL = await initSqlJs();
        const fileBuffer = fs.readFileSync(dbPath);
        const db = new SQL.Database(fileBuffer);
        try {
          const result = db.exec(
            "SELECT value FROM ItemTable WHERE key = 'chat.ChatSessionStore.index'"
          );
          if (result.length === 0 || result[0].values.length === 0) return [];
          const store: SessionStore = JSON.parse(result[0].values[0][0] as string);
          return Object.values(store.entries).map(entry => ({
            title: entry.title,
            sessionId: entry.sessionId,
          }));
        } finally {
          db.close();
        }
      }

      async function lookupSessionUUID(
        sessionName: string
      ): Promise<string | undefined> {
        const all = await getAllSessions();
        const matches = all.filter(s => s.title === sessionName);
        if (matches.length === 0) return undefined;
        if (matches.length > 1) {
          vscode.window.showWarningMessage(
            `Jarvis: multiple chat sessions named "${sessionName}" — using first match`
          );
        }
        return matches[0].sessionId;
      }

   **Design decisions:**

   * **Workspace-scoped, not global** — ``state.vscdb`` from
     ``workspaceStorage/<hash>/`` contains only sessions for the current VS Code
     window, avoiding cross-instance confusion
   * **``initSessionLookup(storageUri, globalStorageUri)``** — called once at
     activation; derives the DB path using ``globalStorageUri`` (always a local
     path) to be compatible with Remote and Devcontainer environments where
     ``storageUri.fsPath`` may point to a remote filesystem
   * **Remote/Devcontainer compatibility** — ``globalStorageUri.fsPath`` is
     always a local path; two levels up yields ``userDataPath``; the workspace
     hash is extracted from ``storageUri.fsPath`` (basename of parent of
     extensionId segment) and used to reconstruct the local path
   * **WSL2 compatibility** — in WSL2 the extension host runs on Linux but
     ``state.vscdb`` lives on the Windows host. ``resolveUserDataPath()``
     detects WSL2 via ``/proc/version`` containing ``"microsoft"``
     (case-insensitive) and constructs the path as
     ``/mnt/c/Users/<username>/AppData/Roaming/Code/User`` using the
     ``USERNAME`` environment variable with a fallback chain
     ``USERNAME ?? USER ?? 'unknown'``. If both are unset, it falls back to
     the non-WSL2 logic instead of throwing. ``APPDATA`` is not available in
     this environment, hence the fallback chain.
   * **Live read, no caching** — the DB is small and the read is fast; caching
     would introduce staleness bugs when sessions are renamed or deleted
   * **``sql.js``** — pure JavaScript/WASM SQLite implementation. Does not
     require native compilation or ``@electron/rebuild``. Replaces
     ``better-sqlite3`` which crashed in Electron due to native C++ ABI mismatch
   * **Async API** — ``sql.js`` initialization is async (``initSqlJs()``),
     so ``lookupSessionUUID`` and ``getAllSessions`` return Promises
   * **Warning on missing DB** — if ``state.vscdb`` is not found at the
     resolved path, a warning is emitted via the Jarvis log channel and an empty
     list is returned; callers are not expected to handle this case specially
   * **Named session filter** — a shared helper
     ``filterNamedSessions(sessions)`` returns only sessions where
     ``s.title && s.title !== 'New Chat'``.  Used by
     the heartbeat destination check.
     Defined in ``sessionLookup.ts`` to satisfy ``REQ_MSG_SESSIONFILTER``.

   **Shared filter helper (REQ_MSG_SESSIONFILTER):**

   .. code-block:: typescript

      export function filterNamedSessions(
        sessions: SessionInfo[]
      ): SessionInfo[] {
        return sessions.filter(s => s.title && s.title !== 'New Chat');
      }


.. spec:: MCP Server Module
   :id: SPEC_MSG_MCPSERVER
   :status: approved
   :links: REQ_MSG_MCPSERVER

   **Description:**
   New module ``src/mcpServer.ts`` provides an embedded MCP server using
   ``@modelcontextprotocol/sdk`` with ``StreamableHTTPServerTransport``.
   The server binds to ``127.0.0.1`` on the configured port and exposes
   registered tools via the MCP protocol over HTTP/SSE.

   **Dependencies (package.json):**

   .. code-block:: json

      {
        "dependencies": {
          "@modelcontextprotocol/sdk": "^1.12.1"
        }
      }

   **Public API:**

   .. code-block:: typescript

      import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
      import { StreamableHTTPServerTransport } from
        '@modelcontextprotocol/sdk/server/streamableHttp.js';
      import * as http from 'http';
      import { z } from 'zod';
      import type * as vscode from 'vscode';

      let mcpServer: McpServer | undefined;
      let httpServer: http.Server | undefined;

      export function registerMcpTool(
        name: string,
        description: string,
        inputSchema: Record<string, z.ZodTypeAny>,
        handler: (args: Record<string, unknown>) => Promise<object>
      ): void {
        // Stores tool registration; applied when server starts
      }

      export async function startMcpServer(
        port: number,
        log: vscode.LogOutputChannel
      ): Promise<void> {
        mcpServer = new McpServer({
          name: 'jarvis',
          version: '<from package.json>'
        });

        // Register all accumulated tools on the McpServer instance
        for (const [name, { description, schema, handler }] of toolRegistry) {
          mcpServer.tool(name, description, schema, async (args) => {
            const result = await handler(args);
            return {
              content: [{ type: 'text', text: JSON.stringify(result) }]
            };
          });
        }

        // Stateless mode — new transport per request
        httpServer = http.createServer(async (req, res) => {
          if (req.method !== 'POST') {
            res.writeHead(405).end();
            return;
          }
          const reqTransport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined
          });
          res.on('close', () => { reqTransport.close(); });
          await mcpServer!.connect(reqTransport);
          await reqTransport.handleRequest(req, res);
        });

        httpServer.listen(port, '127.0.0.1');
      }

      export async function stopMcpServer(): Promise<void> {
        if (httpServer) {
          httpServer.close();
          httpServer = undefined;
        }
        if (mcpServer) {
          await mcpServer.close();
          mcpServer = undefined;
        }
      }

   **Security:**

   * Server binds exclusively to ``127.0.0.1`` — no external access
   * No authentication required for localhost-only access

   **Design notes:**

   * Tool registrations are collected before ``startMcpServer()`` is called,
     so that ``registerMcpTool()`` can be called during tool setup in
     ``extension.ts`` before the server starts
   * **Stateless mode**: ``sessionIdGenerator: undefined`` means each POST
     request creates a fresh ``StreamableHTTPServerTransport``. The transport
     is connected to the ``McpServer``, handles the single request, and is
     closed when the response ends.
   * ``startMcpServer()`` accepts a ``LogOutputChannel`` for structured
     ``[MCP]`` log output
   * Only POST is accepted; other methods receive 405
   * ``stopMcpServer()`` is called from ``deactivate()`` in ``extension.ts``


.. spec:: Dual-Registration Wrapper
   :id: SPEC_MSG_DUALREGISTRATION
   :status: implemented
   :links: REQ_MSG_MCPSERVER; REQ_CFG_MCPPORT

   **Description:**
   A ``registerDualTool()`` helper function in ``extension.ts`` registers each
   tool with both ``vscode.lm.registerTool()`` and ``registerMcpTool()``
   simultaneously. Existing tool registrations (``jarvis_sendToSession``,
   ``jarvis_listActors``, ``jarvis_readMessage``) are refactored to use
   this wrapper. Handler logic stays identical; only return types differ.

   **Wrapper function:**

   .. code-block:: typescript

      function registerDualTool(
        name: string,
        lmHandler: (
          options: vscode.LanguageModelToolInvocationOptions<any>,
          token: vscode.CancellationToken
        ) => Promise<vscode.LanguageModelToolResult>,
        mcpDescription: string,
        mcpInputSchema: Record<string, z.ZodTypeAny>,
        mcpHandler: (args: Record<string, unknown>) => Promise<object>
      ): vscode.Disposable {
        const lmTool = vscode.lm.registerTool(name, { invoke: lmHandler });
        registerMcpTool(name, mcpDescription, mcpInputSchema, mcpHandler);
        return lmTool;
      }

   **Refactored tool registrations (in activate()):**

   Each existing tool gets both an LM handler (returning
   ``LanguageModelToolResult``) and an MCP handler (returning a plain object).
   The core logic (queue operations, session lookups) is shared.
   ``mcpDescription`` provides a human-readable tool description for the MCP
   protocol (independent of the ``modelDescription`` in ``package.json``).
   ``mcpInputSchema`` uses Zod types (``z.string()``, ``z.string().optional()``)
   as required by the MCP SDK.

   **Lifecycle in activate():**

   .. code-block:: typescript

      // After all registerDualTool() calls:
      const config = vscode.workspace.getConfiguration('jarvis');
      const mcpEnabled = config.get<boolean>('mcp.enabled', false);   // REQ_CFG_MCPDEFAULTOFF
      const mcpPort = config.get<number>('mcpPort', 31415);

      if (mcpEnabled) {
        startMcpServer(mcpPort, log).then(() => {
          mcpStatusBar.show();
        });
      }

   **Status bar item:**

   .. code-block:: typescript

      const mcpStatusBar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right, 100
      );
      mcpStatusBar.text = `$(plug) Jarvis MCP: ${mcpPort}`;
      mcpStatusBar.tooltip = 'Jarvis MCP Server';
      context.subscriptions.push(mcpStatusBar);

   **Deactivation:**

   .. code-block:: typescript

      export async function deactivate() {
        await stopMcpServer();
      }

   **Settings in package.json:**

   .. code-block:: json

      {
        "jarvis.mcpPort": {
          "type": "number",
          "default": 31415,
          "description": "Port for MCP server (localhost only)."
        },
        "jarvis.mcp.enabled": {
          "type": "boolean",
          "default": false,
          "description": "Enable the embedded MCP server."
        }
      }

   **Design notes:**

   * ``registerDualTool()`` returns the LM tool ``Disposable`` — MCP tools are
     cleaned up when the server stops
   * MCP handlers receive raw ``Record<string, unknown>`` and return plain
     objects — the MCP SDK serializes them to JSON
   * LM handlers continue to return ``LanguageModelToolResult`` as before
   * The status bar item is only shown when ``jarvis.mcp.enabled`` is true
   * Port changes require extension reload (no hot-reconfiguration)


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
   :status: approved
   :links: REQ_MSG_EDITORPLACEMENT; SPEC_MSG_SESSIONLOOKUP; SPEC_MSG_TREEPROVIDER

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
   features.

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
          // chat tab (no lookupSessionUUID match) or a plain file tab (no
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

      /** Finds an already-open tab for a chat session, by resolving the
       *  tab's label via lookupSessionUUID (chat tabs expose no .uri). */
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
     name (via ``lookupSessionUUID``) or a known Actor file path — any file
     the user opens manually is entirely outside this contract.
   * ``openAtMain``/``openAtDocs``/``openAtSecondary`` replace ad-hoc
     ``vscode.open(uri, { preview: false })`` calls at their respective call
     sites (``SPEC_ACTOR_FILES``, ``SPEC_MSG_TREEPROVIDER``) — see each
     spec's updated handler.

   **New call site (``ui-improvements`` CR): Messages tree group-node click**

   ``SessionGroupNode``'s ``TreeItem.command`` (previously unset,
   ``SPEC_MSG_TREEPROVIDER``) is bound to a new command that opens the
   session's chat at Main, mirroring ``jarvis.openActorSession``'s and
   ``jarvis.sendMessages``'s existing-session branches:

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.openMessageSession',
        async (node: SessionGroupNode) => {
          const uuid = await lookupSessionUUID(node.destination);
          if (!uuid) { return; } // no live session yet — nothing to open
          const b64 = Buffer.from(uuid).toString('base64');
          const uri = vscode.Uri.parse(`vscode-chat-session://local/${b64}`);
          await openAtMain(uri, node.destination); // REQ_MSG_EDITORPLACEMENT AC-10
        }
      );

   Registered in ``TreeItem.command`` (``SPEC_MSG_TREEPROVIDER``'s
   ``getTreeItem()``), not via a ``view/item/context`` menu entry — same
   pattern as the ACTORS tree's click-to-chat binding
   (``SPEC_ACTOR_TREE``), not a right-click action.

   **Design note:** if no session UUID resolves (the destination has no
   live chat session yet — e.g. all messages are still queued and no
   session has ever been opened for that destination), the handler is a
   silent no-op rather than creating a new session. This differs
   deliberately from ``jarvis.openActorSession``/``jarvis.sendMessages``,
   which both create a fresh session on miss — a label click in the
   Messages tree is a lower-intent, exploratory action (unlike explicitly
   clicking "Play" to send), so silently doing nothing is preferred over
   surprising the user with a brand-new chat session.


.. spec:: Reminder Store Module
   :id: SPEC_MSG_REMINDERSTORE
   :status: draft
   :links: REQ_MSG_REMINDERS_PERSIST; SPEC_MSG_QUEUESTORE; REQ_CFG_FIXEDPATHS; REQ_CFG_PATHSINGLESOURCE

   **Description:**
   New module ``src/reminders.ts`` provides synchronous file-backed read/write
   operations for the ``reminders.yaml`` file. The file path is resolved by
   ``configPaths.getRemindersPath()`` (see ``SPEC_CFG_PATHRESOLVER``). The file
   lives at ``<workspaceRoot>/.jarvis/reminders.yaml``; it is not co-located by
   path derivation from the message queue — both paths are independently resolved
   by the central path resolver.

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

   .. code-block:: typescript

      import * as configPaths from './configPaths';

      function getRemindersFilePath(): string | undefined {
        return configPaths.getRemindersPath();
      }

   **Public API:**

   .. code-block:: typescript

      function readReminders(filePath: string): Reminder[] {
        if (!fs.existsSync(filePath)) { return []; }
        try {
          const raw = fs.readFileSync(filePath, 'utf8');
          const parsed = yaml.load(raw) as { reminders?: Reminder[] };
          return parsed?.reminders ?? [];
        } catch {
          log.warn('[MSG] reminders.yaml malformed — falling back to empty list');
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
   * ``popDueReminders`` is atomic: it reads, separates due from remaining,
     writes remaining, then returns due — no separate ``removeReminder`` call
     needed from the poll loop
   * ``log`` is the shared ``LogOutputChannel`` set via a module-level setter
     ``setRemindersLogger(log)`` called once during ``activate()``


.. spec:: Reminder Poll Loop Integration
  :id: SPEC_MSG_REMINDERSLOOP
  :status: draft
  :links: REQ_MSG_REMINDERS_DELIVER; SPEC_COM_INBOX; SPEC_MSG_REMINDERSTORE; SPEC_MSG_AUTODELIVER_STORE; SPEC_MSG_QUEUESTORE

  **Description:**
  Extend the existing 5-second ``setInterval`` poll loop in ``extension.ts``
  to check for due reminders after the auto-delivery handling block. Due
  reminders are enqueued as regular messages without changing their target's
  auto-delivery preference. Existing message delivery decides whether the
  queued message is notified automatically or awaits manual notification.

  **Reminder processing after the auto-delivery block (shown in the tick
  body; equivalent handling belongs inside an extracted processor):**

   .. code-block:: typescript

      // --- Reminder delivery ---
      const remindersPath = configPaths.getRemindersPath();
      let due: Reminder[];
      try {
        due = popDueReminders(remindersPath, new Date());
      } catch (err) {
        log.warn(`[MSG] Reminder polling failed: ${err}`);
        return;
      }
      for (const reminder of due) {
        try {
          appendMessage(messagesPath, reminder.session, 'Reminder', reminder.text);
          log.info(
            `[MSG] Reminder "${reminder.id}" queued for session "${reminder.session}"`
          );
        } catch (err) {
          log.warn(`[MSG] Reminder delivery failed for "${reminder.id}": ${err}`);
        }
      }
      if (due.length > 0) {
        // Refresh both views so the new message and removed reminder are visible
        remindersProvider.reload();
        messageProvider.reload();
      }

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
     enqueueing. An extracted ``processDueReminders`` helper returning a
     reminder list SHALL keep this guard inside the helper and return ``[]``.
   * **Tree refresh**: A single ``remindersProvider.reload()`` plus
     ``messageProvider.reload()`` after all due reminders in a tick is
     sufficient — both views update together.


.. spec:: Reminder LM and MCP Tools Registration
   :id: SPEC_MSG_REMINDERSTOOLS
   :status: draft
   :links: REQ_MSG_REMINDERS_TOOLS; SPEC_MSG_REMINDERSTORE; SPEC_MSG_DUALREGISTRATION; REQ_ENG_TOOLREF

   **Description:**
   Register three tools via ``registerDualTool()`` in ``extension.ts``:
   ``jarvis_setReminder``, ``jarvis_listReminders``, and
   ``jarvis_cancelReminder``. Each tool is simultaneously available as a VS Code
   LM Tool and as an MCP Tool.

   **``jarvis_setReminder``:**

   .. code-block:: typescript

      registerDualTool(
        'jarvis_setReminder',
        // LM handler
        async (options, _token) => {
          const { text, session, deliverAt } = options.input;
          if (new Date(deliverAt) <= new Date()) {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(
                JSON.stringify({ error: 'deliverAt must be in the future' })
              )
            ]);
          }
          const reminder = addReminder(
            configPaths.getRemindersPath(), text, session, deliverAt
          );
          messageProvider.reload();
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(
              JSON.stringify({ id: reminder.id, deliverAt: reminder.deliverAt })
            )
          ]);
        },
        'Registers a time-scheduled reminder that delivers a message to a named chat session at the specified time.',
        { text: z.string(), session: z.string(), deliverAt: z.string() },
        async (args) => {
          const { text, session, deliverAt } = args as Record<string, string>;
          if (new Date(deliverAt) <= new Date()) {
            return { error: 'deliverAt must be in the future' };
          }
          const reminder = addReminder(
            configPaths.getRemindersPath(), text, session, deliverAt
          );
          messageProvider.reload();
          return { id: reminder.id, deliverAt: reminder.deliverAt };
        }
      );

   **``jarvis_listReminders``:**

   .. code-block:: typescript

      registerDualTool(
        'jarvis_listReminders',
        async (_options, _token) => {
          const reminders = readReminders(configPaths.getRemindersPath());
          const now = Date.now();
          const result = reminders.map(r => ({
            ...r,
            remainingMs: new Date(r.deliverAt).getTime() - now,
          }));
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(JSON.stringify({ reminders: result }))
          ]);
        },
        'Returns all pending reminders with id, text, session, deliverAt, and remainingMs.',
        {},
        async (_args) => {
          const reminders = readReminders(configPaths.getRemindersPath());
          const now = Date.now();
          return {
            reminders: reminders.map(r => ({
              ...r,
              remainingMs: new Date(r.deliverAt).getTime() - now,
            })),
          };
        }
      );

   **``jarvis_cancelReminder``:**

   .. code-block:: typescript

      registerDualTool(
        'jarvis_cancelReminder',
        async (options, _token) => {
          const { id } = options.input;
          const removed = removeReminder(configPaths.getRemindersPath(), id);
          messageProvider.reload();


              JSON.stringify({ status: removed ? 'cancelled' : 'not_found' })
            )
          ]);
        },
        'Cancels a pending reminder by id. Returns { status: "cancelled" | "not_found" }.',
        { id: z.string() },
        async (args) => {
          const id = args.id as string;
          const removed = removeReminder(configPaths.getRemindersPath(), id);
          messageProvider.reload();
          return { status: removed ? 'cancelled' : 'not_found' };
        }
      );

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

   * ``deliverAt`` validation (must be in the future) is enforced in both the
     LM handler and the MCP handler — both paths return an ``{ error }`` object
     rather than throwing, for graceful LM tool error surfacing
   * ``remainingMs`` is computed at call time; negative values indicate an
     overdue reminder that has not yet been popped by the poll loop
   * All three tools call ``messageProvider.reload()`` to keep the Reminders
     tree section in sync after mutations


.. spec:: Reminders Tree View
   :id: SPEC_MSG_REMINDERSVIEW
   :status: draft
   :links: REQ_MSG_REMINDERS_VIEW; SPEC_MSG_REMINDERSTORE; REQ_MSG_REMINDERS_PERSIST

   **Description:**
   Introduce a dedicated ``RemindersTreeProvider`` in
   ``src/remindersTreeProvider.ts`` that backs a new top-level sidebar view
   ``jarvisReminders`` (label ``"Reminders"``). The view sits next to
   ``jarvisMessages`` in the Jarvis Activity Bar container. Reminders no
   longer appear inside the Messages tree.

   **Node type:**

   .. code-block:: typescript

      interface ReminderNode {
        kind: 'reminder';
        reminder: Reminder;   // from src/reminders.ts
      }

   **TreeDataProvider behaviour:**

   * Root: read ``readReminders(configPaths.getRemindersPath())`` and
     return one ``ReminderNode`` per entry (flat, no group node).
     This provider is the site of the ``REQ_EXP_REMINDER_OPENFILE`` defect: it
     resolved the path by derivation from the queue path, which agrees with the
     resolver only in the flat layout. It obtains the path from the resolver
     like every other consumer (``SPEC_CFG_PATHRESOLVER`` usage contract,
     ``REQ_CFG_PATHSINGLESOURCE`` AC-3).
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

   Add ``"onView:jarvisReminders"`` to ``activationEvents``.

   **Inline cancel action (package.json ``view/item/context``):**

   .. code-block:: json

      {
        "command": "jarvis.cancelReminder",
        "when": "viewItem == jarvisReminder",
        "group": "inline"
      }

   **New command ``jarvis.cancelReminder``:**

   Registered in ``extension.ts``:

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.cancelReminder',
        (node?: ReminderNode) => {
          if (!node || node.kind !== 'reminder') { return; }
          const remindersPath = configPaths.getRemindersPath();
          if (!remindersPath) { return; }
          removeReminder(remindersPath, node.reminder.id);
          remindersProvider.reload();
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
     config.jarvis.reminders.enabled == true`` (see SPEC_CFG_VIEWGATING).
     The old ``jarvis.messagesFile != ''`` precondition is superseded by the
     toggle-based gating introduced in this CR.
   * Countdown strings are computed fresh on every ``getTreeItem`` call; the
     tree auto-refreshes on each ``remindersProvider.reload()`` (called by
     the poll loop and tool handlers), so the displayed time stays
     reasonably current (within ±5 s).
   * The ``jarvis.cancelReminder`` tree command is distinct from the
     ``jarvis_cancelReminder`` LM/MCP tool — the command operates on a
     ``ReminderNode`` from the tree, the tool accepts a raw ``id`` string.


