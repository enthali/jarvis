Agent Prompt Tuning User Acceptance Tests
==========================================

.. story:: Agent Session Init Prompt Acceptance Tests
   :id: US_UAT_APT_INITPROMPT
   :status: implemented
   :priority: required
   :links: US_ENT_AGENTSESSION_PROMPT

   **As a** Jarvis Test Engineer,
   **I want** a set of manual acceptance test scenarios for the configurable
   agent session init prompt,
   **so that** I can verify the disciplined English default prompt is rendered
   correctly, placeholders are substituted, user overrides are applied,
   the empty-string fallback rule holds, unknown placeholders are left as-is,
   and the prompt works for all entity kinds.

   **Acceptance Criteria:**

   * AC-1: A test verifies that with no setting override the auto-opened agent
     chat shows the disciplined English default init prompt containing the
     absolute ``context.md`` path in backticks, the "Use only" sentence, the
     Decision / Finding / Next structure, and the 2-week gate question (T-1).
   * AC-2: A test verifies that ``${kind}``, ``${name}``, and ``${contextPath}``
     are substituted with the entity kind, entered name, and absolute path of
     ``context.md`` respectively (T-2).
   * AC-3: A test verifies that setting ``jarvis.agentSession.initPromptTemplate``
     to a custom one-line template causes the chat to show exactly that line with
     substitutions applied (T-3).
   * AC-4: A test verifies that setting ``jarvis.agentSession.initPromptTemplate``
     to ``""`` (empty string) causes the chat to fall back to the built-in
     disciplined English default (T-4).
   * AC-5: A test verifies that an unknown placeholder (e.g. ``${nope}``) is left
     as-is in the rendered prompt while known placeholders are still substituted
     (T-5).
   * AC-6: A test verifies that the prompt is rendered correctly for a
     ``kind=project`` entity, showing ``You are the project "..."`` in the
     default template (T-6).
   * AC-7: A test verifies that the default init prompt contains the
     extract-overflow bullet instructing the agent to move topics past ~5
     bullets to a dedicated file beside ``context.md`` with a one-line summary
     and relative link (T-7).

   **Test Scenarios:**

   **T-1 — Default init prompt (no override)**
     Setup: Open ``testdata/test.code-workspace`` in the Extension Development
     Host (F5). Ensure ``jarvis.agentSession.initPromptTemplate`` is not set
     (deleted / default).
     Action: Click the ``+`` button in the Sessions view title bar (or run
     **Jarvis: New Session**). Enter a session name and summary. Observe the
     auto-opened Copilot agent chat.
     Expected: The chat shows the built-in disciplined English default prompt.
     It contains: the absolute path of ``context.md`` in backticks, a sentence
     beginning "Use only", bullets labelled Decision, Finding, and Next, and a
     sentence containing "2 weeks".

   **T-2 — Placeholder substitution**
     Setup: Same as T-1 with default template active.
     Action: Create a new session named ``my-test-session``. Observe the
     auto-opened chat.
     Expected: ``${kind}`` is replaced by ``session``, ``${name}`` by
     ``my-test-session``, and ``${contextPath}`` by the absolute OS path of
     the new session's ``context.md``. No ``${...}`` literal remains for these
     three placeholders.

   **T-3 — Override via setting**
     Setup: Set ``jarvis.agentSession.initPromptTemplate`` (in Workspace
     Settings) to:
     ``"Role: ${kind} ${name}. Memory: ${contextPath}."``
     Action: Create a new session named ``override-test``. Observe the chat.
     Expected: The chat shows exactly one line:
     ``Role: session override-test. Memory: <absolutePath>.``
     where ``<absolutePath>`` is the absolute path of the new ``context.md``.

   **T-4 — Empty setting → fallback to default**
     Setup: Set ``jarvis.agentSession.initPromptTemplate`` to ``""`` (empty
     string) in Workspace Settings.
     Action: Create a new session. Observe the chat.
     Expected: The chat shows the built-in disciplined English default (same as
     T-1), not an empty prompt.

   **T-5 — Unknown placeholder left as-is**
     Setup: Set ``jarvis.agentSession.initPromptTemplate`` to:
     ``"Hi ${name}, unknown=${nope}."``
     Action: Create a new session named ``ph-test``. Observe the chat.
     Expected: The chat shows ``Hi ph-test, unknown=${nope}.``
     Known placeholder ``${name}`` is substituted; unknown ``${nope}`` remains
     literally.

   **T-6 — Project entity (kind=project)**
     Setup: Default ``jarvis.agentSession.initPromptTemplate`` (no override).
     Action: Run **Jarvis: New Entity → Project**. Enter a project name and
     summary. Observe the auto-opened chat.
     Expected: The chat shows the default prompt with ``kind`` rendered as
     ``project`` and the project name substituted for ``${name}``.

   **T-7 — Extract-overflow bullet present in default prompt**
     Setup: Default ``jarvis.agentSession.initPromptTemplate`` (no override).
     Action: Create a new session (any entity kind). Observe the auto-opened
     Copilot agent chat.
     Expected: The default prompt contains a bullet with the text "When a
     topic grows past ~5 bullets, move it to a dedicated file beside
     ``context.md`` and leave a one-line summary with a relative link in
     ``context.md``." appearing as the last item of the "Keep it minimal and
     action-oriented" list.


