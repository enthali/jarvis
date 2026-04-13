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
