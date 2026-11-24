Outlook Requirements
====================

.. req:: Outlook Category Provider (COM Bridge)
   :id: REQ_OLK_COMBRIDGE
   :status: implemented
   :priority: mandatory
   :links: US_PIM_CATEGORIES; REQ_PIM_PROVIDER

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
   :links: US_PIM_CATEGORIES; US_PIM_TASKS; REQ_CFG_GROUPS

   **Description:**
   The extension SHALL provide a boolean setting ``jarvis.outlook.enabled`` that
   controls whether the Outlook COM provider is instantiated.

   **Acceptance Criteria:**

   * AC-1: ``jarvis.outlook.enabled`` SHALL be a boolean setting with default
     ``false``
   * AC-2: When ``false``, no COM calls SHALL be made and no Outlook providers
     SHALL be instantiated
   * AC-3: Changing ``jarvis.outlook.enabled`` SHALL require a window reload


.. req:: Outlook Task Provider (COM Bridge)
   :id: REQ_OLK_TASKPROVIDER
   :status: implemented
   :priority: mandatory
   :links: US_PIM_TASKS; REQ_PIM_TASKPROVIDER

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
   :links: US_PIM_TASKS; REQ_OLK_ENABLE; REQ_CFG_GROUPS

   **Description:**
   The extension SHALL provide a boolean setting ``jarvis.outlook.tasks.enabled``
   that controls whether the Outlook task provider is instantiated, independent
   of the category provider.

   **Acceptance Criteria:**

   * AC-1: ``jarvis.outlook.tasks.enabled`` SHALL be a boolean setting with
     default ``true``
   * AC-2: The tasks feature SHALL only be active when BOTH
     ``jarvis.outlook.enabled === true`` AND
     ``jarvis.outlook.tasks.enabled === true``
   * AC-3: When either toggle is ``false``, no task COM calls SHALL be made and
     no task provider SHALL be instantiated
   * AC-4: All ``when``-clauses referencing the tasks feature SHALL use the
     explicit form ``config.jarvis.outlook.tasks.enabled == true``


.. req:: Categories Feature Sub-Toggle
   :id: REQ_OLK_CATENABLE
   :status: approved
   :priority: mandatory
   :links: US_PIM_CATVIEW; REQ_OLK_ENABLE; REQ_CFG_GROUPS

   **Description:**
   The extension SHALL provide a boolean setting
   ``jarvis.outlook.categories.enabled`` that controls whether the Outlook
   category provider is instantiated and whether the Categories view is shown,
   in the same way ``jarvis.outlook.tasks.enabled`` controls the task provider.
   It replaces the setting ``jarvis.pim.showCategories``, which SHALL no longer
   exist.

   **Acceptance Criteria:**

   * AC-1: ``jarvis.outlook.categories.enabled`` SHALL be a boolean setting with
     default ``false``, declared in the "Outlook" settings group
   * AC-2: The categories feature SHALL only be active when BOTH
     ``jarvis.outlook.enabled === true`` AND
     ``jarvis.outlook.categories.enabled === true``
   * AC-3: When either toggle is ``false``, no category COM calls SHALL be made,
     no Outlook category provider SHALL be instantiated and the Categories view
     SHALL NOT be shown
   * AC-4: All ``when``-clauses referencing the categories feature SHALL use the
     explicit form ``config.jarvis.outlook.categories.enabled == true``
   * AC-5: Changing ``jarvis.outlook.categories.enabled`` SHALL require a window
     reload to take effect for the provider (same behaviour as
     ``REQ_OLK_ENABLE``)
   * AC-6: The setting ``jarvis.pim.showCategories`` SHALL NOT be declared in
     any manifest; no automatic migration of a previous value SHALL take place
