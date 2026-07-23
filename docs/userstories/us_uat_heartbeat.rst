Heartbeat User Acceptance Tests
================================

.. story:: Heartbeat Scheduler Acceptance Tests
   :id: US_UAT_HEARTBEAT
   :status: implemented
   :priority: optional
   :links: US_AUT_HEARTBEAT; US_CFG_HEARTBEAT; US_MSG_CHATQUEUE

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
   * AC-6: At least one test verifies the 3-tier ``python`` interpreter resolution
     order (``python.defaultInterpreterPath`` → auto-detected ``.venv``/``venv`` →
     bare ``python``), including precedence when more than one tier is available
     (``heartbeat-venv-autodetect`` CR)
   * AC-7: The job-failure test (AC-3) also verifies that captured stderr output
     (up to the last 3 lines) is included in the failure toast when the failing
     step produced any (``heartbeat-venv-autodetect`` CR)
   * AC-8 (``heartbeat-step-output-vars`` CR): A test verifies basic output
     variable chaining: a script step with ``outputVar`` captures stdout; a
     subsequent step that references ``${VAR}`` receives the substituted value
     (T-19).
   * AC-9 (``heartbeat-step-output-vars`` CR): A test verifies agent step
     ``outputVar`` capture: agent response text captured into a variable and
     correctly interpolated in a later step (T-20).
   * AC-10 (``heartbeat-step-output-vars`` CR): A test verifies ``LAST_STDERR``
     tracks only the most recent script step's stderr and is overwritten by each
     new script step (T-21).
   * AC-11 (``heartbeat-step-output-vars`` CR): A test verifies that an undefined
     variable reference ``${UNKNOWN}`` is left as-is in the output, with no
     crash or job failure (T-22).
   * AC-12 (``heartbeat-step-output-vars`` CR): A test verifies that variables do
     not persist across separate job runs (T-23).
   * AC-13 (``heartbeat-step-output-vars`` CR): A test verifies that captured
     variable fills are logged at info level in the Output Channel (T-24).
   * AC-14 (``heartbeat-step-output-vars`` CR): A test verifies that ``outputVar``
     on a ``queue`` or ``command`` step is silently ignored — no variable is set,
     no error (T-25).

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

   **T-3 — Python step uses configured interpreter (tier 1: defaultInterpreterPath)**
     Setup: ``heartbeat.yaml`` with a Python step that imports a third-party package
     present only in the workspace venv; ``python.defaultInterpreterPath`` points to
     that venv.
     Action: Trigger the job (schedule ``* * * * *``).
     Expected: Step succeeds; package import resolves; output visible in channel.

   **T-4 — Job failure triggers toast**

     * (a) No stderr output.
       Setup: ``heartbeat.yaml`` with a PowerShell step that calls ``exit 1``
       without writing to stderr.
       Action: Wait for tick.
       Expected: Error toast shows job name, step type, and exit code only (no
       stderr tail appended — none was captured); Output Channel logs the failure;
       subsequent steps (if any) are skipped.
     * (b) With captured stderr (``heartbeat-venv-autodetect`` CR).
       Setup: ``heartbeat.yaml`` with a Python step whose script prints several
       lines to stderr (more than 3) then exits non-zero (e.g. simulates a
       ``ModuleNotFoundError`` traceback).
       Action: Trigger the job.
       Expected: Error toast shows job name, step type, and exit code, followed by
       the **last 3 lines** of captured stderr (earlier lines are not shown — the
       ring buffer is bounded); Output Channel logs the full stderr stream in full
       at debug level; subsequent steps (if any) are skipped.

   **T-8 — Python interpreter auto-detection (tiers 2 & 3) and precedence**
     Setup: ``python.defaultInterpreterPath`` unset (empty string counts as unset).

     * (a) Workspace root contains only a ``.venv/`` folder with the interpreter and
       the test package installed.
       Action: Trigger a Python step importing the test package.
       Expected: Step succeeds; printed ``sys.executable`` resolves inside ``.venv``.
     * (b) Workspace root contains **both** ``.venv/`` and ``venv/`` folders (test
       package installed in ``venv`` only, not in ``.venv``).
       Action: Trigger the same step.
       Expected: ``.venv`` still takes precedence — the import fails (package not in
       ``.venv``), demonstrating tier-2 ordering (``.venv`` checked before ``venv``).
     * (c) Neither ``.venv/`` nor ``venv/`` exists at the workspace root.
       Action: Trigger the same step.
       Expected: Bare ``python`` on ``PATH`` is used (tier 3 fallback); printed
       ``sys.executable`` resolves to the system interpreter, not a workspace venv.

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
   :links: US_AUT_HEARTBEAT

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
   :links: US_AUT_HEARTBEAT; US_CFG_PROJECTPATH

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

   **T-19 — Basic output variable chaining: script → subsequent step**
     Setup: Add a manual heartbeat job with two steps:
     step 1 — ``powershell`` (or ``python``), ``outputVar: MY_VAR``, script
     that prints a known string (e.g. ``echo "hello-from-step1"``);
     step 2 — ``queue`` or ``command`` (to a valid destination) with its
     ``text``/``run`` field containing ``"prefix-${MY_VAR}-suffix"``.
     Action: Run the job via ``Jarvis: Run Heartbeat Job``.
     Expected: Step 1 executes and stdout is captured. Step 2's field shows
     ``"prefix-hello-from-step1-suffix"`` at execution time. No
     ``${MY_VAR}`` literal remains in the delivered text. No error.

   **T-20 — Agent step outputVar capture**
     Setup: Add a manual job with two steps:
     step 1 — ``agent``, ``outputVar: AGENT_REPLY``, ``prompt`` asking for a
     deterministic one-word answer (e.g. ``"Reply with only the word: hello"``);
     step 2 — ``queue`` step, ``text: "Agent said: ${AGENT_REPLY}"``.
     Action: Run the job.
     Expected: Step 2 delivers the message with the agent's response text
     substituted for ``${AGENT_REPLY}`` — e.g. ``"Agent said: hello"``.

   **T-21 — LAST_STDERR tracks only most recent script step**
     Setup: Add a manual job with three steps:
     step 1 — ``powershell``, script writes ``"stderr-1"`` to stderr;
     step 2 — ``powershell``, script writes ``"stderr-2"`` to stderr;
     step 3 — ``queue`` step, ``text: "Last error: ${LAST_STDERR}"``.
     Action: Run the job.
     Expected: Step 3 delivers ``"Last error: stderr-2"`` — the first
     step's stderr has been overwritten. No ``"stderr-1"`` appears in the
     delivered text.

   **T-22 — Undefined variable reference left as-is (no crash)**
     Setup: Add a manual job with one step:
     ``queue`` step, ``text: "val=${UNDEFINED_VAR}"``.
     No step sets ``UNDEFINED_VAR``.
     Action: Run the job.
     Expected: The message ``"val=\${UNDEFINED_VAR}"`` is delivered literally
     — the placeholder is NOT substituted. No error toast, no job failure.

   **T-23 — Variable scope: does not persist across job runs**
     Setup: Use the T-19 job (step 1 sets ``MY_VAR``).
     Action: Run the job once (variables are set). Run the job a second time.
     Expected: On the second run, step 1 re-executes and sets ``MY_VAR``
     fresh. Variables are NOT carried over from the first run. Both runs
     produce identical results. To verify isolation: modify the T-19 job to
     remove step 1 between runs; on the second run ``${MY_VAR}`` should
     appear literally (undefined), confirming the first run's vars are gone.

   **T-24 — Variable capture logged at info level**
     Setup: Use the T-19 job (step 1 has ``outputVar: MY_VAR``).
     Ensure the Jarvis Output Channel is open.
     Action: Run the job.
     Expected: The Jarvis Output Channel shows an info-level log entry
     confirming the variable capture, e.g. containing ``MY_VAR`` and the
     step type (e.g. ``"set by powershell step"``). No error entries for
     the capture itself.

   **T-25 — outputVar on queue/command step is silently ignored**
     Setup: Add a manual job with two steps:
     step 1 — ``queue`` step with ``outputVar: QUEUE_OUT`` (invalid for this
     type), ``destination`` a valid actor, ``text: "test"``;
     step 2 — ``command`` step with ``outputVar: CMD_OUT`` (also invalid),
     ``run: workbench.action.showCommands``.
     After both steps, add a third ``queue`` step with
     ``text: "${QUEUE_OUT}-${CMD_OUT}"``.
     Action: Run the job.
     Expected: Steps 1 and 2 execute normally without error. Neither
     ``QUEUE_OUT`` nor ``CMD_OUT`` is set (silently ignored). Step 3
     delivers the text ``"\${QUEUE_OUT}-\${CMD_OUT}"`` literally (both
     undefined). No error, no crash.
