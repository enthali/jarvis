Configuration Design Specifications
=====================================

.. spec:: VS Code Settings for Folder Paths and Scan Interval
   :id: SPEC_CFG_SETTINGS
   :status: deprecated
   :links: REQ_CFG_FOLDERPATHS, REQ_CFG_SCANINTERVAL

   **Superseded by:** ``SPEC_CFG_MANIFEST`` (settings-cleanup CR).

   **Description:**
   Add a ``contributes.configuration`` block to ``package.json``:

   .. code-block:: json

      {
        "jarvis.projectsFolder": {
          "type": "string",
          "default": "",
          "description": "Absolute path to the folder containing project YAML files."
        },
        "jarvis.eventsFolder": {
          "type": "string",
          "default": "",
          "description": "Absolute path to the folder containing event YAML files."
        },
        "jarvis.scanInterval": {
          "type": "number",
          "default": 2,
          "minimum": 0,
          "description": "Background scan interval in minutes (0 = disabled)."
        }
      }

   <!-- Implementation: SPEC_CFG_SETTINGS -->
   <!-- Requirements: REQ_CFG_FOLDERPATHS, REQ_CFG_SCANINTERVAL -->


.. spec:: Heartbeat Settings in package.json
   :id: SPEC_CFG_HEARTBEATSETTINGS
   :status: deprecated
   :links: REQ_CFG_HEARTBEATPATH; REQ_CFG_HEARTBEATINTERVAL; REQ_CFG_MSGPATH

   **Superseded by:** SPEC_CFG_MANIFEST, SPEC_CFG_PATHRESOLVER

   **Description:**
   Add configuration entries to the ``contributes.configuration`` block in
   ``package.json`` and handle runtime changes.

   **package.json additions**:

   .. code-block:: json

      {
        "jarvis.heartbeatConfigFile": {
          "type": "string",
          "default": "",
          "description": "Absolute path to heartbeat.yaml. Defaults to workspace storage if empty."
        },
        "jarvis.heartbeatInterval": {
          "type": "number",
          "default": 60,
          "minimum": 10,
          "description": "Heartbeat scheduler tick interval in seconds (minimum 10)."
        },
        "jarvis.messagesFile": {
          "type": "string",
          "default": "",
          "description": "Absolute path to messages.json queue file. Defaults to extension storage if empty."
        }
      }

   **Config path resolution** (in ``activateHeartbeat()``):

   .. code-block:: typescript

      function resolveConfigPath(
        context: vscode.ExtensionContext
      ): string {
        const override = vscode.workspace
          .getConfiguration('jarvis')
          .get<string>('heartbeatConfigFile', '');
        if (override) return override;
        return vscode.Uri.joinPath(
          context.storageUri!, 'heartbeat.yaml'
        ).fsPath;
      }

   **Runtime change handler**:

   .. code-block:: typescript

      vscode.workspace.onDidChangeConfiguration(e => {
        if (
          e.affectsConfiguration('jarvis.heartbeatInterval') ||
          e.affectsConfiguration('jarvis.heartbeatConfigFile')
        ) {
          scheduler.dispose();
          scheduler.start(context);
        }
        if (e.affectsConfiguration('jarvis.messagesFile')) {
          messageTreeProvider.reload();
        }
      });

   **Message queue path resolution**:

   .. code-block:: typescript

      function resolveMessagesPath(
        context: vscode.ExtensionContext
      ): string {
        const override = vscode.workspace
          .getConfiguration('jarvis')
          .get<string>('messagesFile', '');
        if (override) return override;
        return vscode.Uri.joinPath(
          context.storageUri!, 'messages.json'
        ).fsPath;
      }


