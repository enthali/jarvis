Automation Requirements
=======================

.. req:: Job Definition Schema
   :id: REQ_AUT_JOBCONFIG
   :status: implemented
   :priority: optional
   :links: US_AUT_HEARTBEAT; REQ_CFG_HEARTBEATPATH

   **Description:**
   The extension SHALL read a YAML file that defines named automation jobs.

   **Acceptance Criteria:**

   * AC-1: Each job entry SHALL have a ``name`` (string), a ``schedule`` (5-field cron
     string or ``"manual"``), and a ``steps`` list
   * AC-2: Each step SHALL have a ``type`` (``python`` | ``powershell`` | ``command`` |
     ``agent`` | ``queue``) and a ``run`` value (script path or VS Code command ID;
     omitted for ``agent`` and ``queue`` steps)
   * AC-3: The extension SHALL validate the YAML structure on load and log a parse error
     to the Output Channel if the file is malformed or missing
   * AC-4: Steps of type ``agent`` SHALL have a ``prompt`` field (path to prompt file)
     and an optional ``outputFile`` field (path to write the LLM response) and an
     optional ``append`` field (boolean, default ``false``, append vs. overwrite)
   * AC-5: Steps of type ``queue`` SHALL have a ``destination`` field (target chat tab label)
     and a ``text`` field (message content)
   * AC-6: Any step MAY have an optional ``outputVar`` field (string) naming a
     variable to receive the step's captured output; the name SHALL match
     ``/^[A-Za-z_]\w*$/`` and be validated at load time


.. req:: Scheduler Tick and Cron Dispatch
   :id: REQ_AUT_SCHEDULER
   :status: implemented
   :priority: optional
   :links: US_AUT_HEARTBEAT; REQ_CFG_HEARTBEATINTERVAL

   **Description:**
   The extension SHALL run a background scheduler that evaluates jobs on a configurable
   tick interval.

   **Acceptance Criteria:**

   * AC-1: The scheduler SHALL fire every ``jarvis.heartbeatInterval`` seconds
   * AC-2: On each tick, every job with a cron ``schedule`` SHALL be evaluated against
     the current wall-clock time using standard 5-field minute-resolution cron syntax
   * AC-3: A job whose cron expression matches the current minute SHALL be dispatched
     for execution
   * AC-4: A job SHALL NOT be dispatched again if it already fired within the same
     clock-minute (deduplication via ``lastFired`` timestamp)
   * AC-5: When no jobs match the current tick, no log output is emitted (silent idle)
   * AC-6: The scheduler SHALL expose ``registerJob()`` and ``unregisterJob()``
     methods that persist changes to the heartbeat YAML file (see ``REQ_AUT_JOBREG``)


.. req:: Job Step Execution
   :id: REQ_AUT_JOBEXEC
   :status: implemented
   :priority: optional
   :links: US_AUT_HEARTBEAT; REQ_AUT_OUTPUT; REQ_MSG_QUEUE; REQ_AUT_JOBCONFIG

   **Description:**
   The extension SHALL execute a job's steps sequentially and abort the job on the
   first failure.

   **Acceptance Criteria:**

   * AC-1: Steps of type ``python`` SHALL be executed via a resolved Python interpreter,
     chosen in this priority order (``heartbeat-venv-autodetect`` CR):

     1. ``python.defaultInterpreterPath`` (VS Code Python extension setting), if set
     2. An auto-detected virtual environment relative to the workspace root — checked
        in order: ``.venv/Scripts/python.exe`` (Windows) / ``.venv/bin/python`` (POSIX),
        then ``venv/Scripts/python.exe`` / ``venv/bin/python``
     3. Bare ``python`` on ``PATH`` (last-resort fallback)
   * AC-2: Steps of type ``powershell`` SHALL be executed via a PowerShell process
   * AC-3: Steps of type ``command`` SHALL be executed via
     ``vscode.commands.executeCommand``
   * AC-4: If a step exits with a non-zero exit code or throws an unhandled exception,
     the job SHALL be marked as failed and remaining steps SHALL be skipped
   * AC-5: Steps of type ``agent`` SHALL send the contents of the ``prompt`` file to
     ``vscode.lm`` using the default Copilot model, write the response to ``outputFile``
     (if specified), and log the prompt path, model used, response length, and any
     errors to the Output Channel
   * AC-6: Steps of type ``queue`` SHALL append a message entry (``session`` + ``text``)
     to the persistent message queue file and log the action to the Output Channel
   * AC-7: ``executeJob`` SHALL maintain a ``vars: Record<string, string>`` map per
     job run; before executing each step, all string fields on the step SHALL be
     interpolated against ``vars`` using ``${VAR_NAME}`` syntax; after execution, if
     the step has ``outputVar`` set and produced output, the output SHALL be stored
     in ``vars[step.outputVar]``
   * AC-8: A well-known variable ``LAST_STDERR`` SHALL be overwritten after each
     script step (``python`` / ``powershell``) with the step's captured stderr (most
     recent value only, not accumulated); steps that produce no stderr leave
     ``LAST_STDERR`` unchanged from the prior step


