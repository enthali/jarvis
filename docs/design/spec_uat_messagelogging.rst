Message Logging UAT Design Specifications
==========================================

.. spec:: Message Logging Test Data and Expected Outcomes
   :id: SPEC_UAT_MSG_LOGGING_FILES
   :status: draft
   :links: REQ_UAT_MSG_LOGGING_TESTDATA; REQ_UAT_MSG_LOGGING_OUTCOMES; SPEC_MSG_AUDITLOG; SPEC_MSG_LOGSETTING

   **Description:**
   All test scenarios use the Extension Development Host with the existing
   ``testdata/msg/`` messages folder. No permanent new test data files are
   required; ``message-log.json`` is created and removed by the tester within
   each scenario.

   **Test data:**

   * Uses the configured messages folder (``jarvis.messages.folder`` pointing to
     ``testdata/msg/`` or equivalent)
   * Uses the ``jarvis_sendToSession`` LM tool via a Copilot chat session to
     enqueue messages
   * ``message-log.json`` is created at runtime by the extension when logging is
     enabled — the tester deletes it between scenarios

   **Expected test outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (Setting default)
        - Search "jarvis.messages.logging" in Settings UI
        - Checkbox present, default = unchecked (false)
      * - T-2 (No log when disabled)
        - Send message with logging=false
        - No ``message-log.json`` file in messages folder
      * - T-3 (Log created when enabled)
        - Send message with logging=true
        - ``message-log.json`` created, contains the sent message
      * - T-4 (QueuedMessage format)
        - Inspect ``message-log.json`` after T-3
        - JSON array; entry has ``id``, ``session``, ``content``, ``timestamp``
          fields matching ``messages.json`` schema
      * - T-5 (Read/delete does not modify log)
        - Read then delete the queued message; re-inspect log
        - ``message-log.json`` entry count and content unchanged
      * - T-6 (Second message appends)
        - Send a second message; inspect log
        - ``message-log.json`` has two entries; first entry intact