.. spec:: Update Check Setting in package.json
   :id: SPEC_CFG_UPDATECHECK
   :status: deprecated
   :links: REQ_CFG_UPDATECHECK

   **Superseded by:** ``SPEC_CFG_MANIFEST`` (settings-cleanup CR —
   ``jarvis.checkForUpdates`` now lives in the Updates group of the unified
   manifest).

   **Description:**
   Add a boolean configuration entry to the ``contributes.configuration`` block
   in ``package.json``.

   **package.json addition:**

   .. code-block:: json

      {
        "jarvis.checkForUpdates": {
          "type": "boolean",
          "default": true,
          "description": "Check for new Jarvis releases on GitHub when the extension activates."
        }
      }

   The setting is read once at activation time (see SPEC_REL_UPDATECOMMAND).
   No runtime change handler is needed — the check only runs at startup.


.. spec:: Grouped Settings Configuration in package.json
   :id: SPEC_CFG_SETTINGSGROUPS
   :status: deprecated
   :links: REQ_CFG_SETTINGSGROUPS; SPEC_EXP_FEATURETOGGLE

   **Superseded by:** ``SPEC_CFG_MANIFEST`` (settings-cleanup CR).

   **Description:**
   The ``contributes.configuration`` field in ``package.json`` SHALL be converted
   from a single object to an array of objects, each representing one named settings
   group. This produces sub-headings in the VS Code Settings UI under "Jarvis".

   **package.json change** (``contributes.configuration``)::

      [
        {
          "title": "Projects",
          "properties": {
            "jarvis.projectsFolder": { ... },
            "jarvis.scanInterval": { ... }
          }
        },
        {
          "title": "Events",
          "properties": {
            "jarvis.eventsFolder": { ... }
          }
        },
        {
          "title": "Heartbeat",
          "properties": {
            "jarvis.heartbeatConfigFile": { ... },
            "jarvis.heartbeatInterval": { ... }
          }
        },
        {
          "title": "Messages",
          "properties": {
            "jarvis.messagesFile": { ... }
          }
        },
        {
          "title": "MCP Server",
          "properties": {
            "jarvis.mcpPort": { ... },
            "jarvis.mcpEnabled": { ... }
          }
        },
        {
          "title": "Updates",
          "properties": {
            "jarvis.checkForUpdates": { ... }
          }
        }
      ]

   **Constraints:**

   * All existing setting keys, types, defaults, and descriptions remain unchanged
   * The enclosing ``"configuration"`` value changes type from object to array
   * No TypeScript / runtime code changes required
   * Group titles are bare (e.g. ``"Projects"``, not ``"Jarvis: Projects"``) because
     VS Code already shows the extension name as the parent section in the Settings UI


.. spec:: Default Path Population at Activation
   :id: SPEC_CFG_DEFAULTPATHS
   :status: deprecated
   :links: REQ_CFG_DEFAULTPATHS; SPEC_CFG_HEARTBEATSETTINGS

   **Superseded by:** SPEC_CFG_PATHRESOLVER

   **Description:**
   During ``activate()``, before any other initialization, write the resolved
   default paths into workspace-scoped settings if they are empty. This ensures
   that ``when``-clauses on optional sidebar views evaluate correctly from the
   first render.

   **Implementation** (in ``src/extension.ts``, early in ``activate()``):

   .. code-block:: typescript

      function populateDefaultPaths(
        context: vscode.ExtensionContext
      ): void {
        const config = vscode.workspace.getConfiguration('jarvis');

        if (!config.get<string>('heartbeatConfigFile')) {
          const defaultPath = vscode.Uri.joinPath(
            context.storageUri!, 'heartbeat.yaml'
          ).fsPath;
          config.update(
            'heartbeatConfigFile', defaultPath,
            vscode.ConfigurationTarget.Workspace
          );
        }

        if (!config.get<string>('messagesFile')) {
          const defaultPath = vscode.Uri.joinPath(
            context.storageUri!, 'messages.json'
          ).fsPath;
          config.update(
            'messagesFile', defaultPath,
            vscode.ConfigurationTarget.Workspace
          );
        }
      }

   **Timing:** Called at the very start of ``activate()`` (before heartbeat
   and scanner initialization) so that ``when``-clauses evaluate correctly
   from the first render.

   **Constraints:**

   * ``ConfigurationTarget.Workspace`` scopes the write to the current workspace
     (``.vscode/settings.json``); global user settings are not modified
   * The written path is identical to the fallback path the extension already uses
     internally — no behavioral change for the scheduler or message queue
   * If a user has already set an explicit non-empty value, the ``if`` guard
     prevents overwriting it
   * ``await config.update()`` ensures the setting is written before tree providers
     register; VS Code re-evaluates ``when``-clauses synchronously after each update
   * The existing ``resolveConfigPath()`` / ``resolveMessagesPath()`` functions
     continue to work as before — the setting is now populated, so the
     ``if (override)`` branch fires. No functional change.


