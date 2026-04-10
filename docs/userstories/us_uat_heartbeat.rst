Heartbeat User Acceptance Tests
================================

.. story:: Heartbeat Scheduler Acceptance Tests
   :id: US_UAT_HEARTBEAT
   :status: implemented
   :priority: optional
   :links: US_AUT_HEARTBEAT; US_CFG_HEARTBEAT; US_MSG_CHATQUEUE; REQ_AUT_JOBCONFIG; REQ_AUT_SCHEDULER; REQ_AUT_JOBEXEC; REQ_AUT_MANUALRUN; REQ_AUT_STATUSBAR; REQ_AUT_OUTPUT; REQ_CFG_HEARTBEATPATH; REQ_CFG_HEARTBEATINTERVAL

   **As a** Jarvis Test Engineer,
   **I want** a set of manual acceptance test scripts for the heartbeat scheduler,
   **so that** I can verify the feature end-to-end before release.

   **Acceptance Criteria:**

   * AC-1: A ``testdata/heartbeat/`` folder contains YAML job definitions covering
     scheduled jobs, manual jobs, and all five step types (python, powershell, command,
     agent, queue)
   * AC-2: Test scripts document the expected observable outcome for each scenario
     (Output Channel content, status bar text, toast notification)
   * AC-3: At least one test covers job failure (non-zero exit) and verifies the
     error toast and Output Channel log
   * AC-4: At least one test verifies that changing ``jarvis.heartbeatInterval`` at
     runtime causes the scheduler to restart with the new interval
   * AC-5: At least one test covers the ``agent`` step type — sends a prompt to
     ``vscode.lm`` and verifies the response is written to an output file

   **Test Scenarios:**

   **T-1 — Scheduled job runs on cron tick**
     Setup: ``heartbeat.yaml`` with one job, schedule ``* * * * *`` (every minute),
     step type ``powershell``, run a script that writes a sentinel file.
     Action: Wait for next clock-minute.
     Expected: Sentinel file created; Output Channel shows step output; status bar
     shows the job name and next fire time.

   **T-2 — Manual job via command palette**
     Setup: ``heartbeat.yaml`` with one job, schedule ``"manual"``, step type
     ``command``, run ``workbench.action.showCommands``.
     Action: Run ``Jarvis: Run Heartbeat Job`` from command palette; select the job.
     Expected: Command palette opens (command executed); no cron tick required.

   **T-3 — Python step uses active venv**
     Setup: ``heartbeat.yaml`` with a Python step that imports a third-party package
     present only in the workspace venv; ``python.defaultInterpreterPath`` points to
     that venv.
     Action: Trigger the job (schedule ``* * * * *``).
     Expected: Step succeeds; package import resolves; output visible in channel.

   **T-4 — Job failure triggers toast**
     Setup: ``heartbeat.yaml`` with a PowerShell step that calls ``exit 1``.
     Action: Wait for tick.
     Expected: Error toast appears with job name and exit code; Output Channel logs
     the failure; subsequent steps (if any) are skipped.

   **T-5 — Config file override via setting**
     Setup: Place ``heartbeat.yaml`` at an arbitrary absolute path; set
     ``jarvis.heartbeatConfigFile`` to that path.
     Action: Reload window / wait for next tick.
     Expected: Jobs from the override path are loaded and scheduled.

   **T-6 — Interval change restarts scheduler**
     Setup: Running scheduler with ``jarvis.heartbeatInterval = 60``.
     Action: Change setting to ``10`` in VS Code settings.
     Expected: Scheduler restarts; next tick fires within ~10 seconds.

   **T-7 — Agent step sends prompt and writes response**
     Setup: ``heartbeat.yaml`` with a manual job, step type ``agent``,
     ``prompt: prompts/hello.md``, ``outputFile: agent-response.txt``.
     Action: Run ``Jarvis: Run Heartbeat Job`` → select job.
     Expected: Output Channel logs prompt path, model ID, and response length;
     ``testdata/heartbeat/agent-response.txt`` is created with the LLM response.


