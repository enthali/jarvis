Agent Prompt Tuning UAT Requirements
======================================

.. req:: Init Prompt Template UAT Requirements
   :id: REQ_UAT_APT_INITPROMPT
   :status: implemented
   :priority: required
   :links: US_UAT_APT_INITPROMPT; REQ_EXP_AGENTPROMPT_TEMPLATE; SPEC_EXP_AGENTSESSION_INITPROMPT

   **Description:**
   The configurable agent session init prompt — default content, placeholder
   substitution, user override, empty-string fallback, unknown-placeholder
   pass-through, and multi-kind coverage — SHALL be verifiable through manual
   test scenarios T-1 through T-6.

   **Test Data Requirements:**

   * Extension Development Host running ``testdata/test.code-workspace``.
   * For T-3: Workspace Settings override
     ``jarvis.agentSession.initPromptTemplate`` =
     ``"Role: ${kind} ${name}. Memory: ${contextPath}."``
   * For T-4: Workspace Settings override
     ``jarvis.agentSession.initPromptTemplate`` = ``""`` (empty string).
   * For T-5: Workspace Settings override
     ``jarvis.agentSession.initPromptTemplate`` =
     ``"Hi ${name}, unknown=${nope}."``
   * For T-6: A project entity created via **Jarvis: New Entity → Project**
     in the Extension Development Host.
   * After each scenario the workspace setting must be reset (deleted or
     restored to default) before proceeding to the next scenario.

   **Acceptance Criteria:**

   * AC-1: With no workspace override the auto-opened chat SHALL contain the
     absolute path of ``context.md`` in backticks, a "Use only" sentence, bullets
     labelled Decision / Finding / Next, and a sentence containing "2 weeks" (T-1).
   * AC-2: The three documented placeholders ``${kind}``, ``${name}``, and
     ``${contextPath}`` SHALL be replaced; no ``${...}`` literal SHALL remain for
     these three (T-2).
   * AC-3: A non-empty override template SHALL be rendered verbatim after
     substitution, with no fallback to the built-in default (T-3).
   * AC-4: An empty override template SHALL cause the built-in default to be
     rendered, not an empty message (T-4).
   * AC-5: A placeholder not in the documented set SHALL be left unchanged in the
     rendered output (T-5).
   * AC-6: The prompt SHALL work for ``kind=project``; the default template SHALL
     render with ``kind`` = ``project`` and the correct project name (T-6).
   * AC-7: A test verifies that the default init prompt contains the
     extract-overflow bullet (verbatim wording) as the last item of the
     "Keep it minimal and action-oriented" discipline list (T-7).

   **Test Scenario T-7 — Extract-overflow bullet presence:**

   1. Default template active (no workspace override).
   2. Create session via **Jarvis: Open Agent Session** on any entity.
   3. Verify the auto-opened chat contains the bullet text
      ``- When a topic grows past ~5 bullets, move it to a dedicated file beside
      `context.md` and leave a one-line summary with a relative link in
      `context.md`.`` as the last item of the "Keep it minimal and
      action-oriented" list.


.. req:: Notification Template UAT Requirements
   :id: REQ_UAT_APT_NOTIFICATION
   :status: implemented
   :priority: required
   :links: US_UAT_APT_NOTIFICATION; REQ_MSG_NOTIFICATION_TEMPLATE; SPEC_MSG_SENDCOMMAND; SPEC_MSG_AUTODELIVER_POLL

   **Description:**
   The configurable auto-delivery notification template — English default content,
   manual and automatic delivery paths, user override, empty-string fallback, and
   unknown-placeholder pass-through — SHALL be verifiable through manual test
   scenarios T-7 through T-11.

   **Test Data Requirements:**

   * A session named ``TestSession`` reachable from the Messages tree in the
     Extension Development Host.
   * For T-7 / T-8 / T-10 / T-11: ``jarvis.messages.notificationTemplate``
     is unset (default) or ``""`` (T-10).
   * For T-8: ``TestSession`` added to auto-delivery (context-action
     **Enable Auto-Delivery**); ``notified:true`` flag visible in the queue JSON
     file after delivery.
   * For T-9: Workspace Settings override
     ``jarvis.messages.notificationTemplate`` =
     ``"You have ${count} msgs for ${destination}."``
   * For T-11: Workspace Settings override
     ``jarvis.messages.notificationTemplate`` = ``"Hi ${count} ${unknown}"``
   * After each scenario reset the setting and remove enqueued messages before
     proceeding.

   **Acceptance Criteria:**

   * AC-1: The manual deliver-now path SHALL display the English default notification
     with ``count`` and ``destination`` substituted correctly (T-7).
   * AC-2: The auto-delivery 5-second poll SHALL display the same English default
     notification and mark the message ``notified:true`` (T-8).
   * AC-3: A non-empty override template SHALL be rendered verbatim after
     substitution (T-9).
   * AC-4: An empty override template SHALL cause the built-in English default to
     be rendered (T-10).
   * AC-5: An unknown placeholder SHALL be left unchanged in the rendered output
     (T-11).


.. req:: Settings UI Visibility UAT Requirements
   :id: REQ_UAT_APT_CFG
   :status: implemented
   :priority: required
   :links: US_UAT_APT_INITPROMPT; US_UAT_APT_NOTIFICATION; SPEC_CFG_MANIFEST

   **Description:**
   Both new settings SHALL appear in the correct settings groups in the VS Code
   Settings UI with readable descriptions and the correct default values, verifiable
   through test scenarios T-12 and T-13.

   **Test Data Requirements:**

   * Extension Development Host running with no workspace override for either
     template setting.

   **Acceptance Criteria:**

   * AC-1: Searching ``jarvis prompt template`` in the Settings UI SHALL display
     ``jarvis.agentSession.initPromptTemplate`` in the **Sessions** (Agent Session)
     group with the disciplined English default as the placeholder / default
     value (T-12).
   * AC-2: Searching ``jarvis notification template`` in the Settings UI SHALL
     display ``jarvis.messages.notificationTemplate`` in the **Messages** group
     with the English default notification text as the placeholder / default
     value (T-13).