.. req:: Manual Job Trigger
   :id: REQ_AUT_MANUALRUN
   :status: implemented
   :priority: optional
   :links: US_AUT_HEARTBEAT; REQ_AUT_JOBEXEC

   **Description:**
   The extension SHALL provide a VS Code command to run a ``"manual"`` job on demand.

   **Acceptance Criteria:**

   * AC-1: A registered VS Code command (e.g. ``jarvis.runHeartbeatJob``) SHALL allow
     the user to select and execute any job with ``schedule: "manual"``
   * AC-2: The command SHALL present the available manual jobs for selection before
     executing


.. req:: Status Bar Next-Job Display
   :id: REQ_AUT_STATUSBAR
   :status: implemented
   :priority: optional
   :links: US_AUT_HEARTBEAT; REQ_AUT_SCHEDULER

   **Description:**
   The extension SHALL maintain a status bar item showing the soonest upcoming
   scheduled job.

   **Acceptance Criteria:**

   * AC-1: The status bar item SHALL display the name and next fire time of the job
     whose cron schedule fires soonest
   * AC-2: The status bar SHALL update after each scheduler tick
   * AC-3: When no scheduled jobs are configured, the item SHALL display a neutral
     placeholder (e.g. "Heartbeat: idle")


.. req:: Output Channel and Failure Notification
   :id: REQ_AUT_OUTPUT
   :status: implemented
   :priority: optional
   :links: US_AUT_HEARTBEAT; REQ_DEV_LOGGING

   **Description:**
   The extension SHALL route job output to the shared ``LogOutputChannel`` and surface
   job failures as an error notification.

   **Acceptance Criteria:**

   * AC-1: The shared ``LogOutputChannel`` "Jarvis" (created by ``REQ_DEV_LOGGING``)
     SHALL be used for all heartbeat output — no separate channel is created
   * AC-2: All job step output (stdout, stderr) SHALL be written to this channel
   * AC-3: When a job fails, the extension SHALL show a VS Code error notification
     (``vscode.window.showErrorMessage``) containing the job name
   * AC-4: The error notification SHALL also include the failed step type and exit code
     or exception message
   * AC-5: For a failed step whose executable produced captured stderr output
     (``heartbeat-venv-autodetect`` CR), the error notification SHALL also include the
     last few lines (up to 3) of that captured stderr, so the underlying cause (e.g. a
     Python ``ModuleNotFoundError``) is visible without opening the Output Channel


