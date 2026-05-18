Heartbeat Pause/Resume UAT Design Specifications
=================================================

.. spec:: Heartbeat Pause/Resume Test Data
   :id: SPEC_UAT_HEARTBEAT_PAUSE_TESTDATA
   :status: approved
   :links: REQ_UAT_HEARTBEAT_PAUSE_TESTDATA

   **Description:**
   Test data for T-1..T-6 is provided by the existing
   ``testdata/heartbeat/heartbeat.yaml``. Use the job ``t1-cron-sentinel``
   (schedule ``*/5 * * * *``) as the primary test subject.

   .. list-table::
      :header-rows: 1
      :widths: 20 80

      * - Job name
        - Purpose
      * - ``t1-cron-sentinel``
        - Scheduled (cron) job for T-1..T-6; active by default
          (no ``enabled`` field in YAML).

   **Pre-condition for all tests:**

   * ``jarvis.heartbeatConfigFile`` is set to
     ``<workspace>/testdata/heartbeat/heartbeat.yaml``.
   * The Jarvis sidebar is open and the **Heartbeat** section is visible.
   * The Extension Development Host has been started via **F5**.


.. spec:: Heartbeat Pause/Resume Test Procedures
   :id: SPEC_UAT_HEARTBEAT_PAUSE_PROCEDURES
   :status: approved
   :links: REQ_UAT_HEARTBEAT_PAUSE_TESTS

   **Description:**
   Manual step-by-step procedures for T-1..T-6.

   **T-1 — Active job shows Pause and Play buttons**

   .. list-table::
      :header-rows: 1
      :widths: 10 45 45

      * - Step
        - Action
        - Expected result
      * - 1
        - Open the Jarvis sidebar; locate ``t1-cron-sentinel`` in the
          Heartbeat section.
        - Node is visible with a cron next-run description.
      * - 2
        - Hover over the ``t1-cron-sentinel`` node.
        - Two inline icon buttons appear: ``$(debug-pause)`` (Pause) and
          ``$(play)`` (Play).

   **T-2 — Pause button pauses the job**

   .. list-table::
      :header-rows: 1
      :widths: 10 45 45

      * - Step
        - Action
        - Expected result
      * - 1
        - With ``t1-cron-sentinel`` active, click the ``$(debug-pause)``
          inline icon.
        - Tree node description updates to show ``⏸``; node now shows
          ``$(play)`` (Run) and ``$(debug-continue)`` (Resume) inline
          buttons (Pause button is gone).
      * - 2
        - Open ``testdata/heartbeat/heartbeat.yaml`` in the editor.
        - The ``t1-cron-sentinel`` entry contains ``enabled: false``.

   **T-3 — Paused state survives reload**

   .. list-table::
      :header-rows: 1
      :widths: 10 45 45

      * - Step
        - Action
        - Expected result
      * - 1
        - With job paused from T-2, run **Developer: Reload Window** from
          the Command Palette.
        - Extension host restarts; Jarvis sidebar reloads.
      * - 2
        - Locate ``t1-cron-sentinel`` in the Heartbeat section.
        - Node still shows paused style (``$(play)`` + ``$(debug-continue)``
          buttons; description shows ``⏸``).

   **T-4 — Resume runs the job immediately**

   .. list-table::
      :header-rows: 1
      :widths: 10 45 45

      * - Step
        - Action
        - Expected result
      * - 1
        - With ``t1-cron-sentinel`` paused, click the ``$(debug-continue)``
          inline icon.
        - Output Channel ``Jarvis`` shows a run entry for
          ``t1-cron-sentinel`` with a completion timestamp.
      * - 2
        - Observe the tree node after the run completes.
        - Node returns to active style (both Pause and Play buttons
          visible; no ``⏸`` in description).
      * - 3
        - Open ``testdata/heartbeat/heartbeat.yaml`` in the editor.
        - ``enabled`` field is ``true`` or absent for
          ``t1-cron-sentinel``.

   **T-5 — Scheduler skips paused job**

   .. list-table::
      :header-rows: 1
      :widths: 10 45 45

      * - Step
        - Action
        - Expected result
      * - 1
        - Pause ``t1-cron-sentinel`` (via T-2). Note the current time.
          Set ``jarvis.heartbeatInterval`` to ``10`` (seconds) if not
          already low.
        - Job is in paused state; scheduler is running.
      * - 2
        - Wait for the next cron tick (up to ~5 minutes for
          ``*/5 * * * *``).
        - Output Channel ``Jarvis`` does NOT show a new run entry for
          ``t1-cron-sentinel`` during that tick.
      * - 3
        - Verify sentinel file (``testdata/heartbeat/sentinel.txt``) has
          NOT been updated since the pause.
        - File timestamp is unchanged.

   **T-6 — Manual Play button on active job unchanged**

   .. list-table::
      :header-rows: 1
      :widths: 10 45 45

      * - Step
        - Action
        - Expected result
      * - 1
        - Ensure ``t1-cron-sentinel`` is in active state (resume via T-4
          if necessary).
        - Node shows both Pause and Play buttons.
      * - 2
        - Hover over ``t1-cron-sentinel``; click the ``$(play)``
          (Play) button.
        - Job executes once immediately; Output Channel shows the run;
          ``enabled`` state in YAML is unchanged.

   **T-7 — Manual Play button on paused job (independent of pause state)**

   .. list-table::
      :header-rows: 1
      :widths: 10 45 45

      * - Step
        - Action
        - Expected result
      * - 1
        - Pause ``t1-cron-sentinel`` (via T-2). Node now shows ``$(play)``
          and ``$(debug-continue)`` inline buttons.
        - Node is paused; ``enabled: false`` in YAML.
      * - 2
        - Click the ``$(play)`` (Run) button on the paused node.
        - Job executes once immediately; Output Channel shows the run.
      * - 3
        - Inspect the tree node and YAML after the run.
        - Node is still in paused state (``$(play)`` + ``$(debug-continue)``
          buttons; ``⏸`` indicator); ``enabled: false`` unchanged in YAML
          (manual run does NOT auto-resume).
