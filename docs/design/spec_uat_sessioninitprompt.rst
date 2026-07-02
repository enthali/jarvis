Session Init Prompt on Auto-Open UAT Design Specifications
===========================================================

.. spec:: Session Init Prompt on Auto-Open — Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_SESSIONINITPROMPT
   :status: draft
   :links: REQ_UAT_SESSIONINITPROMPT; SPEC_MSG_AGENTSESSION; SPEC_ENT_AGENTSESSION; SPEC_ENT_AGENTSESSION_INITPROMPT; SPEC_MSG_AUTODELIVER_POLL; SPEC_MSG_SENDCOMMAND

   **Description:**
   Step-by-step procedures and expected outcomes for eleven acceptance test
   scenarios covering agent-mode assignment and init-prompt submission in both
   the tree-click and auto-delivery session-open paths, plus six edge cases
   identified by the PM's explicit edge-case discovery request (including
   CR AC-5: default-include opt-out policy for agent discovery), plus five
   agent identity scenarios (T-F1-1..T-F1-5) covering frontmatter ``name:``
   display, picker presentation, session.yaml persistence and backward
   compatibility, and four session folder naming scenarios (T-S1..T-S4)
   covering verbatim folder creation, space-in-name handling,
   invalid-character rejection, and existing-folder backward compatibility.

   **Test Setup:**

   * Extension Development Host (EDH) running the Jarvis extension from the
     ``feature/session-init-prompt-on-autoopen`` branch.  Launch via **F5**
     in VS Code.
   * Open workspace: ``testdata/test.code-workspace`` (File → Open Workspace
     from File…).  This sets ``testdata/`` as the workspace root.
   * ``jarvis.sessions.enabled`` must be ``true`` (default).
   * Session test-data files (see ``REQ_UAT_SESSIONINITPROMPT`` for
     file contents):

     * ``testdata/.jarvis/sessions/copilot-cm/session.yaml`` with
       ``agent: syspilot.cm``
     * ``testdata/.jarvis/sessions/copilot-cm/context.md``
     * ``testdata/.jarvis/sessions/dev-feature-x/session.yaml`` without
       ``agent`` field
     * ``testdata/.jarvis/sessions/dev-feature-x/context.md``

   * Expand the **Sessions** section in the Jarvis sidebar so both leaf
     nodes are visible.
   * Open the **Jarvis** Output Channel (View → Output → Jarvis) so that
     ``[MSG]`` and ``[ERROR]`` log entries can be inspected during each test.
   * **Before each scenario that requires a new session**, delete all named
     VS Code Chat sessions in the EDH so that no ``copilot-cm`` or
     ``dev-feature-x`` chat exists yet (ensures the new-session path is
     taken rather than the existing-session path).
   * **Restore** deleted or temporarily created test-data files between
     scenarios as noted in the teardown column.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 10 40 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          New session via tree-click — agent field present

          *CR AC-1*
        - Precondition: ``copilot-cm/session.yaml`` has ``agent: syspilot.cm``.
          No VS Code Chat session named ``copilot-cm`` exists.

          Click the ``copilot-cm`` label in the Sessions Tree (not the
          inline icon — click the name text).

          Observe the VS Code editor area, the Chat mode selector, and the
          Jarvis Output Channel.
        - **New chat opens:** A VS Code Chat editor panel opens and its
          title is renamed to ``copilot-cm``.

          **Agent mode:** The Chat mode selector shows ``syspilot.cm`` (the
          value from ``agent``).  The mode is applied at session creation
          time, before ``openNewChatEditor()`` is called.

          **Init-prompt:** An init-prompt message appears in the chat
          immediately after the rename.  The text matches the rendered
          ``jarvis.agentSession.initPromptTemplate`` (or the default
          template if the setting is empty), with ``{kind}``, ``{name}``,
          and ``{contextPath}`` placeholders substituted.

          **No context.md editor:** No editor tab for ``context.md`` opens.

          **Output channel:** No ``[ERROR]`` entries.

      * - T-2

          New session via tree-click — no agent field

          *CR AC-1 (no-agent variant)*
        - Precondition: ``dev-feature-x/session.yaml`` has **no** ``agent``
          field.  No VS Code Chat session named ``dev-feature-x`` exists.

          Click the ``dev-feature-x`` label in the Sessions Tree.

          Observe the Chat mode selector and the chat transcript.
        - **New chat opens:** A VS Code Chat editor panel opens and its
          title is renamed to ``dev-feature-x``.

          **Agent mode:** The chat opens in the user's currently active VS
          Code Chat mode (no mode-prime step is executed).  The Chat mode
          selector reflects whatever mode was selected before the click.

          **Init-prompt:** An init-prompt message appears in the chat
          (entity match found via ``scanner.entities``; init-prompt does
          not require an ``agent`` field).

          **Output channel:** No ``[ERROR]`` entries.

      * - T-3

          Existing session via tree-click — no re-apply

          *CR AC-2*
        - Precondition: A VS Code Chat session named ``copilot-cm`` already
          exists (e.g. from T-1 or manually renamed).  A different editor
          tab is focused so the chat is in the background.

          Click the ``copilot-cm`` label in the Sessions Tree.

          Observe whether a new chat is created, whether a rename fires,
          and whether any new message appears in the chat transcript.
        - **Existing chat focused:** The ``copilot-cm`` chat tab gains focus.
          No new chat editor is created.

          **No rename:** The ``/rename`` sequence does not fire.  The chat
          title remains ``copilot-cm`` without a transient generic title.

          **No init-prompt:** No init-prompt text is added to the chat
          transcript.

          **No mode change:** The Chat mode selector retains the mode the
          session had before the click.

          **Output channel:** No ``[ERROR]`` entries.

      * - T-4

          Auto-delivery to deleted session — agent mode + init-prompt

          *CR AC-3*
        - Precondition: ``copilot-cm/session.yaml`` has ``agent: syspilot.cm``.
          All named VS Code Chat sessions are deleted.  Queue a message for
          ``"copilot-cm"`` using the ``jarvis_sendToSession`` MCP/LM tool
          (or by adding a row to ``testdata/.jarvis/messages.json``).

          Wait up to 10 s for the auto-delivery poll cycle (default
          interval: 5 s).

          Observe the VS Code editor area, the chat transcript, and the
          Jarvis Output Channel.
        - **New chat opens:** A VS Code Chat editor panel opens and its
          title is renamed to ``copilot-cm``.

          **Agent mode:** The Chat mode selector shows ``syspilot.cm``.

          **Init-prompt first:** The init-prompt message appears in the
          chat transcript before the queued message.

          **Queued message delivered:** The queued message text appears in
          the chat after the init-prompt.

          **Output channel:** A ``[MSG]`` info entry confirms delivery; no
          ``[ERROR]`` entries.

      * - T-5

          Cross-path equivalence — tree-click vs auto-delivery

          *CR AC-4*
        - Precondition: T-1 and T-4 have been executed independently and
          notes recorded (agent mode shown, init-prompt text observed).

          Compare the agent mode label and init-prompt message text
          produced by T-1 and T-4 for the ``copilot-cm`` entity.
        - **Identical agent mode:** Both sessions show ``syspilot.cm`` in
          the Chat mode selector.

          **Identical init-prompt:** The init-prompt text is the same in
          both chat transcripts (same template rendering for the same
          entity).

          **Functionally equivalent:** No user-visible difference exists
          between the chat sessions created via tree-click and auto-delivery
          for the same entity.

      * - T-E1

          Edge: no ``agent`` field — init-prompt still sent

          *Edge case 1; see AC-2 in US_UAT_SESSIONINITPROMPT*
        - Precondition: ``dev-feature-x/session.yaml`` has no ``agent``
          field.  No chat named ``dev-feature-x`` exists.

          Click the ``dev-feature-x`` label in the Sessions Tree.

          Specifically observe whether an init-prompt appears despite the
          absence of an ``agent`` field.
        - **Init-prompt present:** The init-prompt message appears in the
          new chat.  The absence of ``agent`` only suppresses the mode-prime
          step; it does NOT suppress the init-prompt.

          **No spurious error:** The Jarvis Output Channel contains no
          ``[ERROR]`` entries related to a missing agent.

          *Note: This scenario intentionally duplicates the no-agent path
          of T-2, but with the explicit verification focus on init-prompt
          presence rather than mode behaviour.*

      * - T-E2

          Edge: entity lookup miss — graceful skip

          *Edge case 2; see AC-6 in US_UAT_SESSIONINITPROMPT*
        - Precondition: No session, project, or event YAML exists with the
          name ``"unknown-entity"``.  Queue a message for
          ``"unknown-entity"`` via ``jarvis_sendToSession``.  All named chat
          sessions are deleted.

          Wait up to 10 s for the auto-delivery poll.

          Observe whether init-prompt or mode-prime occurs.
        - **New chat created and renamed:** A new VS Code Chat session opens
          and is renamed to ``"unknown-entity"`` (rename + notification stub
          path).

          **No mode-prime:** The Chat mode selector reflects the user's
          current mode; no mode-prime ``workbench.action.chat.open { mode }``
          call is made.

          **No init-prompt:** No init-prompt text appears in the new chat
          transcript.  The queued message is delivered as the first entry.

          **Output channel:** A ``[MSG]`` info or warn entry confirms
          delivery; no ``[ERROR]`` entries.

      * - T-E3

          Edge: typo in ``agent`` field — no crash; spec gap noted

          *Edge case 3; see AC-7 in US_UAT_SESSIONINITPROMPT*
        - Precondition: Create
          ``testdata/.jarvis/sessions/bad-agent/session.yaml`` with::

            name: bad-agent
            summary: "Edge-case entity with invalid agent name"
            agent: totally.unknown.mode

          and a matching ``context.md``.  No chat named ``bad-agent`` exists.

          Reload (or rescan) so the new entity appears in the Sessions Tree.
          Click the ``bad-agent`` label.

          Observe the chat mode, transcript, and Output Channel.

          Teardown: delete ``testdata/.jarvis/sessions/bad-agent/``.
        - **No crash:** The extension does not throw an unhandled exception.
          No VS Code error notification appears.

          **New chat renamed:** A new chat opens and is renamed to
          ``bad-agent``.

          **Observed mode (record, do not assert):** VS Code may silently
          ignore the unknown mode name and open in the current user mode.
          The tester SHALL record the observed mode label in the test report.

          **Init-prompt present:** The init-prompt message appears in the
          chat (entity match found; init-prompt does not validate agent).

          **Output channel:** No ``[ERROR]`` entries.

          **Spec gap:** The design spec (``SPEC_MSG_AGENTSESSION``) does not
          define the expected behaviour when ``entity.agent`` names an
          invalid VS Code Chat mode.  Flag to CM for a follow-up requirement
          in a subsequent CR.

      * - T-E4

          Edge: multiple messages queued — init-prompt sent once

          *Edge case 5; see AC-8 in US_UAT_SESSIONINITPROMPT*
        - Precondition: ``copilot-cm/session.yaml`` has ``agent: syspilot.cm``.
          All named chat sessions are deleted.  Using ``jarvis_sendToSession``
          (or direct ``messages.json`` edit), queue three distinct messages
          addressed to ``"copilot-cm"``:

          1. ``"First message"``
          2. ``"Second message"``
          3. ``"Third message"``

          Confirm all three are present in ``messages.json`` before
          proceeding.

          Wait for the auto-delivery poll to process all messages (allow up
          to 30 s for multiple cycles).
        - **Init-prompt once:** The init-prompt appears exactly **once** at
          the top of the ``copilot-cm`` chat transcript.

          **All three messages delivered:** ``"First message"``,
          ``"Second message"``, and ``"Third message"`` appear in the chat
          in order, after the init-prompt.

          **Existing-session path for messages 2 and 3:** After the first
          poll cycle creates the session, subsequent cycles find the UUID via
          ``lookupSessionUUID`` and take the existing-session path (no
          mode-prime, no init-prompt, no rename for messages 2 and 3).

          **Output channel:** Three ``[MSG]`` delivery entries; no
          ``[ERROR]`` entries.

      * - T-E5

          Edge: tree-click to session in background tab

          *Edge case 6; see AC-9 in US_UAT_SESSIONINITPROMPT*
        - Precondition: A VS Code Chat session named ``copilot-cm`` exists
          and has been used (contains prior messages).  A different editor
          tab (e.g. a source file) is active so the chat is in the
          background.

          Click the ``copilot-cm`` label in the Sessions Tree.

          Observe whether the existing chat is brought forward and whether
          its content changes.
        - **Background tab becomes active:** The ``copilot-cm`` chat gains
          focus; the previously active editor tab moves to the background.

          **Content preserved:** The existing chat transcript is intact.
          No new init-prompt message is appended.

          **No rename fires:** The session title remains ``copilot-cm``.

          **No new session:** No second ``copilot-cm`` chat tab is created.

          **Output channel:** No ``[ERROR]`` entries.

      * - T-E6

          Edge: agent file without ``user-invocable`` key — appears in picker

          *CR AC-5; see SPEC_ACT_AGENT_DISCOVERY (revised),
          REQ_ACT_AGENT_DISCOVERY AC-2 (revised)*
        - Precondition: The workspace's ``.github/agents/`` folder contains
          two test agent files:

          1. ``no-uikey-agent.agent.md`` — frontmatter has ``name:`` and
             ``description:`` but NO ``user-invocable`` line at all.
          2. ``optout-agent.agent.md`` — frontmatter explicitly sets
             ``user-invocable: false``.

          Reload the Extension Host so frontmatter is freshly scanned.
          No VS Code Chat session named ``new-session-test`` exists.

          Invoke ``jarvis.newSession`` (the "+" button at the top of the
          Sessions Tree).  Enter a session name and summary when prompted.
          When the QuickPick "Select the agent for this session" appears,
          inspect the listed items without making a selection.
        - **no-uikey-agent visible:** ``no-uikey-agent`` appears in the
          picker.  A file that lacks the ``user-invocable`` key entirely
          MUST be included by default (default-include opt-out policy).

          **optout-agent absent:** ``optout-agent`` does NOT appear in the
          picker.  Explicit ``user-invocable: false`` is the only signal
          that excludes a file.

          **Alphabetical order:** Picker items are sorted alphabetically
          ("No agent" first, then agents in A–Z order).

          **No regression:** All agents that were visible in T-E1 / T-E2
          scenarios remain visible; no previously-included agent disappears.

          **Output channel:** No ``[ERROR]`` entries.

      * - T-F1-1

          Agent with ``name: Change Manager`` in frontmatter appears in
          picker as "Change Manager"

          *REQ_ACT_AGENT_DISCOVERY AC-7;
          REQ_ACT_AGENT_PICKER AC-1*
        - Precondition: ``testdata/.github/agents/change-agent.agent.md``
          exists with frontmatter ``name: Change Manager``.
          EDH open on ``testdata/test.code-workspace``.

          Invoke ``jarvis.newSession`` (the ``+`` button at the top of the
          Sessions Tree).  Enter any session name and summary.  When the
          QuickPick "Select the agent for this session" appears, inspect
          the listed items.
        - **Display name from frontmatter:** The entry for
          ``change-agent.agent.md`` appears in the picker as
          ``Change Manager`` (the frontmatter ``name:`` value), not as
          ``change-agent`` (the filename stem).

          **Output channel:** No ``[ERROR]`` entries.

      * - T-F1-2

          Agent without ``name:`` key appears as filename stem

          *REQ_ACT_AGENT_DISCOVERY AC-3/AC-7*
        - Precondition: Create
          ``testdata/.github/agents/noname-agent.agent.md`` with
          frontmatter that contains ``description:`` but NO ``name:`` key::

            ---
            description: "Agent with no name key"
            user-invocable: true
            ---

          Reload the Extension Host so the new file is scanned.
          Invoke ``jarvis.newSession`` and inspect the picker.

          Teardown: delete ``testdata/.github/agents/noname-agent.agent.md``
          after the test.
        - **Filename stem used as display label:** The entry for
          ``noname-agent.agent.md`` appears in the picker as
          ``noname-agent`` (filename stem, without the ``.agent.md``
          suffix), because no frontmatter ``name:`` was found.

          **Output channel:** No ``[ERROR]`` entries.

      * - T-F1-3

          Session created with identity "Change Manager" stores
          ``agent: Change Manager`` in session.yaml

          *REQ_ACT_AGENT_PICKER AC-4*
        - Precondition: EDH open on ``testdata/test.code-workspace``.
          No folder ``testdata/.jarvis/sessions/cm-identity-test/`` exists.

          Invoke ``jarvis.newSession``.  Enter name
          ``cm-identity-test`` and a summary.  When the agent picker
          appears, select ``Change Manager``.

          After the session is created, open
          ``testdata/.jarvis/sessions/cm-identity-test/session.yaml``
          in a text editor.

          Teardown: delete
          ``testdata/.jarvis/sessions/cm-identity-test/`` after the test.
        - **agent field stores display name:** The ``session.yaml`` file
          contains ``agent: Change Manager`` (the frontmatter
          ``name:`` value), not the filename stem.

          **Output channel:** No ``[ERROR]`` entries.

      * - T-F1-4

          Opening session with ``agent: Change Manager`` invokes
          ``chat.open { mode: "Change Manager" }``

          *REQ_ACT_AGENT_OPEN AC-1; backward-compat*
        - Precondition: ``cm-identity-test/session.yaml`` (created in
          T-F1-3) contains ``agent: Change Manager``.
          No VS Code Chat session named ``cm-identity-test`` exists.

          Click the ``cm-identity-test`` label in the Sessions Tree.

          Observe the Chat mode selector.
        - **Mode selector shows display name:** The Chat mode selector
          shows ``Change Manager`` — the stored agent identity string is
          passed verbatim as the ``mode`` parameter to
          ``workbench.action.chat.open``.

          **New chat opened and renamed:** A VS Code Chat panel opens
          and is titled ``cm-identity-test``.

          **Init-prompt sent:** Init-prompt message appears in the chat
          transcript.

          **Output channel:** No ``[ERROR]`` entries.

      * - T-F1-5

          Existing session.yaml ``agent: syspilot.cm`` (filename stem,
          no frontmatter name) still resolves — backward compat

          *REQ_ACT_AGENT_DISCOVERY AC-7; backward-compat*
        - Precondition: If not already present, create
          ``testdata/.github/agents/syspilot.cm.agent.md`` with
          frontmatter that contains NO ``name:`` key::

            ---
            description: "syspilot.cm (no name key)"
            user-invocable: true
            ---

          Ensure ``testdata/.jarvis/sessions/copilot-cm/session.yaml``
          contains ``agent: syspilot.cm``.
          No VS Code Chat session named ``copilot-cm`` exists.

          Reload the Extension Host so the new agent file is scanned.
          Click the ``copilot-cm`` label in the Sessions Tree.

          Teardown: delete ``syspilot.cm.agent.md`` after the test.
        - **Mode applied via stem:** The Chat mode selector shows
          ``syspilot.cm`` — the stored filename stem is used directly
          as the mode identifier without requiring a frontmatter
          ``name:`` entry.

          **Session opens normally:** New chat created, renamed to
          ``copilot-cm``, and init-prompt sent.

          **Output channel:** No ``[ERROR]`` entries.

      * - T-S1

          Create session "Change" — folder named ``Change`` created
          verbatim, no transformation

          *REQ_ACT_NEWENTITY AC-2*
        - Precondition: No folder
          ``testdata/.jarvis/sessions/Change/`` exists.

          Invoke ``jarvis.newSession``.  Enter name ``Change`` and
          a summary.  Complete the wizard (select any agent or "No
          agent").

          Inspect the filesystem after the wizard closes.

          Teardown: delete
          ``testdata/.jarvis/sessions/Change/`` after the test.
        - **Folder created verbatim:** The folder
          ``testdata/.jarvis/sessions/Change/`` is created.  The name
          is preserved exactly — no lowercase conversion, no slug
          transformation.

          **session.yaml name matches:** The ``name`` field in the
          created ``session.yaml`` equals ``Change``.

          **Sessions Tree:** The new session appears in the Sessions
          Tree labelled ``Change``.

          **Output channel:** No ``[ERROR]`` entries.

      * - T-S2

          Create session "Change Manager" (with space) — folder
          ``Change Manager`` created verbatim

          *REQ_ACT_NEWENTITY AC-2*
        - Precondition: No folder
          ``testdata/.jarvis/sessions/Change Manager/`` exists.

          Invoke ``jarvis.newSession``.  Enter name ``Change Manager``
          (with a space) and a summary.  Complete the wizard.

          Inspect the filesystem after the wizard closes.

          Teardown: delete
          ``testdata/.jarvis/sessions/Change Manager/`` after the
          test.
        - **Folder with embedded space:** The folder
          ``testdata/.jarvis/sessions/Change Manager/`` is created with
          a literal space in the directory name.  No slug or
          kebab-case transformation is applied.

          **session.yaml name matches:** The ``name`` field equals
          ``Change Manager``.

          **Sessions Tree:** The new session appears labelled
          ``Change Manager``.

          **Output channel:** No ``[ERROR]`` entries.

      * - T-S3

          Create session "a/b" — error shown, no folder created

          *REQ_ACT_NEWENTITY AC-9*
        - Precondition: No folder ``testdata/.jarvis/sessions/a/``
          exists.

          Invoke ``jarvis.newSession``.  When prompted for a session
          name, enter ``a/b`` (a forward-slash embedded in the name).

          Observe the VS Code notification area and the filesystem.
        - **Inline validation fires immediately:** The InputBox shows
          an inline red error message as soon as ``a/b`` is typed (no
          separate VS Code notification).  The OK button is disabled
          until the name is corrected.

          **Cancel without correcting:** Pressing Escape cancels
          creation; no separate error notification is shown and no
          ``[ERROR]`` log entry fires (``validateInput`` is
          informational, not an error event).

          **No folder created:** No ``testdata/.jarvis/sessions/a/``
          or ``testdata/.jarvis/sessions/a/b/`` directory is created.

          **No Sessions Tree entry:** The new session does NOT appear
          in the Sessions Tree.

          **Output channel:** No ``[ERROR]`` entries.

      * - T-S4

          Pre-staged folder ``change-manager/`` with
          ``name: Change Manager`` in session.yaml — identity resolves
          from name field, folder name irrelevant

          *REQ_ACT_NEWENTITY AC-2 (storage-only note)*
        - Precondition: Manually create the following files before
          starting the EDH:

          ``testdata/.jarvis/sessions/change-manager/session.yaml``::

            name: Change Manager
            summary: "Pre-staged backward-compat session"

          ``testdata/.jarvis/sessions/change-manager/context.md``::

            # Change Manager context
            Pre-staged context for backward-compat test.

          The folder name (``change-manager``) intentionally differs
          from the ``name`` field (``Change Manager``).

          Reload (or rescan) so the entry appears in the Sessions Tree.

          Teardown: delete
          ``testdata/.jarvis/sessions/change-manager/`` after the
          test.
        - **Sessions Tree shows name field:** The Sessions Tree labels
          this entry ``Change Manager`` (from ``session.yaml name:``),
          not ``change-manager`` (the folder name).

          **Session opens normally:** Clicking ``Change Manager`` in
          the tree opens a new VS Code Chat session, renames it to
          ``Change Manager``, and sends the init-prompt.

          **Folder on disk unchanged:** The backing folder remains
          ``change-manager/`` — no rename of the directory occurs.

          **Output channel:** No ``[ERROR]`` entries.
