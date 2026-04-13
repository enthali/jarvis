Heartbeat UAT Design Specifications
=====================================

.. spec:: Heartbeat Test Data File Set
   :id: SPEC_UAT_HEARTBEAT_FILES
   :status: implemented
   :links: REQ_UAT_HEARTBEAT_TESTDATA

   **Description:**
   The repo SHALL contain the following test data under ``testdata/heartbeat/``.

   **testdata/heartbeat/**

   .. list-table::
      :header-rows: 1
      :widths: 40 60

      * - File
        - Purpose
      * - ``heartbeat.yaml``
        - Job definitions for T-1..T-4, T-7, and T-8 (cron, manual command, python,
          fail, agent, queue)
      * - ``scripts/write-sentinel.ps1``
        - T-1: PowerShell step; writes sentinel.txt to verify cron dispatch
      * - ``scripts/venv-check.py``
        - T-3: Python step; prints sys.executable to verify interpreter resolution
      * - ``scripts/fail-exit1.ps1``
        - T-4: PowerShell step; exits with code 1 to trigger failure toast
      * - ``prompts/hello.md``
        - T-7: Prompt file sent to vscode.lm agent step

   **Queue step test entry in heartbeat.yaml:**

   .. code-block:: yaml

      - name: T-8 Queue Message
        schedule: manual
        steps:
          - type: queue
            session: "Test Session"
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
   Manual test procedures for the heartbeat job registration API and scanner
   integration using VS Code settings as the trigger.

   **T-14 — registerJob creates entry in heartbeat.yaml:**

   1. Set ``jarvis.heartbeatConfigFile`` to ``testdata/heartbeat/heartbeat.yaml``
   2. Set ``jarvis.scanInterval`` to ``2``
   3. Reload the VS Code window
   4. Open ``testdata/heartbeat/heartbeat.yaml`` and verify a ``"Jarvis: Rescan"``
      job entry exists with schedule ``*/2 * * * *`` and step
      ``{ type: command, run: jarvis.rescan }``
   5. Open the Heartbeat tree view and verify the ``"Jarvis: Rescan"`` job appears

   **T-15 — registerJob upserts existing entry:**

   1. With ``scanInterval = 2`` and ``"Jarvis: Rescan"`` already in the YAML
   2. Change ``jarvis.scanInterval`` to ``5`` in VS Code settings
   3. Open ``heartbeat.yaml`` and verify the schedule changed to ``*/5 * * * *``
   4. Verify only one ``"Jarvis: Rescan"`` entry exists (no duplicates)
   5. Verify the Heartbeat tree view shows the updated schedule

   **T-16 — unregisterJob removes entry:**

   1. With ``scanInterval = 2`` and ``"Jarvis: Rescan"`` in the YAML
   2. Change ``jarvis.scanInterval`` to ``0``
   3. Open ``heartbeat.yaml`` and verify the ``"Jarvis: Rescan"`` entry is removed
   4. Verify the Heartbeat tree view no longer shows the job

   **T-17 — Rescan fires via heartbeat:**

   1. Set ``scanInterval = 1`` and ``heartbeatInterval = 10``
   2. Modify a project's ``project.yaml`` name field
   3. Wait up to 60 s for the next cron fire
   4. Verify the sidebar reflects the changed name
   5. Check Output Channel "Jarvis Heartbeat" for the command step execution

   **T-18 — scanInterval 0 disables automatic scanning:**

   1. Set ``jarvis.scanInterval`` to ``0``
   2. Reload the VS Code window
   3. Verify ``heartbeat.yaml`` does not contain ``"Jarvis: Rescan"``
   4. Modify a project's ``project.yaml`` name field
   5. Wait 2 minutes; verify the sidebar does NOT update
   6. Click the manual ``$(refresh)`` button; verify the sidebar now updates
