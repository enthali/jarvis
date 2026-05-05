Stable Session Open User Acceptance Tests
==========================================

.. story:: Stable Session Open Acceptance Tests
   :id: US_UAT_MSG_STABLESESSION
   :status: approved
   :priority: optional
   :links: US_MSG_STABLESESSION; REQ_MSG_PINNED; REQ_MSG_OPENCHAT; REQ_MSG_SENDPROMPT

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the Stable Session Open feature,
   **so that** I can verify correct session creation, reuse, pinning, initialization,
   and renaming end-to-end before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios cover: new session creation when none exists, existing
     session reuse, pinned open behavior, initialization prompt with context.md
     path, and automatic session renaming
   * AC-2: At least one test covers the happy path (project with no existing session)
   * AC-3: At least one test verifies that an existing named session is focused
     rather than a new one being created
   * AC-4: At least one test verifies the opened session is not in preview mode
   * AC-5: At least one test verifies the initialization prompt references the
     correct ``context.md`` path

   **Test Scenarios:**

   **T-1 — New session created for project without existing session**
     Setup: Configure ``jarvis.projects.folder`` to include ``testdata/projects/``.
     Ensure no existing chat session is named after the target project
     (e.g. "alpha"). Open Jarvis Projects sidebar.
     Action: Right-click the "alpha" project node and select
     ``Jarvis: Open Agent Session``.
     Expected: A new chat session is created and becomes the active tab.

   **T-2 — Existing session is focused, no duplicate created**
     Setup: An existing named chat session matching the project name (e.g.
     "alpha") is open in the Extension Development Host.
     Action: Right-click the "alpha" project node and select
     ``Jarvis: Open Agent Session``.
     Expected: The existing "alpha" session is focused; no additional new
     chat session is created.

   **T-3 — Existing session opens pinned (not in preview)**
     Setup: An existing named chat session for the target project is open.
     Action: Right-click the project node and select
     ``Jarvis: Open Agent Session``.
     Expected: The session tab shows as a permanent (pinned) tab — the tab
     title is not italicised and the tab is not marked as preview.

   **T-4 — New session receives initialization prompt with context.md path**
     Setup: Target project folder contains a ``context.md`` file
     (e.g. ``testdata/projects/alpha/context.md``). No existing session for
     the project exists.
     Action: Right-click the project node and select
     ``Jarvis: Open Agent Session``.
     Expected: The newly created chat session receives an input prompt that
     includes the absolute path to the project's ``context.md`` file.

   **T-5 — New session is renamed to entity name**
     Setup: No existing session for the target project. Project name is
     "alpha".
     Action: Right-click the "alpha" project node and select
     ``Jarvis: Open Agent Session``.
     Expected: After creation the chat session tab title is updated to
     "alpha" (matching the entity name), visible in the Chat sidebar.
