Message Queue Design Specifications
=====================================

.. spec:: Message Queue File Store
   :id: SPEC_MSG_QUEUESTORE
   :status: implemented
   :links: REQ_MSG_QUEUE; REQ_MSG_READ; REQ_CFG_MSGPATH; REQ_CFG_FIXEDPATHS

   **Description:**
   Module ``src/messageQueue.ts`` provides synchronous file-backed read/write/delete
   operations on the JSON message queue. The file path is resolved by
   ``configPaths.getMessagesPath()`` (see ``SPEC_CFG_PATHRESOLVER``). If that
   function returns ``undefined`` (no workspace open), reads return an empty list
   and writes are silently skipped. The ``.jarvis/`` parent directory is created on
   first write via ``configPaths.ensureJarvisDir()``.

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
   :status: draft
   :links: REQ_MSG_SEND; REQ_MSG_SESSIONLOOKUP; SPEC_MSG_SESSIONLOOKUP; SPEC_MSG_QUEUESTORE; REQ_MSG_AUTODELIVER_TAG; REQ_MSG_NOTIFICATION_TEMPLATE; REQ_ENT_AGENTPROMPT_TEMPLATE; SPEC_ENT_AGENTSESSION_INITPROMPT

   **Description:**
   Register ``jarvis.sendMessages`` in ``extension.ts``. Invoked from the session
   group node's inline action. Focuses the chat session tab, submits a single
   notification stub informing the session about pending messages, then refreshes
   the tree. Messages remain in the queue — the session consumes them via
   ``jarvis_readMessage``.

   When invoked from the Command Palette (without a node argument), a warning is
   shown and the command returns early.

   **Stub format:**

   The notification stub is sent as a single ``workbench.action.chat.open`` query.
   The text is produced by calling ``applyTemplate(template, vars)`` (see
   ``SPEC_ENT_AGENTSESSION_INITPROMPT`` for the shared helper definition), where
   ``template`` is the value of ``jarvis.messages.notificationTemplate`` (falling
   back to the built-in English default from ``REQ_MSG_NOTIFICATION_TEMPLATE``
   when empty/whitespace), and ``vars`` is ``{ count, destination }``.

   Built-in default after substitution (example, count=2, destination="Atlas")::

      [Jarvis Message Service] You have 2 new message(s) in your inbox.
      Read them with the jarvis_readMessage tool (destination: "Atlas") until remaining = 0.

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
            // Resolve entity first (needed for mode-prime and init-prompt)
            const entity = scanner?.entities.find(e => e.name === node.destination);

            // Mode-primed creation: prime the VS Code Chat mode selector BEFORE
            // openNewChatEditor() so the new session is born in the bound mode.
            // (SPEC_MSG_OPENCHAT mode-prime note, REQ_ENT_AGENTPROMPT_TEMPLATE AC-6)
            if (entity?.agent) {
              await vscode.commands.executeCommand(
                  'workbench.action.chat.open', { mode: entity.agent }
              );
              await new Promise(resolve => setTimeout(resolve, 300));
            }

            // No existing session — create new pinned chat editor (inherits primed mode)
            await openNewChatEditor();  // SPEC_MSG_OPENCHAT (includes 800 ms settle delay)

            // Name the new chat session so future deliveries can resolve it.
            await renameFocusedChatSession(node.destination);

            // Send init prompt if the destination matches a known entity
            // (REQ_MSG_SEND AC-8, SPEC_ENT_AGENTSESSION_INITPROMPT)
            if (entity) {
              const kind = entity.kind ?? 'project';
              const contextPath = path.join(entity.folder, 'context.md');
              const rawInitTemplate = vscode.workspace.getConfiguration('jarvis')
                  .get<string>('agentSession.initPromptTemplate') ?? '';
              const initTemplate = rawInitTemplate.trim() ? rawInitTemplate : DEFAULT_INIT_PROMPT;
              const initPrompt = applyTemplate(initTemplate, { kind, name: entity.name, contextPath });
              await vscode.commands.executeCommand(
                  'workbench.action.chat.open', { query: initPrompt }
              );
            }
          }

          // 3. Send single notification stub
          const count = node.children.length;
          const cfg = vscode.workspace.getConfiguration('jarvis');
          const stub = applyTemplate(
            cfg.get<string>('messages.notificationTemplate', ''),
            { count: String(count), destination: node.destination }
          );  // REQ_MSG_NOTIFICATION_TEMPLATE, SPEC_ENT_AGENTSESSION_INITPROMPT
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
   :status: draft
   :links: REQ_MSG_LISTSESSIONS; REQ_MSG_SESSIONFILTER; SPEC_MSG_SESSIONLOOKUP

   **Description:**
   Register ``jarvis_listChatSessions`` as a Language Model Tool in
   ``extension.ts`` (renamed from ``jarvis_listSessions``).
   Returns the list of named VS Code chat session tab titles from the current
   workspace so that LLM agents can discover active chat tabs.

   **Handler:**

   .. code-block:: typescript

      vscode.lm.registerTool('jarvis_listChatSessions', {
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
        "name": "jarvis_listChatSessions",
        "displayName": "List Chat Sessions",
        "modelDescription": "Returns the list of named VS Code chat session tab titles in the current workspace. Use this to discover active chat tabs. Distinct from jarvis_listSessions which lists YAML session entities.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "listChatSessions",
        "icon": "$(list-unordered)",
        "inputSchema": {
          "type": "object",
          "properties": {}
        }
      }

   **Design notes:**

   * No input parameters — the tool returns all named chat sessions
   * Uses the same filter as ``SPEC_MSG_OPENSESSION``: non-empty title,
     not ``'New Chat'``
   * Returns JSON array of title strings
   * Disposable pushed to ``context.subscriptions``


.. spec:: List Jarvis Sessions Tool
   :id: SPEC_MSG_JARVISSESSIONS
   :status: draft
   :links: REQ_MSG_JARVISSESSIONS; REQ_ENG_SESSIONLIST; SPEC_ENG_SESSIONLIST

   **Description:**
   Register ``jarvis_listJarvisSessions`` via the engine's ``registerTool`` (dual
   LM + MCP registration) in ``extension.ts``. The handler returns the result of
   ``JarvisCoreApi.listJarvisSessions()`` — every scanned entity across all
   registered kinds. It owns no enumeration logic of its own; it is a thin wrapper
   over the platform API (``SPEC_ENG_SESSIONLIST``).

   **Handler:**

   .. code-block:: typescript

      const listJarvisSessionsTool = engine.registerTool(
        'jarvis_listJarvisSessions',
        'Lists all Jarvis sessions (sessions, projects, events) across all kinds.',
        async (
          _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
          _token: vscode.CancellationToken
        ) => {
          const sessions = engine.listJarvisSessions();
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(JSON.stringify(sessions))
          ]);
        }
      );
      context.subscriptions.push(listJarvisSessionsTool);

   **Registration in package.json:**

   .. code-block:: json

      {
        "name": "jarvis_listJarvisSessions",
        "displayName": "List Jarvis Sessions",
        "modelDescription": "Returns all Jarvis sessions across every kind (sessions, projects, events). Each entry has {name, summary, agent, kind, folder}. Use this to enumerate all agent-session-capable entities without coupling to a specific add-on.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "listJarvisSessions",
        "icon": "$(list-tree)",
        "inputSchema": {
          "type": "object",
          "properties": {}
        }
      }

   **Design notes:**

   * No input parameters — returns every scanned entity across all kinds.
   * Registered via the engine's ``registerTool`` (not raw ``vscode.lm``), so it
     is simultaneously an LM Tool and an MCP Tool (dual registration,
     ``SPEC_MSG_MCPSERVER``).
   * Output shape ``{name, summary, agent, kind, folder}`` is consistent with
     ``jarvis_listSessions`` / ``jarvis_listProjects`` plus the ``kind``
     discriminator.
   * Distinct from ``jarvis_listChatSessions`` (VS Code chat tab titles from
     ``state.vscdb``) — this lists YAML entities held by the central scanner.
   * Disposable pushed to ``context.subscriptions``.


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

   See ``SPEC_MSG_SENDTOSESSION`` for the destination-validating implementation
   of ``jarvis_sendToSession``.

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
   :status: draft
   :links: REQ_MSG_AUTODELIVER_POLL; SPEC_MSG_AUTODELIVER_STORE; SPEC_MSG_AUTODELIVER_TAG; SPEC_MSG_SENDCOMMAND; REQ_MSG_NOTIFICATION_TEMPLATE; SPEC_MSG_OPENCHAT; REQ_ENT_AGENTPROMPT_TEMPLATE; SPEC_ENT_AGENTSESSION_INITPROMPT

   **Description:**

   A ``setInterval`` poll loop started in ``extension.ts`` during ``activate()``.
   Each tick finds the first auto-delivery session that has un-notified messages,
   opens the chat session directly, sends the notification stub, and marks those
   messages as notified. If the destination session cannot be found, the poll
   loop opens a **fresh** chat editor via ``openNewChatEditor()``
   (``SPEC_MSG_OPENCHAT``) and first calls ``renameFocusedChatSession(sessionName)`` so future
   deliveries can resolve the session by name.

   **Rationale — URI-reuse bug fix:**
   ``openNewChatEditor()`` (``SPEC_MSG_OPENCHAT``) ensures each auto-delivery
   tick opens a unique editor; see ``SPEC_MSG_OPENCHAT`` for the canonical
   rationale.

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
            // Resolve entity first (needed for mode-prime and init-prompt)
            const entity = scanner?.entities.find(e => e.name === sessionName);

            // Mode-primed creation: prime the VS Code Chat mode selector BEFORE
            // openNewChatEditor() so the new session is born in the bound mode.
            // (SPEC_MSG_OPENCHAT mode-prime note, REQ_ENT_AGENTPROMPT_TEMPLATE AC-6)
            if (entity?.agent) {
              await vscode.commands.executeCommand(
                  'workbench.action.chat.open', { mode: entity.agent }
              );
              await new Promise(resolve => setTimeout(resolve, 300));
            }

            // Create a fresh chat editor (inherits primed mode)
            await openNewChatEditor();  // SPEC_MSG_OPENCHAT (includes 800 ms settle delay)
            await renameFocusedChatSession(sessionName);

            // Send init prompt if the session name matches a known entity
            // (REQ_MSG_AUTODELIVER_POLL AC-8, SPEC_ENT_AGENTSESSION_INITPROMPT)
            if (entity) {
              const kind = entity.kind ?? 'project';
              const contextPath = path.join(entity.folder, 'context.md');
              const rawInitTemplate = vscode.workspace.getConfiguration('jarvis')
                  .get<string>('agentSession.initPromptTemplate') ?? '';
              const initTemplate = rawInitTemplate.trim() ? rawInitTemplate : DEFAULT_INIT_PROMPT;
              const initPrompt = applyTemplate(initTemplate, { kind, name: entity.name, contextPath });
              await vscode.commands.executeCommand(
                  'workbench.action.chat.open', { query: initPrompt }
              );
            }
          }

          // Send notification stub
          const cfg = vscode.workspace.getConfiguration('jarvis');
          const stub = applyTemplate(
            cfg.get<string>('messages.notificationTemplate', ''),
            { count: String(pending.length), destination: sessionName }
          );  // REQ_MSG_NOTIFICATION_TEMPLATE, SPEC_ENT_AGENTSESSION_INITPROMPT
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

   Add the following property to the ``Messages`` settings group:

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
   :status: draft
   :links: REQ_MSG_OPENCHAT; SPEC_MSG_PINNED

   **Description:**
   Private async helper ``openNewChatEditor`` in ``extension.ts`` creates a new
   VS Code Chat editor. Executes ``workbench.action.openChat`` and waits 800 ms
   for the editor to settle.

   **Rationale — URI-reuse bug fix (canonical):**
   The previous implementation used the constant URI
   ``vscode-chat-session://local/new``. VS Code treats this as navigation to the
   same resource; subsequent calls reuse the already-open editor. Replacing with
   ``workbench.action.openChat`` generates a unique session URI per invocation
   and always produces a dedicated editor. The try/catch + fallback path from the
   original design was unreachable in observed behavior (PM-validated); the
   simplified implementation was adopted.

   **Implementation:**

   .. code-block:: typescript

      async function openNewChatEditor(): Promise<void> {
          await vscode.commands.executeCommand('workbench.action.openChat');
          await new Promise(resolve => setTimeout(resolve, 800));
      }

   **Callers:**

   * ``jarvis.sendMessages`` — when no UUID is found for the target session name
   * ``jarvis.openAgentSession`` — when no UUID is found for the entity name
   * Auto-delivery poll loop — when no UUID is found for the auto-delivery session name

   **Design decisions:**

   * ``workbench.action.openChat`` is a VS Code internal command with no public
     stability guarantee; however, the try/catch + fallback path was unreachable
     in observed behavior (PM-validated simplified implementation).
   * The 800 ms ``setTimeout`` after the command is a heuristic settle delay so
     the VS Code Chat UI completes its tab-open animation before the next command
     (e.g. ``renameFocusedChatSession``) is sent.

   **Mode-primed creation pattern (delta — mode-apply reliability):**
   ``workbench.action.openChat`` does not accept a ``mode`` parameter, and
   ``workbench.action.chat.open { mode }`` called on an already-active session
   does NOT retroactively change that session's mode. Mode is bound to a VS Code
   Chat session at creation time via the UI mode selector. To open a new session
   in a specific mode, callers must prime the mode selector BEFORE calling
   ``openNewChatEditor()``:

   .. code-block:: typescript

      // Prime mode selector so openNewChatEditor() creates session in bound mode
      if (entity.agent) {
          await vscode.commands.executeCommand(
              'workbench.action.chat.open', { mode: entity.agent }
          );
          await new Promise(resolve => setTimeout(resolve, 300));
      }
      await openNewChatEditor();  // session is born in the primed mode

   This pattern is used by all three new-session callers when ``entity.agent``
   is set. ``openNewChatEditor()`` itself remains mode-agnostic.


