Message Queue Design Specifications
=====================================

.. spec:: Message Queue File Store
   :id: SPEC_MSG_QUEUESTORE
   :status: implemented
   :links: REQ_MSG_QUEUE; REQ_MSG_READ; REQ_CFG_MSGPATH

   **Description:**
   Module ``src/messageQueue.ts`` provides synchronous file-backed read/write/delete
   operations on the JSON message queue. All functions accept the resolved file path
   (from ``SPEC_CFG_HEARTBEATSETTINGS``). The parent directory is created on first
   write if it does not exist.

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
        if (!fs.existsSync(filePath)) return [];
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
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(queue, null, 2));
      }

      function deleteMessage(
        filePath: string,
        index: number
      ): void {
        const queue = readQueue(filePath);
        queue.splice(index, 1);
        fs.writeFileSync(filePath, JSON.stringify(queue, null, 2));
      }

      function deleteByDestination(
        filePath: string,
        destination: string
      ): void {
        const queue = readQueue(filePath).filter(m => m.destination !== destination);
        fs.writeFileSync(filePath, JSON.stringify(queue, null, 2));
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
        fs.writeFileSync(filePath, JSON.stringify(queue, null, 2));
        return { message, remaining };
      }


.. spec:: Message Tree Data Provider
   :id: SPEC_MSG_TREEPROVIDER
   :status: implemented
   :links: REQ_MSG_EXPLORER; REQ_MSG_DELETE; REQ_EXP_TREEVIEW; SPEC_MSG_QUEUESTORE

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
     contextValue = ``'messageSession'`` (enables send button)
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


.. spec:: Send Messages Command
   :id: SPEC_MSG_SENDCOMMAND
   :status: implemented
   :links: REQ_MSG_SEND; REQ_MSG_SESSIONLOOKUP; SPEC_MSG_SESSIONLOOKUP; SPEC_MSG_QUEUESTORE

   **Description:**
   Register ``jarvis.sendMessages`` in ``extension.ts``. Invoked from the session
   group node's inline action. Focuses the chat session tab, submits a single
   notification stub informing the session about pending messages, then refreshes
   the tree. Messages remain in the queue — the session consumes them via
   ``jarvis_readMessage``.

   When invoked from the Command Palette (without a node argument), a warning is
   shown and the command returns early.

   **Stub format:**

   The notification stub is sent as a single ``workbench.action.chat.open`` query::

      [Jarvis Message Service] Du hast {N} neue Nachrichten in deiner Inbox.
      Lies sie mit dem Tool jarvis_readMessage (destination: "{sessionName}") bis remaining = 0.

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.sendMessages',
        async (node?: SessionGroupNode) => {
          if (!node) {
            vscode.window.showWarningMessage(
              'Jarvis: Use the play button on a session group in the Messages tree.'
            );
            return;
          }

          // 1. Resolve session UUID
          const uuid = await lookupSessionUUID(node.destination);

          // 2. Focus existing session or create new one
          if (uuid) {
            const b64 = Buffer.from(uuid).toString('base64');
            const uri = vscode.Uri.parse(
              `vscode-chat-session://local/${b64}`
            );
            await vscode.commands.executeCommand('vscode.open', uri);
            await new Promise(resolve => setTimeout(resolve, 800));
          } else {
            // No existing session — create new editor chat
            await vscode.commands.executeCommand('vscode.open',
              vscode.Uri.parse('vscode-chat-session://local/new'));
            await new Promise(resolve => setTimeout(resolve, 800));
          }

          // 3. Send single notification stub
          const count = node.children.length;
          const stub =
            `[Jarvis Message Service] Du hast ${count} neue Nachrichten in deiner Inbox.\n` +
            `Lies sie mit dem Tool jarvis_readMessage (destination: "${node.destination}") bis remaining = 0.`;
          await vscode.commands.executeCommand(
            'workbench.action.chat.open',
            { query: stub }
          );

          // 4. Refresh tree (messages stay in queue)
          messageProvider.reload();
        }
      );

   Also registers ``jarvis.deleteMessage`` for single message deletion.
   The ``jarvis.openSession`` command is specified separately in
   ``SPEC_MSG_OPENSESSION``.


