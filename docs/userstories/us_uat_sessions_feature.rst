Sessions Feature User Acceptance Tests
=======================================

.. story:: Sessions Feature Acceptance Tests
   :id: US_UAT_ACT_SESSIONS
   :status: implemented
   :priority: required
   :links: US_ACT_ACTORS

   **As a** Jarvis Test Engineer,
   **I want** a set of manual acceptance test scenarios for the sessions-feature change,
   **so that** I can verify end-to-end that the Sessions tree view appears and is gated
   by the feature toggle, sessions can be browsed and created, ``context.md`` opens on
   click, the JSON schema validates ``session.yaml`` files, the ``jarvis_listSessionEntities``
   LM+MCP tool returns session data, and the Sessions feature works independently of
   the Projects and Events features.

   **Acceptance Criteria:**

   * AC-1: A test verifies that the Sessions view appears in the Jarvis sidebar when
     ``jarvis.sessions.enabled`` is ``true`` (default) and disappears without a reload
     when it is set to ``false``.
   * AC-2: A test verifies that the Sessions tree displays sessions from
     ``<workspaceRoot>/.jarvis/sessions/`` alphabetically (no folder configuration
     required — path is fixed).
   * AC-3: A test verifies that clicking a session node opens the session's
     ``context.md`` file via ``jarvis.openContext``.
   * AC-4: A test verifies that right-clicking a session node shows all expected
     context-menu contributions: **Open Context**, **Open Agent Session**,
     **Reveal in Explorer**, **Reveal in OS**, and **Open in Terminal**.
   * AC-5: A test verifies that ``jarvis.newEntity`` now offers a **Session** option
     in the QuickPick, and selecting it creates a ``session.yaml`` and ``context.md``
     in the chosen folder, with the new session appearing in the tree.
   * AC-6: A test verifies that an invalid ``session.yaml`` (missing required ``name``
     field, or containing an unknown property) triggers a YAML schema error in the
     VS Code Problems panel.
   * AC-7: A test verifies that the LM tool ``jarvis_listSessionEntities`` (via chat)
     returns both sample sessions with their ``name``, ``summary``, and folder path.
   * AC-8: A test verifies that the MCP tool ``jarvis_listSessionEntities`` is
     accessible when ``jarvis.mcp.enabled=true``.
   * AC-9: A test verifies that with ``jarvis.sessions.enabled=false`` the tool
     ``jarvis_listSessionEntities`` is not registered and does not appear in the
     agent tool picker.
   * AC-10: A test verifies that with ``jarvis.projects.enabled=false`` and
     ``jarvis.events.enabled=false`` the Sessions view and tool still operate
     correctly.

   **Test Scenarios:**

   **T-1 — Sessions view visible by default; toggle hides/shows it**
     Setup: Open ``testdata/test.code-workspace`` in the Extension Development Host
     (F5). Ensure no workspace override for ``jarvis.sessions.enabled`` (default
     ``true``).
     Action: Observe the Jarvis sidebar in the Activity Bar. Then, without reloading,
     set ``jarvis.sessions.enabled`` to ``false`` in Workspace Settings. Observe the
     sidebar again. Set it back to ``true`` and observe again.
     Expected: Sessions view is visible by default. After disabling it disappears from
     the sidebar without a window reload. After re-enabling it reappears.

   **T-2 — Sessions tree populated from fixed path**
     Setup: Open ``testdata/test.code-workspace`` in the Extension Development Host
     (F5). Ensure ``jarvis.sessions.enabled=true`` (default). Reload window if needed.
     Action: Observe the Sessions tree view.
     Expected: The tree displays exactly two nodes in alphabetical order:
     ``copilot-cm`` (first) and ``dev-feature-x`` (second), discovered automatically
     from ``testdata/.jarvis/sessions/``. No folder configuration required.

   **T-3 — Click session node opens context.md**
     Setup: Sessions tree populated as in T-2.
     Action: Single-click (or use **Open Context** via the inline icon) on the
     ``dev-feature-x`` session node.
     Expected: VS Code opens ``testdata/.jarvis/sessions/dev-feature-x/context.md`` in the
     editor. The file path shown in the tab matches the expected session folder.

   **T-4 — Context menu on session node**
     Setup: Sessions tree populated as in T-2.
     Action: Right-click the ``copilot-cm`` node in the Sessions tree.
     Expected: The context menu contains exactly the following entries contributed
     for ``contextValue == jarvisSession``:
     **Open Context** (inline icon), **Open Agent Session** (inline icon),
     **Reveal in Explorer**, **Reveal in OS**, **Open in Terminal**.
     No error is shown.

   **T-5 — newEntity → Session option; creates files and auto-opens chat**
     Pre-condition: Sessions tree populated as in T-2.
     Action: Run command ``Jarvis: New Entity`` (Command Palette or toolbar
     button). In the QuickPick, verify three options are present: **Project**,
     **Event**, **Session**. Select **Session**. Enter name
     ``test-session`` and summary ``Test session``.
     Expected: A folder ``testdata/.jarvis/sessions/test-session/`` is created
     containing ``session.yaml`` (with ``name: test-session`` and
     ``summary: Test session``) and ``context.md``. The new node
     ``test-session`` appears in the Sessions tree (after rescan). A new
     Copilot chat session opens automatically with the identity prompt
     (see T-11 for prompt verification).
     Clean up: delete ``testdata/.jarvis/sessions/test-session/`` after verification.

   **T-5a — Sessions view ``+`` button creates session and auto-opens chat**
     Pre-condition: Sessions tree populated as in T-2.
     Action: Click the ``+`` icon in the Sessions view title bar (not via Command
     Palette). Enter name ``btn-session`` and summary ``Button-created session``.
     Expected: Same outcome as T-5: the folder
     ``testdata/.jarvis/sessions/btn-session/`` is created with ``session.yaml``
     and ``context.md``. The node ``btn-session`` appears in the tree. A new
     Copilot chat session opens automatically. Verify that the Command Palette
     does **not** list ``Jarvis: New Session`` (command is hidden).
     Clean up: delete ``testdata/.jarvis/sessions/btn-session/`` after verification.

   **T-6 — JSON schema validation: invalid session.yaml**
     Setup: Create a file ``testdata/.jarvis/sessions/bad-session/session.yaml`` with content
     ``summary: "Missing name field"``. Open that file in VS Code.
     Action: Open the Problems panel (``Ctrl+Shift+M``).
     Expected: At least one YAML schema warning or error appears for
     ``bad-session/session.yaml`` indicating a missing required property ``name``.
     Clean up: delete ``testdata/.jarvis/sessions/bad-session/`` after verification.

   **T-7 — LM tool jarvis_listSessionEntities returns sessions**
     Setup: Sessions tree populated as in T-2. Open an agent chat.
     Action: In the chat, invoke the tool by typing ``#listSessionEntities`` and
     confirming the tool call.
     Expected: The tool returns a list containing both sessions:
     ``copilot-cm`` (summary: "Change Manager session") and
     ``dev-feature-x`` (summary: "Working on feature X"). Each entry includes the
     session folder path. No error appears in the Jarvis output channel.

   **T-8 — MCP tool jarvis_listSessionEntities accessible via MCP**
     Setup: Set ``jarvis.mcp.enabled`` to ``true``. Reload window. Sessions tree
     populated as in T-2.
     Action: Open the Jarvis Output channel and note the MCP port. Using Copilot CLI
     or curl, call the ``jarvis_listSessionEntities`` MCP tool against the listed port
     (e.g. ``jarvis mcp call jarvis_listSessionEntities``).
     Expected: The MCP call returns the same session list as T-7. The tool is listed
     in the MCP tool manifest when the client connects.

   **T-9 — Tool not registered when sessions feature disabled**
     Setup: Set ``jarvis.sessions.enabled`` to ``false``. Reload window.
     Action: Open an agent chat. Type ``#listSessionEntities`` and observe the autocomplete
     suggestions.
     Expected: ``listSessionEntities`` does NOT appear in the autocomplete
     suggestions. Only the existing ``jarvis_listSessions`` (chat-session tool) may
     appear. Re-enable (``jarvis.sessions.enabled = true``) and reload — the tool
     reappears. (Note: tool registration changes currently require a window reload.)

   **T-10 — Sessions independence from Projects/Events**
     Setup: Set ``jarvis.projects.enabled`` to ``false`` and
     ``jarvis.events.enabled`` to ``false``. Set ``jarvis.sessions.enabled`` to
     ``true``. Reload window.
     Action: Observe the Jarvis sidebar. In an agent chat invoke
     ``jarvis_listSessionEntities``.
     Expected: The Projects and Events views are absent from the Jarvis sidebar.
     Only the Sessions view (and any always-on views like Heartbeat/Messages) is
     present. The tool call returns both sample sessions from ``.jarvis/sessions/``
     without error.

   **T-11 — Agent-session identity prompt**
     Pre-condition: A new Session has been created (e.g. ``test-session`` from T-5
     or ``btn-session`` from T-5a). The Copilot chat session opened automatically.
     Action: Observe the first message sent to the newly opened chat session.
     Expected:

     * The message starts with ``You are the session "<name>"``.
     * The message contains the absolute path to the session's ``context.md``
       rendered as an inline code span (backtick-quoted).
     * The message instructs the agent to read ``context.md`` now and update it
       with decisions, plans, and findings.
     * No error notification appears.

     Verify the same prompt structure for a **Project**: use
     ``jarvis.openAgentSession`` on a project node for which no session exists yet.
     Expected: prompt starts with ``You are the project "<name>"``.
     Clean up: close the auto-opened chat tabs after verification.
