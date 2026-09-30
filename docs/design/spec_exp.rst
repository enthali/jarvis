Explorer Design Specifications
===============================

.. spec:: Extension Manifest & Activation
   :id: SPEC_EXP_EXTENSION
   :status: approved
   :links: REQ_EXP_ACTIVITYBAR, REQ_EXP_TREEVIEW, REQ_CFG_FOLDERPATHS, REQ_CFG_TOGGLES, SPEC_ACTOR_TREE, SPEC_ACTOR_SCANNER

   **Description:**
   The core extension contributes the Jarvis activity-bar container and its
   views, and wires them at activation.

   **Manifest (``packages/core/package.json``):**

   * ``activationEvents``: ``onStartupFinished``, ``onView:jarvisActors``,
     ``onView:jarvisMessages``, ``onView:jarvisReminders``,
     ``onView:jarvisHeartbeat``.
   * ``contributes.viewsContainers.activitybar``: ``jarvis-explorer``, title
     ``Jarvis``, icon ``resources/jarvis.svg``.
   * ``contributes.views.jarvis-explorer`` (in this order):

     .. code-block:: json

        [
          { "id": "jarvisActors",    "name": "Actors" },
          { "id": "jarvisMessages",  "name": "Messages",
            "when": "config.jarvis.messages.enabled == true" },
          { "id": "jarvisReminders", "name": "Reminders",
            "when": "config.jarvis.messages.enabled == true && config.jarvis.reminders.enabled == true" },
          { "id": "jarvisHeartbeat", "name": "Heartbeat",
            "when": "config.jarvis.heartbeat.enabled == true" }
        ]

     The PIM add-on contributes ``jarvisCategories`` to the same container
     (``SPEC_PIM_CATVIEW``). The ACTORS view has no ``when`` clause and no
     feature toggle (``REQ_CFG_TOGGLES``).

   **Activation:** the boot order is specified once, in
   ``SPEC_DEV_ACTIVATION``.

   **Acceptance Criteria:**

   * AC-1: The four core views and their ``when`` clauses are exactly those
     above; no ``jarvisEntities``, ``jarvisProjects``, ``jarvisEvents`` or
     ``jarvisSessions`` view is contributed.
   * AC-2: No setting is written at activation.


.. spec:: Collapse All Title-Bar Button (All Tree Views)
   :id: SPEC_EXP_COLLAPSEALL
   :status: approved
   :links: REQ_EXP_TREEVIEW; SPEC_ACTOR_TREE

   **Description:**
   Every ``vscode.window.createTreeView()`` call passes
   ``showCollapseAll: true``, which adds VS Code's native Collapse All button
   to the view title bar. It needs no command or ``package.json`` entry.

   .. list-table::
      :header-rows: 1
      :widths: 30 40 30

      * - View ID
        - File
        - Package
      * - ``jarvisActors``
        - ``extension.ts``
        - ``packages/core``
      * - ``jarvisMessages``
        - ``extension.ts``
        - ``packages/core``
      * - ``jarvisReminders``
        - ``extension.ts``
        - ``packages/core``
      * - ``jarvisHeartbeat``
        - ``apps/session/heartbeat.ts``
        - ``packages/core``

   **Acceptance Criteria:**

   * AC-1: All four call sites pass ``showCollapseAll: true``.
   * AC-2: A tree view added later also sets ``showCollapseAll: true``.


