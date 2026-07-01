Session Init Prompt on Auto-Open UAT Requirements
==================================================

.. req:: Session Init Prompt on Auto-Open — Test Data and Verification Requirements
   :id: REQ_UAT_SESSIONINITPROMPT
   :status: draft
   :priority: required
   :links: US_UAT_SESSIONINITPROMPT; REQ_ENT_AGENTSESSION; REQ_MSG_AGENTSESSION; REQ_ENT_AGENTPROMPT_TEMPLATE

   **Description:**
   Specifies the test data, workspace state, and per-AC verification criteria
   required to manually validate agent-mode assignment and init-prompt
   submission in both the tree-click and auto-delivery session-open paths.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host
     (F5 from VS Code with ``feature/session-init-prompt-on-autoopen``
     checked out).
   * ``jarvis.sessions.enabled`` must be ``true`` (default).
   * The following session test-data files must be present:

     * ``testdata/.jarvis/sessions/copilot-cm/session.yaml`` — **must**
       contain an ``agent`` field (e.g. ``agent: syspilot.cm``) in addition
       to the standard ``name`` and ``summary`` fields.
     * ``testdata/.jarvis/sessions/copilot-cm/context.md`` — standard
       content; path used by init-prompt ``{contextPath}`` placeholder.
     * ``testdata/.jarvis/sessions/dev-feature-x/session.yaml`` — **must
       not** contain an ``agent`` field (tests no-agent edge case).
     * ``testdata/.jarvis/sessions/dev-feature-x/context.md`` — standard
       content.

   * For T-E3 (typo in agent), the tester creates a temporary session
     folder ``testdata/.jarvis/sessions/bad-agent/`` with::

       name: bad-agent
       summary: "Edge-case entity with invalid agent name"
       agent: totally.unknown.mode

     This folder is deleted after T-E3 completes.

   * For T-E4 (multiple messages queued), the tester enqueues three
     messages to ``"copilot-cm"`` via the ``jarvis_sendToSession`` MCP/LM
     tool (or by direct ``messages.json`` edit) before starting the poll.

   * No additional projects or events are required; only the session
     entities above.

   **Acceptance Criteria — per CR AC:**

   * CR AC-1 (T-1, T-2):
     For T-1, the tester SHALL verify the chat mode selector label matches
     the ``agent`` field value immediately after the new session opens.
     For T-2, the tester SHALL verify that no mode-prime step is observable
     (no ``workbench.action.chat.open { mode }`` notification) and that the
     init-prompt message still appears in the new chat.

   * CR AC-2 (T-3):
     The tester SHALL confirm that the existing chat tab gains focus, that
     its title remains unchanged, that no second ``/rename`` fires, and that
     no init-prompt text appears in the chat after the click.

   * CR AC-3 (T-4):
     The tester SHALL verify that after deleting all named chat sessions and
     queuing a message for ``"copilot-cm"``, the auto-delivery poll opens a
     new chat in the ``copilot-cm`` entity's bound agent mode and prepends
     the init-prompt before the queued message.

   * CR AC-4 (T-5):
     The tester SHALL compare the chat mode and init-prompt text produced by
     T-1 (tree-click) and T-4 (auto-delivery) for the same entity and
     confirm they are textually identical.

   * Edge T-E2:
     The tester SHALL verify that no init-prompt text and no agent-mode
     notification appear when the destination name is absent from
     ``scanner.entities``.

   * Edge T-E3:
     The tester SHALL note the observed chat mode in the test report and
     confirm that no extension error is thrown (Jarvis Output Channel must
     be free of ``[ERROR]`` entries after the click).

   * Edge T-E4:
     The tester SHALL inspect the chat transcript and confirm that the
     init-prompt appears exactly once (before the first queued message) and
     that subsequent messages follow without a repeated prompt.

   * Edge T-E5:
     The tester SHALL confirm that the background-tab session content is
     undisturbed and that the ``/rename`` rename sequence does NOT fire.