.. story:: Heartbeat Tree View Acceptance Tests
   :id: US_UAT_HEARTBEATVIEW
   :status: implemented
   :priority: optional
   :links: US_AUT_HEARTBEAT; REQ_AUT_HEARTBEATVIEW; REQ_AUT_RUNJOB

   **As a** Jarvis Test Engineer,
   **I want** a set of manual acceptance test scripts for the heartbeat tree view,
   **so that** I can verify the sidebar visualization and job actions before release.

   **Acceptance Criteria:**

   * AC-1: Test scripts verify that the Heartbeat view appears as the 4th section in
     the Jarvis sidebar
   * AC-2: Test scripts verify job nodes display name and next execution time
   * AC-3: Test scripts verify step nodes display type and run/prompt information
   * AC-4: Test scripts verify the play button executes a single job
   * AC-5: Test scripts verify the refresh button reloads the configuration
   * AC-6: Test scripts verify that the tree refreshes automatically on scheduler tick

   **Test Scenarios:**

   **T-9 — Heartbeat view shows all jobs**
     Setup: ``heartbeat.yaml`` with at least one scheduled and one manual job.
     Action: Open the Jarvis sidebar; expand the Heartbeat section.
     Expected: All jobs from ``heartbeat.yaml`` appear as tree nodes. Scheduled jobs
     show next fire time (e.g. ``Mo 08:00``). Manual jobs show ``manuell``.

   **T-10 — Job node expands to show steps**
     Setup: ``heartbeat.yaml`` with a multi-step job.
     Action: Click the expand arrow on a job node.
     Expected: Child nodes show step type and run target (e.g. ``powershell: scripts/report.ps1``,
     ``agent → prompts/standup.md``).

   **T-11 — Play button runs a single job**
     Setup: ``heartbeat.yaml`` with a manual job (e.g. ``t2-manual-show-output``).
     Action: Click the ``$(play)`` inline icon on the job node.
     Expected: The job executes; Output Channel shows step output.

   **T-12 — Refresh reloads configuration**
     Setup: Modify ``heartbeat.yaml`` while VS Code is running (add a new job).
     Action: Click the ``$(refresh)`` icon in the Heartbeat view title bar.
     Expected: The new job appears in the tree; next execution times are updated.

   **T-13 — Cyclic refresh updates next-run times**
     Setup: Observe a job's next-run time in the tree.
     Action: Wait for one scheduler tick (or set ``jarvis.heartbeatInterval`` to 10 s).
     Expected: The next-run time description updates automatically without clicking
     refresh.


.. story:: Heartbeat Job Registration Acceptance Tests
   :id: US_UAT_JOBREG
   :status: approved
   :priority: optional
   :links: US_AUT_HEARTBEAT; REQ_AUT_JOBREG; REQ_CFG_SCANINTERVAL

   **As a** Jarvis Test Engineer,
   **I want** a set of manual acceptance test scripts for the heartbeat job
   registration API and scanner-heartbeat integration,
   **so that** I can verify that modules can register and unregister heartbeat jobs
   and that the scanner uses the heartbeat system for periodic rescans.

   **Acceptance Criteria:**

   * AC-1: Test scripts verify that ``registerJob`` creates or updates an entry in
     ``heartbeat.yaml`` and the tree view refreshes
   * AC-2: Test scripts verify that ``unregisterJob`` removes an entry from
     ``heartbeat.yaml`` and the tree view refreshes
   * AC-3: Test scripts verify the scanner registers a ``"Jarvis: Rescan"`` heartbeat
     job when ``scanInterval > 0``
   * AC-4: Test scripts verify that ``scanInterval = 0`` disables automatic scanning
     (no heartbeat job registered)
   * AC-5: Test scripts verify that changing ``scanInterval`` at runtime re-registers
     or unregisters the rescan job

   **Test Scenarios:**

   **T-14 — registerJob creates entry in heartbeat.yaml**
     Setup: Extension running; set ``jarvis.heartbeatConfigFile`` to a known path;
     ``jarvis.scanInterval`` = 2.
     Action: Reload window.
     Expected: ``heartbeat.yaml`` contains a ``"Jarvis: Rescan"`` job with schedule
     ``*/2 * * * *`` and a ``command`` step running ``jarvis.rescan``. The job appears
     in the Heartbeat tree view.

   **T-15 — registerJob upserts existing entry**
     Setup: ``scanInterval`` = 2; ``"Jarvis: Rescan"`` job already in
     ``heartbeat.yaml``.
     Action: Change ``jarvis.scanInterval`` to 5 in VS Code settings.
     Expected: ``heartbeat.yaml`` now has ``"Jarvis: Rescan"`` with schedule
     ``*/5 * * * *``. Only one entry with that name exists (no duplicates). Tree
     view reflects the new schedule.

   **T-16 — unregisterJob removes entry**
     Setup: ``scanInterval`` = 2; ``"Jarvis: Rescan"`` job present.
     Action: Change ``jarvis.scanInterval`` to 0.
     Expected: ``"Jarvis: Rescan"`` job is removed from ``heartbeat.yaml``. Job
     disappears from the Heartbeat tree view.

   **T-17 — Rescan fires via heartbeat**
     Setup: ``scanInterval`` = 1 (every minute); ``heartbeatInterval`` = 10.
     Action: Modify a project YAML file; wait for the next cron fire.
     Expected: The sidebar updates with the changed data (rescan fired via heartbeat).
     Output Channel shows the ``jarvis.rescan`` command step executing.

   **T-18 — scanInterval 0 disables automatic scanning**
     Setup: ``scanInterval`` = 0.
     Action: Start extension; check ``heartbeat.yaml``.
     Expected: No ``"Jarvis: Rescan"`` job registered. Scanner performs the initial
     scan only. No periodic rescans occur (sidebar does not update after modifying
     a YAML file, until manual rescan).
