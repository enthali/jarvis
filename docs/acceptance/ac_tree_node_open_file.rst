Tree Node Open File Acceptance Criteria
=======================================

These criteria validate click-to-navigate on Heartbeat Job nodes
(``US_AUT_HEARTBEATTREE``) and Message nodes (``US_MSG_TREE``) of the Jarvis
Explorer.

**Setup:** Use the testdata workspace in an Extension Development Host. The
heartbeat file ``.jarvis/heartbeat.yaml`` must define at least one job and the
message queue file ``.jarvis/messages/queue.json`` must hold at least two queued
messages. ``testdata/heartbeat/heartbeat.yaml`` defines the job
``t1-cron-sentinel`` and can be copied to ``.jarvis/heartbeat.yaml``; the
``testdata/.jarvis`` files hold no job (``jobs: []``) and no message (``[]``)
yet, so the tester adds them before the run.

.. ac:: Clicking Heartbeat Job and Message nodes opens the file at the entry
   :id: AC_EXP_OPENFILE_JOURNEY
   :status: approved
   :validates: US_AUT_HEARTBEATTREE; US_MSG_TREE

   **Given** the Heartbeat view lists the job ``t1-cron-sentinel`` and the
   Messages view lists at least two messages

   1. **When** I single-click the ``t1-cron-sentinel`` job node
      **Then** ``heartbeat.yaml`` opens in the editor with the cursor on the line
      that contains ``name: t1-cron-sentinel``, and no error notification or
      dialog appears.
   2. **When** I single-click the first message node and then the second message
      node
      **Then** each click opens ``queue.json`` and positions the cursor at the
      entry of the clicked message; the position for the second message is
      visibly different from the first, and no error notification or dialog
      appears.
