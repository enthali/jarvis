Syspilot Lifecycle Design Specifications
=========================================

.. spec:: Syspilot Module Package Structure
   :id: SPEC_SPL_PACKAGE
   :status: draft
   :links: REQ_SPL_PACKAGE; SPEC_MOD_MONOREPO; SPEC_MOD_CORE_PKG

   **Description:**
   ``packages/syspilot`` builds ``enthali.jarvis-syspilot`` with
   ``extensionDependencies: ["enthali.jarvis-core"]``. On activation it obtains
   the core API via
   ``vscode.extensions.getExtension('enthali.jarvis-core')!.exports`` and
   registers its commands and tools.

   **Target layout:**

   .. code-block:: text

      packages/
        syspilot/
          package.json         -> enthali.jarvis-syspilot
          tsconfig.json
          src/
            extension.ts       -> activate / deactivate
            versionCheck.ts    -> startup logic
            state.ts           -> suspend/skip persistence
          out/

   **Acceptance Criteria:**

   * AC-1: Manifest declares ``extensionDependencies: ["enthali.jarvis-core"]``.
   * AC-2: ``contributes.commands`` includes ``jarvis.syspilotUpdate``,
     ``jarvis.delaySyspilotUpdate``, and ``jarvis.SyspilotSkipThisVersion``.
   * AC-3: ``contributes.configuration`` includes ``jarvis.syspilot.releaseTag``
     (string, default ``"main"``).
   * AC-4: The build integrates with the monorepo (``npm run build`` covers it).


.. spec:: Startup Version Check Flow
   :id: SPEC_SPL_STARTUP
   :status: draft
   :links: REQ_SPL_STARTUP_CHECK; REQ_SPL_SUPPLY_CHAIN; REQ_SPL_STATE

   **Description:**
   During ``activate()``, the module performs the version check asynchronously
   (fire-and-forget from activate, so it does not block extension startup).

   **Flow (pseudocode):**

   .. code-block:: typescript

      async function checkSyspilotVersion(api: JarvisCoreApi): Promise<void> {
        const state = readState();  // .jarvis/syspilot-state.json

        // 1. Fetch upstream agent frontmatter
        const tag = vscode.workspace.getConfiguration('jarvis.syspilot')
            .get<string>('releaseTag', 'main');
        const url = `https://raw.githubusercontent.com/enthali/syspilot/${tag}/agents/syspilot.setup.agent.md`;
        let upstreamContent: string;
        try {
          const resp = await fetch(url);
          if (!resp.ok) { log.warn(`[SPL] fetch failed: ${resp.status}`); return; }
          upstreamContent = await resp.text();
        } catch (err) {
          log.warn(`[SPL] network error: ${err}`); return;
        }
        const upstreamVersion = parseFrontmatterVersion(upstreamContent);

        // 2. Check local file
        const localPath = path.join(workspaceRoot, '.github/agents/syspilot.setup.agent.md');
        if (!fs.existsSync(localPath)) {
          // Initial setup: copy files
          fs.mkdirSync(path.dirname(localPath), { recursive: true });
          fs.writeFileSync(localPath, upstreamContent);
          // Also copy bootstrap.json if present in upstream
          await copyCompanionFiles(tag);
          await notifyActor(api, upstreamVersion, 'initial');
          return;
        }

        // 3. Compare versions
        const localContent = fs.readFileSync(localPath, 'utf-8');
        const localVersion = parseFrontmatterVersion(localContent);
        if (localVersion === upstreamVersion) { return; }

        // 4. Check suspend/skip
        if (state.skippedVersion === upstreamVersion) { return; }
        if (state.suspendedUntil && new Date(state.suspendedUntil) > new Date()) { return; }

        // 5. Notify
        await notifyActor(api, upstreamVersion, 'update');
      }

   **Acceptance Criteria:**

   * AC-1: The check runs once per activation (VS Code startup), asynchronously.
   * AC-2: Network failures are caught and logged — no unhandled rejections.
   * AC-3: The local file is never modified after initial copy unless the user
     or the Setup Agent explicitly triggers an update.


