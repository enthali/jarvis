Outlook Requirements
====================

.. req:: Outlook Category Provider (COM Bridge)
   :id: REQ_OLK_COMBRIDGE
   :status: draft
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


.. req:: Outlook Master Toggle
   :id: REQ_OLK_ENABLE
   :status: draft
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
