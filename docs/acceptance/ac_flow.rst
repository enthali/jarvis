Message Flow Diagram Acceptance Criteria
========================================

Manual procedure for the message-flow chord diagram of the add-on ``enthali.jarvis-flow``
(Flow module), executed by the User in an Extension Development Host that loads the
core and ``enthali.jarvis-flow`` on ``testdata/test.code-workspace``, as two journeys.
The diagram reads the audit log ``<workspace>/.jarvis/messages/log.json`` and needs
``jarvis.messages.logging`` on. Two fixtures in ``testdata/messages/`` replace the log:
``message-log-flow-sample.json`` (six entries between ``Change Manager`` and
``Dev Engineer``, spread over several weeks) and ``message-log-flow-cap.json`` (520
entries, the oldest 20 involve the sender ``old-only-sender`` that appears in no other
entry). To use a fixture the tester copies it over ``log.json`` and keeps a copy of the
original. New messages for the live steps come from the job ``t8-queue-message`` of
``testdata/heartbeat/heartbeat.yaml``, run with ``Jarvis: Run Heartbeat Job``; they add
the node ``TestTarget``. A result that could not be observed is recorded NOT RUN, not
PASS.

.. ac:: The diagram opens as one tab, explains a missing log, draws Actors and messages, and a click on an Actor node shows its chat
   :id: AC_FLOW_VIEW_JOURNEY
   :status: approved
   :validates: US_FLOW_CHORDVIEW

   **Given** ``jarvis.messages.logging`` never enabled, no ``log.json`` in
   ``<workspace>/.jarvis/messages/``, and the Messages view of the Jarvis Explorer
   visible

   1. **When** the tester clicks the diagram icon in the title bar of the Messages view
      **Then** a "Message Flow" editor tab opens next to the other tabs, the Messages
      view keeps showing its tree, and the diagram shows an empty state that explains that
      message logging must be enabled to fill it, and no error is shown.

   2. **When** the tester runs ``Jarvis: Open Message Flow`` from the Command Palette
      **Then** the command focuses that tab without opening a second "Message Flow" tab.

   3. **When** the tester enables ``jarvis.messages.logging``, copies
      ``message-log-flow-sample.json`` over ``log.json``, closes the "Message Flow" tab,
      opens the diagram again, and hovers the edge from ``Dev Engineer`` to
      ``Change Manager``
      **Then** ``Change Manager`` and ``Dev Engineer`` are nodes on a circle, a
      directional edge connects them for each direction, edges of older messages are
      fainter than those of recent ones without becoming invisible, and the tooltip
      shows the message count (3), the earliest and latest time, and a sample of one
      message text.

   4. **When** the tester runs the job ``t8-queue-message`` (messages to ``TestTarget``),
      has ``TestSender`` send a message to ``Test2`` while ``Test2`` has no chat, waits
      until the nodes ``TestTarget`` and ``Test2`` are in the diagram (closing and
      reopening the diagram if they do not appear), clicks ``TestTarget`` with its chat
      tab open, clicks it again with that tab closed, and then clicks ``Test2``
      **Then** the open chat tab of ``TestTarget`` is shown, the closed chat opens, and
      clicking ``Test2`` does nothing.

.. ac:: The lens shows the most recent messages, moves live, and a new message shows up without a manual refresh
   :id: AC_FLOW_LENS_JOURNEY
   :status: approved
   :validates: US_FLOW_CHORDVIEW

   **Given** ``jarvis.messages.logging`` enabled, ``message-log-flow-cap.json`` copied over
   ``log.json``, and the diagram open and visible with the default lens, showing no node
   ``TestTarget``

   1. **When** the tester looks at the two lens handles, clicks the "+30" button next to
      the lens, and then drags the end handle beyond its former position
      **Then** the start handle is at rank 1 and the end handle at rank 30; right after
      "+30" the displayed window looks unchanged, and dragging the end handle further now
      reaches older messages (ranks 31 to 60).

   2. **When** the tester runs the job ``t8-queue-message`` once and waits about five
      seconds
      **Then** the node ``TestTarget`` and its edge appear without any action in the
      diagram, and the start handle stays at rank 1 on the new latest message.

   3. **When** the tester drags the start handle to rank 5 and then the end handle to
      another rank, and then runs the job ``t8-queue-message`` three to five times and
      waits for the diagram to pick them up
      **Then** during each drag a tooltip shows the timestamp of the message at the handle
      and the window and the fading update while the handle moves; after the new messages
      the number shown at the start handle has grown (for example from 5 to 8) while the
      near edge of the window stays at the same message and does not visibly jump.
