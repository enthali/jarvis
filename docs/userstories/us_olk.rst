Outlook User Stories
====================

.. story:: Outlook COM Integration (PIM Provider)
   :id: US_OLK_COMBRIDGE
   :status: implemented
   :priority: mandatory
   :links: US_PIM_CATEGORIES

   **As a** Jarvis User,
   **I want** an Outlook COM-based category provider that plugs into the PIM
   category architecture,
   **so that** my Outlook categories are synchronised automatically on Windows
   with Outlook Classic installed.

   **Acceptance Criteria:**

   * AC-1: An ``OutlookCategoryProvider`` implements ``ICategoryProvider`` with
     ``source: "outlook"``
   * AC-2: COM calls are made via ``child_process.execFile`` executing PowerShell
     scripts — no native Node.js COM binding, Windows + Outlook Classic only
   * AC-3: A colour heuristic assigns category colours: names containing "Project" →
     blue, names containing "Event" → pink, otherwise no colour
   * AC-4: A setting ``jarvis.outlookEnabled`` (default: ``false``) controls whether
     the Outlook COM provider is instantiated; when disabled, no COM calls are made
   * AC-5: Changing ``jarvis.outlookEnabled`` requires a window reload


.. story:: Auto-Create Outlook Category on New Entity
   :id: US_OLK_AUTOCATEGORY
   :status: implemented
   :priority: optional
   :links: US_EXP_NEWENTITY; US_OLK_COMBRIDGE

   **As a** Jarvis User,
   **I want** an Outlook category automatically created with a conventional name
   when I create a new project or event via the Jarvis explorer,
   **so that** my Outlook inbox and calendar are immediately categorised without
   manual effort.

   **Acceptance Criteria:**

   * AC-1: When a new project "Foo" is created and ``jarvis.outlookEnabled = true``,
     the Outlook category ``"Project: Foo"`` is created automatically
   * AC-2: When a new event "Bar Conference" is created and
     ``jarvis.outlookEnabled = true``, the Outlook category
     ``"Event: Bar Conference"`` is created automatically
   * AC-3: If ``jarvis.outlookEnabled = false`` or no category providers are
     configured, no category operation is attempted and the entity is still created
     successfully
   * AC-4: A failure to create the category does NOT prevent the entity from being
     created — the error is logged only
   * AC-5: The naming convention ``"Project: <name>"`` and ``"Event: <name>"`` is
     enforced at the command handler level, not delegated to ``CategoryService``
     or any provider
