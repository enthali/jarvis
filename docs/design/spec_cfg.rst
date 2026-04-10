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