.. spec:: Actor Provisioning
   :id: SPEC_SPL_ACTOR
   :status: draft
   :links: REQ_SPL_ACTOR; SPEC_ACT_DUALPATH_SCANNER

   **Description:**
   Before sending a notification, the module ensures the "Syspilot Setup
   Engineer" actor exists. It uses the core API's ``createActor`` function
   (or checks the scanner's entity list) to provision the actor if absent.

   **Pseudocode:**

   .. code-block:: typescript

      async function ensureActor(api: JarvisCoreApi): Promise<void> {
        const sessions = api.listJarvisSessions();
        const exists = sessions.some(s => s.name === 'Syspilot Setup Engineer');
        if (!exists) {
          // Use the jarvis_createActor LM tool via the engine's invokeTool API
          await api.invokeTool('jarvis_createActor', {
            input: {
              name: 'Syspilot Setup Engineer',
              summary: 'Manages syspilot agent installation and updates',
              agent: 'syspilot.setup'
            },
            toolInvocationToken: undefined,
            requestedContentTypes: ['text/plain']
          }, new vscode.CancellationTokenSource().token);
          await api.rescan(); // ensure scanner picks up the new actor
        }
      }

   **Design note:** Actor creation uses ``api.invokeTool('jarvis_createActor', ...)``
   rather than a direct ``createActor()`` method, because the core API does not
   expose entity-write operations as first-class methods — only via registered
   tools. Actor-existence is checked via ``api.listJarvisSessions()`` which
   returns all scanned entities across all kinds.

   **Acceptance Criteria:**

   * AC-1: The actor is created with ``agent: syspilot.setup`` binding.
   * AC-2: If the actor already exists (checked via ``listJarvisSessions()``),
     no modification is made.
   * AC-3: The actor folder is placed under ``.jarvis/actors/Syspilot Setup
     Engineer/`` (actor storage path via ``configPaths.ensureActorsDir()``,
     established since v0.17.0).
   * AC-4: After creation, ``api.rescan()`` is called so subsequent lookups
     reflect the new actor.


.. spec:: Notification Message Construction
   :id: SPEC_SPL_NOTIFY
   :status: draft
   :links: REQ_SPL_NOTIFY; SPEC_MSG_QUEUESTORE

   **Description:**
   The module constructs a message and queues it for the actor via the Jarvis
   message queue (``appendMessage``).

   **Message template:**

   .. code-block:: text

      A new syspilot version is available (${version}).

      You have three options:
      1. Install the update — run your normal setup workflow.
      2. Suspend notifications — call jarvis.delaySyspilotUpdate(<days>) to
         pause for N days.
      3. Skip this version — call jarvis.SyspilotSkipThisVersion() to never
         be notified about this version again.

   **Pseudocode:**

   .. code-block:: typescript

      async function notifyActor(
        api: JarvisCoreApi,
        version: string,
        reason: 'initial' | 'update'
      ): Promise<void> {
        await ensureActor(api);
        const text = reason === 'initial'
          ? `syspilot has been set up for this workspace (version ${version}). ` +
            `Run your setup workflow to configure the workspace.`
          : `A new syspilot version is available (${version}).\n\n` +
            `You have three options:\n` +
            `1. Install the update — run your normal setup workflow.\n` +
            `2. Suspend notifications — call jarvis.delaySyspilotUpdate(<days>).\n` +
            `3. Skip this version — call jarvis.SyspilotSkipThisVersion().`;
        api.sendMessage('Syspilot Setup Engineer', 'jarvis-syspilot', text);
      }

   **Design note:** Uses ``api.sendMessage(destination, sender, text)`` —
   a core API method that bypasses session-name validation (see
   ``SPEC_ENG_API`` AC-8). The module sender ``"jarvis-syspilot"`` is not a
   registered actor/session, so the ``jarvis_sendMessage`` LM tool (which
   validates sender names) cannot be used here.

   **Acceptance Criteria:**

   * AC-1: The message is queued via ``api.sendMessage()`` (core API method).
   * AC-2: The sender field is ``"jarvis-syspilot"``.
   * AC-3: The message text includes the upstream version string.
   * AC-4: Delivery is handled by the existing auto-delivery mechanism — no
     custom delivery logic in this module.


.. spec:: Suspend Command
   :id: SPEC_SPL_SUSPEND
   :status: draft
   :links: REQ_SPL_SUSPEND; REQ_SPL_STATE

   **Description:**
   Registers ``jarvis.delaySyspilotUpdate`` as both a VS Code command and an
   LM tool (via ``registerTool``). When invoked, persists a "suspended until"
   timestamp.

   **Pseudocode:**

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.delaySyspilotUpdate',
        async (days?: number) => {
          const d = days ?? 7; // default 7 days
          const until = new Date();
          until.setDate(until.getDate() + d);
          const state = readState();
          state.suspendedUntil = until.toISOString();
          writeState(state);
          vscode.window.showInformationMessage(
            `Syspilot update notifications suspended until ${until.toLocaleDateString()}.`
          );
        }
      );

   **LM Tool registration:**

   .. code-block:: typescript

      api.registerTool({
        name: 'jarvis_delaySyspilotUpdate',
        description: 'Suspend syspilot update notifications for N days',
        inputSchema: {
          type: 'object',
          properties: { days: { type: 'number', description: 'Days to suspend' } },
          required: ['days']
        },
        handler: async (options) => {
          await vscode.commands.executeCommand(
            'jarvis.delaySyspilotUpdate', options.days
          );
          return { content: [{ type: 'text', text: `Suspended for ${options.days} day(s).` }] };
        }
      });

   **Acceptance Criteria:**

   * AC-1: The command persists ``suspendedUntil`` in ``.jarvis/syspilot-state.json``.
   * AC-2: The LM tool name follows convention: ``jarvis_delaySyspilotUpdate``.
   * AC-3: Default suspension is 7 days if no argument is provided.


