Sessions Feature UAT Design Specifications
==========================================

.. spec:: Sessions Feature Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_ACT_SCENARIOS
   :status: implemented
   :links: REQ_UAT_ACT_TREE; REQ_UAT_ACT_NEWENTITY; REQ_UAT_ACT_TOOL; REQ_UAT_ACT_TOGGLE; REQ_UAT_ACT_AGENTPROMPT

   **Description:**
   Step-by-step procedures and expected outcomes for all ten sessions-feature
   acceptance test scenarios, covering the Sessions tree view toggle, folder
   configuration, context file opening, context menu, new-entity session creation,
   JSON schema validation, LM tool, MCP tool, tool-deregistration on disable, and
   feature independence.

   **Test Setup:**

   * Extension Development Host running with the Jarvis extension loaded from
     the ``feature/sessions-feature`` branch.
   * Open the workspace ``testdata/test.code-workspace`` (File → Open Workspace
     from File…) — this gives a workspace root of ``testdata/``.
   * The Implement Engineer must create these test-data files before running UAT:

     * ``testdata/.jarvis/sessions/copilot-cm/session.yaml``::

         name: copilot-cm
         summary: "Change Manager session"

     * ``testdata/.jarvis/sessions/copilot-cm/context.md``::

         # copilot-cm

         Change Manager session context.

     * ``testdata/.jarvis/sessions/dev-feature-x/session.yaml``::

         name: dev-feature-x
         summary: "Working on feature X"

     * ``testdata/.jarvis/sessions/dev-feature-x/context.md``::

         # dev-feature-x

         Feature X development session context.

   * No folder configuration is required. Sessions are discovered automatically
     from ``<workspaceRoot>/.jarvis/sessions/``.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 40 52

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (toggle)
        - Ensure no workspace override for ``jarvis.sessions.enabled`` (default
          ``true``). Observe the Jarvis sidebar. Then set
          ``jarvis.sessions.enabled`` to ``false`` in Workspace Settings (no
          reload). Observe. Set it back to ``true``. Observe.
        - Sessions view is visible by default. After setting to ``false`` it
          disappears from the sidebar immediately (no reload required). After
          setting back to ``true`` it reappears immediately.
      * - T-2 (folder config)
        - Open ``testdata/test.code-workspace`` with ``jarvis.sessions.enabled=true``
          (default). Reload window if needed. Observe the Sessions tree.
        - The tree shows exactly two nodes in alphabetical order:
          **copilot-cm** (first) and **dev-feature-x** (second), discovered
          from ``testdata/.jarvis/sessions/``. No folder configuration required.
          No extra nodes appear.
      * - T-3 (open context.md)
        - With T-2 setup active, single-click (or click the Open Context inline
          icon) on the ``dev-feature-x`` node in the Sessions tree.
        - VS Code opens ``testdata/.jarvis/sessions/dev-feature-x/context.md`` in the
          editor. The editor tab title shows ``context.md`` and the breadcrumb
          shows the correct path. No error notification appears.
      * - T-4 (context menu)
        - Right-click the ``copilot-cm`` node in the Sessions tree.
        - The context menu contains exactly the following entries contributed
          for ``contextValue == jarvisSession``: **Open Context** (inline),
          **Open Agent Session** (inline), **Reveal in Explorer**,
          **Reveal in OS**, **Open in Terminal**. No error is shown.
      * - T-5 (newEntity Session)
        - Open the Command Palette (``Ctrl+Shift+P``) and run **Jarvis: New
          Entity**. Observe the QuickPick options. Select **Session**. Enter
          name ``test-session`` and summary ``Test session``.
        - The QuickPick shows exactly three options: **Project**, **Event**,
          **Session**. After completing the prompts, the folder
          ``testdata/.jarvis/sessions/test-session/`` is created with
          ``session.yaml`` (``name: test-session``, ``summary: Test session``)
          and ``context.md``. The node ``test-session`` appears in the
          Sessions tree after rescan (no reload required). A new Copilot chat
          session opens automatically. Clean up: delete the folder after
          verification.
      * - T-5a (+ button)
        - Click the ``+`` icon in the Sessions view title bar. Enter name
          ``btn-session`` and summary ``Button-created session``.
        - Same outcome as T-5: folder and files are created, the node appears
          in the tree, and a chat session opens automatically. Verify that
          ``Jarvis: New Session`` is absent from the Command Palette.
          Clean up: delete the folder after verification.
      * - T-6 (schema validation)
        - Create ``testdata/.jarvis/sessions/bad-session/session.yaml`` with content:
          ``summary: "Missing name field"`` (no ``name`` property). Open the
          file in VS Code. Open the Problems panel (``Ctrl+Shift+M``).
        - At least one schema error or warning appears in the Problems panel
          for ``bad-session/session.yaml`` reporting a missing required
          property ``name``. No crash or unhandled exception occurs. Clean up:
          delete ``testdata/.jarvis/sessions/bad-session/`` after verification.
      * - T-7 (LM tool)
        - With T-2 setup active, open an agent chat (GitHub Copilot Chat). Type
          ``#listSessionEntities`` and confirm the tool call.
        - The tool returns a list with exactly two entries. Entry 1:
          ``name=copilot-cm``, ``summary="Change Manager session"``, folder
          path pointing to ``testdata/.jarvis/sessions/copilot-cm``. Entry 2:
          ``name=dev-feature-x``, ``summary="Working on feature X"``, folder
          path pointing to ``testdata/.jarvis/sessions/dev-feature-x``. The Jarvis
          output channel shows no ``[ERROR]`` entries.
      * - T-8 (MCP tool)
        - Set ``jarvis.mcp.enabled`` to ``true``. Reload window. Note the MCP
          port from the Jarvis output channel. Using Copilot CLI run:
          ``jarvis mcp call jarvis_listSessionEntities`` (or equivalent curl
          command to the MCP port).
        - The MCP call returns the same two-session list as T-7 with identical
          ``name``, ``summary``, and folder fields. The tool is listed in the
          MCP tool manifest returned by the client connection.
      * - T-9 (tool disabled)
        - Set ``jarvis.sessions.enabled`` to ``false``. Run **Developer: Reload
          Window**. Open an agent chat. Type ``#listSessionEntities`` and
          observe the autocomplete dropdown.
        - ``listSessionEntities`` does **not** appear in the autocomplete
          suggestions. The existing ``jarvis_listSessions`` (chat-session tool)
          may still appear. Re-enable (``jarvis.sessions.enabled=true``) and
          reload — ``listSessionEntities`` reappears in autocomplete.
          Note: tool registration changes require a window reload in the current
          implementation.
      * - T-10 (independence)
        - Set ``jarvis.projects.enabled`` to ``false`` and
          ``jarvis.events.enabled`` to ``false``. Ensure
          ``jarvis.sessions.enabled=true``. Run **Developer: Reload Window**.
          Observe the sidebar. In an agent chat invoke
          ``#listSessionEntities``.
        - The Projects and Events views are absent from the Jarvis sidebar.
          The Sessions tree is visible and shows both sample sessions from
          ``.jarvis/sessions/``. The
          tool call returns both sessions without error. The Jarvis output
          channel shows no ``[ERROR]`` entries.
      * - T-11 (agent prompt)
        - After T-5 or T-5a, observe the first message in the auto-opened
          Copilot chat session.
        - The message starts with ``You are the session "<name>"``, contains
          the absolute path of ``context.md`` as an inline code span
          (backtick-quoted), and instructs the agent to read and update it.
          Repeat for a project node to verify ``You are the project "..."``.
