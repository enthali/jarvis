Explorer User Stories
=====================

.. story:: Project & Event Explorer
   :id: US_EXP_SIDEBAR
   :status: implemented
   :priority: mandatory

   **As a** project manager,
   **I want** a dedicated sidebar in VS Code that lists my projects and events in two separate groups,
   **so that** I can quickly see and navigate to my active projects and upcoming events without leaving the editor.

   **Acceptance Criteria:**

   * AC-1: A "Jarvis" icon appears in the VS Code Activity Bar
   * AC-2: Clicking the icon opens a sidebar panel
   * AC-3: The sidebar contains two collapsible sections: "Projects" and "Events"
   * AC-4: Each section displays a list of items with their names


.. story:: Manual Extension Testing
   :id: US_EXP_MANUALTEST
   :status: implemented
   :priority: mandatory

   **As a** developer,
   **I want** to quickly launch and test my extension changes in a real VS Code window,
   **so that** I can verify the extension works as expected before committing.

   **Acceptance Criteria:**

   * AC-1: A VS Code launch configuration exists for "Run Extension" (F5)
   * AC-2: The Implement Agent compiles and launches the Extension Development Host after implementation
   * AC-3: The agent presents a user-facing test summary listing what to verify
   * AC-4: The user can confirm or reject the test before the agent proceeds to commit
   * AC-5: Test questions and results are persisted as a document for traceability
