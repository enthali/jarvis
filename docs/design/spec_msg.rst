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
   :links: REQ_MSG_SEND; REQ_MSG_SESSIONLOOKUP; SPEC_MSG_SESSIONLOOKUP; SPEC_MSG_QUEUESTORE; REQ_MSG_AUTODELIVER_TAG

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
            await openPinnedResource(uri);  // SPEC_MSG_PINNED
            await new Promise(resolve => setTimeout(resolve, 800));
          } else {
            // No existing session — create new pinned chat editor
            await openNewChatEditor();  // SPEC_MSG_OPENCHAT
            await new Promise(resolve => setTimeout(resolve, 800));

            // Name the new chat session so future deliveries can resolve it.
            await vscode.commands.executeCommand(
              'workbench.action.chat.open',
              { query: `/rename ${node.destination}` }
            );
            await new Promise(resolve => setTimeout(resolve, 800));
          }

          // 3. Send single notification stub
          const count = node.children.length;
          const stub =
            `[Jarvis Message Service] Du hast ${count} neue Nachrichten in deiner Inbox.\n` +
            `Lies sie mit dem Tool jarvis_readMessage (destination: "${node.destination}") bis remaining = 0.`;
          await sendPromptToFocusedAgentChat(stub);  // SPEC_MSG_SENDPROMPT

          // 4. Refresh tree (messages stay in queue)
          messageProvider.reload();
        }
      );

   The command delivers ALL pending messages regardless of their ``notified``
   flag — per ``REQ_MSG_AUTODELIVER_TAG AC-4``, manual delivery is always
   unconditional.

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


.. spec:: Auto-Delivery Config Store
   :id: SPEC_MSG_AUTODELIVER_STORE
   :status: implemented
   :links: REQ_MSG_AUTODELIVER_CONFIG; SPEC_MSG_QUEUESTORE

   **Description:**
   Helper functions in ``src/messageQueue.ts`` (or a dedicated
   ``src/autoDelivery.ts`` module) manage the ``autodelivery.json`` file.
   The file is a flat JSON array of destination name strings.

   **Path derivation:**

   .. code-block:: typescript

      function resolveAutoDeliveryPath(messagesPath: string): string {
        return path.join(path.dirname(messagesPath), 'autodelivery.json');
      }

   **Public API:**

   .. code-block:: typescript

      function readAutoDelivery(messagesPath: string): string[] {
        const filePath = resolveAutoDeliveryPath(messagesPath);
        if (!fs.existsSync(filePath)) { return []; }
        try {
          const raw = fs.readFileSync(filePath, 'utf8');
          return JSON.parse(raw) as string[];
        } catch {
          log.warn('[MSG] autodelivery.json malformed — falling back to empty list');
          return [];
        }
      }

      function addAutoDelivery(messagesPath: string, destination: string): void {
        const list = readAutoDelivery(messagesPath);
        if (!list.includes(destination)) {
          list.push(destination);
          const filePath = resolveAutoDeliveryPath(messagesPath);
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
        }
      }

      function removeAutoDelivery(messagesPath: string, destination: string): void {
        const list = readAutoDelivery(messagesPath).filter(d => d !== destination);
        const filePath = resolveAutoDeliveryPath(messagesPath);
        fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
      }

   **Design notes:**

   * ``resolveAutoDeliveryPath`` is a pure derivation — no new config key needed
   * All three functions accept the resolved ``messages.json`` path so callers
     use the same ``resolveMessagesPath()`` source of truth
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