.. req:: Heartbeat Tree View
   :id: REQ_AUT_HEARTBEATVIEW
   :status: implemented
   :priority: optional
   :links: US_AUT_HEARTBEAT; US_EXP_SIDEBAR

   **Description:**
   The extension SHALL provide a tree view in the Jarvis sidebar that visualizes all
   configured heartbeat jobs and their steps.

   **Acceptance Criteria:**

   * AC-1: A view ``jarvisHeartbeat`` with title "Heartbeat" SHALL appear as the 4th
     section in the Jarvis activity bar container
   * AC-2: Each job SHALL be rendered as a collapsible top-level node with the job name
     as label
   * AC-3: The description of each job node SHALL display the next execution time in a
     short local-time format (e.g. ``Mo 08:00`` or ``13.04. 08:00``) computed from the
     cron schedule using the ``cron-parser`` library
   * AC-4: Jobs with ``schedule: "manual"`` SHALL display ``manuell`` as description
   * AC-5: Each job node SHALL expand to show its steps as child nodes
   * AC-6: Step nodes SHALL display ``<type>: <run>`` for script/command steps and
     ``agent → <prompt>`` for agent steps; step nodes are informational only (no actions)
   * AC-7: A ``$(refresh)`` button in the view title SHALL reload ``heartbeat.yaml``
     and refresh the tree (including updated next-run times); the tree SHALL also
     refresh automatically on each scheduler tick


.. req:: Run Single Heartbeat Job
   :id: REQ_AUT_RUNJOB
   :status: implemented
   :priority: optional
   :links: US_AUT_HEARTBEAT; REQ_AUT_JOBEXEC

   **Description:**
   The extension SHALL allow the user to execute any single heartbeat job from the
   tree view via an inline action.

   **Acceptance Criteria:**

   * AC-1: A ``$(play)`` icon SHALL appear as an inline action on each job node
   * AC-2: Clicking the icon SHALL execute the job immediately using the existing
     job execution pipeline
   * AC-3: The command SHALL work for both scheduled and manual jobs
   * AC-4: Upon invocation, the command SHALL immediately display an info notification
     toast with the message ``"Heartbeat '<jobName>' gestartet..."`` before executing
     the job; the toast SHALL NOT block job execution


.. req:: Heartbeat Job Registration API
   :id: REQ_AUT_JOBREG
   :status: implemented
   :priority: optional
   :links: US_AUT_HEARTBEAT; REQ_AUT_JOBCONFIG

   **Description:**
   The heartbeat scheduler SHALL provide a programmatic API to register and
   unregister jobs at runtime.

   **Acceptance Criteria:**

   * AC-1: ``registerJob(job)`` SHALL upsert a job entry in ``heartbeat.yaml``
     by name — overwriting if already present, appending if new
   * AC-2: ``unregisterJob(name)`` SHALL remove a job entry from
     ``heartbeat.yaml`` by name; no-op if not found
   * AC-3: Both methods SHALL write to the YAML file immediately, reload the
     in-memory job list, and refresh the Heartbeat tree view
   * AC-4: The YAML file is the single source of truth — no RAM-only jobs


.. req:: Pause and Resume Heartbeat Jobs
   :id: REQ_AUT_PAUSE
   :status: approved
   :priority: optional
   :links: US_AUT_HEARTBEAT

   **Description:**
   The extension SHALL allow the user to temporarily disable ("pause") a heartbeat
   job and re-enable ("resume") it without removing the job from ``heartbeat.yaml``.

   **Acceptance Criteria:**

   * AC-1: An active job node in the Heartbeat tree SHALL display a ``$(debug-pause)``
     inline button; clicking it pauses the job
   * AC-2: When paused, the scheduler SHALL skip the job on every tick (no dispatch,
     no cron evaluation)
   * AC-3: The paused state SHALL be persisted in ``heartbeat.yaml`` as
     ``enabled: false``; it survives an extension restart
   * AC-4: A paused job node SHALL display a ``$(debug-continue)`` (resume) inline
     button; clicking it SHALL re-enable the job (set ``enabled: true`` or remove
     the field) **and** immediately execute the job once via the existing execution
     pipeline
   * AC-5: The existing ``$(play)`` manual-run button SHALL remain visible on
     active job nodes AND on paused job nodes (independent of pause state); on
     paused nodes the Pause button SHALL NOT be shown (it is replaced by the
     Resume button)