.. spec:: settings-cleanup: Full Configuration Manifest (package.json)
   :id: SPEC_CFG_MANIFEST
   :status: implemented
   :links: REQ_CFG_TOGGLES; REQ_CFG_GROUPS; REQ_CFG_MCPDEFAULTOFF; REQ_CFG_RENAMES; REQ_ENT_AGENTPROMPT_TEMPLATE; REQ_MSG_NOTIFICATION_TEMPLATE; SPEC_MSG_NOTIFICATION_RESOLVE

   **Description:**
   The complete ``contributes.configuration`` array in ``package.json`` after
   this CR. Eleven named groups in the order mandated by REQ_CFG_GROUPS:
   Projects, Events, Sessions, Messages, Heartbeat, Reminders, MCP, PIM,
   Outlook, Recording, Updates. CR ``sessions-feature`` populated the
   Sessions group with ``jarvis.sessions.enabled`` only — paths are fixed
   under ``.jarvis/sessions/`` (no folder setting; see ``SPEC_ACT_MANIFEST``). The Updates group
   houses ``jarvis.checkForUpdates``.

   .. code-block:: json

      [
        {
          "title": "Projects",
          "properties": {
            "jarvis.projects.enabled": {
              "type": "boolean",
              "default": false,
              "description": "Enable the Projects feature. When false, no Projects tree view, commands, or tools are registered."
            },
            "jarvis.projects.folder": {
              "type": "string",
              "default": "",
              "description": "Absolute path to the folder containing project YAML files."
            },
            "jarvis.scanInterval": {
              "type": "number",
              "default": 2,
              "minimum": 0,
              "description": "Background rescan interval in minutes (0 = disabled, registers via heartbeat)."
            }
          }
        },
        {
          "title": "Events",
          "properties": {
            "jarvis.events.enabled": {
              "type": "boolean",
              "default": false,
              "description": "Enable the Events feature. When false, no Events tree view, commands, or tools are registered."
            },
            "jarvis.events.folder": {
              "type": "string",
              "default": "",
              "description": "Absolute path to the folder containing event YAML files."
            }
          }
        },
        {
          "title": "Sessions",
          "properties": {
            "jarvis.sessions.enabled": {
              "type": "boolean",
              "default": true,
              "description": "Enable the Sessions feature. When false, no Sessions tree view, commands, or tools are registered."
            },
            "jarvis.agentSession.initPromptTemplate": {
              "type": "string",
              "default": "",
              "description": "Template for the agent-session initialization prompt. Placeholders: ${kind}, ${name}, ${contextPath}. If empty, the built-in disciplined-memory default is used. Scope: window."
            }
          }
        },
        {
          "title": "Messages",
          "properties": {
            "jarvis.messages.enabled": {
              "type": "boolean",
              "default": true,
              "description": "Enable the Messages feature. When false, no Messages tree view, commands, or tools are registered."
            },
            "jarvis.messages.logging": {
              "type": "boolean",
              "default": true,
              "description": "When enabled, every queued message is also appended to .jarvis/message-log.json (append-only audit log)."
            },
            "jarvis.messages.notificationTemplate": {
              "type": "string",
              "default": "",
              "description": "Template for the auto-delivery notification stub. Placeholders: ${count}, ${destination}, ${sender}. If empty, the built-in English default is used. Scope: window."
            }
          }
        },
        {
          "title": "Heartbeat",
          "properties": {
            "jarvis.heartbeat.enabled": {
              "type": "boolean",
              "default": true,
              "description": "Enable the Heartbeat scheduler. When false, no Heartbeat tree view, scheduler, or tools are registered."
            },
            "jarvis.heartbeatInterval": {
              "type": "number",
              "default": 60,
              "minimum": 10,
              "description": "Heartbeat scheduler tick interval in seconds (minimum 10)."
            }
          }
        },
        {
          "title": "Reminders",
          "properties": {
            "jarvis.reminders.enabled": {
              "type": "boolean",
              "default": true,
              "description": "Enable the Reminders sub-feature. Only effective when jarvis.messages.enabled is true. When false, no Reminders tree view or tools are registered."
            }
          }
        },
        {
          "title": "MCP",
          "properties": {
            "jarvis.mcp.enabled": {
              "type": "boolean",
              "default": false,
              "description": "Enable the embedded MCP server (localhost only). When false, the server does not start."
            },
            "jarvis.mcpPort": {
              "type": "number",
              "default": 31415,
              "description": "Port for the embedded MCP server (localhost only)."
            }
          }
        },
        {
          "title": "PIM",
          "properties": {
            "jarvis.pim.showCategories": {
              "type": "boolean",
              "default": true,
              "description": "Show the Categories view in the Jarvis sidebar."
            }
          }
        },
        {
          "title": "Outlook",
          "properties": {
            "jarvis.outlook.enabled": {
              "type": "boolean",
              "default": false,
              "description": "Enable Outlook COM integration (Windows + Outlook Classic). When disabled, no Outlook COM calls are made."
            },
            "jarvis.outlook.tasks.enabled": {
              "type": "boolean",
              "default": true,
              "description": "Enable the Outlook Tasks integration. Only effective when jarvis.outlook.enabled is true."
            }
          }
        },
        {
          "title": "Recording",
          "properties": {
            "jarvis.recording.enabled": {
              "type": "boolean",
              "default": false,
              "description": "Enable the Session Recording feature. When true, Start/Stop Recording buttons appear on Project and Event nodes."
            },
            "jarvis.recording.whisperPath": {
              "type": "string",
              "default": "",
              "description": "Absolute path to the Whisper project folder containing recorder.py and the input/ subfolder."
            }
          }
        }
      ]

   .. note::
      Both ``jarvis.agentSession.initPromptTemplate`` and
      ``jarvis.messages.notificationTemplate`` ship with the full verbatim
      template text as their ``"default"`` in ``package.json`` (not empty
      string), so users see and edit the default directly in the Settings UI.
      The ``"default": ""`` shown above is a documentation shorthand. An empty
      or whitespace-only value falls back to the built-in constant —
      ``DEFAULT_INIT_PROMPT`` respectively ``DEFAULT_NOTIFICATION``, both in
      ``packages/core/src/engine/sessions/injectPrompt.ts`` (see
      ``SPEC_ENT_AGENTSESSION_INITPROMPT`` and
      ``SPEC_MSG_NOTIFICATION_RESOLVE``).

      **The declared default governs display, never behaviour**
      (notification-template-empty-fallback CR, GH #56). Clearing the text
      field in the Settings UI persists an explicit ``""`` at User scope; a
      persisted ``""`` shadows the ``package.json`` default, so
      ``getConfiguration().get()`` returns ``''`` and the ``get(key, '')``
      fallback argument does not fire either (the key exists). Only "Reset
      Setting" removes the key. Every consumer of these two settings
      therefore MUST apply its own trim-based fallback to the built-in
      constant — shipping the text in ``package.json`` is not a substitute
      (``REQ_MSG_NOTIFICATION_TEMPLATE`` AC-8). Before GH #56 the note above
      claimed a notification-template constant existed in ``extension.ts``;
      it never did, and the notification path had no fallback at all.

   **Updates group:** The ``jarvis.checkForUpdates`` setting lives in the
   Updates group (the 11th group). This was the CM’s autonomous decision
   during design: it has no natural home in the other ten groups, and the
   group title is already user-meaningful.

   **Removed settings (must be absent from the final manifest):**

   * ``jarvis.projectsFolder`` (replaced by ``jarvis.projects.folder``)
   * ``jarvis.eventsFolder`` (replaced by ``jarvis.events.folder``)
   * ``jarvis.mcpEnabled`` (replaced by ``jarvis.mcp.enabled``)
   * ``jarvis.outlookEnabled`` (replaced by ``jarvis.outlook.enabled``)
   * ``jarvis.heartbeatConfigFile`` (replaced by fixed path; see SPEC_CFG_PATHRESOLVER)
   * ``jarvis.messagesFile`` (replaced by fixed path; see SPEC_CFG_PATHRESOLVER)

   **Supersedes:** SPEC_CFG_SETTINGS, SPEC_CFG_HEARTBEATSETTINGS,
   SPEC_CFG_UPDATECHECK, SPEC_CFG_SETTINGSGROUPS, SPEC_CFG_DEFAULTPATHS
   (those specs document the pre-CR state; they remain in the file as historical
   record with ``status: implemented``).


.. spec:: settings-cleanup: Central Path Resolver Module (configPaths.ts)
   :id: SPEC_CFG_PATHRESOLVER
   :status: implemented
   :links: REQ_CFG_FIXEDPATHS; REQ_ACT_DUALPATH_SCANNER

   **(actor-dualpath-scanner CR amendment):** adds ``getActorsDir()``/
   ``ensureActorsDir()`` below, mirroring the existing
   ``getSessionsDir()``/``ensureSessionsDir()`` pair — see
   ``SPEC_ACT_DUALPATH_SCANNER`` for how these are wired into the scanner.

   **Description:**
   New module ``src/configPaths.ts`` provides all runtime file-path resolution
   for Jarvis. It is the single source of truth for the ``.jarvis/`` directory
   and all files within it.

   **Public API:**

   .. code-block:: typescript

      import * as vscode from 'vscode';
      import * as path from 'path';
      import * as fs from 'fs';

      /** Returns <workspaceRoot>/.jarvis, or undefined when no workspace is open. */
      export function getJarvisDir(): string | undefined {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) { return undefined; }
        return path.join(folders[0].uri.fsPath, '.jarvis');
      }

      /**
       * Ensures the .jarvis/ directory exists (mkdir -p) and returns its path,
       * or undefined when no workspace is open.
       * Called on first write inside each persistence module — never at activation.
       */
      export function ensureJarvisDir(): string | undefined {
        const dir = getJarvisDir();
        if (!dir) { return undefined; }
        fs.mkdirSync(dir, { recursive: true });
        return dir;
      }

      /** Returns <workspaceRoot>/.jarvis/heartbeat.yaml, or undefined. */
      export function getHeartbeatPath(): string | undefined {
        const dir = getJarvisDir();
        return dir ? path.join(dir, 'heartbeat.yaml') : undefined;
      }

      /** Returns <workspaceRoot>/.jarvis/messages.json, or undefined. */
      export function getMessagesPath(): string | undefined {
        const dir = getJarvisDir();
        return dir ? path.join(dir, 'messages.json') : undefined;
      }

      /** Returns <workspaceRoot>/.jarvis/reminders.yaml, or undefined. */
      export function getRemindersPath(): string | undefined {
        const dir = getJarvisDir();
        return dir ? path.join(dir, 'reminders.yaml') : undefined;
      }

      /** Returns <workspaceRoot>/.jarvis/message-log.json, or undefined. */
      export function getMessageLogPath(): string | undefined {
        const dir = getJarvisDir();
        return dir ? path.join(dir, 'message-log.json') : undefined;
      }

      /** Returns <workspaceRoot>/.jarvis/autodelivery.json, or undefined. */
      export function getAutoDeliveryPath(): string | undefined {
        const dir = getJarvisDir();
        return dir ? path.join(dir, 'autodelivery.json') : undefined;
      }

      /** Returns <workspaceRoot>/.jarvis/sessions, or undefined when no workspace is open. */
      export function getSessionsDir(): string | undefined {
        const dir = getJarvisDir();
        return dir ? path.join(dir, 'sessions') : undefined;
      }

      /** Ensures <workspaceRoot>/.jarvis/sessions exists (mkdir -p) and returns its path, or undefined. */
      export function ensureSessionsDir(): string | undefined {
        const dir = getSessionsDir();
        if (!dir) { return undefined; }
        fs.mkdirSync(dir, { recursive: true });
        return dir;
      }

      /** (actor-dualpath-scanner CR) Returns <workspaceRoot>/.jarvis/actors,
       *  or undefined when no workspace is open. Mirrors getSessionsDir() —
       *  a fixed path, no folder setting, same pattern as the existing
       *  session convention. */
      export function getActorsDir(): string | undefined {
        const dir = getJarvisDir();
        return dir ? path.join(dir, 'actors') : undefined;
      }

      /** (actor-dualpath-scanner CR) Ensures <workspaceRoot>/.jarvis/actors
       *  exists (mkdir -p) and returns its path, or undefined. Mirrors
       *  ensureSessionsDir(). */
      export function ensureActorsDir(): string | undefined {
        const dir = getActorsDir();
        if (!dir) { return undefined; }
        fs.mkdirSync(dir, { recursive: true });
        return dir;
      }

   **Usage contract for persistence modules:**

   Each persistence module (``messageQueue.ts``, ``reminders.ts``,
   ``heartbeat.ts``) SHALL:

   1. Call the appropriate getter on every read/write operation (not cached at
      activation time).
   2. On reads: if the getter returns ``undefined`` (no workspace), return empty
      / no-op silently.
   3. On writes: call ``ensureJarvisDir()`` once before the first
      ``fs.writeFileSync`` to guarantee the directory exists.

   **Design notes:**

   * ``ensureJarvisDir()`` is intentionally NOT called at extension activation —
     the ``.jarvis/`` directory is created only on first write.
   * When no workspace is open, all getters return ``undefined`` and persistence
     modules short-circuit. A one-time ``log.warn`` is emitted (not an error).
   * The module has no runtime state; it is safe to call functions multiple times.