.. spec:: Auto-Delivery Poll Loop
   :id: SPEC_MSG_AUTODELIVER_POLL
   :status: implemented
   :links: REQ_MSG_AUTODELIVER_POLL; SPEC_MSG_AUTODELIVER_STORE; SPEC_MSG_AUTODELIVER_TAG; SPEC_MSG_SENDCOMMAND

    **Description:**

    A ``setInterval`` poll loop started in ``extension.ts`` during ``activate()``.
    Each tick finds the first auto-delivery session that has un-notified messages,
    opens the chat session directly, sends the notification stub, and marks those
    messages as notified. If the destination session cannot be found, the poll
    loop opens a new editor chat and first sends ``/rename <sessionName>`` so
    future deliveries can resolve the session by name.

   **Tick logic (inlined in extension.ts):**

   .. code-block:: typescript

      const pollInterval = setInterval(async () => {
        const messagesPath = resolveMessagesPath();
        const autoList = readAutoDelivery(messagesPath);
        if (autoList.length === 0) { return; }
        const messages = readQueue(messagesPath);

        for (const sessionName of autoList) {
          const pending = messages.filter(
            m => m.destination === sessionName && !m.notified
          );
          if (pending.length === 0) { continue; }

          // Open chat session directly via UUID lookup
          const uuid = await lookupSessionUUID(sessionName);
          if (uuid) {
            // ... open session tab ...
          } else {
            await vscode.commands.executeCommand('vscode.open',
              vscode.Uri.parse('vscode-chat-session://local/new'));
            await new Promise(resolve => setTimeout(resolve, 800));
            await vscode.commands.executeCommand(
              'workbench.action.chat.open', { query: `/rename ${sessionName}` }
            );
            await new Promise(resolve => setTimeout(resolve, 800));
          }

          // Send notification stub
          const stub = `[Jarvis Message Service] Du hast ${pending.length} neue ...`;
          await vscode.commands.executeCommand(
            'workbench.action.chat.open', { query: stub, isPartialQuery: false }
          );

          // Mark messages as notified
          const updated = readQueue(messagesPath);
          for (const m of updated) {
            if (m.destination === sessionName && !m.notified) {
              m.notified = true;
            }
          }
          writeQueue(messagesPath, updated);
          messageProvider.reload();
          break; // max one session per tick
        }
      }, 5000);

      context.subscriptions.push({ dispose: () => clearInterval(pollInterval) });

   **Design notes:**

   * Delivery logic is inlined rather than delegating to ``jarvis.sendMessages``
     — the poll loop opens the session tab directly via ``lookupSessionUUID`` and
     ``workbench.action.chat.open`` with ``{ isPartialQuery: false }``, avoiding
     the synthetic ``SessionGroupNode`` and preserving the session's agent mode
     (unlike ``sendPromptToFocusedAgentChat`` which uses ``openAgent``)
   * ``break`` after the first notified session implements the "max 1 per tick"
     constraint from ``REQ_MSG_AUTODELIVER_POLL AC-5``
   * ``context.subscriptions.push({ dispose: () => clearInterval(...) })``
     ensures the timer is cleared on deactivation
   * The ``log`` reference is the shared ``LogOutputChannel`` already created
     during ``activate()``


.. spec:: Auto-Delivery Message Tree Provider
   :id: SPEC_MSG_AUTODELIVER_TREE
   :status: implemented
   :links: REQ_MSG_AUTODELIVER_TREE; REQ_MSG_AUTODELIVER_CMDS; SPEC_MSG_TREEPROVIDER; SPEC_MSG_AUTODELIVER_STORE

   **Description:**
   Restructure ``MessageTreeProvider`` in ``src/messageTreeProvider.ts`` to
   separate manual sessions from auto-delivery sessions. A new
   ``AutoDeliveryGroupNode`` appears as a fixed root entry. The provider
   receives a ``resolveAutoDeliveryPath`` helper (or the ``messagesPath``
   resolver) so it can read ``autodelivery.json``.

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
          addAutoDelivery(resolveMessagesPath(), node.destination);
          messageProvider.reload();
        }
      );

      vscode.commands.registerCommand(
        'jarvis.disableAutoDelivery',
        (node?: SessionGroupNode) => {
          if (!node) { return; }
          removeAutoDelivery(resolveMessagesPath(), node.destination);
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

   Add the following property alongside the existing ``jarvis.messagesFile``
   entry in the ``Messages`` settings group:

   .. code-block:: json

      "jarvis.messages.logging": {
        "type": "boolean",
        "default": false,
        "description": "When enabled, every queued message is also appended to a persistent message-log.json audit file (never cleaned up by read/delete operations)."
      }


.. spec:: Message Audit Log Implementation
   :id: SPEC_MSG_AUDITLOG
   :status: implemented
   :links: REQ_MSG_AUDITLOG; REQ_MSG_LOGSETTING; SPEC_MSG_QUEUESTORE; SPEC_MSG_LOGSETTING

   **Description:**
   Extend ``appendMessage()`` in ``src/messageQueue.ts`` to optionally append
   to ``message-log.json`` when ``jarvis.messages.logging`` is ``true``.

   **Log file path helper (module-internal):**

   .. code-block:: typescript

      function resolveLogPath(messagesPath: string): string {
          return path.join(path.dirname(messagesPath), 'message-log.json');
      }

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
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, JSON.stringify(queue, null, 2));

          const loggingEnabled = vscode.workspace
              .getConfiguration('jarvis')
              .get<boolean>('messages.logging', false);
          if (loggingEnabled) {
              const logPath = resolveLogPath(filePath);
              const log = readQueue(logPath);
              log.push(entry);
              fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
          }
      }

   **Design notes:**

   * ``resolveLogPath`` is not exported — internal to ``messageQueue.ts``
   * The parent directory already exists at this point (``mkdirSync`` is called
     above for ``messages.json``), so no additional ``mkdirSync`` is needed for
     the log file
   * ``vscode.workspace.getConfiguration()`` is called live inside
     ``appendMessage()`` — no parameter change to the function signature; the
     setting is read on every call so hot-changes take effect immediately
   * ``readQueue(logPath)`` reuses the existing helper; returns ``[]`` safely if
     the file does not yet exist, creating it on first write
   * No changes to ``popMessage()``, ``deleteMessage()``, or
     ``deleteByDestination()`` — audit trail integrity is maintained by omission


