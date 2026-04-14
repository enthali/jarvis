Outlook Requirements
====================

.. req:: Outlook Category Provider (COM Bridge)
   :id: REQ_OLK_COMBRIDGE
   :status: implemented
   :priority: mandatory
   :links: US_OLK_COMBRIDGE; REQ_PIM_PROVIDER

   **Description:**
   The extension SHALL provide an ``OutlookCategoryProvider`` that reads and
   writes Outlook categories via COM automation on Windows using PowerShell.

   **Acceptance Criteria:**

   * AC-1: The provider SHALL implement the ``ICategoryProvider`` interface
     with ``source: "outlook"``
   * AC-2: COM calls SHALL be made via ``child_process.execFile`` executing
     PowerShell scripts — no native Node.js COM binding
   * AC-3: The provider SHALL be stateless — it only performs COM calls and
     does not cache results
   * AC-4: The provider SHALL only function on Windows with Outlook Classic
     installed; on other platforms, calls SHALL return empty results or reject
     gracefully
   * AC-5: A colour heuristic SHALL assign category colours: names containing
     "project" (case-insensitive) → ``olCategoryColorBlue`` (8), names
     containing "event" (case-insensitive) → ``olCategoryColorPink`` (10),
     otherwise ``olCategoryColorNone`` (0)
   * AC-6: ``renameCategory`` SHALL delete the old category and create a new
     one with the new name, preserving the original colour value
   * AC-7: ``getCategories`` SHALL populate the ``id`` field of each
     ``Category`` with the Outlook ``CategoryID`` from the COM object


.. req:: Outlook Master Toggle
   :id: REQ_OLK_ENABLE
   :status: implemented
   :priority: mandatory
   :links: US_OLK_COMBRIDGE; REQ_CFG_SETTINGSGROUPS

   **Description:**
   The extension SHALL provide a boolean setting ``jarvis.outlookEnabled`` that
   controls whether the Outlook COM provider is instantiated.

   **Acceptance Criteria:**

   * AC-1: ``jarvis.outlookEnabled`` SHALL be a boolean setting with default
     ``false``
   * AC-2: When ``false``, no COM calls SHALL be made and no Outlook providers
     SHALL be instantiated
   * AC-3: Changing ``jarvis.outlookEnabled`` SHALL require a window reload


.. req:: Auto-Create Outlook Category on New Entity
   :id: REQ_OLK_AUTOCAT_NEWENTITY
   :status: implemented
   :priority: optional
   :links: US_OLK_AUTOCATEGORY; REQ_EXP_NEWPROJECT; REQ_EXP_NEWEVENT; REQ_OLK_ENABLE; REQ_PIM_SERVICE

   **Description:**
   When a new project or event is created via ``jarvis.newProject`` or
   ``jarvis.newEvent``, the command handler SHALL call
   ``CategoryService.setCategory`` with the conventional category name, guarded
   by the Outlook enabled setting and provider availability.

   **Acceptance Criteria:**

   * AC-1: After the entity folder and YAML file are written successfully, the
     handler SHALL invoke ``categoryService.setCategory("Project: <name>", 0)``
     for projects and ``categoryService.setCategory("Event: <name>", 0)`` for
     events (where ``<name>`` is the unmodified user input, not the kebab-case
     folder name)
   * AC-2: The category call SHALL only be made when
     ``vscode.workspace.getConfiguration('jarvis').get('outlookEnabled') === true``
     AND ``categoryService.hasProviders()`` is ``true``; otherwise the call is
     skipped silently
   * AC-3: The category call SHALL be wrapped in a ``try / catch`` block; any
     error SHALL be logged via the shared ``LogOutputChannel`` and SHALL NOT
     propagate to the caller or abort entity creation
   * AC-4: The naming convention prefix (``"Project: "`` / ``"Event: "``) SHALL
     be applied in the command handler, not delegated to ``CategoryService`` or
     any provider
   * AC-5: The category creation SHALL occur after the entity files are written
     and before ``scanner.rescan()`` is triggered


.. req:: Outlook Task Provider (COM Bridge)
   :id: REQ_OLK_TASKPROVIDER
   :status: implemented
   :priority: mandatory
   :links: US_OLK_TASKS; REQ_PIM_TASKPROVIDER

   **Description:**
   The extension SHALL provide an ``OutlookTaskProvider`` that reads and writes
   Outlook Tasks via COM automation on Windows using PowerShell, implementing
   the ``ITaskProvider`` interface.

   **Acceptance Criteria:**

   * AC-1: The provider SHALL implement ``ITaskProvider`` with
     ``source: "outlook"``
   * AC-2: COM calls SHALL be made via ``child_process.execFile`` executing
     PowerShell scripts — no native Node.js COM binding
   * AC-3: The provider SHALL be stateless — it only performs COM calls and
     does not cache results
   * AC-4: The provider SHALL only function on Windows with Outlook Classic
     installed; on other platforms, calls SHALL return empty results or reject
     gracefully
   * AC-5: Setting ``isComplete: true`` on a task SHALL delegate to native
     Outlook completion, which sets ``DateCompleted`` automatically; the
     provider SHALL never accept direct writes to ``completedDate``
   * AC-6: The provider SHALL map Outlook task fields to the ``Task`` model:
     ``EntryID`` → ``id``, ``Subject`` → ``subject``, ``DueDate`` → ``dueDate``
     (ISO string or undefined), ``Status`` → ``status`` (mapped enum),
     ``Importance`` → ``priority`` (mapped enum), ``Complete`` → ``isComplete``,
     ``DateCompleted`` → ``completedDate``, ``Body`` → ``body`` (loaded only
     when requested), ``Categories`` → ``categories`` (split on comma)


.. req:: Tasks Feature Sub-Toggle
   :id: REQ_OLK_TASKENABLE
   :status: implemented
   :priority: mandatory
   :links: US_OLK_TASKS; REQ_OLK_ENABLE; REQ_CFG_SETTINGSGROUPS

   **Description:**
   The extension SHALL provide a boolean setting ``jarvis.outlook.tasks.enabled``
   that controls whether the Outlook task provider is instantiated, independent
   of the category provider.

   **Acceptance Criteria:**

   * AC-1: ``jarvis.outlook.tasks.enabled`` SHALL be a boolean setting with
     default ``true``
   * AC-2: The tasks feature SHALL only be active when BOTH
     ``jarvis.outlookEnabled === true`` AND
     ``jarvis.outlook.tasks.enabled === true``
   * AC-3: When either toggle is ``false``, no task COM calls SHALL be made and
     no task provider SHALL be instantiated
   * AC-4: All ``when``-clauses referencing the tasks feature SHALL use the
     explicit form ``config.jarvis.outlook.tasks.enabled == true``
