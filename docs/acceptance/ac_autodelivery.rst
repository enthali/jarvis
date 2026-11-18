Auto Delivery Acceptance Criteria
=================================

Manual procedure for automatic delivery of the Messaging module, executed by the
User in an Extension Development Host on the ``testdata`` workspace, as one journey in
one sitting. The inbox and the list of Actors with automatic delivery are the files
``queue.json`` and ``autodelivery.json`` in ``<workspace>/.jarvis/messages/``. To queue
a message for the Actor ``TestTarget``, run ``Jarvis: Run Heartbeat Job`` and select the
job ``t8-queue-message`` of ``testdata/heartbeat/heartbeat.yaml``. The delay between a
queued message and its announcement is not specified; the tester records what is
observed. A result that could not be observed is recorded NOT RUN, not PASS.

.. ac:: A node moves between manual and automatic delivery, and delivery announces in the chat without touching tabs or focus
   :id: AC_AUTODELIVERY_JOURNEY
   :status: approved
   :validates: US_COM_DELIVERY

   **Given** the Messages view in the Jarvis Explorer with no Actor registered for
   automatic delivery (``autodelivery.json`` absent or empty), one message queued for
   ``TestTarget`` so that the node ``TestTarget`` is in the manual root, and the chat of
   ``TestTarget`` closed in every column

   1. **When** the tester expands the view, right-clicks ``TestTarget``, chooses
      "Enable Direct Delivery", and runs ``Developer: Reload Window``
      **Then** an "Auto Delivery" group node is visible from the start, the node moves
      into that group right after "Enable Direct Delivery" without a manual rescan and is
      still in the group after the reload.

   2. **When** the tester opens two editor columns (an Actor chat in column 1,
      ``context.md`` in column 2), focuses ``README.md`` in one of them, runs the job
      ``t8-queue-message`` and waits for the announcement, and repeats this with the
      integrated terminal focused instead of ``README.md``
      **Then** no tab for ``TestTarget`` opens, no editor column is added, and the focus
      stays in ``README.md`` and in the terminal respectively the whole time.

   3. **When** the tester clicks the node ``TestTarget`` to open its chat
      **Then** the announcements of step 2 are visible in the chat.

   4. **When** the tester keeps the chat of ``TestTarget`` open, focused and idle, runs
      the job ``t8-queue-message`` without pressing Play, and waits one minute
      **Then** the chat shows an announcement of the waiting message without Play,
      although its tab has the focus.

   5. **When** the tester queues a further message, waits for its announcement and
      presses Play on the node ``TestTarget``
      **Then** the chat shows one announcement after Play, without an error.

   6. **When** the tester right-clicks ``TestTarget`` in the "Auto Delivery" group and
      chooses "Disable Direct Delivery"
      **Then** the node moves back into the manual root.