.. req:: List Jobs LM+MCP Tool
   :id: REQ_AUT_LISTJOBS_TOOL
   :status: approved
   :priority: optional
   :links: US_AUT_HEARTBEAT; REQ_AUT_JOBREG

   **Description:**
   The extension SHALL expose a ``jarvis_listJobs`` tool (available via both the
   VS Code Language Model Tool API and the embedded MCP server) that returns a
   snapshot of all currently registered heartbeat jobs.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept no input parameters
   * AC-2: The tool SHALL return an array of job descriptors, each containing:

     - ``name`` (string): the job's unique name
     - ``schedule`` (string): the cron expression or ``"manual"``
     - ``enabled`` (boolean): ``true`` if ``job.enabled !== false``, otherwise ``false``
     - ``nextFire`` (string | null): ISO 8601 timestamp of the next scheduled
       execution, or ``null`` for paused jobs (``enabled === false``) or
       jobs with ``schedule === "manual"``

   * AC-3: The tool SHALL be registered via the shared ``registerDualTool()``
     helper so that it is available over both the LM API and MCP simultaneously
   * AC-4: The ``nextFire`` timestamp SHALL be computed using ``cron-parser``
     (``CronExpressionParser.parse(schedule).next().toDate().toISOString()``) —
     the same library already used in ``heartbeatTreeProvider.ts``
   * AC-5: If ``cron-parser`` throws (invalid expression), ``nextFire`` SHALL be
     ``null`` rather than propagating an exception

   .. note::
      AC-5 is covered by code inspection only (try/catch around the cron parse
      in ``jobDescriptor``). No dynamic UAT exists because injecting an invalid
      cron expression into ``heartbeat.yaml`` would also break the scheduler
      tick loop, which is out of scope for this change.


.. req:: Heartbeat Queue-Step Destination Validation at Load Time
   :id: REQ_AUT_HEARTBEAT_LOAD_VALIDATION
   :status: implemented
   :priority: optional
   :links: US_AUT_HEARTBEAT_VALIDATION; REQ_AUT_JOBCONFIG; REQ_MSG_DEST_ERROR

   **Description:**
   The extension SHALL validate the ``destination`` field of every ``queue`` step
   when loading ``heartbeat.yaml``, and surface any invalid destinations immediately
   to the user.

   **Acceptance Criteria:**

   * AC-1: After parsing ``heartbeat.yaml``, the extension SHALL check each
     ``queue`` step's ``destination`` against the valid destination set (see
     ``REQ_AUT_HEARTBEAT_RESOLVER_REUSE``); an invalid destination SHALL trigger
     a ``vscode.window.showWarningMessage`` notification and a ``log.warn`` entry
   * AC-2: The warning entry SHALL contain: job name, step index (0-based), and
     the invalid destination value verbatim
   * AC-3: A job containing an invalid destination SHALL still be loaded into the
     scheduler — the warning is informational; the job is NOT paused or removed


.. req:: Queue Step Behavior on Invalid Destination at Fire Time
   :id: REQ_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR
   :status: implemented
   :priority: optional
   :links: US_AUT_HEARTBEAT_VALIDATION; REQ_AUT_JOBEXEC

   **Description:**
   When a scheduled heartbeat job fires and a ``queue`` step has an invalid
   (or since-deleted) destination, the extension SHALL skip that step rather
   than aborting the entire job.

   **Acceptance Criteria:**

   * AC-1: At fire time, ``executeQueueStep`` SHALL re-validate the destination
     against the current valid destination set before appending to the queue
   * AC-2: If the destination is not in the valid set, the step SHALL be skipped:
     no message appended, a ``log.warn`` emitted, and the executor returns
     ``{ success: true }`` so that subsequent steps in the job continue executing
   * AC-3: The skip log entry SHALL contain the invalid destination value and be
     identifiable as a queue-step skip (distinct from a queue-step write success)


.. req:: ``jarvis_registerJob`` Destination Validation
   :id: REQ_AUT_REGISTERJOB_VALIDATION
   :status: implemented
   :priority: optional
   :links: US_AUT_HEARTBEAT_VALIDATION; REQ_AUT_JOBREG; REQ_MSG_DEST_ERROR

   **Description:**
   The ``jarvis_registerJob`` LM/MCP tool SHALL reject any job that contains a
   ``queue`` step with a non-existent destination session, returning a descriptive
   error without persisting the job.

   **Acceptance Criteria:**

   * AC-1: Before calling ``scheduler.registerJob()``, the LM and MCP handlers of
     ``jarvis_registerJob`` SHALL inspect all steps; for each step of type ``queue``,
     the ``destination`` value SHALL be validated against the valid destination set
   * AC-2: If any queue step has an invalid destination, the tool SHALL throw an
     ``Error`` with a message satisfying ``REQ_MSG_DEST_ERROR`` (quoting the invalid
     destination value and listing valid destinations); the job SHALL NOT be written
     to ``heartbeat.yaml``
   * AC-3: If all queue-step destinations are valid (or the job has no queue steps),
     the tool SHALL proceed with registration as before


