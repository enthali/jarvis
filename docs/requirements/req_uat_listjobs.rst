List-Jobs Tool UAT Requirements
================================

.. req:: List-Jobs Tool Test Data
   :id: REQ_UAT_LISTJOBS_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_LISTJOBS

   **Description:**
   The ``testdata/heartbeat/heartbeat.yaml`` SHALL contain job definitions
   that cover all observable states of ``jarvis_listJobs``: active cron,
   paused cron, and manual schedule.

   **Acceptance Criteria:**

   * AC-1: ``heartbeat.yaml`` contains ``t1-cron-sentinel`` with schedule
     ``*/5 * * * *`` and no ``enabled: false`` (active cron job for T-1 and
     T-4).
   * AC-2: ``heartbeat.yaml`` contains ``t-listjobs-paused`` with schedule
     ``*/10 * * * *`` and ``enabled: false`` (paused cron job for T-2).
   * AC-3: ``heartbeat.yaml`` contains ``t2-manual-show-output`` with
     ``schedule: manual`` (manual job for T-3).
   * AC-4: All three jobs are visible in the Jarvis Heartbeat tree view
     when the extension is loaded with the test workspace.
   * AC-5: The test procedures reference exact job names from
     ``heartbeat.yaml`` so testers can match YAML entries to tree nodes
     unambiguously.


.. req:: List-Jobs Tool Test Procedures
   :id: REQ_UAT_LISTJOBS_TESTS
   :status: approved
   :priority: optional
   :links: US_UAT_LISTJOBS

   **Description:**
   Manual test procedures SHALL exist for all five scenarios in
   ``US_UAT_LISTJOBS``, covering LM API and MCP invocation paths and all
   job-descriptor field values.

   **Acceptance Criteria:**

   * AC-1 (T-1): A test procedure verifies that ``jarvis_listJobs`` returns
     all jobs with the required fields (``name``, ``schedule``, ``enabled``,
     ``nextFire``).
   * AC-2 (T-2): A test procedure verifies that a paused cron job appears
     with ``enabled: false`` and ``nextFire: null``.
   * AC-3 (T-3): A test procedure verifies that a manual-schedule job
     appears with ``nextFire: null``.
   * AC-4 (T-4): A test procedure verifies that an active cron job appears
     with ``enabled: true`` and a future ISO-8601 ``nextFire`` timestamp.
   * AC-5 (T-5): A test procedure verifies that the MCP interface returns
     the same job list structure as the LM API interface.
