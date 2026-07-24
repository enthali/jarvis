Prompt Injection UAT Requirements
==================================

.. req:: Prompt Injection — Test Data and Verification Requirements
   :id: REQ_UAT_INJECTPROMPT
   :status: draft
   :priority: required
   :links: US_UAT_INJECTPROMPT; REQ_INJ_PRIMITIVE; REQ_INJ_TOOL; REQ_INJ_COMMAND

   **Description:**
   Specifies the test data, workspace state, and per-AC verification criteria
   required to manually validate the prompt-injection primitive, LM tool, and
   VS Code command.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host
     (F5 from VS Code with ``feature/prompt-injection-tool`` checked out).
   * ``jarvis.sessions.enabled`` must be ``true`` (default).
   * The following test-data files must be present:

     * ``testdata/.jarvis/actors/Change Manager/session.yaml`` — must
       contain ``agent: syspilot.cm``.
     * ``testdata/.jarvis/actors/Change Manager/context.md`` — standard
       content; used by init-prompt ``{contextPath}`` placeholder.
     * ``testdata/.jarvis/actors/Test Designer/session.yaml`` — must
       **not** contain an ``agent`` field (tests no-agent-mode path).
     * ``testdata/.jarvis/actors/Test Designer/context.md`` — standard
       content.
     * ``testdata/.jarvis/projects/delivery-automation/project.yaml`` —
       must **not** contain an ``agent`` field (tests project entity support).
     * ``testdata/.jarvis/projects/delivery-automation/context.md`` —
       standard content.

   * For T-5 (``/compact`` end-to-end), the ``Change Manager`` session
     must contain at least 10 messages before the scenario begins. The
     tester SHALL populate this by sending several messages to the session
     manually before executing the test step.

   * For T-9 and T-10 (unknown entity), no entity named ``NonExistent``
     or ``BadName`` may exist in the test workspace.

   **Acceptance Criteria — per CR AC:**

   * CR AC-1 (T-1, T-2):
     The tester SHALL verify that the injected text appears in the target
     session's chat input and that the session is focused. For T-2 (slash
     command), the tester SHALL verify that ``/compact`` is recognized by
     VS Code (command hint visible in input or in chat history after
     submission).

   * CR AC-2 (T-3, T-4):
     The tester SHALL verify that a new chat session is created with the
     correct entity name as title, that agent-mode is applied when the
     entity has an ``agent`` field (T-3), and that default mode is used
     when no ``agent`` field is set (T-4). The init prompt SHALL appear in
     chat history before the injected text.

   * CR AC-3 (T-1, T-2, T-3, T-4, T-11):
     The tester SHALL invoke ``jarvis_injectPrompt`` programmatically (via
     a dev agent or direct tool invocation in the EDH chat) and confirm the
     tool response contains a success message with the entity name and a
     truncated text preview.

   * CR AC-4 (T-6, T-7, T-8):
     The tester SHALL verify that ``Jarvis: Inject Prompt`` appears in the
     Command Palette, that the quick-pick lists all registered entities with
     kind descriptions, and that cancel at either quick-pick (T-7) or input
     box (T-8) exits cleanly without side-effects.

   * CR AC-5 (T-9, T-10):
     The tester SHALL verify that an unknown entity name produces a
     user-visible error message (not a crash, not a silent no-op). For the
     LM tool (T-9), the tool return value SHALL contain "Entity not found"
     text. For the command path (T-10), a VS Code warning notification SHALL
     be visible.

   * CR AC-6 (T-5):
     The tester SHALL verify end-to-end that injecting ``/compact`` into an
     actor session with 10+ messages causes VS Code to compact that session.
     Evidence: message count is visibly reduced after ``/compact`` executes.

   **Consolidation Verification (T-12, T-13, T-14):**
   The tester SHALL confirm via log inspection (Jarvis Output Channel) or
   code review that message-notification injection, auto-delivery injection,
   and tree-click session-open all route through the single
   ``injectPrompt()`` primitive. No duplicate session-resolve or inject
   logic should remain in consumer call sites.