.. spec:: Pinned Resource Open Helper
   :id: SPEC_MSG_PINNED
   :status: implemented
   :links: REQ_MSG_PINNED; SPEC_MSG_SESSIONLOOKUP

   **Description:**
   Private async helper ``openPinnedResource`` in ``extension.ts`` opens any
   ``vscode-chat-session://`` URI in a pinned (non-preview) editor tab. The
   ``{ preview: false }`` option prevents VS Code from silently reusing a
   transient editor slot ("ghost editor" issue).

   **Implementation:**

   .. code-block:: typescript

      async function openPinnedResource(uri: vscode.Uri): Promise<void> {
          await vscode.commands.executeCommand('vscode.open', uri, { preview: false });
      }

   **Callers:**

   * ``jarvis.sendMessages`` — opens the existing session tab before submitting
     the notification stub
   * ``jarvis.openSession`` — opens the selected session from the QuickPick
   * ``jarvis.openAgentSession`` — opens the existing session tab when a UUID
     is found; also used as the fallback path in ``SPEC_MSG_OPENCHAT``

   **Design decisions:**

   * ``{ preview: false }`` as the third argument to ``vscode.open`` is the sole
     purpose of this helper — it ensures the tab is permanently pinned and not
     recycled by the editor group
   * Extracted into a named helper (rather than inlined) for consistency across
     all three callers


.. spec:: New Chat Editor Helper
   :id: SPEC_MSG_OPENCHAT
   :status: implemented
   :links: REQ_MSG_OPENCHAT; SPEC_MSG_PINNED

   **Description:**
   Private async helper ``openNewChatEditor`` in ``extension.ts`` creates a new
   VS Code Chat editor. Uses ``workbench.action.openChat`` as the primary
   mechanism, falling back to the ``vscode-chat-session://local/new`` URI via
   ``openPinnedResource`` if the command is unavailable.

   **Implementation:**

   .. code-block:: typescript

      async function openNewChatEditor(): Promise<void> {
          try {
              await vscode.commands.executeCommand('workbench.action.openChat');
          } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              log.warn(`[MSG] workbench.action.openChat failed, falling back to URI open: ${message}`);
              await openPinnedResource(vscode.Uri.parse('vscode-chat-session://local/new'));
          }
      }

   **Callers:**

   * ``jarvis.sendMessages`` — when no UUID is found for the target session name
   * ``jarvis.openAgentSession`` — when no UUID is found for the entity name

   **Design decisions:**

   * ``workbench.action.openChat`` is a VS Code internal command with no public
     stability guarantee. The try/catch + fallback is mandatory (D-1 from
     ``stable-session-open`` change).
   * The fallback URI ``vscode-chat-session://local/new`` is passed through
     ``openPinnedResource`` so it also gets ``{ preview: false }`` treatment.
   * Failures are logged at ``warn`` (not ``error``) — the fallback is expected
     to succeed in practice, so this is a degraded-mode warning.


