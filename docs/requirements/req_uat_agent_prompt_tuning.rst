Agent Prompt Tuning UAT Requirements
======================================


.. req:: Notification Template UAT Requirements
   :id: REQ_UAT_APT_NOTIFICATION
   :status: approved
   :priority: required
   :links: US_UAT_APT_NOTIFICATION; REQ_MSG_NOTIFICATION_TEMPLATE; SPEC_MSG_SENDCOMMAND; SPEC_MSG_AUTODELIVER_POLL

   **Description:**
   The configurable auto-delivery notification template — English default content,
   manual and automatic delivery paths, user override, empty-string fallback, and
   unknown-placeholder pass-through — SHALL be verifiable through manual test
   scenarios T-7 through T-11.

   **Test Data Requirements:**

   * An Actor named ``TestSession`` (test fixture) reachable from the Messages
     tree in the Extension Development Host; messages are enqueued with
     ``jarvis_sendMessage`` from existing Actors.
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
   * AC-6: A ``${sender}`` placeholder in the default template SHALL be replaced
     by the comma-separated, de-duplicated list of sender names from the pending
     message batch. When messages come from a single sender the list is that
     sender's name; when from multiple distinct senders it is a comma-joined
     string with no duplicates (T-15).
   * AC-7: Messages from non-actor sources (e.g. ``sender="Heartbeat"``) SHALL
     produce a meaningful label in the ``${sender}`` position — the raw
     ``sender`` field value, not a blank or error (T-16).
   * AC-8: A custom override template that omits ``${sender}`` SHALL render
     correctly with no error and no dangling placeholder literal (T-17).


.. req:: Settings UI Visibility UAT Requirements
   :id: REQ_UAT_APT_CFG
   :status: implemented
   :priority: required
   :links: US_UAT_APT_NOTIFICATION; SPEC_CFG_MANIFEST

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