.. spec:: Open Heartbeat Job Command
   :id: SPEC_EXP_HEARTBEAT_OPENFILE
   :status: approved
   :links: REQ_EXP_HEARTBEAT_OPENFILE; SPEC_EXP_EXTENSION; SPEC_CFG_PATHRESOLVER

   **Description:**
   Register ``jarvis.openHeartbeatJob`` in ``extension.ts``. Set as
   ``TreeItem.command`` on every ``JobNode`` in ``HeartbeatTreeProvider``.
   Opens ``heartbeat.yaml`` and reveals the line where the job is defined.
   The path comes from the central resolver, the same one the scheduler
   reads (``SPEC_CFG_PATHRESOLVER``).

   **Handler:**

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.openHeartbeatJob',
        async (node: JobNode) => {
          const configPath = configPaths.getHeartbeatPath();
          if (!configPath) {
            vscode.window.showWarningMessage('Jarvis: Cannot open heartbeat config: no workspace open.');
            return;
          }
          const uri = vscode.Uri.file(configPath);
          let lineIndex = 0;
          try {
            const doc = await vscode.workspace.openTextDocument(uri);
            const target = `name: ${node.job.name}`;
            for (let i = 0; i < doc.lineCount; i++) {
              if (doc.lineAt(i).text.includes(target)) {
                lineIndex = i;
                break;
              }
            }
            const range = new vscode.Range(lineIndex, 0, lineIndex, 0);
            const editor = await vscode.window.showTextDocument(doc);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
            editor.selection = new vscode.Selection(range.start, range.start);
          } catch {
            vscode.window.showWarningMessage(`Jarvis: Cannot open heartbeat config: ${configPath}`);
          }
        }
      );

   **HeartbeatTreeProvider change:**

   In ``getTreeItem``, for ``JobNode``, set ``item.command``:

   .. code-block:: typescript

      item.command = {
        command: 'jarvis.openHeartbeatJob',
        title: 'Open in heartbeat.yaml',
        arguments: [element]
      };

   **Registration in package.json:**

   * ``contributes.commands``:

     .. code-block:: json

        {
          "command": "jarvis.openHeartbeatJob",
          "title": "Jarvis: Open Heartbeat Job"
        }

   * ``contributes.menus.commandPalette``: hide from Command Palette:

     .. code-block:: json

        { "command": "jarvis.openHeartbeatJob", "when": "false" }

   **Design notes:**

   * ``TreeItem.command`` fires on single-click — no inline button needed
   * Line search uses ``includes()`` — matches both ``name: JobName`` and
     ``  - name: JobName`` (any indentation level)
   * Falls back to ``lineIndex = 0`` if no match is found (fail-open)
   * Disposable pushed to ``context.subscriptions``


.. spec:: Open Message File Command
   :id: SPEC_EXP_MESSAGE_OPENFILE
   :status: approved
   :links: REQ_EXP_MESSAGE_OPENFILE; SPEC_EXP_EXTENSION; SPEC_CFG_PATHRESOLVER

   **Description:**
   Register ``jarvis.openMessageFile`` in ``extension.ts``. Set as
   ``TreeItem.command`` on every ``MessageLeafNode`` in ``MessageTreeProvider``.
   Opens the messages JSON file and reveals the position of the message at the
   node's queue index. The path comes from ``resolveMessagesPath()``, the same
   accessor the queue store writes through (``SPEC_CFG_PATHRESOLVER``).

   **Handler:**

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.openMessageFile',
        async (node: MessageLeafNode) => {
          const messagesPath = resolveMessagesPath();
          const uri = vscode.Uri.file(messagesPath);
          let lineIndex = 0;
          try {
            const doc = await vscode.workspace.openTextDocument(uri);
            // Find the Nth "text": occurrence (0-based index = node.index)
            let count = -1;
            for (let i = 0; i < doc.lineCount; i++) {
              if (doc.lineAt(i).text.trimStart().startsWith('"text":')) {
                count++;
                if (count === node.index) {
                  lineIndex = i;
                  break;
                }
              }
            }
            const range = new vscode.Range(lineIndex, 0, lineIndex, 0);
            const editor = await vscode.window.showTextDocument(doc);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
            editor.selection = new vscode.Selection(range.start, range.start);
          } catch {
            vscode.window.showWarningMessage(`Jarvis: Cannot open messages file: ${messagesPath}`);
          }
        }
      );

   **MessageTreeProvider change:**

   In ``getTreeItem``, for ``MessageLeafNode``, set ``item.command``:

   .. code-block:: typescript

      item.command = {
        command: 'jarvis.openMessageFile',
        title: 'Open in messages file',
        arguments: [element]
      };

   **Registration in package.json:**

   * ``contributes.commands``:

     .. code-block:: json

        {
          "command": "jarvis.openMessageFile",
          "title": "Jarvis: Open Message File"
        }

   * ``contributes.menus.commandPalette``: hide from Command Palette:

     .. code-block:: json

        { "command": "jarvis.openMessageFile", "when": "false" }

   **Design notes:**

   * ``TreeItem.command`` fires on single-click — no inline button needed
   * The ``"text":`` line heuristic works because the messages JSON format
     places exactly one ``"text":`` field per message object (see ``messageQueue.ts``)
   * ``node.index`` is the 0-based queue position, set by ``MessageTreeProvider``
     during ``getChildren``
   * Falls back to ``lineIndex = 0`` if the index exceeds the number of ``"text":``
     lines found (fail-open)
   * Disposable pushed to ``context.subscriptions``


