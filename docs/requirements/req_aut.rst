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
   :links: US_AUT_HEARTBEAT; REQ_AUT_OUTPUT; REQ_MSG_QUEUE

   **Description:**
   The extension SHALL execute a job's steps sequentially and abort the job on the
   first failure.

   **Acceptance Criteria:**

   * AC-1: Steps of type ``python`` SHALL be executed via the workspace Python interpreter
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
