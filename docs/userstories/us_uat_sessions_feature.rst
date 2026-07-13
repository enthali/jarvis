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
   * AC-11: (actor-terminology-rename CR) A test verifies that the tree view's
     user-visible display name is "Actors" (not "Sessions"), the command
     titles are "Jarvis: New Actor" and "Jarvis: Open Actor Chat", and the
     settings-group title/descriptions use "Actor" terminology — while the
     underlying view ID, command IDs, setting key, and storage paths remain
     unchanged (negative test, Phase 2+ scope).
   * AC-12: (actor-internal-identifiers-rename CR) A test verifies that the
     view ID is ``jarvisActors`` (not ``jarvisSessions``), the command IDs are
     ``jarvis.newActor`` (not ``jarvis.newSession``) and
     ``jarvis.openAgentSession`` (unchanged), the command title for
     ``jarvis.openAgentSession`` is now "Jarvis: Open Agent Chat"
     (entity-neutral, not "Open Actor Chat"), and the previous keybindings
     and tree-collapse state are reset to defaults (one-time user-visible
     side effect).

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
     suggestions. Only the existing ``jarvis_listActors`` (chat-session tool) may
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

   **T-14 — View ID is jarvisActors, command IDs updated, keybindings reset**
     Setup: After updating to this CR's version, open VS Code and inspect the
     Jarvis sidebar. Attempt to invoke a keybinding you previously bound to
     ``jarvis.newSession`` (if any). Open Command Palette and search for
     command IDs.
     Action: Look for the view ID in the sidebar or in
     ``vscode context-keys.``  Run **Developer: Inspect Context Keys** and
     search ``view`` scope for ``jarvisActors``. Search Command Palette for
     ``jarvis.newActor``.
     Expected: The Actors tree is present in the sidebar (view ID
     ``jarvisActors``). Any keybindings previously bound to
     ``jarvis.newSession`` do not trigger a command (they were automatically
     cleared by VS Code due to the command ID change); the user must
     re-bind to ``jarvis.newActor`` if desired. The Command Palette lists
     ``jarvis.newActor`` (and ``jarvis.openAgentSession``, unchanged).

   **T-15 — Command title "Open Agent Chat" is entity-neutral**
     Setup: Sessions tree populated; also have a Project and an Event entity
     with their nodes visible in the Jarvis sidebar.
     Action: Right-click a Project node, an Event node, and an Actor/Session
     node in the tree. Compare the context-menu labels.
     Expected: All three entity kinds show the same command label:
     "Jarvis: Open Agent Chat" (not "Open Actor Chat", which would be
     mislabeling for Project/Event). The menu is consistent across all three
     entity kinds.

   **T-16 — Tree-collapse state reset (side effect)**
     Setup: Before this CR: expand and collapse the Sessions tree view to a
     custom state; remember the expansion state.
     Action: After updating to this CR (restart VS Code), observe the Actors
     tree view's expansion state.
     Expected: The tree's expansion state is reset to the default (no
     memorized collapse from the pre-update state); the view's tree-collapse
     memory was cleared when the view ID changed from ``jarvisSessions`` to
     ``jarvisActors``. This is a one-time side effect; future state will be
     preserved normally.

   * AC-13: (actor-dualpath-scanner CR) Test scenarios verify that the scanner
     reads both old-convention (``.jarvis/sessions/*/session.yaml``) and
     new-convention (``.jarvis/actors/*/actor.yaml``) Actor folders, merges
     them into a single tree (no visible distinction), creates new Actors only
     under the new convention, and handles edge cases (same-name-across
     -conventions, mixed workspaces) correctly; Project/Event scanners remain
     unaffected (covered by T-17 through T-24).

   **T-17 — Old-convention only: scanner finds all actors**
     Setup: Delete or move aside any ``.jarvis/actors/`` folder to ensure only
     old-convention exists. Populate ``.jarvis/sessions/`` with two old-convention
     actors (e.g. ``old-alpha/session.yaml`` and ``old-beta/session.yaml``).
     Action: Open the workspace and observe the Actors tree.
     Expected: The tree displays both ``old-alpha`` and ``old-beta`` in
     alphabetical order. No error appears. The behavior is unchanged from the
     pre-Phase-2 state (backward compatibility).

   **T-18 — New-convention only: scanner finds all actors**
     Setup: Delete or archive the old-convention ``.jarvis/sessions/`` folder.
     Populate ``.jarvis/actors/`` with two new-convention actors (e.g.
     ``new-alpha/actor.yaml`` and ``new-beta/actor.yaml``).
     Action: Open the workspace and observe the Actors tree.
     Expected: The tree displays both ``new-alpha`` and ``new-beta`` in
     alphabetical order, discovered from ``.jarvis/actors/``. No error appears.

   **T-19 — Mixed workspace: scanner merges both conventions**
     Setup: Have both ``.jarvis/sessions/`` and ``.jarvis/actors/`` folders
     populated with a mix of old- and new-convention actors (e.g.
     ``.jarvis/sessions/old-actor-1/``, ``.jarvis/actors/new-actor-1/``,
     ``.jarvis/sessions/old-actor-2/``, ``.jarvis/actors/new-actor-2/``).
     Action: Open the workspace and observe the Actors tree.
     Expected: The tree displays all four actors in alphabetical order
     (``new-actor-1``, ``new-actor-2``, ``old-actor-1``, ``old-actor-2``),
     merging the two convention sources. No visible distinction between old
     and new actors. No error appears.

   **T-20 — New Actor creation uses new convention**
     Setup: Mixed workspace as in T-19. Before creating, verify the folder
     structure.
     Action: Run ``Jarvis: New Actor`` (or ``Jarvis: New Entity`` > Session).
     Enter name ``created-actor`` and summary ``Created via Phase 2``.
     Expected: A new folder is created under ``.jarvis/actors/`` only (not
     ``.jarvis/sessions/``). The new folder contains ``actor.yaml`` (not
     ``session.yaml``) with the provided ``name`` and ``summary``. The node
     ``created-actor`` appears in the tree. Old-convention actors remain
     untouched.

   **T-21 — jarvis_createActor tool uses new convention**
     Setup: Mixed workspace as in T-19. Open an agent chat.
     Action: Invoke ``jarvis_createActor`` tool (or via MCP) with
     ``name: "tool-created"``, ``summary: "Created via tool"``. Confirm
     the tool call.
     Expected: A new folder ``.jarvis/actors/tool-created/`` is created
     (not ``.jarvis/sessions/tool-created/``). The folder contains
     ``actor.yaml`` and ``context.md``. The node appears in the tree. No
     old-convention folder is created as a side effect.

   **T-22 — Same-name actor in both conventions: both appear**
     Setup: Create two actors with the same name under different conventions:
     ``.jarvis/sessions/shared-name/session.yaml`` and
     ``.jarvis/actors/shared-name/actor.yaml`` (both with valid ``name: shared-name
     `` fields).
     Action: Open the workspace and observe the Actors tree.
     Expected: Two separate nodes both labeled ``shared-name`` appear in the
     tree (this is an accepted edge case — they are not deduplicated). The
     user can interact with both independently (open context.md from either,
     open agent session from either). No error appears.

   **T-23 — Old-convention actor's context.md remains fully live/writable**
     Setup: Mixed workspace as in T-19. Open the Actors tree and locate an
     old-convention actor (e.g. ``old-actor-1``).
     Action: Click the actor node to open its ``context.md``. Edit the file
     (e.g. add a line "Modified during Phase 2 UAT") and save.
     Expected: The file is writable; the edit is saved successfully. No
     warning or notification about the file being frozen or read-only appears.
     The actor remains fully operational after the edit.

   **T-24 — Project/Event scanners unaffected (regression)**
     Setup: Mixed Actor workspace (both conventions). Also have Projects and
     Events in the workspace.
     Action: Open the Projects and Events tree views. Verify that creating a
     new Project or Event works normally (via ``Jarvis: New Entity`` > Project/
     Event, or the view's ``+`` button).
     Expected: New Projects are created under ``.jarvis/projects/`` only
     (not under any alternative folder). New Events are created under
     ``.jarvis/events/`` only. No cross-convention logic appears in Project/
     Event behavior. These views are unaffected by the Actor phase-2 change.

   **T-12 — Tree view, command titles, and settings show "Actor" terminology**
     Setup: Sessions tree populated as in T-2.
     Action: Observe the view title in the Jarvis sidebar. Open the Command
     Palette and search for "actor". Open Settings (``Ctrl+,``) and search for
     ``jarvis.sessions``.
     Expected: The sidebar view title reads "Actors" (not "Sessions"). The
     Command Palette lists "Jarvis: New Actor" and "Jarvis: Open Actor Chat"
     (not "New Session"/"Open Agent Session"). The Settings UI group is
     titled "Actors"; individual setting descriptions (e.g. for
     ``jarvis.sessions.enabled``) use "Actor" wording (e.g. "Enable the
     Actors feature") instead of "Session".

   **T-13 — Internal identifiers remain unchanged (negative test)**
     Setup: Same as T-12.
     Action: Inspect the underlying identifiers — e.g. hover the Settings gear
     icon next to the renamed setting and choose **Copy Setting ID**; inspect
     ``package.json``'s ``contributes.views``/``contributes.commands`` entries
     (or use **Developer: Inspect Context Keys**) for the view and command
     IDs; confirm the on-disk session folder path is unchanged.
     Expected: The view ID is still ``jarvisSessions``; the command IDs are
     still ``jarvis.newSession`` and ``jarvis.openAgentSession``; the setting
     key is still ``jarvis.sessions.enabled``; the storage path is still
     ``testdata/.jarvis/sessions/`` — none of these internal identifiers
     changed as a side effect of the label rename.
