Reminders Acceptance Criteria
=============================

The time-scheduled reminders of the Messaging module: the tools
``jarvis_setReminder`` and ``jarvis_cancelReminder``, the Reminders view and the
file ``reminders.yaml``, executed by the User in an Extension Development Host.

**Setup:** the Actor ``TestTarget`` exists as a test fixture and its chat is open
(click its node in the ACTORS view). An agent chat is open for the tool calls.
No further test data is needed; every reminder is created by a tool call. The
tester computes ``deliverAt`` values with
``new Date(Date.now() + N * 1000).toISOString()`` and deletes or empties
``<workspace root>/.jarvis/reminders.yaml`` before the first run to start clean.

.. ac:: Journey: a reminder is set and delivered, a second one is opened and cancelled
   :id: AC_REMINDERS_JOURNEY
   :status: approved
   :validates: US_MSG_REMINDERS

   **Given** ``TestTarget`` set to auto-delivery, the Reminders view visible in
   the Jarvis sidebar and ``reminders.yaml`` empty

   1. **When** the tester has the agent call
      ``jarvis_setReminder({ text: "T-1 test reminder", session: "TestTarget", deliverAt: "<now+30s ISO>" })``
      and waits until ``deliverAt`` has passed
      **Then** a node for the reminder appears in the Reminders view; within 5 s
      of ``deliverAt`` the message ``T-1 test reminder`` is delivered to
      ``TestTarget`` and the node is gone from the Reminders view.
   2. **When** the tester has the agent call
      ``jarvis_setReminder({ text: "T-2 test reminder", session: "TestTarget", deliverAt: "<now+5min ISO>" })``
      and clicks the new reminder node
      **Then** ``reminders.yaml`` opens in the editor with the cursor on the line
      ``id: <uuid>`` of the clicked reminder, and no warning appears.
   3. **When** the tester has the agent call
      ``jarvis_cancelReminder({ id: "<id of T-2>" })``
      **Then** the node of ``T-2 test reminder`` disappears from the Reminders
      view.

.. ac:: A pending reminder survives a window reload and is delivered when due
   :id: AC_REMINDERS_SURVIVE_RELOAD
   :status: approved
   :validates: US_MSG_REMINDERS

   **Given** a reminder for ``TestTarget`` with ``deliverAt`` two minutes in the
   future, shown in the Reminders view, and ``TestTarget`` set to auto-delivery
   **When** the tester runs ``Developer: Reload Window`` and waits until
   ``deliverAt`` has passed
   **Then** after the reload the Reminders view still shows the reminder, and at
   ``deliverAt`` the message is delivered to ``TestTarget`` as in step 1 of
   ``AC_REMINDERS_JOURNEY``.
