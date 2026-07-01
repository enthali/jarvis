Chat Editor Reuse — Session Open UAT Design Specifications
============================================================

.. spec:: Chat Editor Reuse on Session Open — Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_CHATEDITORREUSE
   :status: implemented
   :links: REQ_UAT_CHATEDITORREUSE

   **Description:**
   Step-by-step procedures and expected outcomes for all five
   ``chat-editor-reuse-on-session-open`` acceptance test scenarios, covering
   the existing-UUID regression guard, fresh-editor creation via
   ``jarvis_createSession``, the UI "New Session" command, successive
   new-session opens, and the auto-delivery new-editor path.

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
