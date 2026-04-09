Session Tools User Acceptance Tests
=====================================

.. story:: Open Chat Session Acceptance Tests
   :id: US_UAT_OPENSESSION
   :status: approved
   :priority: optional
   :links: US_MSG_OPENSESSION; REQ_MSG_OPENSESSION; REQ_MSG_SESSIONFILTER

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the Open Chat Session command,
   **so that** I can verify session browsing and opening end-to-end before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios document expected outcomes for: QuickPick display,
     session opening, empty-state handling, and unnamed-session filtering
   * AC-2: At least one test covers the happy path (select and open a session)
   * AC-3: At least one test covers the no-sessions edge case

   **Test Scenarios:**

   **T-1 — Open named session via QuickPick**
     Setup: At least one named chat session exists in the current workspace
     (e.g. rename a chat tab to "Project Alpha").
     Action: Run ``Jarvis: Open Chat Session`` from the command palette.
     Expected: QuickPick appears listing "Project Alpha"; selecting it opens
     the session as an editor tab.

   **T-2 — No named sessions shows info message**
     Setup: No named sessions in the workspace (only default "New Chat" tabs
     or no sessions at all).
     Action: Run ``Jarvis: Open Chat Session`` from the command palette.
     Expected: An informational notification ``Jarvis: No named chat sessions
     found`` is shown; no QuickPick appears.

   **T-3 — Unnamed and default sessions are filtered**
     Setup: One session named "Project Alpha", one unnamed/empty session, and
     one session with default title "New Chat".
     Action: Run ``Jarvis: Open Chat Session`` from the command palette.
     Expected: QuickPick shows only "Project Alpha"; the unnamed and
     "New Chat" sessions are not listed.

   **T-4 — Stale session (deleted between list and select)**
     Setup: Two named sessions exist. Open the QuickPick. While QuickPick is
     open, close one session tab from the sidebar.
     Action: Select the closed session in the QuickPick.
     Expected: ``vscode.open`` executes without error (platform handles the
     stale URI gracefully); no crash or unhandled exception.


.. story:: List Sessions LM Tool Acceptance Tests
   :id: US_UAT_LISTSESSIONS
   :status: approved
   :priority: optional
   :links: US_MSG_LISTSESSIONS; REQ_MSG_LISTSESSIONS; REQ_MSG_SESSIONFILTER

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the List Sessions LM Tool,
   **so that** I can verify session discovery by LLM agents end-to-end before
   release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios document expected outcomes for: tool availability,
     session listing, empty-state handling, and unnamed-session filtering
   * AC-2: At least one test covers invoking the tool and inspecting its output
   * AC-3: At least one test covers the empty/no-sessions case

   **Test Scenarios:**

   **T-1 — Tool appears in Chat tool picker**
     Setup: Extension is activated.
     Action: Open the Chat panel, type ``#`` to open the tool picker.
     Expected: ``listSessions`` (display name "List Chat Sessions") appears in
     the tool list.

   **T-2 — Tool returns named sessions**
     Setup: At least one named chat session exists (e.g. "Project Alpha").
     Action: In the Chat panel, invoke ``#listSessions``.
     Expected: The tool returns a JSON array containing ``"Project Alpha"``.

   **T-3 — Tool returns empty list when no sessions exist**
     Setup: No named sessions in the workspace (only "New Chat" or none).
     Action: Invoke ``#listSessions`` in the Chat panel.
     Expected: The tool returns an empty JSON array ``[]``.

   **T-4 — Unnamed sessions are excluded from tool output**
     Setup: One session named "Project Alpha", one unnamed session, one
     "New Chat" session.
     Action: Invoke ``#listSessions``.
     Expected: Only ``["Project Alpha"]`` is returned; unnamed and default
     sessions are filtered out.


.. story:: Open Agent Session from Explorer Acceptance Tests
   :id: US_UAT_AGENTSESSION
   :status: approved
   :priority: optional
   :links: US_EXP_AGENTSESSION; REQ_EXP_AGENTSESSION; US_EXP_OPENYAML

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the Open Agent Session
   explorer action, so that I can verify the inline button and session
   navigation end-to-end before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios document expected outcomes for: button visibility,
     existing-session opening, new-session creation, and folder-node exclusion
   * AC-2: At least one test covers opening an existing matching session
   * AC-3: At least one test covers the new-session fallback with init prompt

   **Test Scenarios:**

   **T-1 — Button visible on project leaf node**
     Setup: ``testdata/projects/`` configured as ``jarvis.projectsFolder``;
     scanner has loaded project items.
     Action: Hover over a project leaf node (e.g. "Project Alpha") in the
     Jarvis Explorer.
     Expected: Two inline buttons appear — ``$(go-to-file)`` (Open YAML) and
     ``$(comment-discussion)`` (Open Agent Session).

   **T-2 — Open existing agent session for project**
     Setup: A chat session named "Project Alpha" already exists.
     Action: Click ``$(comment-discussion)`` on the "Project Alpha" tree node.
     Expected: The existing "Project Alpha" chat session opens as an editor
     tab.

   **T-3 — Create new session when no match exists**
     Setup: No chat session named "Project Alpha" exists.
     Action: Click ``$(comment-discussion)`` on the "Project Alpha" tree node.
     Expected: A new editor chat opens; an initialization prompt is sent that
     includes the name "Project Alpha" and asks the user to rename the
     session.

   **T-4 — Button visible on event leaf node**
     Setup: ``testdata/events/`` configured as ``jarvis.eventsFolder``.
     Action: Hover over an event leaf node (e.g. "Tech Conference 2026").
     Expected: Both ``$(go-to-file)`` and ``$(comment-discussion)`` buttons
     appear.

   **T-5 — Folder nodes do not show agent session button**
     Setup: Project tree has folder nodes (e.g. ``active/`` subfolder).
     Action: Hover over the folder node.
     Expected: No ``$(comment-discussion)`` button is visible (contextValue
     is ``'folder'``, not ``'project'`` or ``'event'``).
