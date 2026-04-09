Message Queue Design Specifications
=====================================

.. spec:: Message Queue File Store
   :id: SPEC_MSG_QUEUESTORE
   :status: implemented
   :links: REQ_MSG_QUEUE; REQ_CFG_MSGPATH

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
   :links: REQ_MSG_SEND; REQ_MSG_DELETE; REQ_MSG_SESSIONLOOKUP; SPEC_MSG_SESSIONLOOKUP; SPEC_MSG_QUEUESTORE

   **Description:**
   Register ``jarvis.sendMessages`` in ``extension.ts``. Invoked from the session
   group node's inline action. Focuses the chat session tab, submits each message
   with a routing preamble, then clears the destination's queue entries.

   When invoked from the Command Palette (without a node argument), a warning is
   shown and the command returns early.

   **Preamble format:**

   Each message is prefixed with::

      [Jarvis Message Service — from: <sender>, to: <destination>]

   followed by the original message text.

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

          // 3. Submit each message with preamble
          for (const child of node.children) {
            const preamble =
              `[Jarvis Message Service — from: ${child.sender}, to: ${node.destination}]\n\n`;
            await vscode.commands.executeCommand(
              'workbench.action.chat.open',
              { query: preamble + child.text }
            );
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // 4. Remove delivered messages from queue
          deleteByDestination(resolveMessagesPath(), node.destination);

          // 5. Refresh tree
          messageProvider.reload();
        }
      );

   Also registers ``jarvis.deleteMessage`` for single message deletion.
   The ``jarvis.openSession`` command is specified separately in
   ``SPEC_MSG_OPENSESSION``.


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
