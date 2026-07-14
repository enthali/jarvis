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
     ``jarvis.openAgentSession`` and ``jarvis.sendMessages``) — previously
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


.. spec:: Send Messages Command
   :id: SPEC_MSG_SENDCOMMAND
   :status: draft
   :links: REQ_MSG_SEND; REQ_MSG_SESSIONLOOKUP; SPEC_MSG_SESSIONLOOKUP; SPEC_MSG_QUEUESTORE; REQ_MSG_AUTODELIVER_TAG; REQ_MSG_NOTIFICATION_TEMPLATE; REQ_ENT_AGENTPROMPT_TEMPLATE; SPEC_ENT_AGENTSESSION_INITPROMPT; SPEC_MSG_EDITORPLACEMENT; SPEC_MSG_OPENCHAT

   **Description:**
   Register ``jarvis.sendMessages`` in ``extension.ts``. Invoked from the session
   group node's inline action. Focuses the chat session tab at the Main
   placement target (``SPEC_MSG_EDITORPLACEMENT`` — same target as an Actor
   tree click, since this is likewise a user-initiated action), submits a
   single notification stub informing the session about pending messages,
   then refreshes the tree. Messages remain in the queue — the session
   consumes them via ``jarvis_readMessage``.

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
            // Main placement: close+reopen at column 1 if open elsewhere
            // (SPEC_MSG_EDITORPLACEMENT, REQ_MSG_SEND AC-9)
            await openAtMain(uri, node.destination);
            // agent-mode-persistence (GH #25): VS Code drops a session's custom
            // agent mode on window reload; defensively re-apply it to the now
            // focused editor. See SPEC_MSG_OPENCHAT reapplyAgentMode() note.
            const entityForSend = scanner?.entities.find(e => e.name === node.destination);
            if (entityForSend?.agent) {
              await reapplyAgentMode(entityForSend.agent, node.destination);
            }
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

   **Design notes:**

   * ``openAtMain`` (``SPEC_MSG_EDITORPLACEMENT``) replaces the prior
     ``openPinnedResource`` call for the existing-session branch — the same
     helper used by ``jarvis.openAgentSession`` (``SPEC_ENT_AGENTSESSION``),
     since both are user-initiated actions that SHALL land at Main
     (``REQ_MSG_SEND`` AC-9). The fresh-session-creation branch
     (``openNewChatEditor``/``renameFocusedChatSession``) is unchanged for
     the same reason documented in ``SPEC_ENT_AGENTSESSION``: no VS Code API
     exists to force the view column of a chat editor at creation time.