.. spec:: Read Message LM Tool
   :id: SPEC_MSG_READMESSAGE
   :status: implemented
   :links: REQ_MSG_READ; SPEC_MSG_QUEUESTORE; SPEC_MSG_SESSIONLOOKUP

   **Description:**
   Register ``jarvis_readMessage`` as a Language Model Tool in ``extension.ts``.
   Pops the oldest queued message for a given destination session and returns it
   along with the remaining count, enabling pull-based inbox consumption by LLM
   agents.

   **Handler:**

   .. code-block:: typescript

      vscode.lm.registerTool('jarvis_readMessage', {
        async invoke(
          options: vscode.LanguageModelToolInvocationOptions<{ destination: string }>,
          _token: vscode.CancellationToken
        ) {
          const { destination } = options.input;
          const result = popMessage(resolveMessagesPath(), destination);
          messageProvider.reload();
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(JSON.stringify(result))
          ]);
        }
      });

   **Registration in package.json:**

   .. code-block:: json

      {
        "name": "jarvis_readMessage",
        "displayName": "Read Message from Inbox",
        "modelDescription": "Reads and removes the oldest message from the Jarvis inbox for the given destination session. Returns { message: { sender, text, timestamp } | null, remaining: number }. Call repeatedly until remaining === 0.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "readMessage",
        "icon": "$(mail-read)",
        "inputSchema": {
          "type": "object",
          "properties": {
            "destination": {
              "type": "string",
              "description": "The exact name/title of the chat session whose inbox to read"
            }
          },
          "required": ["destination"]
        }
      }

   **Design notes:**

   * Pop-oldest semantics: ``findIndex`` returns the first match (FIFO order)
   * The queue file is rewritten after each pop — acceptable performance for
     typical queue sizes (single-digit to low tens of messages)
   * ``messageProvider.reload()`` is called after each pop to keep the Messages
     tree in sync
   * Disposable pushed to ``context.subscriptions``


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

   .. code-block:: typescript

      let _stateVscdbPath: string | undefined;

      function initSessionLookup(storageUri: vscode.Uri): void {
        _stateVscdbPath = path.join(
          path.dirname(storageUri.fsPath),
          'state.vscdb'
        );
      }

   ``initSessionLookup`` is called once during ``activate()`` with
   ``context.storageUri``.

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

      async function getAllSessions(): Promise<SessionInfo[]> {
        const dbPath = getStateVscdbPath();
        if (!fs.existsSync(dbPath)) return [];
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
   * **``initSessionLookup(storageUri)``** — called once at activation; derives
     the DB path from ``context.storageUri`` (Parent = workspace storage root)
   * **Live read, no caching** — the DB is small and the read is fast; caching
     would introduce staleness bugs when sessions are renamed or deleted
   * **``sql.js``** — pure JavaScript/WASM SQLite implementation. Does not
     require native compilation or ``@electron/rebuild``. Replaces
     ``better-sqlite3`` which crashed in Electron due to native C++ ABI mismatch
   * **Async API** — ``sql.js`` initialization is async (``initSqlJs()``),
     so ``lookupSessionUUID`` and ``getAllSessions`` return Promises
   * **Fallback** — if DB is missing or session not found, the caller decides
     the behaviour (open new chat, show notification, etc.)
   * **Named session filter** — a shared helper
     ``filterNamedSessions(sessions)`` returns only sessions where
     ``s.title && s.title !== 'New Chat'``.  Used by
     ``SPEC_MSG_OPENSESSION`` and ``SPEC_MSG_LISTSESSIONS``.
     Defined in ``sessionLookup.ts`` to satisfy ``REQ_MSG_SESSIONFILTER``.

   **Shared filter helper (REQ_MSG_SESSIONFILTER):**

   .. code-block:: typescript

      export function filterNamedSessions(
        sessions: SessionInfo[]
      ): SessionInfo[] {
        return sessions.filter(s => s.title && s.title !== 'New Chat');
      }


.. spec:: Open Session Command
   :id: SPEC_MSG_OPENSESSION
   :status: implemented
   :links: REQ_MSG_OPENSESSION; REQ_MSG_SESSIONFILTER; SPEC_MSG_SESSIONLOOKUP

   **Description:**
   Register ``jarvis.openSession`` in ``extension.ts``. Presents a QuickPick of
   named chat sessions in the current workspace and opens the selected session
   in the editor.

   This command already exists in the codebase — this spec formalizes it.

   **Session filter (REQ_MSG_SESSIONFILTER):**

   Sessions are filtered by: ``s.title && s.title !== 'New Chat'``.
   This excludes both empty/untitled sessions and sessions with the VS Code
   default title.

   **Handler:**

   .. code-block:: typescript

      vscode.commands.registerCommand('jarvis.openSession', async () => {
        const sessions = await getAllSessions();
        const named = filterNamedSessions(sessions);
        if (named.length === 0) {
          vscode.window.showInformationMessage('Jarvis: No named chat sessions found');
          return;
        }
        const pick = await vscode.window.showQuickPick(
          named.map(s => ({ label: s.title, description: s.sessionId })),
          { placeHolder: 'Select a chat session to open' }
        );
        if (!pick) { return; }
        const b64 = Buffer.from(pick.description!).toString('base64');
        const uri = vscode.Uri.parse(`vscode-chat-session://local/${b64}`);
        await vscode.commands.executeCommand('vscode.open', uri);
      });

   **Registration in package.json:**

   Already registered as ``jarvis.openSession`` with title
   ``"Jarvis: Open Chat Session"`` (no icon — command palette only).

   **Stale session handling (REQ_MSG_OPENSESSION AC-5):**

   The QuickPick uses the ``sessionId`` directly from the database snapshot.
   If the session is deleted between listing and selection, ``vscode.open``
   will fail silently. This is an unlikely race condition; the platform
   behaviour is accepted as-is.


.. spec:: List Sessions LM Tool
   :id: SPEC_MSG_LISTSESSIONS
   :status: implemented
   :links: REQ_MSG_LISTSESSIONS; REQ_MSG_SESSIONFILTER; SPEC_MSG_SESSIONLOOKUP

   **Description:**
   Register ``jarvis_listSessions`` as a Language Model Tool in ``extension.ts``.
   Returns the list of named chat session titles from the current workspace so
   that LLM agents can discover valid destination names for ``sendToSession``.

   **Handler:**

   .. code-block:: typescript

      vscode.lm.registerTool('jarvis_listSessions', {
        async invoke(
          _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
          _token: vscode.CancellationToken
        ) {
          const sessions = await getAllSessions();
          const named = filterNamedSessions(sessions)
            .map(s => s.title);
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(JSON.stringify(named))
          ]);
        }
      });

   **Registration in package.json:**

   .. code-block:: json

      {
        "name": "jarvis_listSessions",
        "displayName": "List Chat Sessions",
        "modelDescription": "Returns the list of named chat session titles in the current workspace. Use this to discover valid session names before sending messages via sendToSession.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "listSessions",
        "icon": "$(list-unordered)",
        "inputSchema": {
          "type": "object",
          "properties": {}
        }
      }

   **Design notes:**

   * No input parameters — the tool returns all named sessions
   * Uses the same filter as ``SPEC_MSG_OPENSESSION``: non-empty title,
     not ``'New Chat'``
   * Returns JSON array of title strings
   * Disposable pushed to ``context.subscriptions``