.. spec:: settings-cleanup: Feature Toggle Guards in activate()
   :id: SPEC_CFG_TOGGLEGUARDS
   :status: implemented
   :links: REQ_CFG_TOGGLES

   **Description:**
   In ``src/extension.ts`` ``activate()``, each feature's setup block is
   wrapped in a boolean check against the corresponding ``jarvis.<feature>.enabled``
   setting. Disabled features leave zero activation side-effects.

   **Activation skeleton (relevant excerpt):**

   .. code-block:: typescript

      export function activate(context: vscode.ExtensionContext): void {
        const cfg = vscode.workspace.getConfiguration('jarvis');

        if (cfg.get<boolean>('projects.enabled', false)) {
          // register Projects tree view
          // register jarvis.newProject, jarvis.rescan, jarvis.filterProjectFolders commands
          // register listProjects LM/MCP tool
        }

        if (cfg.get<boolean>('events.enabled', false)) {
          // register Events tree view
          // register jarvis.newEvent, jarvis.filterFutureEvents commands
        }

        if (cfg.get<boolean>('heartbeat.enabled', true)) {
          // create HeartbeatScheduler, register Heartbeat tree view
          // register jarvis.runHeartbeatJob, jarvis.pauseHeartbeatJob,
          //   jarvis.resumeHeartbeatJob, jarvis.runJob commands
          // register registerJob / unregisterJob LM/MCP tools
        }

        if (cfg.get<boolean>('messages.enabled', true)) {
          // register Messages tree view
          // register jarvis.sendMessages, jarvis.deleteMessage,
          //   jarvis.enableAutoDelivery, jarvis.disableAutoDelivery commands
          // register sendToSession / readMessage / listSessions LM/MCP tools
          // start auto-delivery poll loop

          if (cfg.get<boolean>('reminders.enabled', true)) {
            // register Reminders tree view
            // register jarvis.cancelReminder command
            // register jarvis_setReminder / jarvis_listReminders /
            //   jarvis_cancelReminder LM/MCP tools
          }
        }

        if (cfg.get<boolean>('mcp.enabled', false)) {
          // start embedded MCP server on jarvis.mcpPort
        }

        // PIM, Outlook, Recording are always activated (they carry their own
        // internal enabled-checks); no top-level toggle guard required by this CR
      }

   **Constraints:**

   * Changing any toggle requires "Developer: Reload Window" to take effect.
     Hot toggling (runtime de-registration) is deferred to CR 3
     (``tool-deregistration``).
   * The ``when``-clauses in ``contributes.views`` and ``contributes.menus``
     SHALL also reflect the toggle state (see SPEC_CFG_VIEWGATING) so the UI
     hides views and menu items even before the next reload.
   * The PIM feature (Categories, Tasks) and Outlook / Recording features are
     not governed by this spec's toggle guards; they retain their existing
     ``jarvis.pim.showCategories`` and ``jarvis.recording.enabled`` guards.


