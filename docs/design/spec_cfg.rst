Configuration Design Specifications
=====================================

.. spec:: VS Code Settings for Folder Paths and Scan Interval
   :id: SPEC_CFG_SETTINGS
   :status: implemented
   :links: REQ_CFG_FOLDERPATHS, REQ_CFG_SCANINTERVAL

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
   :status: implemented
   :links: REQ_CFG_HEARTBEATPATH; REQ_CFG_HEARTBEATINTERVAL; REQ_CFG_MSGPATH

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
   :status: implemented
   :links: REQ_CFG_UPDATECHECK

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
   :status: implemented
   :links: REQ_CFG_SETTINGSGROUPS; SPEC_EXP_FEATURETOGGLE

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
   :status: implemented
   :links: REQ_CFG_DEFAULTPATHS; SPEC_CFG_HEARTBEATSETTINGS

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