.. req:: No Regression for Valid Queue-Step Destinations
   :id: REQ_AUT_HEARTBEAT_VALIDATION_NOREGRESSION
   :status: implemented
   :priority: optional
   :links: US_AUT_HEARTBEAT_VALIDATION; REQ_AUT_JOBEXEC; REQ_AUT_JOBREG

   **Description:**
   Validation logic SHALL leave the observable behavior of heartbeat jobs with
   valid ``queue``-step destinations completely unchanged.

   **Acceptance Criteria:**

   * AC-1: A job whose every ``queue`` step has a valid destination SHALL be loaded,
     scheduled, and executed identically to the pre-validation behavior
   * AC-2: ``jarvis_registerJob`` with no invalid queue steps SHALL register the job
     without error or delay
   * AC-3: No additional round-trip delays SHALL be introduced for non-queue steps
     (python, powershell, command, agent)


.. req:: Shared Resolver for Heartbeat Destination Validation
   :id: REQ_AUT_HEARTBEAT_RESOLVER_REUSE
   :status: draft
   :priority: optional
   :links: US_AUT_HEARTBEAT_VALIDATION; REQ_MSG_SESSIONLOOKUP; REQ_MSG_SESSIONFILTER

   **Description:**
   The valid destination set for heartbeat queue-step validation SHALL be derived
   from the same resolver used by ``jarvis_sendToSession``, with no parallel
   implementation.

   **Acceptance Criteria:**

   * AC-1: Heartbeat validation SHALL call the unified destination resolver
     from ``src/sessionLookup.ts`` — the same function used by
     ``SPEC_MSG_SENDTOSESSION``
   * AC-2: No new session-enumeration logic SHALL be introduced; if the resolver
     changes (e.g. new filtering rules), both ``jarvis_sendToSession`` and heartbeat
     validation automatically inherit the change
   * AC-3: The valid destination set is defined as the union of {named VS Code
     chat session titles from ``state.vscdb``} ∪ {YAML entity names from the
     scanner store (sessions, projects, events)}


.. req:: Step Output Variable Capture and Interpolation
   :id: REQ_AUT_STEP_OUTPUT_VARS
   :status: draft
   :priority: optional
   :links: US_AUT_HEARTBEAT; REQ_AUT_JOBEXEC; REQ_AUT_JOBCONFIG

   **Description:**
   The extension SHALL support capturing step output into named variables and
   interpolating those variables into subsequent steps within the same job run.

   **Acceptance Criteria:**

   * AC-1: ``outputVar`` is supported as a capture source on ``python``,
     ``powershell``, and ``agent`` step types; ``queue`` and ``command`` steps
     do not produce capturable output
   * AC-2: Interpolation targets: ``text``, ``run``, ``prompt``, ``outputFile``,
     ``destination``, ``sender`` — any string field on ``HeartbeatStep``
   * AC-3: Variable scope is a single job run — variables do not persist across
     runs or across jobs
   * AC-4: Undefined variable references (``${UNKNOWN}``) are left as-is (no
     hard failure), matching the ``applyTemplate()`` convention
   * AC-5: ``outputVar`` names SHALL be validated at load time; names not matching
     ``/^[A-Za-z_]\w*$/`` SHALL log a warning and be ignored
   * AC-6: Whenever a variable is captured (filled), the extension SHALL log the
     variable name and the step that set it to the Output Channel at ``info`` level
   * AC-7: The variable store is strictly internal to the job execution — no
     reading from OS environment variables as fallback, no injection into OS
     environment of child processes; scripts may use real env vars independently
     but that is outside this feature's scope
