Chat Editor Reuse — Session Open UAT Design Specifications
============================================================

.. spec:: Chat Editor Reuse on Session Open — Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_CHATEDITORREUSE
   :status: implemented
   :links: REQ_UAT_CHATEDITORREUSE

   **Description:**
   Step-by-step procedures and expected outcomes for all nine
   ``chat-editor-reuse-on-session-open`` and ``editor-group-placement``
   acceptance test scenarios, covering the existing-UUID regression guard,
   fresh-editor creation via ``jarvis_createSession``, the UI "New Session"
   command, successive new-session opens, the auto-delivery new-editor path,
   the Main-target close+reopen rule, the Docs-target fixed column, the
   already-open-anywhere rule, and the Play-button's Main placement.

   **Test Setup:**

   * Extension Development Host (EDH) running the Jarvis extension from the
     ``feature/chat-editor-reuse-on-session-open`` branch.  Launch via F5 in
     VS Code.
   * Open workspace: ``testdata/test.code-workspace`` (File → Open Workspace
     from File…).  This sets ``testdata/`` as the workspace root.
   * Pre-existing session test data is present:

     * ``testdata/.jarvis/sessions/copilot-cm/session.yaml`` and
       ``context.md``
     * ``testdata/.jarvis/sessions/dev-feature-x/session.yaml`` and
       ``context.md``

   * An agent chat session (any name) is open in the EDH for issuing tool
     calls.
   * For T-6/T-7/T-8/T-9, at least 2 editor columns are open (e.g. "Split
     Editor" on any 2 unrelated files) before the scenario starts.
   * For T-9, a message must be queued for a session in the manual root of
     the Messages tree (Play button visible) — see ``REQ_MSG_QUEUE``.
   * Note the number of open chat editor tabs before each scenario (baseline
     tab count).
   * Between scenarios: close any session-specific chat editors opened
     during the scenario; delete any new session folders created under
     ``testdata/.jarvis/sessions/``; re-count open tabs to confirm clean
     state.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 7 43 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          Existing-UUID regression guard

          *CR AC: 1*

          *Spec under test:* ``SPEC_ENT_AGENTSESSION``
        - Precondition: ``copilot-cm`` session node is visible in the
          Sessions tree.  Note the current tab count (baseline).

          In the Sessions tree, click the ``copilot-cm`` entry.

          Observe the editor area and the tab bar.
        - **Editor:** The ``copilot-cm`` session's chat editor is activated
          (focused/revealed).  If it was not previously open it is opened via
          the UUID-based ``vscode-chat-session://local/<uuid>`` URI.

          **Tab count:** does not increase beyond baseline (no new tab
          created for an already-open session; or exactly +1 if this is the
          first open — but no reuse of another existing chat editor occurs).

          **No regression:** the UUID-based path works identically to
          pre-change behaviour.

          *Clean up: close the* ``copilot-cm`` *editor tab.*

      * - T-2

          ``jarvis_createSession`` happy path

          *CR AC: 2*

          *Spec under test:* ``SPEC_ENT_AGENTSESSION``
        - Precondition: ``testdata/.jarvis/sessions/uat-new-session/`` does
          not exist.  Note the baseline tab count and the currently focused
          chat editor.

          In the VS Code Chat input bar, prompt the model:

          *"Call jarvis_createSession with name 'uat-new-session',
          initialMessage 'Hello from T-2'."*

          Wait for the tool to return (~2 s).  Observe the editor area.
        - **New editor:** A new chat editor tab labelled with the session
          name (or a generic new-chat title) opens — this is a **different**
          tab from the invoking chat editor.

          **Tab count:** baseline + 1 (one new tab appeared).

          **Init-prompt:** The init-prompt text (configured via
          ``jarvis.agentSession.initPromptTemplate``) is visible in the new
          editor's conversation thread.

          **initialMessage delivery:** Within ~7 s, the text
          ``"Hello from T-2"`` appears in the new editor's conversation
          (auto-delivered by the poll loop), **not** in the invoking chat.

          **Sessions tree:** node ``uat-new-session`` appears within 2 s; no
          manual Rescan required.

          *Clean up: close the new editor tab; delete*
          ``testdata/.jarvis/sessions/uat-new-session/``.

      * - T-3

          UI "New Session" command

          *CR AC: 3*

          *Spec under test:* ``SPEC_ENT_AGENTSESSION``
        - Precondition: No ``uat-ui-session`` folder exists.  Note the
          baseline tab count.

          In the Sessions tree-view title bar, click the **+** (New Session)
          icon.  When prompted, enter session name ``uat-ui-session`` and
          confirm.

          Observe the editor area.
        - **New editor:** A new chat editor tab opens — distinct from any
          previously open chat editors.

          **Tab count:** baseline + 1.

          **No reuse:** the previously focused chat editor remains unchanged;
          it is not navigated or replaced.

          **Sessions tree:** node ``uat-ui-session`` appears within 2 s.

          *Clean up: close the new editor tab; delete*
          ``testdata/.jarvis/sessions/uat-ui-session/``.

      * - T-4

          Successive new sessions — no reuse

          *CR AC: 4*

          *Spec under test:* ``SPEC_ENT_AGENTSESSION``
        - Precondition: No ``uat-sess-a`` or ``uat-sess-b`` folders exist.
          Note the baseline tab count.

          **Step 1:** In the VS Code Chat input bar, prompt the model:
          *"Call jarvis_createSession with name 'uat-sess-a'."*
          Wait for the tool to return.

          **Step 2:** Immediately after, prompt:
          *"Call jarvis_createSession with name 'uat-sess-b'."*
          Wait for the tool to return.

          Observe the editor area and tab bar.
        - **Two separate tabs:** Two new chat editor tabs are open
          simultaneously — one for ``uat-sess-a`` and one for ``uat-sess-b``
          (or two generically titled new-chat tabs).

          **Tab count:** baseline + 2.

          **No reuse:** the second ``jarvis_createSession`` call did not
          navigate within the tab opened by the first call; both tabs are
          distinct and independently focusable.

          **Sessions tree:** both ``uat-sess-a`` and ``uat-sess-b`` nodes
          appear within 2 s each.

          *Clean up: close both new editor tabs; delete*
          ``testdata/.jarvis/sessions/uat-sess-a/`` *and*
          ``testdata/.jarvis/sessions/uat-sess-b/``.

      * - T-5

          Auto-delivery — new editor opened

          *CR AC: auto-delivery (SPEC_MSG_AUTODELIVER_POLL)*

          *Spec under test:* ``SPEC_MSG_AUTODELIVER_POLL``
        - Precondition: Session ``dev-feature-x`` exists in test data.
          Auto-delivery is enabled for it (add ``"dev-feature-x"`` to
          ``testdata/.jarvis/autodelivery.json``, or use the
          "Enable Auto-Delivery" context-menu action in the Messages tree).
          Ensure the ``dev-feature-x`` chat editor is **closed** (not open
          in any tab).  Note the baseline tab count.

          In the VS Code Chat input bar, prompt the model:
          *"Call jarvis_sendToSession with destination 'dev-feature-x',
          text 'Auto-delivery T-5 test message'."*

          Wait up to 10 s.  Observe the editor area.
        - **New editor opened:** A new chat editor tab for
          ``dev-feature-x`` appears — opened by the auto-delivery poll loop.

          **Tab count:** baseline + 1.

          **Message delivered:** Within ~7 s of the editor opening, the text
          ``"Auto-delivery T-5 test message"`` is visible in that editor's
          conversation thread.

          **No reuse:** no other previously open chat editor was navigated to
          or replaced; the new tab is independent.

          *Clean up: close the new editor tab; remove*
          ``"dev-feature-x"`` *from auto-delivery config; delete any test
          messages from the queue.*

      * - T-6

          Main-target close+reopen rule

          *CR AC: 6*

          *Spec under test:* ``SPEC_MSG_EDITORPLACEMENT``
        - Precondition: at least 2 editor columns open. Click the
          ``copilot-cm`` Actor node to open its chat (opens in column 1 per
          AC-1). Manually drag the ``copilot-cm`` chat tab to column 2.

          Click the ``copilot-cm`` Actor node again in the entity tree.

          Observe which column the chat tab ends up in.
        - **Close+reopen:** The ``copilot-cm`` chat tab that was in column 2
          is closed, and a fresh tab for the same session opens in column 1,
          focused.

          **No duplicate:** Only one ``copilot-cm`` chat tab exists
          afterward — in column 1, not column 2.

          *Clean up: close the* ``copilot-cm`` *editor tab.*

      * - T-7

          Docs-target fixed column

          *CR AC: 7*

          *Spec under test:* ``SPEC_MSG_EDITORPLACEMENT``, ``SPEC_ENT_ENTITY_FILE_CHILDREN``
        - Precondition: at least 2 editor columns open, with column 2 not
          currently showing ``context.md``. Expand the ``alpha`` Project
          node in the entity tree; click its ``context.md``, ``project.yaml``,
          and agent-file children in turn.
        - **Fixed column:** Each of the three file children opens in view
          column 2 (Docs), regardless of which column previously had focus
          or how many columns existed.

          **No Main interference:** No chat editor is opened or moved in
          column 1 as a side effect.

      * - T-8

          Already-open-anywhere rule (Docs target)

          *CR AC: 8*

          *Spec under test:* ``SPEC_MSG_EDITORPLACEMENT``
        - Precondition: at least 3 editor columns open. Click ``alpha``'s
          ``context.md`` child (opens in column 2 per T-7). Manually drag
          that tab to column 3.

          Click the ``alpha`` ``context.md`` child again in the entity tree.

          Observe which column the tab is focused in.
        - **Focus in place:** The existing ``context.md`` tab in column 3 is
          focused. It is NOT closed, reopened, or moved back to column 2.

          **No duplicate:** Only one ``context.md`` tab for ``alpha`` exists
          throughout, regardless of column.

          *Clean up: close the* ``context.md`` *editor tab.*

      * - T-9

          Play-button targets Main

          *CR AC: 9*

          *Spec under test:* ``SPEC_MSG_SENDCOMMAND``, ``SPEC_MSG_EDITORPLACEMENT``
        - Precondition: at least 2 editor columns open. Queue a message for
          ``dev-feature-x`` (manual root, not Auto Delivery group). Open its
          chat tab and manually drag it to column 2.

          Click the Play (``$(debug-start)``) button on the
          ``dev-feature-x`` node in the Messages tree.

          Observe which column the chat tab ends up in.

          Then queue a second message for ``dev-feature-x`` (now at Main)
          and click Play again.
        - **First Play (close+reopen):** The ``dev-feature-x`` chat tab that
          was in column 2 is closed, and a fresh tab for the same session
          opens in column 1, focused — identical to the T-6 Actor-click
          behavior.

          **Second Play (focus-in-place):** With the tab already at column
          1 (Main), clicking Play again simply focuses the existing tab in
          place — no close+reopen, no second tab created.

          **No duplicate:** Only one ``dev-feature-x`` chat tab exists
          throughout, in column 1.

          *Clean up: close the* ``dev-feature-x`` *editor tab.*