.. spec:: Agent Chat Prompt Helper
   :id: SPEC_MSG_SENDPROMPT
   :status: implemented
   :links: REQ_MSG_SENDPROMPT; SPEC_MSG_OPENCHAT

   **Description:**
   Private async helper ``sendPromptToFocusedAgentChat`` in ``extension.ts``
   submits a query string to the active VS Code Chat input in agent mode. Uses
   a two-level fallback to tolerate API differences across VS Code builds.

   **Implementation:**

   .. code-block:: typescript

      async function sendPromptToFocusedAgentChat(query: string): Promise<void> {
          try {
              await vscode.commands.executeCommand('workbench.action.chat.focusInput');
          } catch {
              // Best effort: older VS Code builds may not expose the focus command.
          }

          try {
              await vscode.commands.executeCommand(
                  'workbench.action.chat.openAgent',
                  { query, isPartialQuery: false }
              );
          } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              log.warn(`[MSG] workbench.action.chat.openAgent failed, falling back to chat.open: ${message}`);
              await vscode.commands.executeCommand(
                  'workbench.action.chat.open',
                  { query, isPartialQuery: false, mode: 'agent' }
              );
          }
      }

   **Callers:**

   * ``jarvis.sendMessages`` — submits the notification stub
   * ``jarvis.openAgentSession`` (new session path) — submits the ``/rename``
     command and the context initialization prompt in sequence
   * Auto-delivery poll loop — submits the notification stub for each
     auto-delivery session

   **Session initialization sequence in ``jarvis.openAgentSession`` (new session):**

   .. code-block:: typescript

      // 1. Create new session
      await openNewChatEditor();
      await new Promise(resolve => setTimeout(resolve, 800));

      // 2. Rename session to entity name (D-4)
      await sendPromptToFocusedAgentChat(`/rename ${entity.name}`);
      await new Promise(resolve => setTimeout(resolve, 800));

      // 3. Send context initialization prompt (D-3)
      const entityFolder = path.dirname(element.id);
      const contextPath = path.join(entityFolder, 'context.md');
      const initPrompt =
          `You are working on the project/event "${entity.name}". ` +
          `Please read the relevant project context from ${contextPath}.`;
      await sendPromptToFocusedAgentChat(initPrompt);

   **Design decisions:**

   * ``workbench.action.chat.focusInput`` failure is silently swallowed — it is
     purely a UX hint and the submission step does not depend on it.
   * ``workbench.action.chat.openAgent`` is the preferred submission command
     because it targets agent mode explicitly.
   * The fallback uses ``workbench.action.chat.open`` with ``mode: 'agent'`` —
     an older API shape that achieves the same effect on pre-1.100 builds.
   * Both commands are VS Code internals with no public stability guarantee.
   * The 800 ms ``setTimeout`` between steps is a heuristic to allow the VS Code
     Chat UI to complete its tab-open animation before the next command is sent.
     No polling or event-based synchronization is available through the public API.
   * ``contextPath`` is derived from ``path.dirname(element.id)`` — the actual
     folder containing the entity's YAML file (D-3). This avoids kebab-case
     derivation errors when entity names contain characters that do not map
     cleanly to folder names.

   **Open edge — title normalization:**

   ``lookupSessionUUID`` uses exact-match comparison (``s.title === sessionName``).
   No trimming or prefix normalization is applied. If VS Code adds a prefix or
   trailing space to a renamed session title, the lookup will miss the session and
   a new session will be created instead. This is an accepted limitation until a
   more robust matching strategy (e.g. ``includes`` or regex) is implemented.


.. spec:: Agent Session Init Sequence
   :id: SPEC_MSG_AGENTSESSION
   :status: implemented
   :links: REQ_MSG_AGENTSESSION; REQ_EXP_AGENTSESSION; SPEC_MSG_OPENCHAT; SPEC_MSG_SENDPROMPT; SPEC_MSG_PINNED

   **Description:**
   The `jarvis.openAgentSession` command orchestrates the full lifecycle of
   opening or creating an agent chat session for a project or event leaf node.

   **Sequence (existing session):**

   1. Resolve UUID via `lookupSessionUUID(entity.name)`
   2. Open pinned via `openPinnedResource(chatSessionUri)`

   **Sequence (new session):**

   1. Resolve UUID -- not found
   2. `openNewChatEditor()` -- wait 800 ms
   3. `sendPromptToFocusedAgentChat('/rename <entityName>')` -- wait 800 ms
   4. Build `contextPath`: `path.dirname(element.id)` (the actual YAML folder)
      joined with `context.md` via `path.join()`
   5. `sendPromptToFocusedAgentChat(initPrompt)` with `contextPath`

   **Design notes:**

   * The 800 ms delay is a heuristic to allow the VS Code Chat UI to complete
     its tab-open animation -- no event-based synchronization is available.
   * `contextPath` is derived from `path.dirname(element.id)` (the actual folder
     of the entity's YAML file) rather than from the display name, avoiding
     kebab-case derivation errors.
   * `lookupSessionUUID` uses exact title match; prefix or suffix issues may
     cause a new session to be created instead of reusing an existing one.