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

   * AC-6: (project-actor-click-placement-fix CR) Test scenarios verify that
     fresh-session creation from Project, Event, and Actor entity trees all
     land the new chat tab deterministically in Main (column 1), and that
     repeat-opens still land at Main (regression guard) — covered by T-6
     through T-9.
   * AC-7: (project-actor-click-placement-fix CR) A test verifies the silent
     no-op edge case: if the UUID resolution fails during the fresh-session
     relocation step, the session is not destroyed and the chat remains
     usable (covered by T-10).

   **T-6 — Fresh session from Project tree opens at Main/column 1**
     Setup: Configure ``jarvis.projects.folder`` to include
     ``testdata/projects/``. Ensure no existing chat session named "beta".
     Open Jarvis Projects sidebar and VS Code Developer Tools (View >
     Developer Tools) to monitor tab placements. Note which column the
     Projects tree is in.
     Action: Right-click the "beta" project node and select ``Jarvis: Open
     Agent Session``. Observe which column the new chat tab appears in.
     Expected: The new chat session tab opens and lands in column 1 (Main),
     visible in the chat sidebar's "@" menu or by checking tab positions
     with Developer Tools. The tab is not in the same column as the Projects
     tree.

   **T-7 — Fresh session from Event tree opens at Main/column 1**
     Setup: Configure ``jarvis.events.folder`` to include
     ``testdata/events/``. Ensure no existing chat session named
     "event-2024". Open Jarvis Events sidebar. Have the Projects tree or
     another sidebar visible in column 2 (Docs/Secondary).
     Action: Right-click an event node and select ``Jarvis: Open Agent
     Session``. Observe which column the new chat tab appears in.
     Expected: The new chat session tab opens and lands in column 1 (Main),
     not in the same column as the Events tree or other sidebars.

   **T-8 — Fresh session from Actor tree opens at Main/column 1**
     Setup: Configure ``jarvis.sessions.enabled=true``. Ensure the Actors
     tree is visible in the sidebar. Ensure no existing chat session named
     "test-actor-xyz". Have ``testdata/.jarvis/sessions/test-actor-xyz/``
     with a ``session.yaml`` and ``context.md`` file.
     Action: Right-click the "test-actor-xyz" actor node and select
     ``Jarvis: Open Actor Chat`` (or ``Jarvis: Open Agent Chat`` if the
     label has been normalized). Observe which column the new chat tab
     appears in.
     Expected: The new chat session tab opens and lands in column 1 (Main),
     visible in the chat sidebar. The tab placement is consistent with
     Project and Event tree clicks (T-6, T-7).

   **T-9 — Repeat-open from Project, Event, and Actor always lands at Main**
     Setup: Create three chat sessions ("proj-open", "evt-open",
     "act-open") and let them all open in various columns (e.g., drag one
     to column 2, another to column 3 if available). Note which columns
     they're in. Have Project, Event, and Actor tree nodes corresponding to
     each session visible.
     Action: For each session tab:

        - (Project) Right-click "proj-open" project node and select ``Jarvis:
          Open Agent Session``
        - (Event) Right-click "evt-open" event node and select command
        - (Actor) Right-click "act-open" actor node and select command

     Expected: All three sessions are refocused and moved to column 1 (Main),
     regardless of which column they were previously in. The tabs are closed
     and reopened in column 1. The behavior is identical across all three
     entity kinds (regression guard — unchanged behavior from before the fix).

   **T-10 — Silent no-op edge case: UUID resolution failure during relocate**
     Setup: Have ``jarvis.debugLog=true`` enabled to observe logs. Open a
     project with no existing session. Open the browser console (F12) to
     watch for any error messages.
     Action: Create a fresh session from a project node (same as T-1, but
     monitor logs carefully). If the extension detects that the session UUID
     cannot be resolved during the relocate step (normally impossible because
     the rename just completed, but simulate the edge case by monitoring logs),
     observe that the session tab still exists and is usable.
     Expected: Even if UUID resolution fails silently during the relocate step
     (the renaming promise resolves but the UUID lookup somehow still misses
     it), the new chat session is not destroyed and remains functional in
     whatever column VS Code created it in. No error is shown to the user; the
     graceful degradation is silent (consistent with ``REQ_MSG_EDITORPLACEMENT``
     AC-13 and ``REQ_MSG_SESSIONLOOKUP`` AC-3's undefined-on-miss contract).
