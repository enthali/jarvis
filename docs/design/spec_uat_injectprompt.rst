Prompt Injection UAT Design Specifications
==========================================

.. spec:: Prompt Injection — Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_INJECTPROMPT
   :status: draft
   :links: REQ_UAT_INJECTPROMPT; US_UAT_INJECTPROMPT; SPEC_INJ_INJECT; SPEC_INJ_TOOL; SPEC_INJ_COMMAND

   **Description:**
   Step-by-step procedures and expected outcomes for test scenarios covering the
   prompt-injection primitive, LM tool, and VS Code command. Scenarios cover:
   injection into existing live sessions, session-spawn paths with agent-mode
   priming and init-prompt delivery, slash-command execution (``/compact``),
   entity quick-pick and input-box UX, and error handling for unknown entities.

   **Test Setup:**

   * Extension Development Host (EDH) running the Jarvis extension from the
     ``feature/prompt-injection-tool`` branch. Launch via **F5** in VS Code.
   * Open workspace: ``testdata/test.code-workspace`` (File → Open Workspace
     from File…). This sets ``testdata/`` as the workspace root.
   * ``jarvis.sessions.enabled`` must be ``true`` (default).
   * Test-data files under ``testdata/.jarvis/actors/`` and
     ``testdata/.jarvis/projects/``:

     * Actor ``Change Manager`` with ``agent: syspilot.cm`` and init prompt
       (``testdata/.jarvis/actors/Change Manager/session.yaml`` and
       ``context.md``).
     * Actor ``Test Designer`` with ``agent: vscode.lm`` and init prompt
       (``testdata/.jarvis/actors/Test Designer/session.yaml`` and
       ``context.md``).
     * Project ``delivery-automation`` (no agent field)
       (``testdata/.jarvis/projects/delivery-automation/project.yaml`` and
       ``context.md``).

   * Expand the **Sessions**, **Projects**, and **Events** sections in the
     Jarvis sidebar so entities are visible.
   * Open the **Jarvis** Output Channel (View → Output → Jarvis) so that
     ``[MSG]`` and ``[ERROR]`` log entries can be inspected.
   * All test scenarios assume no live chat sessions exist for the target
     entities at test start (delete sessions as needed via VS Code Chat pane
     before each scenario).

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 35 40 17

      * - Scenario
        - Action
        - Expected Result
        - Req Link

      * - T-1

          Inject into existing live session

          *(AC-1)*
        - Precondition: ``Change Manager`` session exists and is open in the chat pane.
          No text is in the chat input.

          Execute the LM tool programmatically via a dev agent or manual
          invocation:
          ``jarvis_injectPrompt(actor="Change Manager", text="read your context.md")``
        - **Text appears in input:** The string
          ``"read your context.md"`` appears in the chat input of the focused
          ``Change Manager`` session (no submission yet).

          **Session focused:** The ``Change Manager`` chat tab is brought to
          focus if it was not already.

          **No init prompt:** The init prompt is NOT re-sent (the session was
          already live).
        - REQ_INJ_TOOL, SPEC_INJ_INJECT AC-1

      * - T-2

          Inject slash-command into existing live session

          *(AC-1)*
        - Precondition: ``Change Manager`` session exists and is open.

          Execute:
          ``jarvis_injectPrompt(actor="Change Manager", text="/compact")``
        - **Slash-command in input:** ``/compact`` appears in the chat input.

          **Session focused:** The ``Change Manager`` chat tab is focused.
        - REQ_INJ_TOOL, SPEC_INJ_INJECT AC-1

      * - T-3

          Spawn new session for actor with agent-mode

          *(AC-2)*
        - Precondition: No ``Change Manager`` chat session exists in VS Code.
          The ``Change Manager`` actor has ``agent: syspilot.cm``.

          Execute:
          ``jarvis_injectPrompt(actor="Change Manager", text="Hello from injection")``

          Observe the chat pane, mode selector, and Jarvis Output Channel.
        - **New chat opens:** A new chat editor opens with title
          ``Change Manager``.

          **Agent mode set:** The chat mode selector shows ``syspilot.cm``
          (from the actor's ``agent`` field).

          **Init prompt sent:** The actor's init prompt appears in the chat
          history (before the injected text).

          **Text injected:** ``Hello from injection`` appears in the chat
          input after the init prompt.

          **Session UUID saved:** The new session is registered in
          ``scanner.entities`` and has a UUID in session lookup.
        - REQ_INJ_PRIMITIVE AC-4, REQ_INJ_TOOL, SPEC_INJ_INJECT AC-2

      * - T-4

          Spawn new session for actor without agent-mode

          *(AC-2)*
        - Precondition: No ``Test Designer`` chat session exists. The
          ``Test Designer`` actor does NOT have an ``agent`` field (or
          agent field is null).

          Execute:
          ``jarvis_injectPrompt(actor="Test Designer", text="manual instruction")``

          Observe mode selector and init prompt.
        - **New chat opens:** A new chat editor opens with title
          ``Test Designer``.

          **Mode selector:** Shows default vscode.lm mode (no agent-specific
          mode set).

          **Init prompt sent:** The actor's init prompt appears in the chat
          history (or default init message if no actor-specific prompt).

          **Text injected:** ``manual instruction`` appears in chat input.
        - REQ_INJ_PRIMITIVE AC-4, SPEC_INJ_INJECT AC-2

      * - T-5

          Inject ``/compact`` and verify session compaction

          *(AC-6, end-to-end)*
        - Precondition: ``Change Manager`` session exists and contains a
          history of 10+ messages. Execute:
          ``jarvis_injectPrompt(actor="Change Manager", text="/compact")``

          Observe the chat history and message count. Take a count of messages
          before /compact. Wait for /compact to execute (message appears in
          history indicating start, then completion).
        - **Slash-command submitted:** ``/compact`` is added to chat history
          and submitted (not left in input).

          **Chat compacted:** After /compact execution, the message count
          is visibly reduced. Older messages are summarized or removed; recent
          messages remain.

          **Confirmation message:** The chat shows a message indicating
          compaction completed (e.g., "Session compacted from X to Y messages").
        - REQ_INJ_PRIMITIVE AC-5, AC-6, US_INJ_INJECT AC-6

      * - T-6

          Command palette: inject into entity with quick-pick

          *(AC-4)*
        - Precondition: No sessions are open. Multiple entities exist
          (``Change Manager``, ``Test Designer``, ``delivery-automation``).

          Press Ctrl+Shift+P to open the Command Palette. Search for
          "Inject Prompt" and select ``Jarvis: Inject Prompt`` command.

          In the quick-pick menu that appears, select ``Change Manager``.

          In the input box that appears, type ``/compact``.

          Press Enter.
        - **Quick-pick shows entities:** The quick-pick displays all three
          entities (``Change Manager``, ``Test Designer``,
          ``delivery-automation``) with kind descriptions (actor, project).

          **Selection accepted:** After selecting ``Change Manager``, the
          quick-pick closes.

          **Input box shown:** An input box appears with placeholder
          "Text or slash-command to inject".

          **Text entered:** After typing ``/compact`` and pressing Enter, a
          new ``Change Manager`` session is spawned (if not already open),
          and ``/compact`` is injected and submitted.

          **New session created:** The ``Change Manager`` chat opens with
          agent mode set, init prompt visible, and ``/compact`` in history
          showing execution.
        - REQ_INJ_COMMAND AC-1, AC-2, AC-3, AC-4

      * - T-7

          Command palette: cancel at quick-pick

          *(AC-4, cancel flow)*
        - Precondition: No entity session open.

          Open Command Palette, select ``Jarvis: Inject Prompt``.

          In the quick-pick menu, press Escape to cancel.
        - **Quick-pick closes:** The quick-pick closes without further
          prompts. No session is opened. No text is injected.
        - REQ_INJ_COMMAND AC-4

      * - T-8

          Command palette: cancel at input box

          *(AC-4, cancel flow)*
        - Precondition: No entity session open.

          Open Command Palette, select ``Jarvis: Inject Prompt``.

          Select an entity in the quick-pick (e.g., ``Change Manager``).

          In the input box, press Escape without entering text.
        - **Input box closes:** The input box closes. No session is opened
          for that entity. No text is injected.
        - REQ_INJ_COMMAND AC-4

      * - T-9

          Unknown entity name — error path

          *(AC-5)*
        - Precondition: No entity named ``NonExistent`` exists.

          Execute:
          ``jarvis_injectPrompt(actor="NonExistent", text="test")``

          Observe error handling.
        - **Error message returned:** The tool returns an error message
          (does not throw). Message includes "Entity not found: NonExistent"
          or similar.

          **No session opened:** No new chat session is created for the
          unknown entity.

          **Tool result:** The LM tool returns an error string like
          ``'Error: Jarvis: Entity not found: NonExistent'``.
        - REQ_INJ_PRIMITIVE AC-2, REQ_INJ_TOOL AC-5, US_INJ_INJECT AC-5

      * - T-10

          Unknown entity name — command error

          *(AC-5)*
        - Precondition: No entity named ``NonExistent`` exists.

          Open Command Palette, select ``Jarvis: Inject Prompt``.

          In the quick-pick, type "NonExistent" (search/filter — no match
          found, or manually attempt to enter non-existent name via input box
          workaround, if supported).

          **Alternative:** If quick-pick prevents free-form input, manually
          test error by invoking tool directly with invalid name
          (see T-9 above and verify error UX here).
        - **Quick-pick shows no results:** If typing "NonExistent", the
          quick-pick shows "No matching results" or equivalent.

          **Fallback:** If user presses Enter with no match, a warning
          notification appears saying "Jarvis: Entity not found" or similar.

          **No injection:** No text is injected.
        - REQ_INJ_COMMAND AC-5, US_INJ_INJECT AC-5

      * - T-11

          Inject into project (non-agent entity)

          *(Boundary case)*
        - Precondition: No ``delivery-automation`` project session exists. The
          project has no ``agent`` field.

          Execute:
          ``jarvis_injectPrompt(actor="delivery-automation", text="Deploy now")``

          Observe session creation.
        - **New chat opens:** A new chat session is created and named
          ``delivery-automation``.

          **No agent mode:** Mode selector shows default ``vscode.lm`` (or
          no agent-specific mode).

          **Text injected:** ``Deploy now`` appears in the chat input.

          **Lookup registered:** The new session is registered in the
          entity store with a session UUID.
        - REQ_INJ_PRIMITIVE, SPEC_INJ_INJECT (entity resolution for projects)

      * - T-12

          Refactor: Message-notification stub now uses primitive

          *(Consolidation: REQ_INJ_PRIMITIVE AC-6)*
        - Precondition: A message is pending for an actor in the message queue.
          Auto-delivery is active (e.g., via heartbeat or manual poll).

          Trigger message delivery (e.g., via ``jarvis_autoDeliverMessages``
          heartbeat or manual invocation).

          Observe injection path and session state.
        - **Primitive used:** In the Jarvis Output Channel, logs show that
          injection routes through the new primitive (presence of
          "injectPrompt" in call stack or log messages).

          **Message delivered:** The message stub appears in the correct
          session's chat input.

          **Session spawn/focus:** If session did not exist, it is spawned
          with agent-mode and init prompt; if it existed, it is focused.

          **Consolidation verified:** Code inspection (or log traces) confirms
          message-notification injection is NOT duplicating inline logic
          from REQ_INJ_PRIMITIVE.
        - REQ_INJ_PRIMITIVE AC-6, SPEC_INJ_INJECT (caller migration)

      * - T-13

          Refactor: Auto-delivery poll now uses primitive

          *(Consolidation: REQ_INJ_PRIMITIVE AC-6)*
        - Precondition: Auto-delivery poll loop is running (e.g., heartbeat
          job with agent/queue steps).

          Trigger delivery or check running logs.
        - **Primitive used:** Logs indicate injection goes through the
          primitive (not inline duplication).

          **Focus restore:** Auto-delivery session focus is managed by the
          poll loop's own focus-snapshot/restore (not by the primitive —
          per SPEC_INJ_INJECT focus-restore responsibility).

          **Consolidation verified:** Code inspection confirms auto-delivery
          poll does NOT contain redundant session-resolve + inject logic.
        - REQ_INJ_PRIMITIVE AC-6, SPEC_INJ_INJECT (caller migration, focus-restore)

      * - T-14

          Refactor: Session-start init prompt now uses primitive

          *(Consolidation: REQ_INJ_PRIMITIVE AC-6)*
        - Precondition: User clicks an actor in the Sessions tree to open
          a new session (from the tree-click path, not from auto-delivery).

          Observe session creation.
        - **Primitive used:** Logs and code inspection confirm tree-click
          session open uses the primitive's spawn-session path (agent-mode
          priming, init prompt, text injection).

          **No duplication:** No inline session-resolve + inject logic
          remains in the tree-click handler.

          **Consolidation verified:** All three former injection sites
          (message, auto-delivery, tree-click) now route through
          ``injectPrompt``.
        - REQ_INJ_PRIMITIVE AC-6, SPEC_INJ_INJECT (caller migration)