.. spec:: settings-cleanup: View Gating via when-clauses
   :id: SPEC_CFG_VIEWGATING
   :status: implemented
   :links: REQ_CFG_TOGGLES

   **Description:**
   The ``contributes.views`` and ``contributes.menus`` blocks in ``package.json``
   SHALL use ``when``-clauses based on the new ``jarvis.<feature>.enabled``
   settings to hide views and menu items when the corresponding feature is off.

   **Updated ``contributes.views.jarvis-explorer`` entries:**

   .. list-table::
      :header-rows: 1
      :widths: 30 70

      * - View id
        - ``when`` clause
      * - ``jarvisProjects``
        - ``config.jarvis.projects.enabled == true``
      * - ``jarvisEvents``
        - ``config.jarvis.events.enabled == true``
      * - ``jarvisMessages``
        - ``config.jarvis.messages.enabled == true``
      * - ``jarvisReminders``
        - ``config.jarvis.messages.enabled == true && config.jarvis.reminders.enabled == true``
      * - ``jarvisHeartbeat``
        - ``config.jarvis.heartbeat.enabled == true``
      * - ``jarvisCategories``
        - ``config.jarvis.pim.showCategories == true && config.jarvis.outlook.enabled == true`` *(Categories currently has only Outlook as backend; gating on Outlook hides the view when no backend is available)*

   **``contributes.menus`` items to update:**

   * Any menu item currently gated on ``config.jarvis.messagesFile != ''`` SHALL
     change its ``when`` clause to ``config.jarvis.messages.enabled == true``.
   * Any menu item currently gated on ``config.jarvis.heartbeatConfigFile != ''``
     SHALL change its ``when`` clause to ``config.jarvis.heartbeat.enabled == true``.
   * Any menu item currently gated on ``config.jarvis.eventsFolder != ''`` SHALL
     change its ``when`` clause to ``config.jarvis.events.enabled == true``.

   **Supersedes:** The ``when``-clause behaviour described in SPEC_EXP_FEATURETOGGLE
   (that spec used ``config.jarvis.heartbeatConfigFile != ''`` and
   ``config.jarvis.messagesFile != ''``; those conditions no longer apply after
   the configurable paths are removed).


