Heartbeat Pause/Resume User Acceptance Tests
=============================================

.. story:: Heartbeat Pause/Resume Acceptance Tests
   :id: US_UAT_HEARTBEAT_PAUSE
   :status: approved
   :priority: optional
   :links: US_AUT_HEARTBEAT

   **As a** Jarvis Test Engineer,
   **I want** a set of manual acceptance test scripts for the heartbeat
   pause/resume feature,
   **so that** I can verify that jobs can be paused and resumed without
   deleting them from ``heartbeat.yaml``.

   **Acceptance Criteria:**

   * AC-1: A test verifies that an active job shows both a Pause button
     (``$(debug-pause)``) and a Play button (``$(play)``) as inline
     actions in the tree.
   * AC-2: A test verifies that clicking Pause changes the job to paused state:
     the tree shows only a Start button, and ``heartbeat.yaml`` contains
     ``enabled: false``.
   * AC-3: A test verifies that a paused job survives an extension reload
     (``enabled: false`` persisted in YAML).
   * AC-4: A test verifies that clicking the Start button on a paused job
     resumes it (``enabled: true`` or field absent) and immediately triggers
     a single run.
   * AC-5: A test verifies that the scheduler does NOT fire a paused job on
     a cron tick.
   * AC-6: A test verifies that the existing manual Play button on an active
     (non-paused) job still works unchanged.
   * AC-7: A test verifies that the manual Play button is also available on
     paused job nodes and triggers a one-shot run without changing the pause
     state.

   **Test Scenarios:**

   **T-1 — Active job shows Pause and Play buttons**
     Setup: ``heartbeat.yaml`` has a job with no ``enabled`` field (defaults
     to active).
     Action: Open the Jarvis sidebar → Heartbeat section; hover over the job node.
     Expected: Two inline icon buttons visible — ``$(debug-pause)`` (Pause) and
     ``$(play)`` (Play).

   **T-2 — Pause button pauses the job**
     Setup: Active job from T-1.
     Action: Click the ``$(debug-pause)`` inline icon.
     Expected: Tree node switches to paused style (Pause button gone; Play
     ``$(play)`` and Resume ``$(debug-continue)`` buttons visible; description
     shows ``⏸``); ``heartbeat.yaml`` contains ``enabled: false`` for that job.

   **T-3 — Paused state survives reload**
     Setup: Job paused from T-2 (``enabled: false`` in YAML).
     Action: Run ``Developer: Reload Window`` (or restart Extension Development
     Host).
     Expected: After reload, the job node still shows paused style.

   **T-4 — Resume runs the job immediately**
     Setup: Paused job from T-3.
     Action: Click the ``$(debug-continue)`` (Resume) inline icon on the paused node.
     Expected: Job executes once immediately (Output Channel shows the run);
     tree returns to active style (Pause + Play buttons visible);
     ``heartbeat.yaml`` has ``enabled: true`` or the field is absent.

   **T-5 — Scheduler skips paused job**
     Setup: Job paused (``enabled: false``), scheduler running.
     Action: Wait for the next cron tick.
     Expected: Output Channel and log do NOT show a run entry for the paused
     job during that tick.

   **T-6 — Manual Play button on active job unchanged**
     Setup: Any active (non-paused) job.
     Action: Hover over the active job node; click the ``$(play)`` inline
     icon (Play).
     Expected: Job executes once (same behaviour as before this change);
     ``enabled`` state is unchanged.

   **T-7 — Manual Play button on paused job**
     Setup: A paused job (e.g. via T-2).
     Action: Click the ``$(play)`` inline icon on the paused node.
     Expected: Job executes once; the node remains in paused state
     (``$(play)`` + ``$(debug-continue)`` buttons; ``⏸`` indicator);
     ``enabled: false`` in YAML unchanged.