.. spec:: Read Message LM Tool
   :id: SPEC_MSG_READMESSAGE
   :status: deprecated
   :links: REQ_MSG_READ; SPEC_MSG_QUEUESTORE; SPEC_MSG_SESSIONLOOKUP

   **Deprecated by:** ``SPEC_MSG_RECEIVEMESSAGE`` (message-api-rename CR).
   **Hard deprecation (PM design pivot, 2026-07-03):** the original
   soft-deprecation design below (pop-oldest behaviour kept fully functional,
   response carries a ``warning`` field) was implemented first, then observed
   in practice to fail: agents kept calling ``jarvis_readMessage`` and
   ignoring the warning. The handler is now reduced to an unconditional error
   throw — see "Hard-deprecated handler" below, which **replaces** the
   previously-specified pop-oldest handler in its entirety. Full removal of
   the tool registration itself remains GH Issue #13 (separate future
   change).

   **Description:**
   ``jarvis_readMessage`` remains registered in
   ``packages/core/src/extension.ts`` via ``engine.registerTool()`` (for
   discoverability and a clear, named error at call time) but its handler no
   longer pops any message from the queue or refreshes the Messages tree —
   every invocation fails immediately.

   **Hard-deprecated handler:**

   .. code-block:: typescript

      // readMessage — HARD DEPRECATED (REQ_MSG_READ AC-3/4/5)
      const readMessageTool = engine.registerTool('jarvis_readMessage',
          '[DEPRECATED AND DISABLED — use jarvis_receiveMessage instead.] Reads and removes the oldest message from the Jarvis message queue for the given destination session.',
          async (_options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
              throw new Error(
                  'This tool is deprecated and no longer functional. Use jarvis_receiveMessage instead.'
              );
          }
      );

   **Registration in package.json:**

   .. code-block:: json

      {
        "name": "jarvis_readMessage",
        "displayName": "Read Message from Inbox",
        "modelDescription": "[DEPRECATED AND DISABLED — use jarvis_receiveMessage instead.] Reads and removes the oldest message from the Jarvis inbox for the given destination session.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "readMessage",
        "icon": "$(mail-read)",
        "inputSchema": {
          "type": "object",
          "properties": {
            "destination": { "type": "string", "description": "Deprecated — this tool no longer functions. Use jarvis_receiveMessage." }
          },
          "required": ["destination"]
        }
      }

   **Design notes:**

   * The ``inputSchema`` is left unchanged from the pre-deprecation contract
     (REQ_MSG_READ AC-2) so that existing callers pass schema validation and
     reach the handler, where they receive the clear deprecation error rather
     than a confusing schema-validation failure.
   * The error is thrown unconditionally, before ``destination`` is inspected
     — no ``popMessage()`` call, no ``messageProvider.reload()`` call. This
     guarantees AC-4 ("no message SHALL ever be popped") by construction, not
     by a validation branch that could have an escape hatch.
   * **Historical reference — pre-hard-deprecation design (superseded, kept
     for change history only):** the original implementation popped the
     oldest queued message via ``popMessage(resolveMessagesPath(),
     destination)`` and returned ``{ message, remaining }`` (or
     ``{ message: null, remaining: 0 }`` when empty), refreshing the Messages
     tree via ``messageProvider.reload()`` after each pop. This logic now
     lives solely in ``jarvis_receiveMessage`` (``SPEC_MSG_RECEIVEMESSAGE``),
     unchanged.

   * Pop-oldest semantics: ``findIndex`` returns the first match (FIFO order)
   * The queue file is rewritten after each pop — acceptable performance for
     typical queue sizes (single-digit to low tens of messages)
   * ``messageProvider.reload()`` is called after each pop to keep the Messages
     tree in sync
   * Disposable pushed to ``context.subscriptions``
   * **Deprecation warning (message-api-rename CR, REQ_MSG_READ AC-7):** the
     ``modelDescription`` above SHALL be prefixed with ``"[DEPRECATED — use
     jarvis_receiveMessage instead.]"``; the success payload SHALL include an
     additional ``warning`` field with the text ``"jarvis_readMessage is
     deprecated; use jarvis_receiveMessage instead."`` (added alongside the
     existing ``message``/``remaining`` fields). This applies to both the
     message-found and no-messages (``message: null``) response shapes.


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
   ``extension.ts`` (renamed from ``jarvis_listActors``).
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
        "modelDescription": "Returns the list of named VS Code chat session tab titles in the current workspace. Use this to discover active chat tabs. Distinct from jarvis_listActors which lists YAML session entities.",
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
     ``jarvis_listActors`` / ``jarvis_listProjects`` plus the ``kind``
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
   :links: REQ_MSG_AUTODELIVER_POLL; SPEC_MSG_AUTODELIVER_STORE; SPEC_MSG_AUTODELIVER_TAG; SPEC_MSG_SENDCOMMAND; REQ_MSG_NOTIFICATION_TEMPLATE; SPEC_MSG_OPENCHAT; REQ_ENT_AGENTPROMPT_TEMPLATE; SPEC_ENT_AGENTSESSION_INITPROMPT; SPEC_MSG_EDITORPLACEMENT; SPEC_MSG_FOCUSRESTORE; SPEC_MSG_AUTODELIVERY_OPTOUT

   **Description:**

   A ``setInterval`` poll loop started in ``extension.ts`` during ``activate()``.
   Each tick finds the first auto-delivery session that has un-notified messages
   and is not the currently active tab (``SPEC_MSG_AUTODELIVERY_OPTOUT``), opens
   the chat session at its placement target (``SPEC_MSG_EDITORPLACEMENT`` —
   Secondary column if not yet open, else focus in place), sends the
   notification stub, and marks those messages as notified. The user's prior
   focus is snapshotted before the disruptive open and restored immediately
   after (``SPEC_MSG_FOCUSRESTORE``). If the destination session cannot be
   found, the poll loop opens a **fresh** chat editor via
   ``openNewChatEditor()`` (``SPEC_MSG_OPENCHAT``) and first calls
   ``renameFocusedChatSession(sessionName)`` so future deliveries can resolve
   the session by name.

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
          if (isSessionActiveTab(sessionName)) { continue; } // SPEC_MSG_AUTODELIVERY_OPTOUT

          // Snapshot focus before the disruptive delivery (SPEC_MSG_FOCUSRESTORE)
          const focus = await snapshotFocus();

          // Open chat session directly via UUID lookup
          const uuid = await lookupSessionUUID(sessionName);
          if (uuid) {
            // Open at Secondary placement — focus-in-place if already open
            // anywhere, else the last existing column (SPEC_MSG_EDITORPLACEMENT)
            const b64 = Buffer.from(uuid).toString('base64');
            const uri = vscode.Uri.parse(`vscode-chat-session://local/${b64}`);
            await openAtSecondary(uri, sessionName);
            // agent-mode-persistence (GH #25): re-apply the custom agent mode
            // VS Code drops on window reload, to the now focused editor.
            // See SPEC_MSG_OPENCHAT reapplyAgentMode() note.
            const entityForPoll = scanner?.entities.find(e => e.name === sessionName);
            if (entityForPoll?.agent) {
              await reapplyAgentMode(entityForPoll.agent, sessionName);
            }
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

          // Restore the user's prior focus immediately, no artificial delay
          // (SPEC_MSG_FOCUSRESTORE)
          await restoreFocus(focus);
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
   * The active-use opt-out check (``isSessionActiveTab``) runs before the
     focus snapshot — an actively-focused session is skipped entirely, so no
     snapshot/restore cycle is triggered for it
   * ``openAtSecondary`` (``SPEC_MSG_EDITORPLACEMENT``) replaces the prior
     ad-hoc tab-opening logic for the UUID-found branch; the fresh-session
     branch (``openNewChatEditor``) is intentionally left unchanged — a
     brand-new session has no prior tab to place relative to


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


.. spec:: Editor-Group Placement Helper
   :id: SPEC_MSG_EDITORPLACEMENT
   :status: approved
   :links: REQ_MSG_EDITORPLACEMENT; SPEC_MSG_SESSIONLOOKUP; SPEC_MSG_PINNED; SPEC_MSG_TREEPROVIDER

   **Description:**
   A set of helper functions in ``extension.ts`` computing the three
   placement targets (Main/Docs/Secondary) at call time from
   ``vscode.window.tabGroups.all`` — no persisted state. Validated on the
   throwaway spike branch ``experiment/editor-group-placement`` (6 test
   commands; reference only, never merged).

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

      async function openAtDocs(uri: vscode.Uri): Promise<void> {
          const existing = findFileTab(uri.fsPath);
          const viewColumn = existing ? existing.group.viewColumn : DOCS_COLUMN;
          await vscode.commands.executeCommand('vscode.open', uri, {
              preview: false,
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
     name (via ``lookupSessionUUID``) or a known entity file path — any file
     the user opens manually is entirely outside this contract.
   * ``openAtMain``/``openAtDocs``/``openAtSecondary`` replace ad-hoc
     ``vscode.open(uri, { preview: false })`` calls at their respective call
     sites (``SPEC_ENT_AGENTSESSION``, ``SPEC_ENT_ENTITY_FILE_CHILDREN``,
     ``SPEC_MSG_AUTODELIVER_POLL``, ``SPEC_MSG_SENDCOMMAND``,
     ``SPEC_MSG_TREEPROVIDER``) — see each spec's updated handler.

   **New call site (``ui-improvements`` CR): Messages tree group-node click**

   ``SessionGroupNode``'s ``TreeItem.command`` (previously unset,
   ``SPEC_MSG_TREEPROVIDER``) is bound to a new command that opens the
   session's chat at Main, mirroring ``jarvis.openAgentSession``'s and
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
   pattern as the entity tree's click-to-chat binding
   (``REQ_ENT_ENTITY_TREECLICK``), not a right-click action.

   **Design note:** if no session UUID resolves (the destination has no
   live chat session yet — e.g. all messages are still queued and no
   session has ever been opened for that destination), the handler is a
   silent no-op rather than creating a new session. This differs
   deliberately from ``jarvis.openAgentSession``/``jarvis.sendMessages``,
   which both create a fresh session on miss — a label click in the
   Messages tree is a lower-intent, exploratory action (unlike explicitly
   clicking "Play" to send), so silently doing nothing is preferred over
   surprising the user with a brand-new chat session.


.. spec:: Focus-Snapshot and Restore Helper
   :id: SPEC_MSG_FOCUSRESTORE
   :status: approved
   :links: REQ_MSG_FOCUSRESTORE; SPEC_MSG_EDITORPLACEMENT; SPEC_MSG_SESSIONLOOKUP

   **Description:**
   Helper functions capturing and restoring the user's focus around a
   system-initiated delivery. Validated on the spike (6th test command,
   ``chatInjectRetryTest``) — restore is reliable, including under
   keyboard-autofire stress; see the Research Finding for full test detail.

   **Snapshot type:**

   .. code-block:: typescript

      type FocusSnapshot =
          | { kind: 'editor'; uri: vscode.Uri; viewColumn: vscode.ViewColumn }
          | { kind: 'terminal'; terminal: vscode.Terminal }
          | undefined;

   **Snapshot capture:**

   .. code-block:: typescript

      async function snapshotFocus(): Promise<FocusSnapshot> {
          const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
          if (activeTab) {
              // Chat-editor tabs expose no .uri on tab.input — resolve the
              // real session UUID via lookupSessionUUID(tab.label), the same
              // mechanism used for Main/Secondary placement
              // (SPEC_MSG_EDITORPLACEMENT, REQ_MSG_FOCUSRESTORE AC-2). The
              // tab's label is the session *name*, not a UUID — it must be
              // resolved, never encoded directly.
              const existingUri = (activeTab.input as { uri?: vscode.Uri } | undefined)?.uri;
              let uri = existingUri;
              if (!uri) {
                  const uuid = await lookupSessionUUID(activeTab.label);
                  if (!uuid) { return undefined; } // unresolvable chat tab — nothing to restore
                  uri = vscode.Uri.parse(
                      `vscode-chat-session://local/${Buffer.from(uuid).toString('base64')}`
                  );
              }
              return {
                  kind: 'editor',
                  uri,
                  viewColumn: activeTab.group.viewColumn,
              };
          }
          if (vscode.window.activeTerminal) {
              return { kind: 'terminal', terminal: vscode.window.activeTerminal };
          }
          return undefined;
      }

   **Restore (no artificial delay — see Design notes):**

   .. code-block:: typescript

      async function restoreFocus(snapshot: FocusSnapshot): Promise<void> {
          if (!snapshot) { return; }
          if (snapshot.kind === 'editor') {
              await vscode.commands.executeCommand('vscode.open', snapshot.uri, {
                  preview: false,
                  viewColumn: snapshot.viewColumn,
                  preserveFocus: false,
              });
          } else {
              snapshot.terminal.show();
          }
      }

   **Usage pattern (poll loop):**

   .. code-block:: typescript

      const focus = await snapshotFocus();
      await deliverToSession(sessionName);  // the disruptive action
      await restoreFocus(focus);            // immediately after, no delay

   **Design notes:**

   * ``snapshotFocus()`` is ``async`` because resolving a chat tab's real
     UUID requires ``lookupSessionUUID`` (a ``state.vscdb`` read,
     ``SPEC_MSG_SESSIONLOOKUP``) — the tab's ``label`` is the session
     *name*, never the UUID itself, so it must always be resolved, never
     encoded directly into the restore URI (``REQ_MSG_FOCUSRESTORE`` AC-2).
     An earlier design draft encoded ``activeTab.label`` directly, which
     would have produced a malformed, non-navigable URI at restore time —
     corrected here.
   * **No artificial delay between disrupt and restore.** An earlier spike
     revision added a defensive ``setTimeout(800)`` before restore; removing
     it (relying solely on awaiting the disruptive action's own promise)
     reduced snapshot-to-restore time from 839 ms to ~520 ms and reduced
     leaked keystrokes during active typing from 23 to 0-1.
   * The remaining ~520 ms is the real Extension-Host↔Renderer IPC round
     trip for two sequential ``open()`` calls (disrupt + restore) —
     considered the practical lower bound for a UI-based restore mechanism.
   * **Accepted limitation**: a keystroke typed at the exact moment of the
     transient focus shift may be misrouted (OS-level input-routing
     property, not a bug in this mechanism). Accepted because the delivery
     target is a VS Code Chat query consumed by an LLM, which tolerates a
     stray/misplaced character trivially.


.. spec:: Auto-Delivery Active-Use Opt-Out Check
   :id: SPEC_MSG_AUTODELIVERY_OPTOUT
   :status: approved
   :links: REQ_MSG_AUTODELIVERY_OPTOUT; SPEC_MSG_AUTODELIVER_POLL; SPEC_MSG_EDITORPLACEMENT

   **Description:**
   A predicate checked by the poll loop before delivering to a session,
   skipping delivery if that session's tab is the currently active
   (focused) editor tab.

   **Implementation:**

   .. code-block:: typescript

      function isSessionActiveTab(sessionName: string): boolean {
          const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
          return activeTab?.label === sessionName;
      }

   **Usage in the poll loop:**

   .. code-block:: typescript

      for (const sessionName of autoList) {
          const pending = messages.filter(
              m => m.destination === sessionName && !m.notified
          );
          if (pending.length === 0) { continue; }
          if (isSessionActiveTab(sessionName)) { continue; } // AC-1/AC-2: skip, retry next tick
          // ... proceed to delivery (SPEC_MSG_AUTODELIVER_POLL) ...
      }

   **Design notes:**

   * No new persisted state — reuses ``vscode.window.tabGroups`` already
     read by ``SPEC_MSG_EDITORPLACEMENT``'s helpers.
   * Does not affect ``jarvis.sendMessages`` (manual delivery) — the check
     is only called from the poll loop's tick logic.
   * A session that stays continuously active is never auto-delivered to
     while active; this is accepted (``REQ_MSG_AUTODELIVERY_OPTOUT`` AC-5) —
     the user can always read queued messages manually via
     ``jarvis_readMessage``.


.. spec:: Pinned Resource Open Helper
   :id: SPEC_MSG_PINNED
   :status: implemented
   :links: REQ_MSG_PINNED; SPEC_MSG_SESSIONLOOKUP; SPEC_MSG_EDITORPLACEMENT

   **Description:**
   Private async helper ``openPinnedResource`` in ``extension.ts`` opens any
   ``vscode-chat-session://`` URI in a pinned (non-preview) editor tab. The
   ``{ preview: false }`` option prevents VS Code from silently reusing a
   transient editor slot ("ghost editor" issue). Accepts an optional target
   view column so callers can direct the open per the placement model
   (``SPEC_MSG_EDITORPLACEMENT``).

   **Implementation:**

   .. code-block:: typescript

      async function openPinnedResource(
          uri: vscode.Uri,
          viewColumn?: vscode.ViewColumn
      ): Promise<void> {
          await vscode.commands.executeCommand('vscode.open', uri, {
              preview: false,
              ...(viewColumn !== undefined ? { viewColumn } : {}),
          });
      }

   **Callers:**

   * ``jarvis.sendMessages`` — opens the existing session tab before submitting
     the notification stub
   * ``jarvis.openSession`` — opens the selected session from the QuickPick
   * ``jarvis.openAgentSession`` — opens the existing session tab when a UUID
     is found; also used as the fallback path in ``SPEC_MSG_OPENCHAT``

   **Design decisions:**

   * ``{ preview: false }`` as part of the options object to ``vscode.open`` is
     the sole original purpose of this helper — it ensures the tab is
     permanently pinned and not recycled by the editor group
   * Extracted into a named helper (rather than inlined) for consistency across
     all three callers
   * The optional ``viewColumn`` parameter is additive — omitting it preserves
     prior behavior (VS Code's default column resolution) for any caller not
     yet updated to pass a placement target


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

   **Amendment — re-applying mode on an EXISTING session (agent-mode-persistence, GH #25):**

   The immutable-mode assumption above holds ONLY for the generic
   ``workbench.action.chat.open { mode }`` command: called on an already-active
   session it reveals the sidebar chat VIEW (its underlying action carries no
   bound mode, so it always falls back to ``revealWidget()``) and therefore has
   no effect on a focused chat EDITOR. This is why mode could previously only be
   bound at creation time.

   However, VS Code ALSO registers an **undocumented per-mode command** for every
   discovered agent mode, named ``workbench.action.chat.open<ModeName>`` (e.g.
   ``workbench.action.chat.openTest Manager`` — the mode name, spaces included,
   is appended verbatim). Unlike the generic command, this per-mode action
   carries a bound ``this.mode`` and therefore targets the currently focused chat
   EDITOR widget and switches its mode in place. This makes it possible to
   RESTORE the correct agent mode on an existing session after VS Code silently
   drops it on window reload (upstream bug ``microsoft/vscode#317276``).

   **Decision:** Jarvis deliberately uses this per-mode command as a defensive
   patch for ``microsoft/vscode#317276``. The command-name scheme
   (``open`` + verbatim mode name) is an **undocumented VS Code implementation
   detail** and MAY break on future VS Code updates; the helper below is written
   defensively so that a missing command degrades to a no-op (logged warning)
   rather than a hard failure.

   **Helper — ``reapplyAgentMode(agent, context)``:**
   Private async helper in ``extension.ts``. Given an agent/mode name (from an
   entity's ``agent`` field) it re-applies that mode to the currently focused
   chat editor. Semantics:

   * Waits **400 ms** first, so the just-opened/focused editor tab is the active
     chat widget before the mode-specific command runs.
   * Builds the dynamic command id ``workbench.action.chat.open${agent}``.
   * Probes the command registry via ``vscode.commands.getCommands(true)`` and
     **skips** (logged warning, no throw) if the command is not registered yet —
     this tolerates the race where the mode has not been registered immediately
     after a reload.
   * Executes the command, then waits **300 ms** to let the switch settle.
   * All failures are caught and logged; the helper never throws.

   .. code-block:: typescript

      async function reapplyAgentMode(agent: string, context: string): Promise<void> {
          try {
              await new Promise(resolve => setTimeout(resolve, 400));
              const cmdId = `workbench.action.chat.open${agent}`;
              const available = await vscode.commands.getCommands(true);
              if (!available.includes(cmdId)) {
                  log.warn(`[MSG] reapplyAgentMode: command "${cmdId}" not registered yet — skipping for "${context}"`);
                  return;
              }
              await vscode.commands.executeCommand(cmdId);
              await new Promise(resolve => setTimeout(resolve, 300));
              log.info(`[MSG] reapplyAgentMode: re-applied agent mode "${agent}" to session "${context}"`);
          } catch (err) {
              log.warn(`[MSG] reapplyAgentMode: failed to re-apply agent mode "${agent}" for "${context}": ${err}`);
          }
      }

   ``reapplyAgentMode()`` is called from the existing-session (UUID) branches of
   the two delivery paths — ``SPEC_MSG_SENDCOMMAND`` (after ``openAtMain``) and
   ``SPEC_MSG_AUTODELIVER_POLL`` (after ``openAtSecondary``) — when the target
   entity has an ``agent`` set.


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
   :status: deprecated
   :links: REQ_MSG_SENDTOSESSION; SPEC_MSG_SESSIONLOOKUP; SPEC_MSG_QUEUESTORE

   **Deprecated by:** ``SPEC_MSG_SENDMESSAGE`` (message-api-rename CR). **Hard
   deprecation (PM design pivot, 2026-07-03):** the original soft-deprecation
   design below (destination validation + queueing kept fully functional,
   response carries a ``warning`` field) was implemented first, then observed
   in practice to fail: agents kept calling ``jarvis_sendToSession`` and
   ignoring the warning. The handler is now reduced to an unconditional error
   throw — see "Hard-deprecated handler" below, which **replaces** the
   previously-specified destination-validating handler in its entirety. Full
   removal of the tool registration itself remains GH Issue #13 (separate
   future change).

   **Description:**
   ``jarvis_sendToSession`` remains registered in
   ``packages/core/src/extension.ts`` via ``engine.registerTool()`` (for
   discoverability and a clear, named error at call time) but its handler no
   longer performs destination validation, sender resolution, or queueing of
   any kind — every invocation fails immediately.

   **Hard-deprecated handler:**

   .. code-block:: typescript

      // sendToSession — HARD DEPRECATED (REQ_MSG_SENDTOSESSION AC-3/4/5/6)
      const sendToSessionTool = engine.registerTool('jarvis_sendToSession',
          '[DEPRECATED AND DISABLED — use jarvis_sendMessage instead.] Queues a message for delivery to another VS Code chat session identified by name.',
          async (_options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
              throw new Error(
                  'This tool is deprecated and no longer functional. Use jarvis_sendMessage instead.'
              );
          }
      );

   **Registration in package.json:**

   .. code-block:: json

      {
        "name": "jarvis_sendToSession",
        "displayName": "Send Message to Session",
        "modelDescription": "[DEPRECATED AND DISABLED — use jarvis_sendMessage instead.] Queues a text message for delivery to a destination identified by name.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "sendToSession",
        "icon": "$(mail)",
        "inputSchema": {
          "type": "object",
          "properties": {
            "session": { "type": "string", "description": "Deprecated — this tool no longer functions. Use jarvis_sendMessage." },
            "text": { "type": "string", "description": "Deprecated — this tool no longer functions. Use jarvis_sendMessage." },
            "senderSession": { "type": "string", "description": "Deprecated — this tool no longer functions. Use jarvis_sendMessage." }
          },
          "required": ["session", "text"]
        }
      }

   **Design notes:**

   * The ``inputSchema`` (parameter shapes, ``required`` list) is left
     unchanged from the pre-deprecation contract (REQ_MSG_SENDTOSESSION AC-2)
     so that existing callers pass schema validation and reach the handler,
     where they receive the clear deprecation error rather than a confusing
     schema-validation failure.
   * The error is thrown unconditionally, before any input is inspected — no
     destination lookup, no ``getValidDestinations()`` call, no
     ``appendMessage()`` call. This guarantees AC-4 ("no message SHALL ever be
     appended") by construction, not by a validation branch that could have
     an escape hatch.
   * ``getValidDestinations()`` (the shared resolver in ``sessionLookup.ts``)
     is untouched by this deprecation — it is still actively used by the
     canonical ``jarvis_sendMessage`` (``SPEC_MSG_SENDMESSAGE``) and by
     heartbeat validation; only ``jarvis_sendToSession``'s own handler stopped
     calling it.
   * **Historical reference — pre-hard-deprecation design (superseded, kept
     for change history only):** the original implementation validated
     ``session`` against the union of named VS Code chat session titles
     (``state.vscdb`` via ``getAllSessions()`` + ``filterNamedSessions()``)
     and YAML entity names from the scanner store, then appended the message
     with sender resolved from ``senderSession`` or the active tab label or
     ``'unknown'`` (LM path) / ``'mcp-client'`` (MCP path). This logic now
     lives solely in ``jarvis_sendMessage`` (``SPEC_MSG_SENDMESSAGE``) with
     the sender side hardened (required + validated, no fallback).


.. spec:: Send Message LM / MCP Tool (Canonical)
   :id: SPEC_MSG_SENDMESSAGE
   :status: draft
   :links: REQ_MSG_SENDMESSAGE; REQ_MSG_DEST_ERROR; REQ_MSG_SENDER_ERROR; SPEC_MSG_SESSIONLOOKUP; SPEC_MSG_QUEUESTORE

   **Description:**
   Implements the canonical ``jarvis_sendMessage`` tool in
   ``packages/core/src/extension.ts`` via ``engine.registerTool()`` — the same
   registration helper already used for ``jarvis_sendToSession`` (a single LM
   handler; the tool is automatically exposed over MCP too via
   ``packages/mcp``'s dynamic tool-descriptor bridge, which derives the MCP
   input schema from this tool's ``package.json`` ``inputSchema`` at server
   start and forwards MCP calls into the same handler through
   ``JarvisCoreApi.invokeTool()`` — see ``SPEC_MOD_MCP_PKG``/
   ``SPEC_ENG_TOOLREGISTRY``). There is **no** separate MCP handler or Zod
   schema to author; one handler serves both surfaces.

   Destination validation logic equivalent to what ``jarvis_sendToSession``
   performed before its hard deprecation, plus a mandatory, validated
   ``senderSession`` — no active-tab fallback.

   **Handler (in the ``activate()`` core-tools section, alongside the existing
   ``sendToSessionTool``):**

   .. code-block:: typescript

      // sendMessage (canonical — REQ_MSG_SENDMESSAGE)
      const sendMessageTool = engine.registerTool('jarvis_sendMessage',
          'Queues a text message for delivery to a destination identified by name. senderSession is required and validated.',
          async (options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
              const { session, text, senderSession } = options.input;
              const validNames = await getValidDestinations(kindDrivenScanner);
              const sortedNames = () => {
                  const sorted = [...validNames].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
                  return sorted.length > 0 ? sorted.join(', ') : '(none)';
              };

              // Destination validation (REQ_MSG_SENDMESSAGE AC-3/4)
              if (!validNames.includes(session)) {
                  throw new Error(`Destination session "${session}" does not exist.\nValid destinations: ${sortedNames()}`);
              }

              // Sender validation (REQ_MSG_SENDMESSAGE AC-5/6, REQ_MSG_SENDER_ERROR)
              if (!senderSession || String(senderSession).trim() === '') {
                  throw new Error(
                      'senderSession is required. Callers must explicitly provide their session name — do not rely on the active editor tab.'
                  );
              }
              if (!validNames.includes(senderSession)) {
                  throw new Error(`Sender session "${senderSession}" does not exist.\nValid senders: ${sortedNames()}`);
              }

              // Both valid — queue the message (REQ_MSG_SENDMESSAGE AC-7)
              appendMessage(resolveMessagesPath(), session, senderSession, text);
              log.info(`[MSG] sendMessage: destination="${session}", sender="${senderSession}"`);
              messageProvider.reload();
              return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(`Message queued for destination "${session}" from "${senderSession}"`)
              ]);
          }
      );

   **Registration in package.json (``languageModelTools`` contribution):**

   .. code-block:: json

      {
        "name": "jarvis_sendMessage",
        "displayName": "Send Message",
        "modelDescription": "Queues a text message for delivery to a destination identified by name. Valid destinations are VS Code chat session tabs AND YAML entity names (sessions, projects, events). senderSession is required and validated against the same set — callers must pass their own session name explicitly. Fails immediately with an error if the destination or sender does not exist.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "sendMessage",
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
              "description": "Required: the exact name of the sending session — must not be omitted or inferred from the active tab"
            }
          },
          "required": ["session", "text", "senderSession"]
        }
      }

   **Design notes:**

   * Validation order is destination-first, sender-second (REQ_MSG_SENDMESSAGE
     AC-8).
   * ``getValidDestinations()`` (the shared resolver in ``sessionLookup.ts``,
     previously called by ``jarvis_sendToSession`` before its hard
     deprecation — see ``SPEC_MSG_SENDTOSESSION``) is reused unmodified — the
     sender is checked against the exact same set as the destination
     (REQ_MSG_SENDER_ERROR AC-3); no new resolver is introduced.
   * Unlike ``jarvis_sendToSession``, there is no ``activeTab?.label``
     fallback — ``senderSession`` is a required ``inputSchema`` field, so a
     missing value is normally caught by schema validation before the handler
     runs; the explicit runtime check (empty-string guard) is a
     defense-in-depth backstop.
   * The queued message's ``sender`` field is the caller-supplied
     ``senderSession`` verbatim — this is the mechanism that fixes the
     misattribution bug described in the message-api-rename CD (e.g.
     ``sender: "message-log.json"``), since the value no longer depends on
     which editor tab happens to be focused.
   * No ``warning`` field is added to this tool's success payload — it is the
     canonical, non-deprecated tool.
   * **MCP surface:** no new file/schema is needed in ``packages/mcp`` — the
     tool becomes available over MCP automatically the moment it is
     registered via ``engine.registerTool()`` with a ``package.json``
     ``inputSchema``, following the same path as every other core tool
     (``buildToolDescriptors()`` in ``packages/mcp/src/extension.ts``). The
     CD Appendix's mention of "MCP schema (Zod) in packages/mcp" does not
     apply to core tools under the current (post-monorepo-split) engine
     tool-registry architecture; it describes an earlier design
     (``SPEC_MSG_DUALREGISTRATION``) that predates the split and is not what
     ``packages/core/src/extension.ts`` currently implements.


.. spec:: Receive Message LM / MCP Tool (Canonical)
   :id: SPEC_MSG_RECEIVEMESSAGE
   :status: draft
   :links: REQ_MSG_RECEIVEMESSAGE; SPEC_MSG_QUEUESTORE; SPEC_MSG_SESSIONLOOKUP

   **Description:**
   Implements the canonical ``jarvis_receiveMessage`` tool in
   ``packages/core/src/extension.ts`` via ``engine.registerTool()`` — a rename
   of the existing ``jarvis_readMessage`` handler, with **no other functional
   change**. Pops the oldest queued message for a given destination session
   and returns it along with the remaining count. Automatically available over
   MCP the same way as ``jarvis_sendMessage`` (see ``SPEC_MSG_SENDMESSAGE``
   Design notes) — no separate MCP handler or schema.

   **Handler (in the ``activate()`` core-tools section, alongside the existing
   ``readMessageTool``):**

   .. code-block:: typescript

      // receiveMessage (canonical — REQ_MSG_RECEIVEMESSAGE)
      const receiveMessageTool = engine.registerTool('jarvis_receiveMessage',
          'Reads and removes the oldest message from the Jarvis message queue for the given destination session.',
          async (options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
              const result = popMessage(resolveMessagesPath(), options.input.destination);
              log.info(`[MSG] receiveMessage: destination="${options.input.destination}", remaining=${result.remaining}`);
              messageProvider.reload();
              if (result.message) {
                  return new vscode.LanguageModelToolResult([
                      new vscode.LanguageModelTextPart(JSON.stringify({
                          message: { sender: result.message.sender, text: result.message.text, timestamp: result.message.timestamp },
                          remaining: result.remaining
                      }))
                  ]);
              }
              return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(JSON.stringify({ message: null, remaining: 0 }))
              ]);
          }
      );

   **Registration in package.json (``languageModelTools`` contribution):**

   .. code-block:: json

      {
        "name": "jarvis_receiveMessage",
        "displayName": "Receive Message from Inbox",
        "modelDescription": "Reads and removes the oldest message from the Jarvis inbox for the given destination session. Returns { message: { sender, text, timestamp } | null, remaining: number }. Call repeatedly until remaining === 0.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "receiveMessage",
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

   * Behaviour is identical to the existing ``jarvis_readMessage`` handler in
     every respect other than the tool name.
   * Pop-oldest semantics: ``findIndex`` returns the first match (FIFO order)
   * ``messageProvider.reload()`` is called after each pop to keep the
     Messages tree in sync
   * Disposable returned by ``engine.registerTool()``, pushed to
     ``context.subscriptions`` by the caller (consistent with all other core
     tools)


