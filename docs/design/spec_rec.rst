Recording Design Specifications
================================

.. spec:: Recording Settings in package.json
   :id: SPEC_REC_SETTINGS
   :status: implemented
   :links: REQ_REC_ENABLE; REQ_REC_CONFIG

   **Description:**
   Add a dedicated "Recording" settings group to ``package.json`` with two settings.
   This group is independent of PIM/Outlook groups.

   **package.json** (inside ``contributes.configuration``):

   .. code-block:: json

      {
        "title": "Recording",
        "properties": {
          "jarvis.recording.enabled": {
            "type": "boolean",
            "default": false,
            "description": "Enable the Session Recording feature."
          },
          "jarvis.recording.whisperPath": {
            "type": "string",
            "default": "",
            "description": "Absolute path to the Whisper project folder."
          }
        }
      }


.. spec:: Tree Button Contributions
   :id: SPEC_REC_BUTTON
   :status: implemented
   :links: REQ_REC_BUTTON; REQ_REC_ENABLE

   **Description:**
   Add ``jarvis.startRecording`` and ``jarvis.stopRecording`` commands and menu
   contributions to ``package.json``. Register command handlers in ``extension.ts``.
   Update ``ProjectTreeProvider`` and ``EventTreeProvider`` to display a red icon on
   the recording node.

   **Commands** (``contributes.commands``):

   .. code-block:: json

      { "command": "jarvis.startRecording", "title": "Start Recording", "icon": "$(circle-outline)" },
      { "command": "jarvis.stopRecording",  "title": "Stop Recording",  "icon": "$(circle-filled)" }

   **Menu contributions** (``contributes.menus.view/item/context``):

   .. code-block:: json

      {
        "command": "jarvis.startRecording",
        "when": "viewItem == jarvisProject && config.jarvis.recording.enabled == true && jarvis.recordingActive != true",
        "group": "inline"
      },
      {
        "command": "jarvis.stopRecording",
        "when": "viewItem == jarvisProject && config.jarvis.recording.enabled == true && jarvis.recordingActive == true",
        "group": "inline"
      }

   (Same pair for ``viewItem == jarvisEvent``.)

   **VS Code context variable**: ``jarvis.recordingActive`` (boolean) is set via
   ``vscode.commands.executeCommand('setContext', ...)`` in ``RecordingManager.start()``
   and ``stop()``.

   **Tree icon** (``src/projectTreeProvider.ts``, ``src/eventTreeProvider.ts``):
   When ``recordingManager.currentProject === name``, set:

   .. code-block:: typescript

      item.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red'));


.. spec:: StatusBar Recording Timer
   :id: SPEC_REC_STATUSBAR
   :status: implemented
   :links: REQ_REC_STATUSBAR

   **Description:**
   Create a StatusBar item in ``extension.ts`` that shows recording progress.

   **Implementation** (``src/extension.ts``):

   .. code-block:: typescript

      const recordingStatusBar = vscode.window.createStatusBarItem(
          vscode.StatusBarAlignment.Right, 10);
      recordingStatusBar.command = 'jarvis.stopRecording';

      // On recordingManager.onDidChange:
      // - If recording active: show(), start setInterval(updateFn, 1000)
      // - If recording stopped: hide(), clearInterval()

      // Update function:
      // const elapsed = Math.floor((Date.now() - startTime) / 1000);
      // text = `🔴 ${name} — ${mm}:${ss}`;


.. spec:: RecordingManager Class
   :id: SPEC_REC_SUBPROCESS
   :status: implemented
   :links: REQ_REC_SUBPROCESS; REQ_REC_CONFIG

   **Description:**
   New file ``src/recording.ts`` containing ``RecordingManager`` class.
   Subprocess and state management are isolated from ``extension.ts``.

   **Class interface**:

   .. code-block:: typescript

      class RecordingManager {
          readonly onDidChange: vscode.Event<void>;
          get currentProject(): string | undefined;
          get startTime(): number | undefined;

          async start(name: string, context: vscode.ExtensionContext): Promise<void>;
          async stop(): Promise<void>;
          async deactivate(): Promise<void>;
      }

   **``start()`` logic**:

   1. Guard: ``jarvis.recording.enabled`` must be ``true``
   2. Guard: ``jarvis.recording.whisperPath`` must be set and exist on disk
   3. Guard: not already recording
   4. Python check: ``cp.spawn('python', ['--version'])`` → error message if unavailable
   5. ``cp.spawn('python', [recorder.py, '--name', recordingName, '--no-timestamp', '--output-dir', outputDir])``
      where ``recordingName = YYYY-MM-DD_HHmm_<sanitized-name>`` (e.g. ``2026-04-15_1430_alpha``)
   6. Write ``<whisperPath>/.recording.json``: ``{ project, pid, startTime }``
   7. ``setContext('jarvis.recordingActive', true)`` + fire ``onDidChange``

   **``stop()`` logic**:

   1. Write ``<whisperPath>/.stop`` sentinel file
   2. Wait 500 ms
   3. Delete ``<whisperPath>/.recording.json``
   4. Clear state fields
   5. ``setContext('jarvis.recordingActive', false)`` + fire ``onDidChange``

   **``deactivate()``**: calls ``stop()`` if ``currentProject`` is set.

   **``extension.ts`` integration**:
   Module-level ``_recordingManager`` variable so ``deactivate()`` export can call
   ``_recordingManager.deactivate()``.
