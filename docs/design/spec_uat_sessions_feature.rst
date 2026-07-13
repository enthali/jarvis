Sessions Feature UAT Design Specifications
==========================================

.. spec:: Sessions Feature Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_ACT_SCENARIOS
   :status: implemented
   :links: REQ_UAT_ACT_TREE; REQ_UAT_ACT_NEWENTITY; REQ_UAT_ACT_TOOL; REQ_UAT_ACT_TOGGLE; REQ_UAT_ACT_AGENTPROMPT; REQ_UAT_ACT_DUALPATH_SCANNER

   **Description:**
   Step-by-step procedures and expected outcomes for all twenty-four sessions-feature
   acceptance test scenarios, covering the Sessions tree view toggle, folder
   configuration, context file opening, context menu, new-entity session creation,
   JSON schema validation, LM tool, MCP tool, tool-deregistration on disable,
   feature independence, actor-terminology-rename UI-label verification,
   actor-internal-identifiers-rename (view ID, command IDs, bug fix, state reset),
   and actor-dualpath-scanner dual-convention support (mixed workspaces, creation
   behavior, edge cases, regression checks).

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
          suggestions. The existing ``jarvis_listActors`` (chat-session tool)
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
      * - T-12 (Actor terminology)
        - With T-2 setup active, observe the Jarvis sidebar view title. Open
          the Command Palette and search "actor". Open Settings
          (``Ctrl+,``) and search ``jarvis.sessions``.
        - Sidebar view title reads "Actors" (not "Sessions"). Command Palette
          lists "Jarvis: New Actor" and "Jarvis: Open Actor Chat" (not "New
          Session"/"Open Agent Session"). Settings UI group titled "Actors";
          setting descriptions (e.g. ``jarvis.sessions.enabled``) use
          "Actor" wording (e.g. "Enable the Actors feature").
      * - T-13 (internal IDs unchanged)
        - With T-12 setup active, hover the Settings gear icon for the
          renamed setting and choose **Copy Setting ID**; inspect
          ``package.json``'s ``contributes.views``/``contributes.commands``
          entries for the view/command IDs; confirm the on-disk session
          folder path.
        - View ID is still ``jarvisSessions``; command IDs are still
          ``jarvis.newSession``/``jarvis.openAgentSession``; setting key is
          still ``jarvis.sessions.enabled``; storage path is still
          ``testdata/.jarvis/sessions/`` — no internal identifier changed as
          a side effect of the label rename.
      * - T-14 (internal ID renames)
        - After updating to this CR, open VS Code. Run **Developer: Inspect
          Context Keys**, search ``view`` scope for ``jarvisActors``. Run
          **Developer: Show All Commands** and search for ``jarvis.newActor``.
          Attempt to invoke any keybindings previously bound to
          ``jarvis.newSession`` (if any).
        - The Actors tree is present in the sidebar (view ID
          ``jarvisActors``). The Command Palette lists ``jarvis.newActor``.
          Previous keybindings to ``jarvis.newSession`` are cleared/inactive;
          the user must re-bind to ``jarvis.newActor`` if desired.
      * - T-15 (bug fix: entity-neutral title)
        - With Project, Event, and Actor/Session nodes all visible in the
          sidebar, right-click each one and compare the context-menu command
          labels.
        - All three entity kinds show the same label:
          "Jarvis: Open Agent Chat" (not "Open Actor Chat", which would
          mislabel Project/Event). The label is consistent across all kinds.
      * - T-16 (tree-collapse state reset)
        - Before this CR update, collapse/expand the Sessions tree to a custom
          state and note it. After restarting VS Code with this CR, observe
          the Actors tree's expansion state.
        - The tree's expansion state is reset to the default; the memorized
          collapse state from the pre-update ``jarvisSessions`` view is not
          carried over. This is a one-time side effect; future state is
          preserved normally under the new ``jarvisActors`` view ID.
      * - T-17 (old-convention only)
        - Delete/archive any ``.jarvis/actors/`` folder. Populate
          ``.jarvis/sessions/`` with ``old-alpha/session.yaml`` and
          ``old-beta/session.yaml``. Open the workspace and observe the
          Actors tree.
        - The tree displays both ``old-alpha`` and ``old-beta`` in alphabetical
          order, discovered from ``.jarvis/sessions/``. No error appears.
          Behavior is unchanged from pre-Phase-2 state (backward compatible).
      * - T-18 (new-convention only)
        - Delete/archive any ``.jarvis/sessions/`` folder. Populate
          ``.jarvis/actors/`` with ``new-alpha/actor.yaml`` and
          ``new-beta/actor.yaml``. Open the workspace and observe the
          Actors tree.
        - The tree displays both ``new-alpha`` and ``new-beta`` in alphabetical
          order, discovered from ``.jarvis/actors/``. No error appears.
      * - T-19 (mixed conventions)
        - Have both ``.jarvis/sessions/`` and ``.jarvis/actors/`` populated
          with a mix of old and new actors (e.g. ``old-actor-1``, ``old-actor-2``
          in sessions; ``new-actor-1``, ``new-actor-2`` in actors). Open the
          workspace and observe the Actors tree.
        - The tree displays all four actors in alphabetical order
          (``new-actor-1``, ``new-actor-2``, ``old-actor-1``, ``old-actor-2``),
          merging both convention sources. No visible distinction between old
          and new. No error appears.
      * - T-20 (create via command uses new convention)
        - From mixed-workspace setup, run ``Jarvis: New Actor``. Enter name
          ``created-actor`` and summary. Before creation, note the folder
          structure. After creation, verify which folder was created.
        - New folder ``testdata/.jarvis/actors/created-actor/`` is created (not
          ``.jarvis/sessions/``). Folder contains ``actor.yaml`` (not
          ``session.yaml``) and ``context.md``. The node appears in the tree.
          Old-convention actors remain untouched.
      * - T-21 (tool uses new convention)
        - Open an agent chat in the mixed-workspace setup. Invoke
          ``jarvis_createActor`` tool with ``name: "tool-created"``,
          ``summary: "Via tool"``. Confirm the tool call. Then verify the
          folder structure.
        - New folder ``.jarvis/actors/tool-created/`` is created (not
          ``.jarvis/sessions/``). Folder contains ``actor.yaml`` and
          ``context.md``. The node appears in the tree. No side effects.
      * - T-22 (same-name edge case: both appear)
        - Create two actors with name ``shared-name``: one under
          ``.jarvis/sessions/shared-name/session.yaml`` and one under
          ``.jarvis/actors/shared-name/actor.yaml`` (both with ``name: shared-name``).
          Open the workspace and observe the tree.
        - Two separate nodes both labeled ``shared-name`` appear in the tree
          (not deduplicated or merged). The user can interact with both
          independently (open context.md, open agent session from each). No
          error appears.
      * - T-23 (old-convention context.md writable)
        - With mixed workspace setup, open an old-convention actor (e.g.
          ``old-actor-1`` from ``.jarvis/sessions/``) and click to open its
          ``context.md``. Edit the file (add a line) and save it.
        - The file is writable; the edit is saved successfully. No
          read-only warning, frozen message, or deprecation notice appears.
          The actor remains fully operational after the edit.
      * - T-24 (Project/Event regression check)
        - With mixed Actor workspace, create a new Project (via ``Jarvis: New
          Entity`` > Project or Projects view ``+`` button). Then create a new
          Event similarly. Verify the folder structure.
        - New Project is created under ``.jarvis/projects/`` only (not under
          any alternative convention folder). New Event is created under
          ``.jarvis/events/`` only. No cross-convention logic or dual-path
          support appears for Project/Event. These views are unaffected.
