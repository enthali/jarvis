Message Logging UAT Requirements
==================================

.. req:: Message Logging Test Data
   :id: REQ_UAT_MSG_LOGGING_TESTDATA
   :status: draft
   :priority: mandatory
   :links: US_UAT_MSG_LOGGING; REQ_MSG_LOGSETTING; REQ_MSG_AUDITLOG

   **Description:**
   The workspace SHALL provide sufficient test infrastructure for manual
   verification of the message audit log feature.

   **Acceptance Criteria:**

   * AC-1: A configured messages folder exists so that ``jarvis_sendToSession``
     can queue messages during testing
   * AC-2: No permanent ``message-log.json`` file exists in the test data —
     the tester creates and removes it as part of each scenario
   * AC-3: The ``jarvis.messages.logging`` VS Code setting is accessible
     in the Extension Development Host settings UI


.. req:: Message Logging Expected Outcomes
   :id: REQ_UAT_MSG_LOGGING_OUTCOMES
   :status: draft
   :priority: mandatory
   :links: US_UAT_MSG_LOGGING; REQ_MSG_AUDITLOG

   **Description:**
   Expected outcomes for each test scenario (T-1 through T-6) SHALL be
   documented in the test protocol so that the tester can pass or fail each
   scenario without ambiguity.

   **Acceptance Criteria:**

   * AC-1: Each scenario specifies the exact file system observable (file
     present / absent, entry count, field names)
   * AC-2: T-4 specifies the required JSON fields for a valid ``QueuedMessage``
     entry
   * AC-3: T-5 specifies how the tester can confirm the log file is unchanged
     (e.g. compare byte count or entry count before and after)