.. story:: Auto-Delivery Notification Template Acceptance Tests
   :id: US_UAT_APT_NOTIFICATION
   :status: implemented
   :priority: required
   :links: US_MSG_NOTIFICATION_TEMPLATE

   **As a** Jarvis Test Engineer,
   **I want** a set of manual acceptance test scenarios for the configurable
   auto-delivery notification template,
   **so that** I can verify the English default notification text is rendered
   with correct substitutions, manual and automatic delivery paths use the same
   template, user overrides are applied, the empty-string fallback rule holds,
   unknown placeholders are left as-is, and the Settings UI exposes both new
   settings.

   **Acceptance Criteria:**

   * AC-1: A test verifies that manual "Send Messages" delivery shows the English
     default notification with the correct message count and destination name
     substituted (T-7).
   * AC-2: A test verifies that the auto-delivery poll loop (5-second tick) shows
     the same English default notification, marks messages as ``notified:true``,
     and uses the correct ``count`` and ``destination`` values (T-8).
   * AC-3: A test verifies that setting ``jarvis.messages.notificationTemplate``
     to a custom template causes the chat to show exactly that text with
     substitutions applied (T-9).
   * AC-4: A test verifies that setting ``jarvis.messages.notificationTemplate``
     to ``""`` causes the chat to fall back to the built-in English default
     (T-10).
   * AC-5: A test verifies that an unknown placeholder in the notification template
     is left as-is while known placeholders are still substituted (T-11).
   * AC-6: A test verifies that both new settings appear in the correct groups in
     the VS Code Settings UI (T-12, T-13).
   * AC-7: A test (T-15) verifies that when the pending message batch contains
     messages from multiple distinct senders, the ``${sender}`` placeholder is
     rendered as a comma-separated list of unique sender names with no
     duplicates (``msg-notify-sender-id`` CR, GH #40).
   * AC-8: A test (T-16) verifies that messages originating from non-actor
     sources (e.g. a heartbeat job with sender ``"Heartbeat"``) display a
     meaningful source label in the ``${sender}`` position rather than a blank
     or error.
   * AC-9: A test (T-17) verifies backward compatibility: a custom template
     that does not include ``${sender}`` still renders correctly — the missing
     placeholder is simply absent from the output and no error is raised.

   **Test Scenarios:**

   **T-7 — Default notification via manual deliver-now**
     Setup: Open ``testdata/test.code-workspace`` in the Extension Development
     Host (F5). Ensure ``jarvis.messages.notificationTemplate`` is not set
     (deleted / default). Enqueue 2 messages to a session named ``TestSession``
     from a single sending session (e.g. ``jarvis_sendToSession`` from a chat
     session named ``Change Manager``).
     Action: In the Messages tree, right-click (or use inline action) the
     ``TestSession`` group node and click **Send Messages**.
     Expected: The auto-opened chat shows all three lines of the built-in
     default (``msg-notify-sender-id`` CR, GH #40):
     ``[Jarvis Message Service] You have 2 new message(s) in your inbox.``
     followed by:
     ``Read them with the jarvis_receiveMessage tool (destination: "TestSession") until remaining = 0.``
     followed by:
     ``Sender(s): Change Manager``
     (The sender name reflects whichever session enqueued the messages.)

   **T-8 — Default notification via auto-delivery poll**
     Setup: Same environment. Add ``TestSession`` to auto-delivery (right-click
     the node → **Enable Auto-Delivery**). Default notification template.
     Action: Enqueue 1 message (from a known sender). Wait up to 6 seconds for
     the next poll tick. Observe the auto-opened chat.
     Expected: The chat shows all three lines of the English default notification
     with ``count=1``, ``destination="TestSession"``, and
     ``Sender(s): <sender-name>`` on the third line. After delivery the message
     is marked ``notified:true`` in the queue JSON.

   **T-9 — Notification override**
     Setup: Set ``jarvis.messages.notificationTemplate`` to:
     ``"You have ${count} msgs for ${destination}."``
     Action: Enqueue 1 message to ``TestSession``. Trigger manual delivery via
     **Send Messages**.
     Expected: The chat shows exactly:
     ``You have 1 msgs for TestSession.``

   **T-10 — Notification empty → fallback to default**
     Setup: Set ``jarvis.messages.notificationTemplate`` to ``""`` (empty string).
     Action: Enqueue 1 message. Trigger manual delivery.
     Expected: The chat shows the built-in English default (same as T-7).

   **T-11 — Notification unknown placeholder left as-is**
     Setup: Set ``jarvis.messages.notificationTemplate`` to:
     ``"Hi ${count} ${unknown}"``
     Action: Enqueue 1 message. Trigger manual delivery.
     Expected: The chat shows ``Hi 1 ${unknown}`` — known ``${count}``
     substituted; unknown ``${unknown}`` left literally.

   **T-12 — Settings UI: init prompt template visibility**
     Setup: Extension Development Host running.
     Action: Open VS Code Settings UI (``Ctrl+,``). Search for
     ``jarvis prompt template``.
     Expected: ``jarvis.agentSession.initPromptTemplate`` appears in the
     **Sessions** (or Agent Session) group. The field shows the disciplined
     English default as the placeholder / default value.

   **T-13 — Settings UI: notification template visibility**
     Setup: Extension Development Host running.
     Action: Open VS Code Settings UI. Search for
     ``jarvis notification template``.
     Expected: ``jarvis.messages.notificationTemplate`` appears in the
     **Messages** group. The description references the ``${count}``,
     ``${destination}``, and ``${sender}`` placeholders. The default /
     placeholder text shows the English default notification text including
     all three lines (count, receiveMessage instruction, Sender(s)).

   **T-15 — Multiple distinct senders — comma-joined, de-duplicated**
     Setup: Default notification template. Enqueue 3 messages to ``TestSession``
     such that 2 are from a session named ``Change Manager`` and 1 is from a
     session named ``Project Manager`` (e.g. use ``jarvis_sendMessage`` twice
     from the CM session and once from the PM session).
     Action: Trigger manual delivery (**Send Messages** on ``TestSession``).
     Expected: The third line of the notification reads
     ``Sender(s): Change Manager, Project Manager`` (or ``Project Manager,
     Change Manager`` depending on sort order) — exactly two distinct names,
     not three (``Change Manager`` is NOT listed twice despite sending 2
     messages). The order may vary; both names must appear exactly once.

   **T-16 — Non-actor source shows meaningful label**
     Setup: Default notification template. Trigger a heartbeat ``queue`` step
     that appends a message to ``TestSession`` with sender ``"Heartbeat"``
     (or equivalent non-actor source label).
     Action: Trigger manual delivery (**Send Messages** on ``TestSession``).
     Expected: The third line reads ``Sender(s): Heartbeat`` — no blank,
     no error, no raw ``${sender}`` literal. The label reflects the actual
     ``sender`` field stored in the queue entry.

   **T-17 — Backward compat — custom template without ${sender} still works**
     Setup: Set ``jarvis.messages.notificationTemplate`` to:
     ``"You have ${count} msgs for ${destination}. Please check in."``
     (no ``${sender}`` in the template). Enqueue 1 message.
     Action: Trigger manual delivery.
     Expected: The chat shows exactly:
     ``You have 1 msgs for TestSession. Please check in.``
     No ``${sender}`` literal appears in the output; no error is raised;
     the ``${count}`` and ``${destination}`` substitutions are unaffected.