.. spec:: Agent Chat Prompt Helper
   :id: SPEC_MSG_SENDPROMPT
   :status: draft
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
     command only; the init prompt is submitted directly via
     ``workbench.action.chat.open { query: initPrompt }`` (see
     ``SPEC_ENT_AGENTSESSION``)
   * Auto-delivery poll loop — submits the notification stub for each
     auto-delivery session

   .. note::

      The full new-session sequence for ``jarvis.openAgentSession`` (including
      the mode-prime step and init-prompt submission) is canonical in
      ``SPEC_ENT_AGENTSESSION``.

   **Design decisions:**

   * ``workbench.action.chat.focusInput`` failure is silently swallowed — it is
     purely a UX hint and the submission step does not depend on it.
   * ``workbench.action.chat.openAgent`` is the preferred submission command
     because it targets agent mode explicitly.
   * The fallback uses ``workbench.action.chat.open`` with ``mode: 'agent'`` —
     an older API shape that achieves the same effect on pre-1.100 builds.
   * Both commands are VS Code internals with no public stability guarantee.
   * The 800 ms ``setTimeout`` between the two ``sendPromptToFocusedAgentChat``
     calls is a heuristic to allow the VS Code Chat input to settle between prompt
     submissions. The tab-open settle delay is handled internally by
     ``openNewChatEditor()`` (see ``SPEC_MSG_OPENCHAT``).
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
   :status: draft
   :links: REQ_MSG_AGENTSESSION; REQ_ENT_AGENTSESSION; SPEC_MSG_OPENCHAT; SPEC_MSG_SENDPROMPT; SPEC_MSG_PINNED

   **Description:**
   The `jarvis.openAgentSession` command orchestrates the full lifecycle of
   opening or creating an agent chat session for a project or event leaf node.

   **Sequence (existing session):**

   1. Resolve UUID via `lookupSessionUUID(entity.name)`
   2. Open pinned via `openPinnedResource(chatSessionUri)`

   **Sequence (new session):**

   1. Resolve UUID -- not found
   2. If ``entity.agent`` is set: ``workbench.action.chat.open { mode: entity.agent }``
      + 300 ms settle -- primes the VS Code Chat mode selector
   3. ``openNewChatEditor()`` (includes 800 ms settle delay -- SPEC_MSG_OPENCHAT)
      -- creates fresh session inheriting the primed mode
   4. ``renameFocusedChatSession(entity.name)`` -- wait 800 ms
   5. Build ``contextPath``: ``path.dirname(element.id)`` (the actual YAML folder)
      joined with ``context.md`` via ``path.join()``
   6. ``workbench.action.chat.open { query: initPrompt }`` -- mode-param omitted;
      mode was set at creation in step 2–3

   **Design notes:**

   * Mode must be applied at session creation time (step 2). ``workbench.action.chat.open
     { mode }`` on an already-focused session does NOT switch its mode; this is why
     the mode was unreliable in the pre-delta implementation (mode was set in the
     final ``chat.open`` call, after the session was already born without a mode).
   * The 300 ms delay (step 2) is a heuristic to let the VS Code Chat mode selector
     settle before ``workbench.action.openChat`` reads it. Callers skip step 2 when
     ``entity.agent`` is absent; ``openNewChatEditor()`` opens in the user's current mode.
   * The 800 ms delay in step 3 (within ``openNewChatEditor()``) is the tab-open
     animation settle delay; see ``SPEC_MSG_OPENCHAT``.
   * ``contextPath`` is derived from ``path.dirname(element.id)`` (the actual folder
     of the entity's YAML file) rather than from the display name, avoiding
     kebab-case derivation errors.
   * ``lookupSessionUUID`` uses exact title match; prefix or suffix issues may
     cause a new session to be created instead of reusing an existing one.


.. spec:: Reminder Store Module
   :id: SPEC_MSG_REMINDERSTORE
   :status: draft
   :links: REQ_MSG_REMINDERS_PERSIST; SPEC_MSG_QUEUESTORE; REQ_CFG_FIXEDPATHS

   **Description:**
   New module ``src/reminders.ts`` provides synchronous file-backed read/write
   operations for the ``reminders.yaml`` file. The file path is resolved by
   ``configPaths.getRemindersPath()`` (see ``SPEC_CFG_PATHRESOLVER``). The file
   lives at ``<workspaceRoot>/.jarvis/reminders.yaml``; it is not co-located by
   path derivation from ``messages.json`` — both paths are independently resolved
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

   * ``js-yaml`` (already a runtime dependency via ``yamlScanner.ts``) —
     ``import * as yaml from 'js-yaml'``
   * Node.js built-in ``crypto.randomUUID()`` — no new dependency

   **Design notes:**

   * Path resolution is delegated to ``configPaths.getRemindersPath()``; the
     old ``resolveRemindersPath(messagesPath)`` helper (which derived the path
     from ``messages.json``'s directory) is replaced by this delegation.
     ``extension.ts`` calls ``configPaths.getRemindersPath()`` directly.
   * ``popDueReminders`` is atomic: it reads, separates due from remaining,
     writes remaining, then returns due — no separate ``removeReminder`` call
     needed from the poll loop
   * ``log`` is the shared ``LogOutputChannel`` set via a module-level setter
     ``setRemindersLogger(log)`` called once during ``activate()``


.. spec:: Reminder Poll Loop Integration
   :id: SPEC_MSG_REMINDERSLOOP
   :status: draft
   :links: REQ_MSG_REMINDERS_DELIVER; SPEC_MSG_AUTODELIVER_POLL; SPEC_MSG_REMINDERSTORE; SPEC_MSG_AUTODELIVER_STORE; SPEC_MSG_QUEUESTORE

   **Description:**
   Extend the existing 5-second ``setInterval`` poll loop in ``extension.ts``
   to check for due reminders after the auto-delivery handling block. Due
   reminders are enqueued as regular messages and their target sessions are
   automatically added to the auto-delivery list.

   **Extension to the existing tick body (appended after the auto-delivery
   ``break`` guard):**

   .. code-block:: typescript

      // --- Reminder delivery ---
      const remindersPath = resolveRemindersPath(messagesPath);
      const due = popDueReminders(remindersPath, new Date());
      for (const reminder of due) {
        try {
          // 1. Enqueue the reminder as a regular message
          appendMessage(messagesPath, reminder.session, 'Reminder', reminder.text);
          // 2. Ensure auto-delivery is enabled for this session
          addAutoDelivery(messagesPath, reminder.session);
          log.info(
            `[MSG] Reminder "${reminder.id}" delivered to session "${reminder.session}"`
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

   * **Auto-delivery enablement**: ``addAutoDelivery`` is idempotent — calling
     it for a session already on the list is a no-op. This ensures the reminder
     message is picked up on the next tick (within 5 s) even if the session was
     not previously on the auto-delivery list.
   * **Append-then-enable order**: The message is appended first, then the
     session is added to auto-delivery. Both operations are synchronous file
     writes — no partial-delivery race condition.
   * **No UI interaction in reminder tick**: The reminder poll block does NOT
     attempt to open the chat session directly; it delegates entirely to the
     auto-delivery mechanism on the next tick. This keeps reminder delivery
     simple and avoids race conditions with the auto-delivery block in the same
     tick.
   * **popDueReminders atomicity**: The reminder is removed from ``reminders.yaml``
     inside ``popDueReminders`` before ``appendMessage`` is called. If
     ``appendMessage`` fails, the reminder is already gone — this is acceptable
     (guaranteed at-most-once delivery is preferable to a delivery retry loop).
   * **Tree refresh**: A single ``remindersProvider.reload()`` plus
     ``messageProvider.reload()`` after all due reminders in a tick is
     sufficient — both views update together.


.. spec:: Reminder LM and MCP Tools Registration
   :id: SPEC_MSG_REMINDERSTOOLS
   :status: draft
   :links: REQ_MSG_REMINDERS_TOOLS; SPEC_MSG_REMINDERSTORE; SPEC_MSG_DUALREGISTRATION

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
          const messagesPath = resolveMessagesPath();
          const reminder = addReminder(
            resolveRemindersPath(messagesPath), text, session, deliverAt
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
          const messagesPath = resolveMessagesPath();
          const reminder = addReminder(
            resolveRemindersPath(messagesPath), text, session, deliverAt
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
          const messagesPath = resolveMessagesPath();
          const reminders = readReminders(resolveRemindersPath(messagesPath));
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
          const messagesPath = resolveMessagesPath();
          const reminders = readReminders(resolveRemindersPath(messagesPath));
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
          const messagesPath = resolveMessagesPath();
          const removed = removeReminder(resolveRemindersPath(messagesPath), id);
          messageProvider.reload();


              JSON.stringify({ status: removed ? 'cancelled' : 'not_found' })
            )
          ]);
        },
        'Cancels a pending reminder by id. Returns { status: "cancelled" | "not_found" }.',
        { id: z.string() },
        async (args) => {
          const id = args.id as string;
          const messagesPath = resolveMessagesPath();
          const removed = removeReminder(resolveRemindersPath(messagesPath), id);
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
          "modelDescription": "Registers a time-scheduled reminder. Delivers a message to the named chat session at deliverAt (ISO 8601). Returns { id, deliverAt }.",
          "canBeReferencedInPrompt": true,
          "toolReferenceName": "setReminder",
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
          "modelDescription": "Returns all pending reminders: { reminders: [{ id, text, session, deliverAt, remainingMs }] }.",
          "canBeReferencedInPrompt": true,
          "toolReferenceName": "listReminders",
          "icon": "$(bell)",
          "inputSchema": { "type": "object", "properties": {} }
        },
        {
          "name": "jarvis_cancelReminder",
          "displayName": "Cancel Reminder",
          "modelDescription": "Cancels a pending reminder by id. Returns { status: 'cancelled' | 'not_found' }.",
          "canBeReferencedInPrompt": true,
          "toolReferenceName": "cancelReminder",
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

   * Root: read ``readReminders(resolveRemindersPath(messagesPath))`` and
     return one ``ReminderNode`` per entry (flat, no group node).
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


.. spec:: Send-to-Session LM / MCP Tool
   :id: SPEC_MSG_SENDTOSESSION
   :status: draft
   :links: REQ_MSG_SENDTOSESSION; REQ_MSG_DEST_ERROR; SPEC_MSG_DUALREGISTRATION; SPEC_MSG_SESSIONLOOKUP; SPEC_MSG_QUEUESTORE

   **Description:**
   Implements the ``jarvis_sendToSession`` Language Model and MCP Tool in
   ``src/extension.ts`` via ``registerDualTool()``.  Adds a pre-write
   destination validation step: the tool resolves the current valid destination
   set, checks membership, and throws a formatted ``Error`` if the destination
   is unknown — leaving the queue untouched.  For a valid destination the
   message is appended as before.

   **Valid destination set — design decision (v0.7.0 BREAKING):**

   The valid destination set is the **union** of:

   1. Named VS Code chat session titles from ``state.vscdb`` (via
      ``getAllSessions()`` + ``filterNamedSessions()``)
   2. YAML entity names from the scanner store (sessions, projects, events —
      via ``scanner.entities.map(e => e.name)``)

   A destination is valid if it appears in **either** subset.

   *Rationale for the union approach:*

   - ``jarvis_sendToSession`` addresses destinations by display name.  A message
     to a project or event entity may arrive before its chat session exists —
     using only chat tabs would reject valid entity-targeted messages.
   - The union ensures that any YAML-defined entity (session, project, event)
     is always a valid destination, whether or not a corresponding VS Code chat
     tab is currently open.
   - Auto-delivery (v0.6.1) already opens a new chat session on first delivery
     when no tab matches; expanding the valid set makes this path reachable.
   - The consolidation with heartbeat validation (AC-6) is achieved by
     extracting a shared ``getValidDestinations()`` function in
     ``src/sessionLookup.ts`` that both ``sendToSession`` and heartbeat call.

   **New shared function in ``src/sessionLookup.ts``:**

   .. code-block:: typescript

      export async function getValidDestinations(
          scanner: YamlScanner | undefined
      ): Promise<string[]> {
          const chatSessions = await getAllSessions();
          const chatNames = filterNamedSessions(chatSessions).map(s => s.title);
          const entityNames = (scanner?.entities ?? []).map(e => e.name);
          // Deduplicate
          return [...new Set([...chatNames, ...entityNames])];
      }

   **Error message format (REQ_MSG_DEST_ERROR):**

   .. code-block:: text

      Destination session "${session}" does not exist.
      Valid destinations: ${names}

   Where ``${names}`` is the alphabetically sorted list of valid session titles
   joined with ``", "``, or ``"(none)"`` when the set is empty.

   *Example (invalid destination, two valid sessions exist):*

   .. code-block:: text

      Destination session "ProjectX" does not exist.
      Valid destinations: Atlas, Research

   *Example (no sessions exist at all):*

   .. code-block:: text

      Destination session "ProjectX" does not exist.
      Valid destinations: (none)

   **Updated handler (replaces the sendToSession example in
   SPEC_MSG_DUALREGISTRATION):**

   .. code-block:: typescript

      const sendToSessionTool = registerDualTool(
        'jarvis_sendToSession',
        // LM handler
        async (options, _token) => {
          const { session, text } = options.input as {
            session: string; text: string; senderSession?: string;
          };

          // Destination validation (REQ_MSG_SENDTOSESSION AC-3/4/5)
          const validNames = await getValidDestinations(scanner);
          if (!validNames.includes(session)) {
            const sorted = [...validNames].sort((a, b) =>
              a.localeCompare(b, undefined, { sensitivity: 'base' })
            );
            const listStr = sorted.length > 0 ? sorted.join(', ') : '(none)';
            throw new Error(
              `Destination session "${session}" does not exist.\n` +
              `Valid destinations: ${listStr}`
            );
          }

          // Valid destination — queue the message (REQ_MSG_SENDTOSESSION AC-6)
          const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
          const sender = (options.input as any).senderSession
            || activeTab?.label
            || 'unknown';
          appendMessage(resolveMessagesPath(), session, sender, text);
          messageProvider.reload();
          log.info(`[MSG] sendToSession: destination="${session}", sender="${sender}"`);
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(
              `Message queued for destination "${session}" from "${sender}"`
            )
          ]);
        },
        // MCP description
        'Queues a message for delivery to another VS Code chat session identified by name. Fails with an error if the destination session does not exist.',
        // MCP input schema (Zod)
        { session: z.string(), senderSession: z.string().optional(), text: z.string() },
        // MCP handler
        async (args) => {
          const session = args.session as string;
          const text = args.text as string;

          // Destination validation (uses same shared resolver)
          const validNames = await getValidDestinations(scanner);
          if (!validNames.includes(session)) {
            const sorted = [...validNames].sort((a, b) =>
              a.localeCompare(b, undefined, { sensitivity: 'base' })
            );
            const listStr = sorted.length > 0 ? sorted.join(', ') : '(none)';
            throw new Error(
              `Destination session "${session}" does not exist.\n` +
              `Valid destinations: ${listStr}`
            );
          }

          const sender = (args.senderSession as string) || 'mcp-client';
          appendMessage(resolveMessagesPath(), session, sender, text);
          messageProvider.reload();
          return { status: 'queued', destination: session, sender };
        }
      );

   **Registration in package.json (updated description):**

   .. code-block:: json

      {
        "name": "jarvis_sendToSession",
        "displayName": "Send Message to Session",
        "modelDescription": "Queues a text message for delivery to a destination identified by name. Valid destinations are VS Code chat session tabs AND YAML entity names (sessions, projects, events). Fails immediately with an error if the destination does not exist — call jarvis_listSessions or jarvis_listChatSessions to discover valid names.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "sendToSession",
        "icon": "$(mail)",
        "inputSchema": {
          "type": "object",
          "properties": {
            "session": {
              "type": "string",
              "description": "The exact name of the target (VS Code chat session title or YAML entity name)"
            },
            "text": {
              "type": "string",
              "description": "The message text to queue"
            },
            "senderSession": {
              "type": "string",
              "description": "Optional: name of the sending session (defaults to active tab label)"
            }
          },
          "required": ["session", "text"]
        }
      }

   **Design notes:**

   * ``getAllSessions()`` + ``filterNamedSessions()`` is an async live DB read
     on each invocation — same cost as the existing path for ``listSessions``.
     For typical workspaces (single-digit to low tens of sessions) this is
     negligible.
   * The validation uses an exact case-sensitive title match (``includes``),
     consistent with the existing addressing model: session names are
     case-sensitive VS Code tab titles.
   * The sorted name list in the error message is alphabetically sorted using
     locale-insensitive base comparison (``sensitivity: 'base'``) so that
     case variants sort together and the output is stable across runs.
   * Throwing ``new Error(...)`` from both the LM and MCP handlers causes the
     tool invocation to surface the message text to the caller:
     VS Code LM surfaces it as a tool-call failure; MCP returns an error
     response body.
   * The ``modelDescription`` is updated to hint that callers should use
     ``jarvis_listSessions`` first — improving agent self-correction without
     requiring a schema change.
   * Backward compatibility: the handler code path for valid destinations is
     identical to the previous implementation; no queue-file format changes.


