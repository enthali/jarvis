Explorer Requirements
=====================

.. req:: Activity Bar Registration
   :id: REQ_EXP_ACTIVITYBAR
   :status: implemented
   :priority: mandatory
   :links: US_EXP_SIDEBAR

   **Description:**
   The extension SHALL register a view container in the VS Code Activity Bar
   with a unique icon and the label "Jarvis".

   **Acceptance Criteria:**

   * AC-1: A dedicated icon is visible in the Activity Bar when the extension is installed
   * AC-2: The tooltip shows "Jarvis"


.. req:: Sidebar Tree Views
   :id: REQ_EXP_TREEVIEW
   :status: approved
   :priority: mandatory
   :links: US_EXP_SIDEBAR; REQ_ACTOR_TREE; REQ_CFG_TOGGLES

   **Description:**
   The extension SHALL provide tree views inside the Jarvis sidebar: the
   ACTORS view (``REQ_ACTOR_TREE``), "Messages", "Heartbeat", and
   "Categories". The Messages view displays queued messages grouped by target
   session. The Categories view displays Outlook categories (see
   ``REQ_PIM_CATVIEW``). Visibility of Messages and Heartbeat follows their
   feature toggles (``REQ_CFG_TOGGLES``).

   **Acceptance Criteria:**

   * AC-1: The sidebar contains the ACTORS view (``REQ_ACTOR_TREE``).
   * AC-2: The sidebar contains a "Messages" tree view.
   * AC-3: When the message queue is empty, the Messages tree view SHALL display a
     single node with label ``nothing to deliver``.
   * AC-4: The sidebar contains a "Heartbeat" tree view.
   * AC-5: The sidebar contains a "Categories" tree view (visible when
     categories are enabled — see ``REQ_PIM_CATVIEW`` for visibility rules).
   * AC-6: The Messages, Reminders, and Heartbeat tree views SHALL show VS
     Code's native "Collapse All" title-bar button (``showCollapseAll: true``
     on ``createTreeView()``); for the ACTORS view see ``REQ_ACTOR_TREE``
     AC-9. This is UI convenience only — no change to tree content, node
     structure, or click behavior.


.. req:: Background Cache with Reactive Tree Update
   :id: REQ_EXP_REACTIVECACHE
   :status: approved
   :priority: mandatory
   :links: US_EXP_SIDEBAR; REQ_CFG_SCANINTERVAL

   **Description:**
   A background scanner SHALL maintain an in-memory cache and update the tree view
   reactively via `onDidChangeTreeData`. The scanner runs in the background
   regardless of view visibility, because its cache is also the Actor list
   against which message, heartbeat and reminder destinations are validated.

   **Acceptance Criteria:**

   * AC-1: The UI thread never performs file I/O — all reads happen in the background scanner
   * AC-3: The scanner runs at the interval defined by `jarvis.scanInterval`
   * AC-4: After each scan, the result is compared to the current cache — `onDidChangeTreeData`
     is fired only if the cache actually changed
   * AC-5: On first scan the cache is empty and the tree shows nothing; after the first scan
     completes the cache is populated and the event is fired
   * AC-6: The scanner SHALL expose a public method to trigger an immediate rescan
     outside the timer cycle
   * AC-7: The change comparison SHALL include Actor data (name, summary, agent),
     not only tree structure — editing a YAML field without adding or removing
     folders SHALL trigger a cache update


.. req:: Open heartbeat.yaml at Job Line
   :id: REQ_EXP_HEARTBEAT_OPENFILE
   :status: implemented
   :priority: optional
   :links: US_EXP_OPENFILE; REQ_CFG_FIXEDPATHS

   **Description:**
   Clicking a Heartbeat Job node in the Heartbeat tree view SHALL open
   ``heartbeat.yaml`` in the VS Code editor and reveal the line where that
   job's definition begins.

   **Acceptance Criteria:**

   * AC-1: The command is triggered by clicking the job node (``TreeItem.command``)
   * AC-2: The file opened is the fixed heartbeat file ``.jarvis/heartbeat.yaml``,
     obtained from the central path resolver (``REQ_CFG_FIXEDPATHS``,
     ``REQ_CFG_PATHSINGLESOURCE``)
   * AC-3: The revealed line is the first line in the file that contains the job
     name (case-sensitive match against ``name:`` YAML key)
   * AC-4: If the job name is not found in the file, the file opens at line 0
     (start of file, fail-open)
   * AC-5: The file is opened read-write (standard editor, no custom editor)
   * AC-6: If no workspace is open or the file cannot be opened, the command
     shows a warning notification and returns without opening a file


.. req:: Open Messages File at Message Position
   :id: REQ_EXP_MESSAGE_OPENFILE
   :status: implemented
   :priority: optional
   :links: US_EXP_OPENFILE; REQ_CFG_FIXEDPATHS

   **Description:**
   Clicking a Message leaf node in the Messages tree view SHALL open the messages
   JSON file in the VS Code editor and reveal the position of that message.

   **Acceptance Criteria:**

   * AC-1: The command is triggered by clicking the message node (``TreeItem.command``)
   * AC-2: The file opened is the fixed message queue file
     ``.jarvis/messages/queue.json``, obtained from the central path resolver
     (``REQ_CFG_FIXEDPATHS``, ``REQ_CFG_PATHSINGLESOURCE``)
   * AC-3: The revealed position is determined by the message's index in the queue
     (the Nth message entry in the JSON array)
   * AC-4: If the index is out of range or the position cannot be determined, the
     file opens at line 0 (fail-open)
   * AC-5: The file is opened read-write (standard editor, no custom editor)
   * AC-6: If no workspace is open or the file cannot be opened, the command
     shows a warning notification and returns without opening a file


.. req:: Open Reminders File at Reminder Position
   :id: REQ_EXP_REMINDER_OPENFILE
   :status: draft
   :priority: optional
   :links: US_MSG_REMINDERS; US_EXP_OPENFILE; REQ_CFG_PATHSINGLESOURCE

   **Description:**
   Clicking a reminder node in the "Reminders" sidebar view SHALL open
   ``reminders.yaml`` in the VS Code editor and reveal the line of that
   reminder entry.

   **Acceptance Criteria:**

   * AC-1: The command is triggered by clicking the reminder node
     (``TreeItem.command``)
   * AC-2: The file opened SHALL be the one reminders are persisted to
     (``REQ_MSG_REMINDERS_PERSIST``), obtained from the central path resolver
     (``REQ_CFG_PATHSINGLESOURCE``). This AC previously required the path to be
     "resolved by ``resolveRemindersPath(messagesPath)``" — the derivation that
     ``SPEC_MSG_REMINDERSTORE`` had already replaced. The view therefore opened
     a different file from the one the store wrote whenever the two disagreed,
     and after ``REQ_CFG_MSGDIR`` they would disagree always.
   * AC-3: The revealed line contains the matching ``id: <uuid>`` entry of
     the clicked reminder
   * AC-4: If the matching id cannot be found, the file opens at line 0
     (fail-open)
   * AC-5: The file is opened read-write (standard editor, no custom editor)
   * AC-6: If ``reminders.yaml`` is missing the command shows a warning
     notification and returns without opening a file
