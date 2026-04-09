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