Workspace File Layout & VCS Visibility
--------------------------------------

.. spec:: Jarvis-Owned Workspace Files and Ignore Patterns
   :id: SPEC_CFG_WORKSPACEFILES
   :status: approved
   :links: REQ_CFG_FILEPREFIX; REQ_CFG_FIXEDPATHS; SPEC_HOOK_CONFIG

   **Description:**
   Jarvis writes generated files into the user's workspace. This section is the
   single reference for *where* those files go, *how they are named*, and *what
   a consuming project should exclude from version control*.

   **Two categories, two mechanisms.**

   .. list-table::
      :header-rows: 1
      :widths: 22 30 24 24

      * - Directory
        - Ownership
        - Attribution mechanism
        - Ignore pattern
      * - ``.jarvis/``
        - Exclusively Jarvis-owned
        - The directory itself
        - ``.jarvis/`` *(as a unit)*
      * - ``.github/hooks/``
        - Shared — pinned by GitHub Copilot, open to other tools and to the
          project's own hook files
        - ``jarvis-`` filename prefix
        - ``.github/hooks/jarvis-*``

   The mechanism follows from the ownership, not from preference. A directory
   Jarvis owns outright is already selectively ignorable as a unit, so a
   per-file prefix inside it would add nothing (``REQ_CFG_FILEPREFIX``
   applicability clause). A directory Jarvis shares offers no such boundary, so
   the boundary has to be carried in the filenames.

   **Generated files in** ``.github/hooks/``:

   .. list-table::
      :header-rows: 1
      :widths: 30 45 25

      * - File
        - Role
        - Lifecycle
      * - ``jarvis-hooks.json``
        - Hook event registration (SPEC_HOOK_CONFIG)
        - Rewritten on each activation
      * - ``jarvis-bridge.mjs``
        - Event forwarder (SPEC_HOOK_BRIDGE)
        - Rewritten on each activation
      * - ``jarvis-port``
        - Published listener port (SPEC_HOOK_INTAKE)
        - Rewritten per activation, removed on deactivate

   All three are **generated artifacts owned by the engine** — they are
   re-written on activation to stay consistent with the engine version, and
   carry no user-authored content. A consuming project therefore gains nothing
   by tracking them, and tracking them produces churn on every activation.

   **Recommended** ``.gitignore`` **entry for a consuming project:**

   .. code-block:: text

      # Jarvis-generated hook artifacts (regenerated on activation)
      .github/hooks/jarvis-*

   **Why not ignore** ``.github/hooks/`` **wholesale.**
   That is what this repository did before the ``jarvis-hook-file-prefix`` CR
   (GH #58), and it is lossy in both directions: it hides hook files the
   project itself may want to version, and it hides any other tool's
   contributions to a directory GitHub Copilot pins and shares. Excluding a
   shared directory to remove one tool's artifacts is a workaround for missing
   attribution, not a layout decision. Once the artifacts are attributable by
   name, the narrower pattern is strictly better and the directory stays
   available to everyone.

   **Naming rule (the standing constraint).**
   Any file Jarvis generates into a directory it does not exclusively own is
   named with the ``jarvis-`` prefix (``REQ_CFG_FILEPREFIX`` AC-1). This binds
   files added in future, which is the point: the convention was not absent
   before GH #58 — ``jarvis-hooks.json`` already followed it — it was simply
   not carried to the two files generated into the same directory later. A rule
   that lives only in the filenames that happen to exist is re-broken by the
   next file added; recording it here as a constraint on the *act of
   generating* is what makes it hold.

   **Scope note.** This section is written to serve the ``.jarvis/`` layout
   reorganisation (GH #59) as well. When that CR lands it extends the table
   above rather than introducing a second, competing layout reference.