.. spec:: Open Reminder File Command
   :id: SPEC_EXP_REMINDER_OPENFILE
   :status: draft
   :links: REQ_EXP_REMINDER_OPENFILE; SPEC_MSG_REMINDERSVIEW; SPEC_MSG_REMINDERSTORE; REQ_CFG_PATHSINGLESOURCE

   **Description:**
   Register ``jarvis.openReminderFile`` in ``extension.ts``. Set as
   ``TreeItem.command`` on every ``ReminderNode`` in ``RemindersTreeProvider``.
   Opens ``reminders.yaml`` and reveals the line with the matching reminder id.

   The handler resolves the path through ``configPaths.getRemindersPath()`` —
   the same accessor the reminder store writes through
   (``SPEC_MSG_REMINDERSTORE``). It previously derived the path from the queue
   path, contradicting the element it links; the two agreed only while the
   layout was flat, and ``REQ_CFG_MSGDIR`` ends that. Opening a file by a
   different route from the one that writes it is the defect, independent of
   whether the two routes currently happen to agree.

   **Handler:**

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.openReminderFile',
        async (node: ReminderNode) => {
          const remindersPath = configPaths.getRemindersPath();
          if (!remindersPath || !fs.existsSync(remindersPath)) {
            vscode.window.showWarningMessage(
              `Jarvis: Cannot open reminders file: ${remindersPath ?? '(no workspace)'}`
            );
            return;
          }
          const uri = vscode.Uri.file(remindersPath);
          let lineIndex = 0;
          try {
            const doc = await vscode.workspace.openTextDocument(uri);
            const target = `id: ${node.reminder.id}`;
            for (let i = 0; i < doc.lineCount; i++) {
              if (doc.lineAt(i).text.includes(target)) {
                lineIndex = i;
                break;
              }
            }
            const range = new vscode.Range(lineIndex, 0, lineIndex, 0);
            const editor = await vscode.window.showTextDocument(doc);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
            editor.selection = new vscode.Selection(range.start, range.start);
          } catch {
            vscode.window.showWarningMessage(`Jarvis: Cannot open reminders file: ${remindersPath}`);
          }
        }
      );

   **RemindersTreeProvider change:**

   In ``getTreeItem``, set ``item.command``:

   .. code-block:: typescript

      item.command = {
        command: 'jarvis.openReminderFile',
        title: 'Open in reminders file',
        arguments: [element]
      };

   **Registration in package.json:**

   * ``contributes.commands``:

     .. code-block:: json

        {
          "command": "jarvis.openReminderFile",
          "title": "Jarvis: Open Reminder File"
        }

   * ``contributes.menus.commandPalette``: hide from Command Palette:

     .. code-block:: json

        { "command": "jarvis.openReminderFile", "when": "false" }

   **Design notes:**

   * ``TreeItem.command`` fires on single-click, consistent with messages
     and heartbeat nodes
   * Line match uses substring contains of ``id: <uuid>`` — fails open to
     line 0 if the id is not found
   * Disposable pushed to ``context.subscriptions``
