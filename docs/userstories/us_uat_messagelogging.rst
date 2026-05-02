Message Logging User Acceptance Tests
======================================

.. story:: Message Audit Log Acceptance Tests
   :id: US_UAT_MSG_LOGGING
   :status: draft
   :priority: mandatory
   :links: US_MSG_LOGGING

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the message audit log feature,
   **so that** I can verify that the ``jarvis.messages.logging`` setting controls
   whether messages are appended to ``message-log.json`` without affecting queue
   semantics.

   **Acceptance Criteria:**

   * AC-1: Test scenarios cover the ``jarvis.messages.logging`` setting (default false)
   * AC-2: Test scenarios verify that logging=false produces no log file
   * AC-3: Test scenarios verify that logging=true creates and appends to the log file
   * AC-4: Test scenarios verify log file format matches ``QueuedMessage`` schema
   * AC-5: Test scenarios verify that read/delete operations do not modify the log file
   * AC-6: Test scenarios verify that a second message appends rather than overwrites

   **Test Scenarios:**

   **T-1 — Setting visible with default false**
     Setup: Open VS Code Settings (``Ctrl+,``).
     Action: Search for ``jarvis.messages.logging``.
     Expected: Setting is listed with a checkbox, default value is unchecked (false).

   **T-2 — No log file when logging=false**
     Setup: Ensure ``jarvis.messages.logging`` is false (default). Delete any
     existing ``message-log.json`` from the messages folder.
     Action: Use the ``jarvis_sendToSession`` LM tool to send a message to a session.
     Expected: No ``message-log.json`` file is created in the messages folder.

   **T-3 — Log file created when logging=true**
     Setup: Set ``jarvis.messages.logging`` to true. Ensure no ``message-log.json``
     exists.
     Action: Use ``jarvis_sendToSession`` to send a message.
     Expected: ``message-log.json`` is created in the messages folder and contains
     the sent message.

   **T-4 — Log file format matches QueuedMessage**
     Setup: ``jarvis.messages.logging`` is true. Send one message.
     Action: Open ``message-log.json`` and inspect its contents.
     Expected: File is a JSON array; each entry has the same fields as entries in
     ``messages.json`` (``id``, ``session``, ``content``, ``timestamp``, etc.).

   **T-5 — Read/delete does not modify log file**
     Setup: ``jarvis.messages.logging`` is true. Send one message, note the contents
     of ``message-log.json``.
     Action: Use the ``jarvis_readMessage`` LM tool to read the message, then
     ``deleteMessage`` to delete it.
     Expected: ``message-log.json`` is unchanged — same content as before the
     read/delete.

   **T-6 — Second message appends to existing log**
     Setup: ``jarvis.messages.logging`` is true. Send a first message so
     ``message-log.json`` exists with one entry.
     Action: Send a second message via ``jarvis_sendToSession``.
     Expected: ``message-log.json`` now contains two entries; the first entry is
     preserved intact.