.. spec:: MCP Server Module
   :id: SPEC_MSG_MCPSERVER
   :status: implemented
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
   ``jarvis_listSessions``, ``jarvis_readMessage``) are refactored to use
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

   Example for ``jarvis_sendToSession``:

   .. code-block:: typescript

      const sendToSessionTool = registerDualTool(
        'jarvis_sendToSession',
        // LM handler
        async (options, _token) => {
          const { session, text } = options.input;
          const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
          const sender = activeTab?.label || options.input.senderSession || 'unknown';
          appendMessage(resolveMessagesPath(), session, sender, text);
          messageProvider.reload();
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(
              `Message queued for destination "${session}" from "${sender}"`
            )
          ]);
        },
        // MCP description
        'Queues a message for delivery to another VS Code chat session identified by name.',
        // MCP input schema (Zod types)
        { session: z.string(), senderSession: z.string().optional(), text: z.string() },
        // MCP handler
        async (args) => {
          const session = args.session as string;
          const text = args.text as string;
          const sender = (args.senderSession as string) || 'mcp-client';
          appendMessage(resolveMessagesPath(), session, sender, text);
          messageProvider.reload();
          return { status: 'queued', destination: session, sender };
        }
      );

   **Lifecycle in activate():**

   .. code-block:: typescript

      // After all registerDualTool() calls:
      const config = vscode.workspace.getConfiguration('jarvis');
      const mcpEnabled = config.get<boolean>('mcpEnabled', true);
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
        "jarvis.mcpEnabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable the embedded MCP server."
        }
      }

   **Design notes:**

   * ``registerDualTool()`` returns the LM tool ``Disposable`` — MCP tools are
     cleaned up when the server stops
   * MCP handlers receive raw ``Record<string, unknown>`` and return plain
     objects — the MCP SDK serializes them to JSON
   * LM handlers continue to return ``LanguageModelToolResult`` as before
   * The status bar item is only shown when ``mcpEnabled`` is true
   * Port changes require extension reload (no hot-reconfiguration)
