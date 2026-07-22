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
   * AC-5: ``contributes.languageModelTools`` declares entries for
     ``jarvis_delaySyspilotUpdate`` and ``jarvis_SyspilotSkipThisVersion``,
     following the same shape as ``packages/core/package.json`` entries
     (``name``, ``displayName``, ``modelDescription``,
     ``canBeReferencedInPrompt``, ``toolReferenceName``, ``icon``,
     ``tags``, ``inputSchema``). This ensures VS Code surfaces these tools
     in the "Configure Tools" picker under a "Jarvis Syspilot" group.

   **languageModelTools manifest entries (specification):**

   .. code-block:: json

      "languageModelTools": [
        {
          "name": "jarvis_delaySyspilotUpdate",
          "displayName": "Delay Syspilot Update",
          "modelDescription": "Suspend syspilot update notifications for N days. The actor invokes this when the user chooses to delay.",
          "canBeReferencedInPrompt": true,
          "toolReferenceName": "delaySyspilotUpdate",
          "icon": "$(watch)",
          "tags": ["jarvis"],
          "inputSchema": {
            "type": "object",
            "required": ["days"],
            "properties": {
              "days": { "type": "number", "description": "Number of days to suspend notifications" }
            }
          }
        },
        {
          "name": "jarvis_SyspilotSkipThisVersion",
          "displayName": "Skip This Syspilot Version",
          "modelDescription": "Permanently skip the current pending syspilot version so no further notifications are sent for it.",
          "canBeReferencedInPrompt": true,
          "toolReferenceName": "SyspilotSkipThisVersion",
          "icon": "$(debug-step-over)",
          "tags": ["jarvis"],
          "inputSchema": { "type": "object", "properties": {} }
        }
      ]


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
        const url = `https://raw.githubusercontent.com/enthali/syspilot/${tag}/syspilot/agents/syspilot.setup.agent.md`;
        let upstreamContent: string;
        try {
          const resp = await fetch(url);
          if (!resp.ok) { log.warn(`[SPL] fetch failed: ${resp.status}`); return; }
          upstreamContent = await resp.text();
        } catch (err) {
          log.warn(`[SPL] network error: ${err}`); return;
        }
        const upstreamVersion = parseFrontmatterVersion(upstreamContent);
        log.info(`[SPL] upstream version: ${upstreamVersion}`);

        // 2. Ensure local file exists (copy if absent — single-artifact contract)
        const localPath = path.join(workspaceRoot, '.github/agents/syspilot.setup.agent.md');
        let freshlyDownloaded = false;
        if (!fs.existsSync(localPath)) {
          log.info(`[SPL] local file missing — downloading from ${tag}`);
          fs.mkdirSync(path.dirname(localPath), { recursive: true });
          fs.writeFileSync(localPath, upstreamContent);
          freshlyDownloaded = true;
        }

        // 3. Compare versions (skip if freshly downloaded or installation incomplete — always notify)
        const installed = fs.existsSync(
          path.join(workspaceRoot, '.github/agents/syspilot.pm.agent.md')
        );
        if (installed && !freshlyDownloaded) {
          const localContent = fs.readFileSync(localPath, 'utf-8');
          const localVersion = parseFrontmatterVersion(localContent);
          log.info(`[SPL] local=${localVersion}, upstream=${upstreamVersion}, installed=${installed}`);
          if (localVersion === upstreamVersion) {
            log.info('[SPL] up to date — no action');
            return;
          }
        } else {
          log.info(`[SPL] freshlyDownloaded=${freshlyDownloaded}, installed=${installed} — bypassing version-match gate`);
        }

        // 4. Check suspend/skip
        if (state.skippedVersion === upstreamVersion) {
          log.info(`[SPL] version ${upstreamVersion} is skipped`);
          return;
        }
        if (state.suspendedUntil && new Date(state.suspendedUntil) > new Date()) {
          log.info(`[SPL] suspended until ${state.suspendedUntil}`);
          return;
        }

        // 5. Notify (unified — no initial/update distinction)
        log.info('[SPL] notifying Syspilot Setup Engineer');
        await notifyActor(api, workspaceRoot, log);
      }

   **Acceptance Criteria:**

   * AC-1: The check runs once per activation (VS Code startup), asynchronously.
   * AC-2: Network failures are caught and logged — no unhandled rejections.
   * AC-3: The local file is never modified after initial copy unless the user
     or the Setup Agent explicitly triggers an update.
   * AC-4: On first run (file freshly copied) OR when installation is
     incomplete (``syspilot.pm.agent.md`` absent), the flow ALWAYS reaches
     ``notifyActor()`` regardless of version equality — the version-match
     early-return is skipped when ``freshlyDownloaded`` is true OR
     ``installed`` is false.
   * AC-5: The module logs: upstream version fetched, local-file-missing
     download, comparison result, installed state, and decision (notify /
     skip / suspend / up-to-date) at ``info`` level.
   * AC-6: The installation-completeness marker is
     ``.github/agents/syspilot.pm.agent.md``. Its absence means the user
     has not yet completed the setup workflow — the module re-notifies on
     each activation until the marker file appears (subject to skip/suspend
     gates).


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
   message queue (``appendMessage``). A single unified message is used for both
   first-run and update scenarios — no ``initial``/``update`` distinction.

   **Message template:**

   .. code-block:: text

      Please ask the user whether they want to install this update now,
      skip this version by calling jarvis_SyspilotSkipThisVersion(),
      or delay it for N days by calling jarvis_delaySyspilotUpdate(N).

   **Pseudocode:**

   .. code-block:: typescript

      async function notifyActor(api: JarvisCoreApi, workspaceRoot: string, log: vscode.LogOutputChannel): Promise<void> {
        await ensureActor(api);
        const text =
          `Please ask the user whether they want to install this update now, ` +
          `skip this version by calling jarvis_SyspilotSkipThisVersion(), ` +
          `or delay it for N days by calling jarvis_delaySyspilotUpdate(N).`;
        api.sendMessage('Syspilot Setup Engineer', 'jarvis-syspilot', text);
        // Ensure auto-delivery is enabled (idempotent, same pattern as reminders)
        addAutoDelivery(resolveMessagesPath(workspaceRoot), 'Syspilot Setup Engineer');
      }

   **Design note:** Uses ``api.sendMessage(destination, sender, text)`` —
   a core API method that bypasses session-name validation (see
   ``SPEC_ENG_API`` AC-8). The module sender ``"jarvis-syspilot"`` is not a
   registered actor/session, so the ``jarvis_sendMessage`` LM tool (which
   validates sender names) cannot be used here.

   **Acceptance Criteria:**

   * AC-1: The message is queued via ``api.sendMessage()`` (core API method).
   * AC-2: The sender field is ``"jarvis-syspilot"``.
   * AC-3: The message text does NOT embed a version number — the actor reads
     its own frontmatter. Three user choices are offered: install now,
     skip this version, or delay for N days. Tool names use underscore
     notation (``jarvis_SyspilotSkipThisVersion``,
     ``jarvis_delaySyspilotUpdate``) so the actor can invoke them directly.
   * AC-4: Before or after queuing, ``addAutoDelivery(resolveMessagesPath(workspaceRoot),
     'Syspilot Setup Engineer')`` is called (idempotent) to ensure the actor
     is on the auto-delivery list — same pattern as the reminders feature
     (``SPEC_MSG_REMINDERS_POLL``). No manual registration by the user is
     required.


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
          const installed = fs.existsSync(
            path.join(workspaceRoot, '.github/agents/syspilot.pm.agent.md')
          );
          const localVersion = readLocalVersion();
          if (installed && localVersion === upstreamVersion) {
            vscode.window.showInformationMessage(
              `syspilot is up to date (${localVersion}).`
            );
            return;
          }
          await notifyActor(api, workspaceRoot, log);
          vscode.window.showInformationMessage(
            'Notified Syspilot Setup Engineer.'
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
