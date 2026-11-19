Heartbeat Acceptance Criteria
=============================

The heartbeat scheduler, its Heartbeat tree view and the job registration tools
of the Automation module, executed by the User in an Extension Development Host
as four journeys. Each journey is one sitting in which the criteria are walked
through in order.

**Setup:** In the environment running the Extension Development Host, make
sure ``pwsh`` or ``powershell`` is on ``PATH`` and a Python interpreter is
available to Jarvis. The heartbeat reads ``<workspace root>/.jarvis/heartbeat.yaml``
and resolves the ``prompt``, ``run`` and ``outputFile`` paths of its steps relative
to the ``.jarvis`` folder. The tester copies ``heartbeat.yaml``, ``prompts/`` and
``scripts/`` from ``testdata/heartbeat/`` into ``<workspace root>/.jarvis/``
(``testdata/.jarvis/`` when the workspace is ``testdata/``) and reloads the
window once before the first journey. The agent step ``t7-agent-hello`` names
vendor ``copilot`` and model ``gpt-4o``; where the test machine does not offer
that model, the tester replaces both in the copy by a pair listed by
``Jarvis: List Language Models``. Every queue step targets the Actor
``TestTarget``.

.. ac:: Journey: jobs run by cron and by hand, and a failing job is reported
   :id: AC_HEARTBEAT_RUN_JOURNEY
   :status: approved
   :validates: US_AUT_HEARTBEAT

   **Given** the test data in ``.jarvis/`` with the Output Channel ``Jarvis``
   open, the job ``t1-cron-sentinel`` with schedule ``* * * * *`` (every minute)
   and one ``powershell`` step ``scripts/write-sentinel.ps1``, which writes a
   sentinel file, the job ``t2-manual-show-output`` (schedule ``manual``, one
   ``command`` step), and the job ``t4b-fail-with-stderr``, whose Python step
   prints more than three lines to stderr and exits with a non-zero code

   1. **When** the tester waits for the next clock minute
      **Then** the sentinel file exists, the Output Channel ``Jarvis`` shows the
      output of the step, and the status bar shows the job name and its next fire
      time.
   2. **When** the tester runs ``Jarvis: Run Heartbeat Job`` from the command
      palette and selects ``t2-manual-show-output``
      **Then** the job runs without waiting for a cron tick and its command takes
      effect (the Output panel is toggled).
   3. **When** the tester runs ``t4b-fail-with-stderr`` via
      ``Jarvis: Run Heartbeat Job``
      **Then** an error toast shows the job name, the step type, the exit code and
      the last three lines of the stderr output, the Output Channel logs the
      failure, and a following step of the job (if any) does not run.

.. ac:: Journey: an agent step and the output of an earlier step in a later step
   :id: AC_HEARTBEAT_STEPS_JOURNEY
   :status: approved
   :validates: US_AUT_HEARTBEAT; US_AUT_AGENTMODEL

   **Given** the job ``t7-agent-hello`` (``prompt: prompts/hello.md``,
   ``outputFile: agent-response.txt``, ``vendor`` and ``model`` of a model
   listed by ``Jarvis: List Language Models``), and a manual job created by the
   tester whose step 1 is a ``powershell`` step with ``outputVar: MY_VAR``
   running a script that prints ``hello-from-step1``
   (``scripts/print-hello.ps1``, to be created by the tester) and whose step 2
   is a ``queue`` step to ``TestTarget`` with the text
   ``prefix-${MY_VAR}-suffix``

   1. **When** the tester runs ``t7-agent-hello`` via
      ``Jarvis: Run Heartbeat Job``
      **Then** the Output Channel logs the prompt path, the model and the length
      of the response, and ``agent-response.txt`` in the ``.jarvis`` folder
      (where ``heartbeat.yaml`` is) contains the response of the model.
   2. **When** the tester runs the manual job via ``Jarvis: Run Heartbeat Job``
      **Then** the message queued for ``TestTarget`` (Messages view) reads
      ``prefix-hello-from-step1-suffix`` and no ``${MY_VAR}`` placeholder
      remains.

.. ac:: Journey: the Heartbeat view lists, runs and refreshes jobs
   :id: AC_HEARTBEAT_VIEW_JOURNEY
   :status: approved
   :validates: US_AUT_HEARTBEAT

   **Given** the test data with its scheduled jobs (e.g. ``t1-cron-sentinel``)
   and manual jobs (e.g. ``t2-manual-show-output``, ``t7-agent-hello``), and the
   Jarvis sidebar open

   1. **When** the tester expands the Heartbeat section and expands the nodes
      ``t1-cron-sentinel`` and ``t7-agent-hello``
      **Then** every job of ``heartbeat.yaml`` is a node; scheduled jobs show
      their next run time (e.g. ``Mo 08:00``), manual jobs show ``manuell``; the
      step nodes read ``powershell: scripts/write-sentinel.ps1`` and
      ``agent → prompts/hello.md``.
   2. **When** the tester clicks the ``$(play)`` icon on the job node
      ``t2-manual-show-output``
      **Then** an info toast with the job name appears at once and the job runs
      (the Output panel is toggled).
   3. **When** the tester adds a new job to ``.jarvis/heartbeat.yaml`` while VS
      Code is running and clicks the ``$(refresh)`` icon in the Heartbeat view
      title bar
      **Then** the new job appears in the tree and the next run times are up to
      date.

.. ac:: Journey: an agent registers a job, the Actors are rescanned without a job
   :id: AC_HEARTBEAT_REGISTER_JOURNEY
   :status: approved
   :validates: US_AUT_HEARTBEAT; US_ACTOR_TREE

   **Given** the Extension Development Host running, an agent chat open, and the
   Heartbeat view visible

   1. **When** the tester has the agent call ``jarvis_registerJob`` with the job
      ``UAT: Probe`` (schedule ``*/5 * * * *``, one ``command`` step
      ``jarvis.rescan``)
      **Then** ``.jarvis/heartbeat.yaml`` contains the job and the Heartbeat view
      shows it.
   2. **When** the tester has the agent call ``jarvis_registerJob`` again for
      ``UAT: Probe`` with schedule ``*/10 * * * *``
      **Then** the file holds exactly one ``UAT: Probe`` entry with
      ``*/10 * * * *`` and the view shows the new schedule.
   3. **When** the tester has the agent call ``jarvis_unregisterJob`` for
      ``UAT: Probe``
      **Then** the entry is gone from the file and from the view.
   4. **When** the tester sets ``jarvis.scanInterval`` = 1 and
      ``jarvis.heartbeat.enabled`` = ``false``, changes the ``summary`` of an
      Actor in its ``actor.yaml`` and waits one minute
      **Then** the tooltip of that Actor in the ACTORS view shows the new
      summary.
