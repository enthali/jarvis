Explorer User Stories
=====================

.. story:: Jarvis Explorer Sidebar
   :id: US_EXP_SIDEBAR
   :status: implemented
   :tracked_by: MOD_ACTOR
   :priority: mandatory

   **As a** Jarvis User,
   **I want** a dedicated Jarvis sidebar in VS Code that hosts the Jarvis views,
   **so that** I can reach all of Jarvis from one place without leaving the editor.

   **Acceptance Criteria:**

   * AC-1: A "Jarvis" icon appears in the VS Code Activity Bar
   * AC-2: Clicking the icon opens a sidebar panel
   * AC-3: The sidebar shows each Jarvis view as a collapsible section. What a
     view contains, when it is shown and how it behaves is specified by the
     story of that view: ``US_ACTOR_TREE`` (ACTORS), ``US_MSG_TREE`` (Messages
     and Reminders), ``US_AUT_HEARTBEATTREE`` (Heartbeat).
