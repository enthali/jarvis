Agent Prompt Tuning UAT Design Specifications
===============================================

.. spec:: Agent Prompt Tuning Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_AGENT_PROMPT_SCENARIOS
   :status: implemented
   :links: REQ_UAT_APT_INITPROMPT; REQ_UAT_APT_NOTIFICATION; REQ_UAT_APT_CFG

   **Description:**
   Step-by-step procedures and expected outcomes for all seventeen acceptance test
   scenarios covering the configurable agent session init prompt (T-1 to T-6,
   T-14), the configurable auto-delivery notification template (T-7 to T-11,
   T-15 to T-17), and Settings UI visibility (T-12, T-13).

   **Test Setup:**

   * Extension Development Host running with the Jarvis extension loaded from the
     ``feature/agent-prompt-tuning`` branch (press **F5** in VS Code).
   * Open the workspace ``testdata/test.code-workspace``
     (File → Open Workspace from File…) — workspace root is ``testdata/``.
   * Existing sessions and projects in ``testdata/`` are sufficient; no additional
     test-data files are required beyond those already present.
   * A ``TestSession`` chat session must be addressable by the
     ``jarvis_sendToSession`` tool for notification scenarios (T-7 to T-11).
     If not already present, create it via **Jarvis: New Session** before running
     those scenarios.
   * Reset workspace settings to their defaults between scenarios unless stated
     otherwise.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 40 52

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (default init prompt)
        - Ensure ``jarvis.agentSession.initPromptTemplate`` is not set. Click the
          ``+`` button in the Sessions view title bar. Enter any session name and
          summary. Observe the auto-opened Copilot agent chat.
        - The chat input / first message contains: the absolute OS path of the
          new session's ``context.md`` wrapped in backticks; a sentence beginning
          with "Use only"; bullets or labels "Decision", "Finding", and "Next";
          and a sentence containing the phrase "2 weeks". No ``${...}`` literals
          remain.
      * - T-2 (placeholder substitution)
        - Same setup as T-1. Create a new session named ``my-test-session``.
          Observe the auto-opened chat.
        - ``${kind}`` is replaced by ``session``, ``${name}`` by
          ``my-test-session``, and ``${contextPath}`` by the absolute OS path
          of the newly created ``context.md``. None of the three known
          placeholder literals appear verbatim.
      * - T-3 (override via setting)
        - Set ``jarvis.agentSession.initPromptTemplate`` (Workspace Settings) to:
          ``Role: ${kind} ${name}. Memory: ${contextPath}.``
          Create a new session named ``override-test``. Observe the chat.
        - The chat shows exactly one rendered line:
          ``Role: session override-test. Memory: <absolutePath>.``
          where ``<absolutePath>`` is the absolute path of the new
          ``context.md``. The built-in default prompt is NOT shown.
      * - T-4 (empty setting → fallback)
        - Set ``jarvis.agentSession.initPromptTemplate`` to ``""`` (empty string).
          Create a new session. Observe the chat.
        - The chat shows the same built-in disciplined English default as T-1.
          No empty or blank prompt is sent.
      * - T-5 (unknown placeholder left as-is)
        - Set ``jarvis.agentSession.initPromptTemplate`` to:
          ``Hi ${name}, unknown=${nope}.``
          Create a new session named ``ph-test``. Observe the chat.
        - The chat shows: ``Hi ph-test, unknown=${nope}.``
          Known placeholder ``${name}`` is substituted; unknown ``${nope}``
          remains literally unchanged.
      * - T-6 (project entity, kind=project)
        - Clear any template override. Run **Jarvis: New Entity** → select
          **Project**. Enter a project name and summary. Observe the auto-opened
          chat.
        - The chat shows the default prompt with ``kind`` rendered as ``project``
          and the entered project name as ``${name}``. The absolute path of the
          project's ``context.md`` is shown in backticks. The overall structure
          (Use only, Decision / Finding / Next, 2 weeks) is identical to T-1.
          Clean up: delete the created project folder after verification.
      * - T-7 (default notification, manual deliver-now)
        - Clear any notification template override. Use ``jarvis_sendToSession``
          (or ``jarvis_sendMessage``) from a session named ``Change Manager``
          to enqueue 2 messages to ``TestSession``. In the Messages tree,
          click the **Send Messages** inline action on ``TestSession``.
        - The auto-opened agent chat shows all three lines of the built-in
          default (``msg-notify-sender-id`` CR, GH #40):
          ``[Jarvis Message Service] You have 2 new message(s) in your inbox.``
          ``Read them with the jarvis_receiveMessage tool (destination: "TestSession") until remaining = 0.``
          ``Sender(s): Change Manager``
          The third ``Sender(s):`` line appears; no ``${sender}`` literal
          remains; no German text appears.
      * - T-8 (default notification, auto-delivery poll)
        - Right-click the ``TestSession`` group node → **Enable Auto-Delivery**.
          Clear any notification template override. Use ``jarvis_sendMessage``
          (or ``jarvis_sendToSession``) to enqueue 1 message from a known
          sender. Wait up to 6 seconds for the next poll tick.
          Observe the chat and the queue JSON file.
        - The agent chat shows the English default notification with ``count=1``
          and ``destination="TestSession"``; the third line reads
          ``Sender(s): <sender-name>`` with the actual sender substituted.
          In the queue file the delivered message has ``notified: true`` set.
      * - T-9 (notification override)
        - Set ``jarvis.messages.notificationTemplate`` to:
          ``You have ${count} msgs for ${destination}.``
          Enqueue 1 message to ``TestSession``. Trigger manual delivery
          (**Send Messages** inline action).
        - The chat shows exactly:
          ``You have 1 msgs for TestSession.``
          The built-in English default text is NOT shown.
      * - T-10 (notification empty → fallback)
        - Set ``jarvis.messages.notificationTemplate`` to ``""`` (empty string).
          Enqueue 1 message. Trigger manual delivery.
        - The chat shows the built-in English default (same as T-7). No empty
          or blank message is sent.
      * - T-11 (notification unknown placeholder left as-is)
        - Set ``jarvis.messages.notificationTemplate`` to:
          ``Hi ${count} ${unknown}``
          Enqueue 1 message. Trigger manual delivery.
        - The chat shows: ``Hi 1 ${unknown}``
          Known placeholder ``${count}`` is substituted; unknown ``${unknown}``
          remains literally unchanged.
      * - T-12 (Settings UI: init prompt template)
        - Open VS Code Settings UI (``Ctrl+,``). In the search box type
          ``jarvis prompt template``.
        - The setting ``jarvis.agentSession.initPromptTemplate`` is displayed
          under a group labelled **Prompt Templates**. Its description
          references the ``${kind}``, ``${name}``, and ``${contextPath}``
          placeholders. The default / placeholder text shows the disciplined
          English default prompt.
      * - T-13 (Settings UI: notification template)
        - In the Settings UI search box type ``jarvis notification template``.
        - The setting ``jarvis.messages.notificationTemplate`` is displayed under
          a group labelled **Prompt Templates**. Its description references the
          ``${count}``, ``${destination}``, and ``${sender}`` placeholders
          (``msg-notify-sender-id`` CR, GH #40). The default /
          placeholder text shows the English default notification string
          including all three lines.
      * - T-14 (extract-overflow bullet presence)
        - Ensure ``jarvis.agentSession.initPromptTemplate`` is not set (default).
          Create a new session via **Jarvis: New Session** or
          **Jarvis: Open Agent Session** on any entity. Observe the auto-opened
          Copilot agent chat.
        - The chat shows the default disciplined-memory prompt. The last item of
          the "Keep it minimal and action-oriented" bullet list is exactly:
          ``- When a topic grows past ~5 bullets, move it to a dedicated file beside `context.md` and leave a one-line summary with a relative link in `context.md`.``
          No other bullet follows it in the list.
      * - T-15 (multiple distinct senders — comma-joined, de-duplicated)
        - Default template. Use ``jarvis_sendMessage`` to enqueue 2 messages
          from ``Change Manager`` and 1 message from ``Project Manager`` to
          ``TestSession``. Trigger manual delivery (**Send Messages**).
        - The third line of the notification reads
          ``Sender(s): Change Manager, Project Manager`` (order may vary but
          both names appear exactly once — ``Change Manager`` is NOT
          listed twice despite sending 2 messages).
      * - T-16 (non-actor source shows meaningful label)
        - Default template. Run a heartbeat ``queue`` step that appends a
          message with ``sender="Heartbeat"`` to ``TestSession``. Trigger
          manual delivery.
        - Third line reads ``Sender(s): Heartbeat``. No blank, no error,
          no raw ``${sender}`` literal in the output.
      * - T-17 (backward compat — template without ${sender})
        - Set ``jarvis.messages.notificationTemplate`` to:
          ``You have ${count} msgs for ${destination}. Please check in.``
          Enqueue 1 message. Trigger manual delivery.
        - Chat shows: ``You have 1 msgs for TestSession. Please check in.``
          No ``${sender}`` literal appears; no error raised;
          ``${count}`` and ``${destination}`` substitutions unaffected.
