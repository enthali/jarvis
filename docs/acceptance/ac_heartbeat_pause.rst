Heartbeat Pause/Resume Acceptance Criteria
==========================================

Pausing and resuming heartbeat jobs in the Heartbeat view of the Automation
module, executed by the User in an Extension Development Host as one journey.

**Setup:** the heartbeat reads ``<workspace root>/.jarvis/heartbeat.yaml``. The
tester copies ``heartbeat.yaml``, ``prompts/`` and ``scripts/`` from
``testdata/heartbeat/`` into ``<workspace root>/.jarvis/`` (``testdata/.jarvis/``
when the workspace is ``testdata/``) and reloads the window. The test subject is
the job ``t1-cron-sentinel`` (schedule ``*/5 * * * *``, no ``enabled`` field, so
it starts active). The Jarvis sidebar is open with the Heartbeat section
visible.

.. ac:: Journey: pause, scheduler skip, resume and play of a job
   :id: AC_HEARTBEAT_PAUSE_JOURNEY
   :status: approved
   :validates: US_AUT_HEARTBEAT

   **Given** the active job ``t1-cron-sentinel``, whose node shows the inline
   buttons ``$(debug-pause)`` and ``$(play)`` on hover, the Output Channel
   ``Jarvis`` open, and ``jarvis.heartbeatInterval`` set to ``10``

   1. **When** the tester clicks ``$(debug-pause)`` and afterwards runs
      ``Developer: Reload Window``
      **Then** the node shows the paused style (``⏸`` in the description, the
      buttons ``$(play)`` and ``$(debug-continue)``, no ``$(debug-pause)``),
      ``heartbeat.yaml`` contains ``enabled: false`` for the job, and after the
      reload the node is still in the paused style.
   2. **When** the tester waits past the next ``*/5`` cron tick (up to five
      minutes)
      **Then** the Output Channel ``Jarvis`` shows no run of
      ``t1-cron-sentinel``.
   3. **When** the tester clicks ``$(debug-continue)`` on the paused node
      **Then** the Output Channel ``Jarvis`` shows one run of the job with a
      completion timestamp, the node is back in the active style
      (``$(debug-pause)`` and ``$(play)``, no ``⏸``), and ``heartbeat.yaml`` has
      ``enabled: true`` or no ``enabled`` field for the job.
   4. **When** the tester clicks ``$(play)`` on the active node, then pauses the
      job with ``$(debug-pause)`` and clicks ``$(play)`` on the paused node
      **Then** each ``$(play)`` click runs the job once (Output Channel
      ``Jarvis`` shows the run); the active node stays active; the paused node
      stays paused (``⏸``, ``$(play)`` and ``$(debug-continue)``) and
      ``heartbeat.yaml`` still contains ``enabled: false``.
