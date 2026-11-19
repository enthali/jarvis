Message Audit Log Acceptance Criteria
=====================================

Manual procedure for the audit log of the Messaging module, executed by the User in an
Extension Development Host on the ``testdata`` workspace, as one journey in one sitting.
The audit log is the file ``log.json`` in ``<workspace>/.jarvis/messages/``, next to the
inbox ``queue.json``; no permanent ``log.json`` is part of the test data, so the tester
deletes it before the journey. Messages are queued from the chat of the Actor
``TestSender`` with ``jarvis_sendMessage`` (session ``TestTarget``) or with the job
``t8-queue-message`` of ``testdata/heartbeat/heartbeat.yaml``. A result that could not be
observed is recorded NOT RUN, not PASS.

.. ac:: Message logging is on by default and appends every message; the log is never shortened, and switching logging off stops it
   :id: AC_MSGLOG_JOURNEY
   :status: approved
   :validates: US_MSG_LOGGING

   **Given** the setting ``jarvis.messages.logging`` untouched, no ``log.json`` in
   ``<workspace>/.jarvis/messages/``, and the chats of ``TestSender`` and ``TestTarget``
   open and idle

   1. **When** the tester searches for ``jarvis.messages.logging`` in the Settings editor,
      has ``TestSender`` send two messages to ``TestTarget``, and notes the content of
      ``log.json``
      **Then** the setting is listed as a checkbox that is checked, ``log.json`` appears
      after the first send and contains both messages after the second.

   2. **When** the tester has ``TestTarget`` receive the first message with
      ``jarvis_receiveMessage`` and deletes the second with the trash icon in the Messages
      view
      **Then** ``log.json`` is unchanged.

   3. **When** the tester has ``TestSender`` send a third message
      **Then** ``log.json`` contains the first two entries intact followed by the new one.

   4. **When** the tester unchecks ``jarvis.messages.logging`` and has ``TestSender`` send
      a fourth message
      **Then** the send succeeds and ``log.json`` still ends with the third entry.
