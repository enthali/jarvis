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
