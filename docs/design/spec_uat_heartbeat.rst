Heartbeat UAT Design Specifications
=====================================

.. spec:: Heartbeat Test Data File Set
   :id: SPEC_UAT_HEARTBEAT_FILES
   :status: approved
   :links: REQ_UAT_HEARTBEAT_TESTDATA; SPEC_UAT_MSG_FILES

   **Description:**
   The repo SHALL contain the following test data under ``testdata/heartbeat/``.
   Every queue step targets the ``TestTarget`` Actor fixture
   (``SPEC_UAT_MSG_FILES``); the checked-in ``heartbeat.yaml`` still targets
   ``Test Session`` and is updated as implementation work of
   ``retire-legacy-actor-kinds``.

   **testdata/heartbeat/**

   .. list-table::
      :header-rows: 1
      :widths: 40 60

      * - File
        - Purpose
      * - ``heartbeat.yaml``
        - Job definitions for T-1..T-4, T-7, T-8, and T-8-queue-message (cron,
          manual command, python, fail, agent, queue)
      * - ``scripts/write-sentinel.ps1``
        - T-1: PowerShell step; writes sentinel.txt to verify cron dispatch
      * - ``scripts/venv-check.py``
        - T-3, T-8: Python step; prints ``sys.executable`` to verify interpreter
          resolution (tier-1 configured path, and tier-2/tier-3 auto-detection —
          ``heartbeat-venv-autodetect`` CR)
      * - ``scripts/fail-exit1.ps1``
        - T-4(a): PowerShell step; exits with code 1 and no stderr output, to
          trigger a plain (no-tail) failure toast
      * - ``scripts/fail-with-stderr.py``
        - T-4(b): Python step; prints more than 3 lines to stderr then exits
          non-zero, to verify the bounded stderr tail in the failure toast
          (``heartbeat-venv-autodetect`` CR)
      * - ``prompts/hello.md``
        - T-7: Prompt file sent to vscode.lm agent step

   **Output variable test entries in heartbeat.yaml (T-19–T-25):**

   .. code-block:: yaml

      - name: T-19 Output Var Chain
        schedule: manual
        steps:
          - type: powershell
            run: scripts/print-hello.ps1
            outputVar: MY_VAR
          - type: queue
            destination: "TestTarget"
            text: "prefix-${MY_VAR}-suffix"

      - name: T-21 LAST_STDERR Chain
        schedule: manual
        steps:
          - type: powershell
            run: scripts/write-stderr-1.ps1   # writes "stderr-1" to stderr
          - type: powershell
            run: scripts/write-stderr-2.ps1   # writes "stderr-2" to stderr
          - type: queue
            destination: "TestTarget"
            text: "Last error: ${LAST_STDERR}"

      - name: T-22 Undefined Var
        schedule: manual
        steps:
          - type: queue
            destination: "TestTarget"
            text: "val=${UNDEFINED_VAR}"

   Additional test scripts required under ``testdata/heartbeat/scripts/``:
   ``print-hello.ps1`` (prints ``hello-from-step1``), ``write-stderr-1.ps1``
   (writes ``stderr-1`` to stderr, exits 0), ``write-stderr-2.ps1``
   (writes ``stderr-2`` to stderr, exits 0).

   **Interpreter auto-detection setup (T-8, not checked into the repo):**
   ``.venv/`` and ``venv/`` folders are created/removed by the tester directly
   under the workspace root for the duration of T-8(a)/(b)/(c) — they are
   environment-specific and intentionally excluded from ``testdata/``.


   **Queue step test entry in heartbeat.yaml** (destination is the
   ``TestTarget`` Actor fixture, ``SPEC_UAT_MSG_FILES``):

   .. code-block:: yaml

      - name: T-8 Queue Message
        schedule: manual
        steps:
          - type: queue
            destination: "TestTarget"
            text: "Hello from heartbeat queue step"


.. spec:: Heartbeat Tree View UAT Procedures
   :id: SPEC_UAT_HEARTBEATVIEW_PROCEDURES
   :status: implemented
   :links: REQ_UAT_HEARTBEATVIEW_TESTS

   **Description:**
   Manual test procedures for the heartbeat tree view using the existing
   ``testdata/heartbeat/heartbeat.yaml`` test data.

   **T-9 — Heartbeat view shows all jobs:**

   1. Set ``jarvis.heartbeatConfigFile`` to ``testdata/heartbeat/heartbeat.yaml``
   2. Open the Jarvis sidebar
   3. Verify the "Heartbeat" section appears as the 4th view
   4. Verify all 6 jobs from the test YAML appear as nodes
   5. Verify ``t1-cron-sentinel`` shows a next-run time (e.g. ``Mo 08:00``)
   6. Verify ``t2-manual-show-output`` shows ``manuell``

   **T-10 — Job node expands to show steps:**

   1. Click the expand arrow on ``t1-cron-sentinel``
   2. Verify child node shows ``powershell: scripts/write-sentinel.ps1``
   3. Click the expand arrow on ``t7-agent-hello``
   4. Verify child node shows ``agent → prompts/hello.md``

   **T-11 — Play button runs a single job:**

   1. Hover over ``t2-manual-show-output`` node
   2. Click the ``$(play)`` inline icon
   3. Verify the Output toggle panel opens (the command triggers
      ``workbench.action.output.toggleOutput``)

   **T-12 — Refresh reloads configuration:**

   1. Add a new job entry to ``testdata/heartbeat/heartbeat.yaml``
   2. Click the ``$(refresh)`` icon in the Heartbeat view title bar
   3. Verify the new job appears in the tree

   **T-13 — Cyclic refresh updates next-run times:**

   1. Observe a job's next-run time description in the tree
   2. Wait for one scheduler tick (default 60 s) or set ``jarvis.heartbeatInterval``
      to 10 s for faster feedback
   3. Verify the next-run time description updates automatically without manual
      refresh


.. spec:: Job Registration UAT Procedures
   :id: SPEC_UAT_JOBREG_PROCEDURES
   :status: approved
   :links: REQ_UAT_JOBREG_TESTS; SPEC_AUT_JOBREG

   **Description:**
   Manual test procedures for the heartbeat job registration API and the
   background Actor rescan.

   **T-14 — registerJob creates entry in heartbeat.yaml:**

   1. Call ``jarvis_registerJob`` with name ``"UAT: Probe"``, schedule
      ``*/5 * * * *`` and one step ``{ type: command, run: jarvis.rescan }``
   2. Open ``.jarvis/heartbeat.yaml`` and verify the ``"UAT: Probe"`` entry
   3. Open the Heartbeat tree view and verify the job appears

   **T-15 — registerJob upserts existing entry:**

   1. With ``"UAT: Probe"`` present, call ``jarvis_registerJob`` again for it
      with schedule ``*/10 * * * *``
   2. Verify exactly one ``"UAT: Probe"`` entry with ``*/10 * * * *``
   3. Verify the Heartbeat tree view shows the updated schedule

   **T-16 — unregisterJob removes entry:**

   1. Call ``jarvis_unregisterJob`` for ``"UAT: Probe"``
   2. Verify the entry is removed from ``heartbeat.yaml`` and the tree view

   **T-17 — Background rescan without heartbeat job:**

   1. Set ``jarvis.scanInterval = 1`` and ``jarvis.heartbeat.enabled = false``
   2. Change the ``summary`` of an Actor's ``actor.yaml``
   3. Wait up to 60 s
   4. Verify the Actor's tooltip in the ACTORS view shows the new summary
   5. Verify ``heartbeat.yaml`` contains no ``"Jarvis: Rescan"`` job

   **T-18 — scanInterval 0 and leftover cleanup:**

   1. Add a ``"Jarvis: Rescan"`` job to ``heartbeat.yaml`` by hand; set
      ``jarvis.scanInterval = 0`` and ``jarvis.heartbeat.enabled = true``
   2. Reload the VS Code window
   3. Verify ``heartbeat.yaml`` no longer contains ``"Jarvis: Rescan"``
   4. Change an Actor's ``summary``; wait 2 minutes; verify the tooltip does
      NOT update
   5. Click the ACTORS ``$(refresh)`` button; verify the tooltip now updates

   **T-19 — Basic output variable chaining (``heartbeat-step-output-vars`` CR):**

   1. Add (or use) the ``T-19 Output Var Chain`` job from heartbeat.yaml
   2. Run the job via ``Jarvis: Run Heartbeat Job``
   3. In the Messages tree, expand ``TestTarget`` and inspect the queued message
   4. Verify the delivered text is ``"prefix-hello-from-step1-suffix"`` (not
      ``"prefix-${MY_VAR}-suffix"``)
   5. Verify no ``[WARN]`` or ``[ERROR]`` in the Output Channel about variables

   **T-20 — Agent step outputVar capture (``heartbeat-step-output-vars`` CR):**

   1. Add a manual job: step 1 = ``agent`` with ``prompt: prompts/hello.md``
      and ``outputVar: AGENT_REPLY``; step 2 = ``queue`` step with
      ``text: "Agent said: ${AGENT_REPLY}"``
   2. Run the job
   3. Verify the delivered queue message contains the agent's response text
      substituted for ``${AGENT_REPLY}``

   **T-21 — LAST_STDERR tracks most recent script step (``heartbeat-step-output-vars`` CR):**

   1. Add (or use) the ``T-21 LAST_STDERR Chain`` job
   2. Run the job
   3. Inspect the delivered queue message
   4. Verify ``"Last error: stderr-2"`` is delivered — ``stderr-1`` from step 1
      has been overwritten

   **T-22 — Undefined variable reference left as-is (``heartbeat-step-output-vars`` CR):**

   1. Add (or use) the ``T-22 Undefined Var`` job
   2. Run the job
   3. Inspect the delivered queue message
   4. Verify the text ``"val=\${UNDEFINED_VAR}"`` is delivered literally —
      no substitution, no error, no job failure

   **T-23 — Variable scope: no persistence across runs (``heartbeat-step-output-vars`` CR):**

   1. Run the T-19 job once successfully (``MY_VAR`` is set during that run)
   2. Temporarily remove step 1 from the job (or rename its ``outputVar``)
   3. Run the job again
   4. Verify step 2's delivered text is ``"prefix-\${MY_VAR}-suffix"`` (literal) —
      confirming the first run's variable did not persist
   5. Restore the job to its original state

   **T-24 — Variable capture logged at info level (``heartbeat-step-output-vars`` CR):**

   1. Run the T-19 job with the Jarvis Output Channel open
   2. After the job completes, inspect the Output Channel
   3. Verify at least one info-level entry references ``MY_VAR`` and identifies
      the step type that set it (e.g. ``"set by powershell step"``)

   **T-25 — outputVar on queue/command step silently ignored (``heartbeat-step-output-vars`` CR):**

   1. Add a manual job: step 1 = ``queue`` step with ``outputVar: QUEUE_OUT``;
      step 2 = ``command`` step with ``outputVar: CMD_OUT``;
      step 3 = ``queue`` step with ``text: "${QUEUE_OUT}-${CMD_OUT}"``
   2. Run the job
   3. Verify steps 1 and 2 execute normally without error
   4. Verify step 3 delivers ``"\${QUEUE_OUT}-\${CMD_OUT}"`` literally
      (neither variable was set by non-script steps)
   5. Verify no error, no crash