.. spec:: Skip Version Command
   :id: SPEC_SPL_SKIP
   :status: draft
   :links: REQ_SPL_SKIP; REQ_SPL_STATE

   **Description:**
   Registers ``jarvis.SyspilotSkipThisVersion`` as both a VS Code command and
   an LM tool. When invoked, persists the current upstream version as "skipped."

   **Pseudocode:**

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.SyspilotSkipThisVersion',
        async () => {
          const state = readState();
          // Read the upstream version from the last check (cached in state)
          if (!state.lastSeenUpstreamVersion) {
            vscode.window.showWarningMessage(
              'No pending syspilot version to skip.'
            );
            return;
          }
          state.skippedVersion = state.lastSeenUpstreamVersion;
          writeState(state);
          vscode.window.showInformationMessage(
            `Syspilot version ${state.skippedVersion} will be skipped.`
          );
        }
      );

   **LM Tool registration:**

   .. code-block:: typescript

      api.registerTool({
        name: 'jarvis_SyspilotSkipThisVersion',
        description: 'Permanently skip the current pending syspilot version',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => {
          await vscode.commands.executeCommand('jarvis.SyspilotSkipThisVersion');
          const state = readState();
          return { content: [{ type: 'text', text: `Skipped version ${state.skippedVersion}.` }] };
        }
      });

   **Acceptance Criteria:**

   * AC-1: The command persists ``skippedVersion`` in ``.jarvis/syspilot-state.json``.
   * AC-2: The LM tool name is ``jarvis_SyspilotSkipThisVersion``.
   * AC-3: If no pending version is known, the command shows a warning and
     does nothing.


.. spec:: Manual Update Command
   :id: SPEC_SPL_MANUAL
   :status: draft
   :links: REQ_SPL_MANUAL

   **Description:**
   Registers ``jarvis.syspilotUpdate`` as a VS Code command available in the
   Command Palette. It performs the same version check as
   ``SPEC_SPL_STARTUP`` but ignores suspend and skip states.

   **Pseudocode:**

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.syspilotUpdate',
        async () => {
          // Same fetch + compare as startup, but skip suspend/skip guards
          const upstreamVersion = await fetchUpstreamVersion();
          if (!upstreamVersion) {
            vscode.window.showWarningMessage(
              'Could not reach syspilot release. Check network.'
            );
            return;
          }
          const localVersion = readLocalVersion();
          if (localVersion === upstreamVersion) {
            vscode.window.showInformationMessage(
              `syspilot is up to date (${localVersion}).`
            );
            return;
          }
          await notifyActor(api, upstreamVersion, 'update');
          vscode.window.showInformationMessage(
            `Notified Syspilot Setup Engineer about version ${upstreamVersion}.`
          );
        }
      );

   **Acceptance Criteria:**

   * AC-1: Ignores both ``suspendedUntil`` and ``skippedVersion``.
   * AC-2: Shows an informational message when already up to date.
   * AC-3: Shows an informational message after successful notification.
   * AC-4: Available in the Command Palette (``package.json`` commands
     contribution).


.. spec:: State File
   :id: SPEC_SPL_STATE
   :status: draft
   :links: REQ_SPL_STATE

   **Description:**
   A JSON file at ``.jarvis/syspilot-state.json`` persists module state.

   **Schema:**

   .. code-block:: json

      {
        "suspendedUntil": "2026-08-01T00:00:00.000Z",
        "skippedVersion": "1.2.0",
        "lastSeenUpstreamVersion": "1.3.0"
      }

   All fields are optional (absent = not set). The file is created on first
   write.

   **Acceptance Criteria:**

   * AC-1: The file path is ``<workspaceRoot>/.jarvis/syspilot-state.json``.
   * AC-2: Read/write uses ``JSON.parse``/``JSON.stringify`` with error handling
     for missing or malformed files (treat as empty state).
   * AC-3: ``lastSeenUpstreamVersion`` is updated on every successful upstream
     fetch, enabling the skip command to reference it without a re-fetch.
